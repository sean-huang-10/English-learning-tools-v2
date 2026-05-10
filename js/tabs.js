import { renderVocab }      from './vocab.js';
import { renderLibrary }    from './library.js';
import { renderExplore, renderDailyArticles } from './explore.js';
import { renderChatHome }   from './chat.js';
import { updateProgress }   from './article.js';
import { stopReadAloud }    from './speech.js';

const tabs       = document.querySelectorAll('.tab-btn');
const progressBar= document.getElementById('reading-progress-bar');

const VIEWS = {
  explore: document.getElementById('explore-view'),
  read:    document.getElementById('read-view'),
  vocab:   document.getElementById('vocab-view'),
  library: document.getElementById('library-view'),
  chat:    document.getElementById('chat-view'),
};

export function switchTab(tab) {
  tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

  Object.entries(VIEWS).forEach(([k, v]) => {
    const showing = k === tab;
    v.style.display = showing ? 'flex' : 'none';
    if (showing) {
      v.classList.remove('view-enter');
      void v.offsetWidth; // force reflow for animation restart
      v.classList.add('view-enter');
    }
  });

  progressBar.style.display = tab === 'read' ? 'block' : 'none';

  if (tab === 'vocab')   renderVocab();
  if (tab === 'explore') { renderExplore(); renderDailyArticles(); }
  if (tab === 'library') renderLibrary();
  if (tab === 'chat')    renderChatHome();
  if (tab === 'read')    updateProgress();
}

// ── Wire up tab clicks ──
tabs.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

// ── Back button (read → explore) ──
document.getElementById('back-btn').addEventListener('click', () => {
  stopReadAloud();
  switchTab('explore');
});
