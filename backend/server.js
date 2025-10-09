// ====================================================
// 🔹 Import principali
// ====================================================
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const Stream = require('node-rtsp-stream');

// ====================================================
// 🔹 RTSP → WebSocket (Provision ISR)
// ====================================================
const streamUrl = 'rtsp://192.168.1.9:554/profile1'; // <-- qui il tuo IP corretto

const stream = new Stream({
  name: 'provision',
  streamUrl: 'rtsp://192.168.1.30:554/profile1',
  wsPort: 9999,
  ffmpegOptions: {
    '-stats': '',
    '-r': 25,
    '-fflags': 'nobuffer',
    '-flags': 'low_delay',
    '-probesize': '32',
    '-analyzeduration': '0',
    '-flush_packets': '1',
    '-rtsp_transport': 'tcp', // ✅ usa TCP, più stabile
    '-pix_fmt': 'yuv420p',
    '-b:v': '2000k',
    '-q:v': 2,
    // ✅ SCALA A 1280x720 per compatibilità + padding pari
    '-vf': 'scale=1280:720:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2,setpts=PTS-STARTPTS',
    '-preset': 'veryfast',
    '-an': '',
    '-strict': '-2' // permette forzatura MPEG1
  }
});


if (stream.mpeg1Muxer && stream.mpeg1Muxer.stderr) {
  stream.mpeg1Muxer.stderr.on('data', data => {
    const msg = data.toString();
    if (msg.includes('frame=')) console.log('🎥 Frame ricevuto:', msg.trim());
  });
}

console.log('🎥 Stream RTSP avviato → ws://localhost:9999');

// ====================================================
// IMPORT ROUTES
// ====================================================
const shellyRoutes = require('./routes/shelly');
const huaweiRoutes = require('./routes/huawei');
const deviceRoutes = require('./routes/devices');
console.log('📦 File routes/device.js importato');

// ====================================================
// EXPRESS SERVER
// ====================================================
const app = express();
app.use(cors());
app.use(express.json());

// ====================================================
// TEST ROUTE (debug rapido)
// ====================================================
app.get('/api/test', (req, res) => {
  console.log('✅ /api/test chiamata');
  res.json({ message: 'Server Express OK' });
});

// ====================================================
// REGISTER ROUTES
// ====================================================
app.use('/api/devices', deviceRoutes);
app.use('/api/huawei', huaweiRoutes);
app.use('/api', shellyRoutes);

// ====================================================
// AUTO LOG REQUESTS
// ====================================================
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// ====================================================
// START HTTP SERVER
// ====================================================
const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`✅ Backend attivo su http://localhost:${PORT}`);
  console.log('📜 Server Express avviato correttamente\n');
  console.log('🎥 Stream Provision attivo su ws://localhost:9999');
});

// ====================================================
// WEBSOCKET SERVER
// ====================================================
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('🔌 Client WebSocket connesso');
  ws.send(JSON.stringify({ message: 'Connesso al backend DomusControl' }));

  ws.on('message', (msg) => {
    console.log('📩 Messaggio ricevuto dal client Angular:', msg.toString());
  });

  ws.on('close', () => {
    console.log('❌ Client WebSocket disconnesso');
  });
});

// ====================================================
// BROADCAST FUNCTION (real-time updates)
// ====================================================
function broadcastUpdate(data) {
  console.log('📢 Broadcast verso i client WebSocket:', data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}
app.set('broadcastUpdate', broadcastUpdate);
app.set('wss', wss);

// ====================================================
// FALLBACK - se nessuna route cattura la richiesta
// ====================================================
app.use((req, res) => {
  console.log('⚠️ 404 route non trovata:', req.method, req.url);
  res.status(404).json({ error: 'Not found', path: req.url });
});
