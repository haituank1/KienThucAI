// ── api.js — HTTP client with auth headers ─────────────────────────────────
// ── API client ────────────────────────────────────────────────────────────────
const api = {
  _headers(extra = {}) {
    const h = { ...extra };
    if (auth.token) h['Authorization'] = `Bearer ${auth.token}`;
    return h;
  },
  _handle401(r) {
    if (r.status === 401) { auth.clear(); showLoginOverlay(); return true; }
    return false;
  },
  async get(path) {
    const r = await fetch(API_BASE + path, { headers: this._headers() });
    if (this._handle401(r)) throw new Error('Unauthorized');
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(API_BASE + path, {
      method: 'POST',
      headers: this._headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });
    if (this._handle401(r)) throw new Error('Unauthorized');
    if (!r.ok) { const t = await r.text(); throw new Error(t || r.statusText); }
    return r.json();
  },
  async put(path, body) {
    const r = await fetch(API_BASE + path, {
      method: 'PUT',
      headers: this._headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });
    if (this._handle401(r)) throw new Error('Unauthorized');
    if (!r.ok) { const t = await r.text(); throw new Error(t || r.statusText); }
    return r.json();
  },
  async del(path) {
    const r = await fetch(API_BASE + path, { method: 'DELETE', headers: this._headers() });
    if (this._handle401(r)) return false;
    return r.ok;
  }
};

