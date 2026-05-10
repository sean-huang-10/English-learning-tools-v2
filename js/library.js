import { state, persist } from './state.js';

// ── Save a word to library ──
export function saveToLibrary(word, translation, dict) {
  if (state.library.some(w => w.en.toLowerCase() === word.toLowerCase())) return false;
  const entry = { en: word, zh: translation, phonetic: '', posList: [], example: '' };
  if (dict) {
    entry.phonetic = dict.phonetic || '';
    const seen = new Set();
    dict.meanings.forEach(m => {
      if (!seen.has(m.short)) {
        seen.add(m.short);
        entry.posList.push({ short: m.short, zh: m.zh, cls: m.cls });
      }
    });
    const priority = ['preposition','verb','noun','adjective'];
    for (const p of priority) {
      const m = dict.meanings.find(m => m.pos?.includes(p) && m.example);
      if (m) { entry.example = m.example; break; }
    }
    if (!entry.example) {
      const m = dict.meanings.find(m => m.example);
      if (m) entry.example = m.example;
    }
  }
  state.library.unshift(entry);
  persist.library();
  return true;
}

// ── Render Library list ──
export function renderLibrary() {
  const list  = document.getElementById('library-list');
  const count = document.getElementById('library-count');
  if (state.library.length === 0) {
    count.textContent = '';
    list.innerHTML    = '<div class="vocab-empty">單字庫是空的<br>從單字本中加入單字 📚</div>';
    return;
  }
  count.textContent = `單字庫共 ${state.library.length} 個單字`;
  list.innerHTML = state.library.map((w, i) => `
    <div class="lib-card">
      <div class="lib-card-top">
        <div>
          <div class="lib-en">${w.en}</div>
          ${w.phonetic ? `<div class="lib-phonetic">${w.phonetic}</div>` : ''}
        </div>
        <button class="lib-del" data-index="${i}">✕</button>
      </div>
      ${w.posList?.length ? `<div class="lib-pos-row">${w.posList.map(p => `<span class="pos-badge ${p.cls}">${p.short} ${p.zh}</span>`).join('')}</div>` : ''}
      <div class="lib-zh">${w.zh}</div>
      ${w.example ? `<div class="lib-example">"${w.example}"</div>` : ''}
    </div>
  `).join('');
  list.querySelectorAll('.lib-del').forEach(btn => {
    btn.addEventListener('click', () => {
      state.library.splice(parseInt(btn.dataset.index), 1);
      persist.library();
      renderLibrary();
    });
  });
}

// ── Flashcard ──
let fcQueue = [], fcIndex = 0, fcFlipped = false, fcWrong = [];

export function startReview() {
  if (!state.library.length) return;
  fcQueue   = [...state.library].sort(() => Math.random() - 0.5);
  fcWrong   = [];
  fcIndex   = 0;
  fcFlipped = false;
  document.getElementById('flashcard-overlay').style.display = 'flex';
  _showCard();
}

function _showCard() {
  const w = fcQueue[fcIndex];
  if (!w) { _showDone(); return; }
  fcFlipped = false;
  document.getElementById('fc-word').textContent      = w.en;
  document.getElementById('fc-phonetic').textContent  = w.phonetic || '';
  document.getElementById('fc-back').style.display    = 'none';
  document.querySelector('.fc-front').style.display   = 'block';
  document.getElementById('fc-btn-row').style.display = 'none';
  document.getElementById('fc-word-back').textContent = w.en;
  document.getElementById('fc-translation').textContent = w.zh;
  document.getElementById('fc-pos').innerHTML = (w.posList || [])
    .map(p => `<span class="pos-badge ${p.cls}">${p.short} ${p.zh}</span>`).join('');
  document.getElementById('fc-example').textContent = w.example ? `"${w.example}"` : '';
  const pct = (fcIndex / fcQueue.length * 100).toFixed(0);
  document.getElementById('fc-progress-bar').style.width = pct + '%';
}

function _showDone() {
  const card = document.getElementById('flashcard');
  card.style.cursor = 'default';
  card.innerHTML = `<div class="fc-done">
    <div class="fc-done-emoji">🎉</div>
    <div class="fc-done-title">複習完成！</div>
    <div class="fc-done-sub">共 ${fcQueue.length} 個單字，${fcWrong.length} 個需要加強</div>
    ${fcWrong.length ? `<button class="review-btn" id="retry-btn">重複練習不熟的</button>` : ''}
  </div>`;
  document.getElementById('fc-btn-row').style.display = 'none';
  document.getElementById('fc-progress-bar').style.width = '100%';
  document.getElementById('retry-btn')?.addEventListener('click', () => {
    fcQueue   = [...fcWrong].sort(() => Math.random() - 0.5);
    fcWrong   = [];
    fcIndex   = 0;
    fcFlipped = false;
    card.style.cursor = 'pointer';
    card.innerHTML = `
      <div class="fc-front"><div class="fc-word" id="fc-word"></div><div class="fc-phonetic" id="fc-phonetic"></div><div class="fc-tap-hint">點擊翻面</div></div>
      <div class="fc-back" id="fc-back" style="display:none;"><div class="fc-word" id="fc-word-back"></div><div class="fc-pos" id="fc-pos"></div><div class="fc-translation" id="fc-translation"></div><div class="fc-example" id="fc-example"></div></div>`;
    _showCard();
  });
}

// Flashcard event listeners
document.getElementById('flashcard').addEventListener('click', () => {
  if (fcFlipped) return;
  fcFlipped = true;
  document.querySelector('.fc-front').style.display   = 'none';
  document.getElementById('fc-back').style.display    = 'block';
  document.getElementById('fc-btn-row').style.display = 'flex';
});
document.getElementById('fc-wrong').addEventListener('click', () => { fcWrong.push(fcQueue[fcIndex]); fcIndex++; fcFlipped = false; _showCard(); });
document.getElementById('fc-right').addEventListener('click', () => { fcIndex++; fcFlipped = false; _showCard(); });
document.getElementById('review-btn').addEventListener('click', startReview);
document.getElementById('fc-close').addEventListener('click', () => {
  document.getElementById('flashcard-overlay').style.display = 'none';
});

// ── Export / Import ──
document.getElementById('export-btn').addEventListener('click', () => {
  const data = { version: 1, exportedAt: new Date().toISOString(), library: state.library, vocab: state.vocab };
  const blob  = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = Object.assign(document.createElement('a'), {
    href:     url,
    download: 'wordlens-backup-' + new Date().toLocaleDateString('zh-TW').replace(/\//g, '-') + '.json',
  });
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.library && !data.vocab) throw new Error('格式錯誤');
      let added = 0;
      if (data.library) {
        data.library.forEach(w => {
          if (!state.library.some(v => v.en.toLowerCase() === w.en.toLowerCase())) {
            state.library.push(w);
            added++;
          }
        });
        persist.library();
      }
      if (data.vocab) {
        data.vocab.forEach(w => {
          if (!state.vocab.some(v => v.en.toLowerCase() === w.en.toLowerCase())) state.vocab.push(w);
        });
        persist.vocab();
      }
      renderLibrary();
      alert(`✅ 匯入成功！新增了 ${added} 個單字`);
    } catch { alert('❌ 檔案格式錯誤，請選擇正確的備份檔'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});
