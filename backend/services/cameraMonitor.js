// services/cameraMonitor.js
const db = require('../db/connection');
const { startStream } = require('./streamManager');
const { broadcastCameraUpdate } = require('./statusHub');
const ping = require('ping');
const axios = require('axios');

// 🔁 intervallo di controllo (ms)
const SCAN_INTERVAL = 60_000;

/**
 * 🔹 Controlla se una telecamera risponde (ping + http fallback)
 */
async function isCameraOnline(ip) {
  try {
    // 1️⃣ Ping ICMP
    const res = await ping.promise.probe(ip, { timeout: 1.5, extra: ['-c', '1'] });
    if (res.alive) return true;

    // 2️⃣ HTTP fallback (alcune IP cam rispondono su /)
    try {
      const r = await axios.get(`http://${ip}`, { timeout: 1000 });
      return r.status === 200;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * 🔍 Esegue una scansione di tutte le telecamere attive
 */
async function scanOnce() {
  try {
    const [rows] = await db.query(`
      SELECT d.id, d.name, d.status, d.ip, dc.rtsp_url, dc.ws_port
      FROM devices d
      JOIN device_cameras dc ON dc.device_id = d.id
      WHERE d.type='camera' AND d.is_active=1
    `);

    for (const cam of rows) {
      if (!cam.ip) continue;

      // 🔎 Verifica reale
      const online = await isCameraOnline(cam.ip);
      const newStatus = online ? 'active' : 'offline';

      if (newStatus !== cam.status) {
        await db.query('UPDATE devices SET status=? WHERE id=?', [newStatus, cam.id]);
        broadcastCameraUpdate({ id: cam.id, status: newStatus });
        console.log(`📡 Camera "${cam.name}" (${cam.ip}) → ${newStatus.toUpperCase()}`);
      }

      // 🟢 se online, avvia/riavvia stream
      if (online && cam.rtsp_url && cam.ws_port) {
        startStream(cam.rtsp_url, cam.ws_port);
      }
    }
  } catch (err) {
    console.error('❌ Errore durante la scansione telecamere:', err.message);
  }
}

/**
 * 🚀 Avvia monitoraggio periodico (ogni 60 secondi)
 */
function startCameraMonitor() {
  console.log('🛰️  Avvio monitoraggio telecamere...');
  scanOnce(); // prima scansione immediata
  setInterval(scanOnce, SCAN_INTERVAL);
}

module.exports = { scanOnce, startCameraMonitor };
