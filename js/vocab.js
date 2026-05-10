import { state, persist } from './state.js';
import { speak, initSpeedSlider, syncAllSliders } from './speech.js';

export function renderVocab() {
  const list  = document.getElementById('vocab-list');
  const count = document.getElementById('vocab-count');

  if (state.vocab.length === 0) {
    count.textContent = '';
    list.innerHTML    = '<div class="vocab-empty">單字本是空的<br>閱讀時點單字並儲存 📚</div>';
    return;
  }

  count.textContent = `已收錄 ${state.vocab.length} 個單字`;
  list.innerHTML = state.vocab.map((v, i) => `
    <div class="vocab-card">
      <div style="flex:1;">
        <div class="vocab-en">${v.en}</div>
        <div class="vocab-zh">${v.zh}</div>
      </div>
      <button class="vocab-speak" data-word="${v.en}">🔊</button>
      <button class="vocab-del"   data-index="${i}">✕</button>
    </div>
  `).join('');

  list.querySelectorAll('.vocab-del').forEach(btn => {
    btn.addEventListener('click', () => {
      state.vocab.splice(parseInt(btn.dataset.index), 1);
      persist.vocab();
      renderVocab();
    });
  });

  list.querySelectorAll('.vocab-speak').forEach(btn => {
    btn.addEventListener('click', () => {
      speak(btn.dataset.word);
      btn.style.transform = 'scale(1.2)';
      setTimeout(() => (btn.style.transform = ''), 200);
    });
  });

  _initVocabSlider();
}

// The vocab slider mirrors the global speechRate and also syncs the read-view slider
function _initVocabSlider() {
  initSpeedSlider({
    sliderId: 'vocab-speed-slider',
    fillId:   'vocab-speed-fill',
    thumbId:  'vocab-speed-thumb',
    labelId:  'vocab-speed-value',
    onChanged: syncAllSliders,
  });
}
