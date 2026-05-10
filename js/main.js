// ── WordLens main entry point ──
// All side-effect imports (event listeners) are loaded here.

import './tabs.js';       // Tab switching + back button
import './popup.js';      // Word popup (attaches overlay events)
import './article.js';    // Read aloud + translate-all button
import './library.js';    // Flashcard + export/import buttons

import { initSpeedSlider } from './speech.js';
import { initGenerate, initExploreFilters, renderExplore, renderDailyArticles, updateKeyUI } from './explore.js';
import { initGuardianKeyUI, initNewsFilters } from './news.js';
import { initChat, renderChatHome } from './chat.js';
import { switchTab } from './tabs.js';

// ── Bootstrap ──
function init() {
  // Main read-view speed slider
  initSpeedSlider({
    sliderId: 'speed-slider',
    fillId:   'speed-fill',
    thumbId:  'speed-thumb',
    labelId:  'speed-value',
  });

  // Explore
  initExploreFilters();
  initGenerate();
  renderExplore();
  renderDailyArticles();

  // News
  initGuardianKeyUI();
  initNewsFilters();

  // Chat
  initChat();

  // Default tab
  switchTab('explore');

  // PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
