// -- promotion.js: Promote to Rule feature --

async function loadPromotions() {
  try {
    state.promotions = await api.get('/api/promotions');
  } catch {
    state.promotions = {};
  }
}

async function togglePromote(itemId) {
  const isPromoted = !!state.promotions[itemId];
  try {
    if (isPromoted) {
      await api.del('/api/promotions/' + itemId);
      delete state.promotions[itemId];
    } else {
      const res = await api.post('/api/promotions/' + itemId, {});
      state.promotions[itemId] = res.promotedAt || new Date().toISOString();
    }
    // Cap nhat UI: nut trong modal + badge tren card
    refreshPromoteBtn(itemId);
    renderKnowledge(); // re-render cards de cap nhat badge
  } catch(e) {
    alert('Loi promotion: ' + e.message);
  }
}

function refreshPromoteBtn(itemId) {
  const btn = document.getElementById('modalPromoteBtn');
  if (!btn || btn.dataset.itemId !== itemId) return;
  const promoted = !!state.promotions[itemId];
  btn.dataset.promoted = promoted ? '1' : '0';
  btn.dataset.label    = promoted ? 'Unpromote' : 'Promote to Rule';
  btn.title            = promoted ? 'Bo khoi danh sach Rule' : 'Them vao danh sach Rule';
  btn.classList.toggle('is-promoted', promoted);
}

function renderPromoteBtn(item) {
  if (item.status !== 'validated') return '';
  const promoted = !!state.promotions[item.id];
  return '<button id="modalPromoteBtn"'
    + ' class="btn-pin' + (promoted ? ' is-promoted' : '') + '"'
    + ' data-item-id="' + esc(item.id) + '"'
    + ' data-promoted="' + (promoted ? '1' : '0') + '"'
    + ' data-label="' + (promoted ? 'Unpromote' : 'Promote to Rule') + '"'
    + ' title="' + (promoted ? 'Bo khoi danh sach Rule' : 'Them vao danh sach Rule') + '"'
    + ' onclick="togglePromote(\'' + esc(item.id) + '\')">'
    + '</button>';
}
