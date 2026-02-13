const STORAGE_KEY = "schooltracker.v3";
const BROWSER_USER_KEY = "schooltracker.browserUserId";

const addClassBtn = document.getElementById("addClassBtn");
const classesContainer = document.getElementById("classesContainer");
const classCounter = document.getElementById("classCounter");
const maxNotice = document.getElementById("maxNotice");
const classCardTemplate = document.getElementById("classCardTemplate");

const navDashboard = document.getElementById("navDashboard");
const navCalendar = document.getElementById("navCalendar");
const navCompleted = document.getElementById("navCompleted");

const dashboardView = document.getElementById("dashboardView");
const calendarView = document.getElementById("calendarView");
const completedView = document.getElementById("completedView");

const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const calendarGrid = document.getElementById("calendarGrid");
const calendarMonthLabel = document.getElementById("calendarMonthLabel");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

const completedList = document.getElementById("completedList");
const completedCounter = document.getElementById("completedCounter");

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const memoryStore = {};

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    memoryStore[key] = value;
  }
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getBrowserUserId() {
  const existing = storageGet(BROWSER_USER_KEY);
  if (existing) return existing;
  const next = makeId();
  storageSet(BROWSER_USER_KEY, next);
  return next;
}

function defaultState() {
  const now = new Date();
  return {
    users: {},
    currentView: "dashboard",
    calendarYear: now.getFullYear(),
    calendarMonth: now.getMonth()
  };
}

function sanitizeClass(entry, index) {
  const fallback = `Class ${index + 1}`;
  const normalizeItem = (item) => ({
    id: item && item.id ? item.id : makeId(),
    name: item && item.name ? item.name : "Untitled",
    dueDate: item && item.dueDate ? item.dueDate : ""
  });

  const normalizeDone = (item) => ({
    id: item && item.id ? item.id : makeId(),
    sourceId: item && item.sourceId ? item.sourceId : null,
    name: item && item.name ? item.name : "Untitled",
    dueDate: item && item.dueDate ? item.dueDate : "",
    type: item && item.type ? item.type : "assignment",
    completedAt: item && item.completedAt ? item.completedAt : new Date().toISOString()
  });

  return {
    id: entry && entry.id ? entry.id : makeId(),
    name: entry && entry.name ? entry.name : fallback,
    collapsed: Boolean(entry && entry.collapsed),
    assignments: Array.isArray(entry && entry.assignments) ? entry.assignments.map(normalizeItem) : [],
    quizzes: Array.isArray(entry && entry.quizzes) ? entry.quizzes.map(normalizeItem) : [],
    completed: Array.isArray(entry && entry.completed) ? entry.completed.map(normalizeDone) : []
  };
}

function loadState() {
  try {
    const raw = storageGet(STORAGE_KEY);
    if (!raw) return defaultState();

    const parsed = JSON.parse(raw);
    const merged = { ...defaultState(), ...parsed };

    if (!merged.users || typeof merged.users !== "object" || Array.isArray(merged.users)) {
      merged.users = {};
    }

    if (!Number.isInteger(merged.calendarMonth) || merged.calendarMonth < 0 || merged.calendarMonth > 11) {
      merged.calendarMonth = new Date().getMonth();
    }

    if (!Number.isInteger(merged.calendarYear) || merged.calendarYear < 1970) {
      merged.calendarYear = new Date().getFullYear();
    }

    if (!["dashboard", "calendar", "completed"].includes(merged.currentView)) {
      merged.currentView = "dashboard";
    }

    return merged;
  } catch {
    return defaultState();
  }
}

const state = loadState();
const browserUserId = getBrowserUserId();

function currentUser() {
  if (!state.users || typeof state.users !== "object" || Array.isArray(state.users)) {
    state.users = {};
  }

  if (!state.users[browserUserId]) {
    state.users[browserUserId] = { classes: [] };
  }

  const user = state.users[browserUserId];
  user.classes = (Array.isArray(user.classes) ? user.classes : []).map(sanitizeClass);
  return user;
}

