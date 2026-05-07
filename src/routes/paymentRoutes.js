const express = require("express");
const store = require("../data/store");
const { verifyWebhookSignature } = require("../services/stripeService");
const { sendBookingEmail } = require("../services/emailService");

const router = express.Router();

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"];
    let event = null;

    try {
      event = verifyWebhookSignature(req.body, signature);
    } catch (error) {
      return res.status(400).send(`Webhook signature error: ${error.message}`);
    }

    if (!event) {
      return res.status(200).json({ message: "Stripe not configured, webhook ignored." });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const bookingId = session.metadata.bookingId;
      const booking = store.getBooking(bookingId);

      if (booking) {
        const updated = store.updateBooking(bookingId, {
          status: "paid",
          paymentIntentId: session.payment_intent
        });
        store.markRangeAsReserved(updated.giteId, updated.startDate, updated.endDate);

        await sendBookingEmail({
          to: updated.customerEmail,
          subject: `Confirmation de reservation ${updated.id}`,
          html: `
            <h2>Reservation confirmee</h2>
            <p>Merci ${updated.customerName}, votre paiement a ete valide.</p>
            <p>Contrat:</p>
            ${updated.contractHtml}
          `
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Webhook processing failed." });
  }
});

module.exports = router;
