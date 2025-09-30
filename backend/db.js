const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',       // 👈 cambia se hai un utente diverso
  password: '',       // 👈 se hai password mettila qui
  database: 'innovadomus'
});

module.exports = pool;
