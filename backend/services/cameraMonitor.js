// services/cameraMonitor.js
const db = require('../db/connection');
const { startStream } = require('./streamManager');
const { broadcastCameraUpdate } = require('./statusHub');

async function scanOnce() {
  const [rows] = await db.query(`
    SELECT d.id, d.name, d.status, dc.rtsp_url, dc.ws_port
    FROM devices d
    JOIN device_cameras dc ON dc.device_id = d.id
    WHERE d.type='camera' AND d.is_active=1
  `);

  for (const cam of rows) {
    if (!cam.rtsp_url) continue;

    const online = true; // oppure fai il check con ffprobe se serve
    const newStatus = online ? 'active' : 'offline';

    if (newStatus !== cam.status) {
      await db.query('UPDATE devices SET status=? WHERE id=?', [newStatus, cam.id]);
      broadcastCameraUpdate({ id: cam.id, status: newStatus });
      console.log(`📡 Camera "${cam.name}" → ${newStatus}`);
    }

    if (online) {
      // 🔹 Ogni camera ha la sua porta WS (es. 9999, 10000, 10001, ecc.)
      startStream(cam.rtsp_url, cam.ws_port);
    }
  }
}

module.exports = { scanOnce };
