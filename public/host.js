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
const hostPrevBtn = document.querySelector("#host-prev");
const hostNextBtn = document.querySelector("#host-next");

const initDate = new Date();

const hostPriceInput = document.querySelector("#host-price");
const hostAvailableCheckbox = document.querySelector("#host-available");
const hostApplyBtn = document.querySelector("#host-apply");
const hostClearBtn = document.querySelector("#host-clear");
const hostCalendar = document.querySelector("#host-calendar");
const hostSelectionSummary = document.querySelector("#host-selection-summary");

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
  const start = new Date(fromISODateLocal(startDate).getTime());
  const end = new Date(fromISODateLocal(endDate).getTime());
  if (end.getTime() < start.getTime()) {
    return { start: endDate, end: startDate };
  }
  return { start: startDate, end: endDate };
}

function isWithinRange(dateStr, startDate, endDate) {
  if (!startDate || !endDate) return false;
  return dateStr >= startDate && dateStr <= endDate;
}

function render() {
  hostCalendar.innerHTML = "";
  if (!state.days.length) return;

  const firstDate = fromISODateLocal(state.days[0].date);
  const monthName = firstDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const header = document.createElement("h3");
  header.textContent = monthName;
  hostCalendar.appendChild(header);

  const weekdays = document.createElement("div");
  weekdays.className = "airbnb-weekdays";
  weekdays.innerHTML = `
    <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
  `;
  hostCalendar.appendChild(weekdays);

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

    const inRange = isWithinRange(day.date, selStart, selEnd);
    const isStart = selStart && day.date === selStart;
    const isEnd = selEnd && day.date === selEnd;

    const classes = ["airbnb-day", day.isAvailable ? "available" : "unavailable"];
    if (inRange) classes.push("selected-range");
    if (isStart) classes.push("selected-start");
    if (isEnd) classes.push("selected-end");

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
      updateSelectionSummary();
      render();
    });

    grid.appendChild(cell);
  });

  hostCalendar.appendChild(grid);
}

function updateSelectionSummary() {
  const start = state.selectedStart;
  const end = state.selectedEnd;
  if (start && end) {
    hostSelectionSummary.innerHTML = `du <strong>${formatFR(start)}</strong> au <strong>${formatFR(end)}</strong>`;
  } else if (start) {
    hostSelectionSummary.innerHTML = `depart : <strong>${formatFR(start)}</strong>`;
  } else {
    hostSelectionSummary.innerHTML = `Selection : <strong>—</strong>`;
  }
}

function clearSelection() {
  state.selectedStart = null;
  state.selectedEnd = null;
  updateSelectionSummary();
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
}

hostClearBtn.addEventListener("click", () => {
  clearSelection();
  render();
});

hostApplyBtn.addEventListener("click", async () => {
  try {
    if (!state.selectedStart || !state.selectedEnd) {
      alert("Selectionne une date de depart et une date de fin.");
      return;
    }
    const startDate = state.selectedStart;
    const endDate = state.selectedEnd;
    const pricePerNight = Number(hostPriceInput.value);
    const isAvailable = Boolean(hostAvailableCheckbox.checked);

    if (!Number.isFinite(pricePerNight) || pricePerNight < 0) {
      alert("Prix/nuit invalide.");
      return;
    }

    await api("/api/availability", {
      method: "POST",
      body: JSON.stringify({
        giteId: GITE_ID,
        startDate,
        endDate,
        pricePerNight,
        isAvailable
      })
    });

    clearSelection();
    await loadMonth();
    render();
    alert("Disponibilites et prix appliques.");
  } catch (error) {
    alert(error.message);
  }
});

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

hostPrevBtn.addEventListener("click", async () => {
  clearSelection();
  shiftMonth(-1);
  try {
    await loadMonth();
    render();
  } catch (error) {
    alert(error.message);
  }
});

hostNextBtn.addEventListener("click", async () => {
  clearSelection();
  shiftMonth(1);
  try {
    await loadMonth();
    render();
  } catch (error) {
    alert(error.message);
  }
});

// Init page: charge le mois courant
(async () => {
  try {
    updateSelectionSummary();
    await loadMonth();
    render();
  } catch (error) {
    alert(error.message);
  }
})();

