const Stripe = require("stripe");
const env = require("../config/env");

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

async function createCheckoutSession(booking) {
  if (!stripe) {
    return {
      id: `test_session_${booking.id}`,
      url: `${env.baseUrl}/?mockPayment=success&bookingId=${booking.id}`,
      mode: "mock"
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: booking.customerEmail,
    metadata: {
      bookingId: booking.id,
      giteId: booking.giteId
    },
    line_items: [
      {
        price_data: {
          currency: env.stripeCurrency,
          product_data: {
            name: `Reservation ${booking.giteName} (${booking.startDate} -> ${booking.endDate})`
          },
          unit_amount: Math.round(booking.pricing.total * 100)
        },
        quantity: 1
      }
    ],
    success_url: `${env.baseUrl}/?payment=success&bookingId=${booking.id}`,
    cancel_url: `${env.baseUrl}/?payment=cancelled&bookingId=${booking.id}`
  });

  return { id: session.id, url: session.url, mode: "stripe" };
}

function verifyWebhookSignature(rawBody, signature) {
  if (!stripe || !env.stripeWebhookSecret) return null;
  return stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
}

module.exports = {
  createCheckoutSession,
  verifyWebhookSignature
};
