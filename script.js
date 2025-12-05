import { openCalcModal } from "./modules/calcModal.js";
import { openProblemsModal } from "./modules/problemsModal.js";
import { openEnglishModal } from "./modules/englishModal.js";
import { initTodo } from "./modules/todo.js";
import { initTimer } from "./modules/timer.js";
import { initTimerCard } from "./modules/timerCard.js";

const THEME_KEY = "pd-theme";

const getStoredTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (error) {
    console.warn("テーマの取得に失敗しました", error);
    return null;
  }
};

const setStoredTheme = (theme) => {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.warn("テーマの保存に失敗しました", error);
  }
};

const initialTheme = getStoredTheme() || "light";
document.body.dataset.theme = initialTheme;

const ICONS = {
  cloud: '<img src="assets/icons/cloud.png" alt="cloud" />',
  cap: '<img src="assets/icons/cap.png" alt="cap" />',
  note: '<img src="assets/icons/note.png" alt="note" />',
  file: '<img src="assets/icons/file.png" alt="file" />',
  list: '<img src="assets/icons/list.png" alt="list" />',
  keio: '<img src="assets/icons/keio.png" alt="keio" />',
  mf: '<img src="assets/icons/MF.png" alt="mf" />',
  notion: '<img src="assets/icons/notion.png" alt="notion" />',
  generate_worksheet:
    '<img src="assets/icons/generate_worksheet.png" alt="generate_worksheet" />',
  problems: '<img src="assets/icons/problems.png" alt="problems" />',
  word_test: '<img src="assets/icons/word_test.png" alt="word_test" />',
  register_word:
    '<img src="assets/icons/register_word.png" alt="register_word" />',
  word_list: '<img src="assets/icons/word_list.png" alt="word_list" />',
};

const workLinks = [
  {
    label: "MFクラウド勤怠",
    url: "https://attendance.moneyforward.com/my_page",
    icon: ICONS.mf,
    theme: "shortcut-mf",
  },
  {
    label: "KLMS",
    url: "https://lms.keio.jp",
    icon: ICONS.keio,
    theme: "shortcut-klms",
  },
  {
    label: "Notion",
    url: "https://www.notion.so/HOME-1d9781a38f57809b85c2e68cd1b7aa24",
    icon: ICONS.notion,
    theme: "shortcut-notion",
  },
];

const worksheetShortcuts = [
  {
    label: "計算プリント作成",
    action: "openModal",
    icon: ICONS.generate_worksheet,
    theme: "shortcut-primary",
  },
  {
    label: "既存問題を確認",
    action: "openProblems",
    icon: ICONS.problems,
    theme: "shortcut-secondary",
  },
];

const template = `
  <header class="hero">
    <div class="hero-main">
      <h1>Daily Canvas</h1>
    </div>
    <div class="hero-right">
      <div class="user-badge">
        <span class="user-icon"><img src="assets/icons/user.png" alt="User" /></span>
        <div>
          <p class="username">Meitetsu_Takashina</p>
        </div>
      </div>
      <button class="mode-toggle" id="mode-toggle" aria-pressed="false">
        <span class="mode-icon" id="mode-icon"><img src="assets/icons/sun.png" alt="Light Mode" /></span>
        <span class="mode-copy" id="mode-text">Light</span>
      </button>
    </div>
  </header>

  <section class="time-overview">
    <div class="clock-container">
      <p class="clock" id="clock">--:--:--</p>
      <p class="date" id="date">----/--/-- (--)</p>
    </div>
    <div class="timer-container" id="timer-container"></div>
  </section>

  <section class="card-grid">
    <article class="card" id="card-launchpad">
      <div class="card-header">
        <h2 class="card-title">Work Launchpad</h2>
      </div>
      <div class="card-content">
        <div class="shortcut-grid" id="work-links"></div>
      </div>
    </article>

    <article class="card" id="card-worksheet">
      <div class="card-header">
        <h2 class="card-title">Worksheet Tools</h2>
      </div>
      <div class="card-content">
        <div class="shortcut-grid" id="worksheet-links"></div>
      </div>
    </article>

    <article class="card" id="card-todo">
      <div class="card-header">
        <h2 class="card-title">ToDo List</h2>
        <button class="ghost-button small" id="btn-todo-rollover" title="Move incomplete today tasks to future">
          Start New Day
        </button>
      </div>
      <div class="card-content">
        <div class="todo-container">
          <div class="todo-column">
            <h3 class="todo-header">Today</h3>
            <div id="todo-list-today" class="todo-list"></div>
            <div class="todo-input-wrapper">
              <input type="text" id="todo-input-today" class="todo-input" placeholder="+ Add task" />
            </div>
          </div>
          <div class="todo-column">
            <h3 class="todo-header">Future</h3>
            <div id="todo-list-future" class="todo-list"></div>
            <div class="todo-input-wrapper">
              <input type="text" id="todo-input-future" class="todo-input" placeholder="+ Add task" />
            </div>
          </div>
        </div>
      </div>
    </article>

    <article class="card" id="card-english">
      <div class="card-header">
        <h2 class="card-title">English Vocabulary</h2>
      </div>
      <div class="card-content">
        <div class="shortcut-grid">
          <a class="shortcut-card is-blue" id="btn-english-test">
            <div class="shortcut-icon" aria-hidden="true">${ICONS.word_test}</div>
            <div>
              <p class="shortcut-title">単語テスト</p>
            </div>
          </a>
          <a class="shortcut-card is-green" id="btn-english-register">
            <div class="shortcut-icon" aria-hidden="true">${ICONS.register_word}</div>
            <div>
              <p class="shortcut-title">単語を登録</p>
            </div>
          </a>
          <a class="shortcut-card is-orange" id="btn-english-list">
            <div class="shortcut-icon" aria-hidden="true">${ICONS.word_list}</div>
            <div>
              <p class="shortcut-title">登録単語一覧</p>
            </div>
          </a>
        </div>
      </div>
    </article>
  </section>
`;

