// ── rating.js — star rating per knowledge item ──────────────────────────────
// ── Star Rating ──────────────────────────────────────────────────────────────

async function loadRatings() {
  // Dung fetch truc tiep thay vi api.get() de tranh _handle401 logout
  try {
    const r = await fetch(API_BASE + '/api/ratings', {
      headers: auth.token ? { 'Authorization': 'Bearer ' + auth.token } : {}
    });
    if (!r.ok) { state.ratings = {}; return; }
    state.ratings = await r.json();
  } catch {
    state.ratings = {};
  }
}

function renderStars(itemId, currentStars, interactive = false, size = '0.9rem') {
  const cls   = `star-widget${interactive ? ' interactive' : ''}`;
  const inner = [1,2,3,4,5].map(n => {
    const filled  = n <= currentStars;
    const onClick = interactive
      ? `onclick="event.stopPropagation();setRating('${itemId}',${n === currentStars ? 0 : n})"`
      : `onclick="event.stopPropagation();openDetail('${itemId}')"`;
    const onHover = interactive ? `onmouseenter="hoverStars(${n})" ` : '';
    return `<span ${onClick} ${onHover}class="star${filled ? ' filled' : ''}" style="font-size:${size};cursor:pointer" title="${n} sao">&#9733;</span>`;
  }).join('');
  return `<div class="${cls}" onmouseleave="${interactive ? `resetStarHover('${itemId}')` : ''}" style="display:inline-flex;gap:1px;align-items:center">${inner}</div>`;
}

function hoverStars(n) {
  document.querySelectorAll('.star-widget.interactive .star').forEach((el, i) => {
    el.classList.toggle('filled', i < n);
  });
}

function resetStarHover(itemId) {
  const current = state.ratings[itemId] || 0;
  document.querySelectorAll('.star-widget.interactive .star').forEach((el, i) => {
    el.classList.toggle('filled', i < current);
  });
}

async function setRating(itemId, stars) {
  const prev = state.ratings[itemId] || 0;
  if (stars === 0) delete state.ratings[itemId];
  else state.ratings[itemId] = stars;

  renderKnowledge();
  updateModalStars(itemId);

  try {
    await api.put(`/api/ratings/${encodeURIComponent(itemId)}`, { stars });
  } catch(e) {
    if (prev) state.ratings[itemId] = prev;
    else delete state.ratings[itemId];
    renderKnowledge();
    updateModalStars(itemId);
  }
}

function updateModalStars(itemId) {
  const el = document.getElementById('modalStarWidget');
  if (!el || !state.currentItem || state.currentItem.id !== itemId) return;
  el.innerHTML = renderStars(itemId, state.ratings[itemId] || 0, true, '1.4rem');
}
