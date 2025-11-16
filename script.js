// Tori Time Tracker 2.0
// Uses Google Apps Script as a write-only API to your "Data" sheet

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyLKGLryz0xtThsrB4Ws7vncWZTyRfxOb4OBoQ8lVZYg6NSbVojc4ueWv1JxAlpj6-AXA/exec";

const STORAGE_KEYS = {
  current: "toriCurrentSession",
  entries: "toriEntries",
};

let currentSession = null;
let entries = [];
let timerInterval = null;

// DOM references
let whereInput,
  startBtn,
  stopBtn,
  statusText,
  elapsedDisplay,
  messageBox,
  entriesList,
  noEntriesText,
  totalTimeDisplay,
  totalDatesDisplay;

document.addEventListener("DOMContentLoaded", () => {
  whereInput = document.getElementById("where-input");
  startBtn = document.getElementById("start-btn");
  stopBtn = document.getElementById("stop-btn");
  statusText = document.getElementById("status-text");
  elapsedDisplay = document.getElementById("elapsed-time");
  messageBox = document.getElementById("message");
  entriesList = document.getElementById("entries-list");
  noEntriesText = document.getElementById("no-entries");
  totalTimeDisplay = document.getElementById("total-time");
  totalDatesDisplay = document.getElementById("total-dates");

  // 🔽 NEW: hook up sticky bar buttons after DOM is ready
  const startMobileBtn = document.getElementById("start-btn-mobile");
  const stopMobileBtn = document.getElementById("stop-btn-mobile");

  if (startMobileBtn) {
    startMobileBtn.addEventListener("click", () => startBtn.click());
  }

  if (stopMobileBtn) {
    stopMobileBtn.addEventListener("click", () => stopBtn.click());
  }

  loadFromStorage();
  bindEvents();
  refreshUI();
});


