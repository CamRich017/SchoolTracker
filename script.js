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

function todayIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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

function normalizeItem(item) {
  return {
    id: item && item.id ? item.id : makeId(),
    name: item && item.name ? item.name : "Untitled",
    dueDate: item && item.dueDate ? item.dueDate : todayIsoDate()
  };
}

function normalizeCompleted(item) {
  return {
    id: item && item.id ? item.id : makeId(),
    sourceId: item && item.sourceId ? item.sourceId : null,
    name: item && item.name ? item.name : "Untitled",
    dueDate: item && item.dueDate ? item.dueDate : todayIsoDate(),
    type: item && item.type ? item.type : "assignment",
    completedAt: item && item.completedAt ? item.completedAt : new Date().toISOString()
  };
}

function loadState() {
  try {
    const raw = storageGet(STORAGE_KEY);
    if (!raw) return buildDefaultState();
    const parsed = JSON.parse(raw);
    const merged = { ...buildDefaultState(), ...parsed };

    if (!merged.users || typeof merged.users !== "object" || Array.isArray(merged.users)) {
      merged.users = {};
    }
    if (!["dashboard", "calendar", "completed"].includes(merged.currentView)) {
      merged.currentView = "dashboard";
    }
    return merged;
  } catch {
    return buildDefaultState();
  }
}

const state = loadState();
const browserUserId = getBrowserUserId();

function getCurrentUserData() {
  if (!state.users || typeof state.users !== "object" || Array.isArray(state.users)) {
    state.users = {};
  }

  if (!state.users[browserUserId]) {
    state.users[browserUserId] = { classes: [] };
  }

  const user = state.users[browserUserId];
  if (!Array.isArray(user.classes)) {
    user.classes = [];
  }

  for (let i = 0; i < user.classes.length; i += 1) {
    const classObj = user.classes[i];
    if (!classObj || typeof classObj !== "object") {
      user.classes[i] = {
        id: makeId(),
        name: `Class ${i + 1}`,
        collapsed: true,
        assignments: [],
        quizzes: [],
        completed: []
      };
      continue;
    }

    if (!classObj.id) classObj.id = makeId();
    if (!classObj.name) classObj.name = `Class ${i + 1}`;
    classObj.collapsed = Boolean(classObj.collapsed);
    classObj.assignments = Array.isArray(classObj.assignments) ? classObj.assignments.map(normalizeItem) : [];
    classObj.quizzes = Array.isArray(classObj.quizzes) ? classObj.quizzes.map(normalizeItem) : [];
    classObj.completed = Array.isArray(classObj.completed) ? classObj.completed.map(normalizeCompleted) : [];
  }

  return user;
}

function saveState() {
  storageSet(STORAGE_KEY, JSON.stringify(state));
}

function formatDueDate(rawDate) {
  const date = new Date(`${rawDate}T00:00:00`);
  return Number.isNaN(date.getTime()) ? rawDate : date.toLocaleDateString();
}

