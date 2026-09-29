const http = require('http');
const { WebSocketServer } = require('ws');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || process.env.BRIDGE_PORT || 8000;
const ICECAST_URL = process.env.ICECAST_SOURCE_URL || process.env.ICECAST_URL;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let headerChunk = null;
let headerContentType = 'audio/mp4';
const listeners = new Set();
let isBroadcasting = false;
let broadcasterSocket = null;
let upstreamIcecastReq = null;

// Create HTTP Server for Icecast-compatible HTTP stream and status
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // File Upload Endpoint: POST /upload?name=song.mp3
  if (req.method === 'POST' && parsed.pathname === '/upload') {
    const rawName = parsed.query?.name ? String(parsed.query.name) : 'audio.mp3';
    const safeExt = path.extname(rawName) || '.mp3';
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${safeExt}`;
    const targetPath = path.join(UPLOADS_DIR, filename);
    const writeStream = fs.createWriteStream(targetPath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || `localhost:${PORT}`;
      const fileUrl = `${protocol}://${host}/uploads/${filename}`;
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ url: fileUrl, filename }));
    });

    writeStream.on('error', (err) => {
      console.error('[Upload] Error saving file:', err);
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // Serve Uploaded Files: GET /uploads/:filename
  if (req.method === 'GET' && parsed.pathname.startsWith('/uploads/')) {
    const filename = path.basename(parsed.pathname);
    const targetPath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(targetPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('File not found');
      return;
    }

    const stat = fs.statSync(targetPath);
    const total = stat.size;
    const range = req.headers.range;
    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(filename);
    const contentType = isImage ? 'image/jpeg' : 'audio/mpeg';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(targetPath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': total,
        'Accept-Ranges': 'bytes',
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(targetPath).pipe(res);
    }
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
        format: headerContentType,
        upstreamIcecast: Boolean(ICECAST_URL),
      })
    );
    return;
  }

  // Icecast-compatible Live Audio Stream
  if (parsed.pathname === '/live' || parsed.pathname === '/stream') {
    res.writeHead(200, {
      'Content-Type': headerContentType,
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
    // Save the first chunk as container header and detect format
    if (!headerChunk) {
      headerChunk = Buffer.from(data);
      if (headerChunk.indexOf('ftyp') !== -1 || headerChunk.indexOf('moov') !== -1) {
        headerContentType = 'audio/mp4';
      } else {
        headerContentType = 'audio/webm; codecs=opus';
      }
      console.log(`[Broadcaster] Initial header received (${headerChunk.length} bytes), format: ${headerContentType}`);
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
    headerChunk = null;
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

server.listen(PORT, '0.0.0.0', () => {
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
