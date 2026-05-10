import { state } from './state.js';
import { NEWS_ICONS } from './constants.js';
import { callGemini } from './api.js';
import { renderArticle } from './article.js';
import { updateKeyUI } from './explore.js';

// ── Guardian key UI ──
export function initGuardianKeyUI() {
  _renderGuardianKeyUI();
  document.getElementById('guardian-key-save')?.addEventListener('click', () => {
    const val = document.getElementById('guardian-key-input')?.value.trim();
    if (!val) return;
    state.guardianKey = val;
    localStorage.setItem('wordlens-guardian-key', val);
    _renderGuardianKeyUI();
  });
}

function _renderGuardianKeyUI() {
  const row    = document.getElementById('guardian-key-row');
  const status = document.getElementById('guardian-key-status');
  if (!row || !status) return;
  if (state.guardianKey) {
    row.style.display = 'none';
    status.innerHTML  = '<span style="color:rgba(255,255,255,0.5);font-size:0.78rem;">✓ Guardian Key 已儲存 <span id="clear-guardian-key" style="cursor:pointer;text-decoration:underline;">清除</span></span>';
    document.getElementById('clear-guardian-key')?.addEventListener('click', () => {
      state.guardianKey = '';
      localStorage.removeItem('wordlens-guardian-key');
      row.style.display  = 'flex';
      status.innerHTML   = '<span style="color:rgba(255,255,255,0.45);font-size:0.75rem;">👉 免費申請 <a href="https://open-platform.theguardian.com/access/" target="_blank" style="color:#fbb36a;">Guardian API Key</a></span>';
    });
  } else {
    row.style.display = 'flex';
    status.innerHTML  = '<span style="color:rgba(255,255,255,0.45);font-size:0.75rem;">👉 免費申請 <a href="https://open-platform.theguardian.com/access/" target="_blank" style="color:#fbb36a;">Guardian API Key</a>（可選）</span>';
  }
}

// ── Init filter & source toggle ──
export function initNewsFilters() {
  document.querySelectorAll('.nsrc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nsrc-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeNewsSource = btn.dataset.src;
    });
  });

  document.querySelectorAll('#rss-source-filter .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#rss-source-filter .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeNewsTopic   = btn.dataset.topic;
      state.activeGeminiTopic = btn.dataset.geminiTopic || btn.dataset.topic;
      const cacheKey = `${state.activeNewsSource}_${state.activeNewsTopic}`;
      if (state.newsCache[cacheKey]) renderNewsItems(state.newsCache[cacheKey]);
    });
  });

  document.getElementById('rss-refresh-btn').addEventListener('click', loadNews);
  document.getElementById('rss-articles').innerHTML =
    '<div class="rss-loading">點「↺ 載入」取得 The Guardian 最新新聞</div>';
}

// ── Load dispatcher ──
export async function loadNews() {
  const cacheKey = `${state.activeNewsSource}_${state.activeNewsTopic}`;
  delete state.newsCache[cacheKey];
  if (state.activeNewsSource === 'guardian') {
    await _loadGuardianNews();
  } else {
    await _generateAINews();
  }
}

// ── Guardian API ──
async function _loadGuardianNews() {
  if (!state.guardianKey) {
    document.getElementById('rss-articles').innerHTML =
      '<div class="rss-loading">請先在上方輸入並儲存 Guardian API Key<br><span style="font-size:0.75rem;"><a href="https://open-platform.theguardian.com/access/" target="_blank" style="color:var(--accent);">免費申請 →</a></span></div>';
    _stopRefreshSpinner();
    return;
  }
  _startRefreshSpinner('從 The Guardian 載入新聞...');

  const urls = [
    `https://content.guardianapis.com/search?api-key=${state.guardianKey}&section=${state.activeNewsTopic}&show-fields=trailText,body&page-size=6&order-by=newest&format=json`,
    `https://content.guardianapis.com/search?api-key=${state.guardianKey}&section=${state.activeNewsTopic}&show-fields=trailText&page-size=6&order-by=newest&format=json`,
  ];

  let lastError = '';
  for (const url of urls) {
    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          document.getElementById('rss-articles').innerHTML = '<div class="rss-loading">❌ API Key 無效<br><span style="font-size:0.75rem;">請確認 Key 正確，並已收到 Guardian 的確認信</span></div>';
          _stopRefreshSpinner(); return;
        }
        lastError = data.message || `HTTP ${res.status}`; continue;
      }
      const results = data.response?.results || [];
      if (!results.length) { lastError = '沒有文章'; continue; }
      const items = results.map(r => ({
        id:       'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        title:    r.webTitle || '',
        titleZh:  '',
        trailText:(r.fields?.trailText || '').replace(/<[^>]+>/g, '').trim(),
        bodyText: (r.fields?.body      || '').replace(/<[^>]+>/g, '').trim(),
        url:      r.webUrl || '',
        date:    (r.webPublicationDate || '').slice(0, 10),
        topic:   state.activeNewsTopic,
        icon:    NEWS_ICONS[state.activeNewsTopic] || '📰',
        source:  'The Guardian',
        isReal:  true,
      }));
      state.newsCache[`guardian_${state.activeNewsTopic}`] = items;
      renderNewsItems(items);
      _stopRefreshSpinner(); return;
    } catch(e) { lastError = e.message; }
  }
  document.getElementById('rss-articles').innerHTML = `<div class="rss-loading">載入失敗：${lastError}</div>`;
  _stopRefreshSpinner();
}

