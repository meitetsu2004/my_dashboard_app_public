const CATEGORY_SOURCES = [
  {
    key: "limits",
    label: "極限",
    path: "calculation_practice_program/problems_limit.json",
  },
  {
    key: "differentiation",
    label: "微分",
    path: "calculation_practice_program/problems_differentiation.json",
  },
  {
    key: "integration_easy",
    label: "積分(基礎)",
    path: "calculation_practice_program/problems_integration_easy.json",
  },
  {
    key: "integration",
    label: "積分",
    path: "calculation_practice_program/problems_integration.json",
  },
];

const TEMPLATE = `
  <div class="modal-panel modal-panel--problems" role="dialog" aria-modal="true" aria-labelledby="problems-modal-title">
    <header class="modal-header">
      <div>
        <h3 id="problems-modal-title">既存問題一覧</h3>
      </div>
      <button class="modal-close" data-modal-close aria-label="閉じる">×</button>
    </header>
    <div class="modal-body">
      <div class="modal-tabs" data-tab-bar></div>
      <div class="problems-container" data-problems-container>
        <p>カテゴリを選択してください。</p>
      </div>
    </div>
  </div>
`;

let modalRef = null;
const cache = {};

const ensureModal = () => {
  if (modalRef) return modalRef;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = TEMPLATE;
  document.body.appendChild(backdrop);

  const closeModal = () => backdrop.classList.remove("is-visible");

  const handleKeydown = (event) => {
    if (event.key === "Escape") closeModal();
  };
  window.addEventListener("keydown", handleKeydown);

  backdrop.addEventListener("click", (event) => {
    if (
      event.target === backdrop ||
      event.target.closest("[data-modal-close]")
    ) {
      closeModal();
    }
  });

  const tabBar = backdrop.querySelector("[data-tab-bar]");
  CATEGORY_SOURCES.forEach((cat) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = cat.label;
    button.className = "modal-tab";
    button.dataset.key = cat.key;
    button.addEventListener("click", () =>
      handleTabClick(backdrop, cat, button)
    );
    tabBar.appendChild(button);
  });

  modalRef = { backdrop, closeModal };
  return modalRef;
};

const handleTabClick = async (backdrop, category, button) => {
  backdrop
    .querySelectorAll(".modal-tab")
    .forEach((btn) => btn.classList.remove("is-active"));
  button.classList.add("is-active");
  const container = backdrop.querySelector("[data-problems-container]");
  container.innerHTML = `<p>${category.label} の問題を読み込み中...</p>`;
  try {
    if (!cache[category.key]) {
      const response = await fetch(category.path);
      if (!response.ok) throw new Error("読み込みに失敗しました");
      cache[category.key] = await response.json();
    }
    renderProblems(container, category, cache[category.key]);
  } catch (error) {
    console.error(error);
    container.innerHTML = `<p class="error">${error.message}</p>`;
  }
};

const renderProblems = (container, category, problems) => {
  if (!Array.isArray(problems) || problems.length === 0) {
    container.innerHTML = `<p>${category.label} の問題が見つかりません。</p>`;
    return;
  }
  container.scrollTop = 0;
  container.classList.add("fade-in");
  container.innerHTML = problems
    .map((problem) => {
      const question = problem.question || "";
      const answer = problem.answer || "";
      return `
        <div class="problem-card">
          <div class="problem-meta">ID: ${problem.id || "N/A"} ／ Lv.${
        problem.difficulty ?? "?"
      }</div>
          <div class="problem-question math-block">
            <span class="problem-label">問題</span>
            ${question}
          </div>
          <div class="problem-answer math-block">
            <span class="problem-label">解答</span>
            ${answer}
          </div>
        </div>
      `;
    })
    .join("");

  if (window.MathJax?.typesetPromise) {
    window.MathJax.typesetPromise([container]).catch((err) =>
      console.error(err)
    );
  }

  setTimeout(() => container.classList.remove("fade-in"), 200);
};

export const openProblemsModal = () => {
  const { backdrop } = ensureModal();
  backdrop.classList.add("is-visible");
};
