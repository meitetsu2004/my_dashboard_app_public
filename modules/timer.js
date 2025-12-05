const API_BASE = "/api/timer";

export const initTimer = () => {
  renderTimerUI();
  checkStatus();

  setInterval(updateTimerDisplay, 1000);
};

let timerState = {
  status: 'stopped',
  startTime: null,
  duration: 0
};

const renderTimerUI = () => {
  const timerContainer = document.getElementById('timer-container');
  if (!timerContainer) return;
  
  const timerElement = document.createElement('div');
  timerElement.className = 'circular-timer';
  timerElement.innerHTML = `
    <div class="timer-circle-wrapper">
      <svg class="timer-svg" width="180" height="180" viewBox="0 0 180 180">
        <circle class="timer-circle-bg" cx="90" cy="90" r="84"></circle>
        <circle class="timer-circle-progress" cx="90" cy="90" r="84" transform="rotate(-90 90 90)"></circle>
      </svg>
      <div class="timer-text-display">
        <span id="timer-time">00:00:00</span>
      </div>
    </div>
    <div class="timer-controls">
      <button id="timer-btn-start" class="timer-control-btn" title="Start">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <button id="timer-btn-pause" class="timer-control-btn" title="Pause">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>
      <button id="timer-btn-stop" class="timer-control-btn" title="Stop">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
      </button>
    </div>
  `;
  
  timerContainer.innerHTML = '';
  timerContainer.appendChild(timerElement);
  
  document.getElementById('timer-btn-start').addEventListener('click', startTimer);
  document.getElementById('timer-btn-pause').addEventListener('click', pauseTimer);
  document.getElementById('timer-btn-stop').addEventListener('click', stopTimer);
  
  updateControls();
};

const checkStatus = async () => {
  try {
    const res = await fetch(`${API_BASE}/status`);
    const data = await res.json();
    
    if (data) {
      timerState.status = data.status;
      timerState.startTime = data.start_time ? new Date(data.start_time) : null;
      timerState.duration = data.current_duration;
    } else {
      timerState.status = 'stopped';
      timerState.startTime = null;
      timerState.duration = 0;
    }
    updateControls();
    updateTimerDisplay();
  } catch (e) {
    console.error("Failed to check timer status", e);
  }
};

const startTimer = async () => {
  try {
    const res = await fetch(`${API_BASE}/start`, { method: 'POST' });
    const data = await res.json();
    timerState.status = 'running';
    timerState.startTime = new Date();
    checkStatus();
  } catch (e) {
    console.error("Start failed", e);
  }
};

const pauseTimer = async () => {
  try {
    const res = await fetch(`${API_BASE}/pause`, { method: 'POST' });
    const data = await res.json();
    timerState.status = 'paused';
    timerState.duration = data.duration;
    updateControls();
  } catch (e) {
    console.error("Pause failed", e);
  }
};

const stopTimer = async () => {
  try {
    await fetch(`${API_BASE}/stop`, { method: 'POST' });
    timerState.status = 'stopped';
    timerState.duration = 0;
    timerState.startTime = null;
    updateControls();
    updateTimerDisplay();
    document.dispatchEvent(new CustomEvent('timerStopped'));
  } catch (e) {
    console.error("Stop failed", e);
  }
};

const updateControls = () => {
  const startBtn = document.getElementById('timer-btn-start');
  const pauseBtn = document.getElementById('timer-btn-pause');
  const stopBtn = document.getElementById('timer-btn-stop');
  
  if (!startBtn) return;
  
  startBtn.classList.remove('active');
  pauseBtn.classList.remove('active');
  stopBtn.classList.remove('active');
  
  if (timerState.status === 'running') {
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    startBtn.classList.add('active');
  } else if (timerState.status === 'paused') {
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = false;
    pauseBtn.classList.add('active');
  } else {
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
  }
};

const updateTimerDisplay = () => {
  const display = document.getElementById('timer-time');
  const circle = document.querySelector('.timer-circle-progress');
  if (!display) return;
  
  let seconds = timerState.duration;
  
  if (timerState.status === 'running' && timerState.startTime) {
    const now = new Date();
    seconds = timerState.duration + Math.floor((now - timerState.startTime) / 1000);
  }
  
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  
  display.textContent = `${h}:${m}:${s}`;
  
  if (circle) {
    const radius = 84;
    const circumference = 2 * Math.PI * radius;
    const progress = (seconds % 3600) / 3600;
    const dashoffset = circumference * (1 - progress);
    
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = dashoffset;
  }
};