function saveState() {
  storageSet(STORAGE_KEY, JSON.stringify(state));
}

function formatDueDate(rawDate) {
  const date = new Date(`${rawDate}T00:00:00`);
  return Number.isNaN(date.getTime()) ? rawDate : date.toLocaleDateString();
}

function todayIsoDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function addPressAnimation(element) {
  if (!element) return;
  element.addEventListener("click", () => {
    if (!element.animate) return;
    element.animate(
      [{ transform: "scale(1)" }, { transform: "scale(0.985)" }, { transform: "scale(1)" }],
      { duration: 130, easing: "ease-out" }
    );
  });
}

function addCardTilt(card) {
  if (!window.matchMedia("(hover: hover)").matches) return;
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
    const rotateY = offsetX * 1.0;
    const rotateX = offsetY * -0.8;
    card.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
  });
  card.addEventListener("pointerleave", () => {
    card.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg)";
  });
}

function updateCounter() {
  if (classCounter) classCounter.textContent = `${currentUser().classes.length} classes`;
  if (maxNotice) maxNotice.textContent = "";
  if (addClassBtn) addClassBtn.disabled = false;
}

function dueItems() {
  const items = [];
  currentUser().classes.forEach((cls) => {
    cls.assignments.forEach((item) => items.push({ ...item, className: cls.name, type: "assignment" }));
    cls.quizzes.forEach((item) => items.push({ ...item, className: cls.name, type: "quiz" }));
  });
  return items;
}

