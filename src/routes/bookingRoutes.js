const express = require("express");
const store = require("../data/store");
const { calculateNights, calculateTotalPrice } = require("../services/pricingService");
const { createCheckoutSession } = require("../services/stripeService");
const { generateContract } = require("../services/contractService");
const { sendBookingEmail } = require("../services/emailService");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const { giteId, giteName, customerName, customerEmail, startDate, endDate } = body;

    if (!giteId || !giteName || !customerName || !customerEmail || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    if (!store.isRangeAvailable(giteId, startDate, endDate)) {
      return res.status(409).json({ error: "Selected dates are not available." });
    }

    const availabilityEntries = store.getAvailability(giteId, startDate, endDate);
    const nights = calculateNights(startDate, endDate);
    const pricing = calculateTotalPrice(availabilityEntries);

    const booking = store.createBooking({
      giteId,
      giteName,
      customerName,
      customerEmail,
      startDate,
      endDate,
      nights,
      pricing
    });

    const contractHtml = await generateContract(booking);
    const checkout = await createCheckoutSession(booking);
    const updated = store.updateBooking(booking.id, {
      contractHtml,
      stripeSessionId: checkout.id
    });

    await sendBookingEmail({
      to: customerEmail,
      subject: `Pre-reservation ${booking.id} - ${giteName}`,
      html: `
        <h2>Votre pre-reservation est en attente de paiement.</h2>
        <p>Reference: <strong>${booking.id}</strong></p>
        <p>Total: <strong>${pricing.total.toFixed(2)} EUR</strong></p>
        <p><a href="${checkout.url}">Payer maintenant</a></p>
      `
    });

    return res.status(201).json({
      booking: updated,
      checkoutUrl: checkout.url
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to create booking.", details: error?.message || String(error) });
  }
});

router.get("/:id", (req, res) => {
  const booking = store.getBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found." });
  return res.json(booking);
});

module.exports = router;
