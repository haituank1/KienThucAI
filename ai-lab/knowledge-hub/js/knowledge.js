// ── knowledge.js — categories, stats, charts, knowledge list, filters ────────
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

  // ── Tạo lại category sub-items
  state.categories.forEach(cat => {
    const count = getCatTotal(cat.id);
    const div   = document.createElement('div');
    div.className   = `nav-sub-item cat-filter ${state.currentCategory === cat.id ? 'active' : ''}`;
    div.dataset.cat = cat.id;
    div.onclick     = () => filterByCategory(cat.id);
    div.innerHTML   = `
      <span>${cat.icon}</span>
      <span class="nav-sub-label">${esc(cat.label)}</span>
      <span class="nav-sub-count" style="color:${cat.color}">${count}</span>`;
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
  // Auto-switch sang knowledge view nếu đang ở view khác
  if (state.currentView !== 'knowledge') {
    state.items = []; // clear để tránh flash data cũ
    switchView('knowledge');
  }
  state.loadingKnowledge = false;
  loadKnowledge();
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

  // Apply promoted filter (client-side, không mutate state.items)
  var items = state.promotedOnly
    ? state.items.filter(function(i) { return !!state.promotions[i.id]; })
    : state.items;

  if (!items.length) {
    if (container) container.innerHTML = '';
    if (empty) {
      empty.hidden = false;
      empty.textContent = state.promotedOnly ? 'Chưa có item nào được Promote to Rule' : 'Không có kết quả';
    }
    return;
  }
  if (empty) empty.hidden = true;
  if (container) container.innerHTML = items.map(renderKnowledgeCard).join('');
}

function renderKnowledgeCard(item) {
  // Guard: bo qua item thieu du lieu bat buoc (file incomplete/corrupt)
  if (!item || !item.topic || !item.researchedAt) return '';
  const pinned = !!state.promotions[item.id];

  const cat     = state.categories.find(c => c.id === item.category) || { label: item.category, icon: '📚', color: '#6366f1' };
  const resDate = new Date(item.researchedAt);
  // Guard: researchedAt không hợp lệ (DateTime.MinValue từ backend = year 1)
  const dateStr = (isNaN(resDate) || resDate.getFullYear() < 2000)
    ? '??/??'
    : resDate.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' });
  const stale   = isStale(item);
  const staleDays = stale ? Math.floor((Date.now() - new Date(item.validatedAt || item.researchedAt)) / 86_400_000) : 0;

  // Toolkit badge: merged > found > empty
  let tkBadge = '';
  if (item.mergedIntoFile) {
    tkBadge = `<span class="kcard-tk merged-badge" title="Đã merge vào ${esc(item.mergedIntoFile)}">📁 ${esc(item.mergedIntoFile.split('/').pop())}</span>`;
  } else {
    const found = findInToolkitIndex(item.topic);
    if (found.length) {
      tkBadge = `<span class="kcard-tk found-badge" title="Detected in ${esc(found[0].file)}&#10;(best-effort match)">~ ${esc(found[0].file.split('/').pop())}</span>`;
    }
  }

  // Tags (max 3)
  const tagHtml = (item.tags || []).slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join('');

  return `
  <div class="kcard${item.status === 'rejected' ? ' rejected' : ''}" onclick="openDetail('${esc(item.id)}')">
    <div class="kcard-top status-${item.status}"></div>
    <div class="kcard-body">
      <div class="kcard-head">
        <span class="cat-pill" style="background:${cat.color}25;color:${cat.color}">${cat.icon} ${esc(cat.label)}</span>
        <div class="kcard-status">
          <div class="kdot status-${item.status}"></div>
          ${statusLabel(item.status)}
          ${stale ? `<span class="stale-chip" title="Cần review lại">⚠ ${staleDays}d</span>` : ''}
        </div>
      </div>
      <div class="kcard-title">${esc(item.topic)}</div>
      ${item.summary ? `<div class="kcard-desc">${esc(item.summary)}</div>` : ''}
      ${tagHtml ? `<div class="kcard-tags">${tagHtml}</div>` : ''}
      <div class="kcard-footer">
        <div>${renderStars(item.id, state.ratings[item.id] || 0, false, '0.82rem')}</div>
        <div class="kcard-right">
          ${tkBadge}
          ${pinned ? '<span class="pin-badge" title="Promoted to Rule">📌</span>' : ''}
          <span class="kcard-date">${dateStr}</span>
        </div>
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

/**
 * Set status filter: cập nhật state + hidden select + active chip UI + reload.
 * Dùng bởi: filter chips onclick, filterStale(), viewAllPending().
 */
function setStatusFilter(val) {
  state.currentStatus = val;
  const sel = document.getElementById('statusFilter');
  if (sel) sel.value = val;
  document.querySelectorAll('.filter-chip[data-status]').forEach(el =>
    el.classList.toggle('active', el.dataset.status === val));
  state.loadingKnowledge = false;
  loadKnowledge();
}

function applyFilters() {
  // Đọc từ state.currentStatus (đã set bởi setStatusFilter)
  loadKnowledge();
}
function togglePromotedFilter() {
  state.promotedOnly = !state.promotedOnly;
  var btn = document.getElementById('promotedFilterBtn');
  if (btn) btn.classList.toggle('active', state.promotedOnly);
  updateSearchResultCount();
  renderKnowledge();
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
  const hasFilter = state.currentSearch || state.currentStatus || state.currentCategory || state.promotedOnly;
  if (hasFilter) {
    var count = state.promotedOnly
      ? state.items.filter(function(i) { return !!state.promotions[i.id]; }).length
      : state.items.length;
    el.hidden = false;
    el.textContent = count + ' kết quả' + (state.promotedOnly ? ' 📌' : '');
  } else {
    el.hidden = true;
  }
}

/** Shortcut từ dashboard: click Stale stat card */
function filterStale() {
  state.items = []; // clear trước để tránh flash wrong items khi switchView gọi renderKnowledge
  switchView('knowledge');
  setStatusFilter('stale');
}


async function loadRatings() {
  try {
    const data = await api.get('/api/ratings');
    state.ratings = data || {};
  } catch {
    state.ratings = {};
  }
}

function viewAllPending() {
  if (state.currentView !== 'knowledge') {
    state.items = [];
    switchView('knowledge');
  }
  state.currentCategory = '';
  document.querySelectorAll('.cat-filter').forEach(el =>
    el.classList.toggle('active', el.dataset.cat === ''));
  setStatusFilter('pending_review');
}
