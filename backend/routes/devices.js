const express = require("express");
const router = express.Router();
const controller = require("../controllers/devicesController");

// GET tutti i dispositivi
router.get("/", controller.getDevices);

// POST aggiungi dispositivo
router.post("/", controller.addDevice);

// PUT aggiorna stato dispositivo
router.put("/:id/status", controller.updateStatus);

module.exports = router;
