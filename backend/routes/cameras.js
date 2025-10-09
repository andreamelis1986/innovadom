const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { startStream } = require('../services/streamManager');
const { exec } = require('child_process');
const { scanOnce } = require('../services/cameraMonitor');

/**
 * 📡 API: GET /api/cameras
 * Restituisce tutte le telecamere attive con posizione, stato e dati RTSP
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        d.id,
        d.name,
        d.ip,
        d.room,
        d.status,
        d.type,
        COALESCE(dc.pos_top, d.pos_top, 0) AS pos_top,
        COALESCE(dc.pos_left, d.pos_left, 0) AS pos_left,
        dc.rtsp_url,
        dc.ws_port
      FROM devices d
      LEFT JOIN device_cameras dc ON dc.device_id = d.id
      WHERE d.type = 'camera' AND d.is_active = 1
    `);

    // 🔹 Avvia stream per le camere già online
    rows.forEach((cam) => {
      if (cam.status === 'active' && cam.rtsp_url) {
        startStream(cam.rtsp_url, cam.ws_port);
      }
    });

    // 🔹 Risponde subito al frontend
    res.json(rows);

    // 🔹 Aggiornamento in background (controllo online/offline)
    scanOnce().catch((err) => console.error('Errore scanOnce:', err));
  } catch (err) {
    console.error('❌ Errore recupero telecamere:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// ✅ Funzione che aggiorna lo stato delle camere in background
function checkAllCamerasAsync(cameras) {
  cameras.forEach((cam) => {
    if (!cam.rtsp_url) return;

    exec(
      `ffprobe -v error -rtsp_transport tcp -i "${cam.rtsp_url}" -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 -timeout 3000000`,
      (err, stdout) => {
        const online = !err && stdout.includes('video');
        const newStatus = online ? 'active' : 'offline';

        if (newStatus !== cam.status) {
          db.query('UPDATE devices SET status = ? WHERE id = ?', [newStatus, cam.id])
            .then(() => {
              console.log(`📡 Stato aggiornato: ${cam.name} → ${newStatus}`);
              // Se ora è online, avvia stream
              if (newStatus === 'active') {
                startStream(cam.rtsp_url, cam.ws_port);
              }
            })
            .catch((e) => console.error('❌ Errore aggiornamento stato:', e));
        }
      }
    );
  });
}

module.exports = router;