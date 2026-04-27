const DEFAULT_DURATION_SECONDS = 5 * 60;
const STORAGE_KEY = "gonggi-guinness-records";

const state = {
  duration: DEFAULT_DURATION_SECONDS,
  remaining: DEFAULT_DURATION_SECONDS,
  running: false,
  timerId: null,
  records: [],
  audio: null,
  musicTimer: null,
};

const elements = {
  bestTeam: document.querySelector("#bestTeam"),
  bestScore: document.querySelector("#bestScore"),
  rankList: document.querySelector("#rankList"),
  entryForm: document.querySelector("#entryForm"),
  teamName: document.querySelector("#teamName"),
  teamScore: document.querySelector("#teamScore"),
  timerLabel: document.querySelector("#timerLabel"),
  timeDisplay: document.querySelector("#timeDisplay"),
  timeProgress: document.querySelector("#timeProgress"),
  durationButtons: document.querySelectorAll(".duration-button"),
  toggleTimer: document.querySelector("#toggleTimer"),
  controlsToggle: document.querySelector("#controlsToggle"),
  timerControls: document.querySelector("#timerControls"),
  resetTimer: document.querySelector("#resetTimer"),
  resetAll: document.querySelector("#resetAll"),
  fullscreenToggle: document.querySelector("#fullscreenToggle"),
  soundToggle: document.querySelector("#soundToggle"),
  clearRecords: document.querySelector("#clearRecords"),
  timerPanel: document.querySelector(".timer-panel"),
};

function loadRecords() {
  try {
    state.records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    state.records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function sortedRecords() {
  return [...state.records].sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);
}

function renderRecords() {
  const records = sortedRecords();
  const best = records[0];

  elements.bestTeam.textContent = best ? best.name : "아직 기록 없음";
  elements.bestScore.textContent = best ? best.score.toLocaleString("ko-KR") : "0";
  elements.rankList.innerHTML = "";

  if (records.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "첫 기록을 입력하세요";
    elements.rankList.append(empty);
    return;
  }

  records.slice(1).forEach((record, index) => {
    const item = document.createElement("li");
    item.className = "rank-item";
    item.innerHTML = `
      <span class="rank-number">${index + 2}</span>
      <span class="rank-name"></span>
      <span class="rank-score">${record.score.toLocaleString("ko-KR")}년</span>
    `;
    item.querySelector(".rank-name").textContent = record.name;
    elements.rankList.append(item);
  });

  if (records.length === 1) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "다음 도전자를 기다리는 중";
    elements.rankList.append(empty);
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function renderTimer() {
  elements.timeDisplay.textContent = formatTime(state.remaining);
  elements.timeProgress.max = state.duration;
  elements.timeProgress.value = state.remaining;
  elements.timerLabel.textContent = `${Math.round(state.duration / 60)} MINUTE CHALLENGE`;
  elements.toggleTimer.textContent = state.running ? "중지" : "시작";
  elements.timerPanel.classList.toggle("is-running", state.running);
  elements.timerPanel.classList.toggle("is-paused", !state.running);
  elements.timerPanel.classList.toggle("is-finished", state.remaining === 0);

  elements.durationButtons.forEach((button) => {
    const buttonSeconds = Number.parseInt(button.dataset.minutes, 10) * 60;
    button.classList.toggle("is-active", buttonSeconds === state.duration);
  });
}

function renderFullscreenButton() {
  elements.fullscreenToggle.textContent = document.fullscreenElement ? "전체화면 해제" : "전체화면";
}

function setControlsOpen(isOpen) {
  elements.timerControls.hidden = !isOpen;
  elements.controlsToggle.setAttribute("aria-expanded", String(isOpen));
  elements.controlsToggle.textContent = isOpen ? "설정 닫기" : "설정";
}

function onPress(element, handler) {
  element.addEventListener("click", handler);
  element.addEventListener(
    "touchend",
    (event) => {
      event.preventDefault();
      handler(event);
    },
    { passive: false },
  );
}

function audioContext() {
  if (!state.audio) {
    state.audio = new AudioContext();
  }
  return state.audio;
}

function playTone(frequency, duration = 0.08, volume = 0.08, type = "sine") {
  if (!elements.soundToggle.checked) return;

  const audio = audioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, audio.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration + 0.02);
}

function startMusic() {
  if (!elements.soundToggle.checked || state.musicTimer) return;

  const notes = [262, 330, 392, 523, 392, 330];
  let beat = 0;
  state.musicTimer = window.setInterval(() => {
    if (!state.running) return;
    playTone(notes[beat % notes.length], 0.11, 0.035, "triangle");
    beat += 1;
  }, 720);
}

function stopMusic() {
  window.clearInterval(state.musicTimer);
  state.musicTimer = null;
}

function finishTimer() {
  state.running = false;
  window.clearInterval(state.timerId);
  state.timerId = null;
  stopMusic();
  playTone(784, 0.16, 0.12, "square");
  setTimeout(() => playTone(659, 0.16, 0.12, "square"), 170);
  setTimeout(() => playTone(523, 0.28, 0.14, "square"), 340);
  renderTimer();
}

function tick() {
  if (state.remaining <= 0) {
    finishTimer();
    return;
  }

  state.remaining -= 1;

  if (state.remaining <= 10 && state.remaining > 0) {
    playTone(880, 0.08, 0.1, "square");
  } else if (state.remaining % 5 === 0) {
    playTone(440, 0.05, 0.045, "sine");
  }

  renderTimer();

  if (state.remaining === 0) {
    finishTimer();
  }
}

function startTimer() {
  if (state.remaining === 0) {
    state.remaining = state.duration;
  }

  state.running = true;
  audioContext().resume();
  playTone(660, 0.08, 0.09, "triangle");
  startMusic();
  state.timerId = window.setInterval(tick, 1000);
  setControlsOpen(false);
  renderTimer();
}

function pauseTimer() {
  state.running = false;
  window.clearInterval(state.timerId);
  state.timerId = null;
  stopMusic();
  playTone(330, 0.08, 0.07, "triangle");
  renderTimer();
}

elements.toggleTimer.addEventListener("click", () => {
  if (state.running) {
    pauseTimer();
  } else {
    startTimer();
  }
});

onPress(elements.controlsToggle, () => {
  setControlsOpen(elements.timerControls.hidden);
});

elements.resetTimer.addEventListener("click", () => {
  pauseTimer();
  state.remaining = state.duration;
  renderTimer();
});

elements.durationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const minutes = Number.parseInt(button.dataset.minutes, 10);
    state.duration = minutes * 60;
    state.remaining = state.duration;
    pauseTimer();
    renderTimer();
  });
});

