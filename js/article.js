import { state } from './state.js';
import { showPopup } from './popup.js';
import { translateFullArticle } from './api.js';
import {
  startSpeakingFrom, stopReadAloud, pauseReadAloud,
  resumeReadAloud, setReadAloudUI,
} from './speech.js';

// ── Render clickable article ──
export function renderArticle(text) {
  state.currentArticleText = text;
  const body  = document.getElementById('article-body');
  const parts = text.split(/(\s+|[\n\r]+)/);
  let wordCount = 0;
  let charPos   = 0;
  let html      = '';

  parts.forEach(part => {
    if (/\n/.test(part)) {
      html   += '<br><br>';
      charPos += part.length;
    } else if (/\s+/.test(part)) {
      html   += ' ';
      charPos += part.length;
    } else if (part) {
      const clean  = part.replace(/[^a-zA-Z'-]/g, '');
      const prefix = part.match(/^[^a-zA-Z'-]*/)?.[0]  || '';
      const suffix = part.match(/[^a-zA-Z'-]*$/)?.[0]  || '';
      if (clean) {
        wordCount++;
        const wordStart  = charPos + prefix.length;
        const isLooked   = state.vocab.some(v => v.en.toLowerCase() === clean.toLowerCase());
        html += `${prefix}<span class="word${isLooked ? ' looked-up' : ''}" data-word="${clean}" data-start="${wordStart}">${clean}</span>${suffix}`;
      } else {
        html += part;
      }
      charPos += part.length;
    }
  });

  body.innerHTML = html;
  document.getElementById('word-count').textContent = `${wordCount} 個單字`;

  // Reset translation panel
  _resetTranslationPanel();

  // Attach click handlers
  body.querySelectorAll('.word').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); showPopup(el.dataset.word, el); });
  });
}

function _resetTranslationPanel() {
  const section = document.getElementById('translation-section');
  if (!section) return;
  section.style.display = 'none';
  document.getElementById('translation-body').textContent     = '';
  document.getElementById('translate-all-icon').textContent   = '🌐';
  document.getElementById('translate-all-label').textContent  = '顯示全文翻譯';
  const btn = document.getElementById('translate-all-btn');
  btn.classList.remove('loaded');
  btn.disabled = false;
}

// ── Event: full translation button ──
document.getElementById('translate-all-btn').addEventListener('click', translateFullArticle);

// ── Event: Read Aloud main button ──
document.getElementById('read-aloud-btn').addEventListener('click', () => {
  if (!window.speechSynthesis) { alert('你的瀏覽器不支援語音功能'); return; }
  if (state.isPaused)        { resumeReadAloud(); return; }
  if (state.isReadingAloud)  { stopReadAloud();   return; }
  state.articleText     = document.getElementById('article-body').innerText;
  if (!state.articleText.trim()) return;
  state.isReadingAloud  = true;
  state.isPaused        = false;
  state.currentCharIndex= 0;
  setReadAloudUI('playing');
  startSpeakingFrom(0);
});

// ── Event: Pause / Stop button ──
document.getElementById('pause-btn').addEventListener('click', () => {
  if (state.isReadingAloud) pauseReadAloud();
  else if (state.isPaused)  stopReadAloud();
});

// ── Reading progress bar ──
const progressFill = document.getElementById('reading-progress-fill');
export function updateProgress() {
  const body = document.getElementById('article-body');
  if (!body) return;
  const rect   = body.getBoundingClientRect();
  const scrolled = Math.max(0, -rect.top + window.innerHeight * 0.3);
  const pct    = Math.min(100, (scrolled / body.offsetHeight) * 100);
  progressFill.style.width = pct.toFixed(1) + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
