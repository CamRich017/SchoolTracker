const MAX_CLASSES = 8;
const STORAGE_KEY = "schooltracker.v2";
const BROWSER_USER_KEY = "schooltracker.browserUserId";

const addClassBtn = document.getElementById("addClassBtn");
const classesContainer = document.getElementById("classesContainer");
const classCounter = document.getElementById("classCounter");
const maxNotice = document.getElementById("maxNotice");
const classCardTemplate = document.getElementById("classCardTemplate");

const navDashboard = document.getElementById("navDashboard");
const navCalendar = document.getElementById("navCalendar");
const dashboardView = document.getElementById("dashboardView");
const calendarView = document.getElementById("calendarView");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const calendarGrid = document.getElementById("calendarGrid");
const calendarMonthLabel = document.getElementById("calendarMonthLabel");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getBrowserUserId() {
  const existing = localStorage.getItem(BROWSER_USER_KEY);
  if (existing) return existing;
  const next = makeId();
  localStorage.setItem(BROWSER_USER_KEY, next);
  return next;
}

function buildDefaultState() {
  const now = new Date();
  return {
    users: {},
    currentView: "dashboard",
    calendarYear: now.getFullYear(),
    calendarMonth: now.getMonth()
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultState();
    const parsed = JSON.parse(raw);
    return {
      ...buildDefaultState(),
      ...parsed
    };
  } catch (err) {
    return buildDefaultState();
  }
}

const state = loadState();
const browserUserId = getBrowserUserId();

function getCurrentUserData() {
  if (!state.users[browserUserId]) {
    state.users[browserUserId] = { classes: [] };
  }
  return state.users[browserUserId];
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDueDate(rawDate) {
  const date = new Date(`${rawDate}T00:00:00`);
  return Number.isNaN(date.getTime()) ? rawDate : date.toLocaleDateString();
}

function allDueItems() {
  const user = getCurrentUserData();
  const items = [];

  user.classes.forEach((classObj) => {
    classObj.assignments.forEach((item) => {
      items.push({ ...item, className: classObj.name, type: "assignment" });
    });
    classObj.quizzes.forEach((item) => {
      items.push({ ...item, className: classObj.name, type: "quiz" });
    });
  });

  return items;
}

function updateCounter() {
  const total = getCurrentUserData().classes.length;
  classCounter.textContent = `${total} / ${MAX_CLASSES} classes`;
  const atMax = total >= MAX_CLASSES;
  addClassBtn.disabled = atMax;
  maxNotice.textContent = atMax ? "You reached the maximum of 8 classes." : "";
}

function createItemRow(item, typeLabel) {
  const li = document.createElement("li");
  li.innerHTML = `<span>${item.name}</span><span class="due-date">${typeLabel}: ${formatDueDate(item.dueDate)}</span>`;
  return li;
}

function renderDashboard() {
  classesContainer.innerHTML = "";

  getCurrentUserData().classes.forEach((classObj, i) => {
    const fragment = classCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".class-card");
    const summaryBtn = fragment.querySelector(".class-summary");
    const title = fragment.querySelector(".class-title");
    const content = fragment.querySelector(".class-content");
    const classNameInput = fragment.querySelector(".class-name-input");
    const removeClassBtn = fragment.querySelector(".remove-class-btn");
    const assignmentForm = fragment.querySelector(".assignment-form");
    const quizForm = fragment.querySelector(".quiz-form");
    const assignmentsList = fragment.querySelector(".assignments-list");
    const quizzesList = fragment.querySelector(".quizzes-list");

    const fallback = `Class ${i + 1}`;
    title.textContent = classObj.name || fallback;
    classNameInput.value = classObj.name || fallback;

    if (!classObj.collapsed) {
      card.classList.remove("collapsed");
      content.hidden = false;
      summaryBtn.setAttribute("aria-expanded", "true");
    }

    summaryBtn.addEventListener("click", () => {
      classObj.collapsed = !classObj.collapsed;
      const opening = card.classList.contains("collapsed");

      if (opening) {
        card.classList.remove("collapsed");
        content.hidden = false;
        summaryBtn.setAttribute("aria-expanded", "true");
      } else {
        summaryBtn.setAttribute("aria-expanded", "false");
        content.hidden = true;
        card.classList.add("collapsed");
      }
      saveState();
    });

    classNameInput.addEventListener("input", () => {
      const value = classNameInput.value.trim();
      classObj.name = value || fallback;
      title.textContent = classObj.name;
      saveState();
      renderCalendar();
    });

    removeClassBtn.addEventListener("click", () => {
      const user = getCurrentUserData();
      user.classes = user.classes.filter((entry) => entry.id !== classObj.id);
      saveState();
      renderDashboard();
      renderCalendar();
    });

    assignmentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(assignmentForm);
      const name = String(data.get("name") || "").trim();
      const dueDate = String(data.get("dueDate") || "").trim();
      if (!name || !dueDate) return;

      classObj.assignments.push({ id: makeId(), name, dueDate });
      saveState();
      renderDashboard();
      renderCalendar();
    });

    quizForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(quizForm);
      const name = String(data.get("name") || "").trim();
      const dueDate = String(data.get("dueDate") || "").trim();
      if (!name || !dueDate) return;

      classObj.quizzes.push({ id: makeId(), name, dueDate });
      saveState();
      renderDashboard();
      renderCalendar();
    });

    classObj.assignments.forEach((item) => {
      assignmentsList.appendChild(createItemRow(item, "Due"));
    });

    classObj.quizzes.forEach((item) => {
      quizzesList.appendChild(createItemRow(item, "Due"));
    });

    classesContainer.appendChild(fragment);
  });

  updateCounter();
}

