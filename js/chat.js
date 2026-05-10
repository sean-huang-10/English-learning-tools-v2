import { state } from './state.js';
import { SCENARIOS, LEVEL_PROMPTS } from './constants.js';
import { translate, callGemini } from './api.js';
import { speak } from './speech.js';

// ── Phase management ──
export function renderChatHome() {
  const home = document.getElementById('chat-home');
  home.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
  document.getElementById('chat-screen').style.display   = 'none';
  document.getElementById('chat-feedback').style.display = 'none';
  state.chatPhase = 'select';

  home.innerHTML = `
    <div style="font-family:Noto Sans TC,sans-serif;font-size:0.8rem;color:var(--ink-muted);letter-spacing:0.05em;text-transform:uppercase;">選擇練習模式</div>
    ${[
      { mode:'roleplay', icon:'🎭', title:'角色情境對話',   desc:'AI扮演咖啡師、面試官等角色，在真實情境中練習對話' },
      { mode:'free',     icon:'💬', title:'自由對話練習',   desc:'選擇主題自由聊天，AI會配合你的程度調整，自然練習' },
      { mode:'task',     icon:'🎯', title:'任務達成挑戰',   desc:'有明確目標要完成（如訂飯店），對話結束評估是否成功' },
    ].map(m => `
      <div class="mode-card" data-mode="${m.mode}">
        <div class="mode-icon">${m.icon}</div>
        <div>
          <div class="mode-title">${m.title}</div>
          <div class="mode-desc">${m.desc}</div>
        </div>
      </div>`).join('')}`;

  home.querySelectorAll('.mode-card').forEach(card =>
    card.addEventListener('click', () => _showScenarioSelect(card.dataset.mode))
  );
}

function _showScenarioSelect(mode) {
  state.chatMode  = mode;
  const home      = document.getElementById('chat-home');
  const list      = SCENARIOS[mode];
  const modeLabel = { roleplay:'角色情境對話', free:'自由對話練習', task:'任務達成挑戰' }[mode];

  home.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:2px;">
      <button id="back-to-modes" style="background:transparent;border:1.5px solid var(--border);border-radius:8px;padding:5px 12px;font-family:Noto Sans TC,sans-serif;font-size:0.8rem;color:var(--ink-muted);cursor:pointer;">← 返回</button>
      <div style="font-family:Noto Sans TC,sans-serif;font-size:0.88rem;color:var(--ink);">${modeLabel}</div>
    </div>
    <div style="font-family:Noto Sans TC,sans-serif;font-size:0.8rem;color:var(--ink-muted);">選擇難度</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      ${['A1','A2','B1','B2','C1'].map(l =>
        `<button class="filter-btn level-select-btn${l==='B1'?' active':''}" data-level="${l}">${l}</button>`
      ).join('')}
    </div>
    <div style="font-family:Noto Sans TC,sans-serif;font-size:0.8rem;color:var(--ink-muted);">選擇${mode==='task'?'任務':'情境'}</div>
    <div class="scenario-grid">
      ${list.map(s => `
        <div class="scenario-pill" data-scenario='${JSON.stringify(s)}'>
          <span style="font-size:1.4rem;">${s.emoji}</span>
          <div>
            <div style="font-weight:600;">${s.title}</div>
            <div style="font-size:0.78rem;color:var(--ink-muted);">${s.en}</div>
          </div>
        </div>`).join('')}
    </div>`;

  document.getElementById('back-to-modes').addEventListener('click', renderChatHome);
  home.querySelectorAll('.level-select-btn').forEach(b => {
    b.addEventListener('click', () => {
      home.querySelectorAll('.level-select-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
  });
  home.querySelectorAll('.scenario-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const level    = home.querySelector('.level-select-btn.active')?.dataset.level || 'B1';
      const scenario = JSON.parse(pill.dataset.scenario);
      _startChat(mode, scenario, level);
    });
  });
}

// ── Start chat session ──
async function _startChat(mode, scenario, level) {
  state.chatScenario        = { mode, scenario, level };
  state.chatHistory         = [];
  state.showTranslations    = false;
  state.chatTranslationCache= {};

  document.getElementById('chat-home').style.display     = 'none';
  document.getElementById('chat-feedback').style.display = 'none';
  const screen = document.getElementById('chat-screen');
  screen.style.cssText = 'display:flex;flex-direction:column;flex:1;';
  document.getElementById('chat-messages').innerHTML = '';
  document.getElementById('chat-scenario-label').textContent = `${scenario.emoji} ${scenario.title}　${level}`;
  document.getElementById('translate-toggle-btn').classList.remove('active');

  const systemPrompt = _buildSystemPrompt(mode, scenario, level);
  state.chatHistory.push({ role:'user', parts:[{ text:'__START__' }] });
  await _sendToAI(systemPrompt, true);
}

function _buildSystemPrompt(mode, scenario, level) {
  const lvl = LEVEL_PROMPTS[level];
  if (mode === 'roleplay') return `You are a ${scenario.role} in a ${scenario.en} scenario. ${lvl} Keep responses to 2-3 sentences. Stay in character. If the user makes grammar mistakes, naturally model the correct form. Start by setting the scene and greeting the user.`;
  if (mode === 'free')     return `You are a friendly English conversation partner discussing ${scenario.en}. ${lvl} Keep responses conversational, 2-4 sentences. Ask follow-up questions. If the user makes notable grammar mistakes, gently correct by modeling the correct form. Start with a warm greeting and an interesting opening question.`;
  return `You are playing a role where the user must: "${scenario.goal}". ${lvl} Respond naturally but require the user to provide all necessary information. Don't make it too easy. Keep responses to 2-3 sentences. Start by setting the scene.`;
}

