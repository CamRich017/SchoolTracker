const MAX_CLASSES = 8;

const addClassBtn = document.getElementById("addClassBtn");
const classesContainer = document.getElementById("classesContainer");
const classCounter = document.getElementById("classCounter");
const maxNotice = document.getElementById("maxNotice");
const classCardTemplate = document.getElementById("classCardTemplate");

function updateCounter() {
  const total = classesContainer.children.length;
  classCounter.textContent = `${total} / ${MAX_CLASSES} classes`;
  const atMax = total >= MAX_CLASSES;
  addClassBtn.disabled = atMax;
  maxNotice.textContent = atMax ? "You reached the maximum of 8 classes." : "";
}

function createListItem(name, score) {
  const li = document.createElement("li");
  li.innerHTML = `<span>${name}</span><span class="score">${score}</span>`;
  return li;
}

function wireItemForm(form, targetList) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = data.get("name").toString().trim();
    const score = data.get("score").toString().trim();

    if (!name || !score) return;

    targetList.appendChild(createListItem(name, score));
    form.reset();
  });
}

function createClassCard(index) {
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

  const defaultName = `Class ${index}`;
  title.textContent = defaultName;
  classNameInput.value = defaultName;

  summaryBtn.addEventListener("click", () => {
    const isCollapsed = card.classList.toggle("collapsed");
    content.hidden = isCollapsed;
    summaryBtn.setAttribute("aria-expanded", String(!isCollapsed));
  });

  classNameInput.addEventListener("input", () => {
    title.textContent = classNameInput.value.trim() || defaultName;
  });

  removeClassBtn.addEventListener("click", () => {
    card.remove();
    updateCounter();
    renumberClasses();
  });

  wireItemForm(assignmentForm, assignmentsList);
  wireItemForm(quizForm, quizzesList);

  return fragment;
}

function renumberClasses() {
  [...classesContainer.children].forEach((card, i) => {
    const classIndex = i + 1;
    const titleEl = card.querySelector(".class-title");
    const inputEl = card.querySelector(".class-name-input");
    const fallback = `Class ${classIndex}`;

    if (!inputEl.value.trim() || titleEl.textContent.startsWith("Class ")) {
      inputEl.value = fallback;
      titleEl.textContent = fallback;
    }
  });
}

addClassBtn.addEventListener("click", () => {
  if (classesContainer.children.length >= MAX_CLASSES) {
    updateCounter();
    return;
  }

  const classCount = classesContainer.children.length + 1;
  const card = createClassCard(classCount);
  classesContainer.appendChild(card);
  updateCounter();
});

updateCounter();