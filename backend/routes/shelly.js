// routes/shelly.js
const express = require('express');
const fetch = require('node-fetch');   // 👈 fix importante
const db = require('../db');           // connessione MySQL
const router = express.Router();

// =====================
// GET tutti i dispositivi
// =====================
router.get('/devices', async (req, res) => {
  try {
    const [devices] = await db.query('SELECT * FROM devices');
    res.json(devices);
  } catch (err) {
    console.error('Errore query DB:', err);
    res.status(500).json({ error: 'Errore caricamento dispositivi' });
  }
});

// =====================
// TOGGLE (per luci)
// =====================
router.post('/devices/:id/toggle', async (req, res) => {
  try {
    const [[device]] = await db.query('SELECT * FROM devices WHERE id = ?', [req.params.id]);

    if (!device) return res.status(404).json({ error: 'Dispositivo non trovato' });
    if (device.type !== 'light') return res.status(400).json({ error: 'Toggle disponibile solo per le luci' });

    const newState = device.state === 'on' ? 'off' : 'on';
    const url = `http://${device.ip}/relay/0?turn=${newState}`;

    await fetch(url);
    await db.query('UPDATE devices SET state = ? WHERE id = ?', [newState, device.id]);

    const updated = { ...device, state: newState };
    res.json(updated);

    req.app.get('wss').clients.forEach(c => c.send(JSON.stringify(updated)));
  } catch (err) {
    console.error('Errore toggle luce:', err);
    res.status(500).json({ error: 'Errore toggle luce' });
  }
});

// =====================
// SHUTTER (apri/chiudi/stop)
// =====================
router.post('/devices/:id/shutter/:action', async (req, res) => {
  try {
    const [[device]] = await db.query('SELECT * FROM devices WHERE id = ?', [req.params.id]);

    if (!device) return res.status(404).json({ error: 'Dispositivo non trovato' });
    if (device.type.trim().toLowerCase() !== 'shutter') {
      console.log("❌ Tipo device non valido:", device.type);
      return res.status(400).json({ error: 'Comando disponibile solo per serrande' });
    }

    const action = req.params.action.toLowerCase();
    let url;

    switch (action) {
      case 'up':   url = `http://${device.ip}/rpc/Cover.Open?id=0`; break;
      case 'down': url = `http://${device.ip}/rpc/Cover.Close?id=0`; break;
      case 'stop': url = `http://${device.ip}/rpc/Cover.Stop?id=0`; break;
      default: return res.status(400).json({ error: 'Azione non valida' });
    }

    await fetch(url);

    const statusRes = await fetch(`http://${device.ip}/rpc/Cover.GetStatus?id=0`);
    const status = await statusRes.json();

    const newState = status.state;
    const position = status.current_pos;

    await db.query('UPDATE devices SET state = ?, position = ? WHERE id = ?', [newState, position, device.id]);

    const updated = { ...device, state: newState, position };
    res.json(updated);

    req.app.get('wss').clients.forEach(c => c.send(JSON.stringify(updated)));
  } catch (err) {
    console.error('Errore comando serranda:', err);
    res.status(500).json({ error: 'Errore comando serranda' });
  }
});

// =====================
// Imposta posizione serranda
// =====================
router.post('/devices/:id/shutter/position', async (req, res) => {
  const { id } = req.params;
  const { pos } = req.body;

  console.log("📌 Richiesta setPosition per device:", id, "pos =", pos);

  try {
    const [rows] = await db.query('SELECT * FROM devices WHERE id = ?', [id]);
    const device = rows[0];

    console.log("📌 Device trovato:", device);
    console.log("📌 Tipo device:", device?.type);

    if (!device || device.type.trim().toLowerCase() !== 'shutter') {
      return res.status(400).json({ error: 'Azione non valida' });
    }

    const response = await fetch(`http://${device.ip}/rpc/Cover.GoToPosition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 0, pos })
    });

    const data = await response.json();
    await db.query('UPDATE devices SET position = ? WHERE id = ?', [pos, id]);

    res.json({ success: true, result: data });

    req.app.get('wss').clients.forEach(c => c.send(JSON.stringify({ ...device, position: pos })));
  } catch (err) {
    console.error("❌ Errore setPosition serranda:", err);
    res.status(500).json({ error: 'Errore comunicazione con Shelly' });
  }
});

module.exports = router;
