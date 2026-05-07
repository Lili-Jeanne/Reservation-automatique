function calculateNights(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const msDiff = end.getTime() - start.getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  // Convention: startDate/endDate inclusifs => nuits = nombre de jours dans la plage.
  const daysInclusive = Math.floor(msDiff / dayMs) + 1;
  return Math.max(1, daysInclusive);
}

function calculateTotalPrice(availabilityEntries, cleaningFee = 40, serviceFeeRate = 0.08) {
  const baseTotal = availabilityEntries.reduce((sum, day) => sum + Number(day.pricePerNight || 0), 0);
  const serviceFee = Number((baseTotal * serviceFeeRate).toFixed(2));
  const total = Number((baseTotal + cleaningFee + serviceFee).toFixed(2));

  return {
    baseTotal,
    cleaningFee,
    serviceFee,
    total
  };
}

module.exports = {
  calculateNights,
  calculateTotalPrice
};