// ── Gemini AI News ──
async function _generateAINews() {
  if (!state.anthropicKey) {
    document.getElementById('rss-articles').innerHTML = '<div class="rss-loading">請先設定 Gemini API Key</div>';
    return;
  }
  _startRefreshSpinner('AI 正在搜尋並撰寫今日新聞...');
  const prompt = `Search for 4 recent real news stories about ${state.activeGeminiTopic} today. For each story, rewrite as a B1 CEFR English learning article (200-250 words). Return ONLY JSON array: [{"title":"headline","titleZh":"中文標題","source":"source name","trailText":"1 sentence summary","bodyText":"full article 200-250 words"}]`;
  try {
    const data   = await callGemini(prompt, { maxTokens: 2000, temperature: 0.4, model: 'gemini-2.0-flash', tools: [{ google_search: {} }] });
    const rawText = data.candidates[0].content.parts.filter(p => p.text).map(p => p.text).join('');
    const match   = rawText.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('格式錯誤');
    const arts  = JSON.parse(match[0]);
    const items = arts.map((a, i) => ({
      ...a,
      id:     `ai_${Date.now()}_${i}`,
      topic:  state.activeNewsTopic,
      icon:   NEWS_ICONS[state.activeNewsTopic] || '📰',
      date:   new Date().toLocaleDateString('zh-TW'),
      isReal: true,
    }));
    state.newsCache[`gemini_${state.activeNewsTopic}`] = items;
    renderNewsItems(items);
  } catch(e) {
    document.getElementById('rss-articles').innerHTML = `<div class="rss-loading">生成失敗：${e.message}</div>`;
  }
  _stopRefreshSpinner();
}

// ── Render list ──
export function renderNewsItems(items) {
  const el = document.getElementById('rss-articles');
  if (!items.length) { el.innerHTML = '<div class="rss-loading">沒有文章</div>'; return; }
  el.innerHTML = items.map((item, i) => `
    <div class="rss-card" data-index="${i}" data-cache="${state.activeNewsSource}_${state.activeNewsTopic}">
      <div class="rss-icon" style="background:linear-gradient(135deg,#1a237e,#1565c0);">${item.icon}</div>
      <div style="flex:1;min-width:0;">
        <span class="art-style-badge badge-news">${item.source || 'News'}</span>
        <div class="rss-title">${item.title}</div>
        ${item.trailText ? `<div class="art-preview">${item.trailText.slice(0,100)}...</div>` : ''}
        <div class="rss-meta">${item.date}${item.isReal ? ' · 🌐 真實新聞' : ''}</div>
      </div>
    </div>`).join('');

  el.querySelectorAll('.rss-card').forEach(card => {
    card.addEventListener('click', () => {
      const cacheKey = card.dataset.cache;
      const allItems = state.newsCache[cacheKey] || [];
      const item     = allItems[parseInt(card.dataset.index)];
      if (item) _openNewsArticle(item);
    });
  });
}

async function _openNewsArticle(item) {
  const rawText = (item.bodyText || item.trailText || '').trim();
  if (rawText.length > 200) {
    renderArticle(rawText);
    import('./tabs.js').then(({ switchTab }) => {
      switchTab('read');
      document.getElementById('word-count').textContent = `${item.source || 'News'}　${item.date}`;
    });
    return;
  }
  import('./tabs.js').then(({ switchTab }) => switchTab('read'));
  document.getElementById('article-body').innerHTML =
    '<div class="translation-loading" style="padding:40px 0;">正在根據新聞標題生成完整文章...</div>';

  if (!state.anthropicKey) {
    renderArticle(rawText || item.title);
    document.getElementById('word-count').textContent = `${item.source || 'News'}　${item.date}`;
    return;
  }
  try {
    const parts = [
      'You are an English learning article writer.',
      'Based on this real news headline, write a complete B1 CEFR English learning article (250-300 words).',
      'Make it factual, clear, and educational.',
      `Headline: ${item.title}`,
      item.trailText ? `Context: ${item.trailText}` : '',
    ].filter(Boolean).join(' ');
    const data = await callGemini(parts, { maxTokens: 600, temperature: 0.5 });
    renderArticle(data.candidates[0].content.parts[0].text.trim());
  } catch {
    renderArticle(rawText || item.title);
  }
  document.getElementById('word-count').textContent = `${item.source || 'News'}　${item.date}`;
}

// ── Spinner helpers ──
function _startRefreshSpinner(loadingMsg) {
  const btn = document.getElementById('rss-refresh-btn');
  btn.classList.add('spinning');
  btn.textContent = '載入中...';
  document.getElementById('rss-articles').innerHTML = `<div class="rss-loading">${loadingMsg}</div>`;
}
function _stopRefreshSpinner() {
  const btn = document.getElementById('rss-refresh-btn');
  btn.classList.remove('spinning');
  btn.textContent = '↺ 載入';
}
