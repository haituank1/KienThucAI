// -- config.js: API base URL + shared state --
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:5001' : '';

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
  loadingKnowledge:  false,
  queue:             [],
  queueFilter:       'all',
  toolkitFiles:      [],
  tkExpandedFiles:   new Set(),
  tkSearch:          '',
  toolkitIndex:      null,
  ratings:           {},
  promotions:        {},
  promotedOnly:      false
};
