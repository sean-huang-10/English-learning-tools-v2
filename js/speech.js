import { state } from './state.js';
import { RATE_MIN, RATE_MAX, RATE_STEP } from './constants.js';

// ── TTS: single word ──
export function speak(word) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang  = 'en-US';
  utter.rate  = state.speechRate;
  const btn   = document.getElementById('popup-speak');
  if (btn) btn.classList.add('speaking');
  utter.onend  = () => btn?.classList.remove('speaking');
  utter.onerror= () => btn?.classList.remove('speaking');
  setTimeout(() => window.speechSynthesis.speak(utter), 50);
}

// ── Read-aloud helpers ──
export function clearHighlights() {
  document.querySelectorAll('.word-speaking, .word-read').forEach(el => {
    el.classList.remove('word-speaking', 'word-read');
  });
}

export function highlightAt(absCharIndex) {
  const allWords = Array.from(document.querySelectorAll('#article-body .word[data-start]'));
  if (!allWords.length) return;
  let speakingEl = null;
  let minDiff = Infinity;
  allWords.forEach(el => {
    const diff = Math.abs(parseInt(el.dataset.start) - absCharIndex);
    if (diff < minDiff) { minDiff = diff; speakingEl = el; }
  });
  allWords.forEach(el => {
    el.classList.remove('word-speaking');
    if (speakingEl && parseInt(el.dataset.start) < parseInt(speakingEl.dataset.start)) {
      el.classList.add('word-read');
    } else {
      el.classList.remove('word-read');
    }
  });
  if (speakingEl) {
    speakingEl.classList.add('word-speaking');
    speakingEl.classList.remove('word-read');
    speakingEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }
}

export function startSpeakingFrom(charIndex) {
  state.isRestarting = true;
  window.speechSynthesis.cancel();
  const textToSpeak = state.articleText.slice(charIndex);
  if (!textToSpeak.trim()) { state.isRestarting = false; stopReadAloud(); return; }
  const utter = new SpeechSynthesisUtterance(textToSpeak);
  utter.lang  = 'en-US';
  utter.rate  = state.speechRate;
  utter.onboundary = (e) => {
    if (e.name === 'word') {
      state.currentCharIndex = charIndex + e.charIndex;
      highlightAt(state.currentCharIndex);
    }
  };
  utter.onend  = () => { if (!state.isRestarting && state.isReadingAloud) stopReadAloud(); };
  utter.onerror= (e) => { if (!state.isRestarting && e.error !== 'interrupted' && state.isReadingAloud) stopReadAloud(); };
  setTimeout(() => { state.isRestarting = false; window.speechSynthesis.speak(utter); }, 80);
}

export function setReadAloudUI(uiState) {
  // uiState: 'stopped' | 'playing' | 'paused'
  const mainBtn   = document.getElementById('read-aloud-btn');
  const pauseBtn  = document.getElementById('pause-btn');
  const icon      = document.getElementById('read-aloud-icon');
  const label     = document.getElementById('read-aloud-label');
  const pauseIcon = document.getElementById('pause-icon');
  mainBtn.classList.remove('playing', 'paused');
  pauseBtn.style.display = 'none';
  if (uiState === 'playing') {
    mainBtn.classList.add('playing');
    icon.textContent  = '⏹';
    label.textContent = '停止朗讀';
    pauseBtn.style.display = 'flex';
    pauseBtn.classList.replace('paused', 'playing');
    pauseIcon.textContent  = '⏸';
  } else if (uiState === 'paused') {
    mainBtn.classList.add('paused');
    icon.textContent  = '▶';
    label.textContent = '繼續朗讀';
    pauseBtn.style.display = 'flex';
    pauseBtn.classList.replace('playing', 'paused');
    pauseIcon.textContent  = '⏹';
  } else {
    icon.textContent  = '🔊';
    label.textContent = '朗讀全文';
  }
}

export function stopReadAloud() {
  window.speechSynthesis.cancel();
  state.isReadingAloud  = false;
  state.isPaused        = false;
  state.currentCharIndex= 0;
  clearHighlights();
  setReadAloudUI('stopped');
}

export function pauseReadAloud() {
  if (!state.isReadingAloud || state.isPaused) return;
  state.isRestarting = true;
  window.speechSynthesis.cancel();
  setTimeout(() => { state.isRestarting = false; }, 100);
  state.isPaused       = true;
  state.isReadingAloud = false;
  setReadAloudUI('paused');
}

export function resumeReadAloud() {
  if (!state.isPaused) return;
  state.isPaused       = false;
  state.isReadingAloud = true;
  setReadAloudUI('playing');
  startSpeakingFrom(state.currentCharIndex);
}

// ── Speed slider factory ──
// sliderConfig: { sliderId, fillId, thumbId, labelId, onChanged? }
export function initSpeedSlider({ sliderId, fillId, thumbId, labelId, onChanged } = {}) {
  const sliderEl = document.getElementById(sliderId);
  const fillEl   = document.getElementById(fillId);
  const thumbEl  = document.getElementById(thumbId);
  const labelEl  = document.getElementById(labelId);
  if (!sliderEl || sliderEl._inited) return;
  sliderEl._inited = true;

  function applyRate(pct) {
    pct = Math.max(0, Math.min(1, pct));
    const raw = RATE_MIN + pct * (RATE_MAX - RATE_MIN);
    state.speechRate = Math.round(Math.round(raw / RATE_STEP) * RATE_STEP * 10) / 10;
    const dp = (state.speechRate - RATE_MIN) / (RATE_MAX - RATE_MIN) * 100;
    fillEl.style.width  = dp + '%';
    thumbEl.style.left  = dp + '%';
    labelEl.textContent = state.speechRate.toFixed(1) + 'x';
    onChanged?.();
  }

  function pct(e) {
    const rect = sliderEl.getBoundingClientRect();
    const cx   = e.touches ? e.touches[0].clientX : e.clientX;
    return (cx - rect.left) / rect.width;
  }

  sliderEl.addEventListener('touchstart', e => { e.preventDefault(); thumbEl.classList.add('dragging'); applyRate(pct(e)); }, { passive: false });
  sliderEl.addEventListener('touchmove',  e => { e.preventDefault(); applyRate(pct(e)); }, { passive: false });
  sliderEl.addEventListener('touchend',   () => thumbEl.classList.remove('dragging'));
  sliderEl.addEventListener('mousedown',  e => {
    thumbEl.classList.add('dragging');
    applyRate(pct(e));
    const mv = e2 => applyRate(pct(e2));
    const up = () => { thumbEl.classList.remove('dragging'); window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup',   up);
  });

  // Initialise to current speechRate
  const initPct = (state.speechRate - RATE_MIN) / (RATE_MAX - RATE_MIN);
  applyRate(initPct);
}

export function syncAllSliders() {
  const dp = (state.speechRate - RATE_MIN) / (RATE_MAX - RATE_MIN) * 100;
  [['speed-fill','speed-thumb','speed-value'],
   ['vocab-speed-fill','vocab-speed-thumb','vocab-speed-value'],
   ['popup-speed-display']].forEach(([fId, tId, lId]) => {
    const f = document.getElementById(fId);
    const t = document.getElementById(tId);
    const l = document.getElementById(lId || fId);
    if (f) f.style.width  = dp + '%';
    if (t) t.style.left   = dp + '%';
    if (l) l.textContent  = state.speechRate.toFixed(1) + 'x';
  });
}
