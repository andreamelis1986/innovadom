const express = require('express');
const router = express.Router();
const db = require('../db/connection');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, dl.brightness, ds.position AS shutter_position
      FROM devices d
      LEFT JOIN device_lights dl ON dl.device_id = d.id
      LEFT JOIN device_shutters ds ON ds.device_id = d.id
      WHERE d.is_active = 1
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Errore recupero dispositivi:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
