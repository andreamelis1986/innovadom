// services/statusHub.js
const { WebSocketServer } = require('ws');

let wss; // riferimento globale al WebSocket server

/**
 * 🔹 Inizializza il WebSocket server condiviso
 *    Puoi passargli direttamente il server HTTP
 */
function init(server) {
  if (wss) return wss; // evita inizializzazioni doppie

  wss = new WebSocketServer({ server, path: '/ws/cameras' });
  console.log('✅ WebSocket status hub attivo su /ws/cameras');

  wss.on('connection', (socket, req) => {
    console.log('🔌 Client WebSocket connesso:', req.socket.remoteAddress);

    socket.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        // 🔁 Puoi gestire messaggi dal frontend (es. "subscribe", "ping", ecc.)
        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        }
      } catch (err) {
        console.warn('⚠️ Messaggio WS non valido:', msg.toString());
      }
    });

    socket.on('close', () => {
      console.log('❌ Client WebSocket disconnesso');
    });
  });

  return wss;
}

/**
 * 🔹 Invia un messaggio a TUTTI i client WS connessi
 */
function broadcast(data) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
}

/**
 * 🔹 Notifica aggiornamento di una telecamera
 */
function broadcastCameraUpdate(payload) {
  broadcast({ type: 'camera.update', data: payload });
}

/**
 * 🔹 Notifica aggiornamento di un dispositivo (luci, clima, ecc.)
 */
function broadcastDeviceUpdate(payload) {
  broadcast({ type: 'device.update', data: payload });
}

module.exports = {
  init,
  broadcast,
  broadcastCameraUpdate,
  broadcastDeviceUpdate,
};
