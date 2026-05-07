const express = require("express");
const store = require("../data/store");
const { hostAuth } = require("../middleware/hostAuth");

const router = express.Router();

router.post("/", hostAuth, (req, res) => {
  const { giteId, startDate, endDate, pricePerNight, isAvailable } = req.body;

  if (!giteId || !startDate || !endDate) {
    return res.status(400).json({ error: "giteId, startDate and endDate are required." });
  }

  store.setAvailability({ giteId, startDate, endDate, pricePerNight, isAvailable });
  return res.status(201).json({ message: "Availability updated." });
});

router.get("/", (req, res) => {
  const { giteId, startDate, endDate } = req.query;
  if (!giteId || !startDate || !endDate) {
    return res.status(400).json({ error: "giteId, startDate and endDate are required." });
  }

  const data = store.getAvailability(giteId, startDate, endDate);
  return res.json(data);
});

module.exports = router;
