// -- detail.js: knowledge item detail modal and validation --

// Map category ID to Prism language string
function categoryToLang(catId) {
  var map = {
    dotnet: 'csharp', csharp: 'csharp',
    postgresql: 'sql', sql: 'sql',
    architecture: 'csharp',
    tools: 'bash', docker: 'bash', shell: 'bash',
    json: 'json', javascript: 'javascript', typescript: 'typescript'
  };
  return map[(catId || '').toLowerCase()] || 'csharp';
}

// Render related items in detail modal cross-reference section
function renderRelatedItems(related) {
  var relSection = document.getElementById('modalRelatedSection');
  var relList    = document.getElementById('modalRelatedList');
  if (!relSection || !relList) return;
  if (!related || !related.length) {
    relSection.hidden = true;
    return;
  }
  relSection.hidden = false;
  relList.innerHTML = related.map(function(r) {
    var cat  = state.categories.find(function(c) { return c.id === r.category; });
    var icon = cat ? cat.icon : '\u{1F4C4}';
    return '<span class="related-chip" onclick="closeDetailModal();openDetail(\'' + esc(r.id) + '\')">'
      + icon + ' ' + esc(r.topic) + '</span>';
  }).join('');
}

// -- Detail modal ------------------------------------------------------------
async function openDetail(id) {
  let item;
  try {
    item = await api.get('/api/knowledge/' + id);
  } catch(e) {
    alert('Khong the load chi tiet: ' + e.message);
    return;
  }
  state.currentItem = item;

  const cat = state.categories.find(c => c.id === item.category)
    || { label: item.category, icon: '\u{1F4DA}', color: '#6366f1' };

  // Header
  const catBadge = document.getElementById('modalCatBadge');
  catBadge.textContent = cat.icon + ' ' + cat.label;
  catBadge.style.cssText = 'background:' + cat.color + '30;color:' + cat.color + ';border:1px solid ' + cat.color + '50';

  const statusBadge = document.getElementById('modalStatusBadge');
  statusBadge.textContent = statusLabel(item.status);
  statusBadge.className = 'status-badge status-' + item.status;

  setText('modalDifficulty', '\u{1F4CA} ' + (item.difficulty || 'intermediate'));
  setText('modalTopic', item.topic);

  var dateStr = 'Researched: ' + new Date(item.researchedAt).toLocaleDateString('vi-VN');
  if (item.validatedAt) {
    dateStr += ' · Validated: ' + new Date(item.validatedAt).toLocaleDateString('vi-VN')
      + ' by ' + (item.validatedBy || '—');
  }
  setText('modalDate', dateStr);

  // Star rating
  const starEl = document.getElementById('modalStarWidget');
  if (starEl) starEl.innerHTML = renderStars(item.id, state.ratings[item.id] || 0, true, '1.4rem');

  // Confidence bar
  const conf      = Math.round((item.confidence || 0) * 100);
  const confColor = conf >= 80 ? '#10b981' : conf >= 60 ? '#fbbf24' : '#ef4444';
  const fill = document.getElementById('modalConfidenceFill');
  if (fill) fill.style.cssText = 'width:' + conf + '%;background:' + confColor;
  setText('modalConfidenceText', conf + '%');

  setText('modalSummary',  item.summary  || '');
  setText('modalProblem',  item.problem  || '');
  setText('modalSolution', item.solution || '');

  // Code example with Prism.js syntax highlighting
  const codeSection = document.getElementById('modalCodeSection');
  if (item.codeExample) {
    codeSection.hidden = false;
    const raw = item.codeExample.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();

    // Detect language: explicit fence first, then category fallback
    const fenceMatch = item.codeExample.match(/^```(\w+)/);
    const fenceLang  = fenceMatch ? fenceMatch[1].toLowerCase() : '';
    const aliases    = { cs: 'csharp', js: 'javascript', py: 'python', sh: 'bash', ts: 'typescript' };
    const lang       = (fenceLang && aliases[fenceLang]) || fenceLang || categoryToLang(item.category);

    const codeEl = document.getElementById('modalCode');
    codeEl.className   = 'code-block language-' + lang;
    codeEl.textContent = raw;  // textContent is XSS-safe, Prism will replace innerHTML

    if (typeof Prism !== 'undefined') {
      Prism.highlightElement(codeEl);
    }
  } else {
    codeSection.hidden = true;
  }

  // Tradeoffs
  const tradeoffsSection = document.getElementById('modalTradeoffsSection');
  if (item.tradeoffs && item.tradeoffs.length) {
    tradeoffsSection.hidden = false;
    document.getElementById('modalTradeoffs').innerHTML =
      item.tradeoffs.map(t => '<li style="margin-bottom:0.25rem">' + esc(t) + '</li>').join('');
  } else { tradeoffsSection.hidden = true; }

  // References
  const refsSection = document.getElementById('modalRefsSection');
  if (item.references && item.references.length) {
    refsSection.hidden = false;
    document.getElementById('modalRefs').innerHTML = item.references.map(function(r) {
      return '<a href="' + esc(r.url) + '" target="_blank" rel="noopener"'
        + ' style="color:#818cf8;font-size:0.875rem;display:flex;align-items:center;gap:0.25rem;text-decoration:none">'
        + '\u{1F517} ' + esc(r.title) + '</a>';
    }).join('');
  } else { refsSection.hidden = true; }

  // Self verification
  const verifSection = document.getElementById('modalVerifSection');
  if (item.selfVerification && item.selfVerification.method) {
    verifSection.hidden = false;
    document.getElementById('modalVerif').innerHTML =
      '<div>' + (item.selfVerification.verified ? '✅' : '⚠️')
      + ' ' + esc(item.selfVerification.method) + '</div>'
      + (item.selfVerification.caveats
          ? '<div style="color:#fbbf24;margin-top:4px">⚠️ ' + esc(item.selfVerification.caveats) + '</div>'
          : '');
  } else { verifSection.hidden = true; }

  // Demo
  const demoSection = document.getElementById('modalDemoSection');
  if (item.demo && item.demo.exists) {
    demoSection.hidden = false;
    setText('modalDemoInfo', item.demo.description || '');
  } else { demoSection.hidden = true; }

  // Tags
  document.getElementById('modalTags').innerHTML =
    (item.tags || []).map(t => '<span class="tag">' + esc(t) + '</span>').join('');

  // Tech versions
  const versionsSection = document.getElementById('modalVersionsSection');
  if (item.techVersions && Object.keys(item.techVersions).length > 0) {
    versionsSection.hidden = false;
    document.getElementById('modalVersions').innerHTML =
      Object.entries(item.techVersions)
        .map(([k, v]) => '<span class="version-badge">' + esc(k) + ': ' + esc(v) + '</span>')
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
    var mergedDate = item.mergedAt ? new Date(item.mergedAt).toLocaleDateString('vi-VN') : '—';
    setText('modalMergedInfo', item.mergedIntoFile + ' · ' + mergedDate);
  } else { mergedSection.hidden = true; }

  // Cross-reference: load related items (fire-and-forget, optional)
  const relSection = document.getElementById('modalRelatedSection');
  if (relSection) relSection.hidden = true;
  api.get('/api/knowledge/' + id + '/related?limit=6')
    .then(related => renderRelatedItems(related))
    .catch(() => {});

  // Action buttons
  const actions   = document.getElementById('modalActions');
  const isPending = item.status === 'pending_review' || item.status === 'needs_rework';
  actions.innerHTML = [
        isPending ? '<button class="btn btn-success" onclick="showValidateForm(\'validated\')">Validate</button>' : '',
    isPending ? '<button class="btn btn-danger"  onclick="showValidateForm(\'rejected\')">Reject</button>' : '',
    isPending ? '<button class="btn btn-warning" onclick="showValidateForm(\'needs_rework\')">Needs Rework</button>' : '',
    item.demo && item.demo.exists ? '<button class="btn btn-primary" onclick="openDemoFromModal()">Xem Demo</button>' : '',
    item.status === 'validated' ? '<button class="btn btn-ghost" onclick="showValidateForm(\'pending_review\')">Reset Pending</button>' : ''
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
    const updated = await api.put('/api/knowledge/' + state.currentItem.id + '/status', { status, notes });
    closeDetailModal();
    state.loadingKnowledge = false;
    await Promise.all([loadStats(), loadKnowledge()]);

    if (status === 'validated' && updated.validation && updated.validation.toolkitTarget) {
      await showToolkitPreview(updated);
    }
  } catch(e) {
    alert('Loi khi luu: ' + e.message);
  }
}
