// ── config.js — API base URL + shared state ────────────────────────────────
// ── Config ───────────────────────────────────────────────────────────────────
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:5001' : '';


// ── State ────────────────────────────────────────────────────────────────────
const state = {
  currentView:       'dashboard',
  currentCategory:   '',
  currentStatus:     '',
  currentSearch:     '',
  categories:        [],
  stats:             null,
  items:             [],
  currentItem:       null,
  categoryChart:     null,
  timelineChart:     null,
  searchTimer:       null,
  loadingKnowledge:  false,  // guard: tránh concurrent loadKnowledge calls
  queue:             [],     // research queue items
  queueFilter:       'all',  // all | pending | done
  toolkitFiles:      [],     // Toolkit Explorer data
  tkExpandedFiles:   new Set(), // set of expanded relPaths
  tkSearch:          '',     // search in Toolkit Explorer
  toolkitIndex:      null,   // _toolkit-index.json — dùng để detect "Found in toolkit"
  ratings:           {}      // { itemId: stars }
};

