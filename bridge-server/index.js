const http = require('http');
const { WebSocketServer } = require('ws');
const url = require('url');

const PORT = process.env.BRIDGE_PORT || 8000;
const ICECAST_URL = process.env.ICECAST_SOURCE_URL || process.env.ICECAST_URL;

let headerChunk = null;
const listeners = new Set();
let isBroadcasting = false;
let broadcasterSocket = null;
let upstreamIcecastReq = null;

// Create HTTP Server for Icecast-compatible HTTP stream and status
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health / Status endpoint
  if (parsed.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'online',
        isBroadcasting,
        listenersCount: listeners.size,
        port: PORT,
        upstreamIcecast: Boolean(ICECAST_URL),
      })
    );
    return;
  }

  // Icecast-compatible Live Audio Stream
  if (parsed.pathname === '/live' || parsed.pathname === '/stream') {
    res.writeHead(200, {
      'Content-Type': 'audio/webm; codecs=opus',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Connection': 'keep-alive',
      'Transfer-Encoding': 'chunked',
      'icy-name': 'NEXO RADIO - En Vivo',
      'icy-genre': 'Hits / Pop / Electronic',
      'icy-pub': '1',
      'icy-br': '128',
    });

    listeners.add(res);
    console.log(`[Stream] New listener connected. Total listeners: ${listeners.size}`);

    // Immediately send the stream header so listener decoder initializes instantly
    if (headerChunk) {
      try {
        res.write(headerChunk);
      } catch (err) {
        console.error('[Stream] Error sending initial header to listener:', err);
      }
    }

    req.on('close', () => {
      listeners.delete(res);
      console.log(`[Stream] Listener disconnected. Total listeners: ${listeners.size}`);
    });

    return;
  }

  // Fallback for root
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('NEXO RADIO Source & Streaming Bridge Server is running.\nStream endpoint: /live\nStatus: /status');
});

// Setup WebSocket server for the NEXO Studio broadcaster encoder
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;

  if (pathname === '/broadcast') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  console.log('[Broadcaster] NEXO Studio connected to broadcast bridge.');
  isBroadcasting = true;
  broadcasterSocket = ws;
  headerChunk = null;

  // Optional: Connect to external Icecast server if configured
  setupIcecastUpstream();

  ws.on('message', (data) => {
    // Save the first chunk as the WebM container header
    if (!headerChunk) {
      headerChunk = Buffer.from(data);
      console.log('[Broadcaster] Saved initial WebM header chunk of size:', headerChunk.length);
    }

    const chunk = Buffer.from(data);

    // Forward to all connected HTTP listeners
    for (const client of listeners) {
      try {
        client.write(chunk);
      } catch (err) {
        listeners.delete(client);
      }
    }

    // Forward to upstream Icecast server if connected
    if (upstreamIcecastReq && !upstreamIcecastReq.destroyed) {
      try {
        upstreamIcecastReq.write(chunk);
      } catch (err) {
        console.warn('[Icecast Upstream] Write error:', err.message);
      }
    }
  });

  ws.on('close', () => {
    console.log('[Broadcaster] NEXO Studio disconnected.');
    isBroadcasting = false;
    broadcasterSocket = null;
    if (upstreamIcecastReq) {
      upstreamIcecastReq.end();
      upstreamIcecastReq = null;
    }
  });

  ws.on('error', (err) => {
    console.error('[Broadcaster] WebSocket error:', err.message);
  });
});

function setupIcecastUpstream() {
  if (!ICECAST_URL) return;

  try {
    const parsedIcecast = new URL(ICECAST_URL);
    const options = {
      hostname: parsedIcecast.hostname,
      port: parsedIcecast.port || 8000,
      path: parsedIcecast.pathname || '/live',
      method: 'PUT', // Icecast source PUT protocol
      headers: {
        'Content-Type': 'audio/webm',
        'Ice-Name': 'NEXO RADIO',
        'Ice-Genre': 'Hits',
        'Ice-Public': '1',
        'Ice-Audio-Info': 'ice-samplerate=48000;ice-bitrate=128;ice-channels=2',
      },
    };

    if (parsedIcecast.username || parsedIcecast.password) {
      const auth = Buffer.from(`${parsedIcecast.username || 'source'}:${parsedIcecast.password || ''}`).toString('base64');
      options.headers['Authorization'] = `Basic ${auth}`;
    }

    upstreamIcecastReq = http.request(options, (res) => {
      console.log(`[Icecast Upstream] Connected with status: ${res.statusCode}`);
    });

    upstreamIcecastReq.on('error', (err) => {
      console.warn(`[Icecast Upstream] Connection failed: ${err.message}`);
      upstreamIcecastReq = null;
    });

    if (headerChunk) {
      upstreamIcecastReq.write(headerChunk);
    }
  } catch (err) {
    console.warn('[Icecast Upstream] Setup failed:', err.message);
  }
}

server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`NEXO RADIO Audio Source & Stream Bridge Active`);
  console.log(`- HTTP Stream URL: http://localhost:${PORT}/live`);
  console.log(`- WS Broadcast:   ws://localhost:${PORT}/broadcast`);
  console.log(`- Status:         http://localhost:${PORT}/status`);
  if (ICECAST_URL) {
    console.log(`- Icecast Upstream: ${ICECAST_URL}`);
  }
  console.log(`=================================================`);
});
