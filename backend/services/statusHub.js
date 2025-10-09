// services/statusHub.js
const { WebSocketServer } = require('ws');

let wss = null;

function init(server) {
  // monta il WS sullo stesso server HTTP, su un path dedicato
  wss = new WebSocketServer({ server, path: '/ws/cameras' });
  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'hello', data: 'connected' }));
  });
  console.log('✅ WebSocket status hub attivo su /ws/cameras');
}

function broadcastCameraUpdate(payload) {
  if (!wss) return;
  const msg = JSON.stringify({ type: 'camera.update', data: payload });
  wss.clients.forEach((c) => {
    if (c.readyState === 1) c.send(msg);
  });
}

module.exports = { init, broadcastCameraUpdate };