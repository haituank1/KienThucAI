// ════════════════════════════════════════════════════════════
//  Knowledge Hub — app.js
//  Served by DemoEngine at http://localhost:5001
// ════════════════════════════════════════════════════════════

// ── Config ───────────────────────────────────────────────────────────────────
// Nếu mở từ file:// → dùng full URL; nếu từ localhost → dùng relative
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
  toolkitIndex:      null    // _toolkit-index.json — dùng để detect "Found in toolkit"
};

// ── API client ────────────────────────────────────────────────────────────────
const api = {
  async get(path) {
    const r = await fetch(API_BASE + path);
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) { const t = await r.text(); throw new Error(t || r.statusText); }
    return r.json();
  },
  async put(path, body) {
    const r = await fetch(API_BASE + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) { const t = await r.text(); throw new Error(t || r.statusText); }
    return r.json();
  },
  async del(path) {
    const r = await fetch(API_BASE + path, { method: 'DELETE' });
    return r.ok;
  }
};

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    await api.get('/api/health');
    setConnectionStatus(true);
  } catch {
    setConnectionStatus(false);
    return;
  }
  // Load all data in parallel (toolkit index không block render chính)
  await Promise.all([loadCategories(), loadStats(), loadKnowledge()]);
  loadToolkitIndex(); // fire-and-forget: xong thì re-render knowledge list
}

function setConnectionStatus(ok) {
  const el = document.getElementById('connectionStatus');
  if (ok) {
    el.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> <span class="text-emerald-400">Connected</span>';
  } else {
    el.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span> <span class="text-red-400">Offline</span>';
    document.getElementById('view-dashboard').innerHTML = `
      <div class="max-w-lg mx-auto mt-10 card" style="border-color:#7f1d1d">
        <div class="text-red-400 font-bold text-lg mb-3">⚠️ Không kết nối được DemoEngine</div>
        <div class="text-slate-300 text-sm mb-4" style="line-height:1.8">
          <div><strong>1.</strong> Mở terminal, chạy:</div>
          <div class="code-block text-xs my-2">cd C:\\_Claude_code\\KienThucAI\\ai-lab\\demo-engine
dotnet run --project src\\DemoEngine.API</div>
          <div><strong>2.</strong> Chờ thấy: <code style="background:#1e3a5f;padding:2px 6px;border-radius:4px;color:#93c5fd">DemoEngine → http://localhost:5001</code></div>
          <div style="margin-top:8px"><strong>3.</strong> Mở: <a href="http://localhost:5001" style="color:#818cf8" target="_self">http://localhost:5001</a></div>
          <div style="color:#fbbf24;font-size:0.75rem;margin-top:12px">⚠️ Không mở file index.html trực tiếp — phải dùng localhost:5001</div>
        </div>
        <button class="btn btn-primary" onclick="location.reload()">🔄 Thử lại</button>
        <span style="font-size:0.7rem;color:#64748b;margin-left:12px">Connecting to: ${API_BASE || window.location.origin}</span>
      </div>`;
  }
}

// ── View switching ────────────────────────────────────────────────────────────
function switchView(view) {
  state.currentView = view;
  document.querySelectorAll('[data-view]').forEach(el =>
    el.classList.toggle('active', el.dataset.view === view));
  document.querySelectorAll('[id^="view-"]').forEach(el =>
    el.hidden = (el.id !== `view-${view}`));
  if (view === 'settings') loadSettings();
  if (view === 'queue')    loadQueue();
  if (view === 'toolkit')  loadToolkitExplorer();
  if (view === 'knowledge') renderKnowledge();
}

// ── Categories ────────────────────────────────────────────────────────────────
async function loadCategories() {
  state.categories = await api.get('/api/categories');
  renderCategoryFilters();
}

/**
 * Render category filters in sidebar.
 * BUG FIX: Luôn dùng state.stats.byCategory cho total counts,
 * KHÔNG dùng state.items (đã filtered) để tránh counts nhảy khi filter.
 */
function renderCategoryFilters() {
  const container = document.getElementById('categoryFilters');

  // ── Total count: dùng stats.total (unfiltered), fallback state.items.length
  const totalCount = state.stats ? state.stats.total : state.items.length;
  document.getElementById('catBadgeAll').textContent = totalCount;

  // ── Per-category counts: dùng stats.byCategory (unfiltered totals)
  const getCatTotal = (catId) => {
    if (state.stats && Array.isArray(state.stats.byCategory)) {
      const found = state.stats.byCategory.find(c => c.categoryId === catId);
      return found ? found.total : 0;
    }
    // Fallback: count từ state.items (có thể bị filtered)
    return state.items.filter(i => i.category === catId).length;
  };

  // ── Xoá category buttons cũ (giữ lại "Tất cả")
  container.querySelectorAll('.cat-filter:not([data-cat=""])').forEach(e => e.remove());

  // ── Tạo lại category buttons
  state.categories.forEach(cat => {
    const count = getCatTotal(cat.id);
    const div   = document.createElement('div');
    div.className   = `nav-item cat-filter ${state.currentCategory === cat.id ? 'active' : ''}`;
    div.dataset.cat = cat.id;
    div.onclick     = () => filterByCategory(cat.id);
    div.innerHTML   = `
      <span>${cat.icon}</span>
      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(cat.label)}</span>
      <span style="font-size:0.7rem;color:${cat.color};flex-shrink:0">${count}</span>`;
    container.appendChild(div);
  });

  // ── Update "Tất cả" button active state
  const allBtn = container.querySelector('.cat-filter[data-cat=""]');
  if (allBtn) allBtn.classList.toggle('active', state.currentCategory === '');
}

function filterByCategory(catId) {
  state.currentCategory = catId;
  // Update active class trên tất cả category buttons
  document.querySelectorAll('.cat-filter').forEach(el =>
    el.classList.toggle('active', el.dataset.cat === catId));
  loadKnowledge(); // không qua applyFilters để tránh đọc lại statusFilter
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  state.stats = await api.get('/api/stats');
  renderStats();
}

function renderStats() {
  const s = state.stats;
  if (!s) return;

  setText('statTotal',      s.total);
  setText('statPending',    s.pendingReview);
  setText('statValidated',  s.validated);
  setText('statRejected',   s.rejected);
  setText('statConfidence', s.avgConfidence + '%');
  setText('statWithDemo',   s.withDemo);
  setText('statThisWeek',   s.validatedThisWeek);

  // Stale count — tính từ state.items (cần items đã load)
  const staleCount = state.items.filter(i => isStale(i)).length;
  setText('statStale', staleCount);

  // Pending badge trên nav
  const badge = document.getElementById('navPendingBadge');
  if (badge) { badge.hidden = s.pendingReview === 0; badge.textContent = s.pendingReview; }

  // Alert: pending > 7 ngày
  const alertRow = document.getElementById('alertRow');
  if (alertRow) {
    if (s.pendingOver7Days > 0) {
      alertRow.hidden = false;
      alertRow.innerHTML = `<div class="alert-warning">⚠️ Có <strong>${s.pendingOver7Days}</strong> items pending > 7 ngày chưa validate.</div>`;
    } else {
      alertRow.hidden = true;
    }
  }

  renderCategoryChart(s.byCategory);
  renderTimelineChart(s.timeline);

  // Cập nhật counts sidebar (dùng stats mới nhất)
  renderCategoryFilters();
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Charts ────────────────────────────────────────────────────────────────────
function renderCategoryChart(data) {
  const ctx = document.getElementById('chartCategory');
  if (!ctx) return;
  if (state.categoryChart) { state.categoryChart.destroy(); state.categoryChart = null; }
  if (!data || !data.length) return;

  state.categoryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        { label: 'Pending',   data: data.map(d => d.pending),   backgroundColor: '#fbbf2480', borderColor: '#fbbf24', borderWidth: 1 },
        { label: 'Validated', data: data.map(d => d.validated), backgroundColor: '#10b98180', borderColor: '#10b981', borderWidth: 1 },
        { label: 'Rejected',  data: data.map(d => d.rejected),  backgroundColor: '#ef444480', borderColor: '#ef4444', borderWidth: 1 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
      scales: {
        x: { stacked: true, ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e293b' } },
        y: { stacked: true, ticks: { color: '#94a3b8', stepSize: 1 },        grid: { color: '#334155' } }
      }
    }
  });
}

