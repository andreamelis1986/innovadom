const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Rotte
const deviceRoutes = require('./routes/devices');
const cameraRoutes = require('./routes/cameras');

app.use('/api/devices', deviceRoutes);
app.use('/api/cameras', cameraRoutes);

const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Backend attivo su http://localhost:${PORT}`));

// arresto stream pulito alla chiusura
process.on('SIGINT', () => {
  console.log('\n🛑 Arresto server e flussi video...');
  require('./services/streamManager').stopAllStreams();
  process.exit();
});
