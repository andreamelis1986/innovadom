// services/cameraMonitor.js
const { exec } = require('child_process');
const db = require('../db/connection');
const { startStream } = require('./streamManager');
const { broadcastCameraUpdate } = require('./statusHub');

function ffprobeCheck(rtspUrl, timeoutMs = 3000) {
  return new Promise((resolve) => {
    exec(
      `ffprobe -v error -rtsp_transport tcp -i "${rtspUrl}" -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 -timeout ${timeoutMs * 1000}`,
      (err, stdout) => resolve(!err && stdout.includes('video'))
    );
  });
}

async function scanOnce() {
  const [rows] = await db.query(`
    SELECT d.id, d.name, d.status, dc.rtsp_url, dc.ws_port
    FROM devices d
    JOIN device_cameras dc ON dc.device_id = d.id
    WHERE d.type='camera' AND d.is_active=1
  `);

  rows.forEach(async (cam) => {
    if (!cam.rtsp_url) return;
    const online = await ffprobeCheck(cam.rtsp_url, 3);
    const newStatus = online ? 'active' : 'offline';

    if (newStatus !== cam.status) {
      await db.query('UPDATE devices SET status=? WHERE id=?', [newStatus, cam.id]);
      broadcastCameraUpdate({ id: cam.id, status: newStatus });
      console.log(`📡 Camera "${cam.name}" → ${newStatus}`);

      if (newStatus === 'active') {
        startStream(cam.rtsp_url, cam.ws_port);
      }
    }
  });
}

module.exports = { scanOnce };