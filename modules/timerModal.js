import { openModal, closeModal } from "./modalUtils.js";

const API_BASE = "/api/timer";
let timerModalRef = null;

const TEMPLATE = `
  <div class="modal-panel" role="dialog" aria-modal="true">
    <header class="modal-header">
      <div>
        <h3 class="modal-title">Work History</h3>
      </div>
      <button class="modal-close" data-modal-close aria-label="Close">×</button>
    </header>

    <div class="modal-tabs">
      <button class="modal-tab" id="tab-history" onclick="renderTimerTab('history')">Weekly History</button>
      <button class="modal-tab" id="tab-daily" onclick="renderTimerTab('daily')">Daily History</button>
      <button class="modal-tab" id="tab-sessions" onclick="renderTimerTab('sessions')">Recent Sessions</button>
    </div>

    <div id="timer-modal-body" class="modal-body" style="min-height: 400px; padding-bottom: 40px;"></div>
  </div>
`;

const ensureModal = () => {
  if (timerModalRef) return timerModalRef;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = TEMPLATE;
  document.body.appendChild(backdrop);

  const close = () => {
    backdrop.classList.remove("is-visible");
  };

  const handleKeydown = (event) => {
    if (event.key === "Escape") close();
  };
  window.addEventListener("keydown", handleKeydown);

  backdrop.addEventListener("click", (event) => {
    if (
      event.target === backdrop ||
      event.target.closest("[data-modal-close]")
    ) {
      close();
    }
  });

  timerModalRef = { backdrop, close };
  return timerModalRef;
};

export const openTimerModal = (initialTab = "history") => {
  const { backdrop } = ensureModal();
  backdrop.classList.add("is-visible");

  window.renderTimerTab = renderTimerTab;

  renderTimerTab(initialTab);
};

const renderTimerTab = (tabName) => {
  const container = document.getElementById("timer-modal-body");

  document
    .querySelectorAll(".modal-tab")
    .forEach((t) => t.classList.remove("is-active"));
  const activeTab = document.getElementById(`tab-${tabName}`);
  if (activeTab) activeTab.classList.add("is-active");

  container.innerHTML = '<div class="loading">Loading...</div>';

  if (tabName === "history") {
    renderHistoryTab(container);
  } else if (tabName === "daily") {
    renderDailyTab(container);
  } else if (tabName === "sessions") {
    renderSessionsTab(container);
  }
};

let chartState = {
  history: { data: [], offset: 0, limit: 7 },
  daily: { data: [], offset: 0, limit: 14 },
};

const renderChartWithAxis = (type, container, title) => {
  const state = chartState[type];
  const allData = state.data;

  const total = allData.length;
  const start = Math.max(0, total - state.limit - state.offset * state.limit);
  const end = Math.max(0, total - state.offset * state.limit);

  const visibleData = allData.slice(start, end);

  const maxVal = Math.max(...visibleData.map((d) => d.duration), 1); // 0を避けて目盛り生成
  const maxHours = maxVal / 3600;

  let step, maxScale;
  if (maxHours <= 10) {
    step = 2;
    maxScale = Math.ceil(maxHours / 2) * 2;
    if (maxScale < 8) maxScale = 8; // 目安として8時間まで表示
  } else if (maxHours <= 24) {
    step = 4;
    maxScale = Math.ceil(maxHours / 4) * 4;
  } else if (maxHours <= 50) {
    step = 10;
    maxScale = Math.ceil(maxHours / 10) * 10;
  } else {
    step = 20;
    maxScale = Math.ceil(maxHours / 20) * 20;
  }

  let yAxisHtml = "";
  let gridLinesHtml = "";
  const stepsCount = maxScale / step;

  for (let i = 0; i <= stepsCount; i++) {
    const val = i * step;
    yAxisHtml += `<div class="y-axis-label">${val}h</div>`;
    gridLinesHtml += `<div class="grid-line"></div>`;
  }

  const chartHtml = visibleData
    .map((item) => {
      const height = (item.duration / 3600 / maxScale) * 100;
      const hours = (item.duration / 3600).toFixed(1);

      let label;
      if (item.week) {
        const [y, m, d] = item.start_date.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        const weekday = dateObj.toLocaleDateString("en-US", {
          weekday: "narrow",
        });
        label = `${month}/${day} (${weekday})`;
      } else {
        const dateObj = new Date(item.date);
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        const weekday = dateObj.toLocaleDateString("en-US", {
          weekday: "narrow",
        });
        label = `${month}/${day} (${weekday})`;
      }

      return `
      <div class="chart-bar-wrapper">
        <div class="chart-bar" style="height: ${height}%;" title="${hours}h"></div>
        <span class="chart-label">${label}</span>
        <span class="chart-value-top">${hours}h</span>
      </div>
    `;
    })
    .join("");

  const hasNext = state.offset > 0;
  const hasPrev = start > 0;

  container.innerHTML = `
    <div class="chart-controls" style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 10px;">
      <button class="ghost-button small" onclick="changeChartPage('${type}', 1)" ${
    !hasPrev ? "disabled" : ""
  }>← Older</button>
      <span class="muted" style="font-size: 0.9rem;">${title}</span>
      <button class="ghost-button small" onclick="changeChartPage('${type}', -1)" ${
    !hasNext ? "disabled" : ""
  }>Newer →</button>
    </div>

    <div class="chart-wrapper" style="justify-content: center;"> <!-- Center the chart -->
      <div class="y-axis">
        ${yAxisHtml}
      </div>
      <div class="chart-area" style="max-width: ${
        visibleData.length * 60
      }px;"> <!-- Limit width to center bars -->
        <div class="chart-grid-lines">
          ${gridLinesHtml}
        </div>
        <div class="chart-container" style="overflow-x: hidden;">
           <div class="bar-chart" style="width: 100%; justify-content: space-around;">
             ${chartHtml}
           </div>
        </div>
      </div>
    </div>
  `;
};

