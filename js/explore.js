import { state, persist } from './state.js';
import { SEED_ARTICLES, TOPIC_COLORS, LEVEL_COLORS, NEWS_PROMPTS } from './constants.js';
import { callGemini } from './api.js';
import { renderArticle } from './article.js';

// Build full article list from seeds + stored
export function getAllArticles() {
  return [...SEED_ARTICLES, ...state.storedArticles];
}

// ── Render article card list ──
export function renderExplore() {
  const list = document.getElementById('article-list');
  let filtered = getAllArticles().filter(a =>
    (state.activeLevel === 'all' || a.level === state.activeLevel) &&
    (state.activeTopic === 'all' || a.topic === state.activeTopic)
  ).sort((a, b) => b.date - a.date);

  if (!filtered.length) {
    list.innerHTML = '<div class="vocab-empty">沒有符合條件的文章<br>試試用AI生成一篇 ✨</div>';
    return;
  }

  list.innerHTML = filtered.map(art => {
    const [bg,,emoji]  = TOPIC_COLORS[art.topic] || ['#f3f4f6','#374151','📄'];
    const preview      = art.content.slice(0, 100) + '...';
    const badgeCls     = art.style === 'news' ? 'badge-news' : art.style === 'magazine' ? 'badge-magazine' : '';
    const badgeLabel   = art.style === 'news' ? '新聞' : art.style === 'magazine' ? '雜誌' : '';
    const dateStr      = art.date ? new Date(art.date).toLocaleDateString('zh-TW',{month:'short',day:'numeric'}) : '';
    return `<div class="art-card" data-id="${art.id}">
      <div class="art-cover" style="background:${bg};">
        ${emoji}
        <div class="art-level-badge" style="background:${LEVEL_COLORS[art.level]||'#ccc'};color:#1a1a1a;">${art.level}</div>
      </div>
      <div class="art-body">
        ${badgeCls ? `<span class="art-style-badge ${badgeCls}">${badgeLabel}</span>` : ''}
        <div class="art-title-zh">${art.titleZh}</div>
        <div class="art-preview">${preview}</div>
        ${dateStr ? `<div class="art-date">${dateStr}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.art-card').forEach(card => {
    card.addEventListener('click', () => {
      const art = getAllArticles().find(a => a.id === card.dataset.id);
      if (art) loadArticle(art);
    });
  });
}

export function loadArticle(art) {
  renderArticle(art.content);
  import('./tabs.js').then(({ switchTab }) => {
    switchTab('read');
    document.getElementById('word-count').textContent += `　${art.level}`;
  });
}

// ── Level & topic filter buttons ──
export function initExploreFilters() {
  document.querySelectorAll('#level-filter .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#level-filter .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeLevel = btn.dataset.level;
      renderExplore();
    });
  });
  document.querySelectorAll('#topic-filter .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#topic-filter .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeTopic = btn.dataset.topic;
      renderExplore();
    });
  });
}

// ── AI Article Generator ──
export function initGenerate() {
  updateKeyUI();
  document.getElementById('api-key-save').addEventListener('click', () => {
    const val = document.getElementById('api-key-input').value.trim();
    if (!val.startsWith('AIza')) { alert('請輸入正確的 Gemini API Key（以 AIza 開頭）'); return; }
    state.anthropicKey = val;
    localStorage.setItem('wordlens-gemini-key', val);
    updateKeyUI();
  });
  document.getElementById('api-key-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('api-key-save').click();
  });

  document.getElementById('gen-btn').addEventListener('click', _generateArticle);

  // Paste custom article
  document.getElementById('start-btn').addEventListener('click', () => {
    const text = document.getElementById('article-input').value.trim();
    if (!text) { alert('請先貼上文章！'); return; }
    renderArticle(text);
    import('./tabs.js').then(({ switchTab }) => switchTab('read'));
  });
}

export function updateKeyUI() {
  const row    = document.getElementById('api-key-row');
  const status = document.getElementById('api-key-status');
  if (state.anthropicKey) {
    row.style.display = 'none';
    status.innerHTML  = '<span style="color:rgba(255,255,255,0.5);font-size:0.78rem;">✓ API Key 已儲存 <span id="clear-key" style="cursor:pointer;text-decoration:underline;">清除</span></span>';
    document.getElementById('clear-key')?.addEventListener('click', () => {
      state.anthropicKey = '';
      localStorage.removeItem('wordlens-gemini-key');
      row.style.display  = 'flex';
      status.innerHTML   = '';
    });
  } else {
    row.style.display = 'flex';
    status.innerHTML  = '<span style="color:rgba(255,255,255,0.45);font-size:0.75rem;">👉 在 <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#fbb36a;">aistudio.google.com</a> 申請免費 Key</span>';
  }
}

