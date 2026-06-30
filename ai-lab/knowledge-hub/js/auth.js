// ── auth.js — authentication, login/logout, token management ───────────────
// ── Auth ─────────────────────────────────────────────────────────────────────
const auth = {
  token:       null,
  user:        null,  // { userId, username, displayName, role }

  load() {
    this.token = localStorage.getItem('kh_token');
    try { this.user = JSON.parse(localStorage.getItem('kh_user') || 'null'); } catch { this.user = null; }
  },
  save(token, user) {
    this.token = token;
    this.user  = user;
    localStorage.setItem('kh_token', token);
    localStorage.setItem('kh_user',  JSON.stringify(user));
  },
  clear() {
    this.token = null;
    this.user  = null;
    localStorage.removeItem('kh_token');
    localStorage.removeItem('kh_user');
  },
  isLoggedIn() { return !!this.token; }
};

async function authInit() {
  auth.load();
  if (!auth.isLoggedIn()) { showLoginOverlay(); return; }

  // Verify token còn hợp lệ với server
  try {
    await fetch(API_BASE + '/api/auth/me', {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    }).then(r => { if (!r.ok) throw new Error('invalid'); });
    showApp();
    updateSidebarUser();
    await init();
  } catch {
    auth.clear();
    showLoginOverlay();
  }
}

async function submitLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  const btn      = document.getElementById('loginBtn');

  errEl.hidden = true;
  if (!username || !password) {
    errEl.textContent = 'Vui lòng nhập username và password';
    errEl.hidden = false;
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Đang đăng nhập...';

  try {
    const res = await fetch(API_BASE + '/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password })
    });

    if (res.status === 401) {
      errEl.textContent = 'Username hoặc password không đúng';
      errEl.hidden = false;
      return;
    }
    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    auth.save(data.token, {
      userId:      data.userId,
      username:    data.username,
      displayName: data.displayName,
      role:        data.role
    });

    showApp();
    updateSidebarUser();
    await init();

  } catch (e) {
    errEl.textContent = 'Lỗi kết nối: ' + e.message;
    errEl.hidden = false;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Đăng nhập';
  }
}

function logout() {
  auth.clear();
  // Reset state
  state.items = [];
  state.stats = null;
  state.categories = [];
  showLoginOverlay();
}

function showLoginOverlay() {
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('appShell').style.display     = 'none';
  setTimeout(() => document.getElementById('loginUsername').focus(), 100);
}

function showApp() {
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('appShell').style.display     = 'flex';
}

function updateSidebarUser() {
  if (!auth.user) return;
  const el = document.getElementById('sidebarUser');
  el.hidden = false;
  el.style.display = 'flex';
  document.getElementById('sidebarUserName').textContent = auth.user.displayName || auth.user.username;
  document.getElementById('sidebarUserRole').textContent = auth.user.role;
  document.getElementById('sidebarUserAvatar').textContent =
    (auth.user.displayName || auth.user.username).charAt(0).toUpperCase();
}

