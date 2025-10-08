const mysql = require('mysql2/promise');

// ====================================================
// ✅ CONFIGURAZIONE STABILE DEL POOL MYSQL
// ====================================================

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',          // 👈 cambia se serve
  password: '',          // 👈 metti la tua password se esiste
  database: 'innovadomus',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ====================================================
// ✅ LOG CONNESSIONE
// ====================================================
pool.getConnection()
  .then(conn => {
    console.log('🔌 Connessione MySQL stabilita');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Errore connessione MySQL:', err.message);
  });

// ====================================================
// ✅ ESPORTAZIONE UNIVERSALE
// ====================================================
module.exports = pool;
