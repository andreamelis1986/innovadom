const express = require('express');
const router = express.Router();
const db = require('../db');

// GET - tutti i dispositivi
router.get('/', (req, res) => {
  db.query('SELECT * FROM devices', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST - aggiungi dispositivo
router.post('/', (req, res) => {
  const { name, type, ip, status } = req.body;
  const sql = 'INSERT INTO devices (name, type, ip, status) VALUES (?, ?, ?, ?)';
  db.query(sql, [name, type, ip, status], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    const newDevice = { id: result.insertId, name, type, ip, status };
    res.json(newDevice);

    // 🔥 Broadcast WebSocket (se definito nel server.js)
    const broadcastUpdate = req.app.get('broadcastUpdate');
    if (broadcastUpdate) {
      broadcastUpdate({ event: 'device_added', device: newDevice });
    }
  });
});

// PUT - aggiorna dispositivo
router.put('/devices/:id', (req, res) => {
  const { id } = req.params;
  const { name, type, ip, status, position } = req.body;

  // 🔹 Recupera prima il record esistente
  db.query('SELECT * FROM devices WHERE id = ?', [id], (err, rows) => {
    if (err || rows.length === 0) {
      console.error('❌ Errore o device non trovato:', err);
      return res.status(404).json({ error: 'Device not found' });
    }

    const current = rows[0];
    // 🔹 Mantiene i campi precedenti se non arrivano nel body
    const updated = {
      name: name || current.name,
      type: type || current.type,
      ip: ip || current.ip,
      status: status || current.status,
      position: position ?? current.position
    };

    db.query('UPDATE devices SET ? WHERE id = ?', [updated, id], (err2) => {
      if (err2) {
        console.error('❌ Errore UPDATE:', err2);
        return res.status(500).json({ error: err2.message });
      }
      console.log('✅ Device aggiornato:', updated);
      res.json(updated);
    });
  });
});


// DELETE - rimuovi dispositivo
router.delete('/:id', (req, res) => {
  db.query('DELETE FROM devices WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Device eliminato' });

    const broadcastUpdate = req.app.get('broadcastUpdate');
    if (broadcastUpdate) {
      broadcastUpdate({ event: 'device_deleted', id: Number(req.params.id) });
    }
  });
});

module.exports = router;