// ── AI response ──
async function _sendToAI(systemPrompt, isFirst) {
  if (!state.anthropicKey) {
    _addMessage('ai', '⚠️ 請先在探索頁面設定 Gemini API Key 才能使用對話功能。');
    return;
  }
  const typingId = _showTyping();
  try {
    const messages = isFirst
      ? [{ role:'user', parts:[{ text: systemPrompt + '\n\nStart the conversation now.' }] }]
      : [{ role:'user', parts:[{ text: systemPrompt }] }, ...state.chatHistory];

    const data  = await callGemini(
      '', // unused when we pass messages directly below via raw fetch
      { maxTokens: 200, temperature: 0.85 }
    );
    // callGemini wraps single-turn; for multi-turn we need raw fetch
    throw new Error('USE_RAW'); // sentinel — fallthrough to raw
  } catch(e) {
    if (e.message !== 'USE_RAW') {
      _removeTyping(typingId);
      _addMessage('ai', '⚠️ 連線錯誤：' + e.message);
      return;
    }
  }

  // Raw multi-turn Gemini call
  try {
    const messages = isFirst
      ? [{ role:'user', parts:[{ text: systemPrompt + '\n\nStart the conversation now.' }] }]
      : [{ role:'user', parts:[{ text: systemPrompt }] }, ...state.chatHistory];

    const res  = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`, {
      method: 'POST',
      headers:{ 'Content-Type':'application/json', 'x-goog-api-key': state.anthropicKey },
      body:   JSON.stringify({ contents: messages, generationConfig:{ temperature:0.85, maxOutputTokens:200 } }),
    });
    const data  = await res.json();
    _removeTyping(typingId);
    if (data.error) throw new Error(data.error.message);
    const reply = data.candidates[0].content.parts[0].text.trim();
    state.chatHistory.push({ role:'model', parts:[{ text: reply }] });
    _addMessage('ai', reply);
  } catch(e) {
    _removeTyping(typingId);
    _addMessage('ai', '⚠️ 連線錯誤：' + e.message);
  }
}

function _addMessage(role, text) {
  const msgs   = document.getElementById('chat-messages');
  const wrap   = document.createElement('div');
  wrap.className = 'msg-wrap ' + role;
  const bubble = document.createElement('div');
  bubble.className   = 'msg-bubble';
  bubble.textContent = text;
  wrap.appendChild(bubble);

  if (role === 'ai') {
    const tranEl = document.createElement('div');
    tranEl.className    = 'msg-translation' + (state.showTranslations ? ' visible' : '');
    tranEl.dataset.text = text;
    if (state.showTranslations) {
      if (state.chatTranslationCache[text]) {
        tranEl.textContent = state.chatTranslationCache[text];
      } else {
        tranEl.textContent = '翻譯中...';
        translate(text).then(t => { state.chatTranslationCache[text] = t; tranEl.textContent = t; });
      }
    }
    wrap.appendChild(tranEl);
    // Voice mode auto-speak
    if (state.voiceModeOn) _speakAIMessage(text);
  }
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
}

function _showTyping() {
  const msgs = document.getElementById('chat-messages');
  const id   = 'typing_' + Date.now();
  const div  = document.createElement('div');
  div.id = id; div.className = 'msg-wrap ai';
  div.innerHTML = '<div class="typing-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}
function _removeTyping(id) { document.getElementById(id)?.remove(); }

function _sendUserMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  _addMessage('user', text);
  state.chatHistory.push({ role:'user', parts:[{ text }] });
  const sys = _buildSystemPrompt(state.chatScenario.mode, state.chatScenario.scenario, state.chatScenario.level);
  _sendToAI(sys, false);
}

// ── Voice mode ──
function _speakAIMessage(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang  = 'en-US';
  utter.rate  = state.speechRate;
  state.isSpeakingAI = true;
  utter.onend = () => {
    state.isSpeakingAI = false;
    if (state.voiceModeOn) setTimeout(() => { if (state.voiceModeOn && !state.isRecording) _startRecording(); }, 600);
  };
  utter.onerror = () => { state.isSpeakingAI = false; };
  setTimeout(() => window.speechSynthesis.speak(utter), 100);
}

function _toggleVoiceMode() {
  state.voiceModeOn = !state.voiceModeOn;
  const btn   = document.getElementById('voice-mode-btn');
  const mic   = document.getElementById('mic-btn');
  const input = document.getElementById('chat-input');
  if (state.voiceModeOn) {
    btn.classList.add('voice-on'); btn.textContent = '🎤 ON';
    mic.style.display      = 'flex';
    input.placeholder      = '點麥克風說話，或打字...';
  } else {
    btn.classList.remove('voice-on'); btn.textContent = '🎤 語音';
    mic.style.display      = 'none';
    input.placeholder      = 'Type your message in English...';
    _stopRecording();
    window.speechSynthesis?.cancel();
  }
}

function _startRecording() {
  if (state.isRecording) { _stopRecording(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('你的瀏覽器不支援語音輸入，請使用 Safari'); return; }
  window.speechSynthesis?.cancel();
  state.recognition = new SR();
  state.recognition.lang            = 'en-US';
  state.recognition.continuous      = false;
  state.recognition.interimResults  = true;
  const mic   = document.getElementById('mic-btn');
  const input = document.getElementById('chat-input');
  state.isRecording = true;
  mic.classList.add('recording'); mic.textContent = '⏹';
  input.placeholder = '說話中...'; input.value = '';
  state.recognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    input.value = transcript;
    if (e.results[e.results.length - 1].isFinal) { _stopRecording(); if (transcript.trim()) _sendUserMessage(); }
  };
  state.recognition.onerror = () => _stopRecording();
  state.recognition.onend   = () => _stopRecording();
  state.recognition.start();
}

function _stopRecording() {
  if (!state.isRecording) return;
  state.isRecording = false;
  state.recognition?.stop();
  const mic = document.getElementById('mic-btn');
  if (mic) { mic.classList.remove('recording'); mic.textContent = '🎤'; }
  const input = document.getElementById('chat-input');
  if (input) input.placeholder = state.voiceModeOn ? '點麥克風說話，或打字...' : 'Type your message in English...';
}

// ── End chat → feedback ──
async function _endChat() {
  if (state.chatHistory.length < 3) { alert('對話太短，請多聊幾句再結束'); return; }
  document.getElementById('chat-screen').style.display   = 'none';
  const feedback = document.getElementById('chat-feedback');
  feedback.style.cssText = 'display:flex;flex-direction:column;gap:14px;';
  document.getElementById('feedback-body').innerHTML = '<div class="translation-loading">正在分析對話，請稍候...</div>';
  _stopRecording();
  window.speechSynthesis?.cancel();
  state.voiceModeOn = false;
  document.getElementById('voice-mode-btn').classList.remove('voice-on');
  document.getElementById('voice-mode-btn').textContent = '🎤 語音';

  try {
    const convo = state.chatHistory
      .filter(m => m.parts[0].text !== '__START__')
      .map(m => (m.role === 'user' ? 'User: ' : 'AI: ') + m.parts[0].text)
      .join('\n');
    const prompt = `Analyse this English conversation and respond ONLY in valid JSON with this structure:
{"score": 75, "scoreLabel": "不錯", "corrections": [{"wrong": "I am go", "right": "I am going", "tip": "使用現在進行式"}], "vocab": ["suggestion 1", "suggestion 2"], "summary": "整體評語（繁體中文）"}
Conversation:\n${convo}`;
    const data = await callGemini(prompt, { maxTokens: 600, temperature: 0.3 });
    const raw  = data.candidates[0].content.parts[0].text.replace(/```json|```/g,'').trim();
    _renderFeedback(JSON.parse(raw));
  } catch(e) {
    document.getElementById('feedback-body').innerHTML = `<div class="translation-loading">分析失敗：${e.message}</div>`;
  }
}

function _renderFeedback(fb) {
  const corrections = (fb.corrections || []).map(c => `
    <div class="feedback-item">
      <span class="wrong">✗ ${c.wrong}</span> → <span class="right">✓ ${c.right}</span>
      <div style="font-size:0.8rem;color:var(--ink-muted);margin-top:2px;">${c.tip}</div>
    </div>`).join('') || '<div class="feedback-item">沒有發現明顯錯誤 🎉</div>';
  const vocab = (fb.vocab || []).map(v => `<div class="feedback-item">💡 ${v}</div>`).join('');
  document.getElementById('feedback-body').innerHTML = `
    <div class="feedback-score">
      <div class="feedback-score-num">${fb.score || '--'}</div>
      <div class="feedback-score-label">${fb.scoreLabel || '分'}</div>
    </div>
    <div class="feedback-section">
      <div class="feedback-section-title">整體評語</div>
      <div style="font-family:Noto Sans TC,sans-serif;font-size:0.9rem;line-height:1.7;color:var(--ink);">${fb.summary || ''}</div>
    </div>
    ${fb.corrections?.length ? `<div class="feedback-section"><div class="feedback-section-title">語法修正</div>${corrections}</div>` : ''}
    ${fb.vocab?.length       ? `<div class="feedback-section"><div class="feedback-section-title">單字建議</div>${vocab}</div>` : ''}`;
}

// ── Event listeners ──
export function initChat() {
  document.getElementById('chat-send-btn').addEventListener('click', _sendUserMessage);
  document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendUserMessage(); }
  });
  document.getElementById('chat-input').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });
  document.getElementById('translate-toggle-btn').addEventListener('click', async () => {
    state.showTranslations = !state.showTranslations;
    document.getElementById('translate-toggle-btn').classList.toggle('active', state.showTranslations);
    document.querySelectorAll('.msg-translation').forEach(async el => {
      el.classList.toggle('visible', state.showTranslations);
      if (state.showTranslations && !el.textContent) {
        const t = el.dataset.text;
        if (!state.chatTranslationCache[t]) {
          el.textContent = '翻譯中...';
          const result = await translate(t);
          state.chatTranslationCache[t] = result;
          el.textContent = result;
        } else {
          el.textContent = state.chatTranslationCache[t];
        }
      }
    });
  });
  document.getElementById('end-chat-btn').addEventListener('click', _endChat);
  document.getElementById('new-chat-btn').addEventListener('click', () => {
    document.getElementById('chat-feedback').style.display = 'none';
    renderChatHome();
  });
  document.getElementById('voice-mode-btn').addEventListener('click', _toggleVoiceMode);
  document.getElementById('mic-btn').addEventListener('click', _startRecording);
}