async function _generateArticle() {
  const level = document.getElementById('gen-level').value;
  const topic = document.getElementById('gen-topic').value;
  const icon  = document.getElementById('gen-icon');
  const label = document.getElementById('gen-label');
  const btn   = document.getElementById('gen-btn');
  icon.textContent  = '⏳';
  label.textContent = '生成中...';
  btn.disabled      = true;

  const levelDesc = {
    A1:'very simple sentences, A1 CEFR level, under 150 words',
    A2:'simple sentences, A2 CEFR, 150-200 words',
    B1:'intermediate level, B1 CEFR, 200-280 words',
    B2:'upper-intermediate, B2 CEFR, 300-380 words',
    C1:'advanced, C1 CEFR, complex sentences, 380-450 words',
  };

  try {
    if (!state.anthropicKey) { alert('請先輸入 Gemini API Key'); return; }
    const prompt = `Write an English graded reading article about "${topic}" at ${levelDesc[level]}. Return ONLY valid JSON with these exact fields: {"title": "English title", "titleZh": "中文標題", "content": "article text here"}. No markdown, no backticks, just raw JSON.`;
    const data   = await callGemini(prompt, { maxTokens: 1000, temperature: 0.8 });
    const text   = data.candidates[0].content.parts[0].text.replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(text);
    const newArt = { id: 'gen_' + Date.now(), level, topic, ...parsed, date: Date.now() };
    state.storedArticles.unshift(newArt);
    persist.articles();
    state.activeLevel = level;
    state.activeTopic = topic;
    document.querySelectorAll('#level-filter .filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.level === level || (level !== 'all' && b.dataset.level === 'all'));
    });
    renderExplore();
  } catch(e) {
    alert('生成失敗：' + e.message);
  } finally {
    icon.textContent  = '✨';
    label.textContent = '生成文章';
    btn.disabled      = false;
  }
}

// ── Daily Articles ──
const TODAY = new Date().toISOString().slice(0, 10);

export function renderDailyArticles() {
  const el = document.getElementById('daily-articles');
  if (!state.dailyCache || state.dailyCache.date !== TODAY || !state.dailyCache.articles?.length) {
    el.innerHTML = '<div class="vocab-empty" style="padding:20px 0 4px;">今天還沒有精選文章<br><span style="font-size:0.8rem;">設定 Gemini Key 後按「↺ 更新」生成</span></div>';
    return;
  }
  el.innerHTML = state.dailyCache.articles.map(art => {
    const [bg,,emoji] = TOPIC_COLORS[art.topic] || ['#f3f4f6','#374151','📄'];
    const badgeCls    = art.style === 'news' ? 'badge-news' : art.style === 'magazine' ? 'badge-magazine' : 'badge-article';
    const badgeLabel  = art.style === 'news' ? '新聞' : art.style === 'magazine' ? '雜誌' : '文章';
    return `<div class="art-card" data-id="${art.id}">
      <div class="art-cover" style="background:${bg};">${emoji}
        <div class="art-level-badge" style="background:${LEVEL_COLORS[art.level]||'#ccc'};color:#1a1a1a;">${art.level}</div>
      </div>
      <div class="art-body">
        <span class="art-style-badge ${badgeCls}">${badgeLabel}</span>
        <div class="art-title-zh">${art.titleZh}</div>
        <div class="art-preview">${art.content.slice(0,100)}...</div>
        <div class="art-date">今日精選</div>
      </div>
    </div>`;
  }).join('');
  el.querySelectorAll('.art-card').forEach(card => {
    card.addEventListener('click', () => {
      const art = state.dailyCache.articles.find(a => a.id === card.dataset.id);
      if (art) loadArticle(art);
    });
  });
}

export function initDailyRefresh() {
  document.getElementById('daily-refresh-btn').addEventListener('click', async () => {
    if (!state.anthropicKey) { alert('請先設定 Gemini API Key'); return; }
    const btn = document.getElementById('daily-refresh-btn');
    btn.classList.add('spinning');
    btn.textContent = '生成中...';
    document.getElementById('daily-articles').innerHTML = '<div class="translation-loading">正在生成今日精選文章...</div>';

    try {
      const level = 'B1';
      const picks = [...NEWS_PROMPTS].sort(() => Math.random() - 0.5).slice(0, 3);
      const articles = [];
      for (const p of picks) {
        const art = await _generateDailyArticle(p, level);
        articles.push({ ...art, id:'daily_'+Date.now()+'_'+Math.random().toString(36).slice(2), topic:p.topic, level, date:Date.now() });
        await new Promise(r => setTimeout(r, 300));
      }
      state.dailyCache = { date: TODAY, articles };
      persist.daily();
      // Also add to main library
      state.storedArticles = [...articles, ...state.storedArticles];
      persist.articles();
      renderDailyArticles();
    } catch(e) {
      document.getElementById('daily-articles').innerHTML = `<div class="translation-loading">生成失敗：${e.message}</div>`;
    } finally {
      btn.classList.remove('spinning');
      btn.textContent = '↺ 更新';
    }
  });
}

async function _generateDailyArticle(prompt, level) {
  const styleGuide = prompt.style === 'news'
    ? 'Write in AP news style: strong lead sentence with who/what/when/where, inverted pyramid structure, quote one expert, end with context.'
    : 'Write in magazine feature style: engaging opening anecdote, narrative flow, pull in the reader, end with a memorable takeaway.';
  const p = `Write a ${level} CEFR graded reading ${prompt.style} article about a ${prompt.titleHint}. ${styleGuide} Make it feel current and real. Return ONLY valid JSON: {"title":"English headline","titleZh":"中文標題","content":"article text","style":"${prompt.style}"}. No markdown.`;
  const data = await callGemini(p, { maxTokens: 700, temperature: 0.9 });
  return JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g,'').trim());
}
