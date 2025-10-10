// server.js
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// ======================================================
// 🔹 ROUTES API
// ======================================================
app.use('/api/devices', require('./routes/devices'));
app.use('/api/cameras', require('./routes/cameras'));

// ======================================================
// 🔹 AVVIO SERVER HTTP
// ======================================================
const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`✅ Backend attivo su http://localhost:${PORT}`);
});


// ======================================================
// 🔹 STATUS HUB (gestione eventi tra backend e frontend)
// ======================================================
const { init: initStatusHub } = require('./services/statusHub');
initStatusHub(server); // mantiene compatibilità col tuo attuale sistema

// ======================================================
// 🔹 MONITORAGGIO TELECAMERE
// ======================================================
const { startCameraMonitor } = require('./services/cameraMonitor');

// Avvia il monitoraggio periodico (ping + aggiornamento stato)
startCameraMonitor();

// ======================================================
// 🛑 ARRESTO PULITO STREAMING
// ======================================================
process.on('SIGINT', () => {
  console.log('\n🛑 Arresto server e flussi video...');
  require('./services/streamManager').stopAllStreams();
  process.exit();
});
