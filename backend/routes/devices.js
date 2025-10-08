const express = require('express');
const router = express.Router();
const db = require('../db');

console.log('📂 devices.js caricato correttamente');

// ====================================================
// TEST ROUTE (debug rapido)
// ====================================================
router.get('/test', (req, res) => {
  console.log('✅ /api/devices/test chiamata');
  res.json({ message: 'Route devices test OK' });
});

// ====================================================
// GET - tutti i dispositivi
// ====================================================
router.get('/', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.query('SELECT * FROM devices');
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error('❌ Errore GET /devices:', err);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// POST - aggiungi dispositivo
// ====================================================
router.post('/', async (req, res) => {
  console.log('➡️ POST /api/devices', req.body);
  const { name, type, ip, status } = req.body;
  let { top, left } = req.body;

  try {
    // 🔍 controllo IP duplicato
    const [existing] = await db.query('SELECT * FROM devices WHERE ip = ?', [ip]);
    if (existing.length > 0) {
      console.warn('⚠️ IP già presente:', ip);
      return res.status(400).json({ error: 'Indirizzo IP già registrato' });
    }

    // ✅ Normalizza top/left (accetta numeri o stringhe tipo "45.6%")
    top = parseFloat(String(top || '0').replace('%', '')) || 0;
    left = parseFloat(String(left || '0').replace('%', '')) || 0;

    const [result] = await db.query(
      'INSERT INTO devices (name, type, ip, status, top, `left`) VALUES (?, ?, ?, ?, ?, ?)',
      [name, type, ip, status || 'off', top, left]
    );

    const newDevice = { id: result.insertId, name, type, ip, status: status || 'off', top, left };
    console.log('✅ Device inserito:', newDevice);

    // 🔁 Notifica eventuale WebSocket
    const broadcastUpdate = req.app.get('broadcastUpdate');
    if (broadcastUpdate) {
      broadcastUpdate({ event: 'device_added', device: newDevice });
    }

    res.json(newDevice);
  } catch (error) {
    console.error('❌ Errore POST /api/devices:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// PUT - aggiorna dispositivo
// ====================================================
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  let { name, type, ip, status, top, left } = req.body;

  let conn;
  try {
    conn = await db.getConnection();
    const [rows] = await conn.query('SELECT * FROM devices WHERE id = ?', [id]);
    if (rows.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Device non trovato' });
    }

    const current = rows[0];

    // ✅ Se arrivano stringhe "xx%", trasformale in numeri
    top = top !== undefined ? parseFloat(String(top).replace('%', '')) : current.top;
    left = left !== undefined ? parseFloat(String(left).replace('%', '')) : current.left;

    const updated = {
      name: name || current.name,
      type: type || current.type,
      ip: ip || current.ip,
      status: status || current.status,
      top,
      left,
    };

    await conn.query('UPDATE devices SET ? WHERE id = ?', [updated, id]);
    conn.release();

    console.log('✅ Device aggiornato:', updated);

    // 🔁 Notifica WS
    const broadcastUpdate = req.app.get('broadcastUpdate');
    if (broadcastUpdate) {
      broadcastUpdate({ event: 'device_updated', device: updated });
    }

    res.json(updated);
  } catch (err) {
    if (conn) conn.release();
    console.error('❌ Errore PUT /devices:', err);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// DELETE - rimuovi dispositivo
// ====================================================
router.delete('/:id', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    await conn.query('DELETE FROM devices WHERE id = ?', [req.params.id]);
    conn.release();

    res.json({ message: 'Device eliminato' });

    const broadcastUpdate = req.app.get('broadcastUpdate');
    if (broadcastUpdate) {
      broadcastUpdate({ event: 'device_deleted', id: Number(req.params.id) });
    }
  } catch (err) {
    if (conn) conn.release();
    console.error('❌ Errore DELETE /devices:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
