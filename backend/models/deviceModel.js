const db = require("../db");

module.exports = {
  getAll: (callback) => {
    db.query("SELECT * FROM devices", (err, results) => {
      callback(err, results);
    });
  },

  add: (device, callback) => {
    const { name, type, ip, status } = device;
    db.query(
      "INSERT INTO devices (name, type, ip, status) VALUES (?, ?, ?, ?)",
      [name, type, ip, status],
      (err, results) => {
        if (err) return callback(err);
        callback(null, { id: results.insertId, ...device });
      }
    );
  },

  updateStatus: (id, status, callback) => {
    db.query(
      "UPDATE devices SET status = ? WHERE id = ?",
      [status, id],
      (err, results) => {
        if (err) return callback(err);
        callback(null, { updated: results.affectedRows });
      }
    );
  }
};