const applyTheme = (theme) => {
  document.body.dataset.theme = theme;
  setStoredTheme(theme);
  const icon = document.getElementById("mode-icon");
  const text = document.getElementById("mode-text");
  const toggle = document.getElementById("mode-toggle");

  if (icon && text) {
    if (theme === "dark") {
      icon.innerHTML = '<img src="assets/icons/moon.svg" alt="Dark Mode" />';
      text.textContent = "Dark";
    } else {
      icon.innerHTML = '<img src="assets/icons/sun.png" alt="Light Mode" />';
      text.textContent = "Light";
    }
  }
  if (toggle) {
    toggle.setAttribute("aria-pressed", theme === "dark");
  }
};

const initThemeToggle = () => {
  const toggle = document.getElementById("mode-toggle");
  if (!toggle) return;
  applyTheme(getStoredTheme() || "light");
  toggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
};

const render = () => {
  const root = document.getElementById("app");
  root.innerHTML = template;

  const workLinksContainer = document.getElementById("work-links");
  if (workLinksContainer) {
    workLinksContainer.innerHTML = workLinks
      .map(
        (link) => `
          <a class="shortcut-card ${link.theme}" href="${link.url}" target="_blank" rel="noopener noreferrer">
            <div class="shortcut-icon" aria-hidden="true">${link.icon}</div>
            <div>
              <p class="shortcut-title">${link.label}</p>
            </div>
          </a>
        `
      )
      .join("");
  }

  const worksheetLinks = document.getElementById("worksheet-links");
  if (worksheetLinks) {
    worksheetLinks.innerHTML = worksheetShortcuts
      .map(
        (item) => `
          <a class="shortcut-card ${item.theme}" data-action="${item.action}">
            <div class="shortcut-icon" aria-hidden="true">${item.icon}</div>
            <div>
              <p class="shortcut-title">${item.label}</p>
            </div>
          </a>
        `
      )
      .join("");

    worksheetLinks.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const action = button.getAttribute("data-action");
      if (action === "openModal") {
        openCalcModal();
      } else if (action === "openProblems") {
        openProblemsModal();
      }
    });
  }

  initThemeToggle();

  const btnTest = document.getElementById("btn-english-test");
  if (btnTest)
    btnTest.addEventListener("click", () => openEnglishModal("test"));

  const btnRegister = document.getElementById("btn-english-register");
  if (btnRegister)
    btnRegister.addEventListener("click", () => openEnglishModal("register"));

  const btnList = document.getElementById("btn-english-list");
  if (btnList)
    btnList.addEventListener("click", () => openEnglishModal("list"));

  // Initialize ToDo
  initTodo();

  // Initialize Timer
  initTimer();
  initTimerCard();
};

const updateClock = () => {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");
  const clock = document.getElementById("clock");
  const date = document.getElementById("date");

  if (clock) {
    clock.textContent = `${hh}:${mm}:${ss}`;
  }
  if (date) {
    const day = now.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });
    date.textContent = day;
  }
};

render();
updateClock();
setInterval(updateClock, 1_000);
