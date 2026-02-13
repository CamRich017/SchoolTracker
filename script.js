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

function formatDueDate(rawDate) {
  const date = new Date(`${rawDate}T00:00:00`);
  return Number.isNaN(date.getTime()) ? rawDate : date.toLocaleDateString();
}

function createListItem(name, dueDate) {
  const li = document.createElement("li");
  li.classList.add("new-item");
  li.innerHTML = `<span>${name}</span><span class="due-date">Due: ${formatDueDate(dueDate)}</span>`;
  return li;
}

function addRipple(button, event) {
  const rect = button.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.left = `${event.clientX - rect.left}px`;
  ripple.style.top = `${event.clientY - rect.top}px`;
  button.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

function addPressAnimation(element) {
  element.addEventListener("click", () => {
    element.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(0.98)" },
        { transform: "scale(1)" }
      ],
      { duration: 170, easing: "ease-out" }
    );
  });
}

function addButtonEffects(button) {
  if (!button) return;
  button.addEventListener("pointerdown", (event) => addRipple(button, event));
  addPressAnimation(button);
}

function addCardTilt(card) {
  if (!window.matchMedia("(hover: hover)").matches) return;

  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
    const rotateY = offsetX * 2.2;
    const rotateX = offsetY * -1.8;

    card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
  });
}

function wireItemForm(form, targetList) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = data.get("name").toString().trim();
    const dueDate = data.get("dueDate").toString().trim();

    if (!name || !dueDate) return;

    targetList.appendChild(createListItem(name, dueDate));
    form.reset();
  });

  addButtonEffects(form.querySelector('button[type="submit"]'));
}

function animateCardIn(card) {
  card.classList.add("card-enter");
  requestAnimationFrame(() => {
    card.classList.add("card-enter-visible");
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
    const opening = card.classList.contains("collapsed");

    if (opening) {
      card.classList.remove("collapsed");
      content.hidden = false;
      summaryBtn.setAttribute("aria-expanded", "true");

      content.animate(
        [
          { opacity: 0, transform: "translateY(-8px)" },
          { opacity: 1, transform: "translateY(0)" }
        ],
        { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
      return;
    }

    summaryBtn.setAttribute("aria-expanded", "false");
    const exitAnim = content.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-8px)" }
      ],
      { duration: 180, easing: "ease-out" }
    );

    exitAnim.onfinish = () => {
      content.hidden = true;
      card.classList.add("collapsed");
    };
  });

  classNameInput.addEventListener("input", () => {
    title.textContent = classNameInput.value.trim() || defaultName;
  });

  removeClassBtn.addEventListener("click", () => {
    card.animate(
      [
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(-8px) scale(0.98)" }
      ],
      { duration: 180, easing: "ease-in" }
    ).onfinish = () => {
      card.remove();
      updateCounter();
      renumberClasses();
    };
  });

  wireItemForm(assignmentForm, assignmentsList);
  wireItemForm(quizForm, quizzesList);

  addButtonEffects(summaryBtn);
  addButtonEffects(removeClassBtn);
  addCardTilt(card);

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
  const cardFragment = createClassCard(classCount);
  classesContainer.appendChild(cardFragment);

  const addedCard = classesContainer.lastElementChild;
  if (addedCard) {
    animateCardIn(addedCard);
  }

  updateCounter();
});

addButtonEffects(addClassBtn);
updateCounter();