window.changeChartPage = (type, delta) => {
  chartState[type].offset += delta;
  const container = document.getElementById("timer-modal-body");
  const title = type === "history" ? "Weekly Work Hours" : "Daily Work Hours";
  renderChartWithAxis(type, container, title);
};

const renderHistoryTab = async (container) => {
  try {
    const res = await fetch(`${API_BASE}/history/weekly?weeks=52`);

    if (!res.ok) throw new Error(`API Error: ${res.status}`);

    const weeklyData = await res.json();

    if (weeklyData.length === 0) {
      container.innerHTML =
        '<p class="muted" style="text-align: center; padding: 40px;">No history data available.</p>';
      return;
    }

    chartState.history.data = weeklyData;
    chartState.history.offset = 0;
    chartState.history.limit = 8;

    renderChartWithAxis("history", container, "Weekly Work Hours");
  } catch (e) {
    container.innerHTML = `<p class="error">Error loading history: ${e.message}</p>`;
  }
};

const renderDailyTab = async (container) => {
  try {
    const res = await fetch(`${API_BASE}/history?days=30`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);

    const data = await res.json();
    const dailyData = data.daily_summary;

    if (dailyData.length === 0) {
      container.innerHTML =
        '<p class="muted" style="text-align: center; padding: 40px;">No daily data available.</p>';
      return;
    }

    chartState.daily.data = dailyData;
    chartState.daily.offset = 0;
    chartState.daily.limit = 10;

    renderChartWithAxis("daily", container, "Daily Work Hours");
  } catch (e) {
    container.innerHTML = `<p class="error">Error loading daily history: ${e.message}</p>`;
  }
};

const renderSessionsTab = async (container) => {
  try {
    const res = await fetch(`${API_BASE}/history`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);

    const data = await res.json();
    const sessions = data.sessions;

    if (sessions.length === 0) {
      container.innerHTML =
        '<p class="muted" style="text-align: center; padding: 40px;">No sessions recorded yet.</p>';
      return;
    }

    const html = sessions
      .map((session) => {
        const start = new Date(session.start_time);
        const date = start.toLocaleDateString();
        const time = start.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const duration = formatDuration(session.duration);

        return `
        <div class="session-row" id="session-${session.id}">
          <div class="session-info">
            <div class="session-date">${date}</div>
            <div class="session-time">${time}</div>
          </div>
          <div class="session-duration">${duration}</div>
          <div class="session-actions">
            <button class="ghost-button small" onclick="deleteSession(${session.id})">Delete</button>
          </div>
        </div>
      `;
      })
      .join("");

    container.innerHTML = `
      <div class="session-list">
        ${html}
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<p class="error">Error loading sessions: ${e.message}</p>`;
  }
};

window.deleteSession = async (id) => {
  if (!confirm("Are you sure you want to delete this session?")) return;

  try {
    const res = await fetch(`${API_BASE}/session/${id}`, { method: "DELETE" });
    if (res.ok) {
      renderTimerTab("sessions");
      document.dispatchEvent(new CustomEvent("timerStopped"));
    } else {
      alert("Failed to delete session");
    }
  } catch (e) {
    console.error("Error deleting session", e);
    alert("Error deleting session");
  }
};

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
};
