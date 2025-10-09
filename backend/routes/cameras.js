const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { startStream } = require('../services/streamManager');

// GET /api/cameras → lista delle telecamere attive
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.id, d.name, d.ip, d.room, d.status, dc.rtsp_url, dc.ws_port
      FROM devices d
      JOIN device_cameras dc ON dc.device_id = d.id
      WHERE d.type = 'camera' AND d.is_active = 1
    `);

    // avvia stream per ogni telecamera se non già attivo
    rows.forEach((cam) => {
      if (cam.rtsp_url && cam.ws_port) startStream(cam.rtsp_url, cam.ws_port);
    });

    res.json(rows);
  } catch (err) {
    console.error('❌ Errore recupero telecamere:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
