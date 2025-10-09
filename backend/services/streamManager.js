const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');

const streams = new Map(); // mappa porta → processo ffmpeg

function startStream(rtspUrl, wsPort) {
  if (streams.has(wsPort)) {
    console.log(`⚠️ Stream già attivo sulla porta ${wsPort}`);
    return;
  }

  console.log(`🎥 Avvio stream RTSP → ws://localhost:${wsPort}`);
  const wss = new WebSocketServer({ port: wsPort });

  const ffmpeg = spawn('ffmpeg', [
    '-rtsp_transport', 'tcp',
    '-i', rtspUrl,
    '-f', 'mpegts',
    '-codec:v', 'mpeg1video',
    '-r', '30',
    '-b:v', '800k',
    '-bf', '0',
    '-muxdelay', '0.1',
    'pipe:1'
  ]);

  ffmpeg.stdout.on('data', (data) => {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(data);
    });
  });

  ffmpeg.stderr.on('data', (data) => {
    // opzionale: mostrare log ffmpeg
  });

  ffmpeg.on('close', () => {
    console.log(`❌ Stream terminato sulla porta ${wsPort}`);
    streams.delete(wsPort);
  });

  streams.set(wsPort, { process: ffmpeg, wss });
}

function stopAllStreams() {
  streams.forEach(({ process }, port) => {
    console.log(`🛑 Arresto stream porta ${port}`);
    process.kill('SIGINT');
  });
  streams.clear();
}

module.exports = { startStream, stopAllStreams };