function doneItems() {
  const items = [];
  currentUser().classes.forEach((cls) => {
    cls.completed.forEach((item) => items.push({ ...item, className: cls.name }));
  });
  return items.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

function removeItem(cls, key, itemId) {
  cls[key] = cls[key].filter((it) => it.id !== itemId);
  saveState();
  renderAll();
}

function markDone(cls, key, itemId) {
  const item = cls[key].find((it) => it.id === itemId);
  if (!item) return;

  cls[key] = cls[key].filter((it) => it.id !== itemId);
  cls.completed.push({
    id: makeId(),
    sourceId: item.id,
    name: item.name,
    dueDate: item.dueDate,
    type: key === "quizzes" ? "quiz" : "assignment",
    completedAt: new Date().toISOString()
  });

  saveState();
  renderAll();
}

function createItemRow(item, onDone, onRemove) {
  const li = document.createElement("li");
  li.innerHTML = `
    <span class="item-name">${item.name}</span>
    <span class="due-date">Due: ${formatDueDate(item.dueDate)}</span>
    <button type="button" class="item-remove-btn">Remove</button>
    <button type="button" class="item-done-btn">Done</button>
  `;

  const removeBtn = li.querySelector(".item-remove-btn");
  const doneBtn = li.querySelector(".item-done-btn");
  if (removeBtn) {
    removeBtn.addEventListener("click", onRemove);
    addPressAnimation(removeBtn);
  }
  if (doneBtn) {
    doneBtn.addEventListener("click", onDone);
    addPressAnimation(doneBtn);
  }

  return li;
}

function renderDashboard(focusClassId = null) {
  if (!classesContainer || !classCardTemplate) return;
  classesContainer.innerHTML = "";

  currentUser().classes.forEach((cls, i) => {
    const frag = classCardTemplate.content.cloneNode(true);
    const card = frag.querySelector(".class-card");
    const summaryBtn = frag.querySelector(".class-summary");
    const title = frag.querySelector(".class-title");
    const content = frag.querySelector(".class-content");
    const nameInput = frag.querySelector(".class-name-input");
    const removeClassBtn = frag.querySelector(".remove-class-btn");
    const assignmentForm = frag.querySelector(".assignment-form");
    const quizForm = frag.querySelector(".quiz-form");
    const assignmentsList = frag.querySelector(".assignments-list");
    const quizzesList = frag.querySelector(".quizzes-list");
    const assignmentDueInput = assignmentForm.querySelector('input[name="dueDate"]');
    const quizDueInput = quizForm.querySelector('input[name="dueDate"]');

    const fallback = `Class ${i + 1}`;
    title.textContent = cls.name || fallback;
    nameInput.value = cls.name || fallback;

    if (focusClassId && cls.id === focusClassId) cls.collapsed = false;
    if (!cls.collapsed) {
      card.classList.remove("collapsed");
      content.hidden = false;
      summaryBtn.setAttribute("aria-expanded", "true");
    }

    summaryBtn.addEventListener("click", () => {
      cls.collapsed = !cls.collapsed;
      if (cls.collapsed) {
        content.hidden = true;
        card.classList.add("collapsed");
        summaryBtn.setAttribute("aria-expanded", "false");
      } else {
        content.hidden = false;
        card.classList.remove("collapsed");
        summaryBtn.setAttribute("aria-expanded", "true");
      }
      saveState();
    });

    nameInput.addEventListener("input", () => {
      cls.name = nameInput.value.trim() || fallback;
      title.textContent = cls.name;
      saveState();
      renderCalendar();
      renderCompleted();
    });

    removeClassBtn.addEventListener("click", () => {
      currentUser().classes = currentUser().classes.filter((entry) => entry.id !== cls.id);
      saveState();
      renderAll();
    });

    assignmentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(assignmentForm);
      const name = String(data.get("name") || "").trim();
      const dueDate = String(data.get("dueDate") || "").trim() || todayIsoDate();
      if (!name || !dueDate) return;

      cls.assignments.push({ id: makeId(), name, dueDate });
      saveState();
      renderAll();
    });

    quizForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(quizForm);
      const name = String(data.get("name") || "").trim();
      const dueDate = String(data.get("dueDate") || "").trim() || todayIsoDate();
      if (!name || !dueDate) return;

      cls.quizzes.push({ id: makeId(), name, dueDate });
      saveState();
      renderAll();
    });

    cls.assignments.forEach((item) => {
      assignmentsList.appendChild(
        createItemRow(item, () => markDone(cls, "assignments", item.id), () => removeItem(cls, "assignments", item.id))
      );
    });

    cls.quizzes.forEach((item) => {
      quizzesList.appendChild(
        createItemRow(item, () => markDone(cls, "quizzes", item.id), () => removeItem(cls, "quizzes", item.id))
      );
    });

    addPressAnimation(summaryBtn);
    addPressAnimation(removeClassBtn);

    if (assignmentDueInput && !assignmentDueInput.value) {
      assignmentDueInput.value = todayIsoDate();
    }
    if (quizDueInput && !quizDueInput.value) {
      quizDueInput.value = todayIsoDate();
    }

    classesContainer.appendChild(frag);
    const mountedCard = classesContainer.lastElementChild;
    if (mountedCard) {
      mountedCard.dataset.classId = cls.id;
      addCardTilt(mountedCard);
    }
  });

  updateCounter();

  if (focusClassId) {
    const focusCard = classesContainer.querySelector(`[data-class-id="${focusClassId}"]`);
    if (focusCard) {
      focusCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
}

function renderCalendar() {
  if (!calendarGrid || !calendarMonthLabel) return;

  const items = dueItems();
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

  calendarMonthLabel.textContent = firstDay.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  calendarGrid.innerHTML = "";
  dayLabels.forEach((label) => {
    const el = document.createElement("div");
    el.className = "day-header";
    el.textContent = label;
    calendarGrid.appendChild(el);
  });

  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  for (let i = startOffset - 1; i >= 0; i -= 1) {
    const dayNum = prevLastDay.getDate() - i;
    const cell = document.createElement("article");
    cell.className = "calendar-cell muted";
    cell.innerHTML = `<div class="calendar-date">${dayNum}</div><ul class="calendar-items"></ul>`;
    calendarGrid.appendChild(cell);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayItems = map.get(key) || [];

    const cell = document.createElement("article");
    cell.className = "calendar-cell";
    const listMarkup = dayItems
      .slice(0, 3)
      .map((item) => `<li class="${item.type === "quiz" ? "quiz" : "assignment"}">${item.className}: ${item.name}</li>`)
      .join("");
    const more = dayItems.length > 3 ? `<li>+${dayItems.length - 3} more</li>` : "";
    cell.innerHTML = `<div class="calendar-date">${day}</div><ul class="calendar-items">${listMarkup}${more}</ul>`;
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

function renderCompleted() {
  if (!completedList || !completedCounter) return;

  const items = doneItems();
  completedCounter.textContent = `${items.length} completed`;
  completedList.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-calendar";
    empty.textContent = "No completed assignments yet.";
    completedList.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "completed-item";
    li.innerHTML = `
      <span class="completed-name">${item.className}: ${item.name}</span>
      <span class="completed-meta">${item.type === "quiz" ? "Quiz/Test" : "Assignment"} | Due ${formatDueDate(item.dueDate)}</span>
      <span class="completed-meta">Done ${new Date(item.completedAt).toLocaleDateString()}</span>
    `;
    completedList.appendChild(li);
  });
}

function setView(next) {
  const view = ["dashboard", "calendar", "completed"].includes(next) ? next : "dashboard";
  state.currentView = view;

  const showDashboard = view === "dashboard";
  const showCalendar = view === "calendar";
  const showCompleted = view === "completed";

  if (dashboardView) {
    dashboardView.hidden = !showDashboard;
    dashboardView.classList.toggle("active", showDashboard);
  }
  if (calendarView) {
    calendarView.hidden = !showCalendar;
    calendarView.classList.toggle("active", showCalendar);
  }
  if (completedView) {
    completedView.hidden = !showCompleted;
    completedView.classList.toggle("active", showCompleted);
  }

  if (navDashboard) navDashboard.classList.toggle("active", showDashboard);
  if (navCalendar) navCalendar.classList.toggle("active", showCalendar);
  if (navCompleted) navCompleted.classList.toggle("active", showCompleted);

  if (pageTitle) {
    pageTitle.textContent = showDashboard ? "My Classes" : showCalendar ? "Due Date Calendar" : "Completed Assignments";
  }
  if (pageSubtitle) {
    pageSubtitle.textContent = showDashboard
      ? "Track assignments and quizzes by class"
      : showCalendar
        ? "View all upcoming due dates in a calendar format"
        : "Assignments and quizzes you marked done";
  }

  if (addClassBtn) addClassBtn.style.display = showDashboard ? "inline-block" : "none";
  saveState();
}

function renderAll(focusClassId = null) {
  renderDashboard(focusClassId);
  renderCalendar();
  renderCompleted();
}

if (navDashboard) {
  navDashboard.addEventListener("click", () => setView("dashboard"));
  addPressAnimation(navDashboard);
}
if (navCalendar) {
  navCalendar.addEventListener("click", () => setView("calendar"));
  addPressAnimation(navCalendar);
}
if (navCompleted) {
  navCompleted.addEventListener("click", () => setView("completed"));
  addPressAnimation(navCompleted);
}

if (prevMonthBtn) {
  prevMonthBtn.addEventListener("click", () => {
    state.calendarMonth -= 1;
    if (state.calendarMonth < 0) {
      state.calendarMonth = 11;
      state.calendarYear -= 1;
    }
    saveState();
    renderCalendar();
  });
  addPressAnimation(prevMonthBtn);
}

if (nextMonthBtn) {
  nextMonthBtn.addEventListener("click", () => {
    state.calendarMonth += 1;
    if (state.calendarMonth > 11) {
      state.calendarMonth = 0;
      state.calendarYear += 1;
    }
    saveState();
    renderCalendar();
  });
  addPressAnimation(nextMonthBtn);
}

if (addClassBtn) {
  addClassBtn.addEventListener("click", () => {
    const user = currentUser();
    const classId = makeId();

    user.classes.push({
      id: classId,
      name: `Class ${user.classes.length + 1}`,
      collapsed: false,
      assignments: [],
      quizzes: [],
      completed: []
    });

    saveState();
    setView("dashboard");
    renderAll(classId);
  });
  addPressAnimation(addClassBtn);
}

currentUser();
setView(state.currentView || "dashboard");
renderAll();
