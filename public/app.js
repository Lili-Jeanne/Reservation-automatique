async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error ? (data.details ? `${data.error} - ${data.details}` : data.error) : "API error"
    );
  return data;
}

const GITE_ID = "gite-01";
const GITE_NAME = "Gite 01";
const guestPrevBtn = document.querySelector("#guest-prev");
const guestNextBtn = document.querySelector("#guest-next");

const initDate = new Date();

const guestCalendar = document.querySelector("#guest-calendar");
const guestSelectionSummary = document.querySelector("#guest-selection-summary");
const guestAvailabilitySummary = document.querySelector("#guest-availability-summary");

const bookingForm = document.querySelector("#booking-form");
const bookingResult = document.querySelector("#booking-result");
const bookingSubmitBtn = document.querySelector("#booking-submit");

const state = {
  days: [], // { date, isAvailable, pricePerNight }
  selectedStart: null,
  selectedEnd: null,
  currentYear: initDate.getFullYear(),
  currentMonthIndex: initDate.getMonth()
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODateLocal(date) {
  const d = new Date(date);
  const tzOff = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOff).toISOString().slice(0, 10);
}

function fromISODateLocal(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatFR(isoDate) {
  return fromISODateLocal(isoDate).toLocaleDateString("fr-FR");
}

function clampRange(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = fromISODateLocal(startDate);
  const end = fromISODateLocal(endDate);
  if (end.getTime() < start.getTime()) return { start: endDate, end: startDate };
  return { start: startDate, end: endDate };
}

function isWithinRange(dateStr, startDate, endDate) {
  if (!startDate || !endDate) return false;
  return dateStr >= startDate && dateStr <= endDate;
}

function computeRangeAvailability() {
  const ordered = clampRange(state.selectedStart, state.selectedEnd);
  if (!ordered) return null;
  const { start, end } = ordered;
  const rangeDays = state.days.filter((d) => d.date >= start && d.date <= end);
  if (!rangeDays.length) return null;
  return rangeDays.every((d) => d.isAvailable);
}

function computeTotalPriceForRange() {
  const ordered = clampRange(state.selectedStart, state.selectedEnd);
  if (!ordered) return null;
  const { start, end } = ordered;
  const rangeDays = state.days.filter((d) => d.date >= start && d.date <= end);
  if (!rangeDays.length) return null;
  const baseTotal = rangeDays.reduce((sum, d) => sum + Number(d.pricePerNight || 0), 0);
  const cleaningFee = 40;
  const serviceFeeRate = 0.08;
  const serviceFee = Number((baseTotal * serviceFeeRate).toFixed(2));
  const total = Number((baseTotal + cleaningFee + serviceFee).toFixed(2));
  return { baseTotal, cleaningFee, serviceFee, total };
}

function updateGuestMeta() {
  const start = state.selectedStart;
  const end = state.selectedEnd;
  if (start && end) {
    guestSelectionSummary.innerHTML = `du <strong>${formatFR(clampRange(start, end).start)}</strong> au <strong>${formatFR(
      clampRange(start, end).end
    )}</strong>`;
  } else if (start) {
    guestSelectionSummary.innerHTML = `depart : <strong>${formatFR(start)}</strong>`;
  } else {
    guestSelectionSummary.innerHTML = `Selection : <strong>—</strong>`;
  }

  const available = computeRangeAvailability();
  const total = computeTotalPriceForRange();

  if (available === null) {
    guestAvailabilitySummary.textContent = "Disponibilite : —";
    bookingSubmitBtn.disabled = true;
    return;
  }

  if (available) {
    guestAvailabilitySummary.textContent = `Disponibilite : Oui. Total estimé: ${total.total.toFixed(2)} EUR`;
    bookingSubmitBtn.disabled = false;
  } else {
    guestAvailabilitySummary.textContent = "Disponibilite : Non. Veuillez choisir d'autres dates.";
    bookingSubmitBtn.disabled = true;
  }
}

function renderCalendar() {
  guestCalendar.innerHTML = "";
  if (!state.days.length) return;

  const firstDate = fromISODateLocal(state.days[0].date);
  const monthName = firstDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const header = document.createElement("h3");
  header.textContent = monthName;
  guestCalendar.appendChild(header);

  const weekdays = document.createElement("div");
  weekdays.className = "airbnb-weekdays";
  weekdays.innerHTML = `
    <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
  `;
  guestCalendar.appendChild(weekdays);

  const grid = document.createElement("div");
  grid.className = "airbnb-grid";

  const firstDayIndex = (firstDate.getDay() + 6) % 7; // Lundi = 0
  for (let i = 0; i < firstDayIndex; i++) {
    const empty = document.createElement("div");
    empty.className = "airbnb-day empty";
    grid.appendChild(empty);
  }

  let selStart = state.selectedStart;
  let selEnd = state.selectedEnd;
  const ordered = clampRange(selStart, selEnd);
  if (ordered) {
    selStart = ordered.start;
    selEnd = ordered.end;
  }

  state.days.forEach((day) => {
    const cell = document.createElement("button");
    cell.type = "button";
    const classes = ["airbnb-day", day.isAvailable ? "available" : "unavailable"];
    if (isWithinRange(day.date, selStart, selEnd)) classes.push("selected-range");
    if (selStart && day.date === selStart) classes.push("selected-start");
    if (selEnd && day.date === selEnd) classes.push("selected-end");

    cell.className = classes.join(" ");

    const dayNum = fromISODateLocal(day.date).getDate();
    const status = day.isAvailable ? "Oui" : "Non";
    cell.innerHTML = `<span class="day-number">${dayNum}</span><span class="day-price">${day.pricePerNight}€</span><span class="day-status">${status}</span>`;
    cell.title = `${day.date} - ${status}`;

    cell.addEventListener("click", () => {
      if (!state.selectedStart || state.selectedEnd) {
        state.selectedStart = day.date;
        state.selectedEnd = null;
      } else {
        state.selectedEnd = day.date;
        const ordered = clampRange(state.selectedStart, state.selectedEnd);
        if (ordered) {
          state.selectedStart = ordered.start;
          state.selectedEnd = ordered.end;
        }
      }
      updateGuestMeta();
      renderCalendar();
    });

    grid.appendChild(cell);
  });

  guestCalendar.appendChild(grid);
}

function clearSelection() {
  state.selectedStart = null;
  state.selectedEnd = null;
  updateGuestMeta();
}

function getMonthRange(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return { startDate: toISODateLocal(start), endDate: toISODateLocal(end) };
}

async function loadMonth() {
  const { startDate, endDate } = getMonthRange(state.currentYear, state.currentMonthIndex);
  const days = await api(
    `/api/availability?${new URLSearchParams({
      giteId: GITE_ID,
      startDate,
      endDate
    }).toString()}`
  );

  state.days = days.map((d) => ({
    date: d.date,
    isAvailable: Boolean(d.isAvailable),
    pricePerNight: Number(d.pricePerNight || 0)
  }));

  clearSelection();
  renderCalendar();
}

function shiftMonth(delta) {
  state.currentMonthIndex += delta;
  while (state.currentMonthIndex < 0) {
    state.currentMonthIndex += 12;
    state.currentYear -= 1;
  }
  while (state.currentMonthIndex > 11) {
    state.currentMonthIndex -= 12;
    state.currentYear += 1;
  }
}

guestPrevBtn.addEventListener("click", async () => {
  shiftMonth(-1);
  try {
    await loadMonth();
  } catch (error) {
    alert(error.message);
  }
});

guestNextBtn.addEventListener("click", async () => {
  shiftMonth(1);
  try {
    await loadMonth();
  } catch (error) {
    alert(error.message);
  }
});

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  bookingResult.textContent = "";

  try {
    if (!state.selectedStart || !state.selectedEnd) {
      bookingResult.textContent = "Selectionnez d'abord vos dates.";
      return;
    }

    const available = computeRangeAvailability();
    if (!available) {
      bookingResult.textContent = "Ce sejour n'est pas disponible.";
      return;
    }

    const payload = {
      giteId: GITE_ID,
      giteName: GITE_NAME,
      customerName: document.querySelector("#book-customer-name").value,
      customerEmail: document.querySelector("#book-customer-email").value,
      startDate: state.selectedStart,
      endDate: state.selectedEnd
    };

    const response = await api("/api/bookings", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    bookingResult.innerHTML = `
      Reservation ${response.booking.id} creee (statut: ${response.booking.status})<br />
      <a href="${response.checkoutUrl}" target="_blank" rel="noreferrer">Ouvrir le paiement</a><br />
      <a href="/api/contracts/${response.booking.id}" target="_blank" rel="noreferrer">Voir le contrat</a><br />
      <a class="action-link" href="/api/contracts/${response.booking.id}/download">Telecharger le contrat</a>
    `;
  } catch (error) {
    bookingResult.textContent = error.message;
  }
});

(async () => {
  try {
    await loadMonth();
  } catch (error) {
    alert(error.message);
  }
})();
