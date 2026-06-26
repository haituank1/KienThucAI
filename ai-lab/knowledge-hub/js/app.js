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
  loadingKnowledge:  false   // guard: tránh concurrent loadKnowledge calls
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
  // Load all data in parallel
  await Promise.all([loadCategories(), loadStats(), loadKnowledge()]);
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
  setText('statStreak',     s.validatedStreak > 0 ? `${s.validatedStreak} 🔥` : '0');

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
    if (state.currentStatus)   params.set('status',   state.currentStatus);
    if (state.currentSearch)   params.set('search',   state.currentSearch);

    state.items = await api.get('/api/knowledge?' + params);
    renderKnowledge();
    renderPendingPreview();
    // Không gọi renderCategoryFilters() ở đây — sẽ được gọi sau renderStats()
    // Nếu stats chưa có thì gọi luôn
    if (state.stats) renderCategoryFilters();
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
  const cat      = state.categories.find(c => c.id === item.category) || { label: item.category, icon: '📚', color: '#6366f1' };
  const conf     = Math.round((item.confidence || 0) * 100);
  const confColor = conf >= 80 ? '#10b981' : conf >= 60 ? '#fbbf24' : '#ef4444';
  const dateStr  = new Date(item.researchedAt).toLocaleDateString('vi-VN');

  return `
  <div class="card" style="cursor:pointer" onclick="openDetail('${esc(item.id)}')">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:0.5rem">
      <span class="cat-badge" style="background:${cat.color}30;color:${cat.color};border:1px solid ${cat.color}50">${cat.icon} ${esc(cat.label)}</span>
      <span class="status-badge status-${item.status}">${statusLabel(item.status)}</span>
    </div>
    <h3 style="font-weight:600;color:white;font-size:0.875rem;margin:0 0 0.25rem;line-height:1.4">${esc(item.topic)}</h3>
    <p style="font-size:0.75rem;color:#94a3b8;margin:0 0 0.5rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(item.summary)}</p>
    <div class="confidence-bar" style="margin-bottom:0.5rem">
      <div class="confidence-fill" style="width:${conf}%;background:${confColor}"></div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;flex-wrap:wrap;gap:0.25rem">
        ${(item.tags || []).slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
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

// ── Filters ───────────────────────────────────────────────────────────────────
function applyFilters() {
  state.currentStatus = document.getElementById('statusFilter').value;
  loadKnowledge();
}

function debounceSearch(val) {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => {
    state.currentSearch = val;
    loadKnowledge();
  }, 400);
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

  // Toolkit target
  const tkSection = document.getElementById('modalToolkitSection');
  if (item.validation && item.validation.toolkitTarget) {
    tkSection.hidden = false;
    setText('modalToolkitTarget', item.validation.toolkitTarget);
  } else { tkSection.hidden = true; }

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

async function showToolkitPreview(item) {
  try {
    const preview = await api.get(`/api/knowledge/${item.id}/toolkit-preview`);
    _currentPreview = { ...preview, itemId: item.id };

    // Target path
    document.getElementById('previewTargetPath').textContent =
      `my-ai-toolkit / ${preview.targetRelPath}`;

    // File info
    const fileInfo = document.getElementById('previewFileInfo');
    if (preview.fileExists) {
      fileInfo.innerHTML = `📄 File tồn tại — hiện có <strong>${preview.existingLineCount}</strong> dòng. Nội dung mới sẽ được <strong>append</strong> xuống cuối.`;
    } else {
      fileInfo.innerHTML = `🆕 File chưa tồn tại — sẽ được <strong>tạo mới</strong>.`;
    }

    // Duplicate warning
    const dupEl = document.getElementById('previewDupWarning');
    if (preview.hasDuplicate) {
      dupEl.hidden = false;
      dupEl.textContent = preview.duplicateWarning;
    } else {
      dupEl.hidden = true;
    }

    // Editable content
    document.getElementById('previewContent').value = preview.content;

    // Reset status
    document.getElementById('mergeStatus').textContent = '';
    document.getElementById('btnConfirmMerge').disabled = false;

    document.getElementById('toolkitPreviewModal').hidden = false;
  } catch(e) {
    // toolkitTarget không set → không show modal, đó là bình thường
    console.info('No toolkit preview:', e.message);
  }
}

async function confirmMergeToToolkit() {
  if (!_currentPreview) return;

  const btn     = document.getElementById('btnConfirmMerge');
  const statusEl = document.getElementById('mergeStatus');
  const content = document.getElementById('previewContent').value;

  btn.disabled = true;
  statusEl.textContent = '⏳ Đang lưu...';
  statusEl.style.color = '#94a3b8';

  try {
    // Cần item ID — lưu trong _currentPreview.itemId (set khi showToolkitPreview)
    const result = await _mergeToToolkit(_currentPreview.itemId, {
      targetAbsPath: _currentPreview.targetAbsPath,
      targetRelPath: _currentPreview.targetRelPath,
      content
    });

    if (result.success) {
      statusEl.textContent = `✅ ${result.message}`;
      statusEl.style.color = '#34d399';
      btn.textContent = '✅ Đã lưu';
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

// Merge endpoint path cần item ID — fix lại route call
// Override api.post với path correct
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
function loadQueue() {
  const container = document.getElementById('queueContent');
  if (!container) return;

  const pending   = state.items.filter(i => i.status === 'pending_review');
  const validated = state.items.filter(i => i.status === 'validated');

  container.innerHTML = `
    <div>
      <div style="font-weight:500;color:#cbd5e1;margin-bottom:0.75rem">📊 Tóm tắt hiện tại</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-bottom:1rem">
        <div style="background:#1e293b;border-radius:0.375rem;padding:0.75rem;text-align:center">
          <div style="font-weight:700;color:#fbbf24">${pending.length}</div>
          <div style="font-size:0.7rem;color:#64748b">Pending</div>
        </div>
        <div style="background:#1e293b;border-radius:0.375rem;padding:0.75rem;text-align:center">
          <div style="font-weight:700;color:#10b981">${validated.length}</div>
          <div style="font-size:0.7rem;color:#64748b">Validated</div>
        </div>
        <div style="background:#1e293b;border-radius:0.375rem;padding:0.75rem;text-align:center">
          <div style="font-weight:700;color:#818cf8">${state.stats ? state.stats.total : state.items.length}</div>
          <div style="font-size:0.7rem;color:#64748b">Total</div>
        </div>
      </div>
      <div style="border-top:1px solid #334155;padding-top:0.75rem">
        <div style="font-weight:500;color:#cbd5e1;margin-bottom:0.5rem">📋 Đang chờ validate</div>
        ${pending.length === 0
          ? '<div style="color:#64748b;font-size:0.875rem">Không có item pending 🎉</div>'
          : pending.map(i => `
            <div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;cursor:pointer;color:#94a3b8"
                 onclick="switchView('knowledge');openDetail('${esc(i.id)}')">
              <span style="color:#fbbf24">⏳</span>
              <span style="flex:1">${esc(i.topic)}</span>
              <span style="font-size:0.7rem">${Math.round((i.confidence || 0) * 100)}%</span>
            </div>`).join('')}
      </div>
    </div>`;
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

// ── Bootstrap ─────────────────────────────────────────────────────────────────
init();