function addPressAnimation(element) {
  if (!element) return;
  element.addEventListener("click", () => {
    if (!element.animate) return;
    element.animate(
      [{ transform: "scale(1)" }, { transform: "scale(0.985)" }, { transform: "scale(1)" }],
      { duration: 140, easing: "ease-out" }
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

function isCompleted(classObj, sourceItemId) {
  return classObj.completed.some((item) => item.sourceId && item.sourceId === sourceItemId);
}

function allDueItems() {
  const user = getCurrentUserData();
  const items = [];

  user.classes.forEach((classObj) => {
    classObj.assignments.forEach((item) => {
      if (!isCompleted(classObj, item.id)) {
        items.push({ ...item, className: classObj.name, type: "assignment" });
      }
    });
    classObj.quizzes.forEach((item) => {
      if (!isCompleted(classObj, item.id)) {
        items.push({ ...item, className: classObj.name, type: "quiz" });
      }
    });
  });

  return items;
}

function allCompletedItems() {
  const items = [];
  getCurrentUserData().classes.forEach((classObj) => {
    classObj.completed.forEach((item) => {
      items.push({ ...item, className: classObj.name });
    });
  });
  return items.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

function updateCounter() {
  const total = getCurrentUserData().classes.length;
  if (classCounter) classCounter.textContent = `${total} / ${MAX_CLASSES} classes`;
  const atMax = total >= MAX_CLASSES;
  if (addClassBtn) addClassBtn.disabled = atMax;
  if (maxNotice) maxNotice.textContent = atMax ? "You reached the maximum of 8 classes." : "";
}

function markItemDone(classObj, sourceKey, itemId) {
  const item = classObj[sourceKey].find((entry) => entry.id === itemId);
  if (!item) return;

  classObj[sourceKey] = classObj[sourceKey].filter((entry) => entry.id !== itemId);
  classObj.completed.push({
    id: makeId(),
    sourceId: item.id,
    name: item.name,
    dueDate: item.dueDate,
    type: sourceKey === "quizzes" ? "quiz" : "assignment",
    completedAt: new Date().toISOString()
  });

  saveState();
  renderDashboard();
  renderCalendar();
  renderCompleted();
}

function removeActiveItem(classObj, sourceKey, itemId) {
  classObj[sourceKey] = classObj[sourceKey].filter((entry) => entry.id !== itemId);
  saveState();
  renderDashboard();
  renderCalendar();
}

function createItemRow(item, onDone, onRemove) {
  const li = document.createElement("li");
  li.innerHTML = `
    <span class="item-name">${item.name}</span>
    <span class="due-date">Due: ${formatDueDate(item.dueDate)}</span>
    <button type="button" class="item-remove-btn" aria-label="Remove ${item.name}">Remove</button>
    <button type="button" class="item-done-btn" aria-label="Mark ${item.name} as done">Done</button>
  `;

  const removeBtn = li.querySelector(".item-remove-btn");
  if (removeBtn) {
    removeBtn.addEventListener("click", onRemove);
    addPressAnimation(removeBtn);
  }

  const doneBtn = li.querySelector(".item-done-btn");
  if (doneBtn) {
    doneBtn.addEventListener("click", onDone);
    addPressAnimation(doneBtn);
  }

  return li;
}

function renderDashboard(focusClassId = null) {
  if (!classesContainer || !classCardTemplate) return;
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
    const assignmentDueInput = assignmentForm.querySelector('input[name="dueDate"]');
    const quizDueInput = quizForm.querySelector('input[name="dueDate"]');

    const fallback = `Class ${i + 1}`;
    title.textContent = classObj.name || fallback;
    classNameInput.value = classObj.name || fallback;

    if (focusClassId && classObj.id === focusClassId) {
      classObj.collapsed = false;
    }

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
      renderCompleted();
    });

    removeClassBtn.addEventListener("click", () => {
      const user = getCurrentUserData();
      user.classes = user.classes.filter((entry) => entry.id !== classObj.id);
      saveState();
      renderDashboard();
      renderCalendar();
      renderCompleted();
    });

    assignmentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(assignmentForm);
      const name = String(data.get("name") || "").trim();
      const dueDate = String(data.get("dueDate") || "").trim() || todayIsoDate();
      if (!name) return;

      classObj.assignments.push({ id: makeId(), name, dueDate });
      saveState();
      renderDashboard(classObj.id);
      renderCalendar();
    });

    quizForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(quizForm);
      const name = String(data.get("name") || "").trim();
      const dueDate = String(data.get("dueDate") || "").trim() || todayIsoDate();
      if (!name) return;

      classObj.quizzes.push({ id: makeId(), name, dueDate });
      saveState();
      renderDashboard(classObj.id);
      renderCalendar();
    });

    classObj.assignments
      .filter((item) => !isCompleted(classObj, item.id))
      .forEach((item) => {
        assignmentsList.appendChild(
          createItemRow(
            item,
            () => markItemDone(classObj, "assignments", item.id),
            () => removeActiveItem(classObj, "assignments", item.id)
          )
        );
      });

    classObj.quizzes
      .filter((item) => !isCompleted(classObj, item.id))
      .forEach((item) => {
        quizzesList.appendChild(
          createItemRow(
            item,
            () => markItemDone(classObj, "quizzes", item.id),
            () => removeActiveItem(classObj, "quizzes", item.id)
          )
        );
      });

    if (assignmentDueInput && !assignmentDueInput.value) assignmentDueInput.value = todayIsoDate();
    if (quizDueInput && !quizDueInput.value) quizDueInput.value = todayIsoDate();

    addPressAnimation(summaryBtn);
    addPressAnimation(removeClassBtn);

    classesContainer.appendChild(fragment);
    if (classesContainer.lastElementChild) {
      classesContainer.lastElementChild.dataset.classId = classObj.id;
      addCardTilt(classesContainer.lastElementChild);
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

function renderCompleted() {
  if (!completedList || !completedCounter) return;

  const items = allCompletedItems();
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

function setView(viewName) {
  const showDashboard = viewName === "dashboard";
  const showCalendar = viewName === "calendar";
  const showCompleted = viewName === "completed";

  state.currentView = showDashboard || showCalendar || showCompleted ? viewName : "dashboard";

  if (dashboardView) dashboardView.hidden = !showDashboard;
  if (calendarView) calendarView.hidden = !showCalendar;
  if (completedView) completedView.hidden = !showCompleted;

  if (dashboardView) dashboardView.classList.toggle("active", showDashboard);
  if (calendarView) calendarView.classList.toggle("active", showCalendar);
  if (completedView) completedView.classList.toggle("active", showCompleted);

  if (navDashboard) navDashboard.classList.toggle("active", showDashboard);
  if (navCalendar) navCalendar.classList.toggle("active", showCalendar);
  if (navCompleted) navCompleted.classList.toggle("active", showCompleted);

  if (pageTitle) {
    pageTitle.textContent = showDashboard
      ? "My Classes"
      : showCalendar
        ? "Due Date Calendar"
        : "Completed Assignments";
  }

  if (pageSubtitle) {
    pageSubtitle.textContent = showDashboard
      ? "Track assignments and quizzes by class"
      : showCalendar
        ? "Track upcoming due dates in a calendar view"
        : "Assignments and quizzes you marked done";
  }

  if (addClassBtn) addClassBtn.style.display = showDashboard ? "inline-block" : "none";

  saveState();
}

if (navDashboard) navDashboard.addEventListener("click", () => setView("dashboard"));
if (navCalendar) navCalendar.addEventListener("click", () => setView("calendar"));
if (navCompleted) navCompleted.addEventListener("click", () => setView("completed"));

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
}

if (addClassBtn) {
  addClassBtn.addEventListener("click", () => {
    const user = getCurrentUserData();
    if (user.classes.length >= MAX_CLASSES) {
      updateCounter();
      return;
    }

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
    renderDashboard(classId);
    renderCalendar();
    renderCompleted();
  });
}

addPressAnimation(addClassBtn);
addPressAnimation(navDashboard);
addPressAnimation(navCalendar);
addPressAnimation(navCompleted);
addPressAnimation(prevMonthBtn);
addPressAnimation(nextMonthBtn);

getCurrentUserData();
setView(state.currentView || "dashboard");
renderDashboard();
renderCalendar();
renderCompleted();
