import { state, persist } from './state.js';
import { translate, fetchDictionary } from './api.js';
import { speak, syncAllSliders, startSpeakingFrom } from './speech.js';
import { saveToLibrary } from './library.js';

const popup  = document.getElementById('popup');
const overlay= document.getElementById('popup-overlay');

export function showPopup(word, el) {
  state.currentWord        = word;
  state.currentWordEl      = el;
  state.currentTranslation = '';

  document.getElementById('popup-word').textContent = word;
  const transEl = document.getElementById('popup-translation');
  transEl.textContent = '';
  transEl.classList.add('loading-text');
  document.getElementById('popup-meta').innerHTML     = '';
  document.getElementById('popup-phonetic').textContent= '';
  document.getElementById('popup-example').textContent = '';

  // Save buttons state
  const saveBtn  = document.getElementById('popup-save');
  const alreadySaved = state.vocab.some(v => v.en.toLowerCase() === word.toLowerCase());
  saveBtn.textContent = alreadySaved ? '✓ 已在單字本' : '＋ 加入單字本';
  saveBtn.classList.toggle('saved', alreadySaved);

  const libBtn = document.getElementById('popup-lib-save');
  const inLib  = state.library.some(v => v.en.toLowerCase() === word.toLowerCase());
  libBtn.textContent   = inLib ? '✓ 已在單字庫' : '＋ 單字庫';
  libBtn.style.opacity = inLib ? '0.7' : '1';

  // Position
  _positionPopup(el);
  popup.classList.add('show');
  overlay.classList.add('active');
  syncAllSliders();

  // Load translation + dict in parallel
  Promise.all([translate(word), fetchDictionary(word)]).then(([translation, dict]) => {
    state.currentTranslation = translation;
    transEl.classList.remove('loading-text');
    transEl.textContent = translation;
    if (dict) _fillDictUI(dict);
  });
}

export function hidePopup() {
  popup.classList.remove('show');
  overlay.classList.remove('active');
}

// ── Internal helpers ──
function _positionPopup(el) {
  const rect    = el.getBoundingClientRect();
  const margin  = 12;
  const popupW  = Math.min(320, window.innerWidth * 0.88);
  const popupH  = 220;
  let top  = rect.bottom + margin;
  let left = rect.left;
  if (left + popupW > window.innerWidth - margin)  left = window.innerWidth - popupW - margin;
  if (left < margin)                               left = margin;
  if (top  + popupH > window.innerHeight - margin) top  = rect.top - popupH - margin;
  popup.style.top   = top  + 'px';
  popup.style.left  = left + 'px';
  popup.style.width = popupW + 'px';
}

function _fillDictUI(dict) {
  if (dict.phonetic) {
    document.getElementById('popup-phonetic').textContent = dict.phonetic;
  }
  const metaEl = document.getElementById('popup-meta');
  const seen   = new Set();
  dict.meanings.forEach(m => {
    if (!seen.has(m.short)) {
      seen.add(m.short);
      const badge = document.createElement('span');
      badge.className   = 'pos-badge ' + m.cls;
      badge.textContent = m.short + ' ' + m.zh;
      metaEl.appendChild(badge);
    }
  });
  const priority = ['preposition','verb','noun','adjective'];
  let bestExample = '';
  for (const p of priority) {
    const m = dict.meanings.find(m => m.pos?.includes(p) && m.example);
    if (m) { bestExample = m.example; break; }
  }
  if (!bestExample) {
    const m = dict.meanings.find(m => m.example);
    if (m) bestExample = m.example;
  }
  if (bestExample) document.getElementById('popup-example').textContent = '"' + bestExample + '"';
}

// ── Event listeners ──
overlay.addEventListener('click', hidePopup);
document.getElementById('popup-close').addEventListener('click', (e) => { e.stopPropagation(); hidePopup(); });
document.getElementById('popup').addEventListener('click', (e) => e.stopPropagation());

document.getElementById('popup-speak').addEventListener('click', (e) => {
  e.stopPropagation();
  speak(state.currentWord);
});

document.getElementById('popup-speed-down').addEventListener('click', (e) => {
  e.stopPropagation();
  state.speechRate = Math.max(0.1, Math.round((state.speechRate - 0.1) * 10) / 10);
  syncAllSliders();
  if (state.isReadingAloud) startSpeakingFrom(state.currentCharIndex);
});

document.getElementById('popup-speed-up').addEventListener('click', (e) => {
  e.stopPropagation();
  state.speechRate = Math.min(1.5, Math.round((state.speechRate + 0.1) * 10) / 10);
  syncAllSliders();
  if (state.isReadingAloud) startSpeakingFrom(state.currentCharIndex);
});

document.getElementById('popup-save').addEventListener('click', () => {
  if (!state.currentTranslation) return;
  const key = state.currentWord.toLowerCase();
  if (!state.vocab.some(v => v.en.toLowerCase() === key)) {
    state.vocab.unshift({ en: state.currentWord, zh: state.currentTranslation });
    persist.vocab();
    document.querySelectorAll(`.word[data-word="${state.currentWord}"]`)
      .forEach(el => el.classList.add('looked-up'));
  }
  const btn = document.getElementById('popup-save');
  btn.textContent = '✓ 已在單字本';
  btn.classList.add('saved', 'pulse');
  setTimeout(() => btn.classList.remove('pulse'), 400);
});

document.getElementById('popup-lib-save').addEventListener('click', (e) => {
  e.stopPropagation();
  if (!state.currentTranslation) return;
  const dict  = state.dictCache[state.currentWord.toLowerCase()];
  const added = saveToLibrary(state.currentWord, state.currentTranslation, dict);
  const btn   = document.getElementById('popup-lib-save');
  btn.textContent   = added ? '✓ 已存入單字庫' : '✓ 已在單字庫';
  btn.style.opacity = '0.7';
});