elements.resetAll.addEventListener("click", () => {
  const shouldReset = window.confirm("타이머와 모든 기록을 초기화할까요?");
  if (!shouldReset) return;

  pauseTimer();
  state.duration = DEFAULT_DURATION_SECONDS;
  state.remaining = state.duration;
  state.records = [];
  elements.entryForm.reset();
  saveRecords();
  renderRecords();
  renderTimer();
});

elements.fullscreenToggle.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    window.alert("이 브라우저에서는 전체화면 전환을 사용할 수 없습니다.");
  }
});

document.addEventListener("fullscreenchange", renderFullscreenButton);

elements.entryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = elements.teamName.value.trim();
  const score = Number.parseInt(elements.teamScore.value, 10);
  if (!name || Number.isNaN(score) || score < 0) return;

  state.records.push({
    name,
    score,
    createdAt: Date.now(),
  });
  saveRecords();
  renderRecords();
  playTone(988, 0.1, 0.08, "triangle");
  elements.entryForm.reset();
  elements.teamName.focus();
});

elements.clearRecords.addEventListener("click", () => {
  const shouldClear = window.confirm("모든 기록을 삭제할까요?");
  if (!shouldClear) return;

  state.records = [];
  saveRecords();
  renderRecords();
});

elements.soundToggle.addEventListener("change", () => {
  if (!elements.soundToggle.checked) {
    stopMusic();
  } else if (state.running) {
    startMusic();
    playTone(660, 0.08, 0.08, "triangle");
  }
});

loadRecords();
renderRecords();
renderTimer();
renderFullscreenButton();
