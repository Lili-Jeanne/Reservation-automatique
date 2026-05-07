const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  baseUrl: process.env.BASE_URL || "http://localhost:3000",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  stripeCurrency: process.env.STRIPE_CURRENCY || "eur",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  emailFrom: process.env.EMAIL_FROM || "Gites Booking <noreply@example.com>",
  hostBasicUser: process.env.HOST_BASIC_USER || "host",
  hostBasicPass: process.env.HOST_BASIC_PASS || "changeme",
  emailStrict: String(process.env.EMAIL_STRICT || "false").toLowerCase() === "true",
  hostSessionSecret: process.env.HOST_SESSION_SECRET || "dev_change_me_to_a_long_random_secret",
  hostCookieName: process.env.HOST_COOKIE_NAME || "host_token",
  hostSessionTtlMs: Number(process.env.HOST_SESSION_TTL_MS || 12 * 60 * 60 * 1000)
};
