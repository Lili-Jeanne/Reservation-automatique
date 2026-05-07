const fs = require("fs/promises");
const path = require("path");

const templatePath = path.join(__dirname, "../../templates/contract-template.html");

function applyTemplate(template, variables) {
  return Object.entries(variables).reduce((acc, [key, value]) => {
    const token = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    return acc.replace(token, String(value ?? ""));
  }, template);
}

async function generateContract(booking) {
  const rawTemplate = await fs.readFile(templatePath, "utf-8");
  const variables = {
    bookingId: booking.id,
    tenantName: booking.customerName,
    tenantEmail: booking.customerEmail,
    giteName: booking.giteName,
    startDate: booking.startDate,
    endDate: booking.endDate,
    nights: booking.nights,
    baseTotal: booking.pricing.baseTotal.toFixed(2),
    cleaningFee: booking.pricing.cleaningFee.toFixed(2),
    serviceFee: booking.pricing.serviceFee.toFixed(2),
    total: booking.pricing.total.toFixed(2),
    generatedAt: new Date().toLocaleString("fr-FR")
  };

  return applyTemplate(rawTemplate, variables);
}

module.exports = {
  generateContract
};
