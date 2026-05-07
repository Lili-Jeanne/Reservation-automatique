const nodemailer = require("nodemailer");
const env = require("../config/env");

const isSmtpConfigured = Boolean(env.smtpHost && env.smtpUser && env.smtpPass);

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass
      }
    })
  : null;

async function sendBookingEmail({ to, subject, html }) {
  if (!transporter) {
    console.log("[MAILER][DRY-RUN]", { to, subject });
    return { dryRun: true };
  }

  try {
    return await transporter.sendMail({
      from: env.emailFrom,
      to,
      subject,
      html
    });
  } catch (error) {
    // Ne bloque pas la réservation: la dispo/paiement doit fonctionner meme si SMTP est mal configure.
    // En prod, tu peux activer un mode strict via EMAIL_STRICT=true.
    console.error("[MAILER][ERROR]", { to, subject, message: error?.message || String(error) });
    if (env.emailStrict) throw error;
    return { sent: false, error: error?.message || String(error) };
  }
}

module.exports = {
  sendBookingEmail
};
