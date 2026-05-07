const availabilities = new Map();
const bookings = new Map();

let bookingSequence = 1;

function getDateRange(startDate, endDate) {
  const current = new Date(startDate);
  const end = new Date(endDate);
  const days = [];

  while (current <= end) {
    days.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

module.exports = {
  setAvailability({ giteId, startDate, endDate, pricePerNight, isAvailable }) {
    const keyPrefix = `${giteId}:`;
    const days = getDateRange(startDate, endDate);

    for (const day of days) {
      availabilities.set(`${keyPrefix}${day}`, {
        giteId,
        date: day,
        pricePerNight: Number(pricePerNight || 0),
        isAvailable: Boolean(isAvailable)
      });
    }
  },

  getAvailability(giteId, startDate, endDate) {
    const days = getDateRange(startDate, endDate);
    return days.map((day) => {
      const data = availabilities.get(`${giteId}:${day}`);
      return (
        data || {
          giteId,
          date: day,
          pricePerNight: 0,
          isAvailable: false
        }
      );
    });
  },

  isRangeAvailable(giteId, startDate, endDate) {
    const entries = this.getAvailability(giteId, startDate, endDate);
    return entries.every((entry) => entry.isAvailable);
  },

  createBooking(payload) {
    const id = `BKG-${String(bookingSequence++).padStart(4, "0")}`;
    const booking = { id, status: "pending", createdAt: new Date().toISOString(), ...payload };
    bookings.set(id, booking);
    return booking;
  },

  updateBooking(id, updates) {
    const existing = bookings.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    bookings.set(id, updated);
    return updated;
  },

  getBooking(id) {
    return bookings.get(id) || null;
  },

  markRangeAsReserved(giteId, startDate, endDate) {
    const days = getDateRange(startDate, endDate);
    for (const day of days) {
      const key = `${giteId}:${day}`;
      const existing = availabilities.get(key);
      if (existing) {
        availabilities.set(key, { ...existing, isAvailable: false });
      }
    }
  }
};
