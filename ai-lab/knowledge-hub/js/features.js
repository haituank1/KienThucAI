// ── features.js — full-text search, diff view, re-research prompt, session starter
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

// ── Feature 3: Stale — Re-research Prompt ────────────────────────

function showResearchPrompt() {
  const item = state.currentItem;
  if (!item) return;

  const versions = Object.entries(item.techVersions || {})
    .map(([k,v]) => `${k}: ${v}`).join(', ') || 'chưa rõ';

  const prompt =
`Thực hiện re-research cho topic đã stale:

TOPIC: ${item.topic}
CATEGORY: ${item.category}
SUBCATEGORY: ${item.subcategory || ''}
CURRENT SUMMARY: ${item.summary}
TECH VERSIONS: ${versions}

Yêu cầu:
1. Kiểm tra xem kiến thức này còn đúng với .NET/PostgreSQL phiên bản mới nhất không
2. Cập nhật code example nếu có breaking change
3. Bổ sung trade-offs hoặc caveats mới phát sinh
4. Cập nhật trường techVersions nếu cần
5. Giữ nguyên id: ${item.id}

Follow workflow trong my-ai-toolkit/07-agents/workflows/research-session.md.
Lưu kết quả đè lên file: data/${item.category}/[yyyy-MM]/${item.id}.json`;

  document.getElementById('promptModalTitle').textContent = '📋 Re-research Prompt';
  document.getElementById('promptText').value = prompt;
  document.getElementById('promptModal').hidden = false;
}

function closePromptModal() {
  document.getElementById('promptModal').hidden = true;
}

function copyPrompt() {
  const text = document.getElementById('promptText').value;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('#promptModal .btn-primary');
    const orig = btn.textContent;
    btn.textContent = '✅ Đã copy!';
    setTimeout(() => { btn.textContent = orig; }, 1800);
  }).catch(() => alert('Copy thất bại. Vui lòng copy thủ công.'));
}

// ── Session Starter ────────────────────────────────────────────────────────────────────────────────────

async function generateSessionStarter() {
  const type   = document.getElementById('sessionStarterType')?.value || 'debug';
  const btn    = document.getElementById('sessionStarterBtn');
  const status = document.getElementById('sessionStarterStatus');

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang tạo...'; }
  if (status) status.textContent = '';

  try {
    const result = await api.get(`/api/toolkit/session-starter?type=${encodeURIComponent(type)}`);
    const prompt = result.prompt || '';

    await navigator.clipboard.writeText(prompt);
    if (status) status.textContent = '✅ Đã copy vào clipboard! Paste vào Claude để bắt đầu session.';

    document.getElementById('promptModalTitle').textContent = '🚀 Session Starter — ' + type;
    document.getElementById('promptText').value = prompt;
    document.getElementById('promptModal').hidden = false;

  } catch(e) {
    if (status) status.textContent = '❌ Lỗi: ' + e.message;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '⚡ Generate'; }
  }
}

