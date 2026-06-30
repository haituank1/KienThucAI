// -- init.js: loadPartials(), init(), switchView(), bootstrap --

// -- Partial loader --------------------------------------------------------
async function loadPartials() {
  const get = url => fetch(url).then(r => {
    if (!r.ok) throw new Error('Partial not found: ' + url);
    return r.text();
  });

  const results = await Promise.all([
    get('/partials/sidebar.html'),
    get('/partials/view-dashboard.html'),
    get('/partials/view-knowledge.html'),
    get('/partials/view-queue.html'),
    get('/partials/view-toolkit.html'),
    get('/partials/view-settings.html'),
    get('/partials/modals.html'),
  ]);

  document.getElementById('sidebar').innerHTML     = results[0];
  document.getElementById('mainArea').innerHTML    = results[1] + results[2] + results[3] + results[4] + results[5];
  document.getElementById('modalsMount').innerHTML = results[6];
}

// -- App init --------------------------------------------------------------
async function init() {
  try {
    await api.get('/api/health');
    setConnectionStatus(true);
  } catch {
    setConnectionStatus(false);
    return;
  }
  await Promise.all([loadCategories(), loadStats(), loadKnowledge(), loadRatings()]);
  loadToolkitIndex(); // fire-and-forget
}

function setConnectionStatus(ok) {
  const el = document.getElementById('connectionStatus');
  if (!el) return;
  if (ok) {
    el.innerHTML = '<span class="conn-dot" style="background:#34d399"></span>'
      + ' <span style="color:#34d399">Connected</span>';
    return;
  }
  el.innerHTML = '<span class="conn-dot" style="background:#f87171"></span>'
    + ' <span style="color:#f87171">Offline</span>';

  const dashEl = document.getElementById('view-dashboard');
  if (!dashEl) return;

  const origin = (typeof API_BASE !== 'undefined' && API_BASE) || window.location.origin;
  dashEl.innerHTML = [
    '<div style="max-width:480px;margin:2.5rem auto" class="card">',
    '<div style="color:#f87171;font-weight:700;font-size:1rem;margin-bottom:0.75rem">',
    '&#9888; Khong ket noi duoc DemoEngine</div>',
    '<div style="font-size:0.82rem;color:#cbd5e1;line-height:1.9">',
    '<div><strong>1.</strong> Mo terminal, chay:</div>',
    '<div class="code-block" style="font-size:0.75rem;margin:0.5rem 0">',
    'cd C:\\_Claude_code\\KienThucAI\\ai-lab\\demo-engine\n',
    'dotnet run --project src\\DemoEngine.API</div>',
    '<div><strong>2.</strong> Cho thay DemoEngine &#8594; http://localhost:5001</div>',
    '<div style="margin-top:0.5rem"><strong>3.</strong> Mo: ',
    '<a href="http://localhost:5001" style="color:#818cf8">http://localhost:5001</a></div>',
    '<div style="color:#fbbf24;font-size:0.72rem;margin-top:0.75rem">',
    '&#9888; Khong mo file index.html truc tiep - phai dung localhost:5001</div>',
    '</div>',
    '<div style="margin-top:1rem;display:flex;align-items:center;gap:0.75rem">',
    '<button class="btn btn-primary" onclick="location.reload()">&#8635; Thu lai</button>',
    '<span style="font-size:0.7rem;color:#64748b">&#8594; ' + origin + '</span>',
    '</div></div>'
  ].join('');
}

// -- View switching --------------------------------------------------------
function switchView(view) {
  state.currentView = view;

  document.querySelectorAll('[data-view]').forEach(function(el) {
    el.classList.toggle('active', el.dataset.view === view);
  });

  // Dashboard: display:block (inner uses CSS grid)
  // Other views: display:flex (flex-column layout)
  var flexViews = { knowledge: 1, queue: 1, toolkit: 1, settings: 1 };
  document.querySelectorAll('[id^="view-"]').forEach(function(el) {
    if (el.id !== 'view-' + view) {
      el.style.display = 'none';
    } else {
      el.style.display = flexViews[view] ? 'flex' : 'block';
    }
  });

  if (view === 'settings') loadSettings();
  if (view === 'queue')    loadQueue();
  if (view === 'toolkit')  loadToolkitExplorer();
  if (view === 'knowledge') renderKnowledge();
}

// -- Bootstrap -------------------------------------------------------------
(function() {
  loadPartials().then(function() {
    authInit();
  }).catch(function(e) {
    document.body.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:center;',
      'height:100vh;background:#020617;color:#f87171;font-family:system-ui">',
      '<div style="text-align:center">',
      '<div style="font-size:1.5rem;margin-bottom:0.5rem">&#9888; Loi tai partials</div>',
      '<div style="font-size:0.875rem;color:#94a3b8">' + (e.message || '') + '</div>',
      '<div style="font-size:0.75rem;color:#64748b;margin-top:0.5rem">',
      'Dam bao mo qua http://localhost:5001 (khong phai file://)</div>',
      '</div></div>'
    ].join('');
  });
}());
