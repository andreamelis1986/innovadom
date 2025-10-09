const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');

const streams = new Map();

function startStream(rtspUrl, wsPort) {
  if (streams.has(wsPort)) {
    console.log(`⚠️ Stream già attivo sulla porta ${wsPort}`);
    return;
  }

  console.log(`🎥 Avvio stream da ${rtspUrl} → ws://localhost:${wsPort}`);
  const wss = new WebSocketServer({ port: wsPort });

  const ffmpeg = spawn('ffmpeg', [
    '-rtsp_transport', 'tcp',
    '-i', rtspUrl,
    '-f', 'mpegts',
    '-codec:v', 'mpeg1video',
    '-r', '25',
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
    const msg = data.toString();
    if (msg.includes('frame=')) {
      process.stdout.write(msg); // mostra avanzamento
    } else if (msg.includes('error') || msg.includes('Failed')) {
      console.error('❌ FFmpeg:', msg);
    }
  });

  ffmpeg.on('close', (code) => {
    console.log(`❌ Stream terminato (porta ${wsPort}) - codice ${code}`);
    streams.delete(wsPort);
  });

  streams.set(wsPort, { process: ffmpeg, wss });
}

function stopAllStreams() {
  streams.forEach(({ process }, port) => {
    console.log(`🛑 Arresto stream su porta ${port}`);
    process.kill('SIGINT');
  });
  streams.clear();
}

module.exports = { startStream, stopAllStreams };
