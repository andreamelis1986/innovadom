const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'innovadomus',
});

// 🔹 Test di scrittura semplice
app.post('/test-insert', async (req, res) => {
  console.log('➡️ POST /test-insert', req.body);

  try {
    const [result] = await db.query(
      'INSERT INTO devices (name, type, ip, status) VALUES (?, ?, ?, ?)',
      [req.body.name, req.body.type, req.body.ip, req.body.status]
    );

    const inserted = {
      id: result.insertId,
      name: req.body.name,
      type: req.body.type,
      ip: req.body.ip,
      status: req.body.status,
    };

    console.log('✅ Inserito:', inserted);

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(inserted));
    console.log('📤 Risposta inviata');
  } catch (err) {
    console.error('❌ Errore:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('🚀 Test server su http://localhost:3001'));
