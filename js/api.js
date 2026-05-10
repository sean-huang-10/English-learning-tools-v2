import { state } from './state.js';
import { POS_MAP } from './constants.js';

// ── Word Translation ──
export async function translate(word) {
  const key = word.toLowerCase();
  if (state.translationCache[key]) return state.translationCache[key];
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&q=${encodeURIComponent(word)}`;
    const res  = await fetch(url);
    const data = await res.json();
    const result = data?.[0]?.[0]?.[0] || '（翻譯失敗）';
    state.translationCache[key] = result;
    return result;
  } catch {
    try {
      const res2  = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh-TW`);
      const data2 = await res2.json();
      const result2 = data2?.responseData?.translatedText || '（翻譯失敗）';
      state.translationCache[key] = result2;
      return result2;
    } catch {
      return '❌ 請確認網路連線';
    }
  }
}

// ── Dictionary (dictionaryapi.dev) ──
export async function fetchDictionary(word) {
  const key = word.toLowerCase();
  if (state.dictCache[key] !== undefined) return state.dictCache[key];
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`);
    if (!res.ok) { state.dictCache[key] = null; return null; }
    const data  = await res.json();
    const entry = data[0];
    const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '';
    const result = { phonetic, meanings: [] };
    (entry.meanings || []).forEach(m => {
      const posKey = Object.keys(POS_MAP).find(k => m.partOfSpeech?.toLowerCase().includes(k));
      const [short, zh, cls] = posKey ? POS_MAP[posKey] : ['?','?','pos-other'];
      const def     = m.definitions?.[0];
      const example = def?.example || '';
      result.meanings.push({ pos: m.partOfSpeech, short, zh, cls, example });
    });
    state.dictCache[key] = result;
    return result;
  } catch {
    state.dictCache[key] = null;
    return null;
  }
}

// ── Gemini API helper ──
export async function callGemini(prompt, { maxTokens = 1000, temperature = 0.8, model = 'gemini-3.1-flash-lite', tools } = {}) {
  if (!state.anthropicKey) throw new Error('未設定 Gemini API Key');
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };
  if (tools) body.tools = tools;
  const res  = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': state.anthropicKey },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message + (data.error.code ? ` (code: ${data.error.code})` : ''));
  return data;
}

// ── Full-article translation ──
export async function translateFullArticle() {
  const text    = document.getElementById('article-body').innerText.trim();
  if (!text) return;

  const btn     = document.getElementById('translate-all-btn');
  const section = document.getElementById('translation-section');
  const body    = document.getElementById('translation-body');
  const icon    = document.getElementById('translate-all-icon');
  const label   = document.getElementById('translate-all-label');

  // Toggle if already cached
  if (state.fullTranslationCache[text]) {
    const visible = section.style.display !== 'none';
    section.style.display = visible ? 'none' : 'block';
    label.textContent = visible ? '顯示全文翻譯' : '隱藏全文翻譯';
    return;
  }

  icon.textContent  = '⏳';
  label.textContent = '翻譯中...';
  btn.disabled      = true;
  section.style.display = 'block';
  body.innerHTML    = '<div class="translation-loading">正在翻譯全文，請稍候...</div>';

  try {
    if (state.anthropicKey) {
      const data = await callGemini(
        `將以下英文文章翻譯成繁體中文，保持段落結構，只輸出翻譯結果，不要加任何說明：\n\n${text}`,
        { maxTokens: 1500 }
      );
      const translation = data.candidates[0].content.parts[0].text.trim();
      state.fullTranslationCache[text] = translation;
      body.textContent  = translation;
      icon.textContent  = '🌐';
      label.textContent = '隱藏全文翻譯';
      btn.classList.add('loaded');
      btn.disabled = false;
      return;
    }
    // Fallback: MyMemory paragraph-by-paragraph
    const paragraphs = text.split(/\n\n+/);
    const translated = [];
    for (const para of paragraphs) {
      if (!para.trim()) continue;
      const res  = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(para.slice(0, 500)) + '&langpair=en|zh-TW');
      const data = await res.json();
      translated.push(data?.responseData?.translatedText || para);
    }
    const result = translated.join('\n\n');
    state.fullTranslationCache[text] = result;
    body.textContent  = result;
    icon.textContent  = '🌐';
    label.textContent = '隱藏全文翻譯';
    btn.classList.add('loaded');
  } catch {
    body.innerHTML    = '<div class="translation-loading">翻譯失敗，請確認網路連線</div>';
    icon.textContent  = '🌐';
    label.textContent = '顯示全文翻譯';
  }
  btn.disabled = false;
}
