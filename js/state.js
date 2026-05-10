// ── Global State ──
export const state = {
  // Vocab & Library
  vocab:    JSON.parse(localStorage.getItem('wordlens-vocab')    || '[]'),
  library:  JSON.parse(localStorage.getItem('wordlens-library')  || '[]'),

  // Caches
  translationCache:    {},
  dictCache:           {},
  fullTranslationCache:{},
  chatTranslationCache:{},
  newsCache:           {},

  // Speech
  speechRate:      0.9,
  isReadingAloud:  false,
  isPaused:        false,
  isRestarting:    false,
  articleText:     '',
  currentCharIndex:0,

  // Popup / current word
  currentWord:        '',
  currentTranslation: '',
  currentWordEl:      null,
  currentArticleText: '',

  // API Keys
  anthropicKey: localStorage.getItem('wordlens-gemini-key')    || '',
  guardianKey:  localStorage.getItem('wordlens-guardian-key')  || '',

  // Explore
  storedArticles: JSON.parse(localStorage.getItem('wordlens-articles') || '[]'),
  activeLevel: 'all',
  activeTopic: 'all',

  // Daily
  dailyCache: JSON.parse(localStorage.getItem('wordlens-daily') || 'null'),

  // News
  activeNewsTopic:  'world',
  activeGeminiTopic:'World News',
  activeNewsSource: 'guardian',

  // Chat
  chatPhase:   'select',
  chatMode:    '',
  chatScenario:{},
  chatHistory: [],
  showTranslations: false,

  // Voice
  voiceModeOn:  false,
  isRecording:  false,
  isSpeakingAI: false,
  recognition:  null,
};

// ── Persistence helpers ──
export const persist = {
  vocab()    { localStorage.setItem('wordlens-vocab',    JSON.stringify(state.vocab));    },
  library()  { localStorage.setItem('wordlens-library',  JSON.stringify(state.library));  },
  articles() { localStorage.setItem('wordlens-articles', JSON.stringify(state.storedArticles)); },
  daily()    { localStorage.setItem('wordlens-daily',    JSON.stringify(state.dailyCache)); },
};
