const express = require("express");
const router = express.Router();
const { readHuaweiData } = require("../services/huawei");

router.get("/status", async (req, res) => {
  const data = await readHuaweiData();
  if (!data) return res.status(500).json({ error: "Impossibile leggere inverter" });
  res.json(data);
});

module.exports = router;
