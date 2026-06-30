// ── queue.js — research queue view and add-topic modal ──────────────────────
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

