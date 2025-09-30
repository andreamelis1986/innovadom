const db = require("../db");
const axios = require("axios");

exports.toggleShellyById = async (req, res) => {
  const { id, action } = req.body; // action = "on" | "off"

  db.query("SELECT ip FROM devices WHERE id = ?", [id], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: "Device non trovato" });
    }

    const ip = results[0].ip;
    try {
      await axios.get(`http://${ip}/relay/0?turn=${action}`);

      // aggiorna lo stato nel DB
      db.query("UPDATE devices SET status = ? WHERE id = ?", [action, id]);

      res.json({ success: true, message: `Dispositivo ${id} -> ${action}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};
