const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const huaweiRoutes = require("./routes/huawei");
const deviceRoutes = require('./routes/devices');

const app = express();
app.use(cors());
app.use(express.json());

// Importa le rotte (Shelly + DB)
const shellyRoutes = require('./routes/shelly');
app.use('/api', shellyRoutes);
app.use("/api/huawei", huaweiRoutes);
app.use('/api/devices', deviceRoutes);

// Avvio HTTP
const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`✅ Backend attivo su http://localhost:${PORT}`);
});

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  console.log('🔌 Client WebSocket connesso');

  ws.send(JSON.stringify({ message: 'Connesso al backend DomusControl' }));

  ws.on('message', (msg) => {
    console.log('📩 Messaggio ricevuto dal client Angular:', msg.toString());
  });

  ws.on('close', () => {
    console.log('❌ Client WebSocket disconnesso');
  });
});

// 👇 Rende il WS disponibile alle rotte
app.set('wss', wss);

// Funzione di broadcast
function broadcastUpdate(data) {
  console.log('📢 Broadcast verso i client WebSocket:', data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}
app.set('broadcastUpdate', broadcastUpdate);
