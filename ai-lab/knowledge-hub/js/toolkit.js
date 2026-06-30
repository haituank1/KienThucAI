// ── toolkit.js — toolkit index, settings, category management ───────────────
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

