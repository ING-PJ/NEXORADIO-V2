import { AudioLevels, Song } from './types';
import { radioStore } from './radioStore';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;

  private musicGainNode: GainNode | null = null;
  private micGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private monitorGainNode: GainNode | null = null;

  private musicAnalyser: AnalyserNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;

  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private masterDestination: MediaStreamAudioDestinationNode | null = null;

  private mediaRecorder: MediaRecorder | null = null;
  private broadcastWs: WebSocket | null = null;

  // State
  private isBroadcasting = false;
  private isMicOnAir = false;
  private needsUserInteraction = false;
  private musicVolume = 0.8;
  private micVolume = 0.8;
  private masterVolume = 1.0;
  private duckedMusicRatio = 0.28; // 28% ducking

  private currentSong: Song | null = null;
  private isPlaying = false;
  private airTimeSeconds = 0;
  private airTimerInterval: NodeJS.Timeout | null = null;

  private onStateChangeCallbacks: Set<() => void> = new Set();
  private onLevelCallbacks: Set<(levels: AudioLevels) => void> = new Set();
  private animFrameId: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        // Automatically ensure mic is taken off the air on page reload
        radioStore.updateStationState({ is_mic_active: false });
        this.persistSession();
      });
    }
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';

      // Setup audio routing
      this.audioSourceNode = this.ctx.createMediaElementSource(this.audioElement);
      this.musicGainNode = this.ctx.createGain();
      this.micGainNode = this.ctx.createGain();
      this.masterGainNode = this.ctx.createGain();
      this.monitorGainNode = this.ctx.createGain();

      this.musicGainNode.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.micGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGainNode.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.monitorGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

      // Analysers for VU meters
      this.musicAnalyser = this.ctx.createAnalyser();
      this.micAnalyser = this.ctx.createAnalyser();
      this.masterAnalyser = this.ctx.createAnalyser();

      this.musicAnalyser.fftSize = 64;
      this.micAnalyser.fftSize = 64;
      this.masterAnalyser.fftSize = 64;

      // Master broadcast destination
      this.masterDestination = this.ctx.createMediaStreamDestination();

      // Routing:
      // Music -> musicGain -> masterGain (and musicAnalyser in parallel)
      this.audioSourceNode.connect(this.musicGainNode);
      this.musicGainNode.connect(this.masterGainNode);
      this.musicGainNode.connect(this.musicAnalyser);

      // Master -> masterDestination (to broadcast stream) & masterAnalyser
      this.masterGainNode.connect(this.masterDestination);
      this.masterGainNode.connect(this.masterAnalyser);

      // Master -> monitorGain -> speakers (for DJ monitoring in studio)
      this.masterGainNode.connect(this.monitorGainNode);
      this.monitorGainNode.connect(this.ctx.destination);

      // Audio element listeners
      this.audioElement.addEventListener('ended', () => {
        this.handleTrackEnded();
      });

      this.audioElement.addEventListener('timeupdate', () => {
        if (this.audioElement && this.currentSong) {
          const progress = Math.floor(this.audioElement.currentTime);
          radioStore.updateStationState({
            current_song_progress: progress,
          });
          this.persistSession();
          this.notify();
        }
      });

      this.startMeterLoop();
    } catch (err) {
      console.error('Failed to initialize AudioContext:', err);
    }
  }

  private startMeterLoop() {
    const musicBuf = new Uint8Array(32);
    const micBuf = new Uint8Array(32);
    const masterBuf = new Uint8Array(32);

    const calcLevel = (analyser: AnalyserNode | null, buf: any): number => {
      if (!analyser) return 0;
      analyser.getByteFrequencyData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        sum += buf[i];
      }
      const avg = sum / buf.length;
      return Math.min(100, Math.round((avg / 255) * 100 * 1.4));
    };

    const loop = () => {
      if (this.onLevelCallbacks.size > 0) {
        const levels: AudioLevels = {
          music: this.isPlaying ? calcLevel(this.musicAnalyser, musicBuf) : 0,
          mic: this.isMicOnAir ? calcLevel(this.micAnalyser, micBuf) : 0,
          master: calcLevel(this.masterAnalyser, masterBuf),
        };
        this.onLevelCallbacks.forEach((cb) => cb(levels));
      }
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  // --- PLAYBACK CONTROLS ---
  public async playSong(song: Song, startTime: number = 0) {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
    }

    if (!this.audioElement) return;

    this.currentSong = song;
    this.audioElement.src = song.file_url;
    if (startTime > 0) {
      const setTime = () => {
        if (this.audioElement && startTime > 0) {
          this.audioElement.currentTime = startTime;
        }
      };
      this.audioElement.addEventListener('loadedmetadata', setTime, { once: true });
    }
    this.audioElement.load();

    try {
      await this.audioElement.play();
      this.isPlaying = true;
      if (startTime > 0) {
        this.audioElement.currentTime = startTime;
      }
      if (!this.isBroadcasting && typeof window !== 'undefined' && localStorage.getItem('nexo_broadcast_enabled') !== 'false') {
        this.startBroadcasting();
      }
      radioStore.updateStationState({
        current_song_id: song.id,
        current_song_title: song.title,
        current_song_artist: song.artist,
        current_song_cover: song.cover_url,
        current_song_url: song.file_url,
        current_song_duration: song.duration,
        current_song_progress: Math.floor(startTime),
      });
      this.needsUserInteraction = false;
      this.persistSession();
      this.notify();
    } catch (err) {
      console.warn('Playback error, attempting fallback to local audio:', err);
      try {
        this.audioElement.src = '/songs/summer.mp3';
        if (startTime > 0) {
          this.audioElement.currentTime = startTime;
        }
        this.audioElement.load();
        await this.audioElement.play();
        this.isPlaying = true;
        if (startTime > 0) {
          this.audioElement.currentTime = startTime;
        }
        radioStore.updateStationState({
          current_song_id: song.id,
          current_song_title: song.title,
          current_song_artist: song.artist,
          current_song_cover: song.cover_url,
          current_song_url: '/songs/summer.mp3',
          current_song_duration: song.duration,
          current_song_progress: Math.floor(startTime),
        });
        this.needsUserInteraction = false;
        this.persistSession();
        this.notify();
      } catch (e2) {
        console.error('Final audio play error:', e2);
      }
    }
  }

  public async togglePlay() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
    }

    if (!this.audioElement) return;

    if (this.isPlaying) {
      this.audioElement.pause();
      this.isPlaying = false;
    } else {
      if (!this.currentSong) {
        const queue = radioStore.getQueue();
        if (queue.length > 0) {
          await this.playSong(queue[0]);
          return;
        } else {
          const songs = await radioStore.getSongs();
          if (songs && songs.length > 0) {
            await this.playSong(songs[0]);
            return;
          }
        }
      }
      try {
        await this.audioElement.play();
        this.isPlaying = true;
        if (!this.isBroadcasting && typeof window !== 'undefined' && localStorage.getItem('nexo_broadcast_enabled') !== 'false') {
          this.startBroadcasting();
        }
      } catch (e) {
        console.warn('togglePlay error:', e);
      }
    }
    this.persistSession();
    this.notify();
  }

  public nextTrack() {
    const queue = radioStore.getQueue();
    if (queue.length > 0) {
      const nextSong = queue[0];
      radioStore.removeFromQueue(0);
      this.playSong(nextSong);
    }
  }

  public prevTrack() {
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
    }
  }

  private handleTrackEnded() {
    this.nextTrack();
  }

  // --- DUCKING & MICROPHONE ---
  public async enterOnAir(): Promise<boolean> {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (!this.ctx || !this.musicGainNode || !this.micGainNode) return false;

    try {
      // 1. Request microphone access if not already opened
      if (!this.micStream) {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        this.micSourceNode = this.ctx.createMediaStreamSource(this.micStream);
        this.micSourceNode.connect(this.micGainNode);
        if (this.masterGainNode) {
          this.micGainNode.connect(this.masterGainNode);
        }
        if (this.micAnalyser) {
          this.micGainNode.connect(this.micAnalyser);
        }
      }

      const now = this.ctx.currentTime;
      // 2. Duck music smoothly to ~25-30% in 400ms
      const targetMusicGain = this.musicVolume * this.duckedMusicRatio;
      this.musicGainNode.gain.cancelScheduledValues(now);
      this.musicGainNode.gain.setValueAtTime(this.musicGainNode.gain.value, now);
      this.musicGainNode.gain.linearRampToValueAtTime(targetMusicGain, now + 0.4);

      // 3. Ramp mic in over 300ms
      this.micGainNode.gain.cancelScheduledValues(now);
      this.micGainNode.gain.setValueAtTime(this.micGainNode.gain.value, now);
      this.micGainNode.gain.linearRampToValueAtTime(this.micVolume, now + 0.3);

      // Mute local monitor speaker for mic to prevent echo loop in studio room
      if (this.monitorGainNode) {
        this.monitorGainNode.gain.setValueAtTime(0.5, now);
      }

      this.isMicOnAir = true;
      radioStore.updateStationState({ is_mic_active: true });
      this.notify();
      return true;
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      throw err;
    }
  }

  public exitOnAir() {
    if (!this.ctx || !this.musicGainNode || !this.micGainNode) return;

    const now = this.ctx.currentTime;

    // 1. Fade out microphone in 300ms
    this.micGainNode.gain.cancelScheduledValues(now);
    this.micGainNode.gain.setValueAtTime(this.micGainNode.gain.value, now);
    this.micGainNode.gain.linearRampToValueAtTime(0.0001, now + 0.3);

    // 2. Restore normal music volume smoothly in 800ms
    this.musicGainNode.gain.cancelScheduledValues(now);
    this.musicGainNode.gain.setValueAtTime(this.musicGainNode.gain.value, now);
    this.musicGainNode.gain.linearRampToValueAtTime(this.musicVolume, now + 0.8);

    // Restore monitor volume
    if (this.monitorGainNode) {
      this.monitorGainNode.gain.setValueAtTime(1.0, now);
    }

    this.isMicOnAir = false;
    radioStore.updateStationState({ is_mic_active: false });
    this.notify();
  }

  public toggleMic() {
    if (this.isMicOnAir) {
      this.exitOnAir();
    } else {
      this.enterOnAir();
    }
  }

  // --- VOLUME FADERS ---
  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGainNode && this.ctx) {
      const now = this.ctx.currentTime;
      const effective = this.isMicOnAir ? this.musicVolume * this.duckedMusicRatio : this.musicVolume;
      this.musicGainNode.gain.linearRampToValueAtTime(effective, now + 0.05);
    }
    this.notify();
  }

  public setMicVolume(vol: number) {
    this.micVolume = Math.max(0, Math.min(1, vol));
    if (this.micGainNode && this.ctx && this.isMicOnAir) {
      const now = this.ctx.currentTime;
      this.micGainNode.gain.linearRampToValueAtTime(this.micVolume, now + 0.05);
    }
    this.notify();
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
    this.notify();
  }

  // --- BROADCAST TRANSMISSION TO BRIDGE / ICECAST ---
  public startBroadcasting() {
    this.init();
    if (!this.masterDestination) return;

    if (this.isBroadcasting) return;

    try {
      const stream = this.masterDestination.stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : '';

      const options = mimeType ? { mimeType, audioBitsPerSecond: 128000 } : { audioBitsPerSecond: 128000 };
      this.mediaRecorder = new MediaRecorder(stream, options);

      // Connect to Source Bridge WebSocket
      const defaultWsUrl = 'wss://nexo-radio-bridge.onrender.com/broadcast';
      const wsUrl = process.env.NEXT_PUBLIC_BRIDGE_WS_URL || defaultWsUrl;
      const initialChunkQueue: ArrayBuffer[] = [];

      try {
        this.broadcastWs = new WebSocket(wsUrl);
        this.broadcastWs.binaryType = 'arraybuffer';

        this.broadcastWs.onopen = () => {
          console.log('Connected to NEXO Audio Bridge Server at', wsUrl);
          while (initialChunkQueue.length > 0) {
            const chunk = initialChunkQueue.shift();
            if (chunk) this.broadcastWs?.send(chunk);
          }
        };

        this.broadcastWs.onerror = (e) => {
          console.warn('Bridge server error notice:', e);
        };
      } catch (wsErr) {
        console.warn('Could not establish WebSocket to bridge:', wsErr);
      }

      this.mediaRecorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          const buffer = await e.data.arrayBuffer();
          if (this.broadcastWs && this.broadcastWs.readyState === WebSocket.OPEN) {
            this.broadcastWs.send(buffer);
          } else {
            initialChunkQueue.push(buffer);
          }
        }
      };

      // Emit chunks every 600ms for stable low latency
      this.mediaRecorder.start(600);
      this.isBroadcasting = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('nexo_broadcast_enabled', 'true');
      }

      // Start on-air broadcast timer (preserving air time across refresh)
      if (this.airTimerInterval) {
        clearInterval(this.airTimerInterval);
      }
      this.airTimeSeconds = this.airTimeSeconds || 0;
      this.airTimerInterval = setInterval(() => {
        this.airTimeSeconds++;
        radioStore.updateStationState({
          air_time_seconds: this.airTimeSeconds,
          is_live: true,
        });
        this.notify();
      }, 1000);

      radioStore.updateStationState({ is_live: true });
      this.persistSession();
      this.notify();
    } catch (err) {
      console.error('Failed to start media recorder / broadcast:', err);
    }
  }

  public stopBroadcasting() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    if (this.broadcastWs) {
      try {
        this.broadcastWs.close();
      } catch {}
      this.broadcastWs = null;
    }
    if (this.airTimerInterval) {
      clearInterval(this.airTimerInterval);
      this.airTimerInterval = null;
    }
    this.isBroadcasting = false;
    this.airTimeSeconds = 0;
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexo_broadcast_enabled', 'false');
    }
    this.persistSession();
    radioStore.updateStationState({ is_live: false });
    this.notify();
  }

  public toggleBroadcasting() {
    if (this.isBroadcasting) {
      this.stopBroadcasting();
    } else {
      this.startBroadcasting();
    }
  }

  // --- SESSION PERSISTENCE & AUTO-RESTORE ---
  public persistSession() {
    if (typeof window === 'undefined') return;
    try {
      if (this.currentSong && (this.isPlaying || this.isBroadcasting)) {
        const session = {
          song: this.currentSong,
          currentTime: this.audioElement ? this.audioElement.currentTime : 0,
          isPlaying: this.isPlaying,
          isBroadcasting: this.isBroadcasting,
          airTimeSeconds: this.airTimeSeconds,
          savedAt: Date.now(),
        };
        localStorage.setItem('nexo_playback_session_v1', JSON.stringify(session));
      } else if (!this.isPlaying && !this.isBroadcasting) {
        localStorage.removeItem('nexo_playback_session_v1');
      }
    } catch {}
  }

  public async restoreSession(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    // Don't re-run if already actively playing
    if (this.isPlaying && this.audioElement && !this.audioElement.paused) return true;

    try {
      // 1. Microphone is strictly forced off on reload
      this.isMicOnAir = false;
      radioStore.updateStationState({ is_mic_active: false });

      // 2. Read saved playback session
      const saved = localStorage.getItem('nexo_playback_session_v1');
      let targetSong: Song | null = null;
      let resumeTime = 0;
      let shouldBroadcast = true;
      let savedAirTime = 0;

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.song) {
            targetSong = parsed.song;
            const elapsed = Math.max(0, (Date.now() - (parsed.savedAt || Date.now())) / 1000);
            resumeTime = (parsed.currentTime || 0) + (elapsed < 60 ? elapsed : 0);
            const duration = parsed.song.duration || 300;
            if (resumeTime >= duration) {
              resumeTime = 0;
            }
            shouldBroadcast = parsed.isBroadcasting !== false;
            savedAirTime = parsed.airTimeSeconds ? Math.floor(parsed.airTimeSeconds + elapsed) : 0;
          }
        } catch {}
      }

      // Fallback: check station state if session was not in playback session
      if (!targetSong) {
        const state = radioStore.getStationState();
        if (state && state.is_live && state.current_song_title) {
          targetSong = {
            id: state.current_song_id || 'restored-song',
            title: state.current_song_title,
            artist: state.current_song_artist || 'NEXO Radio',
            file_url: state.current_song_url || '/songs/summer.mp3',
            cover_url: state.current_song_cover || '/cover_default.webp',
            duration: state.current_song_duration || 180,
            genre: 'Pop',
          };
          resumeTime = state.current_song_progress || 0;
          savedAirTime = state.air_time_seconds || 0;
        }
      }

      if (!targetSong) return false;

      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        try { await this.ctx.resume(); } catch {}
      }

      this.currentSong = targetSong;
      this.airTimeSeconds = savedAirTime;

      radioStore.updateStationState({
        is_mic_active: false,
        is_live: true,
        air_time_seconds: this.airTimeSeconds,
        current_song_id: targetSong.id,
        current_song_title: targetSong.title,
        current_song_artist: targetSong.artist,
        current_song_cover: targetSong.cover_url,
        current_song_url: targetSong.file_url,
        current_song_duration: targetSong.duration,
        current_song_progress: Math.floor(resumeTime),
      });

      if (this.audioElement) {
        this.audioElement.src = targetSong.file_url;
        const setTime = () => {
          if (this.audioElement && resumeTime > 0) {
            this.audioElement.currentTime = resumeTime;
          }
        };
        this.audioElement.addEventListener('loadedmetadata', setTime, { once: true });
        this.audioElement.load();

        try {
          await this.audioElement.play();
          this.isPlaying = true;
          if (resumeTime > 0) {
            this.audioElement.currentTime = resumeTime;
          }
          if (shouldBroadcast) {
            this.startBroadcasting();
          }
          this.needsUserInteraction = false;
          this.persistSession();
          this.notify();
          return true;
        } catch (autoplayErr) {
          console.log('Autoplay restriction on page reload, awaiting interaction:', autoplayErr);
          this.needsUserInteraction = true;
          this.notify();

          const oneTimeResume = async () => {
            window.removeEventListener('click', oneTimeResume);
            window.removeEventListener('keydown', oneTimeResume);
            window.removeEventListener('touchstart', oneTimeResume);
            await this.resumeFromGesture();
          };

          window.addEventListener('click', oneTimeResume, { once: true });
          window.addEventListener('keydown', oneTimeResume, { once: true });
          window.addEventListener('touchstart', oneTimeResume, { once: true });
          return false;
        }
      }
    } catch (e) {
      console.warn('Error in restoreSession:', e);
    }
    return false;
  }

  public async resumeFromGesture() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
    }
    if (this.audioElement) {
      try {
        await this.audioElement.play();
        this.isPlaying = true;
        this.needsUserInteraction = false;
        if (!this.isBroadcasting && typeof window !== 'undefined' && localStorage.getItem('nexo_broadcast_enabled') !== 'false') {
          this.startBroadcasting();
        }
        this.persistSession();
        this.notify();
      } catch (e) {
        console.warn('Error resuming audio from gesture:', e);
      }
    }
  }

  // --- SUBSCRIBERS ---
  public subscribe(callback: () => void) {
    this.onStateChangeCallbacks.add(callback);
    return () => {
      this.onStateChangeCallbacks.delete(callback);
    };
  }

  public subscribeLevels(callback: (levels: AudioLevels) => void) {
    this.onLevelCallbacks.add(callback);
    return () => {
      this.onLevelCallbacks.delete(callback);
    };
  }

  private notify() {
    this.onStateChangeCallbacks.forEach((cb) => {
      try {
        cb();
      } catch {}
    });
  }

  // --- GETTERS ---
  public getState() {
    return {
      isPlaying: this.isPlaying,
      isMicOnAir: this.isMicOnAir,
      isBroadcasting: this.isBroadcasting,
      needsUserInteraction: this.needsUserInteraction,
      musicVolume: this.musicVolume,
      micVolume: this.micVolume,
      masterVolume: this.masterVolume,
      currentSong: this.currentSong,
      currentTime: this.audioElement ? Math.floor(this.audioElement.currentTime) : 0,
      duration: this.audioElement && !isNaN(this.audioElement.duration) ? Math.floor(this.audioElement.duration) : (this.currentSong?.duration || 0),
      airTimeSeconds: this.airTimeSeconds,
    };
  }
}

export const audioEngine = new AudioEngine();
