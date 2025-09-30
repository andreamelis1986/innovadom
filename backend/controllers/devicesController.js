const Device = require("../models/deviceModel");

exports.getDevices = (req, res) => {
  Device.getAll((err, devices) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(devices);
  });
};

exports.addDevice = (req, res) => {
  const device = req.body;
  Device.add(device, (err, newDevice) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(newDevice);
  });
};

exports.updateStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  Device.updateStatus(id, status, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
};
