const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

// ====================================================
// IMPORT ROUTES
// ====================================================
const shellyRoutes = require('./routes/shelly');
const huaweiRoutes = require('./routes/huawei');
const deviceRoutes = require('./routes/devices');

console.log('📦 File routes/device.js importato'); // 👈 Verifica che il file venga caricato

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
// ✅ Metti PRIMA devices e huawei, POI shelly
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
