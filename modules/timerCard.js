const API_BASE = "/api/timer";
import { openTimerModal } from "./timerModal.js";

export const initTimerCard = () => {
  renderCard();
  updateStats();

  document.addEventListener('timerStopped', updateStats);
  setInterval(updateStats, 60000);
};

const renderCard = () => {
  const grid = document.querySelector('.card-grid');
  if (!grid) return;

  const card = document.createElement('article');
  card.className = 'card';
  card.id = 'card-timer';
  card.innerHTML = `
    <div class="card-header">
      <h2 class="card-title">Work Stats</h2>
      <button class="ghost-button small" id="btn-timer-details">Details</button>
    </div>
    <div class="card-content">
      <div class="timer-stats-container">
        <div class="stat-group">
          <div class="stat-header">
            <span class="stat-label">Today</span>
            <span class="stat-value" id="stat-today">0h 0m</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" id="progress-today" style="width: 0%"></div>
          </div>
        </div>
        
        <div class="stat-group">
          <div class="stat-header">
            <span class="stat-label">This Week</span>
            <span class="stat-value" id="stat-weekly">0h 0m</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" id="progress-weekly" style="width: 0%"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const englishCard = document.getElementById('card-english');
  if (englishCard) {
    englishCard.insertAdjacentElement('afterend', card);
  } else {
    grid.appendChild(card);
  }
  
  document.getElementById('btn-timer-details').addEventListener('click', openTimerModal);
};

const updateStats = async () => {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const data = await res.json();
    
    document.getElementById('stat-today').textContent = formatDuration(data.today);
    document.getElementById('stat-weekly').textContent = formatDuration(data.weekly);
    
    // 目標: 今日8時間(28800秒)、週40時間(144000秒)を基準に進捗を算出
    const todayTarget = 28800;
    const weeklyTarget = 144000;
    
    const todayPercent = Math.min((data.today / todayTarget) * 100, 100);
    const weeklyPercent = Math.min((data.weekly / weeklyTarget) * 100, 100);
    
    document.getElementById('progress-today').style.width = `${todayPercent}%`;
    document.getElementById('progress-weekly').style.width = `${weeklyPercent}%`;
    
  } catch (e) {
    console.error("Failed to update timer stats", e);
  }
};

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};