// Load existing session + entries from localStorage
function loadFromStorage() {
  try {
    const currentRaw = localStorage.getItem(STORAGE_KEYS.current);
    const entriesRaw = localStorage.getItem(STORAGE_KEYS.entries);

    currentSession = currentRaw ? JSON.parse(currentRaw) : null;
    entries = entriesRaw ? JSON.parse(entriesRaw) : [];

    // If a session is active, restart the timer
    if (currentSession && currentSession.startISO) {
      startTimerFrom(new Date(currentSession.startISO));
    }
  } catch (err) {
    console.error("Error loading from storage", err);
    currentSession = null;
    entries = [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
}

function saveCurrentSession() {
  if (currentSession) {
    localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(currentSession));
  } else {
    localStorage.removeItem(STORAGE_KEYS.current);
  }
}

function bindEvents() {
  startBtn.addEventListener("click", onStart);
  stopBtn.addEventListener("click", onStop);

  // Re-render when toggling edit mode
  document.getElementById("toggle-edit-mode")
    .addEventListener("change", renderEntries);
}

function onStart() {
  clearMessage();

  const claimedValue = getClaimedBy();
  if (!claimedValue) {
    showMessage("Please choose who is claiming the date 💗", "error");
    return;
  }

  const whereValue = (whereInput.value || "").trim();
  if (!whereValue) {
    showMessage("Please describe where / what you’re doing 💕", "error");
    whereInput.focus();
    return;
  }

  if (currentSession) {
    showMessage("You already have an active Tori Time running.", "error");
    return;
  }

  const startDate = new Date();

  currentSession = {
    startISO: startDate.toISOString(),
    where: whereValue,
    claimedBy: claimedValue,
  };

  saveCurrentSession();
  startTimerFrom(startDate);
  refreshUI();
  showMessage("Tori Time started ✨", "success");
}

function onStop() {
  clearMessage();

  if (!currentSession || !currentSession.startISO) {
    showMessage("No active Tori Time to stop.", "error");
    return;
  }

  const startDate = new Date(currentSession.startISO);
  const endDate = new Date();

  if (endDate <= startDate) {
    showMessage("End time must be after start time.", "error");
    return;
  }

  const entry = buildEntry(startDate, endDate, currentSession.where, currentSession.claimedBy);

  // Add to local list
  entries.push(entry);
  saveEntries();

  // Send to Google Sheets
  sendToGoogleSheet(entry);

  // Clear current session
  currentSession = null;
  saveCurrentSession();
  stopTimer();
  elapsedDisplay.textContent = "00:00:00";

  whereInput.value = "";

  refreshUI();
  showMessage("Tori Time stopped and logged 💗", "success");
}

function buildEntry(startDate, endDate, where, claimedBy) {
  const dateOptions = { year: "numeric", month: "numeric", day: "numeric" };
  const dateStr = startDate.toLocaleDateString("en-US", dateOptions); // mm/dd/yyyy

  const dayOfWeek = startDate.toLocaleDateString("en-US", { weekday: "long" });

  const timeOptions = { hour: "numeric", minute: "2-digit" };
  const timeStarted = startDate.toLocaleTimeString("en-US", timeOptions);
  const timeEnded = endDate.toLocaleTimeString("en-US", timeOptions);

  const diffMs = endDate - startDate;
  const timeSpent = formatDuration(diffMs);

  return {
    dateNumber: "",
    date: dateStr,
    dayOfWeek,
    where,
    claimedBy,
    timeStarted,
    timeEnded,
    timeSpent,
    editing: false,
  };
}

function getClaimedBy() {
  const selected = document.querySelector('input[name="claimed-by"]:checked');
  return selected ? selected.value : "";
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

function startTimerFrom(startDate) {
  stopTimer();

  timerInterval = setInterval(() => {
    const now = new Date();
    const diffMs = now - startDate;
    if (diffMs < 0) return;
    elapsedDisplay.textContent = formatDuration(diffMs);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function sendToGoogleSheet(entry) {
  const payload = {
    dateNumber: entry.dateNumber,
    date: entry.date,
    dayOfWeek: entry.dayOfWeek,
    where: entry.where,
    claimedBy: entry.claimedBy,
    timeStarted: entry.timeStarted,
    timeEnded: entry.timeEnded,
    timeSpent: entry.timeSpent,
  };

  fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.error("Error sending to Google Sheets", err);
    showMessage(
      "Saved locally but failed to write to Google Sheets.",
      "error"
    );
  });
}

function refreshUI() {
  if (currentSession && currentSession.startISO) {
    statusText.textContent = "Tori Time in progress…";
    statusText.classList.remove("status-idle");
    statusText.classList.add("status-running");
    startBtn.disabled = true;
    stopBtn.disabled = false;
    whereInput.disabled = true;
  } else {
    statusText.textContent = "No active Tori Time";
    statusText.classList.remove("status-running");
    statusText.classList.add("status-idle");
    startBtn.disabled = false;
    stopBtn.disabled = true;
    whereInput.disabled = false;
  }

  renderEntries();
  updateSummary();
}


// ⭐⭐⭐ EDIT + DELETE SYSTEM — FULLY FIXED ⭐⭐⭐

function renderEntries() {
  entriesList.innerHTML = "";

  if (!entries.length) {
    noEntriesText.style.display = "block";
    return;
  }

  noEntriesText.style.display = "none";

  const editMode = document.getElementById("toggle-edit-mode")?.checked;

  [...entries]
    .map((entry, index) => ({ ...entry, index }))
    .reverse()
    .forEach((entry) => {
      const li = document.createElement("li");
      li.className = "entry-item";

      if (entry.editing) {
        li.appendChild(renderEditForm(entry));
        entriesList.appendChild(li);
        return;
      }

      const topRow = document.createElement("div");
      topRow.className = "entry-top-row";
      topRow.textContent = `${entry.date} (${entry.dayOfWeek})`;

      const whereRow = document.createElement("div");
      whereRow.className = "entry-where";
      whereRow.textContent = entry.where;

      const timesRow = document.createElement("div");
      timesRow.className = "entry-times";
      timesRow.textContent = `${entry.timeStarted} → ${entry.timeEnded} · ${entry.timeSpent}`;

      const metaRow = document.createElement("div");
      metaRow.className = "entry-meta";
      metaRow.textContent = `Claimed by: ${entry.claimedBy}`;

      li.appendChild(topRow);
      li.appendChild(whereRow);
      li.appendChild(timesRow);
      li.appendChild(metaRow);

      if (editMode) {
        const actions = document.createElement("div");
        actions.className = "entry-actions";

        const editBtn = document.createElement("button");
        editBtn.className = "action-btn action-edit";
        editBtn.textContent = "✏️ Edit";
        editBtn.addEventListener("click", () => enterEdit(entry.index));

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "action-btn action-delete";
        deleteBtn.textContent = "🗑️ Delete";
        deleteBtn.addEventListener("click", () => deleteEntry(entry.index));

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        li.appendChild(actions);
      }

      entriesList.appendChild(li);
    });
}

function enterEdit(index) {
  entries[index].editing = true;
  saveEntries();
  renderEntries();
}

function cancelEdit(index) {
  delete entries[index].editing;
  saveEntries();
  renderEntries();
}

function saveEdit(index, updated) {
  const e = entries[index];

  e.where = updated.where;
  e.claimedBy = updated.claimedBy;
  e.timeStarted = updated.timeStarted;
  e.timeEnded = updated.timeEnded;

  const start = new Date(`1/1/2000 ${e.timeStarted}`);
  const end = new Date(`1/1/2000 ${e.timeEnded}`);

  const diff = end - start;
  if (diff > 0) e.timeSpent = formatDuration(diff);

  delete e.editing;
  saveEntries();
  renderEntries();
}

function deleteEntry(index) {
  if (!confirm("Delete this Tori Time entry? 💔")) return;
  entries.splice(index, 1);
  saveEntries();
  updateSummary();
  renderEntries();
}

function renderEditForm(entry) {
  const wrapper = document.createElement("div");

  wrapper.innerHTML = `
    <input class="entry-edit-input" data-field="where" value="${entry.where}">
    <select class="entry-edit-input" data-field="claimedBy">
      <option value="Nicole" ${entry.claimedBy === "Nicole" ? "selected" : ""}>Nicole</option>
      <option value="Tori" ${entry.claimedBy === "Tori" ? "selected" : ""}>Tori</option>
      <option value="Nictori" ${entry.claimedBy === "Nictori" ? "selected" : ""}>Nictori</option>
    </select>
    <input class="entry-edit-input" data-field="timeStarted" value="${entry.timeStarted}">
    <input class="entry-edit-input" data-field="timeEnded" value="${entry.timeEnded}">

    <div class="entry-actions">
      <button class="action-btn action-edit">Save</button>
      <button class="action-btn action-delete">Cancel</button>
    </div>
  `;

  wrapper.querySelector(".action-edit").onclick = () => {
    const updated = {};
    wrapper.querySelectorAll("[data-field]").forEach((input) => {
      updated[input.dataset.field] = input.value;
    });
    saveEdit(entry.index, updated);
  };

  wrapper.querySelector(".action-delete").onclick = () => cancelEdit(entry.index);

  return wrapper;
}

function updateSummary() {
  let totalSeconds = 0;
  entries.forEach((entry) => {
    const parts = entry.timeSpent.split(":").map(Number);
    totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
  });

  totalTimeDisplay.textContent = formatDuration(totalSeconds * 1000);
  totalDatesDisplay.textContent = entries.length;
}

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.classList.remove("success", "error");
  if (type) messageBox.classList.add(type);
}

function clearMessage() {
  showMessage("", null);
}

