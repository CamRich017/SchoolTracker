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
const navGrades = document.getElementById("navGrades");

const dashboardView = document.getElementById("dashboardView");
const calendarView = document.getElementById("calendarView");
const completedView = document.getElementById("completedView");
const gradesView = document.getElementById("gradesView");

const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const calendarGrid = document.getElementById("calendarGrid");
const calendarMonthLabel = document.getElementById("calendarMonthLabel");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

const completedList = document.getElementById("completedList");
const completedCounter = document.getElementById("completedCounter");
const gradeClassSelect = document.getElementById("gradeClassSelect");
const gradeCategoryRows = document.getElementById("gradeCategoryRows");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const weightedCurrentOutput = document.getElementById("weightedCurrentOutput");
const targetGradeInput = document.getElementById("targetGradeInput");
const assignmentCategorySelect = document.getElementById("assignmentCategorySelect");
const assignmentPointsInput = document.getElementById("assignmentPointsInput");
const neededAssignmentOutput = document.getElementById("neededAssignmentOutput");
const targetExamGradeInput = document.getElementById("targetExamGradeInput");
const examWeightInput = document.getElementById("examWeightInput");
const neededExamOutput = document.getElementById("neededExamOutput");

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
    calendarMonth: now.getMonth(),
    gradeSelectedClassId: null
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

function defaultGradeCategories() {
  return [
    { id: makeId(), name: "Assignments", weight: 40, current: "" },
    { id: makeId(), name: "Tests", weight: 40, current: "" },
    { id: makeId(), name: "Quizzes", weight: 20, current: "" }
  ];
}

function normalizeGradeCategory(category) {
  const rawCurrent = category && category.current ? String(category.current).trim() : "";
  let normalizedCurrent = rawCurrent;
  if (rawCurrent && !rawCurrent.includes("/")) {
    const asNumber = Number(rawCurrent);
    normalizedCurrent = Number.isFinite(asNumber) ? `${asNumber}/100` : "";
  }

  return {
    id: category && category.id ? category.id : makeId(),
    name: category && category.name ? category.name : "Category",
    weight: Number.isFinite(Number(category && category.weight)) ? Number(category.weight) : 0,
    current: normalizedCurrent
  };
}

