// routes/devices.js
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const pool = require('../db'); // ✅ connessione MySQL
const axios = require('axios'); // ✅ richieste HTTP verso dispositivi
const { startStream } = require('../services/streamManager');
const { scanOnce } = require('../services/cameraMonitor');

// 🧠 Funzione di controllo connessione dispositivo
async function isDeviceOnline(ip) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200); // massimo 1.2s

    // 🔹 prova prima /rpc/Shelly.GetStatus (nuovo firmware)
    const res = await axios.get(`http://${ip}/rpc/Shelly.GetStatus`, {
      timeout: 1200,
      signal: controller.signal
    });

    clearTimeout(timeout);
    return res.status === 200;
  } catch {
    try {
      // 🔹 fallback per vecchi firmware
      const res2 = await axios.get(`http://${ip}/status`, { timeout: 1200 });
      return res2.status === 200;
    } catch {
      return false;
    }
  }
}

// ======================================================
// 🔹 GET - Recupera tutti i dispositivi attivi
// ======================================================
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        d.id,
        d.name,
        d.type,
        d.ip,
        d.room,
        d.status,
        COALESCE(d.pos_top, 0) AS pos_top,
        COALESCE(d.pos_left, 0) AS pos_left,
        d.position,
        d.is_active,
        dc.rtsp_url,
        dc.ws_port
      FROM devices d
      LEFT JOIN device_cameras dc ON dc.device_id = d.id
      WHERE d.is_active = 1
    `);

    res.json(rows);
  } catch (err) {
    console.error('❌ Errore recupero dispositivi:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// ======================================================
// 🔹 POST - Crea un nuovo dispositivo
// ======================================================
router.post('/', async (req, res) => {
  const { name, type, ip, status = 'off', top = 0, left = 0, home_id = 1 } = req.body;

  try {
    const [result] = await db.query(
      'INSERT INTO devices (home_id, name, type, ip, status, top, `left`, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [home_id, name, type, ip, status, top, left]
    );

    res.status(201).json({
      id: result.insertId,
      home_id,
      name,
      type,
      ip,
      status,
      top,
      left,
      is_active: 1
    });
  } catch (err) {
    console.error('❌ Errore creazione dispositivo:', err.sqlMessage || err);
    res.status(500).json({ error: 'Errore server', details: err.sqlMessage });
  }
});

// ======================================================
// 🔹 PUT - Aggiorna stato dispositivo (on/off)
// ======================================================
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await db.query('UPDATE devices SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Errore aggiornamento dispositivo:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// ======================================================
// 🔹 DELETE - Disattiva un dispositivo
// ======================================================
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE devices SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Errore eliminazione dispositivo:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// ======================================================
// 🔽 Apri serranda
// ======================================================
router.post('/:id/open', async (req, res) => {
  const id = req.params.id;

  try {
    const [rows] = await pool.query('SELECT ip FROM devices WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Dispositivo non trovato' });
    const ip = rows[0].ip;

    // ✅ Controllo se è online
    const online = await isDeviceOnline(ip);
    if (!online) return res.status(503).json({ error: 'Dispositivo offline' });

    await axios.get(`http://${ip}/relay/0/on`);
    await pool.query('UPDATE devices SET status = "open", shutter_position = 100 WHERE id = ?', [id]);

    res.json({ success: true, message: 'Serranda aperta' });
  } catch (err) {
    console.error('❌ Errore apertura serranda:', err.message);
    res.status(500).json({ error: 'Errore apertura serranda' });
  }
});

// ======================================================
// 🔼 Chiudi serranda
// ======================================================
router.post('/:id/close', async (req, res) => {
  const id = req.params.id;

  try {
    const [rows] = await pool.query('SELECT ip FROM devices WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Dispositivo non trovato' });
    const ip = rows[0].ip;

    const online = await isDeviceOnline(ip);
    if (!online) return res.status(503).json({ error: 'Dispositivo offline' });

    await axios.get(`http://${ip}/relay/0/off`);
    await pool.query('UPDATE devices SET status = "closed", shutter_position = 0 WHERE id = ?', [id]);

    res.json({ success: true, message: 'Serranda chiusa' });
  } catch (err) {
    console.error('❌ Errore chiusura serranda:', err.message);
    res.status(500).json({ error: 'Errore chiusura serranda' });
  }
});

// ======================================================
// 🔧 Imposta posizione serranda (%)
// ======================================================
router.post('/:id/position', async (req, res) => {
  const id = req.params.id;
  const { position } = req.body;

  try {
    const [rows] = await pool.query('SELECT ip FROM devices WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Dispositivo non trovato' });
    const ip = rows[0].ip;

    const online = await isDeviceOnline(ip);
    if (!online) return res.status(503).json({ error: 'Dispositivo offline' });

    await axios.get(`http://${ip}/roller/0/position/${position}`);
    await pool.query('UPDATE devices SET status = ?, position = ? WHERE id = ?', [
      position > 0 ? 'open' : 'closed',
      position,
      id
    ]);

    res.json({ success: true, message: `Serranda impostata al ${position}%` });
  } catch (err) {
    console.error('❌ Errore impostazione posizione serranda:', err.message);
    res.status(500).json({ error: 'Errore impostazione posizione serranda' });
  }
});

// 🔹 Verifica se il dispositivo risponde (ping HTTP)
router.get('/:id/ping', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query('SELECT ip FROM devices WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Dispositivo non trovato' });

    const ip = rows[0].ip;
    const online = await isDeviceOnline(ip);

    res.json({ online });
  } catch (err) {
    console.error('❌ Errore ping dispositivo:', err.message);
    res.status(500).json({ error: 'Errore durante il ping' });
  }
});

// ======================================================
// 🔍 CHECK - Verifica stato dispositivo da DB
// (utile per telecamere RTSP)
// ======================================================
router.get('/:id/check', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT status, type FROM devices WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ online: false });

    const dev = rows[0];
    // ✅ Se è una telecamera → leggi lo stato dal DB (aggiornato da cameraMonitor.js)
    if (dev.type === 'camera') {
      const online = dev.status === 'active';
      return res.json({ online });
    }

    // 🔹 Per altri dispositivi (Shelly, ecc.) → fai il ping HTTP classico
    const [row2] = await pool.query('SELECT ip FROM devices WHERE id = ?', [req.params.id]);
    const online = await isDeviceOnline(row2.ip);
    res.json({ online });

  } catch (err) {
    console.error('❌ Errore check dispositivo:', err.message);
    res.status(500).json({ online: false });
  }
});

module.exports = router;
