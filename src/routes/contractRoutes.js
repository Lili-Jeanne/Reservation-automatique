const express = require("express");
const store = require("../data/store");

const router = express.Router();

router.get("/:bookingId", (req, res) => {
  const booking = store.getBooking(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: "Booking not found." });

  return res.type("html").send(booking.contractHtml || "<p>Contract not generated yet.</p>");
});

router.get("/:bookingId/download", (req, res) => {
  const booking = store.getBooking(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: "Booking not found." });

  const fileName = `contrat-${booking.id}.html`;
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.type("text/html; charset=utf-8");
  return res.send(booking.contractHtml || "<p>Contract not generated yet.</p>");
});

module.exports = router;