function renderCalendar() {
  const items = allDueItems();
  const map = new Map();
  items.forEach((item) => {
    if (!map.has(item.dueDate)) map.set(item.dueDate, []);
    map.get(item.dueDate).push(item);
  });

  const year = state.calendarYear;
  const month = state.calendarMonth;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const prevLastDay = new Date(year, month, 0);

  calendarMonthLabel.textContent = firstDay.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });

  calendarGrid.innerHTML = "";
  dayLabels.forEach((label) => {
    const div = document.createElement("div");
    div.className = "day-header";
    div.textContent = label;
    calendarGrid.appendChild(div);
  });

  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const prevMonthDays = prevLastDay.getDate();

  for (let i = startOffset - 1; i >= 0; i -= 1) {
    const dayNum = prevMonthDays - i;
    const cell = document.createElement("article");
    cell.className = "calendar-cell muted";
    cell.innerHTML = `<div class="calendar-date">${dayNum}</div><ul class="calendar-items"></ul>`;
    calendarGrid.appendChild(cell);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayItems = map.get(dateKey) || [];

    const cell = document.createElement("article");
    cell.className = "calendar-cell";

    const listMarkup = dayItems
      .slice(0, 3)
      .map((item) => {
        const typeClass = item.type === "quiz" ? "quiz" : "assignment";
        return `<li class="${typeClass}">${item.className}: ${item.name}</li>`;
      })
      .join("");

    const moreCount = dayItems.length > 3 ? `<li>+${dayItems.length - 3} more</li>` : "";

    cell.innerHTML = `
      <div class="calendar-date">${day}</div>
      <ul class="calendar-items">${listMarkup}${moreCount}</ul>
    `;

    calendarGrid.appendChild(cell);
  }

  const usedSlots = startOffset + daysInMonth;
  const tailCells = (7 - (usedSlots % 7)) % 7;
  for (let i = 1; i <= tailCells; i += 1) {
    const cell = document.createElement("article");
    cell.className = "calendar-cell muted";
    cell.innerHTML = `<div class="calendar-date">${i}</div><ul class="calendar-items"></ul>`;
    calendarGrid.appendChild(cell);
  }

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-calendar";
    empty.textContent = "No due dates yet. Add assignments or quizzes from Dashboard.";
    calendarGrid.appendChild(empty);
  }
}

function setView(viewName) {
  state.currentView = viewName;

  const showDashboard = viewName === "dashboard";
  dashboardView.hidden = !showDashboard;
  calendarView.hidden = showDashboard;
  dashboardView.classList.toggle("active", showDashboard);
  calendarView.classList.toggle("active", !showDashboard);
  navDashboard.classList.toggle("active", showDashboard);
  navCalendar.classList.toggle("active", !showDashboard);

  pageTitle.textContent = showDashboard ? "My Classes" : "Due Date Calendar";
  pageSubtitle.textContent = showDashboard
    ? "Track assignments and quizzes by class"
    : "Google Classroom-style monthly due date view";
  addClassBtn.style.display = showDashboard ? "inline-block" : "none";

  saveState();
}

navDashboard.addEventListener("click", () => setView("dashboard"));
navCalendar.addEventListener("click", () => setView("calendar"));

prevMonthBtn.addEventListener("click", () => {
  state.calendarMonth -= 1;
  if (state.calendarMonth < 0) {
    state.calendarMonth = 11;
    state.calendarYear -= 1;
  }
  saveState();
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  state.calendarMonth += 1;
  if (state.calendarMonth > 11) {
    state.calendarMonth = 0;
    state.calendarYear += 1;
  }
  saveState();
  renderCalendar();
});

addClassBtn.addEventListener("click", () => {
  const user = getCurrentUserData();
  if (user.classes.length >= MAX_CLASSES) {
    updateCounter();
    return;
  }

  const fallback = `Class ${user.classes.length + 1}`;
  user.classes.push({
    id: makeId(),
    name: fallback,
    collapsed: true,
    assignments: [],
    quizzes: []
  });

  saveState();
  renderDashboard();
  renderCalendar();
});

getCurrentUserData();
setView(state.currentView || "dashboard");
renderDashboard();
renderCalendar();