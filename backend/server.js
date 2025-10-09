// server.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Rotte
app.use('/api/devices', require('./routes/devices'));
app.use('/api/cameras', require('./routes/cameras'));

const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`✅ Backend attivo su http://localhost:${PORT}`);
});

// 🔌 WS status hub
const { init: initStatusHub } = require('./services/statusHub');
initStatusHub(server);

// 🔁 Scansione periodica (ogni 15s) per aggiornare lo stato in DB e notificare i client
const { scanOnce } = require('./services/cameraMonitor');
setInterval(() => {
  scanOnce().catch(e => console.error('Periodic scan error:', e));
}, 15000);

// Arresto pulito stream
process.on('SIGINT', () => {
  console.log('\n🛑 Arresto server e flussi video...');
  require('./services/streamManager').stopAllStreams();
  process.exit();
});
