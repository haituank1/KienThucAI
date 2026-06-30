// ── utils.js — shared helper functions ─────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
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