function normalizeGradeCalc(gradeCalc) {
  const categories = Array.isArray(gradeCalc && gradeCalc.categories)
    ? gradeCalc.categories.map(normalizeGradeCategory)
    : defaultGradeCategories();

  return {
    categories,
    targetGrade: gradeCalc && gradeCalc.targetGrade ? String(gradeCalc.targetGrade) : "",
    assignmentCategoryId: gradeCalc && gradeCalc.assignmentCategoryId ? String(gradeCalc.assignmentCategoryId) : "",
    assignmentPoints: gradeCalc && gradeCalc.assignmentPoints ? String(gradeCalc.assignmentPoints) : "",
    targetExamGrade: gradeCalc && gradeCalc.targetExamGrade ? String(gradeCalc.targetExamGrade) : "",
    examWeight: gradeCalc && gradeCalc.examWeight ? String(gradeCalc.examWeight) : ""
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
    if (!["dashboard", "calendar", "completed", "grades"].includes(merged.currentView)) {
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
    classObj.gradeCalc = normalizeGradeCalc(classObj.gradeCalc);
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

function parsePoints(value) {
  const text = String(value || "").trim();
  if (!text.includes("/")) return null;
  const parts = text.split("/");
  if (parts.length !== 2) return null;
  const earned = Number(parts[0].trim());
  const total = Number(parts[1].trim());
  if (!Number.isFinite(earned) || !Number.isFinite(total) || total <= 0) return null;
  return { earned, total };
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function activeGradeClass() {
  const user = getCurrentUserData();
  if (!user.classes.length) return null;

  if (!state.gradeSelectedClassId || !user.classes.some((cls) => cls.id === state.gradeSelectedClassId)) {
    state.gradeSelectedClassId = user.classes[0].id;
  }

  return user.classes.find((cls) => cls.id === state.gradeSelectedClassId) || null;
}

function weightedCategoryAverage(classObj) {
  let weightedSum = 0;
  let weightSum = 0;

  classObj.gradeCalc.categories.forEach((category) => {
    const points = parsePoints(category.current);
    const weight = Number(category.weight);
    if (!points || !Number.isFinite(weight) || weight <= 0) return;
    const avg = (points.earned / points.total) * 100;
    weightedSum += avg * weight;
    weightSum += weight;
  });

  if (weightSum <= 0) return null;
  return weightedSum / weightSum;
}

function currentCourseGrade(classObj) {
  const weighted = weightedCategoryAverage(classObj);
  return weighted === null ? null : clampPercent(weighted);
}

function neededScore(current, target, weightPercent) {
  const w = weightPercent / 100;
  if (!Number.isFinite(current) || !Number.isFinite(target) || !Number.isFinite(w) || w <= 0 || w > 1) return null;
  if (w === 1) return target;
  return (target - current * (1 - w)) / w;
}

function neededAssignmentPoints(classObj) {
  const target = Number(classObj.gradeCalc.targetGrade);
  const assignmentPoints = Number(classObj.gradeCalc.assignmentPoints);
  if (!Number.isFinite(target) || !Number.isFinite(assignmentPoints) || assignmentPoints <= 0) return null;

  const categories = classObj.gradeCalc.categories;
  const selectedCategory = categories.find((c) => c.id === classObj.gradeCalc.assignmentCategoryId) || categories[0];
  if (!selectedCategory) return null;

  const selectedPoints = parsePoints(selectedCategory.current);
  if (!selectedPoints) {
    return { error: "Set selected category current as points (e.g. 30/40)." };
  }

  let totalWeight = 0;
  let otherWeighted = 0;
  categories.forEach((category) => {
    const weight = Number(category.weight);
    if (!Number.isFinite(weight) || weight <= 0) return;
    totalWeight += weight;

    if (category.id === selectedCategory.id) return;
    const points = parsePoints(category.current);
    if (!points) {
      otherWeighted = Number.NaN;
      return;
    }
    const avg = (points.earned / points.total) * 100;
    otherWeighted += avg * weight;
  });

  if (!Number.isFinite(otherWeighted)) {
    return { error: "Fill points for all weighted categories (e.g. 30/40)." };
  }

  const selectedWeight = Number(selectedCategory.weight);
  if (!Number.isFinite(selectedWeight) || selectedWeight <= 0 || totalWeight <= 0) {
    return { error: "Selected category needs a weight greater than 0." };
  }

  const requiredCategoryPercent = (target * totalWeight - otherWeighted) / selectedWeight;
  const neededEarned =
    (requiredCategoryPercent / 100) * (selectedPoints.total + assignmentPoints) - selectedPoints.earned;

  return {
    neededEarned,
    assignmentPoints,
    requiredCategoryPercent
  };
}

function updateGradeOutputs(classObj) {
  const weighted = weightedCategoryAverage(classObj);
  if (weightedCurrentOutput) {
    weightedCurrentOutput.textContent =
      weighted === null ? "Current weighted grade: --" : `Current weighted grade: ${clampPercent(weighted).toFixed(2)}%`;
  }

  const current = currentCourseGrade(classObj);
  if (neededAssignmentOutput) {
    const neededAssignment = neededAssignmentPoints(classObj);
    if (!neededAssignment || current === null) {
      neededAssignmentOutput.textContent = "Needed assignment score: --";
    } else if (neededAssignment.error) {
      neededAssignmentOutput.textContent = `Needed assignment score: ${neededAssignment.error}`;
    } else {
      const neededPct = (neededAssignment.neededEarned / neededAssignment.assignmentPoints) * 100;
      neededAssignmentOutput.textContent =
        `Needed assignment score: ${neededAssignment.neededEarned.toFixed(2)} / ${neededAssignment.assignmentPoints.toFixed(2)} ` +
        `(${neededPct.toFixed(2)}%)`;
    }
  }

  const targetExam = Number(classObj.gradeCalc.targetExamGrade);
  const examWeight = Number(classObj.gradeCalc.examWeight);
  const neededExam = neededScore(current, targetExam, examWeight);
  if (neededExamOutput) {
    neededExamOutput.textContent =
      neededExam === null ? "Needed exam score: --" : `Needed exam score: ${neededExam.toFixed(2)}%`;
  }
}

function renderGradeCalculator() {
  if (!gradeClassSelect || !gradeCategoryRows) return;
  const user = getCurrentUserData();

  gradeClassSelect.innerHTML = "";
  user.classes.forEach((classObj) => {
    const option = document.createElement("option");
    option.value = classObj.id;
    option.textContent = classObj.name;
    gradeClassSelect.appendChild(option);
  });

  const classObj = activeGradeClass();
  if (!classObj) {
    gradeCategoryRows.innerHTML = "";
    if (weightedCurrentOutput) weightedCurrentOutput.textContent = "Current weighted grade: --";
    if (neededAssignmentOutput) neededAssignmentOutput.textContent = "Needed assignment score: --";
    if (neededExamOutput) neededExamOutput.textContent = "Needed exam score: --";
    return;
  }

  gradeClassSelect.value = classObj.id;
  if (targetGradeInput) targetGradeInput.value = classObj.gradeCalc.targetGrade;
  if (assignmentPointsInput) assignmentPointsInput.value = classObj.gradeCalc.assignmentPoints;
  if (targetExamGradeInput) targetExamGradeInput.value = classObj.gradeCalc.targetExamGrade;
  if (examWeightInput) examWeightInput.value = classObj.gradeCalc.examWeight;

  if (assignmentCategorySelect) {
    assignmentCategorySelect.innerHTML = "";
    classObj.gradeCalc.categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      assignmentCategorySelect.appendChild(option);
    });
    if (
      !classObj.gradeCalc.assignmentCategoryId ||
      !classObj.gradeCalc.categories.some((category) => category.id === classObj.gradeCalc.assignmentCategoryId)
    ) {
      classObj.gradeCalc.assignmentCategoryId = classObj.gradeCalc.categories[0]
        ? classObj.gradeCalc.categories[0].id
        : "";
      saveState();
    }
    assignmentCategorySelect.value = classObj.gradeCalc.assignmentCategoryId;
  }

  gradeCategoryRows.innerHTML = "";
  classObj.gradeCalc.categories.forEach((category) => {
    const row = document.createElement("div");
    row.className = "grade-category-row";
    row.innerHTML = `
      <input type="text" class="grade-cat-name" value="${category.name}" maxlength="30" />
      <input type="number" class="grade-cat-weight" value="${category.weight}" min="0" max="100" step="0.01" placeholder="Weight %" />
      <input type="text" class="grade-cat-current" value="${category.current}" placeholder="Points (e.g. 30/40)" />
      <button type="button" class="item-remove-btn">Remove</button>
    `;

    const nameInput = row.querySelector(".grade-cat-name");
    const weightInput = row.querySelector(".grade-cat-weight");
    const currentInputEl = row.querySelector(".grade-cat-current");
    const removeBtn = row.querySelector(".item-remove-btn");

    nameInput.addEventListener("input", () => {
      category.name = nameInput.value.trim() || "Category";
      saveState();
      updateGradeOutputs(classObj);
    });

    weightInput.addEventListener("input", () => {
      category.weight = Number(weightInput.value || 0);
      saveState();
      updateGradeOutputs(classObj);
    });

    currentInputEl.addEventListener("input", () => {
      category.current = currentInputEl.value.trim();
      saveState();
      updateGradeOutputs(classObj);
    });

    removeBtn.addEventListener("click", () => {
      classObj.gradeCalc.categories = classObj.gradeCalc.categories.filter((entry) => entry.id !== category.id);
      if (classObj.gradeCalc.assignmentCategoryId === category.id) {
        classObj.gradeCalc.assignmentCategoryId = classObj.gradeCalc.categories[0]
          ? classObj.gradeCalc.categories[0].id
          : "";
      }
      saveState();
      renderGradeCalculator();
    });

    gradeCategoryRows.appendChild(row);
  });

  updateGradeOutputs(classObj);
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
      renderGradeCalculator();
    });

    removeClassBtn.addEventListener("click", () => {
      const user = getCurrentUserData();
      user.classes = user.classes.filter((entry) => entry.id !== classObj.id);
      if (state.gradeSelectedClassId === classObj.id) {
        state.gradeSelectedClassId = null;
      }
      saveState();
      renderDashboard();
      renderCalendar();
      renderCompleted();
      renderGradeCalculator();
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
      renderGradeCalculator();
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
      renderGradeCalculator();
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
  const showGrades = viewName === "grades";

  state.currentView = showDashboard || showCalendar || showCompleted || showGrades ? viewName : "dashboard";

  if (dashboardView) dashboardView.hidden = !showDashboard;
  if (calendarView) calendarView.hidden = !showCalendar;
  if (completedView) completedView.hidden = !showCompleted;
  if (gradesView) gradesView.hidden = !showGrades;

  if (dashboardView) dashboardView.classList.toggle("active", showDashboard);
  if (calendarView) calendarView.classList.toggle("active", showCalendar);
  if (completedView) completedView.classList.toggle("active", showCompleted);
  if (gradesView) gradesView.classList.toggle("active", showGrades);

  if (navDashboard) navDashboard.classList.toggle("active", showDashboard);
  if (navCalendar) navCalendar.classList.toggle("active", showCalendar);
  if (navCompleted) navCompleted.classList.toggle("active", showCompleted);
  if (navGrades) navGrades.classList.toggle("active", showGrades);

  if (pageTitle) {
    pageTitle.textContent = showDashboard
      ? "My Classes"
      : showCalendar
        ? "Due Date Calendar"
        : showCompleted
          ? "Completed Assignments"
          : "Grade Calculator";
  }

  if (pageSubtitle) {
    pageSubtitle.textContent = showDashboard
      ? "Track assignments and quizzes by class"
      : showCalendar
        ? "Track upcoming due dates in a calendar view"
        : showCompleted
          ? "Assignments and quizzes you marked done"
          : "Weight categories and calculate needed scores";
  }

  if (addClassBtn) addClassBtn.style.display = showDashboard ? "inline-block" : "none";

  saveState();
}

if (navDashboard) navDashboard.addEventListener("click", () => setView("dashboard"));
if (navCalendar) navCalendar.addEventListener("click", () => setView("calendar"));
if (navCompleted) navCompleted.addEventListener("click", () => setView("completed"));
if (navGrades) navGrades.addEventListener("click", () => setView("grades"));

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

if (gradeClassSelect) {
  gradeClassSelect.addEventListener("change", () => {
    state.gradeSelectedClassId = gradeClassSelect.value || null;
    saveState();
    renderGradeCalculator();
  });
}

if (targetGradeInput) {
  targetGradeInput.addEventListener("input", () => {
    const classObj = activeGradeClass();
    if (!classObj) return;
    classObj.gradeCalc.targetGrade = targetGradeInput.value;
    saveState();
    updateGradeOutputs(classObj);
  });
}

if (assignmentCategorySelect) {
  assignmentCategorySelect.addEventListener("change", () => {
    const classObj = activeGradeClass();
    if (!classObj) return;
    classObj.gradeCalc.assignmentCategoryId = assignmentCategorySelect.value || "";
    saveState();
    updateGradeOutputs(classObj);
  });
}

if (assignmentPointsInput) {
  assignmentPointsInput.addEventListener("input", () => {
    const classObj = activeGradeClass();
    if (!classObj) return;
    classObj.gradeCalc.assignmentPoints = assignmentPointsInput.value;
    saveState();
    updateGradeOutputs(classObj);
  });
}

if (targetExamGradeInput) {
  targetExamGradeInput.addEventListener("input", () => {
    const classObj = activeGradeClass();
    if (!classObj) return;
    classObj.gradeCalc.targetExamGrade = targetExamGradeInput.value;
    saveState();
    updateGradeOutputs(classObj);
  });
}

if (examWeightInput) {
  examWeightInput.addEventListener("input", () => {
    const classObj = activeGradeClass();
    if (!classObj) return;
    classObj.gradeCalc.examWeight = examWeightInput.value;
    saveState();
    updateGradeOutputs(classObj);
  });
}

if (addCategoryBtn) {
  addCategoryBtn.addEventListener("click", () => {
    const classObj = activeGradeClass();
    if (!classObj) return;
    classObj.gradeCalc.categories.push({
      id: makeId(),
      name: "New Category",
      weight: 0,
      current: ""
    });
    saveState();
    renderGradeCalculator();
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
      completed: [],
      gradeCalc: normalizeGradeCalc(null)
    });

    saveState();
    setView("dashboard");
    renderDashboard(classId);
    renderCalendar();
    renderCompleted();
    renderGradeCalculator();
  });
}

addPressAnimation(addClassBtn);
addPressAnimation(navDashboard);
addPressAnimation(navCalendar);
addPressAnimation(navCompleted);
addPressAnimation(navGrades);
addPressAnimation(prevMonthBtn);
addPressAnimation(nextMonthBtn);
addPressAnimation(addCategoryBtn);

getCurrentUserData();
setView(state.currentView || "dashboard");
renderDashboard();
renderCalendar();
renderCompleted();
renderGradeCalculator();