function renderTimelineChart(data) {
  const ctx = document.getElementById('chartTimeline');
  if (!ctx) return;
  if (state.timelineChart) { state.timelineChart.destroy(); state.timelineChart = null; }
  if (!data || !data.length) return;

  state.timelineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date.substring(5)),
      datasets: [
        { label: 'Researched', data: data.map(d => d.researched), borderColor: '#6366f1', backgroundColor: '#6366f120', tension: 0.3, fill: true },
        { label: 'Validated',  data: data.map(d => d.validated),  borderColor: '#10b981', backgroundColor: '#10b98120', tension: 0.3, fill: true }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 9 }, maxTicksLimit: 10 }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#94a3b8', stepSize: 1 },                          grid: { color: '#334155' } }
      }
    }
  });
}

// ── Knowledge list ────────────────────────────────────────────────────────────
async function loadKnowledge() {
  if (state.loadingKnowledge) return;
  state.loadingKnowledge = true;

  // Show loading indicator khi đang ở knowledge view
  const loadingEl = document.getElementById('knowledgeLoading');
  if (loadingEl && state.currentView === 'knowledge') loadingEl.hidden = false;

  try {
    const params = new URLSearchParams();
    if (state.currentCategory) params.set('category', state.currentCategory);
    // 'stale' không phải backend status — handle client-side
    if (state.currentStatus && state.currentStatus !== 'stale')
      params.set('status', state.currentStatus);
    if (state.currentSearch)   params.set('search',   state.currentSearch);

    state.items = await api.get('/api/knowledge?' + params);

    // Client-side stale filter
    if (state.currentStatus === 'stale')
      state.items = state.items.filter(i => isStale(i));

    renderKnowledge();
    renderPendingPreview();
    updateSearchResultCount();
    // renderStats() đã gọi renderCategoryFilters() bên trong — không gọi lại ở đây
    if (state.stats) renderStats();
  } catch(e) {
    console.error('loadKnowledge error:', e);
  } finally {
    state.loadingKnowledge = false;
  }
}

