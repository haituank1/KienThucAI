// ── merge.js — toolkit merge flow, demo preview ─────────────────────────────
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

