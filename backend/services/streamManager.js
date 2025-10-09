// services/streamManager.js
const { spawn } = require('child_process');
const WebSocket = require('ws');

const activeStreams = {}; // mappa: { wsPort: { process, wss } }

function startStream(rtspUrl, wsPort) {
  // Se esiste già un flusso sulla stessa porta → non lo riavvia
  if (activeStreams[wsPort]) {
    console.log(`♻️ Stream già attivo su ws://localhost:${wsPort}`);
    return;
  }

  console.log(`🎥 Avvio stream da ${rtspUrl} → ws://localhost:${wsPort}`);

  // Avvia server WebSocket per questa porta
  const wss = new WebSocket.Server({ port: wsPort });
  let clients = 0;

  wss.on('connection', (socket) => {
    clients++;
    console.log(`🔌 Client connesso su ws://localhost:${wsPort} (${clients} totali)`);

    socket.on('close', () => {
      clients--;
      console.log(`❌ Client disconnesso da ws://${wsPort} (${clients} rimasti)`);

      if (clients <= 0 && activeStreams[wsPort]) {
        console.log(`🛑 Nessun client → chiudo stream ${wsPort}`);
        stopStream(wsPort);
      }
    });
  });

  // Comando ffmpeg → converte RTSP in MPEG1 per WebSocket
  const ffmpeg = spawn('ffmpeg', [
    '-rtsp_transport', 'tcp',
    '-i', rtspUrl,
    '-an',                         // 🔇 no audio
    '-c:v', 'mpeg1video',          // 🔹 codec compatibile con JSMpeg
    '-b:v', '2000k',
    '-r', '25',
    '-s', '1280x720',              // 🔹 risoluzione fissa (o adattabile)
    '-f', 'mpegts',                // 🔹 output formato TS
    '-bf', '0',
    '-q:v', '5',
    '-'
  ]);


  ffmpeg.stdout.on('data', (data) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    });
  });

  ffmpeg.stderr.on('data', (data) => {
    ffmpeg.stdout.on('error', (err) => {
      console.error(`❌ Errore stream stdout [${wsPort}]:`, err);
    });
    const msg = data.toString();
    if (msg.includes('Error')) console.error(`⚠️ FFmpeg errore [${wsPort}]:`, msg);
  });

  ffmpeg.on('close', (code) => {
    console.log(`🧹 FFmpeg terminato su porta ${wsPort} (code: ${code})`);
    stopStream(wsPort);
  });

  activeStreams[wsPort] = { process: ffmpeg, wss };
}

function stopStream(wsPort) {
  const entry = activeStreams[wsPort];
  if (!entry) return;

  try {
    if (entry.process) entry.process.kill('SIGINT');
    if (entry.wss) entry.wss.close();
    console.log(`🛑 Stream chiuso su ws://localhost:${wsPort}`);
  } catch (err) {
    console.warn(`⚠️ Errore chiusura stream ${wsPort}:`, err);
  }

  delete activeStreams[wsPort];
}

function stopAllStreams() {
  Object.keys(activeStreams).forEach(stopStream);
}

module.exports = { startStream, stopStream, stopAllStreams };