function renderKnowledge() {
  const container = document.getElementById('knowledgeList');
  const empty     = document.getElementById('knowledgeEmpty');
  const loading   = document.getElementById('knowledgeLoading');

  if (loading) loading.hidden = true;

  if (!state.items.length) {
    if (container) container.innerHTML = '';
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  if (container) container.innerHTML = state.items.map(renderKnowledgeCard).join('');
}

function renderKnowledgeCard(item) {
  const cat       = state.categories.find(c => c.id === item.category) || { label: item.category, icon: '📚', color: '#6366f1' };
  const conf      = Math.round((item.confidence || 0) * 100);
  const confColor = conf >= 80 ? '#10b981' : conf >= 60 ? '#fbbf24' : '#ef4444';
  const dateStr   = new Date(item.researchedAt).toLocaleDateString('vi-VN');
  const stale     = isStale(item);

  // Version badges (chỉ hiện 2 cái đầu)
  const versionBadges = item.techVersions
    ? Object.entries(item.techVersions).slice(0, 2)
        .map(([k, v]) => `<span class="version-badge">${esc(k)} ${esc(v)}</span>`).join('')
    : '';

  return `
  <div class="card" style="cursor:pointer${stale ? ';border-color:#fbbf2440' : ''}" onclick="openDetail('${esc(item.id)}')">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:0.5rem">
      <span class="cat-badge" style="background:${cat.color}30;color:${cat.color};border:1px solid ${cat.color}50">${cat.icon} ${esc(cat.label)}</span>
      <div style="display:flex;align-items:center;gap:0.35rem">
        ${stale ? '<span class="stale-badge" title="Cần review lại">⚠️ Stale</span>' : ''}
        <span class="status-badge status-${item.status}">${statusLabel(item.status)}</span>
      </div>
    </div>
    <h3 style="font-weight:600;color:white;font-size:0.875rem;margin:0 0 0.25rem;line-height:1.4">${esc(item.topic)}</h3>
    <p style="font-size:0.75rem;color:#94a3b8;margin:0 0 0.5rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(item.summary)}</p>
    <div class="confidence-bar" style="margin-bottom:0.5rem">
      <div class="confidence-fill" style="width:${conf}%;background:${confColor}"></div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;flex-wrap:wrap;gap:0.25rem">
        ${(item.tags || []).slice(0, 2).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        ${versionBadges}
        ${item.mergedIntoFile
          ? `<span class="merged-badge" title="Đã merge vào ${esc(item.mergedIntoFile)}">✅ ${esc(item.mergedIntoFile.split('/').pop())}</span>`
          : (() => {
              const found = findInToolkitIndex(item.topic);
              return found.length
                ? found.map(e => `<span class="found-badge" title="Detected in ${esc(e.file)} · line ${e.line}&#10;(best-effort match, chưa xác nhận)">~ ${esc(e.file.split('/').pop())}</span>`).join('')
                : '';
            })()
        }
      </div>
      <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0;margin-left:0.5rem">
        ${item.hasDemo ? '<span style="font-size:0.7rem;color:#818cf8">🚀 Demo</span>' : ''}
        <span style="font-size:0.7rem;color:#475569">${dateStr}</span>
      </div>
    </div>
  </div>`;
}

function renderPendingPreview() {
  const container = document.getElementById('pendingPreview');
  if (!container) return;

  // Luôn dùng tất cả items pending — nếu đang filter category thì vẫn hiển thị từ state
  // (state.items có thể đã filtered, nhưng preview này chỉ là ở dashboard)
  const pending = state.items.filter(i => i.status === 'pending_review').slice(0, 3);

  if (!pending.length) {
    container.innerHTML = '<div style="font-size:0.875rem;color:#64748b">Không có item pending 🎉</div>';
    return;
  }

  container.innerHTML = pending.map(item => {
    const cat  = state.categories.find(c => c.id === item.category) || { icon: '📚', color: '#6366f1' };
    const days = Math.floor((Date.now() - new Date(item.researchedAt)) / 86_400_000);
    return `
    <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0.25rem;border-bottom:1px solid #334155;cursor:pointer"
         onclick="openDetail('${esc(item.id)}')">
      <span style="color:${cat.color}">${cat.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.875rem;color:white;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(item.topic)}</div>
        <div style="font-size:0.7rem;color:#64748b">${days === 0 ? 'Hôm nay' : days + ' ngày trước'}</div>
      </div>
      <span style="font-size:0.75rem;color:#fbbf24;flex-shrink:0">${Math.round((item.confidence || 0) * 100)}%</span>
    </div>`;
  }).join('');
}

// ── Staleness ─────────────────────────────────────────────────────────────────
/**
 * Item stale khi: đã validated VÀ (now - validatedAt) > staleAfterDays ngày.
 * Pending items không tính stale (chúng đã là "cần attention").
 */
function isStale(item) {
  if (item.status !== 'validated') return false;
  const days = item.staleAfterDays || 180;
  const ref  = item.validatedAt ? new Date(item.validatedAt) : new Date(item.researchedAt);
  const age  = (Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24);
  return age > days;
}

function staleMsg(item) {
  const days = item.staleAfterDays || 180;
  const ref  = item.validatedAt ? new Date(item.validatedAt) : new Date(item.researchedAt);
  const age  = Math.floor((Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24));
  return `Validated ${age} ngày trước (review sau ${days} ngày)`;
}

// ── Filters ───────────────────────────────────────────────────────────────────
function applyFilters() {
  state.currentStatus = document.getElementById('statusFilter').value;
  loadKnowledge();
}

function debounceSearch(val) {
  clearTimeout(state.searchTimer);
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.hidden = !val;
  state.searchTimer = setTimeout(() => {
    state.currentSearch = val;
    loadKnowledge();
  }, 400);
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.hidden = true;
  state.currentSearch = '';
  state.loadingKnowledge = false; // reset guard trước khi load
  loadKnowledge();
}

function updateSearchResultCount() {
  const el = document.getElementById('searchResultCount');
  if (!el) return;
  const hasFilter = state.currentSearch || state.currentStatus || state.currentCategory;
  if (hasFilter) {
    el.hidden = false;
    el.textContent = `${state.items.length} kết quả`;
  } else {
    el.hidden = true;
  }
}

/** Shortcut từ dashboard: click Stale stat card */
function filterStale() {
  document.getElementById('statusFilter').value = 'stale';
  state.currentStatus = 'stale';
  state.items = []; // clear trước để tránh flash wrong items khi switchView gọi renderKnowledge
  switchView('knowledge');
  state.loadingKnowledge = false;
  loadKnowledge();
}

async function refreshAll() {
  // Reset guard để force reload
  state.loadingKnowledge = false;
  await Promise.all([loadCategories(), loadStats(), loadKnowledge()]);
}

/** Shortcut: xem tất cả pending items */
function viewAllPending() {
  document.getElementById('statusFilter').value = 'pending_review';
  state.currentStatus = 'pending_review';
  switchView('knowledge');
  // loadKnowledge() sẽ được gọi ngay sau vì renderKnowledge() show từ state cũ,
  // sau đó loadKnowledge fetch fresh data
  state.loadingKnowledge = false;
  loadKnowledge();
}

// ── Detail modal ──────────────────────────────────────────────────────────────
async function openDetail(id) {
  let item;
  try {
    item = await api.get(`/api/knowledge/${id}`);
  } catch(e) {
    alert('Không thể load chi tiết: ' + e.message);
    return;
  }
  state.currentItem = item;

  const cat = state.categories.find(c => c.id === item.category) || { label: item.category, icon: '📚', color: '#6366f1' };

  // Header
  const catBadge = document.getElementById('modalCatBadge');
  catBadge.textContent = `${cat.icon} ${cat.label}`;
  catBadge.style.cssText = `background:${cat.color}30;color:${cat.color};border:1px solid ${cat.color}50`;

  const statusBadge = document.getElementById('modalStatusBadge');
  statusBadge.textContent = statusLabel(item.status);
  statusBadge.className = `status-badge status-${item.status}`;

  setText('modalDifficulty', '📊 ' + (item.difficulty || 'intermediate'));
  setText('modalTopic', item.topic);
  setText('modalDate',
    `Researched: ${new Date(item.researchedAt).toLocaleDateString('vi-VN')}` +
    (item.validatedAt ? ` · Validated: ${new Date(item.validatedAt).toLocaleDateString('vi-VN')} by ${item.validatedBy || '—'}` : ''));

  // Confidence
  const conf      = Math.round((item.confidence || 0) * 100);
  const confColor = conf >= 80 ? '#10b981' : conf >= 60 ? '#fbbf24' : '#ef4444';
  const fill = document.getElementById('modalConfidenceFill');
  if (fill) fill.style.cssText = `width:${conf}%;background:${confColor}`;
  setText('modalConfidenceText', conf + '%');

  setText('modalSummary',  item.summary  || '');
  setText('modalProblem',  item.problem  || '');
  setText('modalSolution', item.solution || '');

  // Code example
  const codeSection = document.getElementById('modalCodeSection');
  if (item.codeExample) {
    codeSection.hidden = false;
    const raw = item.codeExample.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
    setText('modalCode', raw);
  } else { codeSection.hidden = true; }

  // Tradeoffs
  const tradeoffsSection = document.getElementById('modalTradeoffsSection');
  if (item.tradeoffs && item.tradeoffs.length) {
    tradeoffsSection.hidden = false;
    document.getElementById('modalTradeoffs').innerHTML =
      item.tradeoffs.map(t => `<li style="margin-bottom:0.25rem">${esc(t)}</li>`).join('');
  } else { tradeoffsSection.hidden = true; }

  // References
  const refsSection = document.getElementById('modalRefsSection');
  if (item.references && item.references.length) {
    refsSection.hidden = false;
    document.getElementById('modalRefs').innerHTML =
      item.references.map(r =>
        `<a href="${esc(r.url)}" target="_blank" rel="noopener"
           style="color:#818cf8;font-size:0.875rem;display:flex;align-items:center;gap:0.25rem;text-decoration:none">
           🔗 ${esc(r.title)}</a>`).join('');
  } else { refsSection.hidden = true; }

  // Self verification
  const verifSection = document.getElementById('modalVerifSection');
  if (item.selfVerification && item.selfVerification.method) {
    verifSection.hidden = false;
    document.getElementById('modalVerif').innerHTML =
      `<div>${item.selfVerification.verified ? '✅' : '⚠️'} ${esc(item.selfVerification.method)}</div>` +
      (item.selfVerification.caveats ? `<div style="color:#fbbf24;margin-top:4px">⚠️ ${esc(item.selfVerification.caveats)}</div>` : '');
  } else { verifSection.hidden = true; }

  // Demo
  const demoSection = document.getElementById('modalDemoSection');
  if (item.demo && item.demo.exists) {
    demoSection.hidden = false;
    setText('modalDemoInfo', item.demo.description || '');
  } else { demoSection.hidden = true; }

  // Tags
  document.getElementById('modalTags').innerHTML =
    (item.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');

  // Tech versions
  const versionsSection = document.getElementById('modalVersionsSection');
  if (item.techVersions && Object.keys(item.techVersions).length > 0) {
    versionsSection.hidden = false;
    document.getElementById('modalVersions').innerHTML =
      Object.entries(item.techVersions)
        .map(([k, v]) => `<span class="version-badge">${esc(k)}: ${esc(v)}</span>`)
        .join('');
  } else { versionsSection.hidden = true; }

  // Stale indicator
  const staleSection = document.getElementById('modalStaleSection');
  if (isStale(item)) {
    staleSection.hidden = false;
    document.getElementById('modalStaleMsg').textContent = staleMsg(item);
  } else { staleSection.hidden = true; }

  // Toolkit target
  const tkSection = document.getElementById('modalToolkitSection');
  if (item.validation && item.validation.toolkitTarget) {
    tkSection.hidden = false;
    setText('modalToolkitTarget', item.validation.toolkitTarget);
  } else { tkSection.hidden = true; }

  // Merged tracking
  const mergedSection = document.getElementById('modalMergedSection');
  if (item.mergedIntoFile) {
    mergedSection.hidden = false;
    const mergedDate = item.mergedAt ? new Date(item.mergedAt).toLocaleDateString('vi-VN') : '—';
    setText('modalMergedInfo', `${item.mergedIntoFile} · ${mergedDate}`);
  } else { mergedSection.hidden = true; }

  // Cross-reference: load related items (fire-and-forget)
  const relSection = document.getElementById('modalRelatedSection');
  if (relSection) relSection.hidden = true;  // reset while loading
  api.get(`/api/knowledge/${id}/related?limit=6`)
    .then(related => renderRelatedItems(related))
    .catch(() => {});  // silent fail — cross-ref là optional

  // Action buttons
  const actions  = document.getElementById('modalActions');
  const isPending = item.status === 'pending_review' || item.status === 'needs_rework';
  actions.innerHTML = [
    isPending ? `<button class="btn btn-success" onclick="showValidateForm('validated')">✅ Validate</button>` : '',
    isPending ? `<button class="btn btn-danger"  onclick="showValidateForm('rejected')">❌ Reject</button>` : '',
    isPending ? `<button class="btn btn-warning" onclick="showValidateForm('needs_rework')">🔄 Needs Rework</button>` : '',
    item.demo && item.demo.exists ? `<button class="btn btn-primary" onclick="openDemoFromModal()">🚀 Xem Demo</button>` : '',
    item.status === 'validated' ? `<button class="btn btn-ghost" onclick="showValidateForm('pending_review')">↩ Reset Pending</button>` : ''
  ].join('');

  document.getElementById('validateForm').hidden = true;
  document.getElementById('validationNotes').value = '';
  document.getElementById('detailModal').hidden = false;
}

function showValidateForm(preset) {
  document.getElementById('validateForm').hidden = false;
  document.getElementById('validationStatus').value = preset;
  document.getElementById('validationNotes').focus();
}

async function submitValidation() {
  const status = document.getElementById('validationStatus').value;
  const notes  = document.getElementById('validationNotes').value;
  if (!state.currentItem) return;

  try {
    const updated = await api.put(`/api/knowledge/${state.currentItem.id}/status`, { status, notes });
    closeDetailModal();
    state.loadingKnowledge = false;
    await Promise.all([loadStats(), loadKnowledge()]);

    // Nếu vừa validate (không phải reject/rework) → show toolkit preview
    if (status === 'validated' && updated.validation && updated.validation.toolkitTarget) {
      await showToolkitPreview(updated);
    }
  } catch(e) {
    alert('Lỗi khi lưu: ' + e.message);
  }
}

// ── Toolkit Merge flow ────────────────────────────────────────────────────────

let _currentPreview = null; // lưu preview object hiện tại
let _currentMergeAction = 'append'; // append | replace | skip

async function showToolkitPreview(item) {
  try {
    const preview = await api.get(`/api/knowledge/${item.id}/toolkit-preview`);
    _currentPreview = { ...preview, itemId: item.id };
    _currentMergeAction = 'append';

    // Set editable target input
    const targetInput = document.getElementById('previewTargetInput');
    if (targetInput) targetInput.value = preview.targetRelPath;

    // Reset action radios → append
    document.querySelectorAll('input[name="mergeAction"]').forEach(r => {
      r.checked = r.value === 'append';
    });

    // Render preview với data từ backend
    renderPreviewUI(preview);

    // Reset status
    document.getElementById('mergeStatus').textContent = '';
    const btn = document.getElementById('btnConfirmMerge');
    btn.disabled = false;
    btn.textContent = '💾 Lưu vào Toolkit';

    document.getElementById('toolkitPreviewModal').hidden = false;
  } catch(e) {
    // toolkitTarget không set → không show modal, đó là bình thường
    console.info('No toolkit preview:', e.message);
  }
}

function renderPreviewUI(preview) {
  // File info
  const fileInfo = document.getElementById('previewFileInfo');
  const actionText = _currentMergeAction === 'replace' ? 'replace section'
                   : _currentMergeAction === 'skip'    ? 'bỏ qua (chỉ validate, không ghi file)'
                   : 'append xuống cuối';
  if (preview.fileExists) {
    fileInfo.innerHTML = `📄 File tồn tại — <strong>${preview.existingLineCount}</strong> dòng. Hành động: <strong>${actionText}</strong>.`;
  } else {
    fileInfo.innerHTML = _currentMergeAction === 'skip'
      ? `📄 File chưa tồn tại — sẽ <strong>bỏ qua</strong>.`
      : `🆕 File chưa tồn tại — sẽ được <strong>tạo mới</strong>.`;
  }

  // Duplicate warning
  const dupEl = document.getElementById('previewDupWarning');
  if (preview.hasDuplicate) {
    dupEl.hidden = false;
    dupEl.innerHTML = preview.duplicateWarning +
      (preview.conflictingHeading
        ? `<br><span style="font-size:0.75rem;color:#94a3b8">Gợi ý: chọn <strong>Replace section</strong> để cập nhật.</span>`
        : '');
    // Auto-suggest replace nếu có conflict
    if (preview.conflictingHeading && _currentMergeAction === 'append') {
      // Đánh dấu label Replace nổi bật
      const labelReplace = document.getElementById('labelReplace');
      if (labelReplace) labelReplace.style.color = '#fb923c';
    }
  } else {
    dupEl.hidden = true;
    const labelReplace = document.getElementById('labelReplace');
    if (labelReplace) labelReplace.style.color = '';
  }

  // Headings list
  const headingsRow = document.getElementById('previewHeadingsRow');
  const headingsList = document.getElementById('previewHeadingsList');
  if (preview.existingHeadings && preview.existingHeadings.length > 0) {
    headingsRow.hidden = false;
    headingsList.innerHTML = preview.existingHeadings.map(h => `
      <div style="font-size:0.75rem;color:#94a3b8;padding:0.1rem 0;display:flex;align-items:center;gap:0.5rem">
        <span style="color:#475569;font-size:0.65rem;font-family:monospace">L${h.lineNumber}</span>
        <span>## ${esc(h.text)}</span>
        ${preview.conflictingHeading && h.text === preview.conflictingHeading
          ? '<span style="color:#fb923c;font-size:0.65rem">← conflict</span>' : ''}
      </div>`).join('');
  } else {
    headingsRow.hidden = true;
  }

  // Content
  document.getElementById('previewContent').value = preview.content;

  // Content label
  updateContentLabel();
}

function updateContentLabel() {
  const label = document.getElementById('previewContentLabel');
  if (!label) return;
  const labelMap = {
    append:  'Nội dung sẽ được append (có thể chỉnh sửa):',
    replace: 'Nội dung sẽ thay thế section cũ (có thể chỉnh sửa):',
    skip:    'Preview (sẽ không lưu — chỉ validate status):'
  };
  label.textContent = labelMap[_currentMergeAction] || labelMap.append;

  // Dim textarea nếu skip
  const ta = document.getElementById('previewContent');
  if (ta) ta.style.opacity = _currentMergeAction === 'skip' ? '0.4' : '1';
}

function onMergeActionChange(action) {
  _currentMergeAction = action;
  updateContentLabel();
  if (_currentPreview) renderPreviewUI(_currentPreview);

  // Feature: show diff panel khi chọn Replace
  const panel = document.getElementById('diffPanel');
  if (action === 'replace') {
    showDiffPanel();
  } else {
    if (panel) panel.hidden = true;
  }
}

/** User thay đổi target path thủ công → load headings mới */
async function onTargetPathChange(newPath) {
  if (!_currentPreview || !newPath.trim()) return;
  newPath = newPath.trim();

  // Update absPath dựa trên path mới — backend sẽ resolve
  _currentPreview.targetRelPath = newPath;
  // TargetAbsPath sẽ không chính xác nữa nếu user đổi path thủ công
  // → cần re-fetch headings từ API
  try {
    const fileInfo = await api.get(`/api/toolkit/headings?path=${encodeURIComponent(newPath)}`);
    _currentPreview.existingHeadings  = fileInfo.headings || [];
    _currentPreview.existingLineCount = fileInfo.sizeBytes > 0 ? Math.floor(fileInfo.sizeBytes / 40) : 0; // ước lượng
    _currentPreview.fileExists        = fileInfo.fileExists;

    // Re-detect conflict với content heading hiện tại
    const contentHeading = extractFirstHeadingFromText(document.getElementById('previewContent').value);
    if (contentHeading && fileInfo.headings) {
      const conflict = fileInfo.headings.find(h => h.text.toLowerCase() === contentHeading.toLowerCase());
      _currentPreview.hasDuplicate        = !!conflict;
      _currentPreview.conflictingHeading  = conflict ? conflict.text : '';
      _currentPreview.duplicateWarning    = conflict
        ? `⚠️ Heading "## ${conflict.text}" đã tồn tại ở dòng ${conflict.lineNumber}. Chọn "Replace" để thay thế.`
        : '';
    } else {
      _currentPreview.hasDuplicate       = false;
      _currentPreview.conflictingHeading = '';
      _currentPreview.duplicateWarning   = '';
    }

    renderPreviewUI(_currentPreview);
  } catch(e) {
    console.warn('Could not load headings for new path:', e.message);
  }
}

function extractFirstHeadingFromText(text) {
  if (!text) return '';
  for (const line of text.split('\n')) {
    const t = line.trimStart();
    if (t.startsWith('## ')) return t.slice(3).trim();
  }
  return '';
}

function toggleExistingHeadings() {
  const list = document.getElementById('previewHeadingsList');
  const icon = document.getElementById('previewHeadingsToggleIcon');
  if (!list) return;
  list.hidden = !list.hidden;
  if (icon) icon.textContent = list.hidden ? '▶' : '▼';
}

async function confirmMergeToToolkit() {
  if (!_currentPreview) return;

  const btn      = document.getElementById('btnConfirmMerge');
  const statusEl = document.getElementById('mergeStatus');
  const content  = document.getElementById('previewContent').value;
  const target   = document.getElementById('previewTargetInput').value.trim();

  if (!target) {
    statusEl.textContent = '⚠️ Chưa chọn target path';
    statusEl.style.color = '#fbbf24';
    return;
  }

  btn.disabled = true;
  statusEl.textContent = '⏳ Đang lưu...';
  statusEl.style.color = '#94a3b8';

  // Build request body
  const reqBody = {
    targetAbsPath:    _currentPreview.targetAbsPath || '',
    targetRelPath:    target,
    content,
    action:           _currentMergeAction,
    headingToReplace: _currentMergeAction === 'replace'
                      ? (_currentPreview.conflictingHeading || extractFirstHeadingFromText(content))
                      : ''
  };

  try {
    const result = await _mergeToToolkit(_currentPreview.itemId, reqBody);

    if (result.success) {
      statusEl.textContent = `✅ ${result.message}`;
      statusEl.style.color = '#34d399';
      btn.textContent = '✅ Đã lưu';
      // Reload items để cập nhật merged badge
      state.loadingKnowledge = false;
      await loadKnowledge();
      setTimeout(() => closeToolkitPreview(), 2000);
    } else {
      statusEl.textContent = `❌ ${result.message}`;
      statusEl.style.color = '#f87171';
      btn.disabled = false;
    }
  } catch(e) {
    statusEl.textContent = `❌ Lỗi: ${e.message}`;
    statusEl.style.color = '#f87171';
    btn.disabled = false;
  }
}

async function _mergeToToolkit(itemId, req) {
  const r = await fetch(`${API_BASE}/api/knowledge/${itemId}/merge-to-toolkit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });
  if (!r.ok) { const t = await r.text(); throw new Error(t || r.statusText); }
  return r.json();
}

function closeToolkitPreview() {
  document.getElementById('toolkitPreviewModal').hidden = true;
  _currentPreview = null;
  _currentMergeAction = 'append';
  // Reset headings toggle
  const list = document.getElementById('previewHeadingsList');
  const icon = document.getElementById('previewHeadingsToggleIcon');
  if (list) list.hidden = true;
  if (icon) icon.textContent = '▶';
}

function closeToolkitPreviewIfOutside(e) {
  if (e.target === document.getElementById('toolkitPreviewModal')) closeToolkitPreview();
}

async function openDemoFromModal() {
  if (!state.currentItem) return;
  try {
    const info = await api.get(`/api/demo/${state.currentItem.id}`);
    if (info.exists && info.url) window.open(info.url, '_blank');
    else alert(info.message || 'Demo chưa được tạo.');
  } catch(e) {
    alert('Không thể load demo: ' + e.message);
  }
}

function closeDetailModal() {
  document.getElementById('detailModal').hidden  = true;
  document.getElementById('validateForm').hidden = true;
  document.getElementById('validationNotes').value = '';
  state.currentItem = null;
}

function closeDetailIfOutside(e) {
  if (e.target === document.getElementById('detailModal')) closeDetailModal();
}

// ── Queue view ────────────────────────────────────────────────────────────────
async function loadQueue() {
  try {
    state.queue = await api.get('/api/queue');
    renderQueue();
  } catch(e) {
    const tbody = document.getElementById('queueTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#f87171;padding:2rem">Lỗi: ${esc(e.message)}</td></tr>`;
  }
}

function setQueueFilter(filter) {
  state.queueFilter = filter;
  ['qFilterAll', 'qFilterPending', 'qFilterDone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.background = '';
  });
  const activeId = filter === 'all' ? 'qFilterAll' : filter === 'pending' ? 'qFilterPending' : 'qFilterDone';
  const activeEl = document.getElementById(activeId);
  if (activeEl) activeEl.style.background = '#6366f1';
  renderQueue();
}

function renderQueue() {
  const tbody    = document.getElementById('queueTableBody');
  const statsEl  = document.getElementById('queueStats');
  if (!tbody) return;

  // Bug fix: sync active tab button với state.queueFilter
  ['qFilterAll', 'qFilterPending', 'qFilterDone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.background = '';
  });
  const activeId = state.queueFilter === 'pending' ? 'qFilterPending'
                 : state.queueFilter === 'done'    ? 'qFilterDone'
                 : 'qFilterAll';
  const activeEl = document.getElementById(activeId);
  if (activeEl) activeEl.style.background = '#6366f1';

  const all      = state.queue;
  const pending  = all.filter(i => i.status !== 'done');
  const done     = all.filter(i => i.status === 'done');
  if (statsEl) statsEl.textContent = `${pending.length} pending · ${done.length} done`;

  let filtered = all;
  if (state.queueFilter === 'pending') filtered = pending;
  if (state.queueFilter === 'done')    filtered = done;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:2rem">
      ${all.length ? 'Không có item với filter này' : 'Queue trống — click "+ Thêm Topic" để bắt đầu'}</td></tr>`;
    return;
  }

  const priorityIcon = { high: '🔴', medium: '🟡', low: '🟢' };
  const daysAgo = d => {
    const days = Math.floor((Date.now() - new Date(d)) / 86_400_000);
    return days === 0 ? 'Hôm nay' : `${days}d`;
  };

  tbody.innerHTML = filtered.map(item => {
    const isDone = item.status === 'done';
    return `
    <tr class="${isDone ? 'done' : ''}">
      <td><span class="priority-${item.priority}">${priorityIcon[item.priority] || '🟡'} ${item.priority}</span></td>
      <td>
        <div style="font-weight:500;color:${isDone ? '#64748b' : 'white'}">${esc(item.topic)}</div>
        ${item.notes ? `<div style="font-size:0.7rem;color:#64748b;margin-top:0.15rem">${esc(item.notes)}</div>` : ''}
      </td>
      <td><span class="tag">${esc(item.category || '—')}</span></td>
      <td><span class="queue-status-${item.status}">${queueStatusLabel(item.status)}</span></td>
      <td style="font-size:0.7rem;color:#64748b">${daysAgo(item.addedAt)}</td>
      <td>
        <div style="display:flex;gap:0.35rem;flex-wrap:wrap">
          ${!isDone ? `
            <button class="btn btn-ghost" style="padding:0.2rem 0.5rem;font-size:0.7rem"
                    onclick="markQueueDone('${esc(item.id)}')" title="Mark done">✅</button>
            ${item.status === 'pending'
              ? `<button class="btn btn-ghost" style="padding:0.2rem 0.5rem;font-size:0.7rem"
                         onclick="markQueueInProgress('${esc(item.id)}')" title="Mark in-progress">▶</button>`
              : ''}
          ` : ''}
          <button class="btn btn-ghost" style="padding:0.2rem 0.5rem;font-size:0.7rem"
                  onclick="generateResearchPrompt('${esc(item.id)}')" title="Copy prompt">📋</button>
          <button class="btn btn-danger" style="padding:0.2rem 0.5rem;font-size:0.7rem"
                  onclick="deleteQueueItem('${esc(item.id)}')" title="Xoá">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function queueStatusLabel(s) {
  const map = { pending: '⏳ Pending', 'in-progress': '▶ In Progress', done: '✅ Done' };
  return map[s] || s;
}

async function markQueueDone(id) {
  const item = state.queue.find(i => i.id === id);
  if (!item) return;
  try {
    await api.put(`/api/queue/${id}`, { ...item, status: 'done' });
    await loadQueue();
  } catch(e) { alert('Lỗi: ' + e.message); }
}

async function markQueueInProgress(id) {
  const item = state.queue.find(i => i.id === id);
  if (!item) return;
  try {
    await api.put(`/api/queue/${id}`, { ...item, status: 'in-progress' });
    await loadQueue();
  } catch(e) { alert('Lỗi: ' + e.message); }
}

async function deleteQueueItem(id) {
  const item = state.queue.find(i => i.id === id);
  if (!item || !confirm(`Xoá "${item.topic}" khỏi queue?`)) return;
  try {
    await api.del(`/api/queue/${id}`);
    await loadQueue();
  } catch(e) { alert('Lỗi: ' + e.message); }
}

/**
 * Copy research prompt cho topic này vào clipboard.
 * User paste vào Claude → Claude nghiên cứu theo research-session.md workflow.
 */
function generateResearchPrompt(id) {
  const item = state.queue.find(i => i.id === id);
  if (!item) return;

  const prompt = `Thực hiện research session cho topic sau:\n\nTOPIC: ${item.topic}\nCATEGORY: ${item.category || 'dotnet'}${item.notes ? `\nCONTEXT: ${item.notes}` : ''}\n\nFollow workflow trong file my-ai-toolkit/07-agents/workflows/research-session.md.\nLưu kết quả vào ai-lab/data/${item.category || 'dotnet'}/[yyyy-MM]/[topic-slug].json`;

  navigator.clipboard.writeText(prompt).then(() => {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;background:#10b981;color:white;padding:0.75rem 1rem;border-radius:0.5rem;font-size:0.85rem;z-index:100;box-shadow:0 4px 12px rgba(0,0,0,0.3)';
    toast.textContent = '✅ Prompt đã copy vào clipboard!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }).catch(() => {
    alert('Copy thất bại. Prompt:\n\n' + prompt);
  });
}

// ── Queue Modal ───────────────────────────────────────────────────────────────
function openQueueModal() {
  const catSelect = document.getElementById('qCategory');
  if (catSelect && state.categories.length) {
    catSelect.innerHTML = state.categories
      .map(c => `<option value="${esc(c.id)}">${esc(c.label)}</option>`)
      .join('');
  }
  document.getElementById('queueModal').hidden = false;
}

function closeQueueModal() {
  document.getElementById('queueModal').hidden = true;
  document.getElementById('qError').hidden = true;
  ['qTopic', 'qNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const priEl = document.getElementById('qPriority');
  if (priEl) priEl.value = 'medium';
}

function closeQueueModalIfOutside(e) {
  if (e.target === document.getElementById('queueModal')) closeQueueModal();
}

async function submitQueueItem() {
  const errEl = document.getElementById('qError');
  errEl.hidden = true;

  const topic = (document.getElementById('qTopic').value || '').trim();
  if (!topic) {
    errEl.textContent = 'Topic là bắt buộc';
    errEl.hidden = false;
    return;
  }

  const item = {
    topic,
    category: document.getElementById('qCategory').value || 'dotnet',
    priority: document.getElementById('qPriority').value || 'medium',
    notes:    (document.getElementById('qNotes').value || '').trim()
  };

  try {
    await api.post('/api/queue', item);
    closeQueueModal();
    await loadQueue();
  } catch(e) {
    errEl.textContent = e.message;
    errEl.hidden = false;
  }
}

// ── Toolkit Index ─────────────────────────────────────────────────────────────

/**
 * Normalize heading text — mirror của NormalizeHeading() bên C#.
 * Lowercase → bỏ diacritics → chỉ giữ [a-z0-9 ] → collapse spaces.
 */
function normalizeHeading(text) {
  return (text || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // bỏ diacritics (incl. tiếng Việt)
    .replace(/[^a-z0-9\s]/g, ' ')                      // bỏ ký tự đặc biệt
    .replace(/\s+/g, ' ').trim();
}

/**
 * Load _toolkit-index.json từ backend (lazy rebuild nếu chưa có).
 * Fire-and-forget: sau khi load xong thì re-render knowledge list để hiện badges.
 */
async function loadToolkitIndex() {
  try {
    const idx = await api.get('/api/toolkit/index');

    // Derive headingMap từ files[] — O(N), một lần khi load
    // headingMap không lưu trong JSON để tránh duplicate data
    const headingMap = {};
    for (const f of (idx.files || [])) {
      for (const h of (f.headings || [])) {
        const norm = normalizeHeading(h.text);
        if (!headingMap[norm]) headingMap[norm] = [];
        headingMap[norm].push({ file: f.relPath, text: h.text, level: h.level, line: h.lineNumber });
      }
    }

    state.toolkitIndex = { ...idx, headingMap };

    // Re-render để cập nhật "Found" badges (nếu đang ở view knowledge)
    if (state.currentView === 'knowledge') renderKnowledge();
    updateIndexInfoUI();
  } catch (e) {
    console.warn('loadToolkitIndex failed:', e);
  }
}

/** Cập nhật phần hiển thị thông tin index trong Settings view */
function updateIndexInfoUI() {
  const el = document.getElementById('indexInfo');
  if (!el) return;
  const idx = state.toolkitIndex;
  if (!idx) { el.textContent = 'Chưa có index.'; return; }
  const d = new Date(idx.generatedAt).toLocaleString('vi-VN');
  el.innerHTML = `Generated: <strong style="color:#cbd5e1">${d}</strong><br>
    Files: <strong style="color:#cbd5e1">${idx.totalFiles}</strong> &nbsp;·&nbsp;
    Headings: <strong style="color:#cbd5e1">${idx.totalHeadings}</strong>`;
}

/**
 * Tìm trong toolkit index xem topic có match với heading nào không.
 * Thuật toán: word-overlap — cần ≥2 từ chung (>2 ký tự) VÀ ≥50% số từ của heading.
 * Trả về array HeadingMapEntry (có thể rỗng).
 *
 * Tier 1 (chính xác): item.mergedIntoFile — xử lý ở renderKnowledgeCard
 * Tier 2 (best-effort, dùng hàm này): scan headingMap
 */
function findInToolkitIndex(topic) {
  if (!state.toolkitIndex?.headingMap) return [];
  const topicNorm  = normalizeHeading(topic);
  const topicWords = new Set(topicNorm.split(' ').filter(w => w.length > 2));
  if (topicWords.size === 0) return [];

  const results = [];
  for (const [normHeading, entries] of Object.entries(state.toolkitIndex.headingMap)) {
    const hWords = normHeading.split(' ').filter(w => w.length > 2);
    if (hWords.length < 2) continue;
    const overlap = hWords.filter(w => topicWords.has(w)).length;
    if (overlap >= 2 && overlap / hWords.length >= 0.5) {
      results.push(...entries);
    }
  }
  // Dedup theo file (nhiều heading trong cùng file chỉ show 1 lần)
  const seen = new Set();
  return results.filter(e => { if (seen.has(e.file)) return false; seen.add(e.file); return true; });
}

/** Rebuild index thủ công (nút trong Settings) */
async function rebuildToolkitIndex() {
  const btn = document.getElementById('rebuildIndexBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Rebuilding...'; }
  try {
    const result = await api.post('/api/toolkit/rebuild-index', {});
    state.toolkitIndex = await api.get('/api/toolkit/index');
    updateIndexInfoUI();
    if (state.currentView === 'knowledge') renderKnowledge();
    alert(result.message);
  } catch (e) {
    alert('Rebuild lỗi: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Rebuild Index'; }
  }
}

// ── Settings view ─────────────────────────────────────────────────────────────
async function loadSettings() {
  try {
    const [cats, health] = await Promise.all([
      api.get('/api/categories'),
      api.get('/api/health')
    ]);
    state.categories = cats;

    const list = document.getElementById('categoriesList');
    if (list) {
      list.innerHTML = cats.length
        ? cats.map(cat => `
          <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:#0f172a;border-radius:0.5rem">
            <span>${cat.icon}</span>
            <span style="flex:1;font-size:0.875rem;font-weight:500;color:${cat.color}">${esc(cat.label)}</span>
            <span style="font-size:0.7rem;color:#64748b">${esc(cat.id)}</span>
            <button class="btn btn-ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                    onclick="deleteCategory('${esc(cat.id)}','${esc(cat.label)}')">🗑️</button>
          </div>`).join('')
        : '<div style="color:#64748b;font-size:0.875rem">Chưa có category nào.</div>';
    }

    const sysInfo = document.getElementById('systemInfo');
    if (sysInfo) {
      sysInfo.innerHTML = `
        <div>Data path: <code style="background:#334155;padding:1px 4px;border-radius:3px">${esc(health.dataPath)}</code></div>
        <div>Hub path:  <code style="background:#334155;padding:1px 4px;border-radius:3px">${esc(health.hubPath)}</code></div>
        <div>Data exists: <span style="color:${health.dataPathExists ? '#10b981' : '#ef4444'}">${health.dataPathExists}</span></div>
        <div>Hub exists:  <span style="color:${health.hubPathExists  ? '#10b981' : '#ef4444'}">${health.hubPathExists}</span></div>`;
    }

    renderCategoryFilters();
    updateIndexInfoUI();
  } catch(e) {
    console.error('loadSettings error:', e);
  }
}

async function deleteCategory(id, label) {
  if (!confirm(`Xoá category "${label}"?\nItems trong category này sẽ không bị xoá.`)) return;
  try {
    await api.del(`/api/categories/${id}`);
    await Promise.all([loadSettings(), loadCategories()]);
  } catch(e) {
    alert('Lỗi khi xoá: ' + e.message);
  }
}

// ── Add Category modal ────────────────────────────────────────────────────────
function openAddCategoryModal() { document.getElementById('catModal').hidden = false; }

function closeCatModal() {
  document.getElementById('catModal').hidden = true;
  document.getElementById('catError').hidden = true;
  ['catId', 'catLabel', 'catDesc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function closeCatIfOutside(e) {
  if (e.target === document.getElementById('catModal')) closeCatModal();
}

async function submitAddCategory() {
  const errEl = document.getElementById('catError');
  errEl.hidden = true;

  const cat = {
    id:          (document.getElementById('catId').value || '').trim().toLowerCase().replace(/\s+/g, '-'),
    label:       (document.getElementById('catLabel').value || '').trim(),
    icon:        (document.getElementById('catIcon').value || '').trim() || '📚',
    color:        document.getElementById('catColor').value || '#6366f1',
    description: (document.getElementById('catDesc').value || '').trim()
  };

  if (!cat.id || !cat.label) {
    errEl.textContent = 'Id và Label là bắt buộc';
    errEl.hidden = false;
    return;
  }

  try {
    await api.post('/api/categories', cat);
    closeCatModal();
    await Promise.all([loadCategories(), loadSettings()]);
  } catch(e) {
    errEl.textContent = e.message;
    errEl.hidden = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusLabel(s) {
  const map = {
    pending_review: '⏳ Pending',
    validated:      '✅ Validated',
    rejected:       '❌ Rejected',
    needs_rework:   '🔄 Rework'
  };
  return map[s] || s;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Toolkit Explorer ──────────────────────────────────────────────────────────

async function loadToolkitExplorer() {
  const container = document.getElementById('tkFileList');
  if (container) container.innerHTML = '<div class="loading">Đang tải...</div>';

  try {
    state.toolkitFiles = await api.get('/api/toolkit/files');
    renderToolkitExplorer();
  } catch(e) {
    if (container) container.innerHTML = `<div style="color:#f87171;padding:2rem;text-align:center">Lỗi: ${esc(e.message)}</div>`;
  }
}

function filterToolkitHeadings(val) {
  state.tkSearch = val.trim().toLowerCase();
  const clearBtn = document.getElementById('tkSearchClear');
  if (clearBtn) clearBtn.hidden = !val;
  renderToolkitExplorer();
}

function clearToolkitSearch() {
  const input = document.getElementById('tkSearchInput');
  if (input) input.value = '';
  state.tkSearch = '';
  const clearBtn = document.getElementById('tkSearchClear');
  if (clearBtn) clearBtn.hidden = true;
  renderToolkitExplorer();
}

function renderToolkitExplorer() {
  const container = document.getElementById('tkFileList');
  if (!container) return;

  const files = state.toolkitFiles;
  const q     = state.tkSearch;

  const totalFiles    = files.length;
  const totalHeadings = files.reduce((s, f) => s + f.headings.length, 0);
  const statsEl = document.getElementById('tkStats');
  if (statsEl) statsEl.textContent = `${totalFiles} files · ${totalHeadings} headings`;

  if (!files.length) {
    container.innerHTML = '<div style="color:#64748b;text-align:center;padding:3rem">Không tìm thấy file .md nào trong toolkit.</div>';
    return;
  }

  // Group by directory
  const byDir = {};
  for (const file of files) {
    const matchedHeadings = q
      ? file.headings.filter(h => h.text.toLowerCase().includes(q))
      : file.headings;

    if (q && matchedHeadings.length === 0 && !file.fileName.toLowerCase().includes(q)) continue;

    const dir = file.directory || 'root';
    if (!byDir[dir]) byDir[dir] = [];
    byDir[dir].push({ ...file, matchedHeadings });
  }

  if (!Object.keys(byDir).length) {
    container.innerHTML = `<div style="color:#64748b;text-align:center;padding:3rem">Không có kết quả cho "<strong>${esc(q)}</strong>"</div>`;
    return;
  }

  container.innerHTML = Object.entries(byDir)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dir, dirFiles]) => `
      <div>
        <div style="font-size:0.7rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.35rem;padding:0 0.25rem">
          📂 ${esc(dir)}/
        </div>
        <div style="display:flex;flex-direction:column;gap:0.35rem;margin-bottom:1rem">
          ${dirFiles.map(f => renderToolkitFileCard(f, q)).join('')}
        </div>
      </div>
    `).join('');
}

function renderToolkitFileCard(file, q) {
  const isExpanded   = state.tkExpandedFiles.has(file.relPath) || (q && file.matchedHeadings && file.matchedHeadings.length > 0);
  const fileName     = file.fileName || file.relPath.split('/').pop();  // fallback khi index schema cũ
  const sizeKb       = file.sizeBytes > 0 ? (file.sizeBytes / 1024).toFixed(1) + ' KB' : '—';
  const lastMod      = file.lastModified ? new Date(file.lastModified).toLocaleDateString('vi-VN') : '—';
  const headingCount = file.headings.length;
  const linkedCount  = state.items.filter(i => i.mergedIntoFile === file.relPath).length;

  // Dùng JSON.stringify để tránh single-quote breaking trong onclick attribute.
  // esc() convert ' → &#39; nhưng HTML parser decode lại → JS string bị break.
  const safeRelPath = JSON.stringify(file.relPath).replace(/"/g, '&quot;');

  const headingsHtml = isExpanded && file.headings.length > 0
    ? file.headings.map(h => {
        const isMatch   = q && h.text.toLowerCase().includes(q);
        const safeHText = JSON.stringify(h.text).replace(/"/g, '&quot;');
        return `
        <div class="tk-heading-row" style="${isMatch ? 'background:#fbbf2410;color:#fbbf24;' : ''}">
          <span style="color:#475569;font-size:0.65rem;font-family:monospace;flex-shrink:0">L${h.lineNumber}</span>
          <span>## ${q ? highlightMatch(esc(h.text), q) : esc(h.text)}</span>
          <button class="tk-find-btn" onclick="tkFindSource(${safeHText},${safeRelPath})" title="Tìm item gốc trong Knowledge">🔍 Find</button>
        </div>`;
      }).join('')
    : '';

  const toggleIcon = isExpanded ? '▼' : '▶';

  return `
  <div class="tk-file-card">
    <div class="tk-file-header" onclick="toggleTkFile(${safeRelPath})">
      <span style="color:#818cf8">📄</span>
      <span style="font-weight:600;color:${q && fileName.toLowerCase().includes(q) ? '#fbbf24' : 'white'};flex:1">${esc(fileName)}</span>
      <span style="font-size:0.7rem;color:#64748b;flex-shrink:0">${headingCount} headings</span>
      ${linkedCount > 0 ? `<span style="font-size:0.65rem;background:#10b98120;color:#10b981;border:1px solid #10b98140;border-radius:9999px;padding:0 0.35rem;flex-shrink:0">${linkedCount} merged</span>` : ''}
      <span style="font-size:0.7rem;color:#475569;flex-shrink:0;margin-left:0.5rem">${sizeKb}</span>
      <span style="font-size:0.7rem;color:#334155;flex-shrink:0;margin-left:0.5rem">${lastMod}</span>
      <span style="color:#64748b;font-size:0.75rem;margin-left:0.5rem">${toggleIcon}</span>
    </div>
    ${headingsHtml}
  </div>`;
}

function highlightMatch(text, q) {
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark style="background:#fbbf2440;color:#fbbf24;border-radius:2px">$1</mark>');
}

function toggleTkFile(relPath) {
  if (state.tkExpandedFiles.has(relPath)) {
    state.tkExpandedFiles.delete(relPath);
  } else {
    state.tkExpandedFiles.add(relPath);
  }
  renderToolkitExplorer();
}

/**
 * Tìm knowledge item gốc của một heading trong toolkit.
 * Nếu có item với mergedIntoFile trùng relPath → mở detail.
 * Fallback: search theo heading text.
 */
function tkFindSource(headingText, relPath) {
  const byMerge = state.items.find(i => i.mergedIntoFile === relPath);
  if (byMerge) {
    switchView('knowledge');
    openDetail(byMerge.id);
    return;
  }

  // Fallback: switch to knowledge view and search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = headingText;
  state.currentSearch = headingText;
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.hidden = false;
  switchView('knowledge');
  loadKnowledge();
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
init();

// ── Feature 1: Full-text search trong toolkit content ─────────────────────────

async function searchToolkitContent(q) {
  q = (q || '').trim();
  const statusEl = document.getElementById('tkContentSearchStatus');
  const resultsDiv = document.getElementById('tkContentResults');
  if (!q || q.length < 2) {
    if (statusEl) statusEl.textContent = '';
    if (resultsDiv) resultsDiv.hidden = true;
    return;
  }
  if (statusEl) statusEl.textContent = '⏳ Đang tìm...';
  try {
    const results = await api.get(`/api/toolkit/search?q=${encodeURIComponent(q)}`);
    renderContentSearchResults(results, q);
    if (statusEl) statusEl.textContent = results.length ? `${results.length} file có kết quả` : 'Không tìm thấy';
  } catch(e) {
    if (statusEl) statusEl.textContent = '❌ Lỗi: ' + e.message;
  }
}

function renderContentSearchResults(results, q) {
  const container = document.getElementById('tkContentResults');
  const list = document.getElementById('tkContentResultsList');
  if (!container || !list) return;

  if (!results || results.length === 0) {
    container.hidden = true;
    return;
  }

  // Highlight query term trong line text
  function highlight(text, q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'),
      '<mark style="background:#fbbf2440;color:#fbbf24;border-radius:2px;padding:0 2px">$1</mark>');
  }

  list.innerHTML = results.map(r => `
    <div class="content-search-result">
      <div class="content-search-file">
        <span style="color:#818cf8">📄</span>
        <span style="color:#c4b5fd;font-weight:600">${esc(r.fileName)}</span>
        <span style="color:#475569;font-size:0.7rem">${esc(r.directory)}</span>
        <span style="color:#475569;font-size:0.68rem;margin-left:auto">${r.matches.length} kết quả</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:1px">
        ${r.matches.map(m => `
          <div class="content-search-line">
            <span class="content-search-lineno">${m.lineNumber}</span>
            <span class="content-search-text">${highlight(esc(m.lineText.trim()), q)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.hidden = false;
}

// ── Feature 2: Diff view khi Replace section ──────────────────────────────────

/**
 * LCS-based line diff.
 * Returns array of { type: 'same'|'add'|'remove', text: string }
 */
/**
 * LCS-based line diff.
 * Returns array of { type: 'same'|'add'|'remove', text: string }
 */
function computeLineDiff(oldText, newText) {
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');
  const m = oldLines.length, n = newLines.length;

  // Build LCS DP table
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = oldLines[i-1] === newLines[j-1]
        ? dp[i-1][j-1] + 1
        : Math.max(dp[i-1][j], dp[i][j-1]);

  // Backtrack từ (m,n) về (0,0) — thu ops theo thứ tự ngược, rồi reverse
  const ops = [];
  let ii = m, jj = n;
  while (ii > 0 || jj > 0) {
    if (ii > 0 && jj > 0 && oldLines[ii-1] === newLines[jj-1]) {
      ops.push({ type: 'same',   text: oldLines[ii-1] }); ii--; jj--;
    } else if (jj > 0 && (ii === 0 || dp[ii][jj-1] >= dp[ii-1][jj])) {
      ops.push({ type: 'add',    text: newLines[jj-1] }); jj--;
    } else {
      ops.push({ type: 'remove', text: oldLines[ii-1] }); ii--;
    }
  }
  return ops.reverse();
}

function renderDiff(oldText, newText) {
  const ops = computeLineDiff(oldText, newText);
  return ops.map(op => {
    const cls = op.type === 'add' ? 'diff-add' : op.type === 'remove' ? 'diff-remove' : 'diff-same';
    const prefix = op.type === 'add' ? '+' : op.type === 'remove' ? '−' : ' ';
    return `<div class="diff-line ${cls}"><span class="diff-prefix">${prefix}</span><span>${esc(op.text)}</span></div>`;
  }).join('');
}

async function showDiffPanel() {
  if (!_currentPreview) return;
  const panel = document.getElementById('diffPanel');
  const content = document.getElementById('diffContent');
  const loading = document.getElementById('diffLoading');
  if (!panel || !content) return;

  panel.hidden = false;
  if (loading) loading.hidden = false;
  content.innerHTML = '';

  const targetPath = document.getElementById('previewTargetInput')?.value?.trim() || _currentPreview.targetRelPath;
  const headingToReplace = _currentPreview.conflictingHeading
    || extractFirstHeadingFromText(document.getElementById('previewContent')?.value || '');

  if (!targetPath || !headingToReplace) {
    content.innerHTML = '<span style="color:#64748b;font-size:0.75rem">Chưa xác định được section cần replace.</span>';
    if (loading) loading.hidden = true;
    return;
  }

  try {
    const section = await api.get(
      `/api/toolkit/section?path=${encodeURIComponent(targetPath)}&heading=${encodeURIComponent(headingToReplace)}`
    );
    if (loading) loading.hidden = true;
    if (!section.found) {
      content.innerHTML = '<span style="color:#64748b;font-size:0.75rem">Section chưa tồn tại — sẽ append.</span>';
      return;
    }
    const newContent = document.getElementById('previewContent')?.value || '';
    content.innerHTML = renderDiff(section.content, newContent);
  } catch(e) {
    if (loading) loading.hidden = true;
    content.innerHTML = `<span style="color:#f87171;font-size:0.75rem">Lỗi load diff: ${esc(e.message)}</span>`;
  }
}

// ── Feature 3: Stale notification + Re-research Prompt ───────────────────────

/**
 * Sinh re-research prompt cho item stale hiện tại.
 * Gọi khi user bấm "Generate Prompt" trong detail modal.
 */
function showResearchPrompt() {
  const item = state.currentItem;
  if (!item) return;

  const ageDays = item.validatedAt
    ? Math.floor((Date.now() - new Date(item.validatedAt).getTime()) / 86_400_000)
    : Math.floor((Date.now() - new Date(item.researchedAt).getTime()) / 86_400_000);

  const category = item.category || 'dotnet';
  const prompt = [
    `Tôi có một knowledge item đã stale (${ageDays} ngày chưa cập nhật) và cần được re-research.`,
    ``,
    `TOPIC: ${item.topic}`,
    `CATEGORY: ${category}`,
    item.tags?.length ? `TAGS: ${item.tags.join(', ')}` : null,
    item.summary ? `SUMMARY HIỆN TẠI:\n${item.summary}` : null,
    ``,
    `YÊU CẦU:`,
    `1. Research lại topic này theo kiến thức mới nhất (đặc biệt nếu có breaking changes, deprecation, hoặc best practices mới).`,
    `2. So sánh với summary cũ — highlight những gì thay đổi.`,
    `3. Đưa ra kết quả dạng JSON theo schema của file ai-lab/data/${category}/[yyyy-MM]/[topic-slug].json.`,
    `4. Follow workflow trong my-ai-toolkit/07-agents/workflows/research-session.md nếu có.`,
  ].filter(l => l !== null).join('\n');

  const modal = document.getElementById('promptModal');
  const ta = document.getElementById('promptText');
  if (!modal || !ta) return;
  ta.value = prompt;
  modal.hidden = false;
}

function copyPrompt() {
  const ta = document.getElementById('promptText');
  if (!ta) return;
  navigator.clipboard.writeText(ta.value).then(() => {
    const btn = document.querySelector('#promptModal .btn-primary');
    if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000); }
  }).catch(() => {
    ta.select();
    document.execCommand('copy');
  });
}

function closePromptModal() {
  const modal = document.getElementById('promptModal');
  if (modal) modal.hidden = true;
}

function renderRelatedItems(items) {
  const section = document.getElementById("modalRelatedSection");
  const list    = document.getElementById("modalRelatedList");
  if (!section || !list) return;

  if (!items || items.length === 0) {
    section.hidden = true;
    return;
  }

  list.innerHTML = items.map(function(item) {
    var commonTagsTitle = item.commonTags && item.commonTags.length
      ? "Tags chung: " + item.commonTags.join(", ")
      : "Category: " + item.category;
    return "<button class=\"related-chip\"" +
      " title=\"" + esc(commonTagsTitle) + "\"" +
      " onclick=\"openDetail(\'" + esc(item.id) + "\')\">"+
      "<span class=\"related-chip-score\">" + item.score + "</span>" +
      "<span>" + esc(item.topic) + "</span>" +
      "<span class=\"related-chip-cat\">" + esc(item.category) + "</span>" +
      "</button>";
  }).join("");

  section.hidden = false;
}

// ── Feature 2: Session Starter Generator ──────────────────

async function generateSessionStarter() {
  var typeEl  = document.getElementById("sessionStarterType");
  var type    = typeEl ? typeEl.value : "debug";
  var btn     = document.getElementById("sessionStarterBtn");
  var status  = document.getElementById("sessionStarterStatus");

  if (btn) btn.disabled = true;
  if (status) status.textContent = "Dang generate...";

  try {
    var result = await api.get("/api/toolkit/session-starter?type=" + encodeURIComponent(type));
    var srcCount = result.sources ? result.sources.length : 0;
    if (status) status.textContent = srcCount + " sections tu toolkit";

    var modal = document.getElementById("promptModal");
    var ta    = document.getElementById("promptText");
    var title = modal ? modal.querySelector("h3") : null;
    if (modal && ta) {
      if (title) title.textContent = "Session Starter — " + type;
      ta.value = result.prompt || "";
      modal.hidden = false;
    }
  } catch(e) {
    if (status) status.textContent = "Loi: " + e.message;
  } finally {
    if (btn) btn.disabled = false;
  }
}
