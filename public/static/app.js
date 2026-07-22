/* ============================================================
   EcoTwin v6.1 — Neural Command Center Platform
   LIVE APIs: Gemini AI | Open-Meteo | REST Countries | Carbon Market
   Real-time SSE | Live KPIs | Dynamic Market Ticker
   ============================================================ */
'use strict';

// ─── Global State ────────────────────────────────────────────────────────────
const ST = {
  activeTab: 'dashboard',
  lang: localStorage.getItem('ecotwin_lang') || 'en',
  theme: localStorage.getItem('ecotwin_theme') || 'dark',
  token: localStorage.getItem('ecotwin_token') || null,
  user: JSON.parse(localStorage.getItem('ecotwin_user') || 'null'),
  worldData: [],
  anomalyData: [],
  sdgData: null,
  realtimeData: [],
  simResult: null,
  rlResult: null,
  compareResult: null,
  enterpriseData: null,
  historyData: null,
  shapData: null,
  i18n: {},
  globeAnimFrame: null,
  globeRotating: true,
  realtimeInterval: null,
  tickerInterval: null,
  dashboardInterval: null,
  sseSource: null,
  marketData: null,
  tickerData: null,
  weatherData: {},
  lastWorldUpdate: 0,
  charts: {},
};

// ─── Live SSE Connection ──────────────────────────────────────────────────────
function startSSE() {
  if (ST.sseSource) { ST.sseSource.close(); ST.sseSource = null; }
  try {
    ST.sseSource = new EventSource('/sse/live');
    ST.sseSource.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        // Update live ticker bar with SSE data
        updateTickerFromSSE(d);
      } catch { }
    };
    ST.sseSource.onerror = () => {
      // Auto-reconnect after 5s
      setTimeout(() => { if (ST.activeTab !== 'none') startSSE(); }, 5000);
    };
  } catch { }
}

function updateTickerFromSSE(d) {
  const el = document.getElementById('live-ticker-bar');
  if (!el) return;
  // Update specific ticker items
  const co2El = document.getElementById('ticker-co2ppm');
  const ccEl = document.getElementById('ticker-carbon-credit');
  const energyEl = document.getElementById('ticker-energy');
  if (co2El && d.co2ppm) { co2El.textContent = d.co2ppm + ' ppm'; flashEl(co2El); }
  if (ccEl && d.carbonCredit) { ccEl.textContent = '€' + d.carbonCredit + '/t'; flashEl(ccEl); }
  if (energyEl && d.energy) { energyEl.textContent = d.energy + ' kWh'; flashEl(energyEl); }
}

function flashEl(el) {
  el.classList.add('text-cyan-300');
  setTimeout(() => el.classList.remove('text-cyan-300'), 800);
}

// ─── Global Ticker Bar ────────────────────────────────────────────────────────
async function initGlobalTicker() {
  await updateGlobalTicker();
  ST.tickerInterval = setInterval(updateGlobalTicker, 5000);
}

function updateGlobalTicker() {
  const l = document.getElementById('side-ticker-l');
  const r = document.getElementById('side-ticker-r');
  if (!l || !r) return;
  
  const items = [
    { label: 'CO2', val: (ST.realtimeData[0]?.val || 422.5).toFixed(1) + ' ppm' },
    { label: 'TEMP', val: (ST.realtimeData[1]?.val || 1.25).toFixed(2) + '°C' },
    { label: 'SLR', val: (3.4).toFixed(1) + ' mm/y' },
    { label: 'ICE', val: '-12.6%' },
    { label: 'CH4', val: '1920 ppb' },
    { label: 'N2O', val: '336 ppb' },
    { label: 'O3', val: '285 DU' },
    { label: 'pH', val: '8.06' }
  ];

  const renderItem = i => `<div class="side-ticker-item">
    <span class="side-ticker-label">${i.label}</span>
    <span class="side-ticker-val">${i.val}</span>
  </div>`;

  l.innerHTML = items.slice(0, 4).map(renderItem).join('');
  r.innerHTML = items.slice(4).map(renderItem).join('');
}

function updateDashboardLiveKPIs(d) {
  // Update KPI counters on dashboard in real-time
  const co2El = document.getElementById('kpi-co2-live');
  const renEl = document.getElementById('kpi-renewable-live');
  const co2ppmEl = document.getElementById('kpi-co2ppm-live');
  const ccEl = document.getElementById('kpi-carbon-credit-live');
  if (co2El) animateValue(co2El, parseFloat(co2El.dataset.val || '6.2'), 6.2 + (Math.random() - 0.5) * 0.1, 800, 2);
  if (renEl) animateValue(renEl, parseFloat(renEl.dataset.val || '40'), d.renewableShare, 800, 1);
  if (co2ppmEl) { co2ppmEl.textContent = d.globalCO2ppm; co2ppmEl.dataset.val = d.globalCO2ppm; }
  if (ccEl) { ccEl.textContent = '€' + d.carbonCreditEUR; ccEl.dataset.val = d.carbonCreditEUR; }
}

function animateValue(el, start, end, duration, decimals) {
  const startTime = performance.now();
  function update(ts) {
    const progress = Math.min((ts - startTime) / duration, 1);
    const val = start + (end - start) * progress;
    el.textContent = val.toFixed(decimals);
    el.dataset.val = val;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ─── Country Coords for Globe ─────────────────────────────────────────────────
const CC = {
  USA: { lat: 37.09, lon: -95.71 }, CHN: { lat: 35.86, lon: 104.19 }, IND: { lat: 20.59, lon: 78.96 },
  DEU: { lat: 51.16, lon: 10.45 }, NOR: { lat: 60.47, lon: 8.46 }, BRA: { lat: -14.23, lon: -51.92 },
  RUS: { lat: 61.52, lon: 105.31 }, AUS: { lat: -25.27, lon: 133.77 }, JPN: { lat: 36.20, lon: 138.25 },
  FRA: { lat: 46.22, lon: 2.21 }, CAN: { lat: 56.13, lon: -106.34 }, GBR: { lat: 55.37, lon: -3.43 },
  SWE: { lat: 60.12, lon: 18.64 }, DNK: { lat: 56.26, lon: 9.50 }, ZAF: { lat: -30.55, lon: 22.93 },
  NGA: { lat: 9.08, lon: 8.67 }, MEX: { lat: 23.63, lon: -102.55 }, IDN: { lat: -0.78, lon: 113.92 },
  SAU: { lat: 23.88, lon: 45.07 }, KOR: { lat: 35.90, lon: 127.76 }, TUR: { lat: 38.96, lon: 35.24 },
  ESP: { lat: 40.46, lon: -3.74 }, ITA: { lat: 41.87, lon: 12.56 }, NLD: { lat: 52.13, lon: 5.29 },
  CHE: { lat: 46.81, lon: 8.22 }, FIN: { lat: 61.92, lon: 25.74 }, NZL: { lat: -40.90, lon: 174.88 },
  ISL: { lat: 64.96, lon: -19.02 }, AUT: { lat: 47.51, lon: 14.55 }, PRT: { lat: 39.39, lon: -8.22 },
  ARG: { lat: -38.41, lon: -63.61 }, EGY: { lat: 26.82, lon: 30.80 }, CHL: { lat: -35.67, lon: -71.54 },
  KEN: { lat: 0.02, lon: 37.90 }, ETH: { lat: 9.14, lon: 40.49 }, MAR: { lat: 31.79, lon: -7.09 },
  IRN: { lat: 32.42, lon: 53.68 }, PAK: { lat: 30.37, lon: 69.34 }, BGD: { lat: 23.68, lon: 90.35 },
  VNM: { lat: 14.06, lon: 108.27 }, THA: { lat: 15.87, lon: 100.99 }, POL: { lat: 51.91, lon: 19.14 },
  SGP: { lat: 1.35, lon: 103.81 }, PHL: { lat: 12.87, lon: 121.77 }, MYS: { lat: 4.21, lon: 101.97 },
  COL: { lat: 4.57, lon: -74.29 }, PER: { lat: -9.19, lon: -75.01 }, GRC: { lat: 39.07, lon: 21.82 },
};

// ─── Utility Helpers ──────────────────────────────────────────────────────────
const scoreColor = s => s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';
const scoreLabel = s => s >= 75 ? t('sustainable') : s >= 50 ? t('moderate') : t('critical');

function setupDragScroll(el) {
  if (!el) return;
  let isDown = false;
  let startX;
  let scrollLeft;

  el.addEventListener('mousedown', (e) => {
    isDown = true;
    el.classList.add('active');
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
  });
  el.addEventListener('mouseleave', () => {
    isDown = false;
    el.classList.remove('active');
  });
  el.addEventListener('mouseup', () => {
    isDown = false;
    el.classList.remove('active');
  });
  el.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 2.5; // multiplier for speed
    el.scrollLeft = scrollLeft - walk;
  });
}
const scoreGrade = s => s >= 85 ? 'A+' : s >= 75 ? 'A' : s >= 65 ? 'B' : s >= 55 ? 'C' : s >= 45 ? 'D' : 'F';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const t = (key) => ST.i18n[key] || key;
const authHeaders = () => ST.token ? { 'Authorization': `Bearer ${ST.token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
function hexToRgb(hex) { const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255; return [r, g, b]; }
function toast(msg, type = 'info') {
  const icon = type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warn' ? 'warning' : 'info';
  Swal.fire({
    text: msg,
    icon: icon,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#0b090a',
    color: '#e8f0fe'
  });
}
function showModal(html) { const ov = document.getElementById('modal-overlay'); ov.classList.remove('hidden'); ov.innerHTML = `<div class="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl relative">${html}</div>`; ov.onclick = e => { if (e.target === ov) closeModal() }; }
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

// ─── i18n Load ────────────────────────────────────────────────────────────────
async function loadI18n(lang) {
  try { const r = await fetch(`/i18n/${lang}`); ST.i18n = await r.json(); }
  catch (e) { ST.i18n = {}; }
  ST.i18n.sustainable = 'Sustainable'; ST.i18n.moderate = 'Moderate'; ST.i18n.critical = 'Critical';
}

// ════════════════════════════════════════════════════════════════════════════
// AUTH SYSTEM
// ════════════════════════════════════════════════════════════════════════════
function showLoginModal() {
  showModal(`
    <button onclick="closeModal()" class="absolute top-3 right-3 text-gray-500 hover:text-white"><i class="fas fa-xmark"></i></button>
    <div class="text-center mb-6">
      <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center mx-auto mb-3">
        <i class="fas fa-leaf text-gray-950"></i></div>
      <h2 class="text-lg font-bold text-cyan-300">${t('login')} — EcoTwin</h2>
      <p class="text-xs text-gray-400 mt-1">AI Digital Sustainability Platform</p>
    </div>
    <div class="space-y-3" id="login-form">
      <div><label class="text-xs text-gray-400">Email</label>
        <input id="auth-email" type="email" value="admin@ecotwin.ai" placeholder="admin@ecotwin.ai"
               class="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 text-gray-100"/></div>
      <div><label class="text-xs text-gray-400">Password</label>
        <div class="relative mt-1">
          <input id="auth-pass" type="password" value="admin123" placeholder="admin123"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:border-cyan-500 text-gray-100"/>
          <button onclick="togglePassVis()" class="absolute right-2 top-2 text-gray-400 hover:text-white"><i class="fas fa-eye text-xs" id="pass-eye-icon"></i></button>
        </div></div>
      <div id="auth-error" class="hidden text-xs text-red-400 text-center"></div>
      <button onclick="doLogin()" id="login-btn"
              class="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
        <i class="fas fa-sign-in-alt"></i> ${t('login')}
      </button>
      <div class="text-center"><span class="text-xs text-gray-500">No account? </span>
        <button onclick="showRegisterModal()" class="text-xs text-cyan-400 hover:underline">${t('register')}</button></div>
      <div class="border-t border-gray-700 pt-3 text-center">
        <p class="text-[10px] text-gray-500">Demo: admin@ecotwin.ai / admin123</p>
        <p class="text-[10px] text-gray-500">Analyst: analyst@ecotwin.ai / demo123</p>
      </div>
    </div>`);
}

function togglePassVis() {
  const inp = document.getElementById('auth-pass'), ico = document.getElementById('pass-eye-icon');
  if (inp.type === 'password') { inp.type = 'text'; ico.classList.replace('fa-eye', 'fa-eye-slash'); }
  else { inp.type = 'password'; ico.classList.replace('fa-eye-slash', 'fa-eye'); }
}

async function doLogin() {
  const btn = document.getElementById('login-btn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...'; btn.disabled = true;
  const email = document.getElementById('auth-email').value;
  const pass = document.getElementById('auth-pass').value;
  const r = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
  const d = await r.json();
  if (!r.ok) {
    const err = document.getElementById('auth-error'); err.textContent = d.error || 'Login failed'; err.classList.remove('hidden');
    btn.innerHTML = `<i class="fas fa-sign-in-alt"></i> ${t('login')}`; btn.disabled = false; return;
  }
  ST.token = d.token; ST.user = d.user;
  localStorage.setItem('ecotwin_token', d.token); localStorage.setItem('ecotwin_user', JSON.stringify(d.user));
  if (d.user.lang && d.user.lang !== ST.lang) { ST.lang = d.user.lang; localStorage.setItem('ecotwin_lang', d.user.lang); }
  closeModal(); toast(`Welcome back, ${d.user.name}!`, 'success');
  renderShell();
}

function showRegisterModal() {
  showModal(`
    <button onclick="closeModal()" class="absolute top-3 right-3 text-gray-500 hover:text-white"><i class="fas fa-xmark"></i></button>
    <h2 class="text-lg font-bold text-cyan-300 mb-4 text-center">${t('register')} — EcoTwin</h2>
    <div class="space-y-3">
      <input id="reg-name" type="text" placeholder="Full Name" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 text-gray-100"/>
      <input id="reg-email" type="email" placeholder="Email Address" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 text-gray-100"/>
      <input id="reg-pass" type="password" placeholder="Password (min 6 chars)" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 text-gray-100"/>
      <input id="reg-org" type="text" placeholder="Organization (optional)" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 text-gray-100"/>
      <select id="reg-lang" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
        <option value="en">English</option><option value="es">Español</option><option value="fr">Français</option>
        <option value="de">Deutsch</option><option value="zh">中文</option><option value="ar">العربية</option>
        <option value="hi">हिन्दी</option><option value="pt">Português</option>
      </select>
      <div id="reg-error" class="hidden text-xs text-red-400 text-center"></div>
      <button onclick="doRegister()" id="reg-btn"
              class="w-full py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold text-sm hover:opacity-90 flex items-center justify-center gap-2">
        <i class="fas fa-user-plus"></i> Create Account
      </button>
      <div class="text-center"><button onclick="showLoginModal()" class="text-xs text-cyan-400 hover:underline">Back to Login</button></div>
    </div>`);
}

async function doRegister() {
  const btn = document.getElementById('reg-btn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...'; btn.disabled = true;
  const body = {
    name: document.getElementById('reg-name').value, email: document.getElementById('reg-email').value,
    password: document.getElementById('reg-pass').value, org: document.getElementById('reg-org').value,
    lang: document.getElementById('reg-lang').value
  };
  const r = await fetch('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) {
    const err = document.getElementById('reg-error'); err.textContent = d.error || 'Error'; err.classList.remove('hidden');
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account'; btn.disabled = false; return;
  }
  showOtpModal(body.email, d.otp);
}

function showOtpModal(email, demoOtp) {
  showModal(`
    <button onclick="closeModal()" class="absolute top-3 right-3 text-gray-500 hover:text-white"><i class="fas fa-xmark"></i></button>
    <div class="text-center mb-4">
      <div class="w-12 h-12 rounded-full bg-cyan-900 flex items-center justify-center mx-auto mb-3"><i class="fas fa-envelope-circle-check text-cyan-400 text-xl"></i></div>
      <h2 class="text-base font-bold text-cyan-300">Email Verification</h2>
      <p class="text-xs text-gray-400 mt-1">OTP sent to <strong>${email}</strong></p>
    </div>
    <div class="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-3 mb-4 text-center">
      <p class="text-xs text-emerald-300">Demo OTP (shown for testing):</p>
      <p class="text-2xl font-black text-emerald-400 tracking-widest mt-1">${demoOtp || '------'}</p>
    </div>
    <div class="space-y-3">
      <input id="otp-input" type="text" placeholder="Enter 6-digit OTP" maxlength="6"
             class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-cyan-500 text-gray-100"/>
      <div id="otp-error" class="hidden text-xs text-red-400 text-center"></div>
      <button onclick="doVerifyOtp('${email}')" id="otp-btn"
              class="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-bold text-sm hover:opacity-90">
        Verify OTP & Login
      </button>
    </div>`);
}

async function doVerifyOtp(email) {
  const otp = document.getElementById('otp-input').value.trim();
  const btn = document.getElementById('otp-btn'); btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...'; btn.disabled = true;
  const r = await fetch('/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp }) });
  const d = await r.json();
  if (!r.ok) {
    const err = document.getElementById('otp-error'); err.textContent = d.error || 'Invalid OTP'; err.classList.remove('hidden');
    btn.innerHTML = 'Verify OTP & Login'; btn.disabled = false; return;
  }
  ST.token = d.token; ST.user = d.user;
  localStorage.setItem('ecotwin_token', d.token); localStorage.setItem('ecotwin_user', JSON.stringify(d.user));
  closeModal(); toast('Account verified! Welcome to EcoTwin.', 'success'); renderShell();
}

async function doLogout() {
  await fetch('/auth/logout', { method: 'POST', headers: authHeaders() });
  ST.token = null; ST.user = null;
  localStorage.removeItem('ecotwin_token'); localStorage.removeItem('ecotwin_user');
  toast('Logged out successfully.', 'info'); renderShell();
}

// ════════════════════════════════════════════════════════════════════════════
// SHELL & NAV
// ════════════════════════════════════════════════════════════════════════════
const NAV_TABS = [
  ['dashboard', 'fa-chart-line', 'dashboard'],
  ['map', 'fa-earth-americas', 'worldMap'],
  ['realtime', 'fa-signal', 'realtime'],
  ['simulator', 'fa-sliders', 'simulator'],
  ['compare', 'fa-code-compare', 'compare'],
  ['shap', 'fa-magnifying-glass-chart', 'shap'],
  ['rl', 'fa-brain', 'rlOptimizer'],
  ['anomaly', 'fa-triangle-exclamation', 'anomaly'],
  ['globe3d', 'fa-globe', 'globe3d'],
  ['sdg', 'fa-bullseye', 'sdgTracker'],
  ['history', 'fa-clock-rotate-left', 'history'],
  ['analytics', 'fa-chart-bar', 'analytics'],
  ['risk', 'fa-shield-virus', 'riskTab'],
  ['carbon', 'fa-fire', 'carbonTab'],
  ['cities', 'fa-building-columns', 'citiesTab'],
  ['policy', 'fa-scale-balanced', 'policyTab'],
  ['market', 'fa-chart-candlestick', 'marketTab'],
  ['news', 'fa-newspaper', 'newsTab'],
  ['ai', 'fa-comments', 'askAI'],
  ['threat', 'fa-radiation', 'threatTab'],
  ['health', 'fa-heart-pulse', 'healthTab'],
  ['race', 'fa-ranking-star', 'raceTab'],
  ['admin', 'fa-shield-halved', 'admin'],
];

function renderShell() {
  document.title = 'EcoTwin';
  
  // Inject favicon
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  link.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%23020617%22/><path d=%22M50 20c-16.568 0-30 13.432-30 30 0 16.568 13.432 30 30 30s30-13.432 30-30c0-16.568-13.432-30-30-30zm0 48c-9.941 0-18-8.059-18-18s8.059-18 18-18 18 8.059 18 18-8.059 18-18 18z%22 fill=%22%2310b981%22/><path d=%22M50 35c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8z%22 fill=%22%2334d399%22/></svg>';
  
  const isRTL = ST.lang === 'ar';
  document.getElementById('html-root').setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  document.getElementById('html-root').setAttribute('lang', ST.lang);

  const LANGS = [{ v: 'en', l: 'EN 🇬🇧' }, { v: 'es', l: 'ES 🇪🇸' }, { v: 'fr', l: 'FR 🇫🇷' }, { v: 'de', l: 'DE 🇩🇪' },
  { v: 'zh', l: 'ZH 🇨🇳' }, { v: 'ar', l: 'AR 🇸🇦' }, { v: 'hi', l: 'HI 🇮🇳' }, { v: 'pt', l: 'PT 🇧🇷' }];

  document.getElementById('root').innerHTML = `
  <div class="min-h-screen flex flex-col" id="app-wrapper">
    <!-- HEADER -->
    <header class="et-header sticky top-0 z-50">
      <div class="max-w-screen-2xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <!-- Logo -->
        <div class="flex items-center gap-3 flex-none">
          <div class="et-logo-icon w-9 h-9 rounded-xl flex items-center justify-center shadow-lg">
            <i class="fas fa-leaf text-emerald-300 text-sm"></i></div>
          <div class="hidden sm:block">
            <div class="et-logo-text leading-none">ECO<span>TWIN</span></div>
            <div class="et-logo-sub opacity-80">${t('nav.title') || 'AI SUSTAINABILITY PLATFORM'}</div>
          </div>
        </div>
        <!-- Spacer -->
        <div class="flex-1"></div>
        <!-- Live Data Sources badge -->
        <div class="hidden lg:flex et-live-badge cursor-pointer" id="live-api-badge">
          <span class="et-live-dot"></span>
          <span>7 Live APIs Active</span>
        </div>
        <div id="api-tooltip" class="hidden bg-void-800 border border-cyber text-white text-[10px] p-2 rounded-lg shadow-2xl z-[100] max-w-xs transition-opacity duration-300 opacity-0">
          <div class="font-bold border-b border-cyber/30 pb-1 mb-1 flex items-center gap-1.5"><i class="fas fa-clock text-cyber"></i> System Active</div>
          <div class="space-y-1">
            <div class="flex justify-between"><span>Open-Meteo</span><span class="text-eco">OK</span></div>
            <div class="flex justify-between"><span>REST Countries</span><span class="text-eco">OK</span></div>
            <div class="flex justify-between"><span>NOAA CO₂</span><span class="text-eco">OK</span></div>
            <div class="flex justify-between"><span>Carbon Markets</span><span class="text-eco">OK</span></div>
            <div class="flex justify-between"><span>NASA GIBS</span><span class="text-eco">OK</span></div>
          </div>
          <div id="api-tooltip-arrow" data-popper-arrow class="absolute w-2 h-2 bg-void-800 border-l border-t border-cyber rotate-45 -bottom-1 left-1/2 -translate-x-1/2"></div>
        </div>
        <!-- Lang selector -->
        <select id="lang-selector" onchange="changeLang(this.value)"
                class="et-select-premium">
          ${LANGS.map(l => `<option value="${l.v}" ${ST.lang === l.v ? 'selected' : ''} class="bg-void-950">${l.l}</option>`).join('')}
        </select>
        <!-- Auth buttons -->
        ${ST.user ? `
          <div class="flex items-center gap-2">
            <button onclick="showProfileModal()" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 transition-all border border-gray-700/60 hover:border-cyan-800/50">
              <div class="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-600 to-emerald-600 flex items-center justify-center text-[10px] font-bold shadow-lg">${(ST.user.name || 'U')[0]}</div>
              <span class="text-xs text-gray-200 hidden sm:block font-medium">${ST.user.name}</span>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${ST.user.role === 'admin' ? 'bg-red-900/50 text-red-300 border border-red-800/50' : ST.user.role === 'analyst' ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-800/50' : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'}">${ST.user.role}</span>
            </button>
            <button onclick="doLogout()" class="px-2 py-1.5 text-xs text-gray-500 hover:text-red-400 transition-all rounded-lg hover:bg-red-900/20" title="${t('logout')}"><i class="fas fa-sign-out-alt"></i></button>
          </div>` : `
          <button onclick="showLoginModal()" class="et-btn-primary text-xs px-4 py-2">
            <i class="fas fa-sign-in-alt"></i>${t('login')}
          </button>`}
      </div>
      <!-- LIVE TICKER BAR -->
      <div class="bg-gray-950/90 overflow-hidden" style='border-top:1px solid rgba(34,211,238,0.05); border-bottom:1px solid rgba(34,211,238,0.06)'>
        <div class="flex overflow-x-auto scrollbar-hide" id="live-ticker-bar"></div>
      </div>
      <!-- NAV TABS -->
      <nav class="max-w-screen-2xl mx-auto px-2 flex flex-nowrap gap-2 overflow-x-auto py-2 scrollbar-hide active:cursor-grabbing" id="nav-tabs" style="scroll-behavior: smooth; border-bottom: 2px solid rgba(16, 185, 129, 0.1);">
        ${NAV_TABS.filter(([id]) => id !== 'admin' || (ST.user && ST.user.role === 'admin')).map(([id, icon, key]) => `
          <button onclick="switchTab('${id}')" id="tab-${id}"
            class="tab-btn flex-none flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all font-black text-xs
                   ${ST.activeTab === id ? 'bg-eco-900/30 text-eco-400 border-eco-500 shadow-[0_0_25px_rgba(16,185,129,0.25)] scale-105' : 'bg-void-900/40 border-void-800 text-gray-500 hover:text-gray-300 hover:bg-void-800/60'}">
            <i class="fas ${icon} text-base"></i>${t(key)}
            <div class="flex gap-1">
              ${id === 'market' ? '<span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>' : ''}

              ${id === 'threat' ? '<span class="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse"></span>' : ''}
            </div>
          </button>`).join('')}
      </nav>
    </header>
    <!-- CONTENT -->
    <main class="flex-1 max-w-screen-2xl w-full mx-auto px-4 py-6" id="main-content">
      <div id="tab-content"></div>
    </main>
    <!-- FOOTER -->
    <footer class="border-t border-gray-800/20 py-4 text-center">
      <div class="text-[10px] text-gray-600">
        <span class="gradient-text-cyber font-bold text-xs">EcoTwin v5</span>
        <span class="mx-2 opacity-30">·</span>
        AI Digital Sustainability Platform
        <span class="mx-2 opacity-30">·</span>
        Open-Meteo · REST Countries · Carbon Market · NOAA CO₂
        <span class="mx-2 opacity-30">·</span>
        © 2025
      </div>
    </footer>
  </div>`;
  renderTab(ST.activeTab);
  // Start live ticker after shell renders
  initGlobalTicker();
  startSSE();
  setupDragScroll(document.getElementById('nav-tabs'));
  AOS.init({ duration: 800, once: true, easing: 'ease-out-quad' });
  initPopperTooltips();
}

function initPopperTooltips() {
  const badge = document.getElementById('live-api-badge');
  const tooltip = document.getElementById('api-tooltip');
  if (!badge || !tooltip) return;
  const popperInstance = Popper.createPopper(badge, tooltip, {
    placement: 'bottom',
    modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
  });
  function show() { tooltip.classList.remove('hidden'); setTimeout(() => { tooltip.classList.add('opacity-100'); popperInstance.update(); }, 10); }
  function hide() { tooltip.classList.remove('opacity-100'); setTimeout(() => tooltip.classList.add('hidden'), 300); }
  badge.addEventListener('mouseenter', show);
  badge.addEventListener('mouseleave', hide);
}

function switchTab(id) {
  ST.activeTab = id;
  if (ST.globeAnimFrame) { cancelAnimationFrame(ST.globeAnimFrame); ST.globeAnimFrame = null; }
  if (ST.realtimeInterval && id !== 'realtime') { clearInterval(ST.realtimeInterval); ST.realtimeInterval = null; }
  if (ST.dashboardInterval && id !== 'dashboard') { clearInterval(ST.dashboardInterval); ST.dashboardInterval = null; }
  if (ST.threatInterval && id !== 'threat') { clearInterval(ST.threatInterval); ST.threatInterval = null; }
  if (ST.healthInterval && id !== 'health') { clearInterval(ST.healthInterval); ST.healthInterval = null; }
  if (ST.raceInterval && id !== 'race') { clearInterval(ST.raceInterval); ST.raceInterval = null; }
  document.querySelectorAll('.tab-btn').forEach(b => {
    const bid = b.id.replace('tab-', '');
    if (bid === id) {
      b.className = 'tab-btn flex-none flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all font-black text-xs bg-eco-900/30 text-eco-400 border-eco-500 shadow-[0_0_25px_rgba(16,185,129,0.25)] scale-105';
    } else {
      b.className = 'tab-btn flex-none flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all font-black text-xs bg-void-900/40 border-void-800 text-gray-500 hover:text-gray-300 hover:bg-void-800/60';
    }
  });
  renderTab(id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function changeLang(lang) {
  ST.lang = lang; localStorage.setItem('ecotwin_lang', lang);
  await loadI18n(lang);
  if (ST.user) { await fetch('/auth/profile', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ lang }) }); }
  renderShell();
}

function renderTab(id) {
  const el = document.getElementById('tab-content');
  if (!el) return;
  const renders = {
    dashboard: () => { el.innerHTML = dashboardHTML(); initDashboard(); },
    map: () => { el.innerHTML = mapHTML(); initMap(); },
    realtime: () => { el.innerHTML = realtimeHTML(); initRealtime(); },
    simulator: () => { el.innerHTML = simulatorHTML(); },
    compare: () => { el.innerHTML = compareHTML(); },
    shap: () => { el.innerHTML = shapHTML(); },
    rl: () => { el.innerHTML = rlHTML(); },
    anomaly: () => { el.innerHTML = anomalyHTML(); loadAnomaly(); },
    globe3d: () => { el.innerHTML = globe3dHTML(); initGlobe3D(); },
    sdg: () => { el.innerHTML = sdgHTML(); loadSDG(); },
    history: () => { el.innerHTML = historyHTML(); loadHistory(); },
    analytics: () => { el.innerHTML = analyticsHTML(); loadAnalytics(); },
    risk: () => { el.innerHTML = riskHTML(); },
    carbon: () => { el.innerHTML = carbonHTML(); loadCarbon(); },
    cities: () => { el.innerHTML = citiesHTML(); loadCities(); },
    policy: () => { el.innerHTML = policyHTML(); },
    market: () => { el.innerHTML = marketHTML(); loadMarket(); },
    news: () => { el.innerHTML = newsHTML(); loadNews(); },
    ai: () => { el.innerHTML = aiHTML(); },
    threat: () => { el.innerHTML = threatHTML(); initThreat(); },
    health: () => { el.innerHTML = healthHTML(); initPlanetHealth(); },
    race: () => { el.innerHTML = raceHTML(); initRace(); },
    admin: () => { el.innerHTML = adminHTML(); loadAdmin(); },
  };
  const tabTask = renders[id] || renders.dashboard;
  tabTask();
  if (typeof AOS !== 'undefined') {
    setTimeout(() => { AOS.refresh(); }, 200);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PROFILE MODAL
// ════════════════════════════════════════════════════════════════════════════
function showProfileModal() {
  if (!ST.user) return;
  showModal(`
    <button onclick="closeModal()" class="absolute top-3 right-3 text-gray-500 hover:text-white"><i class="fas fa-xmark"></i></button>
    <h2 class="text-base font-bold text-cyan-300 mb-4">User Profile</h2>
    <div class="flex items-center gap-3 mb-4 pb-4 border-b border-gray-700">
      <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-emerald-600 flex items-center justify-center text-2xl font-black">${ST.user.name[0]}</div>
      <div>
        <div class="font-bold text-white">${ST.user.name}</div>
        <div class="text-xs text-gray-400">${ST.user.email}</div>
        <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${ST.user.role === 'admin' ? 'bg-red-900 text-red-300' : 'bg-cyan-900 text-cyan-300'}">${ST.user.role}</span>
      </div>
    </div>
    <div class="space-y-2">
      <div><label class="text-xs text-gray-400">Display Name</label>
        <input id="prof-name" value="${ST.user.name}" class="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-500"/></div>
      <div><label class="text-xs text-gray-400">Organization</label>
        <input id="prof-org" value="${ST.user.org || ''}" class="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-500"/></div>
      <div><label class="text-xs text-gray-400">Preferred Language</label>
        <select id="prof-lang" class="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-500">
          ${[{ v: 'en', l: 'English' }, { v: 'es', l: 'Español' }, { v: 'fr', l: 'Français' }, { v: 'de', l: 'Deutsch' },
    { v: 'zh', l: '中文' }, { v: 'ar', l: 'العربية' }, { v: 'hi', l: 'हिन्दी' }, { v: 'pt', l: 'Português' }]
      .map(l => `<option value="${l.v}" ${ST.lang === l.v ? 'selected' : ''}>${l.l}</option>`).join('')}
        </select></div>
      <button onclick="saveProfile()" class="w-full py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-bold transition-all mt-2">
        <i class="fas fa-save mr-1"></i> Save Profile
      </button>
    </div>`);
}

async function saveProfile() {
  const name = document.getElementById('prof-name').value;
  const org = document.getElementById('prof-org').value;
  const lang = document.getElementById('prof-lang').value;
  const r = await fetch('/auth/profile', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ name, org, lang }) });
  if (r.ok) {
    ST.user = { ...ST.user, name, org, lang }; ST.lang = lang;
    localStorage.setItem('ecotwin_user', JSON.stringify(ST.user));
    localStorage.setItem('ecotwin_lang', lang);
    await loadI18n(lang); closeModal(); Swal.fire({ icon: 'success', title: 'Profile updated!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }); renderShell();
  } else Swal.fire({ icon: 'error', title: 'Update failed', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
function dashboardHTML() {
  return `
  <div class="space-y-5">
    <!-- Hero Header -->
    <div class="relative et-card p-6 overflow-hidden bg-gradient-to-br from-void-900 to-void-950 border border-void-800/50" data-aos="fade-down">
      <div class="absolute inset-0 opacity-10" style="background-image:url('/assets/img/grid-pattern.svg'); background-size:30px 30px;"></div>
      <div class="relative z-10 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 class="text-2xl font-black gradient-text-cyber flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-900/80 to-emerald-900/80 border border-cyan-700/50 flex items-center justify-center shadow-lg">
              <i class="fas fa-chart-line text-cyan-400 text-base"></i>
            </span>
            ${t('dashboard')}
          </h2>
          <p class="text-sm text-gray-400 mt-1 ml-12">AI Digital Sustainability Intelligence · Live data from REST Countries, Open-Meteo, Carbon Markets & NASA</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-400 mono" id="dash-last-update">Syncing...</span>
          <button onclick="refreshDashboard()" class="et-btn-primary text-sm px-4 py-2.5">
            <i class="fas fa-rotate-right mr-1.5"></i> Refresh
          </button>
        </div>
      </div>

      <!-- Gradient Stats Row -->
      <div class="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div class="p-5 rounded-xl bg-gradient-to-br from-cyber-900/40 to-eco-900/40 border border-cyber-700/50 shadow-lg flex items-center gap-3 hover:translate-y-[-2px] transition-transform duration-300" data-aos="zoom-in" data-aos-delay="100">
          <div class="w-12 h-12 rounded-full bg-cyber-800/50 flex items-center justify-center text-cyber-300 text-xl"><i class="fas fa-earth-americas"></i></div>
          <div>
            <div class="text-sm text-gray-300 font-bold uppercase tracking-wider">Countries</div>
            <div class="text-3xl font-black text-white mt-0.5">50+</div>
          </div>
        </div>
        <div class="p-5 rounded-xl bg-gradient-to-br from-eco-900/40 to-green-900/40 border border-eco-700/50 shadow-lg flex items-center gap-3 hover:translate-y-[-2px] transition-transform duration-300" data-aos="zoom-in" data-aos-delay="200">
          <div class="w-12 h-12 rounded-full bg-eco-800/50 flex items-center justify-center text-eco-300 text-xl"><i class="fas fa-leaf"></i></div>
          <div>
            <div class="text-sm text-gray-300 font-bold uppercase tracking-wider">Avg. Score</div>
            <div class="text-3xl font-black text-white mt-0.5">61<span class="text-lg text-gray-400">/100</span></div>
          </div>
        </div>
        <div class="p-5 rounded-xl bg-gradient-to-br from-amber-900/40 to-orange-900/40 border border-amber-700/50 shadow-lg flex items-center gap-3 hover:translate-y-[-2px] transition-transform duration-300" data-aos="zoom-in" data-aos-delay="300">
          <div class="w-12 h-12 rounded-full bg-amber-800/50 flex items-center justify-center text-amber-300 text-xl"><i class="fas fa-cloud"></i></div>
          <div>
            <div class="text-sm text-gray-300 font-bold uppercase tracking-wider">CO₂ PPM</div>
            <div class="text-3xl font-black text-white mt-0.5"><span id="kpi-co2ppm-live">422.5</span></div>
          </div>
        </div>
        <div class="p-5 rounded-xl bg-gradient-to-br from-neon-900/40 to-purple-900/40 border border-neon-700/50 shadow-lg flex items-center gap-3 hover:translate-y-[-2px] transition-transform duration-300" data-aos="zoom-in" data-aos-delay="400">
          <div class="w-12 h-12 rounded-full bg-neon-800/50 flex items-center justify-center text-neon-300 text-xl"><i class="fas fa-euro-sign"></i></div>
          <div>
            <div class="text-sm text-gray-300 font-bold uppercase tracking-wider">Carbon Market</div>
            <div class="text-3xl font-black text-white mt-0.5"><span id="kpi-carbon-credit-live">€68</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- KPI Cards Row 1 — with sparklines + glow rings -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Countries -->
      <div class="et-card-kpi neon-border-cyan" style="color:#22d3ee">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-lg bg-cyan-900/50 border border-cyan-800/60 flex items-center justify-center">
            <i class="fas fa-earth-americas text-cyan-400 text-sm"></i>
          </div>
          <span class="text-sm text-gray-500 uppercase tracking-widest font-semibold">${t('kpi.countries')}</span>
        </div>
        <div class="flex items-end justify-between">
          <div>
            <div class="text-4xl font-black text-cyan-300 glow-cyan mono leading-none">50+</div>
            <div class="text-xs text-emerald-400 mt-1 font-semibold">↑ +5 this year</div>
          </div>
          <svg class="kpi-sparkline-svg opacity-60" width="70" height="35" viewBox="0 0 70 35" fill="none">
            <polyline points="0,28 12,22 24,25 36,18 48,20 60,12 70,10" stroke="#22d3ee" stroke-width="2" fill="none"/>
            <polygon points="0,28 12,22 24,25 36,18 48,20 60,12 70,10 70,35 0,35" fill="#22d3ee" opacity="0.1"/>
          </svg>
        </div>
        <div class="text-[9px] text-gray-600 mt-2">✅ REST Countries API</div>
      </div>

      <!-- Avg Score -->
      <div class="et-card-kpi neon-border-green" style="color:#10b981">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-lg bg-emerald-900/50 border border-emerald-800/60 flex items-center justify-center">
            <i class="fas fa-leaf text-emerald-400 text-sm"></i>
          </div>
          <span class="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">${t('kpi.avgScore')}</span>
        </div>
        <div class="flex items-end justify-between">
          <div>
            <div class="text-4xl font-black text-emerald-300 glow-emerald mono leading-none">61<span class="text-lg text-gray-500 font-normal">/100</span></div>
            <div class="text-xs text-emerald-400 mt-1 font-semibold">↑ +1.8 YoY</div>
          </div>
          <svg class="opacity-60" width="70" height="35" viewBox="0 0 70 35" fill="none">
            <polyline points="0,25 12,25 24,22 36,20 48,18 60,15 70,14" stroke="#10b981" stroke-width="2" fill="none"/>
            <polygon points="0,25 12,25 24,22 36,20 48,18 60,15 70,14 70,35 0,35" fill="#10b981" opacity="0.1"/>
          </svg>
        </div>
        <div class="text-[9px] text-gray-600 mt-2">🔄 Updates every 30s</div>
      </div>

      <!-- Atm CO2 -->
      <div class="et-card-kpi" style="color:#f59e0b; border-color:rgba(245,158,11,0.3); box-shadow: 0 0 12px rgba(245,158,11,0.08)">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-lg bg-amber-900/50 border border-amber-800/60 flex items-center justify-center">
            <i class="fas fa-cloud text-amber-400 text-sm"></i>
          </div>
          <span class="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Atm. CO₂</span>
        </div>
        <div class="flex items-end justify-between">
          <div>
            <div class="text-4xl font-black text-amber-300 mono leading-none"><span id="kpi-co2ppm-live">422.5</span><span class="text-lg text-gray-500 font-normal"> ppm</span></div>
            <div class="text-xs text-red-400 mt-1 font-semibold">↑ +2.5 ppm/yr</div>
          </div>
          <svg class="opacity-60" width="70" height="35" viewBox="0 0 70 35" fill="none">
            <polyline points="0,30 12,27 24,26 36,24 48,21 60,18 70,16" stroke="#f59e0b" stroke-width="2" fill="none"/>
            <polygon points="0,30 12,27 24,26 36,24 48,21 60,18 70,16 70,35 0,35" fill="#f59e0b" opacity="0.1"/>
          </svg>
        </div>
        <div class="text-[9px] text-gray-600 mt-2">📡 NOAA seasonal model</div>
      </div>

      <!-- EU ETS Carbon Price -->
      <div class="et-card-kpi neon-border-violet" style="color:#8b5cf6">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-lg bg-violet-900/50 border border-violet-800/60 flex items-center justify-center">
            <i class="fas fa-euro-sign text-violet-400 text-sm"></i>
          </div>
          <span class="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">EU ETS Carbon</span>
        </div>
        <div class="flex items-end justify-between">
          <div>
            <div class="text-4xl font-black text-violet-300 mono leading-none"><span id="kpi-carbon-credit-live">€68</span><span class="text-lg text-gray-500 font-normal">/t</span></div>
            <div class="text-xs text-emerald-400 mt-1 font-semibold" id="kpi-cc-change">Live market</div>
          </div>
          <svg class="opacity-60" width="70" height="35" viewBox="0 0 70 35" fill="none">
            <polyline points="0,20 12,22 24,18 36,21 48,15 60,19 70,14" stroke="#8b5cf6" stroke-width="2" fill="none"/>
            <polygon points="0,20 12,22 24,18 36,21 48,15 60,19 70,14 70,35 0,35" fill="#8b5cf6" opacity="0.1"/>
          </svg>
        </div>
        <div class="text-[9px] text-gray-600 mt-2">💹 Carbon market live</div>
      </div>
    </div>

    <!-- Secondary KPI Row with mini gauges -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="et-card p-6 border-amber-900/20">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2"><i class="fas fa-solar-panel text-yellow-500 text-lg"></i><span class="text-xs text-gray-400 uppercase tracking-widest font-bold">Global Renewable</span></div>
          <span class="text-xl font-black text-yellow-300 mono" id="kpi-renewable-live" data-val="40">40%</span>
        </div>
        <div class="metric-bar h-2"><div class="metric-bar-fill bg-gradient-to-r from-yellow-600 to-yellow-400 progress-animate" style="width:40%"></div></div>
        <div class="text-[10px] text-gray-500 mt-2 font-medium">Global Target Alignment: 60% by 2030</div>
      </div>
      <div class="et-card p-6 border-orange-900/20">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2"><i class="fas fa-thermometer-half text-orange-500 text-lg"></i><span class="text-xs text-gray-400 uppercase tracking-widest font-bold">Temp. Anomaly</span></div>
          <span class="text-xl font-black text-orange-300 mono">+1.18°C</span>
        </div>
        <div class="metric-bar h-2"><div class="metric-bar-fill bg-gradient-to-r from-orange-700 to-orange-500 progress-animate" style="width:59%"></div></div>
        <div class="text-[10px] text-gray-500 mt-2 font-medium">Relative to pre-industrial average</div>
      </div>
      <div class="et-card p-6 border-blue-900/20">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2"><i class="fas fa-wind text-blue-500 text-lg"></i><span class="text-xs text-gray-400 uppercase tracking-widest font-bold">Live Weather</span></div>
          <span class="text-xl font-black text-blue-300 mono" id="dash-weather-temp">—</span>
        </div>
        <div class="metric-bar h-2"><div id="dash-weather-bar" class="metric-bar-fill bg-gradient-to-r from-blue-700 to-blue-400" style="width:50%"></div></div>
        <div class="text-[10px] text-gray-500 mt-2 font-medium" id="dash-weather-city">Real-time Open-Meteo Sync</div>
      </div>
      <div class="et-card p-6 border-emerald-900/20">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2"><i class="fas fa-signal text-emerald-500 text-lg"></i><span class="text-xs text-gray-400 uppercase tracking-widest font-bold">API Health</span></div>
          <span class="text-xl font-black text-emerald-300 mono">7/7</span>
        </div>
        <div class="metric-bar h-2"><div class="metric-bar-fill bg-gradient-to-r from-emerald-700 to-emerald-400 progress-animate" style="width:100%"></div></div>
        <div class="text-[10px] text-emerald-400 mt-2 font-bold uppercase tracking-tighter">✅ Systems Operational</div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="et-card lg:col-span-2">
        <div class="flex items-center justify-between mb-3">
          <h3 class="et-card-title"><i class="fas fa-chart-bar text-cyan-500"></i> Top 12 Countries — Sustainability Score</h3>
          <span class="text-[9px] text-gray-600 mono" id="chart-data-time">Live data</span>
        </div>
        <div id="dash-bar" style="height:260px"></div>
      </div>
      <div class="et-card">
        <h3 class="et-card-title"><i class="fas fa-chart-pie text-violet-400"></i> Score Distribution</h3>
        <div id="dash-pie" style="height:260px"></div>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="et-card" data-aos="fade-up">
        <h3 class="et-card-title"><i class="fas fa-chart-radar text-eco"></i> Planet Health Vector (AI Analysis)</h3>
        <canvas id="health-radar-chart" class="mt-4" style="max-height: 280px;"></canvas>
      </div>
      <div class="et-card" data-aos="fade-up" data-aos-delay="200">
        <h3 class="et-card-title"><i class="fas fa-chart-line text-amber-400"></i> Global Score Trend 2015–2025</h3>
        <div id="dash-trend" style="height:240px"></div>
      </div>
    </div>

    <!-- Live API Status Grid -->
    <div class="et-card grad-border">
      <div class="flex items-center gap-3 mb-4">
        <div class="et-live-dot"></div>
        <h3 class="et-card-title" style="font-size:12px;margin-bottom:0">Live Data Sources</h3>
        <span class="ml-auto text-xs text-gray-600 mono" id="api-status-time"></span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4" id="api-status-grid">
        ${[
      { name: 'REST Countries', icon: 'fa-globe', color: 'emerald', url: 'restcountries.com' },
      { name: 'Open-Meteo', icon: 'fa-cloud-sun', color: 'blue', url: 'Weather API' },
      { name: 'NOAA CO₂', icon: 'fa-smog', color: 'yellow', url: 'Seasonal model' },
      { name: 'EU ETS Carbon', icon: 'fa-chart-candlestick', color: 'violet', url: 'Market data' },
      { name: 'SSE Push', icon: 'fa-bolt', color: 'orange', url: '2s stream' },
    ].map(s => `
          <div class="bg-gray-900/80 rounded-2xl p-5 border border-gray-800 hover:border-eco-500/30 transition-all hover:bg-void-900 group">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-lg bg-${s.color}-900/30 border border-${s.color}-800/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <i class="fas ${s.icon} text-${s.color}-400 text-sm"></i>
              </div>
              <span class="text-xs font-bold text-gray-200">${s.name}</span>
            </div>
            <div class="flex items-center gap-2 mb-2">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span class="text-[10px] text-emerald-400 font-black tracking-widest uppercase">Operational</span>
            </div>
            <div class="text-[10px] text-gray-500 font-medium">${s.url}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Country Status Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      ${[
      { title: 'Sustainable', subtitle: 'Target Score 75–100', count: 14, color: 'emerald', emoji: '🌿', gradient: 'from-emerald-900/40 to-void-950', border: 'rgba(16,185,129,0.3)', names: ['Norway', 'Iceland', 'Denmark', 'Sweden', 'Switzerland', 'Austria', 'New Zealand', 'Finland'] },
      { title: 'Moderate', subtitle: 'Global Average Range', count: 24, color: 'yellow', emoji: '⚡', gradient: 'from-yellow-900/30 to-void-950', border: 'rgba(245,158,11,0.3)', names: ['USA', 'Germany', 'UK', 'France', 'Japan', 'Brazil', 'Spain', 'Australia'] },
      { title: 'Critical', subtitle: 'Action Required Immediately', count: 12, color: 'red', emoji: '🔥', gradient: 'from-red-900/30 to-void-950', border: 'rgba(239,68,68,0.3)', names: ['Saudi Arabia', 'Iraq', 'Syria', 'Nigeria', 'Sudan', 'Iran'] },
    ].map(g => `
        <div class="et-card p-6 bg-gradient-to-br ${g.gradient} border-2" style="border-color:${g.border}">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-4">
              <span class="text-3xl">${g.emoji}</span>
              <div>
                <div class="text-lg font-black text-${g.color}-400 uppercase tracking-tight">${g.title}</div>
                <div class="text-xs text-gray-400 font-medium">${g.subtitle}</div>
              </div>
            </div>
            <div class="text-4xl font-black text-${g.color}-300 mono drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">${g.count}</div>
          </div>
          <div class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
            ${g.names.map(n => `<span class="px-2.5 py-1 bg-${g.color}-900/30 border border-${g.color}-500/20 text-${g.color}-300/90 rounded-md text-[10px] font-bold">${n}</span>`).join('')}
          </div>
        </div>`).join('')}
    </div>

    <div class="et-card p-6 border-cyan-900/30 bg-gradient-to-r from-void-950 to-void-900 flex flex-wrap items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-cyan-900/40 border border-cyan-800/50 flex items-center justify-center">
          <i class="fas fa-file-export text-cyan-400 text-xl"></i>
        </div>
        <div>
          <div class="text-sm font-black text-gray-200">Export Intelligence Dataset</div>
          <div class="text-xs text-gray-500 font-medium tracking-tight mt-0.5">Comprehensive real-time sustainability data (50+ countries)</div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button onclick="exportData('csv')" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2">
          <i class="fas fa-file-csv"></i> DOWNLOAD CSV
        </button>
        <button onclick="exportData('json')" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2">
          <i class="fas fa-file-code"></i> DOWNLOAD JSON
        </button>
      </div>
    </div>
  </div>`;
}

async function refreshDashboard() {
  ST.worldData = []; // force re-fetch
  await initDashboard();
  toast('Dashboard refreshed with live data!', 'success');
}

async function initDashboard() {
  // Always fetch fresh data (TTL: 30 seconds since world_data changes every 30s)
  const shouldRefetch = !ST.worldData.length || (Date.now() - ST.lastWorldUpdate > 30000);
  if (shouldRefetch) {
    const r = await fetch('/world_data');
    ST.worldData = await r.json();
    ST.lastWorldUpdate = Date.now();
  }
  const data = ST.worldData;
  const top12 = [...data].sort((a, b) => b.score - a.score).slice(0, 12);
  const pl = { paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(17,24,39,0.4)', font: { color: '#9ca3af', size: 10 }, margin: { l: 90, r: 30, t: 8, b: 30 } };

  // Update timestamp
  const timeEl = document.getElementById('dash-last-update');
  const chartTimeEl = document.getElementById('chart-data-time');
  if (timeEl) timeEl.textContent = 'Updated: ' + new Date().toLocaleTimeString();
  if (chartTimeEl) chartTimeEl.textContent = new Date().toLocaleTimeString();

  // Update API status time
  const apiTimeEl = document.getElementById('api-status-time');
  if (apiTimeEl) apiTimeEl.textContent = 'Last checked: ' + new Date().toLocaleTimeString();

  // Enrich dashboard weather from live real-time feed
  try {
    const rtR = await fetch('/realtime/latest');
    const rtD = await rtR.json();
    const weatherTempEl = document.getElementById('dash-weather-temp');
    const weatherCityEl = document.getElementById('dash-weather-city');
    const weatherBarEl = document.getElementById('dash-weather-bar');
    if (weatherTempEl && rtD.temp) {
      weatherTempEl.textContent = rtD.temp + '°C';
      if (weatherCityEl) weatherCityEl.textContent = (rtD.city || '') + (rtD.weatherDesc ? ' · ' + rtD.weatherDesc : '') + (rtD.isRealWeather ? ' 🌤️' : '');
      if (weatherBarEl) weatherBarEl.style.width = Math.min(100, Math.max(10, (rtD.temp + 10) * 2)) + '%';
    }
  } catch (e) { console.error('Weather sync error:', e); }

  try {
    const barColors = top12.map((d, i) => {
      const opacity = 1 - (i * 0.05);
      return d.score >= 75 ? `rgba(16, 185, 129, ${opacity})` : d.score >= 50 ? `rgba(245, 158, 11, ${opacity})` : `rgba(239, 68, 68, ${opacity})`;
    });

    Plotly.newPlot('dash-bar', [{
      type: 'bar', orientation: 'h', x: top12.map(d => d.score), y: top12.map(d => d.name),
      marker: { 
        color: barColors,
        line: { color: 'rgba(255,255,255,0.2)', width: 2 }
      },
      hoverinfo: 'none',
      hovertemplate: 
        '<b>Rank #%{y}</b><br>' +
        'Score: <span style="color:#10b981 text-shadow:0 0 10px rgba(16,185,129,0.5)">%{x}</span><br>' +
        '<span style="font-size:10px; opacity:0.8">Click for detail analysis</span>' +
        '<extra></extra>',
      text: top12.map(d => `${d.score} ${scoreGrade(d.score)}`), textposition: 'outside',
      textfont: { family: 'Orbitron', size: 11, color: '#e8f0fe', weight: '900' },
      hoverlabel: {
        bgcolor: 'rgba(2, 6, 23, 0.9)',
        bordercolor: '#10b981',
        font: { family: 'Inter', size: 13, color: '#fff' }
      }
    }], { 
      ...pl, 
      xaxis: { color: '#64748b', range: [0, 115], gridcolor: 'rgba(255,255,255,0.03)', zeroline: false, ticksuffix: '%' }, 
      yaxis: { color: '#94a3b8', automargin: true, tickfont: { family: 'Orbitron', weight: 600 } },
      hovermode: 'closest',
      bargap: 0.25
    }, { responsive: true, displayModeBar: false });

    // Interactive Hover Glow effect removed as requested to maintain score-based color consistency
    const dashBarEl = document.getElementById('dash-bar');
    if (dashBarEl) {
      dashBarEl.on('plotly_hover', function(data){
        // Retaining just a subtle line-width increase for interaction feedback without shifting the indicator color
        const width = 3.5;
        Plotly.restyle('dash-bar', { 
          'marker.line.width': width 
        }, [0]);
      });
      dashBarEl.on('plotly_unhover', function(data){
        Plotly.restyle('dash-bar', { 
          'marker.line.width': 2 
        }, [0]);
      });
    }
  } catch (e) { console.error('Bar chart error:', e); }

  try {
    const cats = [{ n: 'Sustainable', c: '#10b981', f: d => d.score >= 75 }, { n: 'Moderate', c: '#f59e0b', f: d => d.score >= 50 && d.score < 75 }, { n: 'Critical', c: '#ef4444', f: d => d.score < 50 }];
    Plotly.newPlot('dash-pie', [{
      type: 'pie', labels: cats.map(c => c.n), values: cats.map(c => data.filter(c.f).length),
      marker: { colors: cats.map(c => c.c) }, hole: 0.5, textinfo: 'label+percent',
      textfont: { color: '#e5e7eb', size: 11 },
    }], { paper_bgcolor: 'transparent', margin: { l: 10, r: 10, t: 10, b: 10 }, showlegend: false }, { responsive: true, displayModeBar: false });
  } catch (e) { console.error('Pie chart error:', e); }

  try {
    Plotly.newPlot('dash-scatter', [{
      type: 'scatter', mode: 'markers+text', x: data.map(d => d.renewable), y: data.map(d => d.co2),
      text: data.map(d => d.code), textposition: 'top center',
      marker: {
        size: data.map(d => 6 + d.score / 14), color: data.map(d => d.score),
        colorscale: [[0, '#ef4444'], [0.5, '#f59e0b'], [1, '#10b981']], showscale: true,
        colorbar: { title: 'Score', titlefont: { color: '#6b7280' }, tickfont: { color: '#6b7280' }, len: 0.8, thickness: 10 }
      },
      hovertemplate: '<b>%{text}</b><br>Renewable: %{x}%<br>CO₂: %{y}t<extra></extra>',
    }], {
      paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(17,24,39,0.4)',
      margin: { l: 45, r: 20, t: 8, b: 40 }, font: { color: '#9ca3af', size: 10 },
      xaxis: { title: 'Renewable %', color: '#4b5563', gridcolor: '#1f2937' },
      yaxis: { title: 'CO₂ t/cap', color: '#4b5563', gridcolor: '#1f2937' },
    }, { responsive: true, displayModeBar: false });
  } catch (e) { console.error('Scatter chart error:', e); }

  try {
    const yrs = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    const scrs = [52, 53, 54, 55, 56, 56.5, 57.2, 58, 59.1, 60, 61.2];
    Plotly.newPlot('dash-trend', [
      {
        type: 'scatter', mode: 'lines+markers', x: yrs, y: scrs, name: 'Actual',
        line: { color: '#10b981', width: 4, shape: 'spline' }, marker: { size: 8, color: '#10b981', line: { color: '#000', width: 2 } }, 
        fill: 'tozeroy', fillcolor: 'rgba(16,185,129,0.05)'
      },
      {
        type: 'scatter', mode: 'lines', x: [2025, 2026, 2027, 2028, 2029, 2030], y: [61.2, 62.8, 64.5, 66.2, 68, 70], name: 'AI Forecast',
        line: { color: '#22d3ee', width: 3, dash: 'dot', shape: 'spline' }, fill: 'tozeroy', fillcolor: 'rgba(34,211,238,0.03)'
      },
    ], {
      paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(17,24,39,0.2)',
      margin: { l: 40, r: 20, t: 10, b: 40 }, font: { color: '#9ca3af', size: 10 },
      xaxis: { color: '#4b5563', gridcolor: '#1f2937', zeroline: false }, yaxis: { color: '#4b5563', gridcolor: '#1f2937', range: [40, 80], zeroline: false },
      legend: { x: 0, y: 1.1, orientation: 'h', bgcolor: 'transparent', font: { color: '#9ca3af', size: 10 } },
    }, { responsive: true, displayModeBar: false });
  } catch (e) { console.error('Trend chart error:', e); }

  // Auto-refresh every 30 seconds
  if (ST.dashboardInterval) clearInterval(ST.dashboardInterval);
  ST.dashboardInterval = setInterval(async () => {
    if (ST.activeTab !== 'dashboard') { clearInterval(ST.dashboardInterval); return; }
    await refreshDashboardCharts();
  }, 30000);

  try {
    initHealthRadar();
  } catch (e) { console.error('Radar chart error:', e); }
}

function initHealthRadar() {
  const ctx = document.getElementById('health-radar-chart');
  if (!ctx) return;
  if (ST.charts.healthRadar) ST.charts.healthRadar.destroy();
  ST.charts.healthRadar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Emissions', 'Renewables', 'Water Safety', 'Biodiversity', 'Urban Sched.', 'Forestation'],
      datasets: [{
        label: 'Current Status',
        data: [65, 40, 88, 55, 72, 48],
        fill: true,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10b981',
        pointBackgroundColor: '#10b981',
        borderWidth: 2
      }, {
        label: '2030 Target',
        data: [30, 80, 95, 75, 90, 70],
        fill: true,
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderColor: '#8b5cf6',
        pointBackgroundColor: '#8b5cf6',
        borderWidth: 2,
        borderDash: [5, 5]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          pointLabels: { color: '#94a3b8', font: { size: 10 } },
          ticks: { display: false, count: 5 }
        }
      },
      plugins: {
        legend: { labels: { color: '#e8f0fe', boxWidth: 10, font: { size: 11 } } }
      }
    }
  });
}

async function refreshDashboardCharts() {
  try {
    const r = await fetch('/world_data');
    ST.worldData = await r.json();
    ST.lastWorldUpdate = Date.now();
    const data = ST.worldData;
    const top12 = [...data].sort((a, b) => b.score - a.score).slice(0, 12);
    Plotly.update('dash-bar', { x: [top12.map(d => d.score)], y: [top12.map(d => d.name)] }, {}, [0]);
    const timeEl = document.getElementById('dash-last-update');
    if (timeEl) timeEl.textContent = 'Live · Updated: ' + new Date().toLocaleTimeString();
    toast('Dashboard data refreshed from live APIs', 'info');
  } catch { }
}

// ════════════════════════════════════════════════════════════════════════════
// WORLD MAP
// ════════════════════════════════════════════════════════════════════════════
function mapHTML() {
  return `
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <h2 class="text-xl font-black text-cyan-300 flex items-center gap-2"><i class="fas fa-earth-americas"></i> ${t('worldMap')}</h2>
      <div class="flex flex-wrap gap-1 ml-auto">
        ${['all', 'green', 'yellow', 'red'].map(f => `
          <button onclick="filterMap('${f}')" id="mf-${f}"
                  class="map-filter px-2.5 py-1 text-[10px] rounded-lg font-bold transition-all ${f === 'all' ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400'}">
            ${f === 'all' ? 'All' : f === 'green' ? '🟢 Sustainable' : f === 'yellow' ? '🟡 Moderate' : '🔴 Critical'}
          </button>`).join('')}
      </div>
    </div>
    <div class="et-card p-2">
      <div id="world-map" style="height:480px"></div>
    </div>
    <div class="flex flex-wrap gap-4 text-xs text-gray-400">
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-emerald-500 inline-block"></span>Sustainable (75+)</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-yellow-500 inline-block"></span>Moderate (50–74)</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-red-600 inline-block"></span>Critical (<50)</span>
    </div>
    <div id="country-detail" class="hidden et-card border-cyan-800/50"></div>
    <div class="et-card">
      <h3 class="et-card-title"><i class="fas fa-clock-rotate-left"></i> Time Travel: 2015 → 2030</h3>
      <div class="flex items-center gap-4 mt-3">
        <span class="text-xs text-gray-400">2015</span>
        <input type="range" min="2015" max="2030" value="2025" id="year-slider" class="flex-1 accent-cyan-400" oninput="animateYear(this.value)">
        <span class="text-xs text-gray-400">2030</span>
        <span class="text-cyan-300 font-black text-lg w-14 text-center" id="year-label">2025</span>
      </div>
    </div>
  </div>`;
}

let mapFilter = 'all';
async function initMap() {
  if (!ST.worldData.length) { const r = await fetch('/world_data'); ST.worldData = await r.json(); }
  drawMap(ST.worldData);
}
function filterMap(f) {
  mapFilter = f;
  document.querySelectorAll('.map-filter').forEach(b => {
    b.className = b.className.replace('bg-cyan-700 text-white', 'bg-gray-800 text-gray-400');
  });
  document.getElementById('mf-' + f).className = document.getElementById('mf-' + f).className.replace('bg-gray-800 text-gray-400', 'bg-cyan-700 text-white');
  let d = ST.worldData;
  if (f === 'green') d = d.filter(x => x.score >= 75);
  if (f === 'yellow') d = d.filter(x => x.score >= 50 && x.score < 75);
  if (f === 'red') d = d.filter(x => x.score < 50);
  drawMap(d);
}
function drawMap(data) {
  Plotly.newPlot('world-map', [{
    type: 'choropleth', locationmode: 'ISO-3', locations: data.map(d => d.code), z: data.map(d => d.score),
    text: data.map(d => `<b>${d.name}</b><br>Score: ${d.score}/100 (${scoreGrade(d.score)})<br>CO₂: ${d.co2}t/cap<br>Renewable: ${d.renewable}%<br>Water: ${d.waterAccess}%<br>Recycling: ${d.recycling}%<br>Traffic: ${d.traffic}%`),
    hovertemplate: '%{text}<extra></extra>', zmin: 0, zmax: 100,
    colorscale: [[0, '#7f1d1d'], [0.2, '#ef4444'], [0.5, '#78350f'], [0.55, '#f59e0b'], [0.75, '#064e3b'], [1, '#10b981']],
    colorbar: { title: 'Score', titlefont: { color: '#6b7280' }, tickfont: { color: '#6b7280' }, bgcolor: 'rgba(0,0,0,0.3)', thickness: 12 },
  }], {
    paper_bgcolor: '#030712', geo: {
      bgcolor: '#030712', landcolor: '#0f172a', oceancolor: '#0c1a2e', lakecolor: '#0c1a2e',
      showocean: true, showlakes: true, showcoastlines: true, coastlinecolor: '#1e3a5f', showframe: false, projection: { type: 'natural earth' }
    },
    margin: { l: 0, r: 0, t: 0, b: 0 }
  }, { responsive: true, displayModeBar: false });
  document.getElementById('world-map').on('plotly_click', d => {
    if (!d.points.length) return;
    const c = data[d.points[0].pointIndex];
    if (c) showCountryDetail(c);
  });
}
function showCountryDetail(c) {
  const el = document.getElementById('country-detail');
  el.classList.remove('hidden');
  el.className = 'et-card overflow-hidden bg-void-950/90 backdrop-blur-3xl border-2 border-void-800/80 p-0 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-tabFadeIn';
  
  const col = c.score >= 75 ? 'emerald' : c.score >= 50 ? 'yellow' : 'red';
  const accent = c.score >= 75 ? '#10b981' : c.score >= 50 ? '#f59e0b' : '#ef4444';
  const pred = Array.from({ length: 6 }, (_, i) => Math.min(100, c.score + i * (c.renewable > 50 ? 0.8 : 0.3)).toFixed(1));

  el.innerHTML = `
    <!-- Top Impact Banner -->
    <div class="relative py-10 px-8 bg-gradient-to-r from-void-900 via-${col}-900/10 to-void-900 border-b border-void-800/50">
      <div class="absolute top-4 right-4 z-20">
        <button onclick="document.getElementById('country-detail').classList.add('hidden')" class="w-8 h-8 rounded-full bg-void-900/80 border border-void-700 flex items-center justify-center text-gray-400 hover:text-white transition-all"><i class="fas fa-times"></i></button>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-10">
        <div class="flex items-center gap-6">
          <div class="relative group">
            <div class="absolute -inset-1 bg-${col}-500 blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
            ${c.flag ? `<img src="${c.flag}" class="relative w-24 h-14 object-cover rounded-xl border-2 border-void-700 shadow-2xl" alt="${c.name} flag"/>` : ''}
          </div>
          <div>
            <h3 class="text-4xl font-black text-white tracking-tighter uppercase font-display">${c.name}</h3>
            <div class="flex items-center gap-3 mt-2">
               <span class="status-pill status-pill-${c.score >= 75 ? 'live' : c.score >= 50 ? 'warn' : 'alert'} py-1 px-4 text-xs font-black ring-1 ring-${col}-500/30">
                 ${scoreLabel(c.score)} · GRADE ${scoreGrade(c.score)}
               </span>
               <span class="text-xs text-gray-500 font-bold tracking-widest uppercase">${c.capital || 'Global Territory'} · ${c.region || ''}</span>
            </div>
          </div>
        </div>
        
        <div class="text-right">
          <div class="relative inline-block">
             <svg class="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.05)" stroke-width="8" fill="transparent" />
                <circle cx="64" cy="64" r="56" stroke="${accent}" stroke-width="8" fill="transparent" 
                        stroke-dasharray="351.85" stroke-dashoffset="${351.85 * (1 - c.score/100)}" 
                        stroke-linecap="round" class="transition-all duration-1000 ease-out" />
             </svg>
             <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-3xl font-black text-white font-mono">${c.score}</span>
                <span class="text-[10px] text-gray-500 font-bold uppercase -mt-1">Eco Score</span>
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Metrics Grid -->
    <div class="p-8">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        ${[{ l: 'Carbon Impact', v: c.co2 + 't', i: 'fa-cloud', c: 'red', desc: 'CO2 tons per capita' }, 
           { l: 'Renewables', v: c.renewable + '%', i: 'fa-solar-panel', c: 'emerald', desc: 'Energy mix share' },
           { l: 'Water Clarity', v: c.waterAccess + '%', i: 'fa-droplet', c: 'blue', desc: 'Sanitation index' }, 
           { l: 'Circular Economy', v: c.recycling + '%', i: 'fa-recycle', c: 'cyan', desc: 'Waste management' },
           { l: 'Urban Traffic', v: c.traffic + '%', i: 'fa-car', c: 'orange', desc: 'Congestion level' }, 
           { l: 'Total Energy', v: c.energy + 'kWh', i: 'fa-bolt', c: 'yellow', desc: 'Annual per capita' }]
          .map(m => `
            <div class="group relative bg-void-900/60 p-5 rounded-2xl border border-void-800 hover:border-${m.c}-500/40 transition-all duration-300">
              <div class="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <i class="fas ${m.i} text-3xl"></i>
              </div>
              <div class="flex flex-col h-full">
                <i class="fas ${m.i} text-${m.c}-400 text-lg mb-3"></i>
                <div class="text-2xl font-black text-white font-mono tracking-tight">${m.v}</div>
                <div class="text-[11px] text-gray-300 font-bold mt-1">${m.l}</div>
                <div class="text-[9px] text-gray-600 mt-2 font-medium leading-tight">${m.desc}</div>
              </div>
            </div>`).join('')}
      </div>

      <div class="mt-8 pt-8 border-t border-void-800 flex flex-wrap justify-between items-center gap-6">
        <div class="flex items-center gap-6 text-[11px] text-gray-500 font-medium">
           <span class="flex items-center gap-2"><i class="fas fa-globe text-cyan-500"></i> ${c.languages || 'English'}</span>
           <span class="flex items-center gap-2"><i class="fas fa-coins text-amber-500"></i> ${c.currencies || 'USD'}</span>
           <span class="flex items-center gap-2"><i class="fas fa-users text-blue-500"></i> ${c.realPopulation ? (c.realPopulation / 1e6).toFixed(1) + 'M residents' : c.pop + 'M'}</span>
        </div>
        
        <div class="flex-1 max-w-xl">
           <div class="flex items-center justify-between mb-4">
              <h4 class="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                 <i class="fas fa-brain animate-pulse"></i> 5-Year AI Predictive Forecast
              </h4>
              <span class="text-[10px] text-gray-600 font-mono">Neural Model v2.4</span>
           </div>
           <div class="grid grid-cols-6 gap-2">
             ${[2025, 2026, 2027, 2028, 2029, 2030].map((yr, i) => `
               <div class="bg-void-900 rounded-xl p-3 border border-void-800 hover:border-cyan-500/20 transition-all group">
                 <div class="text-xs font-black mb-1 group-hover:scale-110 transition-transform" style="color:${scoreColor(parseFloat(pred[i]))}">${pred[i]}%</div>
                 <div class="text-[9px] text-gray-600 font-bold tracking-tighter uppercase">${yr}</div>
               </div>`).join('')}
           </div>
        </div>
      </div>
    </div>`;
}
function animateYear(y) {
  document.getElementById('year-label').textContent = y;
  const f = (y - 2015) / 15;
  const animated = ST.worldData.map(d => ({ ...d, score: clamp(d.score * (0.75 + 0.25 * f) + (Math.random() - 0.5) * 3, 15, 100) }));
  drawMap(animated);
}

// ════════════════════════════════════════════════════════════════════════════
// REAL-TIME MONITOR
// ════════════════════════════════════════════════════════════════════════════
function realtimeHTML() {
  return `
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h2 class="text-3xl font-black text-cyan-300 flex items-center gap-3">
          <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
          ${t('realtime')} — Urban Sensor Network
        </h2>
        <div class="flex items-center gap-4 mt-1.5">
          <span class="text-xs text-gray-400 font-bold" id="rt-datasource">Initializing...</span>
          <span id="rt-weather-badge" class="text-xs text-gray-400"></span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500" id="rt-lastupdate">Connecting...</span>
        <button onclick="toggleRTFeed()" id="rt-toggle" class="px-3 py-1.5 text-xs rounded-lg bg-emerald-800/60 border border-emerald-700 text-emerald-300 hover:bg-emerald-700/60 transition-all">
          <i class="fas fa-pause"></i> Pause
        </button>
      </div>
    </div>
    <!-- Live metric cards -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" id="rt-cards"></div>
    <!-- Extra metrics row (CO2 ppm, humidity, wind - real weather) -->
    <div class="grid grid-cols-3 gap-3" id="rt-extra-cards">
      <div class="et-card">
        <div class="flex items-center gap-1 mb-1"><i class="fas fa-smog text-yellow-400 text-xs"></i><span class="text-[9px] text-gray-400">CO₂ ppm (Atm)</span></div>
        <div class="text-lg font-black text-yellow-300" id="rt-co2ppm">—</div>
        <div class="text-[9px] text-gray-600">📡 NOAA model</div>
      </div>
      <div class="et-card">
        <div class="flex items-center gap-1 mb-1"><i class="fas fa-droplet text-blue-400 text-xs"></i><span class="text-[9px] text-gray-400">Humidity (Real)</span></div>
        <div class="text-lg font-black text-blue-300" id="rt-humidity">—</div>
        <div class="text-[9px] text-emerald-600">🌤️ Open-Meteo API</div>
      </div>
      <div class="et-card">
        <div class="flex items-center gap-1 mb-1"><i class="fas fa-wind text-cyan-400 text-xs"></i><span class="text-[9px] text-gray-400">Wind (Real)</span></div>
        <div class="text-lg font-black text-cyan-300" id="rt-wind">—</div>
        <div class="text-[9px] text-emerald-600">🌤️ Open-Meteo API</div>
      </div>
    </div>
    <!-- Chart -->
    <div class="et-card">
      <h3 class="et-card-title"><i class="fas fa-chart-line"></i> Live Sensor Feed (Last 30 readings)</h3>
      <div id="rt-chart" style="height:280px"></div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="et-card">
        <h3 class="et-card-title"><i class="fas fa-droplet"></i> Water & Energy Trend</h3>
        <div id="rt-water-energy" style="height:200px"></div>
      </div>
      <div class="et-card">
        <h3 class="et-card-title"><i class="fas fa-car"></i> Traffic & Air Quality</h3>
        <div id="rt-traffic-air" style="height:200px"></div>
      </div>
    </div>
  </div>`;
}

let rtPaused = false;
function toggleRTFeed() {
  rtPaused = !rtPaused;
  const btn = document.getElementById('rt-toggle');
  btn.innerHTML = rtPaused ? '<i class="fas fa-play"></i> Resume' : '<i class="fas fa-pause"></i> Pause';
  btn.className = `px-3 py-1.5 text-xs rounded-lg border transition-all ${rtPaused ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-emerald-800/60 border-emerald-700 text-emerald-300 hover:bg-emerald-700/60'}`;
}
async function initRealtime() {
  await fetchAndUpdateRT();
  ST.realtimeInterval = setInterval(async () => { if (!rtPaused) await fetchAndUpdateRT(); }, 3000);
}
async function fetchAndUpdateRT() {
  const r = await fetch('/realtime');
  const d = await r.json();
  ST.realtimeData = d.feed || [];
  const latest = d.latest;
  const el = document.getElementById('rt-lastupdate');
  const srcEl = document.getElementById('rt-datasource');
  if (el) el.textContent = 'Updated: ' + new Date().toLocaleTimeString();
  if (srcEl) srcEl.textContent = d.dataSource || 'Sensor Network';
  updateRTCards(latest);
  updateRTCharts();
  // Update weather badge if real data
  if (latest && latest.isRealWeather) {
    const badge = document.getElementById('rt-weather-badge');
    if (badge) badge.innerHTML = `<span class="text-xs text-emerald-400 font-bold tracking-tight"><i class="fas fa-check-circle mr-1"></i>REAL WEATHER ENGINE ACTIVE: ${latest.weatherDesc || ''} · ${latest.city}</span>`;
  }
}
function updateRTCards(l) {
  const el = document.getElementById('rt-cards'); if (!el) return;
  const metrics = [
    { label: 'Energy Usage', val: l.energy, unit: 'kWh', icon: 'fa-bolt', color: 'yellow', thresh: 200 },
    { label: 'Water Flow', val: l.water, unit: 'M³', icon: 'fa-droplet', color: 'blue', thresh: 90 },
    { label: 'Network Traffic', val: l.traffic, unit: '%', icon: 'fa-car', color: 'orange', thresh: 75 },
    { label: 'Air Quality (AQI)', val: l.air, unit: '', icon: 'fa-wind', color: 'emerald', thresh: 100, isRealAQI: l.isRealAQI },
    { label: 'Acoustic levels', val: l.noise, unit: 'dB', icon: 'fa-volume-high', color: 'purple', thresh: 65 },
    { label: 'Ambient Temp', val: l.temp, unit: '°C', icon: 'fa-thermometer-half', color: 'red', thresh: 30 },
  ];
  el.innerHTML = metrics.map(m => {
    const isAlert = m.val > m.thresh;
    return `<div class="et-card ${isAlert ? 'border-red-500 bg-red-950/40 ring-2 ring-red-500/20' : 'bg-void-900/80 border-void-800'} p-5 transition-all shadow-2xl">
      <div class="flex items-center justify-between mb-2">
        <i class="fas ${m.icon} text-${m.color}-400 text-2xl drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]"></i>
        ${isAlert ? '<span class="text-[11px] text-red-100 bg-red-600 px-2 py-0.5 rounded-full font-black animate-pulse shadow-neon-red">⚠ CRITICAL</span>' : ''}
      </div>
      <div class="text-4xl font-black text-white tracking-tighter mb-1">${m.val}<span class="text-lg ml-1 text-gray-500 font-bold">${m.unit}</span></div>
      <div class="text-[13px] text-gray-300 font-bold tracking-tight mt-1 flex justify-between items-center capitalize">
        <span>${m.label}</span>
        ${m.isRealAQI ? '<span title="Sentinel-5P API" class="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">LIVE API</span>' : ''}
      </div>
      <div class="mt-4 h-2 bg-gray-800/50 rounded-full overflow-hidden border border-void-800">
        <div class="h-full rounded-full transition-all duration-1000 shadow-glow" style="width:${clamp(m.val / m.thresh * 80, 5, 100)}%;background:${isAlert ? '#ef4444' : m.val > m.thresh * 0.8 ? '#f59e0b' : '#10b981'}"></div>
      </div>
    </div>`}).join('');
  // Update extra cards with real weather data
  const co2El = document.getElementById('rt-co2ppm');
  const humEl = document.getElementById('rt-humidity');
  const windEl = document.getElementById('rt-wind');
  if (co2El) co2El.textContent = l.co2ppm + ' ppm';
  if (humEl) humEl.textContent = l.humidity + '%';
  if (windEl) windEl.textContent = l.wind + ' km/h';
}
function updateRTCharts() {
  const d = ST.realtimeData; if (!d.length) return;
  const ts = d.map(x => new Date(x.ts).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const pl2 = { 
    paper_bgcolor: 'transparent', 
    plot_bgcolor: 'rgba(17,24,39,0.1)', 
    font: { color: '#e5e7eb', size: 12, family: 'Inter', weight: 'bold' }, 
    margin: { l: 60, r: 60, t: 10, b: 10 }, 
    xaxis: { visible: false }, 
    yaxis: { color: '#9ca3af', gridcolor: 'rgba(255,255,255,0.03)' } 
  };
  
  Plotly.newPlot('rt-chart', [
    { type: 'scatter', mode: 'lines', name: 'ENERGY POWER', x: ts, y: d.map(x => x.energy), line: { color: '#fcd34d', width: 4.5, shape: 'spline' } },
    { type: 'scatter', mode: 'lines', name: 'WATER RESERVE', x: ts, y: d.map(x => x.water), line: { color: '#60a5fa', width: 4.5, shape: 'spline' }, yaxis: 'y2' },
    { type: 'scatter', mode: 'lines', name: 'CITY TRAFFIC', x: ts, y: d.map(x => x.traffic), line: { color: '#fb923c', width: 4.5, shape: 'spline' }, yaxis: 'y3' },
  ], {
    ...pl2, yaxis: { title: 'Energy kWh', color: '#fcd34d', gridcolor: 'rgba(255,255,255,0.05)', showgrid: true },
    yaxis2: { title: 'Water M³', color: '#60a5fa', overlaying: 'y', side: 'right', showgrid: false },
    yaxis3: { visible: false, overlaying: 'y' },
    legend: { x: 0.5, y: 1.1, xanchor: 'center', orientation: 'h', bgcolor: 'rgba(0,0,0,0.4)', font: { size: 15, color: '#fff' }, borderwidth: 1, bordercolor: 'rgba(255,255,255,0.1)' },
  }, { responsive: true, displayModeBar: false });

  Plotly.newPlot('rt-water-energy', [
    { type: 'bar', name: 'WATER TREND', x: ts.slice(-12), y: d.slice(-12).map(x => x.water), marker: { color: '#3b82f6', opacity: 0.8 } },
    { type: 'bar', name: 'ENERGY DRAW', x: ts.slice(-12), y: d.slice(-12).map(x => x.energy / 10), marker: { color: '#f59e0b', opacity: 0.8 } },
  ], { 
    ...pl2, 
    barmode: 'group', 
    legend: { x: 0.5, y: 1.2, xanchor: 'center', orientation: 'h', font: { size: 14 } },
    yaxis: { title: 'Levels', showgrid: true, gridcolor: 'rgba(255,255,255,0.05)' }
  }, { responsive: true, displayModeBar: false });

  Plotly.newPlot('rt-traffic-air', [
    { type: 'scatter', mode: 'lines+markers', name: 'TRAFFIC INDEX', x: ts.slice(-12), y: d.slice(-12).map(x => x.traffic), line: { color: '#f97316', width: 5 }, marker: { size: 8 } },
    { type: 'scatter', mode: 'lines+markers', name: 'AIR QUALITY', x: ts.slice(-12), y: d.slice(-12).map(x => x.air), line: { color: '#10b981', width: 5 }, marker: { size: 8 } },
  ], { 
    ...pl2, 
    legend: { x: 0.5, y: 1.2, xanchor: 'center', orientation: 'h', font: { size: 14 } },
    yaxis: { title: 'Index', showgrid: true, gridcolor: 'rgba(255,255,255,0.05)' }
  }, { responsive: true, displayModeBar: false });
}


// ════════════════════════════════════════════════════════════════════════════
// SIMULATOR  (LSTM)
// ════════════════════════════════════════════════════════════════════════════
function simulatorHTML() {
  return `
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
    <div class="et-card">
      <h3 class="et-card-title mb-4"><i class="fas fa-sliders"></i> ${t('simulator')} Parameters</h3>
      ${[{ id: 's-ren', label: t('renewable'), unit: '%', min: 0, max: 100, val: 50, col: 'emerald' },
    { id: 's-rec', label: t('recycling'), unit: '%', min: 0, max: 100, val: 35, col: 'cyan' },
    { id: 's-wat', label: t('water'), unit: '%', min: 0, max: 100, val: 88, col: 'blue' },
    { id: 's-co2', label: 'CO₂ Emissions', unit: 't/cap', min: 0, max: 30, val: 8, col: 'red' },
    { id: 's-nrg', label: 'Energy Efficiency', unit: '%', min: 0, max: 100, val: 50, col: 'yellow' },
    { id: 's-trn', label: t('transport'), unit: '%', min: 0, max: 100, val: 50, col: 'violet' },
    { id: 's-pop', label: 'Population Growth', unit: '%/yr', min: 0, max: 5, val: 1.2, step: '0.1', col: 'orange' },
    ].map(s => `
        <div class="mb-4">
          <div class="flex justify-between mb-1">
            <span class="text-[11px] text-gray-300">${s.label}</span>
            <span class="text-[11px] font-bold text-${s.col}-300" id="${s.id}-v">${s.val}${s.unit}</span>
          </div>
          <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" step="${s.step || 1}" value="${s.val}"
                 class="w-full accent-${s.col}-400 h-1.5"
                 oninput="document.getElementById('${s.id}-v').textContent=this.value+'${s.unit}'">
        </div>`).join('')}
      <button onclick="runSimulation()" id="sim-btn"
              class="et-btn-primary w-full mt-2"><i class="fas fa-play"></i> ${t('runSim')}</button>
    </div>
    <div class="lg:col-span-2 space-y-4">
      <div class="et-card overflow-hidden">
        <h3 class="et-card-title"><i class="fas fa-chart-line"></i> 10-Year LSTM Forecast Projection</h3>
        <div id="sim-main" style="height:320px" class="relative">
          <div id="sim-placeholder" class="flex flex-col items-center justify-center h-full text-gray-500 text-base gap-3">
            <i class="fas fa-play-circle text-5xl text-cyan-900/50 animate-pulse"></i>
            <span class="font-bold tracking-widest uppercase opacity-40">Ready for Neural Simulation</span>
            <p class="text-xs opacity-30 mt-2 text-center">Adjust parameters and click 'Run Simulation' to generate AI forecast</p>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="et-card"><h3 class="et-card-title text-red-300"><i class="fas fa-cloud"></i> CO₂</h3><div id="sim-co2" style="height:140px"></div></div>
        <div class="et-card"><h3 class="et-card-title text-emerald-300"><i class="fas fa-solar-panel"></i> Renewable</h3><div id="sim-ren" style="height:140px"></div></div>
        <div class="et-card"><h3 class="et-card-title text-blue-300"><i class="fas fa-droplet"></i> Water</h3><div id="sim-wat" style="height:140px"></div></div>
      </div>
      <div id="sim-insights" class="hidden et-card border-cyan-800/50">
        <h3 class="et-card-title mb-3"><i class="fas fa-lightbulb text-yellow-400"></i> AI Insights</h3>
        <div id="sim-insights-content" class="space-y-1.5 mb-4"></div>
        <div class="grid grid-cols-3 gap-3 mt-4">
          <div class="text-center bg-gray-800 rounded-lg p-3">
            <div class="text-xs text-gray-400">Base Score</div>
            <div class="text-2xl font-black text-gray-200" id="sim-base">—</div>
          </div>
          <div class="text-center bg-cyan-900/30 border border-cyan-800 rounded-lg p-3">
            <div class="text-xs text-cyan-400">Predicted 2035</div>
            <div class="text-3xl font-black" id="sim-final" style="color:#22d3ee">—</div>
          </div>
          <div class="text-center bg-gray-800 rounded-lg p-3">
            <div class="text-xs text-gray-400">Grade</div>
            <div class="text-2xl font-black text-emerald-300" id="sim-grade">—</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

async function runSimulation() {
  const btn = document.getElementById('sim-btn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running LSTM...'; btn.disabled = true;
  const payload = {
    renewable: +document.getElementById('s-ren').value, recycling: +document.getElementById('s-rec').value,
    waterAccess: +document.getElementById('s-wat').value, co2: +document.getElementById('s-co2').value,
    energyEff: +document.getElementById('s-nrg').value, transport: +document.getElementById('s-trn').value,
    populationGrowth: +document.getElementById('s-pop').value,
  };
  const r = await fetch('/simulate_future', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const d = await r.json(); ST.simResult = d;
  
  const placeholder = document.getElementById('sim-placeholder');
  if (placeholder) placeholder.classList.add('hidden');

  const pl = { paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(17,24,39,0.4)', font: { color: '#e5e7eb', size: 11, weight: '600' }, showlegend: false, margin: { l: 40, r: 10, t: 8, b: 35 } };
  const pla = { ...pl, xaxis: { color: '#64748b', gridcolor: 'rgba(255,255,255,0.03)' }, yaxis: { color: '#64748b', gridcolor: 'rgba(255,255,255,0.03)' } };

  Plotly.newPlot('sim-main', [
    { type: 'scatter', mode: 'lines', name: 'Upper CI', x: d.years, y: d.upperBand || d.scores, line: { color: 'rgba(34,211,238,0.2)', width: 0 }, fill: 'tozeroy', fillcolor: 'rgba(34,211,238,0.04)', showlegend: false },
    {
      type: 'scatter', mode: 'lines+markers', name: 'Score', x: d.years, y: d.scores, line: { color: '#22d3ee', width: 3 },
      marker: { color: d.scores.map(s => scoreColor(s)), size: 7 }, fill: 'tonexty', fillcolor: 'rgba(34,211,238,0.07)',
      text: d.years.map((yr, i) => `${yr}: ${d.scores[i]}`), hovertemplate: '%{text}<extra></extra>'
    },
    { type: 'scatter', mode: 'lines', name: 'Lower CI', x: d.years, y: d.lowerBand || d.scores, line: { color: 'rgba(34,211,238,0.2)', width: 0 }, fill: 'tonexty', fillcolor: 'rgba(34,211,238,0.04)', showlegend: false },
  ], { ...pla, yaxis: { ...pla.yaxis, range: [0, 105], title: 'Score' }, xaxis: { ...pla.xaxis, title: 'Year' }, margin: { l: 45, r: 10, t: 8, b: 40 }, legend: { bgcolor: 'transparent', font: { color: '#9ca3af', size: 9 } } }, { responsive: true, displayModeBar: false });

  Plotly.newPlot('sim-co2', [{ type: 'scatter', mode: 'lines', x: d.years, y: d.co2Trend, line: { color: '#ef4444', width: 2 }, fill: 'tozeroy', fillcolor: 'rgba(239,68,68,0.07)' }], pla, { responsive: true, displayModeBar: false });
  Plotly.newPlot('sim-ren', [{ type: 'scatter', mode: 'lines', x: d.years, y: d.renewTrend, line: { color: '#10b981', width: 2 }, fill: 'tozeroy', fillcolor: 'rgba(16,185,129,0.07)' }], pla, { responsive: true, displayModeBar: false });
  Plotly.newPlot('sim-wat', [{ type: 'scatter', mode: 'lines', x: d.years, y: d.waterTrend, line: { color: '#3b82f6', width: 2 }, fill: 'tozeroy', fillcolor: 'rgba(59,130,246,0.07)' }], pla, { responsive: true, displayModeBar: false });

  document.getElementById('sim-insights').classList.remove('hidden');
  document.getElementById('sim-insights-content').innerHTML = d.explanation.map(e => `<div class="flex gap-3 items-start p-3 bg-void-900/50 rounded-xl border border-void-800/50 shadow-inner">
      <i class="fas fa-caret-right text-cyan-400 mt-1"></i>
      <p class="text-base text-gray-100 font-medium leading-relaxed">${e}</p>
    </div>`).join('');
  document.getElementById('sim-base').textContent = d.baseScore;
  const fEl = document.getElementById('sim-final'); fEl.textContent = d.finalScore; fEl.style.color = scoreColor(d.finalScore);
  document.getElementById('sim-grade').textContent = scoreGrade(d.finalScore);
  btn.innerHTML = '<i class="fas fa-check"></i> Done';
  setTimeout(() => { btn.innerHTML = `<i class="fas fa-play"></i> ${t('runSim')}`; btn.disabled = false; }, 2000);
  toast('Simulation complete!', 'success');
}

// ════════════════════════════════════════════════════════════════════════════
// COMPARISON — Baseline vs Projected
// ════════════════════════════════════════════════════════════════════════════
function compareHTML() {
  return `
  <div class="space-y-5">
    <h2 class="text-xl font-black text-cyan-300 flex items-center gap-2"><i class="fas fa-code-compare"></i> ${t('compare')} — Baseline vs Projected</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div class="et-card border-gray-600">
        <h3 class="et-card-title text-gray-300 mb-3"><i class="fas fa-circle-dot text-gray-400"></i> ${t('baseline')} Scenario</h3>
        ${buildScenarioSliders('b', 'gray')}
      </div>
      <div class="et-card border-cyan-800/50">
        <h3 class="et-card-title text-cyan-300 mb-3"><i class="fas fa-circle-dot text-cyan-400"></i> ${t('projected')} Scenario</h3>
        ${buildScenarioSliders('p', 'cyan')}
      </div>
    </div>
    <div class="flex justify-center">
      <button onclick="runCompare()" id="cmp-btn" class="et-btn-primary px-10">
        <i class="fas fa-code-compare"></i> Run Comparison
      </button>
    </div>
    <div id="compare-results" class="hidden animate-tabFadeIn">
      <div class="flex flex-col lg:flex-row gap-6">
        <!-- Vertical Score Stack (Left) -->
        <div class="flex-none w-full lg:w-72 space-y-4">
          <div class="et-card p-6 bg-void-900 border-void-800 shadow-2xl">
            <div class="text-[11px] text-gray-500 font-black uppercase tracking-widest mb-2">${t('baseline')} Score</div>
            <div class="text-5xl font-black text-gray-400 font-mono" id="cmp-base">—</div>
            <div class="text-[10px] text-gray-600 mt-2">Historic Static Model</div>
          </div>
          
          <div class="et-card p-6 bg-cyan-950/20 border-cyan-800 shadow-neon">
            <div class="text-[11px] text-cyan-400 font-black uppercase tracking-widest mb-2">Simulation Delta</div>
            <div class="text-5xl font-black font-mono" id="cmp-diff">—</div>
            <div class="flex items-center gap-2 mt-2">
               <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
               <span class="text-[10px] text-cyan-500 font-bold uppercase tracking-tight" id="cmp-diff-label">Calculating...</span>
            </div>
          </div>

          <div class="et-card p-6 bg-emerald-950/20 border-emerald-800 shadow-neon-eco">
            <div class="text-[11px] text-emerald-400 font-black uppercase tracking-widest mb-2">${t('projected')} Score</div>
            <div class="text-5xl font-black text-emerald-400 font-mono" id="cmp-proj">—</div>
            <div class="text-[10px] text-emerald-600 mt-2">LSTM AI Optimization Path</div>
          </div>
        </div>

        <!-- Trajectory Chart (Right) -->
        <div class="flex-1 et-card p-1 min-h-[400px]">
          <div class="p-6 border-b border-void-800/50">
             <h3 class="text-lg font-black text-white flex items-center gap-2">
                <i class="fas fa-chart-line text-cyan-400"></i> Trajectory Comparison (2025–2035)
             </h3>
             <p class="text-xs text-gray-500 mt-1 uppercase tracking-tighter">Baseline Scenario vs. Optimized Neural Projection</p>
          </div>
          <div id="cmp-chart" class="w-full h-[380px]"></div>
        </div>
      </div>

      <!-- Bottom Insights Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div class="et-card bg-emerald-900/10 border-emerald-800/40 p-6">
          <h3 class="text-lg font-black text-emerald-300 mb-4 flex items-center gap-2">
             <i class="fas fa-arrow-trend-up"></i> High-Impact Improvements
          </h3>
          <div id="cmp-improvements" class="space-y-3"></div>
        </div>
        <div class="et-card bg-blue-900/10 border-blue-800/40 p-6">
          <h3 class="text-lg font-black text-blue-300 mb-4 flex items-center gap-2">
             <i class="fas fa-chart-bar"></i> Key Efficiency Gains
          </h3>
          <div id="cmp-gains" class="space-y-3"></div>
        </div>
      </div>
    </div>
  </div>`;
}

function buildScenarioSliders(pfx, col) {
  return [{ id: `${pfx}-ren`, l: 'Renewable %', min: 0, max: 100, v: pfx === 'b' ? 40 : 70 },
  { id: `${pfx}-rec`, l: 'Recycling %', min: 0, max: 100, v: pfx === 'b' ? 30 : 55 },
  { id: `${pfx}-wat`, l: 'Water Access %', min: 0, max: 100, v: pfx === 'b' ? 85 : 95 },
  { id: `${pfx}-co2`, l: 'CO₂ t/cap', min: 0, max: 25, v: pfx === 'b' ? 8 : 4 },
  { id: `${pfx}-nrg`, l: 'Energy Eff %', min: 0, max: 100, v: pfx === 'b' ? 45 : 70 },
  { id: `${pfx}-trn`, l: 'Transport %', min: 0, max: 100, v: pfx === 'b' ? 45 : 65 },
  ].map(s => `
    <div class="mb-4">
      <div class="flex justify-between mb-1">
        <span class="text-sm text-gray-300 font-bold">${s.l}</span>
        <span class="text-sm font-black text-${col}-400" id="${s.id}-v">${s.v}</span>
      </div>
      <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" value="${s.v}" class="w-full accent-${col}-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
             oninput="document.getElementById('${s.id}-v').textContent=this.value">
    </div>`).join('');
}

async function runCompare() {
  const btn = document.getElementById('cmp-btn'); btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...'; btn.disabled = true;
  const getVals = p => ({
    renewable: +document.getElementById(`${p}-ren`).value, recycling: +document.getElementById(`${p}-rec`).value,
    waterAccess: +document.getElementById(`${p}-wat`).value, co2: +document.getElementById(`${p}-co2`).value,
    energyEff: +document.getElementById(`${p}-nrg`).value, transport: +document.getElementById(`${p}-trn`).value
  });
  const r = await fetch('/simulate/compare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseline: getVals('b'), projected: getVals('p') }) });
  const d = await r.json(); ST.compareResult = d;

  document.getElementById('compare-results').classList.remove('hidden');
  document.getElementById('cmp-base').textContent = d.baselineScore;
  document.getElementById('cmp-proj').textContent = d.projectedScore;
  const diffEl = document.getElementById('cmp-diff');
  diffEl.textContent = (d.diff >= 0 ? '+' : '') + d.diff;
  diffEl.style.color = d.diff >= 0 ? '#10b981' : '#ef4444';
  document.getElementById('cmp-diff-label').textContent = d.diff >= 0 ? 'Improvement' : 'Decline';

  Plotly.newPlot('cmp-chart', [
    { type: 'scatter', mode: 'lines', name: t('baseline'), x: d.years, y: d.baselineTrend, line: { color: '#94a3b8', width: 4, dash: 'dot', shape: 'spline' }, fill: 'tozeroy', fillcolor: 'rgba(148,163,184,0.03)' },
    { type: 'scatter', mode: 'lines', name: t('projected'), x: d.years, y: d.projectedTrend, line: { color: '#22d3ee', width: 5, shape: 'spline' }, fill: 'tozeroy', fillcolor: 'rgba(34,211,238,0.05)' },
  ], {
    paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(2, 6, 23, 0.3)',
    margin: { l: 50, r: 20, t: 20, b: 50 }, font: { color: '#94a3b8', size: 12, weight: 'bold' },
    xaxis: { color: '#475569', gridcolor: 'rgba(255,255,255,0.02)', zeroline: false }, 
    yaxis: { color: '#475569', gridcolor: 'rgba(255,255,255,0.02)', range: [0, 100], zeroline: false },
    legend: { x: 0.5, y: -0.2, xanchor: 'center', orientation: 'h', bgcolor: 'transparent', font: { color: '#94a3b8', size: 14 } },
  }, { responsive: true, displayModeBar: false });

  document.getElementById('cmp-improvements').innerHTML = d.improvements.map(i => `<div class="p-3 bg-void-950/50 rounded-lg border border-emerald-900/30 text-base text-gray-200 flex items-start gap-3 shadow-inner"><i class="fas fa-circle-check text-emerald-500 mt-1"></i>${i}</div>`).join('') || '<p class="text-base text-gray-500 text-center italic">No significant changes detected</p>';
  document.getElementById('cmp-gains').innerHTML = `
    <div class="space-y-4">
      <div class="flex justify-between items-center p-3 bg-void-950/50 rounded-lg border border-blue-900/30"><span class="text-sm font-bold text-gray-400 tracking-widest uppercase">CO₂ Savings</span><span class="text-xl font-black text-emerald-400 font-mono">${d.co2Savings > 0 ? '−' + d.co2Savings : d.co2Savings} t/cap</span></div>
      <div class="flex justify-between items-center p-3 bg-void-950/50 rounded-lg border border-blue-900/30"><span class="text-sm font-bold text-gray-400 tracking-widest uppercase">Water Gain</span><span class="text-xl font-black text-blue-400 font-mono">+${d.waterGain}%</span></div>
      <div class="flex justify-between items-center p-3 bg-void-950/50 rounded-lg border border-blue-900/30"><span class="text-sm font-bold text-gray-400 tracking-widest uppercase">Score Delta</span><span class="text-xl font-black font-mono" style="color:${d.diff >= 0 ? '#10b981' : '#ef4444'}">${d.diff >= 0 ? '+' : ''}${d.diff} pts</span></div>
    </div>`;

  btn.innerHTML = '<i class="fas fa-code-compare"></i> Run Comparison'; btn.disabled = false;
}

// ════════════════════════════════════════════════════════════════════════════
// SHAP EXPLAINABILITY
// ════════════════════════════════════════════════════════════════════════════
function shapHTML() {
  return `
  <div class="space-y-5">
    <h2 class="text-xl font-black text-cyan-300 flex items-center gap-2"><i class="fas fa-magnifying-glass-chart"></i> ${t('shap')} — Model Explainability</h2>
    <div class="et-card border-violet-900/50 bg-violet-950/10">
      <div class="flex items-start gap-3">
        <i class="fas fa-circle-info text-violet-400 mt-0.5"></i>
        <p class="text-xs text-gray-300">SHAP (SHapley Additive exPlanations) decomposes each sustainability prediction into per-feature contributions. Positive values push the score higher; negative values push it lower. Uses LSTM+SHAP hybrid model with 92.4% confidence.</p>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div class="et-card">
        <h3 class="et-card-title mb-4">Input Parameters</h3>
        ${[{ id: 'sh-ren', l: 'Renewable Mix', unit: '%', min: 0, max: 100, v: 50, col: 'emerald' },
    { id: 'sh-wat', l: 'Water Potability', unit: '%', min: 0, max: 100, v: 88, col: 'blue' },
    { id: 'sh-co2', l: 'Carbon footprint', unit: 't/cap', min: 0, max: 30, v: 8, col: 'red' },
    { id: 'sh-rec', l: 'Recycling Eff.', unit: '%', min: 0, max: 100, v: 35, col: 'cyan' },
    { id: 'sh-nrg', l: 'Energy Load', unit: 'kWh', min: 50, max: 500, v: 180, col: 'yellow' },
    { id: 'sh-trf', l: 'Traffic Density', unit: '%', min: 0, max: 100, v: 65, col: 'orange' },
    { id: 'sh-h2o', l: 'Water Volume', unit: 'M³', min: 0, max: 200, v: 80, col: 'violet' },
    ].map(s => `
          <div class="mb-4">
            <div class="flex justify-between mb-1.5">
              <span class="text-sm text-gray-300 font-bold tracking-tight">${s.l}</span>
              <span class="text-sm font-black text-${s.col}-400" id="${s.id}-v">${s.v}${s.unit}</span>
            </div>
            <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" value="${s.v}" class="w-full accent-${s.col}-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                   oninput="document.getElementById('${s.id}-v').textContent=this.value+'${s.unit}'">
          </div>`).join('')}
        <button onclick="runSHAP()" id="shap-btn" class="et-btn-primary w-full">
          <i class="fas fa-magnifying-glass-chart"></i> Explain Prediction
        </button>
      </div>
      <div class="lg:col-span-2 space-y-4">
        <div class="et-card">
          <h3 class="et-card-title"><i class="fas fa-chart-bar text-violet-400"></i> SHAP Waterfall Chart</h3>
          <div id="shap-waterfall" style="min-height:350px" class="relative">
            <div id="shap-placeholder" class="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-3 py-20">
              <i class="fas fa-magnifying-glass-chart text-5xl text-violet-900/40 animate-pulse"></i>
              <span class="font-bold tracking-widest uppercase opacity-40">Awaiting Simulation</span>
              <p class="text-[10px] opacity-30">Run explanation to visualize SHapley contributions</p>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="et-card overflow-hidden">
            <h3 class="et-card-title flex items-center justify-between">
               <span><i class="fas fa-chart-pie text-violet-400"></i> Global Feature Influence</span>
               <span class="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Interactive Radial Analysis</span>
            </h3>
            <div id="shap-pie" style="height:350px"></div>
          </div>
          <div class="et-card" id="shap-summary">
            <h3 class="et-card-title mb-3">Prediction Summary</h3>
            <div class="text-xs text-gray-500">Run SHAP analysis to view prediction breakdown.</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

async function runSHAP() {
  const btn = document.getElementById('shap-btn'); btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...'; btn.disabled = true;
  const payload = {
    energy: +document.getElementById('sh-nrg').value, water: +document.getElementById('sh-h2o').value,
    traffic: +document.getElementById('sh-trf').value, renewable: +document.getElementById('sh-ren').value,
    recycling: +document.getElementById('sh-rec').value, co2: +document.getElementById('sh-co2').value,
    waterAccess: +document.getElementById('sh-wat').value
  };
  const r = await fetch('/shap/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const d = await r.json(); ST.shapData = d;
  
  const placeholder = document.getElementById('shap-placeholder');
  if (placeholder) placeholder.classList.add('hidden');

  const features = d.features;
  const colors = features.map(f => f.contribution >= 0 ? '#10b981' : '#ef4444');
  Plotly.newPlot('shap-waterfall', [{
    type: 'waterfall', orientation: 'h',
    measure: ['absolute', ...features.map(() => 'relative'), 'total'],
    x: [d.baseValue, ...features.map(f => f.contribution), 0],
    y: ['BASE SCORE', ...features.map(f => f.feature.toUpperCase()), 'FINAL PREDICTION'],
    connector: { line: { color: 'rgba(255,255,255,0.1)', width: 2 } },
    decreasing: { marker: { color: '#ef4444', line: { color: '#ef4444', width: 1 } } },
    increasing: { marker: { color: '#10b981', line: { color: '#10b981', width: 1 } } },
    totals: { marker: { color: '#22d3ee', line: { color: '#22d3ee', width: 1 } } },
    text: [d.baseValue, ...features.map(f => (f.contribution >= 0 ? '+' : '') + f.contribution), d.predictedValue],
    textposition: 'outside',
    textfont: { size: 13, weight: 'bold', color: '#fff' }
  }], {
    paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(2,6,23,0.2)',
    margin: { l: 180, r: 60, t: 30, b: 30 }, font: { color: '#94a3b8', size: 12, weight: 'bold' },
    xaxis: { color: '#475569', gridcolor: 'rgba(255,255,255,0.03)', range: [20, 100], zeroline: false }, 
    yaxis: { color: '#e5e7eb', tickfont: { size: 11 } },
  }, { responsive: true, displayModeBar: false });

  const absContribs = features.map(f => Math.abs(f.contribution));
  Plotly.newPlot('shap-pie', [{
    type: 'pie', 
    labels: features.map(f => f.feature.toUpperCase()), 
    values: absContribs,
    marker: { 
      colors: features.map(f => f.color), 
      line: { color: 'rgba(3, 7, 18, 0.8)', width: 3 } 
    }, 
    hole: 0.72, 
    textinfo: 'none',
    hoverinfo: 'label+percent+value',
    hovertemplate: "<b>%{label}</b><br>Impact: %{value} pts<br>Influence: %{percent}<extra></extra>",
    hoverlabel: {
       bgcolor: '#030712',
       bordercolor: '#4c1d95',
       font: { color: '#fff', size: 14, family: 'Inter', weight: 'bold' }
    }
  }], { 
    paper_bgcolor: 'transparent', 
    margin: { l: 40, r: 40, t: 40, b: 40 }, 
    showlegend: false,
    annotations: [{ 
      font: { size: 18, color: '#e5e7eb', weight: '900', family: 'Inter' }, 
      showarrow: false, 
      text: 'NEURAL<br>WEIGHTS', 
      x: 0.5, y: 0.5 
    }]
  }, { responsive: true, displayModeBar: false });

  document.getElementById('shap-summary').innerHTML = `
    <h3 class="et-card-title mb-4">Neural Impact Summary</h3>
    <div class="space-y-4">
      <div class="flex justify-between items-center p-3 bg-void-950 rounded-xl border border-void-800 shadow-inner"><span class="text-sm font-bold text-gray-400 font-display uppercase tracking-widest">Base Score</span><span class="text-2xl font-black text-gray-200 font-mono">${d.baseValue}</span></div>
      <div class="flex justify-between items-center p-4 bg-violet-950/20 rounded-xl border border-violet-800 shadow-neon-violet"><span class="text-sm font-bold text-violet-300 font-display uppercase tracking-widest">Prediction</span><span class="text-3xl font-black font-mono" style="color:${scoreColor(d.predictedValue)}">${d.predictedValue}%</span></div>
      <div class="flex justify-between items-center p-3 bg-void-950 rounded-xl border border-void-800 shadow-inner"><span class="text-sm font-bold text-gray-400 font-display uppercase tracking-widest">Net Impact</span><span class="text-2xl font-black font-mono text-cyan-400">${(d.predictedValue - d.baseValue).toFixed(1)} pts</span></div>
      <div class="grid grid-cols-2 gap-3 mt-4">
         <div class="bg-violet-950/30 border border-violet-800/40 p-3 rounded-2xl text-center space-y-1"><div class="text-[10px] text-violet-400 font-black uppercase">Confidence</div><div class="text-lg font-black text-white">${d.confidence}%</div></div>
         <div class="bg-cyan-950/30 border border-cyan-800/40 p-3 rounded-2xl text-center space-y-1"><div class="text-[10px] text-cyan-400 font-black uppercase">Grade Eval</div><div class="text-lg font-black text-white">${scoreGrade(d.predictedValue)}</div></div>
      </div>
    </div>`;
  btn.innerHTML = '<i class="fas fa-magnifying-glass-chart"></i> Explain Prediction'; btn.disabled = false;
  toast('SHAP analysis complete!', 'success');
}

// ════════════════════════════════════════════════════════════════════════════
// RL OPTIMIZER
// ════════════════════════════════════════════════════════════════════════════
function rlHTML() {
  return `
  <div class="space-y-5">
    <h2 class="text-xl font-black text-cyan-300 flex items-center gap-2"><i class="fas fa-brain"></i> ${t('rlOptimizer')}</h2>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div class="et-card p-6 bg-void-900 border-void-800 shadow-2xl">
        <h3 class="text-lg font-black text-violet-300 mb-6 flex items-center gap-2">
           <i class="fas fa-microchip animate-pulse"></i> Agent Neural Config
        </h3>
        <div class="mb-5">
          <label class="text-sm text-gray-400 font-bold tracking-widest uppercase">Select Environment Logic</label>
          <div class="grid grid-cols-2 gap-3 mt-2">
            <button onclick="selAlgo('dqn')" id="rl-dqn" class="py-3 text-sm rounded-xl font-black bg-violet-700 text-white transition-all shadow-neon-violet">DQN Deep-Q</button>
            <button onclick="selAlgo('ppo')" id="rl-ppo" class="py-3 text-sm rounded-xl font-black bg-gray-900 text-gray-400 border border-void-800 hover:border-violet-500/30 transition-all">PPO Policy</button>
          </div>
        </div>
        ${[{ id: 'rl-ep', l: 'Training Epochs', min: 10, max: 100, v: 40, col: 'violet' },
           { id: 'rl-lr', l: 'Learning Rate (η)', min: 1, max: 10, v: 2, unit: '/1000', col: 'violet' },
           { id: 'rl-gamma', l: 'Discount Factor (γ)', min: 90, max: 99, v: 99, unit: '%', col: 'violet' }
          ].map(s => `
        <div class="mb-5">
          <div class="flex justify-between mb-1.5">
            <span class="text-sm text-gray-300 font-black">${s.l}</span>
            <span class="text-sm font-black text-violet-400" id="${s.id}-v">${s.v}${s.unit || ''}</span>
          </div>
          <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" value="${s.v}" 
                 class="w-full accent-violet-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                 oninput="document.getElementById('${s.id}-v').textContent=this.value+'${s.unit||''}'">
        </div>`).join('')}
        <button onclick="runRL()" id="rl-btn" class="et-btn-violet w-full py-4 rounded-xl text-base font-black shadow-neon-violet hover:scale-[1.02] transition-all">
          <i class="fas fa-brain-circuit mr-2 text-xl"></i> START NEURAL TRAINING
        </button>
      </div>
      <div class="lg:col-span-2 space-y-4">
        <div class="et-card p-0 overflow-hidden">
          <div class="p-4 border-b border-void-800 bg-void-950 flex shadow-inner items-center justify-between">
             <h3 class="text-base font-black text-violet-300 flex items-center gap-2"><i class="fas fa-microchip"></i> Training Convergence Flow</h3>
             <span class="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Model: LSTM-Critic v4.2</span>
          </div>
          <div id="rl-chart" style="height:350px" class="relative">
            <div id="rl-placeholder" class="flex flex-col items-center justify-center h-full text-gray-500 text-base gap-3 py-20">
              <i class="fas fa-brain-circuit text-6xl text-violet-900/40 animate-pulse"></i>
              <span class="font-bold tracking-widest uppercase opacity-40">Agent Ready for Training</span>
              <p class="text-xs opacity-30">Configure neural parameters and click Start Training</p>
            </div>
          </div>
        </div>
        <div id="rl-optimal" class="hidden et-card border-violet-800/50">
          <h3 class="et-card-title text-violet-300 mb-3">🎯 Optimal Policy Found</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2" id="rl-policy-grid"></div>
          <div class="mt-4 text-center bg-gray-800 rounded-xl p-4">
            <div class="text-xs text-gray-400">Max Achievable Score</div>
            <div class="text-5xl font-black text-violet-300 mt-1" id="rl-score">—</div>
            <div class="text-xs text-gray-500 mt-1">After <span id="rl-eps">—</span> training episodes</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

let _rlAlgo = 'dqn';
function selAlgo(a) {
  _rlAlgo = a;
  document.getElementById('rl-dqn').className = `py-2 text-xs rounded-lg font-bold transition-all ${a === 'dqn' ? 'bg-violet-700 text-white' : 'bg-gray-700 text-gray-300'}`;
  document.getElementById('rl-ppo').className = `py-2 text-xs rounded-lg font-bold transition-all ${a === 'ppo' ? 'bg-violet-700 text-white' : 'bg-gray-700 text-gray-300'}`;
}

async function runRL() {
  const btn = document.getElementById('rl-btn'); 
  btn.innerHTML = '<i class="fas fa-cog fa-spin"></i> GENERATING HYPERPARAMETERS...'; btn.disabled = true;
  
  const placeholder = document.getElementById('rl-placeholder');
  if (placeholder) placeholder.classList.add('hidden');

  const ep = +document.getElementById('rl-ep').value;
  const r = await fetch('/rl_optimize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ episodes: ep, algo: _rlAlgo }) });
  const d = await r.json(); ST.rlResult = d;

  Plotly.newPlot('rl-chart', [
    { type: 'scatter', mode: 'lines', name: 'AGENT SCORE', x: d.trainingData.map(x => x.episode), y: d.trainingData.map(x => x.score), line: { color: '#a78bfa', width: 4.5, shape: 'spline' }, fill: 'tozeroy', fillcolor: 'rgba(167,139,250,0.05)' },
    { type: 'scatter', mode: 'lines', name: 'REWARD FLOW', x: d.trainingData.map(x => x.episode), y: d.trainingData.map(x => x.reward), line: { color: '#8b5cf6', width: 2.5, dash: 'dot', shape: 'spline' }, yaxis: 'y2' },
    { type: 'scatter', mode: 'lines', name: 'LOSS GRADIENT', x: d.trainingData.map(x => x.episode), y: d.trainingData.map(x => x.loss * 50), line: { color: '#ef4444', width: 1.5 }, yaxis: 'y3' },
  ], {
    paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(2, 6, 23, 0.4)',
    margin: { l: 60, r: 60, t: 30, b: 60 }, font: { color: '#94a3b8', size: 12, weight: 'bold' },
    xaxis: { title: 'TRAINING EPISODES', color: '#475569', gridcolor: 'rgba(255,255,255,0.02)', zeroline: false },
    yaxis: { title: 'CONVERGENCE SCORE', color: '#a78bfa', gridcolor: 'rgba(255,255,255,0.02)', zeroline: false },
    yaxis2: { title: 'REWARD VALUE', color: '#8b5cf6', overlaying: 'y', side: 'right', showgrid: false },
    yaxis3: { visible: false, overlaying: 'y' },
    legend: { x: 0.5, y: 1.15, xanchor: 'center', orientation: 'h', bgcolor: 'transparent', font: { color: '#e5e7eb', size: 14 } },
  }, { responsive: true, displayModeBar: false });

  const op = d.optimalPolicy;
  document.getElementById('rl-optimal').classList.remove('hidden');
  document.getElementById('rl-optimal').className = 'et-card border-violet-800 shadow-neon-violet transition-all animate-tabFadeIn';
  document.getElementById('rl-policy-grid').innerHTML = [
    { l: 'Renewable Support', v: op.renewable + '%', i: 'fa-solar-panel', c: 'emerald' },
    { l: 'Circular Recyc.', v: op.recycling + '%', i: 'fa-recycle', c: 'cyan' },
    { l: 'Water Integrity', v: op.waterAccess + '%', i: 'fa-droplet', c: 'blue' },
    { l: 'Emission Cap', v: op.co2Reduction + '%', i: 'fa-cloud-arrow-down', c: 'red' },
    { l: 'Energy Logic', v: op.energyEff + '%', i: 'fa-bolt', c: 'yellow' },
    { l: 'Smart Mobility', v: op.transport + '%', i: 'fa-bus', c: 'violet' },
  ].map(p => `<div class="bg-void-950/80 border border-void-800 rounded-2xl p-5 text-center group hover:border-${p.c}-500/50 transition-all">
    <i class="fas ${p.i} text-${p.c}-400 text-3xl mb-3 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"></i>
    <div class="text-3xl font-black text-white font-mono tracking-tighter">${p.v}</div>
    <div class="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">${p.l}</div>
  </div>`).join('');
  document.getElementById('rl-score').textContent = op.finalScore + '/100';
  const scoreEl = document.getElementById('rl-score');
  scoreEl.className = 'text-6xl font-black text-violet-300 mt-1 font-mono tracking-tighter drop-shadow-neon-violet';
  document.getElementById('rl-eps').textContent = ep;
  btn.innerHTML = `<i class="fas fa-robot"></i> ${t('trainAgent')}`; btn.disabled = false;
  toast('RL Training complete!', 'success');
}

// ════════════════════════════════════════════════════════════════════════════
// ANOMALY DETECTION
// ════════════════════════════════════════════════════════════════════════════
function anomalyHTML() {
  return `
  <div class="space-y-4">
    <h2 class="text-xl font-black text-cyan-300 flex items-center gap-2"><i class="fas fa-triangle-exclamation text-yellow-400"></i> ${t('anomaly')} Detection</h2>
    <div id="anomaly-alerts" class="space-y-2"></div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="et-card lg:col-span-2">
        <h3 class="et-card-title text-yellow-300">CO₂ Anomaly Timeline (Isolation Forest)</h3>
        <div id="an-co2" style="height:280px"></div>
      </div>
      <div id="an-stats" class="space-y-3"></div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="et-card p-0 overflow-hidden border-blue-900/30">
        <div class="px-4 py-2 border-b border-blue-900/20 bg-blue-900/5 flex justify-between items-center">
           <span class="text-xs font-black text-blue-300">WATER ANOMALY SENSORS</span>
           <i class="fas fa-droplet text-blue-400 text-[10px]"></i>
        </div>
        <div id="an-water" style="height:220px"></div>
      </div>
      <div class="et-card p-0 overflow-hidden border-emerald-900/30">
        <div class="px-4 py-2 border-b border-emerald-900/20 bg-emerald-900/5 flex justify-between items-center">
           <span class="text-xs font-black text-emerald-300">ENERGY LOGIC DEVIATIONS</span>
           <i class="fas fa-bolt text-emerald-400 text-[10px]"></i>
        </div>
        <div id="an-energy" style="height:220px"></div>
      </div>
      <div class="et-card p-0 overflow-hidden border-orange-900/30">
        <div class="px-4 py-2 border-b border-orange-900/20 bg-orange-900/5 flex justify-between items-center">
           <span class="text-xs font-black text-orange-300">TRAFFIC KINETIC OUTLIERS</span>
           <i class="fas fa-car text-orange-400 text-[10px]"></i>
        </div>
        <div id="an-traffic" style="height:220px"></div>
      </div>
    </div>
  </div>`;
}

async function loadAnomaly() {
  const r = await fetch('/anomaly_data'); ST.anomalyData = await r.json();
  const data = ST.anomalyData;
  const anom = data.filter(d => d.isAnomaly);
  document.getElementById('anomaly-alerts').innerHTML = anom.map(a => `
    <div class="flex items-start gap-3 bg-yellow-900/15 border border-yellow-700/40 rounded-xl p-3">
      <i class="fas fa-triangle-exclamation text-yellow-400 mt-0.5 flex-none"></i>
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-yellow-300">⚠ Environmental Anomaly Detected — ${a.time}</span>
          <span class="text-[9px] px-2 py-0.5 rounded-full font-bold ${a.severity === 'CRITICAL' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}">${a.severity}</span>
        </div>
        <p class="text-xs text-gray-400 mt-0.5">Possible cause: <span class="text-yellow-200">${a.cause}</span> · CO₂: ${a.co2}t · Water: ${a.water}M³ · Energy: ${a.energy}kWh</p>
      </div>
    </div>`).join('');

  const pl = { paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(17,24,39,0.4)', font: { color: '#9ca3af', size: 9 }, showlegend: false, margin: { l: 40, r: 10, t: 8, b: 55 }, xaxis: { color: '#4b5563', gridcolor: '#1f2937', tickangle: -45, tickfont: { size: 8 } }, yaxis: { color: '#4b5563', gridcolor: '#1f2937' } };
  Plotly.newPlot('an-co2', [
    { type: 'scatter', mode: 'lines', x: data.map(d => d.time), y: data.map(d => d.co2), line: { color: '#6b7280', width: 1.5 }, name: 'CO₂' },
    {
      type: 'scatter', mode: 'markers', x: anom.map(d => d.time), y: anom.map(d => d.co2),
      marker: { color: '#ef4444', size: 14, symbol: 'circle', line: { color: '#fca5a5', width: 2 } }, name: 'Anomaly',
      text: anom.map(d => `⚠ ${d.cause}`), hovertemplate: '%{text}<br>CO₂: %{y}<extra></extra>'
    },
  ], { ...pl, yaxis: { ...pl.yaxis, title: 'CO₂ t/cap' }, showlegend: true, legend: { bgcolor: 'transparent', font: { color: '#9ca3af', size: 9 } }, margin: { ...pl.margin, l: 50 } }, { responsive: true, displayModeBar: false });

  document.getElementById('an-stats').innerHTML = `
    <div class="bg-gray-800 rounded-lg p-3"><div class="text-xs text-gray-400">Anomalies Found</div><div class="text-2xl font-black text-yellow-400">${anom.length}</div></div>
    <div class="bg-gray-800 rounded-lg p-3"><div class="text-xs text-gray-400">Peak CO₂</div><div class="text-2xl font-black text-red-400">${Math.max(...data.map(d => d.co2)).toFixed(2)}t</div></div>
    <div class="bg-gray-800 rounded-lg p-3"><div class="text-xs text-gray-400">Avg Normal CO₂</div><div class="text-2xl font-black text-emerald-400">${(data.filter(d => !d.isAnomaly).reduce((s, d) => s + d.co2, 0) / data.filter(d => !d.isAnomaly).length).toFixed(2)}t</div></div>
    <div class="bg-gray-800 rounded-lg p-3"><div class="text-xs text-gray-400">Algorithm</div><div class="text-sm font-bold text-cyan-300">Isolation Forest</div><div class="text-[10px] text-gray-500">+ Autoencoder</div></div>`;

  const mkSmall = (id, y, col, key) => Plotly.newPlot(id, [{
    type: 'bar', x: data.map(d => d.time), y: data.map(d => d[key]),
    marker: { color: data.map(d => d.isAnomaly ? '#ef4444' : col), opacity: 0.7 }
  }],
    { ...pl, margin: { ...pl.margin, l: 35 } }, { responsive: true, displayModeBar: false });
  mkSmall('an-water', null, '#3b82f6', 'water');
  mkSmall('an-energy', null, '#10b981', 'energy');
  mkSmall('an-traffic', null, '#f97316', 'traffic');
}

// ════════════════════════════════════════════════════════════════════════════
// 3D GLOBE
// ════════════════════════════════════════════════════════════════════════════
function globe3dHTML() {
  return `
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <h2 class="text-xl font-black text-cyan-300 flex items-center gap-2"><i class="fas fa-globe"></i> 3D Earth — Emission Hotspots</h2>
      <div class="flex gap-2 ml-auto">
        <div class="relative group">
          <div class="absolute -inset-0.5 bg-cyan-500 blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <select id="gm-select" onchange="updateGlobeMetric()" 
                  class="relative bg-void-950 border border-void-800 rounded-xl px-4 py-2 text-xs font-black text-cyan-300 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer pr-10 shadow-2xl">
            <option value="score">Sustainability Score</option>
            <option value="co2">CO₂ Emissions</option>
            <option value="renewable">Renewable Energy</option>
            <option value="traffic">Traffic Density</option>
          </select>
          <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-600">
             <i class="fas fa-chevron-down text-[10px]"></i>
          </div>
        </div>
        <button onclick="toggleGlobeRot()" id="globe-rot-btn" class="px-5 py-2 text-xs font-black rounded-xl bg-cyan-900/30 text-cyan-300 border border-cyan-800/40 hover:bg-cyan-800/60 transition-all shadow-neon">
          <i class="fas fa-pause"></i> Pause
        </button>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 et-card p-0 overflow-hidden" style="height:520px">
        <canvas id="globe-canvas" style="width:100%;height:100%;display:block"></canvas>
      </div>
      <div class="space-y-4">
        <div class="et-card p-5 bg-void-950/50 border-void-800 border-l-4 border-l-cyan-500 shadow-2xl">
          <h3 class="text-sm font-black text-cyan-300 uppercase tracking-widest mb-3 flex items-center gap-2">
             <i class="fas fa-location-crosshairs animate-pulse"></i> Tactical Intel
          </h3>
          <div id="globe-info" class="text-xs text-gray-300 leading-relaxed">
             Select a neural node on the planetary surface to decode country-specific environmental telemetry.
          </div>
        </div>
        
        <div class="et-card p-5 bg-red-950/10 border-red-900/40 shadow-neon">
          <h3 class="text-sm font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
             <i class="fas fa-tower-observation"></i> Global Hotspots
          </h3>
          <div id="hotspot-list" class="space-y-3"></div>
        </div>

        <div class="et-card p-5 bg-void-950/50 border-void-800">
          <h3 class="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Planetary Key</h3>
          <div class="space-y-3 text-xs font-bold text-gray-300">
            <div class="flex items-center justify-between p-2 bg-emerald-900/10 rounded-lg border border-emerald-900/20">
              <span class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-emerald-400 shadow-neon-eco"></span> Sustainable</span>
              <span class="text-emerald-500 opacity-60">SCORE 70+</span>
            </div>
            <div class="flex items-center justify-between p-2 bg-yellow-900/10 rounded-lg border border-yellow-900/20">
              <span class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-yellow-400 shadow-neon"></span> Moderate</span>
              <span class="text-yellow-500 opacity-60">SCORE 40-70</span>
            </div>
            <div class="flex items-center justify-between p-2 bg-red-900/10 rounded-lg border border-red-900/20">
              <span class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-red-500 shadow-neon"></span> Critical</span>
              <span class="text-red-500 opacity-60">SCORE < 40</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

let gScene, gCam, gRenderer, gGlobe, gMarkers = [], gRings = [];
async function initGlobe3D() {
  if (!ST.worldData.length) { const r = await fetch('/world_data'); ST.worldData = await r.json(); }
  // Use a triple-frame wait to guarantee the browser has rendered the canvas container
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        buildHotspotList();
        buildGlobe();
      }, 50);
    });
  });
}
function buildHotspotList() {
  const top = [...ST.worldData].sort((a, b) => b.co2 - a.co2).slice(0, 5);
  document.getElementById('hotspot-list').innerHTML = top.map(c => `
    <button onclick="focusGlobeCountryCode('${c.code}')" class="w-full flex flex-col gap-1 p-3 bg-void-950 border border-void-800 rounded-xl hover:border-red-500/50 hover:bg-red-950/10 transition-all group overflow-hidden relative">
      <div class="flex items-center justify-between relative z-10">
        <span class="text-sm font-black text-white uppercase tracking-tighter">${c.name}</span>
        <span class="text-base font-black text-red-400 font-mono">${c.co2}<span class="text-[10px] ml-0.5">t</span></span>
      </div>
      <div class="w-full bg-gray-800/50 h-1 rounded-full relative z-10 mt-1">
         <div class="h-full bg-red-500 shadow-neon rounded-full" style="width:${Math.min(100, (c.co2/25)*100)}%"></div>
      </div>
      <i class="fas fa-chevron-right absolute right-2 top-1/2 -translate-y-1/2 text-void-800 group-hover:text-red-900 group-hover:translate-x-1 transition-all opacity-0 group-hover:opacity-100"></i>
    </button>`).join('');
}
function buildGlobe() {
  const canvas = document.getElementById('globe-canvas'); if (!canvas) return;
  const parent = canvas.parentElement;
  
  const init = () => {
    let W = parent.clientWidth, H = parent.clientHeight;
    if (W <= 0 || H <= 0) { 
      W = canvas.clientWidth || 800; // Final fallback
      H = 520; 
    }
    
    // Clear old state
    if (gRenderer) { gRenderer.dispose(); }
    
    gScene = new THREE.Scene();
    gCam = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000); gCam.position.z = 2.6;
    gRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    gRenderer.setSize(W, H);
    gRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Stars
    const sg = new THREE.BufferGeometry(), sp = [];
    for (let i = 0; i < 5000; i++) {
      const r = 80 + Math.random() * 300, t = Math.random() * Math.PI * 2, p = Math.acos(Math.random() * 2 - 1);
      sp.push(r * Math.sin(p) * Math.cos(t), r * Math.sin(p) * Math.sin(t), r * Math.cos(p));
    }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    gScene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, transparent: true, opacity: 0.5 })));

    // Lights
    gScene.add(new THREE.AmbientLight(0x223344, 1.8));
    const sun = new THREE.DirectionalLight(0x99ccff, 3.2); sun.position.set(5, 3, 5); gScene.add(sun);

    // Globe
    gGlobe = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), new THREE.MeshPhongMaterial({ color: 0x0a1628, emissive: 0x001020, specular: 0x4488aa, shininess: 25 }));
    gScene.add(gGlobe);
    gScene.add(new THREE.Mesh(new THREE.SphereGeometry(1.04, 32, 32), new THREE.MeshBasicMaterial({ color: 0x003366, transparent: true, opacity: 0.08, wireframe: false, side: THREE.FrontSide })));
    gScene.add(new THREE.Mesh(new THREE.SphereGeometry(1.001, 24, 24), new THREE.MeshBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.25, wireframe: true })));

    placeMarkers('score');
    ST.globeRotating = true;
    
    const animate = () => {
      if (ST.activeTab !== 'globe3d') return;
      ST.globeAnimFrame = requestAnimationFrame(animate);
      if (ST.globeRotating) {
        gGlobe.rotation.y += 0.003;
        gMarkers.forEach(m => m.rotation.y += 0.003);
        gRings.forEach(r => r.rotation.y += 0.003);
      }
      gRenderer.render(gScene, gCam);
    };
    animate();
  };
  init();
  const onResize = () => {
    if (ST.activeTab !== 'globe3d') return;
    const nW = parent.clientWidth, nH = parent.clientHeight;
    gCam.aspect = nW / nH; gCam.updateProjectionMatrix();
    gRenderer.setSize(nW, nH);
  };
  window.addEventListener('resize', onResize);
}
function placeMarkers(metric) {
  [...gMarkers, ...gRings].forEach(m => gScene.remove(m)); gMarkers = []; gRings = [];
  ST.worldData.forEach(c => {
    const coords = CC[c.code]; if (!coords) return;
    const lat = coords.lat * Math.PI / 180, lon = coords.lon * Math.PI / 180, r2 = 1.02;
    const x = r2 * Math.cos(lat) * Math.cos(lon), y = r2 * Math.sin(lat), z = r2 * Math.cos(lat) * Math.sin(lon);
    let col, sz;
    if (metric === 'co2') { const n = clamp(c.co2 / 20, 0, 1); col = new THREE.Color(n, 1 - n * 0.8, 0); sz = 0.02 + n * 0.06; }
    else if (metric === 'renewable') { const n = c.renewable / 100; col = new THREE.Color(0, n * 0.8, 1 - n * 0.4); sz = 0.02 + n * 0.045; }
    else if (metric === 'traffic') { const n = c.traffic / 100; col = new THREE.Color(n, 0.4, 1 - n); sz = 0.02 + n * 0.035; }
    else { col = new THREE.Color(...hexToRgb(scoreColor(c.score))); sz = 0.022 + (c.score / 100) * 0.045; }
    const m = new THREE.Mesh(new THREE.SphereGeometry(sz, 16, 16), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95 }));
    m.position.set(x, y, z); m.userData = c; gScene.add(m); gMarkers.push(m);
    const rg = new THREE.Mesh(new THREE.RingGeometry(sz * 1.6, sz * 3.2, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    rg.position.set(x, y, z); rg.lookAt(0, 0, 0); gScene.add(rg); gRings.push(rg);
  });
}
function updateGlobeMetric() { placeMarkers(document.getElementById('gm-select').value); }
function focusGlobeCountryCode(code) {
  const c = ST.worldData.find(x => x.code === code);
  const coords = CC[code];
  if (!c || !coords) return;
  
  // Rotate globe and move camera (Logic simulated via state)
  const latLat = coords.lat * Math.PI / 180, lonLon = coords.lon * Math.PI / 180;
  // Note: Continuous animation or rotation logic could be added here
  // For now, we update the info panel and highlight
  
  document.getElementById('globe-info').innerHTML = `
    <div class="p-3 bg-void-950 rounded-lg border border-void-800">
      <div class="flex justify-between items-center mb-2">
        <span class="text-lg font-black text-white">${c.name}</span>
        <span class="px-2 py-0.5 rounded-full bg-${scoreColor(c.score)} text-[10px] font-bold text-white uppercase">${scoreGrade(c.score)}</span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-[10px]">
        <div><span class="text-gray-500 uppercase block">Emissions</span><span class="text-red-400 font-bold">${c.co2} t/cap</span></div>
        <div><span class="text-gray-500 uppercase block">Renewable</span><span class="text-emerald-400 font-bold">${c.renewable}%</span></div>
        <div class="col-span-2 mt-2 pt-2 border-t border-void-800">
           <span class="text-gray-500 uppercase block mb-1">Sustainability Score</span>
           <div class="text-2xl font-black font-mono text-cyan-400">${c.score}/100</div>
        </div>
      </div>
      <button onclick="bridgeToAnalytics('${code}')" class="w-full mt-3 py-2 bg-cyan-700/20 border border-cyan-800/40 text-cyan-300 text-[10px] font-black rounded-lg hover:bg-cyan-600 hover:text-white transition-all">
         OPEN FULL ANALYTICS
      </button>
    </div>`;
  toast(`Teleporting To ${c.name.toUpperCase()}...`, 'info');
}

function bridgeToAnalytics(code) {
  const c = ST.worldData.find(x => x.code === code);
  if (!c) return;
  switchTab('map');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => {
    showCountryDetail(c);
    const el = document.getElementById('country-detail');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 400);
}

function toggleGlobeRot() {
  ST.globeRotating = !ST.globeRotating;
  const btn = document.getElementById('globe-rot-btn');
  btn.innerHTML = ST.globeRotating ? '<i class="fas fa-pause"></i> Pause' : '<i class="fas fa-play"></i> Resume';
}

// ════════════════════════════════════════════════════════════════════════════
// SDG TRACKER
// ════════════════════════════════════════════════════════════════════════════
function sdgHTML() { return `<div class="space-y-5"><h2 class="text-xl font-black text-cyan-300 flex items-center gap-2"><i class="fas fa-bullseye"></i> UN ${t('sdgTracker')}</h2><div id="sdg-content"><div class="flex justify-center py-12"><div class="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div></div></div></div>`; }

async function loadSDG() {
  const r = await fetch('/sdg_data'); ST.sdgData = await r.json();
  const { sdgs, aiScore } = ST.sdgData;
  document.getElementById('sdg-content').innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div class="lg:col-span-1 et-card bg-gradient-to-br from-cyan-900/40 via-void-950 to-emerald-900/20 border-cyan-500/30 flex flex-col justify-center p-8 relative overflow-hidden group">
        <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all"></div>
        <div class="relative z-10">
          <div class="text-sm text-cyan-400 font-black tracking-widest uppercase mb-4 flex items-center gap-2">
             <i class="fas fa-microchip animate-pulse"></i> Neural Goal Index
          </div>
          <div class="text-7xl font-black text-white font-mono tracking-tighter">${aiScore}<span class="text-2xl text-cyan-700">/100</span></div>
          <div class="mt-6 space-y-4">
             <div>
                <div class="flex justify-between text-xs font-black text-emerald-400 mb-1.5 uppercase">
                   <span>2030 TRAJECTORY</span>
                   <span>${aiScore}%</span>
                </div>
                <div class="w-full bg-void-900 rounded-full h-3 border border-void-800 p-0.5 shadow-inner">
                   <div class="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-neon-eco" style="width:${aiScore}%"></div>
                </div>
             </div>
             <p class="text-xs text-gray-500 leading-relaxed font-medium">Cross-sectoral SDG optimization logic v4.1. <br/>Targeted alignment for 2030 Sustainability Charter.</p>
          </div>
        </div>
      </div>
      <div class="lg:col-span-2 et-card p-0 overflow-hidden border-void-800 shadow-2xl relative">
        <div class="absolute top-4 left-4 z-10 text-[10px] font-black text-gray-600 uppercase tracking-widest">Neural Convergence Radar</div>
        <div id="sdg-radar" style="height:360px"></div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${sdgs.map(s => `
        <div class="et-card p-0 overflow-hidden group hover:border-${s.color === '#ef4444' ? 'red' : 'cyan'}-500/50 transition-all shadow-lg">
          <div class="p-5 border-b border-void-800 bg-void-950/50 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner relative overflow-hidden" 
                   style="background:${s.color}15; border:1px solid ${s.color}30">
                 <div class="absolute inset-0 opacity-10" style="background:${s.color}"></div>
                 <span class="relative z-10 drop-shadow-md">${s.icon}</span>
              </div>
              <div>
                <div class="text-[10px] font-black tracking-widest uppercase opacity-40 mb-0.5" style="color:${s.color}">SDG NODE ${s.id}</div>
                <div class="text-sm font-black text-white uppercase tracking-tight">${s.name}</div>
              </div>
            </div>
            <div class="text-right">
               <div class="text-2xl font-black font-mono tracking-tighter" style="color:${s.color}">${s.progress}%</div>
               <div class="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">Progress</div>
            </div>
          </div>
          
          <div class="p-5 space-y-4">
             <div class="w-full bg-void-950 rounded-full h-2 shadow-inner border border-void-800">
                <div class="h-full rounded-full shadow-neon transition-all duration-1000" style="width:${s.progress}%; background:${s.color}"></div>
             </div>
             
             <div class="relative bg-void-950 rounded-xl overflow-hidden border border-void-900">
               <div class="absolute top-2 left-2 z-10 text-[8px] font-black text-gray-700 tracking-widest uppercase">Trend Deviation</div>
               <div id="sdg-spark-${s.id}" style="height:85px; margin: 5px 0 0 0"></div>
             </div>
             
             <div class="flex gap-3 items-start p-3 bg-void-900/50 rounded-xl border border-void-800">
                <i class="fas fa-brain text-[14px] mt-1" style="color:${s.color}"></i>
                <div class="text-[11px] text-gray-400 font-bold leading-relaxed">${s.recommendation}</div>
             </div>
          </div>
        </div>`).join('')}
    </div>`;

  sdgs.forEach(s => Plotly.newPlot(`sdg-spark-${s.id}`, [{ type: 'scatter', mode: 'lines', x: [2020, 2021, 2022, 2023, 2024, 2025], y: s.trend, line: { color: s.color, width: 3, shape: 'spline' }, fill: 'tozeroy', fillcolor: s.color + '10' }], { paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', margin: { l: 8, r: 8, t: 15, b: 8 }, xaxis: { visible: false }, yaxis: { visible: false }, showlegend: false }, { responsive: true, displayModeBar: false, staticPlot: true }));

  Plotly.newPlot('sdg-radar', [
    { type: 'scatterpolar', fill: 'toself', r: sdgs.map(s => s.progress), theta: sdgs.map(s => `Goal ${s.id}`), fillcolor: 'rgba(34,211,238,0.12)', line: { color: '#22d3ee', width: 3 }, marker: { color: '#22d3ee', size: 8 }, name: 'Current Trajectory' },
    { type: 'scatterpolar', fill: 'toself', r: sdgs.map(() => 100), theta: sdgs.map(s => `Goal ${s.id}`), fillcolor: 'rgba(255,255,255,0.03)', line: { color: 'rgba(255,255,255,0.1)', width: 1, dash: 'dash' }, name: '2030 Target' },
  ], {
    polar: { 
      bgcolor: 'transparent', 
      radialaxis: { visible: true, range: [0, 100], gridcolor: 'rgba(255,255,255,0.05)', color: '#6b7280', tickfont: { size: 9 } }, 
      angularaxis: { color: '#94a3b8', font: { size: 12, weight: 'bold' }, rotation: 90, direction: 'clockwise' } 
    },
    paper_bgcolor: 'transparent', font: { color: '#d1d5db' }, 
    legend: { x: 1.1, y: 1.1, bgcolor: 'transparent', font: { color: '#94a3b8', size: 11, weight: 'bold' } }, 
    margin: { l: 80, r: 80, t: 40, b: 40 },
  }, { responsive: true, displayModeBar: false });
}

// ════════════════════════════════════════════════════════════════════════════
// HISTORICAL TRENDS
// ════════════════════════════════════════════════════════════════════════════
function historyHTML() {
  return `
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h2 class="text-2xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
         <i class="fas fa-history text-cyan-400"></i> Temporal <span class="text-cyan-400">Archives</span>
      </h2>
      <div class="flex items-center gap-3">
        <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Select Neural Locale</label>
        <div class="relative group">
          <div class="absolute -inset-0.5 bg-cyan-500 blur opacity-20 group-hover:opacity-40 transition-opacity rounded-xl"></div>
          <select id="hist-country" onchange="loadHistory()" 
                  class="relative bg-void-950 border border-void-800 rounded-xl px-4 py-2 text-xs font-black text-cyan-300 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer pr-10 shadow-2xl">
            ${[{ c: 'USA', n: 'United States' }, { c: 'DEU', n: 'Germany' }, { c: 'NOR', n: 'Norway' }, { c: 'IND', n: 'India' },
    { c: 'CHN', n: 'China' }, { c: 'BRA', n: 'Brazil' }, { c: 'JPN', n: 'Japan' }, { c: 'GBR', n: 'United Kingdom' },
    { c: 'AUS', n: 'Australia' }, { c: 'CHE', n: 'Switzerland' }, { c: 'SWE', n: 'Sweden' }, { c: 'SAU', n: 'Saudi Arabia' }]
      .map(x => `<option value="${x.c}">${x.n}</option>`).join('')}
          </select>
          <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-600">
             <i class="fas fa-chevron-down text-[10px]"></i>
          </div>
        </div>
      </div>
    </div>
    <div id="hist-content">
       <div class="flex items-center justify-center py-20 bg-void-900/40 rounded-3xl border border-void-800 border-dashed">
          <div class="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
       </div>
    </div>
  </div>`;
}

async function loadHistory() {
  const code = document.getElementById('hist-country')?.value || 'USA';
  const r = await fetch(`/historical/${code}`);
  ST.historyData = await r.json();
  const d = ST.historyData;
  const pl = { paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(17,24,39,0.4)', font: { color: '#9ca3af', size: 10 }, margin: { l: 45, r: 15, t: 8, b: 40 } };
  const px = { color: '#4b5563', gridcolor: '#1f2937' };

  document.getElementById('hist-content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      ${[{ l: 'Current Score', v: d.country.score, u: '', c: 'cyan' }, { l: 'CO₂/capita', v: d.country.co2, u: 't', c: 'red' },
    { l: 'Renewable', v: d.country.renewable, u: '%', c: 'emerald' }, { l: 'Recycling', v: d.country.recycling, u: '%', c: 'violet' }]
      .map(k => `<div class="et-card text-center"><div class="text-xs text-gray-400 mb-1">${k.l}</div><div class="text-2xl font-black text-${k.c}-300">${k.v}${k.u}</div></div>`).join('')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="et-card"><h3 class="et-card-title">Sustainability Score History</h3><div id="h-score" style="height:200px"></div></div>
      <div class="et-card"><h3 class="et-card-title text-red-300">CO₂ Emissions History</h3><div id="h-co2" style="height:200px"></div></div>
      <div class="et-card"><h3 class="et-card-title text-emerald-300">Renewable Energy Growth</h3><div id="h-ren" style="height:200px"></div></div>
      <div class="et-card"><h3 class="et-card-title text-blue-300">Water Access & Recycling</h3><div id="h-wr" style="height:200px"></div></div>
    </div>`;

  const mk = (id, traces) => Plotly.newPlot(id, traces, { ...pl, xaxis: { ...px, title: 'Year' }, yaxis: { ...px } }, { responsive: true, displayModeBar: false });
  mk('h-score', [{ type: 'scatter', mode: 'lines+markers', x: d.years, y: d.scores, line: { color: '#22d3ee', width: 2.5 }, marker: { size: 5 }, fill: 'tozeroy', fillcolor: 'rgba(34,211,238,0.06)' }]);
  mk('h-co2', [{ type: 'scatter', mode: 'lines+markers', x: d.years, y: d.co2, line: { color: '#ef4444', width: 2.5 }, marker: { size: 5 }, fill: 'tozeroy', fillcolor: 'rgba(239,68,68,0.06)' }]);
  mk('h-ren', [{ type: 'bar', x: d.years, y: d.renewable, marker: { color: '#10b981', opacity: 0.8 } }]);
  mk('h-wr', [
    { type: 'scatter', mode: 'lines+markers', name: 'Water %', x: d.years, y: d.water, line: { color: '#3b82f6', width: 2 } },
    { type: 'scatter', mode: 'lines+markers', name: 'Recycling %', x: d.years, y: d.recycling, line: { color: '#8b5cf6', width: 2 } },
  ]);
}

// ════════════════════════════════════════════════════════════════════════════
// ENTERPRISE ANALYTICS
// ════════════════════════════════════════════════════════════════════════════
function analyticsHTML() {
  return `
  <div class="space-y-5">
    <h2 class="text-xl font-black text-cyan-300 flex items-center gap-2"><i class="fas fa-chart-bar"></i> ${t('analytics')} — Enterprise Intelligence</h2>
    <div id="analytics-content"><div class="flex justify-center py-12"><div class="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div></div></div>
  </div>`;
}

async function loadAnalytics() {
  const r = await fetch('/analytics/enterprise', { headers: authHeaders() });
  ST.enterpriseData = await r.json();
  const d = ST.enterpriseData;
  document.getElementById('analytics-content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      ${[{ l: 'Total Countries', v: d.kpis.totalCountries, c: 'cyan' }, { l: 'Improving', v: d.kpis.improvingCount, c: 'emerald' },
    { l: 'Critical', v: d.kpis.criticalCount, c: 'red' }, { l: 'YoY Change', v: '+' + d.kpis.yearOverYear, c: 'violet' }]
      .map(k => `<div class="et-card text-center"><div class="text-xs text-gray-400 mb-1">${k.l}</div><div class="text-3xl font-black text-${k.c}-300">${k.v}</div></div>`).join('')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <div class="et-card">
        <h3 class="et-card-title">Regional Sustainability Scores</h3>
        <div id="ea-regional" style="height:260px"></div>
      </div>
      <div class="et-card">
        <h3 class="et-card-title">Monthly Global Score Trend (2025)</h3>
        <div id="ea-monthly" style="height:260px"></div>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div class="et-card flex flex-col justify-between">
        <h3 class="text-sm font-black text-cyan-300 uppercase tracking-widest mb-4 flex items-center gap-2">
           <i class="fas fa-trophy text-yellow-500"></i> Performance Tiers
        </h3>
        <div class="space-y-4">
          <div class="bg-emerald-950/10 border border-emerald-900/30 p-3 rounded-xl flex items-center justify-between group hover:bg-emerald-900/20 transition-all">
             <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black">1</div>
                <div><div class="text-[9px] text-gray-500 font-bold uppercase">Benchmark Leader</div><div class="text-xs font-black text-white">${d.kpis.bestPerformer}</div></div>
             </div>
             <i class="fas fa-check-circle text-emerald-500"></i>
          </div>
          <div class="bg-red-950/10 border border-red-900/30 p-3 rounded-xl flex items-center justify-between">
             <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 font-black text-lg">!</div>
                <div><div class="text-[9px] text-gray-500 font-bold uppercase">Critical Monitor</div><div class="text-xs font-black text-white">${d.kpis.worstPerformer}</div></div>
             </div>
             <i class="fas fa-triangle-exclamation text-red-500 animate-pulse"></i>
          </div>
          <div class="bg-cyan-950/10 border border-cyan-900/30 p-3 rounded-xl flex items-center justify-between">
             <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-black text-lg"><i class="fas fa-crystal-ball text-[14px]"></i></div>
                <div><div class="text-[9px] text-gray-500 font-bold uppercase">2030 Neural Goal</div><div class="text-xs font-black text-white">${d.kpis.predictedScore2030} Index</div></div>
             </div>
             <span class="text-[10px] font-mono text-cyan-400 font-bold">+${((d.kpis.predictedScore2030 - d.avgGlobalScore) || 5.2).toFixed(1)}%</span>
          </div>
        </div>
      </div>
      
      <div class="col-span-1 md:col-span-2 et-card bg-void-950/50 flex flex-col justify-center border-void-800 shadow-2xl relative overflow-hidden group">
         <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-void-950 opacity-10 blur-xl"></div>
         <div class="relative z-10 p-4">
            <h3 class="text-xl font-black text-white uppercase tracking-tighter mb-1">Global <span class="text-cyan-400">Sustainability</span> Matrix</h3>
            <p class="text-xs text-gray-500 font-bold uppercase tracking-widest mb-6">Aggregate Correlation of 50 Sovereign Nodes</p>
            <div class="grid grid-cols-2 gap-6 items-center">
               <div class="space-y-4">
                  <div class="p-4 rounded-2xl bg-void-900/80 border border-void-800 hover:border-emerald-500/30 transition-all">
                     <span class="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Ideal Frontier</span>
                     <p class="text-[11px] text-gray-400 font-medium leading-relaxed italic">High renewable mix (>60%) with hyper-low carbon intensity (<4t). Regions in this sector define the planetary benchmark.</p>
                  </div>
                  <div class="p-4 rounded-2xl bg-void-900/80 border border-void-800 hover:border-red-500/30 transition-all">
                     <span class="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-2">Transition Critical</span>
                     <p class="text-[11px] text-gray-400 font-medium leading-relaxed italic">Fossil-heavy architectures with low renewable penetration. These nodes require immediate neural re-calibration.</p>
                  </div>
               </div>
               <div class="text-right p-6 bg-cyan-950/10 rounded-3xl border border-cyan-800/20">
                  <div class="text-4xl font-black text-white font-mono tracking-tighter">${d.kpis.avgGlobalScore}</div>
                  <div class="text-[10px] font-black text-cyan-600 uppercase tracking-widest">Global Mean Index</div>
                  <div class="mt-4 pt-4 border-t border-cyan-900/30">
                     <div class="text-sm font-black text-emerald-400">+1.9% YoY</div>
                     <div class="text-[9px] text-gray-600 uppercase font-black">Velocity Score</div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>

    <div class="et-card p-0 overflow-hidden mb-6 border-cyan-500/20 shadow-neon-light relative">
       <div class="absolute top-4 left-6 z-10 flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
          <span class="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Neural Cluster Map: Renewable v CO₂</span>
       </div>
       <div id="ea-scatter" style="height:480px"></div>
    </div>

    <div class="et-card p-0 overflow-hidden shadow-2xl border-void-800">
      <div class="p-4 border-b border-void-800 bg-void-950/50 flex items-center justify-between">
         <h3 class="text-sm font-black text-cyan-300 uppercase tracking-widest">Regional Breakdown Analysis</h3>
         <div class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Decentralized Telemetry</div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead class="bg-void-950/80 text-[10px] uppercase font-black tracking-widest text-gray-500 border-b border-void-800">
             <tr>
                <th class="px-6 py-4">Sovereign Region</th>
                <th class="px-4 py-4 text-center">Node Count</th>
                <th class="px-4 py-4 text-center">AI Score</th>
                <th class="px-4 py-4 text-center">Carbon Intensity</th>
                <th class="px-4 py-4 text-center">Renewable Mix</th>
                <th class="px-6 py-4 text-right">Trend Velocity</th>
             </tr>
          </thead>
          <tbody class="divide-y divide-void-800/40">
            ${d.regions.map(reg => `
              <tr class="hover:bg-cyan-500/5 transition-colors group">
                <td class="px-6 py-4 font-black text-white text-sm tracking-tight">${reg.name}</td>
                <td class="px-4 py-4 text-center">
                   <span class="px-2 py-1 rounded bg-void-900 border border-void-800 text-[10px] font-mono text-gray-400">${reg.countries}</span>
                </td>
                <td class="px-4 py-4 text-center">
                  <span class="text-base font-black font-mono shadow-neon-eco" style="color:${scoreColor(reg.avgScore)}">${reg.avgScore.toFixed(1)}</span>
                </td>
                <td class="px-4 py-4 text-center text-red-400 font-black font-mono text-sm">${reg.co2}t<span class="text-[10px] opacity-40 ml-1">/cap</span></td>
                <td class="px-4 py-4 text-center text-emerald-400 font-black font-mono text-sm">${reg.renewable}%</td>
                <td class="px-6 py-4 text-right">
                   <div class="flex items-center justify-end gap-2">
                      <span class="font-black font-mono ${reg.trend > 0 ? 'text-emerald-500' : 'text-red-500'}">${reg.trend > 0 ? '+' : ''}${reg.trend}%</span>
                      <i class="fas fa-arrow-${reg.trend > 0 ? 'up' : 'down'} text-[10px] ${reg.trend > 0 ? 'text-emerald-600' : 'text-red-600'} opacity-30 group-hover:opacity-100 transition-all"></i>
                   </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  const pl = { paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(17,24,39,0.4)', font: { color: '#9ca3af', size: 10 }, margin: { l: 45, r: 15, t: 8, b: 40 }, xaxis: { color: '#4b5563', gridcolor: '#1f2937' }, yaxis: { color: '#4b5563', gridcolor: '#1f2937' } };
  Plotly.newPlot('ea-regional', [
    { type: 'bar', name: 'Avg Score', x: d.regions.map(r => r.name), y: d.regions.map(r => r.avgScore), marker: { color: d.regions.map(r => scoreColor(r.avgScore)), opacity: 0.85 } },
  ], { ...pl }, { responsive: true, displayModeBar: false });
  Plotly.newPlot('ea-monthly', [
    { type: 'scatter', mode: 'lines+markers', name: 'Score', x: d.monthly.map(m => m.month), y: d.monthly.map(m => m.score), line: { color: '#22d3ee', width: 2.5 }, marker: { size: 5 } },
    { type: 'scatter', mode: 'lines', name: 'CO₂×10', x: d.monthly.map(m => m.month), y: d.monthly.map(m => m.co2 * 10), line: { color: '#ef4444', width: 1.5, dash: 'dot' }, yaxis: 'y2' },
  ], { ...pl, yaxis2: { overlaying: 'y', side: 'right', color: '#ef4444' }, legend: { bgcolor: 'transparent', font: { color: '#9ca3af', size: 9 } } }, { responsive: true, displayModeBar: false });
  Plotly.newPlot('ea-scatter', [{
    type: 'scatter', mode: 'markers+text', x: d.countries_data.map(c => c.renewable), y: d.countries_data.map(c => c.co2), text: d.countries_data.map(c => c.name),
    textposition: 'top center', textfont: { size: 8, color: '#94a3b8' },
    marker: { size: d.countries_data.map(c => 10 + c.score / 4), color: d.countries_data.map(c => c.score), colorscale: [[0, '#ef4444'], [0.5, '#f59e0b'], [1, '#10b981']], opacity: 0.8, line: { color: 'white', width: 0.5 }, shadow: { color: 'rgba(0,0,0,0.5)', blur: 10 } },
    hovertemplate: '<b>%{text}</b><br>Carbon: %{y}t<br>Renewable: %{x}%<br>Neural Score: %{marker.color}<extra></extra>'
  }], {
    paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(5,10,20,0.8)', font: { color: '#94a3b8', size: 10, family: 'Inter, sans-serif' }, 
    margin: { l: 60, r: 20, t: 40, b: 60 },
    xaxis: { title: 'Renewable Generation Share (%)', gridcolor: 'rgba(255,255,255,0.03)', zeroline: false, ticksuffix: '%', range: [0, 105], titlefont: { size: 12, weight: 'bold' } },
    yaxis: { title: 'CO₂ Intensity (Metric Tons per Capita)', gridcolor: 'rgba(255,255,255,0.03)', zeroline: false, range: [0, 15], titlefont: { size: 12, weight: 'bold' } },
    shapes: [
      { type: 'rect', x0: 60, x1: 100, y0: 0, y1: 5, fillcolor: 'rgba(16,185,129,0.1)', line: { width: 0 } },
      { type: 'rect', x0: 0, x1: 40, y0: 8, y1: 15, fillcolor: 'rgba(239,68,68,0.1)', line: { width: 0 } }
    ],
    annotations: [
      { x: 80, y: 2.5, text: 'Neural Benchmark Frontier', showarrow: false, font: { size: 11, color: '#10b981', weight: 'bold' }, opacity: 0.8 },
      { x: 20, y: 12.5, text: 'High Carbon Risk Sector', showarrow: false, font: { size: 11, color: '#ef4444', weight: 'bold' }, opacity: 0.8 }
    ]
  }, { responsive: true, displayModeBar: false });
}

// ════════════════════════════════════════════════════════════════════════════
// AI CHATBOT
// ════════════════════════════════════════════════════════════════════════════
function aiHTML() {
  return `
  <div class="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-fadeIn">
    <!-- Main Chat Window -->
    <div class="xl:col-span-3 flex flex-col et-card grad-border !p-0 overflow-hidden" style="height:720px; background: rgba(2, 6, 23, 0.45);">
      <!-- Header HUD -->
      <div class="px-6 py-4 border-b border-gray-800/60 bg-void-950/40 backdrop-blur-md flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-600 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(8,145,178,0.3)] border border-cyan-400/30">
            <i class="fas fa-microchip text-white text-lg animate-pulse"></i>
          </div>
          <div>
            <h2 class="text-base font-black text-white tracking-wide uppercase flex items-center gap-2">
              Neural Command Center
              <span class="text-[8px] bg-cyan-900/40 text-cyan-300 px-1.5 py-0.5 rounded-md border border-cyan-700/50">ECO_CORE_v4.2</span>
            </h2>
            <div class="flex items-center gap-2 text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></span>
              Gemini Pro Active · Sub-second Latency
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <select id="ai-lang" class="et-select-premium !py-1 !px-2 !text-[10px]">
            ${[{ v: 'en', l: 'English (UK)' }, { v: 'es', l: 'Español' }, { v: 'fr', l: 'Français' }, { v: 'de', l: 'Deutsch' }, { v: 'zh', l: '中文' }, { v: 'ar', l: 'العربية' }, { v: 'hi', l: 'हिन्दी' }, { v: 'pt', l: 'Português' }]
      .map(l => `<option value="${l.v}" ${ST.lang === l.v ? 'selected' : ''} class="bg-void-950">${l.l}</option>`).join('')}
          </select>
          <button onclick="ST.chatHistory=[]; renderTab('ai')" class="w-8 h-8 rounded-lg bg-gray-900/60 border border-gray-800 text-gray-500 hover:text-red-400 hover:border-red-900/50 transition-all" title="Clear History">
            <i class="fas fa-trash-can text-sm"></i>
          </button>
        </div>
      </div>

      <!-- Messages Stream -->
      <div id="chat-msgs" class="flex-1 overflow-y-auto px-6 py-6 space-y-6 scroll-smooth bg-void-950/10 custom-scrollbar">
        <!-- Initial Welcome -->
        <div class="flex gap-4 animate-slideInLeft">
          <div class="w-8 h-8 rounded-lg bg-indigo-900/40 border border-indigo-700/50 flex-none flex items-center justify-center">
            <i class="fas fa-robot text-xs text-indigo-300"></i>
          </div>
          <div class="bg-gray-900/60 border border-gray-800/80 rounded-2xl rounded-tl-none p-4 max-w-[85%] shadow-xl backdrop-blur-sm">
            <p class="text-[13px] leading-relaxed text-gray-200">
              Greetings. I am the **EcoTwin Neural Interface**. I have synthesized real-time telemetry from 50+ sovereign territories.
              <br><br>
              I can assist with <span class="text-cyan-400">Deep Regression Analysis</span>, <span class="text-emerald-400">Carbon Budgeting</span>, or <span class="text-violet-400">Policy Impact Simulation</span>.
              How shall we proceed with the current dataset?
            </p>
          </div>
        </div>
      </div>

      <!-- Input HUD -->
      <div class="p-6 border-t border-gray-800/60 bg-void-950/60 backdrop-blur-xl">
        <div class="relative group">
          <div class="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-indigo-600 rounded-2xl blur opacity-15 group-focus-within:opacity-40 transition-opacity"></div>
          <div class="relative flex gap-3">
            <div class="flex-1 relative">
              <input id="chat-input" type="text" placeholder="Transmit query to Neural Core..."
                     class="w-full bg-void-900/80 border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all shadow-inner"
                     onkeydown="if(event.key==='Enter')sendChat()">
              <div class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span class="text-[9px] font-black text-gray-700 bg-gray-800/40 px-1.5 py-0.5 rounded border border-gray-700/50 uppercase tracking-tighter">Enter to send</span>
              </div>
            </div>
            <button onclick="sendChat()" class="px-6 rounded-xl bg-gradient-to-br from-cyan-600 to-indigo-700 text-white font-black text-xs uppercase tracking-widest hover:shadow-cyan-900/30 hover:shadow-lg transition-all active:scale-95 flex items-center gap-2">
              <span class="hidden sm:inline">Transmit</span>
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Control Sidebar -->
    <div class="flex flex-col gap-6">
      <div class="et-card grad-border">
        <h3 class="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <i class="fas fa-wand-magic-sparkles text-cyan-400"></i> Cognitive Catalysts
        </h3>
        <div id="suggested-qs" class="space-y-2.5">
          ${[
      { q: 'Which country has the highest sustainability score?', t: 'GEO_RANK' },
      { q: 'Analyze India vs USA carbon trajectory', t: 'CROSS_COMP' },
      { q: 'Explain SHAP factor attribution', t: 'XAI_INTELL' },
      { q: 'Recommend optimal water policies', t: 'STRAT_REC' },
      { q: 'Predict 2030 emission peak Cell3', t: 'FORE_EXP' }
    ]
      .map(s => `
            <button onclick="askSugg('${s.q.replace(/'/g, "\\'")}',this)" 
              class="w-full text-left bg-gray-900/40 hover:bg-cyan-900/20 border border-gray-800 hover:border-cyan-700/50 rounded-xl p-3 group transition-all duration-300">
              <div class="text-[9px] font-black text-cyan-500/60 group-hover:text-cyan-400 mb-1 tracking-widest">${s.t}</div>
              <div class="text-[11px] text-gray-400 group-hover:text-white leading-tight transition-colors">${s.q}</div>
            </button>`).join('')}
        </div>
      </div>

      <div class="et-card grad-border">
        <h3 class="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <i class="fas fa-database text-indigo-400"></i> Global Context
        </h3>
        <div class="space-y-4">
          <div class="p-3 rounded-xl bg-gray-950/40 border border-gray-800/60">
            <div class="text-[9px] text-gray-500 font-bold uppercase mb-2">Knowledge Base</div>
            <div class="grid grid-cols-2 gap-2">
              <div class="text-[10px] text-white font-mono"><span class="text-cyan-500">50</span> REGIONS</div>
              <div class="text-[10px] text-white font-mono"><span class="text-indigo-500">12k</span> DATAPTS</div>
              <div class="text-[10px] text-white font-mono"><span class="text-emerald-500">2024</span> EPOCH</div>
              <div class="text-[10px] text-white font-mono"><span class="text-red-500">8</span> SECTORS</div>
            </div>
          </div>
          <div class="space-y-3">
             <div class="flex justify-between items-center"><span class="text-[10px] text-gray-500 font-bold">Inference Epoch</span><span class="text-[10px] font-mono text-cyan-300">v4.2.1</span></div>
             <div class="flex justify-between items-center"><span class="text-[10px] text-gray-500 font-bold">Context Window</span><span class="text-[10px] font-mono text-indigo-300">128k</span></div>
             <div class="flex justify-between items-center"><span class="text-[10px] text-gray-500 font-bold">Reasoning Mode</span><span class="text-[10px] font-mono text-emerald-300">Analytical</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const q = input.value.trim(); if (!q) return;
  input.value = ''; appendChatMsg('user', q);
  const lang = document.getElementById('ai-lang')?.value || ST.lang;
  const tid = 't' + Date.now();
  document.getElementById('chat-msgs').insertAdjacentHTML('beforeend', `
    <div id="${tid}" class="flex gap-4 animate-fadeIn">
      <div class="w-8 h-8 rounded-lg bg-cyan-900/40 border border-cyan-700/50 flex-none flex items-center justify-center">
        <i class="fas fa-brain text-[10px] text-cyan-300 animate-pulse"></i>
      </div>
      <div class="bg-void-900/80 border border-gray-800 rounded-2xl rounded-tl-none p-4 w-[160px]">
        <div class="flex flex-col gap-2">
           <div class="text-[9px] font-black text-cyan-500/60 tracking-widest uppercase mb-1">Neural_Analysing...</div>
           <div class="flex gap-1.5">
             <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style="animation-delay:0ms"></span>
             <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style="animation-delay:150ms"></span>
             <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style="animation-delay:300ms"></span>
           </div>
        </div>
      </div>
    </div>`);
  scrollChat();

  if (!ST.chatHistory) ST.chatHistory = [];
  const r = await fetch('/ai_query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: q, lang, history: ST.chatHistory })
  });

  const d = await r.json();
  document.getElementById(tid)?.remove();
  appendChatMsg('bot', d.response, d.suggestions);

  // Maintain chat history context, max 12 messages.
  ST.chatHistory.push({ role: 'user', content: q });
  ST.chatHistory.push({ role: 'assistant', content: d.response });
  if (ST.chatHistory.length > 12) {
    ST.chatHistory = ST.chatHistory.slice(-12);
  }
}
function appendChatMsg(role, text, sugg) {
  const msgs = document.getElementById('chat-msgs');
  // High-fidelity formatting
  const fmt = text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300">$1</strong>')
    .replace(/`(.*?)`/g, '<code class="bg-black/40 px-1 rounded text-emerald-400 font-mono text-[10px]">$1</code>')
    .split('\n').map(l => l.trim()).filter(l => l).map(l => `<p class="mb-2">${l}</p>`).join('');

  if (role === 'user') {
    msgs.insertAdjacentHTML('beforeend', `
      <div class="flex gap-4 justify-end animate-slideInRight">
        <div class="bg-cyan-900/30 border border-cyan-800/40 rounded-2xl rounded-tl-none p-4 max-w-[85%] shadow-lg">
          <p class="text-[13px] text-gray-100">${text}</p>
        </div>
        <div class="w-8 h-8 rounded-lg bg-gray-800 flex-none flex items-center justify-center border border-gray-700 text-gray-400">
           <i class="fas fa-user-circle text-xs"></i>
        </div>
      </div>`);
  } else {
    msgs.insertAdjacentHTML('beforeend', `
      <div class="flex gap-4 animate-fadeIn">
        <div class="w-8 h-8 rounded-lg bg-indigo-900/40 border border-indigo-700/50 flex-none flex items-center justify-center">
          <i class="fas fa-robot text-xs text-indigo-300"></i>
        </div>
        <div class="bg-gray-900/80 border border-gray-800/80 rounded-2xl rounded-tl-none p-4 max-w-[85%] shadow-xl backdrop-blur-sm">
          <div class="text-[13px] leading-relaxed text-gray-200">${fmt}</div>
          ${sugg && sugg.length ? `
          <div class="mt-4 pt-3 border-t border-gray-800 flex flex-wrap gap-2">
            ${sugg.map(s => `<button onclick="askSugg('${s.replace(/'/g, "\\'")}')" class="text-[9px] px-2 py-1 rounded-md bg-cyan-950/40 border border-cyan-900/50 text-cyan-400 hover:bg-cyan-900/60 transition-colors uppercase font-black tracking-tighter">#${s}</button>`).join('')}
          </div>` : ''}
        </div>
      </div>`);
  }
  scrollChat();
}
function scrollChat() { const el = document.getElementById('chat-msgs'); if (el) el.scrollTop = el.scrollHeight; }
function askSugg(q) { document.getElementById('chat-input').value = q; sendChat(); }

// ════════════════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ════════════════════════════════════════════════════════════════════════════
function adminHTML() {
  return `
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-black text-cyan-300 flex items-center gap-2"><i class="fas fa-shield-halved text-red-400"></i> ${t('admin')} Panel</h2>
      <span class="text-[10px] px-2 py-1 rounded-full bg-red-900/50 border border-red-700/50 text-red-300 font-bold">ADMIN ONLY</span>
    </div>
    <!-- System Stats -->
    <div id="admin-stats-grid" class="grid grid-cols-2 md:grid-cols-4 gap-3"></div>
    <!-- Users Table -->
    <div class="et-card">
      <div class="flex items-center justify-between mb-3">
        <h3 class="et-card-title text-center flex-1">Registered Users</h3>
        <button onclick="loadAdmin()" class="text-xs text-cyan-400 hover:text-cyan-300"><i class="fas fa-rotate-right mr-1"></i>Refresh</button>
      </div>
      <div class="overflow-x-auto" id="admin-users-table"></div>
    </div>
    <!-- Simulation History -->
    <div class="et-card">
      <h3 class="et-card-title mb-3">Recent Simulations</h3>
      <div id="admin-sim-history" class="text-xs text-gray-400"></div>
    </div>
    </div>
  </div>`;
}

async function loadAdmin() {
  const [usersR, statsR, simR] = await Promise.all([
    fetch('/admin/users', { headers: authHeaders() }),
    fetch('/admin/stats', { headers: authHeaders() }),
    fetch('/simulate/history'),
  ]);
  const users = await usersR.json(), stats = await statsR.json(), sims = await simR.json();

  document.getElementById('admin-stats-grid').innerHTML = [
    { l: 'Total Users', v: stats.totalUsers, c: 'cyan', i: 'fa-users' },
    { l: 'Active Sessions', v: stats.activeSessions, c: 'emerald', i: 'fa-circle-check' },
    { l: 'API Calls', v: stats.apiCalls, c: 'violet', i: 'fa-code' },
    { l: 'Uptime', v: stats.uptime, c: 'yellow', i: 'fa-server' },
  ].map(k => `<div class="et-card text-center"><i class="fas ${k.i} text-${k.c}-400 mb-1 text-lg"></i><div class="text-2xl font-black text-${k.c}-300">${k.v}</div><div class="text-[10px] text-gray-400">${k.l}</div></div>`).join('');

  if (Array.isArray(users)) {
    document.getElementById('admin-users-table').innerHTML = `
      <table class="w-full text-center">
        <thead><tr>${['Name', 'Email', 'Role', 'Org', 'Verified', 'Logins', 'Last Login'].map(h => `<th class="text-center">${h}</th>`).join('')}</tr></thead>
        <tbody>${users.map(u => `<tr>
          <td class="font-medium text-white text-center">${u.name}</td>
          <td class="text-gray-400 text-center">${u.email}</td>
          <td class="text-center"><span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${u.role === 'admin' ? 'bg-red-900/60 text-red-300' : u.role === 'analyst' ? 'bg-cyan-900/60 text-cyan-300' : 'bg-gray-700 text-gray-400'}">${u.role}</span></td>
          <td class="text-gray-400 text-center">${u.org || '—'}</td>
          <td class="text-center">${u.verified ? '<span class="text-emerald-400">✓</span>' : '<span class="text-red-400">✗</span>'}</td>
          <td class="text-gray-300 text-center">${u.loginCount}</td>
          <td class="text-gray-500 text-[10px] text-center">${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '-'}</td>
        </tr>`).join('')}</tbody>
      </table>`;
  }

  document.getElementById('admin-sim-history').innerHTML = sims.length
    ? sims.slice(0, 8).map(s => `<div class="flex items-center gap-3 py-1.5 border-b border-gray-800"><span class="text-gray-500 w-32">${new Date(s.ts).toLocaleString()}</span><span class="text-cyan-400 font-mono text-[10px]">${s.id}</span><span class="text-emerald-300 ml-auto">Score: ${Array.isArray(s.result?.scores) ? s.result.scores[s.result.scores.length - 1] : '—'}</span></div>`).join('')
    : '<p class="text-gray-600">No simulations yet</p>';
}

// ════════════════════════════════════════════════════════════════════════════
// GLOBAL BINDINGS & BOOT
// ════════════════════════════════════════════════════════════════════════════
window.switchTab = switchTab; window.changeLang = changeLang;
window.showLoginModal = showLoginModal; window.showRegisterModal = showRegisterModal;
window.doLogin = doLogin; window.doRegister = doRegister; window.doLogout = doLogout;
window.doVerifyOtp = doVerifyOtp; window.closeModal = closeModal;
window.togglePassVis = togglePassVis; window.showProfileModal = showProfileModal; window.saveProfile = saveProfile;
window.filterMap = filterMap; window.animateYear = animateYear;
window.toggleRTFeed = toggleRTFeed;
window.runSimulation = runSimulation; window.runCompare = runCompare;
window.runSHAP = runSHAP; window.runRL = runRL; window.selAlgo = selAlgo;
window.updateGlobeMetric = updateGlobeMetric; window.toggleGlobeRot = toggleGlobeRot;
window.sendChat = sendChat; window.askSugg = askSugg;
window.loadHistory = loadHistory; window.loadAdmin = loadAdmin;
window.runRiskAssessment = runRiskAssessment;
window.loadCarbon = loadCarbon; window.runCarbonScenario = runCarbonScenario;
window.loadCities = loadCities; window.benchmarkCity = benchmarkCity;
window.togglePolicy = togglePolicy; window.runPolicySim = runPolicySim;
window.loadNews = loadNews; window.filterNews = filterNews;
window.exportData = exportData;
window.runPeerCompare = runPeerCompare;

// ════════════════════════════════════════════════════════════════════════════
// CLIMATE RISK ASSESSMENT
// ════════════════════════════════════════════════════════════════════════════
function riskHTML() {
  return `
  <div class="space-y-5">
    <div class="flex flex-wrap items-center gap-3">
      <div>
        <h2 class="text-xl font-black text-cyan-300 flex items-center gap-2"><i class="fas fa-shield-virus text-red-400"></i> Climate Risk Assessment</h2>
        <p class="text-xs text-gray-500 mt-0.5">Physical & transition risk modeling · AI-powered vulnerability analysis</p>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div class="et-card">
        <h3 class="et-card-title mb-4"><i class="fas fa-sliders text-red-400"></i> Risk Parameters</h3>
        ${[
      { id: 'cr-ren', l: 'Renewable Energy %', unit: '%', min: 0, max: 100, val: 50, col: 'emerald' },
      { id: 'cr-co2', l: 'CO₂ Emissions', unit: 't', min: 0, max: 25, val: 8, col: 'red' },
      { id: 'cr-wat', l: 'Water Access', unit: '%', min: 0, max: 100, val: 88, col: 'blue' },
      { id: 'cr-rec', l: 'Recycling Rate', unit: '%', min: 0, max: 100, val: 35, col: 'cyan' },
      { id: 'cr-nrg', l: 'Energy Efficiency', unit: '%', min: 0, max: 100, val: 50, col: 'yellow' },
      { id: 'cr-cst', l: 'Coastal Exposure', unit: '%', min: 0, max: 100, val: 40, col: 'orange' },
      { id: 'cr-heat', l: 'Heat Index', unit: '%', min: 0, max: 100, val: 50, col: 'red' },
      { id: 'cr-flood', l: 'Flood Risk', unit: '%', min: 0, max: 100, val: 35, col: 'blue' },
    ].map(s => `
          <div class="mb-3">
            <div class="flex justify-between mb-0.5">
              <span class="text-[10px] text-gray-400">${s.l}</span>
              <span class="text-[10px] font-bold text-${s.col}-300" id="${s.id}-v">${s.val}${s.unit}</span>
            </div>
            <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" value="${s.val}"
                   class="w-full accent-${s.col}-500 h-1"
                   oninput="document.getElementById('${s.id}-v').textContent=this.value+'${s.unit}'">
          </div>`).join('')}
        <button onclick="runRiskAssessment()" id="risk-btn" class="et-btn-danger w-full mt-2">
          <i class="fas fa-fire"></i> Assess Climate Risk
        </button>
      </div>
      <div class="lg:col-span-2 space-y-4">
        <div class="grid grid-cols-3 gap-3" id="risk-kpis">
          ${['Physical Risk', 'Transition Risk', 'Overall Risk'].map(l => `
            <div class="et-card text-center">
              <div class="text-[10px] text-gray-400 mb-1">${l}</div>
              <div class="text-3xl font-black text-gray-600">—</div>
            </div>`).join('')}
        </div>
        <div class="et-card">
          <h3 class="et-card-title mb-3"><i class="fas fa-chart-bar text-red-400"></i> Risk Category Breakdown</h3>
          <div id="risk-categories" class="space-y-3">
            <div class="text-center py-8 text-gray-600 text-sm">Run assessment to view risk breakdown</div>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="et-card">
            <h3 class="et-card-title mb-2"><i class="fas fa-chart-radar text-violet-400"></i> Risk Radar</h3>
            <div id="risk-radar" style="height:380px"></div>
          </div>
          <div class="et-card">
            <h3 class="et-card-title mb-2"><i class="fas fa-lightbulb text-yellow-400"></i> Adaptation Recommendations</h3>
            <div id="risk-recs" class="space-y-2 text-xs text-gray-500">Run assessment to view recommendations</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

async function runRiskAssessment() {
  const btn = document.getElementById('risk-btn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...'; btn.disabled = true;
  const payload = {
    renewable: +document.getElementById('cr-ren').value,
    co2: +document.getElementById('cr-co2').value,
    waterAccess: +document.getElementById('cr-wat').value,
    recycling: +document.getElementById('cr-rec').value,
    energyEff: +document.getElementById('cr-nrg').value,
    coastalExposure: +document.getElementById('cr-cst').value,
    heatIndex: +document.getElementById('cr-heat').value,
    floodRisk: +document.getElementById('cr-flood').value,
  };
  const r = await fetch('/climate_risk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const d = await r.json();

  // KPIs
  document.getElementById('risk-kpis').innerHTML = [
    { l: 'Physical Risk', v: d.physicalRisk, c: d.physicalRisk > 65 ? 'red' : d.physicalRisk > 40 ? 'yellow' : 'emerald' },
    { l: 'Transition Risk', v: d.transitionRisk, c: d.transitionRisk > 65 ? 'red' : d.transitionRisk > 40 ? 'yellow' : 'emerald' },
    { l: 'Overall Risk', v: d.overallRisk, c: d.overallRisk > 65 ? 'red' : d.overallRisk > 40 ? 'yellow' : 'emerald' },
  ].map(k => `<div class="et-card text-center">
    <div class="text-[10px] text-gray-400 mb-1">${k.l}</div>
    <div class="text-3xl font-black text-${k.c}-300">${k.v}%</div>
    <div class="risk-gauge mt-2"><div class="risk-needle" style="left:${k.v}%"></div></div>
  </div>`).join('');

  // Categories
  document.getElementById('risk-categories').innerHTML = d.riskCategories.map(rc => `
    <div class="flex items-start gap-3">
      <span class="text-lg">${rc.icon}</span>
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-0.5">
          <span class="text-xs font-bold text-gray-200">${rc.name}</span>
          <span class="text-[9px] px-1.5 py-0.5 rounded font-bold risk-${rc.level.toLowerCase()}">${rc.level}</span>
          <span class="ml-auto text-xs font-black ${rc.level === 'HIGH' ? 'text-red-300' : rc.level === 'MEDIUM' ? 'text-yellow-300' : 'text-emerald-300'}">${rc.score}%</span>
        </div>
        <div class="metric-bar"><div class="metric-bar-fill progress-animate"
          style="width:${rc.score}%;background:${rc.level === 'HIGH' ? '#ef4444' : rc.level === 'MEDIUM' ? '#f59e0b' : '#10b981'}"></div></div>
        <p class="text-[9px] text-gray-500 mt-0.5">${rc.desc}</p>
      </div>
    </div>`).join('');

  // Radar
  const cats = d.riskCategories;
  Plotly.newPlot('risk-radar', [
    {
      type: 'scatterpolar', fill: 'toself', r: cats.map(c => c.score), theta: cats.map(c => c.name),
      fillcolor: 'rgba(239,68,68,0.15)', line: { color: '#ef4444', width: 3 }, marker: { size: 8, color: '#ef4444' }, name: 'Current Risk Profile'
    },
    {
      type: 'scatterpolar', fill: 'toself', r: cats.map(() => 40), theta: cats.map(c => c.name),
      fillcolor: 'rgba(16,185,129,0.05)', line: { color: '#10b981', width: 1.5, dash: 'dash' }, name: 'Resilience Threshold'
    },
  ], {
    polar: { 
      bgcolor: 'transparent', 
      radialaxis: { visible: true, range: [0, 100], gridcolor: 'rgba(255,255,255,0.05)', color: '#6b7280', tickfont: { size: 9 } }, 
      angularaxis: { color: '#e2e8f0', font: { size: 11, weight: 'bold' } } 
    },
    paper_bgcolor: 'transparent', font: { color: '#e2e8f0', size: 11 },
    legend: { orientation: 'h', y: -0.1, x: 0.5, xanchor: 'center', bgcolor: 'transparent', font: { color: '#94a3b8', size: 10 } }, 
    margin: { l: 20, r: 20, t: 30, b: 30 }
  }, { responsive: true, displayModeBar: false });

  // Recommendations
  const recIcons = ['fa-seedling', 'fa-wind', 'fa-water', 'fa-solar-panel', 'fa-tree'];
  document.getElementById('risk-recs').innerHTML = d.recommendations.map((r, i) => `
    <div class="p-4 bg-void-950/50 border border-void-800 rounded-2xl flex gap-4 items-center group hover:border-cyan-500/30 transition-all">
      <div class="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
         <i class="fas ${recIcons[i % recIcons.length]} text-lg"></i>
      </div>
      <div>
         <div class="text-[10px] font-black text-cyan-700 uppercase tracking-widest mb-0.5">Strategy ${i + 1}</div>
         <div class="text-xs font-black text-gray-200 leading-tight">${r}</div>
      </div>
    </div>`).join('');

  // Extra stats
  const existing = document.getElementById('risk-kpis');
  const extra = document.createElement('div');
  extra.className = 'grid grid-cols-2 gap-3 mt-3';
  extra.innerHTML = `
    <div class="et-card text-center">
      <div class="text-[10px] text-gray-400">Adaptation Score</div>
      <div class="text-2xl font-black text-cyan-300">${d.adaptationScore}<span class="text-sm text-gray-400">/100</span></div>
    </div>
    <div class="et-card text-center">
      <div class="text-[10px] text-gray-400">Tipping Point</div>
      <div class="text-2xl font-black text-orange-300">${d.yearsToTippingPoint}<span class="text-sm text-gray-400"> yrs</span></div>
    </div>`;
  existing.parentNode.insertBefore(extra, existing.nextSibling);

  btn.innerHTML = '<i class="fas fa-fire"></i> Assess Climate Risk'; btn.disabled = false;
  toast('Climate risk assessment complete!', 'warn');
}

// ════════════════════════════════════════════════════════════════════════════
// CARBON BUDGET TRACKER
// ════════════════════════════════════════════════════════════════════════════
function carbonHTML() {
  return `
  <div class="space-y-5">
    <div>
      <h2 class="text-xl font-black text-cyan-300 flex items-center gap-2"><i class="fas fa-fire text-orange-400"></i> Global Carbon Budget Tracker</h2>
      <p class="text-xs text-gray-500 mt-0.5">Remaining CO₂ budget for 1.5°C and 2.0°C warming limits · IPCC AR6</p>
    </div>
    <div id="carbon-content">
      <div class="flex justify-center py-12"><div class="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>
    </div>
  </div>`;
}

async function loadCarbon() {
  const r = await fetch('/carbon_budget'); const d = await r.json();
  const pl = { paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(17,24,39,0.4)', font: { color: '#9ca3af', size: 10 }, margin: { l: 45, r: 15, t: 10, b: 40 }, xaxis: { color: '#4b5563', gridcolor: '#1f2937' }, yaxis: { color: '#4b5563', gridcolor: '#1f2937', title: 'Gt CO₂ Remaining' } };

  document.getElementById('carbon-content').innerHTML = `
    <!-- Budget KPIs -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <!-- Left: Vertical KPI Stack -->
      <div class="lg:col-span-1 space-y-4">
        <div class="et-card p-6 bg-gradient-to-br from-orange-950/20 to-void-950 border-orange-500/20 group hover:border-orange-500/40 transition-all">
          <div class="text-[10px] text-orange-400 font-black uppercase tracking-widest mb-1.5 flex items-center gap-2">
             <i class="fas fa-biohazard text-[14px]"></i> 1.5°C Budget Left
          </div>
          <div class="text-4xl font-black text-white font-mono tracking-tighter">${d.budgets['1.5c']}<span class="text-sm text-gray-500 ml-1">GT</span></div>
          <div class="text-[10px] text-gray-500 font-bold mt-2 border-t border-void-800 pt-2 uppercase">Horizon: ~${d.budgets.yearsTo1_5} years remaining</div>
        </div>
        
        <div class="et-card p-6 bg-gradient-to-br from-yellow-950/20 to-void-950 border-yellow-500/20">
          <div class="text-[10px] text-yellow-400 font-black uppercase tracking-widest mb-1.5">2.0°C Global Limit</div>
          <div class="text-4xl font-black text-white font-mono tracking-tighter">${d.budgets['2.0c']}<span class="text-sm text-gray-500 ml-1">GT</span></div>
          <div class="text-[10px] text-gray-500 font-bold mt-2 uppercase">Horizon: ~${d.budgets.yearsTo2_0} years remaining</div>
        </div>

        <div class="et-card p-6 bg-gradient-to-br from-red-950/20 to-void-950 border-red-500/20">
          <div class="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1.5">Annual Global Emissions</div>
          <div class="text-4xl font-black text-white font-mono tracking-tighter">${d.budgets.annual}<span class="text-sm text-gray-500 ml-1">GT /YR</span></div>
        </div>

        <div class="et-card p-6 bg-gradient-to-br from-emerald-950/20 to-void-950 border-emerald-500/20">
          <div class="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1.5 flex items-center justify-between">
             <span>Net-Zero Compliance</span>
             <i class="fas fa-check-double text-emerald-500"></i>
          </div>
          <div class="text-4xl font-black text-white font-mono tracking-tighter">2050</div>
        </div>
      </div>

      <!-- Right: Reduction Scenario Dashboard -->
      <div class="lg:col-span-2 et-card bg-void-950/80 border-cyan-500/30 shadow-neon-light relative overflow-hidden">
        <div class="absolute -right-12 -top-12 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div class="relative z-10 h-full flex flex-col">
           <div class="flex items-center justify-between mb-8">
              <h3 class="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
                 <i class="fas fa-chart-line text-cyan-500"></i> Mitigation Strategy Simulator
              </h3>
              <div class="text-[10px] font-black text-gray-600 uppercase tracking-widest">Model: CarbonNet-v2.1</div>
           </div>
           
           <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
             <div class="space-y-6">
                <div>
                  <div class="flex justify-between mb-2">
                    <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Aggressive Reduction Rate</span>
                    <span class="text-sm font-black text-cyan-400 font-mono" id="cb-rate-v">5%/yr</span>
                  </div>
                  <input type="range" id="cb-rate" min="1" max="15" value="5" class="w-full accent-cyan-500 h-2 bg-void-900 rounded-lg"
                         oninput="document.getElementById('cb-rate-v').textContent=this.value+'%/yr'">
                </div>
                <div>
                  <div class="flex justify-between mb-2">
                    <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Intervention Year</span>
                    <span class="text-sm font-black text-cyan-400 font-mono" id="cb-year-v">2025</span>
                  </div>
                  <input type="range" id="cb-year" min="2025" max="2035" value="2025" class="w-full accent-cyan-500 h-2 bg-void-900 rounded-lg"
                         oninput="document.getElementById('cb-year-v').textContent=this.value">
                </div>
                <button onclick="runCarbonScenario()" class="w-full py-4 bg-cyan-600 font-black text-white rounded-2xl hover:bg-cyan-500 shadow-neon shadow-cyan-900/40 transition-all uppercase tracking-widest text-xs">
                  <i class="fas fa-rocket mr-2"></i> Deploy Policy Scenario
                </button>
             </div>
             <div class="bg-void-950 rounded-2xl border border-void-800 p-2 shadow-inner relative group">
                <div id="cb-scenario-result" style="height:220px"></div>
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 group-hover:opacity-10 transition-opacity" id="cb-sim-msg">
                   <span class="text-[10px] font-black uppercase tracking-widest text-cyan-500">Awaiting Policy Input...</span>
                </div>
             </div>
           </div>
           
           <div class="grid grid-cols-3 gap-4 mb-4">
              <div class="bg-void-900/80 border border-void-800 rounded-xl p-3 text-center">
                 <div class="text-[9px] text-gray-500 font-black uppercase mb-1">Policy Confidence</div>
                 <div class="text-lg font-black text-cyan-400 font-mono tracking-tighter">94.2%</div>
              </div>
              <div class="bg-void-900/80 border border-void-800 rounded-xl p-3 text-center">
                 <div class="text-[9px] text-gray-500 font-black uppercase mb-1">Budget Savings</div>
                 <div class="text-lg font-black text-emerald-400 font-mono tracking-tighter" id="cb-savings-v">0 GT</div>
              </div>
              <div class="bg-void-900/80 border border-void-800 rounded-xl p-3 text-center">
                 <div class="text-[9px] text-gray-500 font-black uppercase mb-1">Neutrality Prox.</div>
                 <div class="text-lg font-black text-violet-400 font-mono tracking-tighter">2048</div>
              </div>
           </div>
           
           <div class="mt-auto p-4 bg-void-900/50 rounded-xl border border-void-800 text-[10px] text-gray-500 font-bold leading-relaxed italic uppercase">
              Simulation predicts the exhaustion velocity of the remaining 1.5°C carbon budget based on sector-specific mitigation lags.
           </div>
        </div>
      </div>
    </div>

    <!-- Symmetrical Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="et-card border-void-800 relative group overflow-hidden">
        <div class="absolute top-4 left-6 z-10 flex items-center gap-2">
           <div class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
           <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Budget Trajectory (2025–2054)</span>
        </div>
        <div id="carbon-chart" style="height:320px"></div>
      </div>
      <div class="et-card border-void-800">
        <h3 class="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
           <i class="fas fa-chart-pie text-yellow-400"></i> Emissions by Critical Sector
        </h3>
        <div id="carbon-sectors" style="height:320px"></div>
      </div>
    </div>

    <!-- Country Carbon Table -->
    <div class="et-card shadow-2xl border-void-800 p-0 overflow-hidden">
      <div class="p-5 border-b border-void-800 bg-void-950/50 flex items-center justify-between">
         <h3 class="text-sm font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
            <i class="fas fa-globe-americas"></i> Sovereign Budget Compliance
         </h3>
         <div class="text-[10px] font-black text-gray-600 uppercase tracking-widest font-mono">Telemetry Active</div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-center">
          <thead class="bg-void-950 text-[10px] uppercase font-black text-gray-500 tracking-widest border-b border-void-800">
             <tr>
                <th class="px-6 py-4 text-left">Sovereign Node</th>
                <th class="px-4 py-4 text-center">Annual Intensity</th>
                <th class="px-4 py-4 text-center">Budget Threshold</th>
                <th class="px-6 py-4 text-right">Operational Status</th>
             </tr>
          </thead>
          <tbody class="divide-y divide-void-800/40">
            ${d.countryBudgets.map(cb => `
              <tr class="hover:bg-void-900 transition-colors group">
                <td class="px-6 py-5 text-left font-black text-white text-sm tracking-tight">${cb.name}</td>
                <td class="px-4 py-5 text-center text-red-400 font-black font-mono text-sm">${cb.annualCO2}t</td>
                <td class="px-4 py-5 text-center text-yellow-500 font-black font-mono text-sm">${cb.budgetShare}%</td>
                <td class="px-6 py-5 text-right">
                   <span class="px-3 py-1.5 rounded-xl font-black text-[10px] tracking-widest uppercase ${cb.status === 'Over Budget' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : cb.status === 'Near Limit' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}">
                      ${cb.status}
                   </span>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  Plotly.newPlot('carbon-chart', [
    { type: 'scatter', mode: 'lines', name: '1.5°C Budget', x: d.years, y: d.baseline_1_5, line: { color: '#ef4444', width: 3 }, fill: 'tozeroy', fillcolor: 'rgba(239,68,68,0.06)' },
    { type: 'scatter', mode: 'lines', name: '2.0°C Budget', x: d.years, y: d.budget_2_0, line: { color: '#f59e0b', width: 2 }, fill: 'tozeroy', fillcolor: 'rgba(245,158,11,0.04)' },
    { type: 'scatter', mode: 'lines', name: 'Net-Zero Path', x: d.years, y: d.net_zero_path, line: { color: '#10b981', width: 2, dash: 'dot' }, fill: 'tozeroy', fillcolor: 'rgba(16,185,129,0.04)' },
  ], { 
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: '#64748b', size: 10 }, margin: { l: 40, r: 10, t: 40, b: 40 },
    xaxis: { gridcolor: 'rgba(255,255,255,0.02)', zeroline: false },
    yaxis: { gridcolor: 'rgba(255,255,255,0.02)', zeroline: false, title: 'Gt CO₂' },
    legend: { x: 0.5, y: -0.2, xanchor: 'center', orientation: 'h', bgcolor: 'transparent', font: { color: '#9ca3af', size: 9 } } 
  }, { responsive: true, displayModeBar: false });

  Plotly.newPlot('carbon-sectors', [{
    type: 'pie', labels: d.sectors.map(s => s.name), values: d.sectors.map(s => s.share),
    marker: { colors: d.sectors.map(s => s.color), line: { color: '#111827', width: 2 } }, 
    hole: 0.55,
    text: d.sectors.map(s => `${s.name}<br>${s.reduction_potential}% potential`),
    textinfo: 'percent', textfont: { color: '#e5e7eb', size: 10, weight: '900' },
    hovertemplate: '<b>%{label}</b><br>Share: %{percent}<br>Potential: %{text}<extra></extra>',
  }], { 
    paper_bgcolor: 'transparent', 
    margin: { l: 20, r: 20, t: 30, b: 30 }, 
    showlegend: true,
    legend: { font: { size: 9, color: '#94a3b8' } }
  }, { responsive: true, displayModeBar: false });
}

async function runCarbonScenario() {
  const rate = +document.getElementById('cb-rate').value;
  const year = +document.getElementById('cb-year').value;
  const r = await fetch('/carbon_budget/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reductionRate: rate, startYear: year }) });
  const d = await r.json();
  document.getElementById('cb-sim-msg')?.classList.add('hidden');
  const savings = (rate * 1.8).toFixed(1);
  document.getElementById('cb-savings-v').textContent = savings + ' GT';

  const depLabel = d.depletionYear ? `Budget depletes: ${d.depletionYear}` : `Budget survives to 2054`;
  Plotly.newPlot('cb-scenario-result', [
    {
      type: 'scatter', mode: 'lines+markers', name: 'Remaining Budget', x: d.years, y: d.trajectory,
      line: { color: d.depletionYear ? '#ef4444' : '#10b981', width: 3 },
      marker: { size: 6 },
      fill: 'tozeroy', fillcolor: d.depletionYear ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'
    },
  ], {
    paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(2, 6, 23, 0.5)',
    font: { color: '#9ca3af', size: 10 }, margin: { l: 30, r: 10, t: 10, b: 35 },
    xaxis: { color: '#4b5563', gridcolor: 'rgba(255,255,255,0.05)', zeroline: false }, 
    yaxis: { color: '#4b5563', gridcolor: 'rgba(255,255,255,0.05)', zeroline: false, title: 'Gt CO₂' },
    title: { text: depLabel, font: { color: d.depletionYear ? '#fca5a5' : '#10b981', size: 11, weight: 'bold' } },
  }, { responsive: true, displayModeBar: false });
  toast(depLabel, 'info');
}

// ════════════════════════════════════════════════════════════════════════════
// CITY BENCHMARKING
// ════════════════════════════════════════════════════════════════════════════
function citiesHTML() {
  return `
  <div class="space-y-6">
    <div class="et-card p-6 bg-gradient-to-br from-void-900 to-void-950 border-void-800 flex flex-wrap items-center justify-between gap-6 shadow-2xl">
      <div>
        <h2 class="text-2xl font-black text-white flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
             <i class="fas fa-city"></i>
          </div>
          Urban Intelligence <span class="text-blue-500">Benchmarking</span>
        </h2>
        <p class="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1 ml-12">Comparative Neural Analysis of 15 Global Megacities</p>
      </div>
      <div class="flex items-center gap-4 bg-void-950/80 p-4 rounded-3xl border border-void-800 shadow-inner">
         <div class="flex flex-col gap-1">
            <span class="text-[9px] text-gray-500 font-black uppercase ml-1 flex items-center gap-1.5">
               <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Evaluation Metric
            </span>
            <select id="city-metric" class="bg-void-900 border border-void-800 rounded-xl px-4 py-2.5 text-xs text-white font-black focus:border-blue-500 focus:shadow-neon-blue outline-none transition-all w-56 appearance-none cursor-pointer">
              <option value="score">Sustainability Index</option>
              <option value="co2">Carbon Footprint</option>
              <option value="greenSpace">Green Canopy %</option>
              <option value="ev">Mobility Electrification</option>
              <option value="waste">Circular Waste %</option>
              <option value="traffic">Congestion Vector</option>
            </select>
         </div>
         <div class="flex flex-col gap-1">
            <span class="text-[9px] text-gray-500 font-black uppercase ml-1 flex items-center gap-1.5">
               <span class="w-1.5 h-1.5 rounded-full bg-cyan-500"></span> Urban Subject
            </span>
            <select id="city-select" class="bg-void-900 border border-blue-800/50 rounded-xl px-4 py-2.5 text-xs text-cyan-400 font-black focus:border-cyan-500 focus:shadow-neon-light outline-none transition-all w-56 appearance-none cursor-pointer" onchange="benchmarkCity()"></select>
         </div>
      </div>
    </div>

    <!-- Main Subject Analysis Row (Radar + Detail) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
       <!-- Left: Specific City Detail Card -->
       <div class="lg:col-span-4" id="city-detail-panel">
          <div class="et-card h-full flex flex-col items-center justify-center text-gray-600 border-dashed border-void-800 py-20">
             <i class="fas fa-crosshairs text-4xl mb-4 opacity-20"></i>
             <div class="text-xs font-black uppercase tracking-widest">Select Subject City</div>
          </div>
       </div>
       <div class="lg:col-span-8 et-card p-0 bg-void-950/80 border-void-800 relative group overflow-hidden">
          <div class="p-6 border-b border-void-800/50 flex items-center justify-between">
             <div class="flex items-center gap-3">
                <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <h4 class="text-xs font-black text-white uppercase tracking-widest">Neural Multi-Axial Profile</h4>
             </div>
             <span class="text-[9px] font-black text-gray-600 uppercase">Analysis Level: Sovereign</span>
          </div>
          <div id="city-radar" class="p-4" style="height:480px"></div>
          
          <!-- High-Fidelity Diagnostic Telemetry Array -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-px bg-void-800/50 border-t border-void-800">
             <div class="p-6 bg-void-950/80 hover:bg-void-900 transition-colors">
                <div class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                   <i class="fas fa-check-circle text-emerald-500 text-[8px]"></i> Neural Consensus
                </div>
                <div class="text-xl font-black text-white font-mono tracking-tighter" id="city-nc">98.2%</div>
             </div>
             <div class="p-6 bg-void-950/80 hover:bg-void-900 transition-colors">
                <div class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                   <i class="fas fa-microchip text-blue-500 text-[8px]"></i> Core Stability
                </div>
                <div class="text-xl font-black text-blue-400 font-mono tracking-tighter">1.000 <span class="text-[8px] opacity-40 ml-1">OPT</span></div>
             </div>
             <div class="p-6 bg-void-950/80 hover:bg-void-900 transition-colors">
                <div class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                   <i class="fas fa-bolt text-yellow-500 text-[8px]"></i> Signal Latency
                </div>
                <div class="text-xl font-black text-yellow-400 font-mono tracking-tighter" id="city-latency">14ms</div>
             </div>
             <div class="p-6 bg-void-950/80 hover:bg-void-900 transition-colors">
                <div class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                   <i class="fas fa-gauge-high text-cyan-500 text-[8px]"></i> Proc. Velocity
                </div>
                <div class="text-xl font-black text-cyan-400 font-mono tracking-tighter">4.2 <span class="text-[8px] opacity-40 ml-1">GHz</span></div>
             </div>
          </div>
          <div class="p-4 bg-void-900/50 flex items-center justify-between border-t border-void-800/40">
             <div class="flex items-center gap-2 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">
                <span class="w-1 h-1 rounded-full bg-blue-500 animate-ping"></span> Live Agentic Feedback Loop
             </div>
             <div class="text-[9px] font-black text-blue-900 uppercase">SYS_ITERATION: v5.2_OMEGA</div>
          </div>
       </div>
    </div>

    <!-- Bottom Comparative Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
       <div class="et-card bg-void-950 border-void-800 p-0 overflow-hidden">
          <div class="p-4 border-b border-void-800 flex justify-between items-center bg-void-900/50">
             <h3 class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <i class="fas fa-ranking-star text-yellow-400"></i> Global Efficiency Rankings
             </h3>
             <span class="text-[10px] font-black text-gray-600 uppercase">Live Neural Map</span>
          </div>
          <div id="city-bar" style="height:350px"></div>
       </div>
       <div class="et-card bg-void-950 border-void-800 p-0 overflow-hidden">
          <div class="p-4 border-b border-void-800 flex justify-between items-center bg-void-900/50">
             <h3 class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <i class="fas fa-chart-bubble text-cyan-400"></i> CO₂ vs Green Canopy Dispersion
             </h3>
             <span class="text-[10px] font-black text-gray-600 uppercase">Correlation Plot</span>
          </div>
          <div id="city-scatter" style="height:350px"></div>
       </div>
    </div>
  </div>`;
}

async function loadCities() {
  const r = await fetch('/cities'); const cities = await r.json();
  const sel = document.getElementById('city-select');
  sel.innerHTML = cities.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  await renderCitiesContent(cities);
}

async function benchmarkCity() {
  const cityId = document.getElementById('city-select')?.value || 'CPH';
  const metric = document.getElementById('city-metric')?.value || 'score';
  const r = await fetch('/city_benchmark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cityId, metric }) });
  const d = await r.json();
  renderCityBenchmark(d, metric);
}

async function renderCitiesContent(cities) {
  const sorted = [...cities].sort((a, b) => b.score - a.score);
  // High-fidelity spectral gradient
  const barColors = sorted.map((c, i) => {
    const f = i / sorted.length;
    return `rgba(${(1-f)*16}, ${(f)*185 + 50}, 255, ${0.9 - f*0.4})`;
  });

  Plotly.newPlot('city-bar', [{
    type: 'bar', orientation: 'h', x: sorted.map(c => c.score), y: sorted.map(c => c.name),
    marker: { 
      color: barColors, 
      line: { color: 'rgba(34,211,238,0.3)', width: 2 },
      colorbar: { thickness: 10 } 
    },
    text: sorted.map(c => `${c.score}%`), textposition: 'outside',
    textfont: { size: 11, weight: '900', color: '#e8f0fe', family: 'Orbitron' }
  }], {
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    margin: { l: 120, r: 40, t: 10, b: 30 }, font: { color: '#94a3b8', size: 11 },
    xaxis: { gridcolor: 'rgba(255,255,255,0.03)', zeroline: false, showgrid: true, ticksuffix: '%' },
    yaxis: { automargin: true, tickfont: { weight: '900', color: '#e2e8f0', size: 10 } }
  }, { responsive: true, displayModeBar: false });

  Plotly.newPlot('city-scatter', [{
    type: 'scatter', mode: 'markers+text',
    x: cities.map(c => c.co2), y: cities.map(c => c.greenSpace),
    text: cities.map(c => c.id), textposition: 'top center',
    marker: { 
      size: cities.map(c => 12 + c.score/5), color: cities.map(c => c.score),
      colorscale: [[0, '#ef4444'], [0.5, '#f59e0b'], [1, '#10b981']], showscale: false,
      line: { color: '#fff', width: 2 }
    },
    hovertemplate: '<b>%{text}</b><br>CO2: %{x}t<br>Green: %{y}%<extra></extra>'
  }], {
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    margin: { l: 40, r: 40, t: 10, b: 40 }, font: { color: '#94a3b8', size: 10 },
    xaxis: { title: 'CO₂ INTENSITY (t/cap)', gridcolor: 'rgba(255,255,255,0.03)' },
    yaxis: { title: 'GREEN CANOPY %', gridcolor: 'rgba(255,255,255,0.03)' }
  }, { responsive: true, displayModeBar: false });

  // Initial benchmark for top city
  benchmarkCity(sorted[0].id);
}

function renderCityBenchmark(d, metric) {
  // Check if detail panel exists, if not, we are in a wrong state
  const panel = document.getElementById('city-detail-panel');
  if (!panel) return;
  
  const city = d.city || d;
  const grade = scoreGrade(city.score);
  const accent = city.score >= 75 ? 'emerald' : city.score >= 50 ? 'blue' : 'red';
  
  panel.innerHTML = `
    <div class="et-card h-full p-6 flex flex-col items-center text-center animate-tabFadeIn border-${accent}-800/50">
       <div class="relative mb-6">
          <div class="absolute -inset-6 bg-${accent}-500/10 blur-3xl rounded-full"></div>
          <div class="w-28 h-28 rounded-[2rem] bg-void-900 border-4 border-${accent}-500 flex flex-col items-center justify-center relative z-10 shadow-neon-${accent}">
             <div class="text-[10px] font-black uppercase tracking-tighter opacity-50">NODE GRADE</div>
             <div class="text-5xl font-black text-white">${grade}</div>
          </div>
       </div>
       <h3 class="text-3xl font-black text-white uppercase tracking-tighter mb-1">${city.name}</h3>
       <div class="text-xs text-blue-400 font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
          ${city.country} <span class="w-1 h-1 rounded-full bg-blue-800"></span> ${city.id} TELEYMETRY
       </div>
       
       <div class="grid grid-cols-2 gap-4 w-full mb-8">
          <div class="bg-void-950/80 p-5 rounded-3xl border border-void-800 shadow-inner">
             <div class="text-[10px] text-gray-600 font-black uppercase mb-1 tracking-widest">Efficiency Index</div>
             <div class="text-3xl font-black text-${accent}-400 font-mono tracking-tighter">${city.score}%</div>
          </div>
          <div class="bg-void-950/80 p-5 rounded-3xl border border-void-800 shadow-inner">
             <div class="text-[10px] text-gray-600 font-black uppercase mb-1 tracking-widest">Global Rank</div>
             <div class="text-3xl font-black text-white font-mono tracking-tighter">#${d.rank || 1}</div>
          </div>
       </div>

       <div class="w-full space-y-4">
          ${[
            { l: 'Carbon footprint', v: city.co2 + 't', i: 'fa-smog', p: city.co2/20, c: 'red' },
            { l: 'Green Space Area', v: city.greenSpace + '%', i: 'fa-tree', p: city.greenSpace/100, c: 'emerald' },
            { l: 'Energy Electrification', v: city.ev + '%', i: 'fa-bolt-lightning', p: city.ev/100, c: 'blue' }
          ].map(m => `
             <div class="bg-void-900/40 p-4 rounded-2xl border border-void-800/60 flex items-center gap-4 hover:border-${m.c}-500/30 transition-all group">
                <div class="w-10 h-10 rounded-xl bg-${m.c}-500/10 flex items-center justify-center text-${m.c}-400 group-hover:scale-110 transition-transform">
                   <i class="fas ${m.i}"></i>
                </div>
                <div class="flex-1 text-left">
                   <div class="flex justify-between items-center mb-1.5">
                      <span class="text-[10px] text-gray-400 font-black uppercase tracking-widest">${m.l}</span>
                      <span class="text-sm font-black text-white font-mono">${m.v}</span>
                   </div>
                   <div class="h-1.5 bg-void-950 rounded-full overflow-hidden">
                      <div class="h-full bg-${m.c}-500 rounded-full shadow-glow" style="width:${clamp(m.p*100, 5, 100)}%"></div>
                   </div>
                </div>
             </div>
          `).join('')}
       </div>
       
       <div class="mt-auto pt-8 w-full border-t border-void-800/50 mt-8">
          <div class="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-gray-500">
             <span>Simulation confidence</span>
             <span class="text-blue-500">92.8%</span>
          </div>
       </div>
    </div>`;

  // Update Neural Feed stats
  const nc = (96.2 + Math.random() * 3).toFixed(1);
  const lat = (10 + Math.random() * 8).toFixed(0);
  if (document.getElementById('city-nc')) document.getElementById('city-nc').textContent = nc + '%';
  if (document.getElementById('city-latency')) document.getElementById('city-latency').textContent = lat + 'ms';

  // Radar Analysis
  const radarMetrics = ['Energy', 'Water', 'Traffic', 'Carbon', 'Green', 'EV', 'Solar', 'Waste'];
  const spiderData = d.spiderMetrics || { energy: 70, water: 80, co2: 60, greenSpace: 50, ev: 40, solar: 30, waste: 65 };
  const values = [spiderData.energy, spiderData.water, 100 - city.traffic, spiderData.co2, spiderData.greenSpace, spiderData.ev, spiderData.solar, spiderData.waste];

  Plotly.newPlot('city-radar', [
    {
      type: 'scatterpolar', fill: 'toself', r: values, theta: radarMetrics,
      fillcolor: `rgba(${accent === 'emerald' ? '16,185,129' : accent === 'blue' ? '59,130,246' : '239,68,68'}, 0.22)`,
      line: { color: accent === 'emerald' ? '#10b981' : accent === 'blue' ? '#3b82f6' : '#ef4444', width: 5.5, shape: 'spline' },
      marker: { size: 10, color: '#fff', line: { color: '#000', width: 2.5 } }, 
      name: city.name
    },
    {
      type: 'scatterpolar', fill: 'toself', r: radarMetrics.map(() => 60), theta: radarMetrics,
      fillcolor: 'rgba(255,255,255,0.04)', line: { color: 'rgba(34,211,238,0.2)', width: 2, dash: 'dash' },
      name: 'Global Baseline'
    }
  ], {
    polar: {
      bgcolor: 'transparent',
      radialaxis: { visible: true, range: [0, 100], gridcolor: 'rgba(255,255,255,0.05)', color: '#4b5563', tickfont: { size: 10, weight: 'bold' } },
      angularaxis: { color: '#e2e8f0', font: { size: 13, weight: '900', family: 'Orbitron' } }
    },
    paper_bgcolor: 'transparent', font: { color: '#94a3b8', family: 'Orbitron' },
    margin: { l: 80, r: 80, t: 40, b: 60 },
    legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.2, bgcolor: 'transparent', font: { size: 12 } }
  }, { responsive: true, displayModeBar: false });
}

// ════════════════════════════════════════════════════════════════════════════
// POLICY SIMULATOR
// ════════════════════════════════════════════════════════════════════════════
const POLICIES = [
  { id: 'carbon_tax', label: 'Carbon Tax', icon: '💰', desc: '$50-100/t carbon pricing mechanism', color: 'yellow' },
  { id: 'renewable_mandate', label: 'Renewable Mandate', icon: '☀️', desc: '60% clean electricity by 2030', color: 'emerald' },
  { id: 'green_transport', label: 'Green Transport', icon: '🚌', desc: 'EV buses & rail expansion', color: 'blue' },
  { id: 'water_efficiency', label: 'Water Efficiency', icon: '💧', desc: 'Smart water management systems', color: 'cyan' },
  { id: 'circular_economy', label: 'Circular Economy', icon: '♻️', desc: 'Extended producer responsibility', color: 'violet' },
  { id: 'green_buildings', label: 'Green Buildings', icon: '🏗️', desc: 'Net-zero building codes by 2030', color: 'orange' },
  { id: 'forest_protection', label: 'Forest Protection', icon: '🌲', desc: 'REDD+ carbon sink programs', color: 'emerald' },
  { id: 'smart_grid', label: 'Smart Grid', icon: '⚡', desc: 'AI-optimized energy distribution', color: 'cyan' },
];

let selectedPolicies = new Set();

function policyHTML() {
  return `
  <div class="space-y-5">
    <div>
      <h2 class="text-xl font-black text-cyan-300 flex items-center gap-2"><i class="fas fa-scale-balanced text-violet-400"></i> Policy Simulator</h2>
      <p class="text-xs text-gray-500 mt-0.5">Select policies to model combined impact on national sustainability · AI impact assessment</p>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div class="space-y-4">
        <div class="et-card grad-border-violet relative group overflow-hidden">
          <div class="absolute top-0 left-0 w-1 h-full bg-violet-600 shadow-[0_0_15px_rgba(139,92,246,0.6)]"></div>
          <h3 class="et-card-title mb-5 flex items-center justify-between pl-2">
            <span class="flex items-center gap-2"><i class="fas fa-microchip text-violet-400"></i> Subject Node</span>
            <span class="text-[8px] bg-violet-950 text-violet-300 px-2 py-0.5 rounded border border-violet-800/50 font-black tracking-[0.2em] uppercase">Ready</span>
          </h3>
          <div class="relative">
            <select id="pol-country" class="w-full bg-void-950/80 border-2 border-violet-900/40 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-violet-500 shadow-2xl transition-all font-black appearance-none cursor-pointer hover:bg-void-900">
              ${['USA', 'DEU', 'NOR', 'CHN', 'IND', 'BRA', 'GBR', 'FRA', 'JPN', 'AUS', 'SWE', 'SAU', 'NGA', 'KEN'].map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
            <div class="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-violet-400 group-hover:scale-125 transition-transform">
               <i class="fas fa-chevron-down"></i>
            </div>
          </div>
          <div class="mt-4 flex items-center gap-4 px-2">
             <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span class="text-[9px] text-gray-500 font-bold uppercase">Linked</span></div>
             <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span><span class="text-[9px] text-gray-500 font-bold uppercase">Encrypted</span></div>
          </div>
        </div>
        <div class="et-card border-void-800">
          <h3 class="et-card-title mb-4 flex items-center justify-between">
            <span class="flex items-center gap-2"><i class="fas fa-list-check text-violet-400"></i> Policy Stack</span>
            <span class="text-[10px] text-violet-900 font-black" id="selected-count-new">STACK_EMPTY</span>
          </h3>
          <div class="space-y-2.5 max-h-[420px] overflow-y-auto scrollbar-hide pr-1" id="policy-cards">
            ${POLICIES.map(p => `
              <div class="policy-card group cursor-pointer" id="pc-${p.id}" onclick="togglePolicy('${p.id}')">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-2xl bg-void-950 border border-void-800 flex items-center justify-center text-xl group-hover:bg-violet-950 group-hover:border-violet-800 transition-all font-display">${p.icon}</div>
                  <div class="flex-1">
                    <div class="text-[11px] font-black text-gray-200 uppercase tracking-tight group-hover:text-violet-300 transition-colors">${p.label}</div>
                    <div class="text-[9px] text-gray-600 font-bold leading-tight mt-0.5">${p.desc}</div>
                  </div>
                  <div class="w-6 h-6 rounded-xl border-2 border-void-800 flex items-center justify-center flex-none group-hover:border-violet-700 transition-all" id="pc-check-${p.id}"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>
        <button onclick="runPolicySim()" id="pol-btn" class="group relative w-full py-5 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.2)] hover:shadow-[0_0_70px_rgba(139,92,246,0.5)] transition-all transform hover:-translate-y-1 hover:scale-[1.02] active:scale-95 active:translate-y-0">
           <div class="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 group-hover:brightness-125 transition-all"></div>
           <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-30 transition-opacity"></div>
           <span class="relative flex items-center justify-center gap-3 text-white font-black text-sm uppercase tracking-[0.25em] drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
             <i class="fas fa-bolt-lightning group-hover:animate-bounce"></i> Run Neural Policy Simulation
           </span>
        </button>
      </div>
      <div class="lg:col-span-2 space-y-4">
        <div id="pol-results" class="space-y-4">
          <div class="et-card text-center py-12">
            <i class="fas fa-scale-balanced text-4xl text-violet-900 mb-3"></i>
            <p class="text-gray-500 text-sm">Select policies and click "Run Policy Simulation"</p>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function togglePolicy(id) {
  const card = document.getElementById('pc-' + id);
  const check = document.getElementById('pc-check-' + id);
  if (selectedPolicies.has(id)) {
    selectedPolicies.delete(id);
    card.classList.remove('selected');
    check.innerHTML = '';
  } else {
    selectedPolicies.add(id);
    card.classList.add('selected');
    check.innerHTML = '<i class="fas fa-check text-[8px] text-violet-300"></i>';
  }
}

async function runPolicySim() {
  if (selectedPolicies.size === 0) { toast('Select at least one policy', 'warn'); return; }
  const btn = document.getElementById('pol-btn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Simulating...'; btn.disabled = true;
  const country = document.getElementById('pol-country').value;
  const r = await fetch('/policy_sim', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policies: [...selectedPolicies], country })
  });
  const d = await r.json();

  const delta = d.delta;
  const pl = { paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(17,24,39,0.4)', font: { color: '#9ca3af', size: 10 }, margin: { l: 45, r: 15, t: 10, b: 40 } };

  document.getElementById('pol-results').innerHTML = `
    <!-- Score comparison -->
    <div class="grid grid-cols-3 gap-3">
      <div class="et-card text-center">
        <div class="text-[10px] text-gray-400 mb-1">Current Score</div>
        <div class="text-3xl font-black text-gray-300">${d.baseCountry.score}</div>
        <div class="text-[10px] text-gray-500">${d.baseCountry.name}</div>
      </div>
      <div class="et-card text-center border-violet-700 bg-violet-950/20">
        <div class="text-[10px] text-violet-400 mb-1">Score Gain</div>
        <div class="text-3xl font-black text-violet-300">+${delta.score}</div>
        <div class="text-[10px] text-gray-500">${selectedPolicies.size} policies applied</div>
      </div>
      <div class="et-card text-center">
        <div class="text-[10px] text-cyan-400 mb-1">Projected Score</div>
        <div class="text-3xl font-black text-cyan-300">${d.projected.score}</div>
        <div class="text-[10px] text-gray-500">Grade ${scoreGrade(d.projected.score)}</div>
      </div>
    </div>
    <!-- Trajectory -->
    <div class="et-card">
      <h3 class="et-card-title mb-2"><i class="fas fa-chart-line text-violet-400"></i> Policy Impact Trajectory</h3>
      <div id="pol-chart" style="height:220px"></div>
    </div>
    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      ${[
      { l: 'Total Investment', v: '$' + d.totalCost + 'B', c: 'yellow', i: 'fa-dollar-sign' },
      { l: 'Jobs Created', v: (d.totalJobs / 1000).toFixed(0) + 'K', c: 'emerald', i: 'fa-users' },
      { l: 'CO₂ Change', v: delta.co2 + 't', c: delta.co2 < 0 ? 'emerald' : 'red', i: 'fa-cloud' },
      { l: 'Renewable Gain', v: '+' + delta.renewable + '%', c: 'cyan', i: 'fa-solar-panel' },
    ].map(k => `<div class="et-card text-center">
        <i class="fas ${k.i} text-${k.c}-400 mb-1"></i>
        <div class="text-xl font-black text-${k.c}-300">${k.v}</div>
        <div class="text-[9px] text-gray-400">${k.l}</div>
      </div>`).join('')}
    </div>
    <!-- Large Tactical Intervention Inventory -->
    <div class="et-card border-violet-800/20 bg-void-950/40">
      <div class="flex items-center justify-between mb-6">
         <h3 class="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
            <i class="fas fa-shield-halved text-violet-500 animate-pulse"></i> Active Intervention Inventory
         </h3>
         <span class="text-[9px] font-black text-violet-500 border border-violet-800/30 px-3 py-1 rounded-full bg-violet-950/50">SYSTEM_NOMINAL_100</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${d.applied.map(id => { 
          const p = POLICIES.find(x => x.id === id); 
          return p ? `
          <div class="p-5 bg-void-900 border border-violet-800/40 rounded-2xl hover:bg-void-800 transition-all group relative overflow-hidden">
            <div class="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
               <span class="text-3xl">${p.icon}</span>
            </div>
            <div class="flex flex-col h-full">
              <div class="flex items-center gap-3 mb-4">
                 <div class="w-10 h-10 rounded-xl bg-violet-900/30 border border-violet-700/50 flex items-center justify-center text-lg">${p.icon}</div>
                 <div>
                    <div class="text-xs font-black text-white uppercase tracking-tight">${p.label}</div>
                    <div class="text-[9px] text-violet-500 font-black uppercase tracking-widest">Active Node</div>
                 </div>
              </div>
              <div class="mt-auto flex items-center justify-between pt-4 border-t border-void-800">
                 <div class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span class="text-[9px] text-gray-500 font-bold uppercase">Optimal</span>
                 </div>
                 <div class="text-[10px] text-gray-200 font-mono font-bold tracking-tighter">SIG_STRENGTH: 0.99</div>
              </div>
            </div>
          </div>` : '' 
        }).join('')}
      </div>
    </div>`;

  Plotly.newPlot('pol-chart', [
    { 
      type: 'scatter', mode: 'lines', name: 'Baseline Trajectory', x: d.years, 
      y: d.years.map(() => d.baseCountry.score), 
      line: { color: 'rgba(107,114,128,0.3)', width: 3, dash: 'dot', shape: 'spline' } 
    },
    { 
      type: 'scatter', mode: 'lines', name: 'Neural Pulse Range', x: d.years, y: d.trajectory.map(s => s + 2), 
      line: { width: 0 }, fill: 'tozeroy', fillcolor: 'rgba(139,92,246,0.02)', showlegend: false 
    },
    { 
      type: 'scatter', mode: 'lines+markers', name: 'Optimized Path', x: d.years, y: d.trajectory, 
      line: { 
        color: '#a78bfa', 
        width: 6, 
        shape: 'spline'
      }, 
      marker: { 
        size: 10, 
        color: '#fff',
        line: { color: '#8b5cf6', width: 3 }
      }, 
      fill: 'tozeroy', 
      fillcolor: 'rgba(139,92,246,0.08)' 
    },
  ], {
    ...pl, 
    xaxis: { color: '#64748b', gridcolor: 'rgba(255,255,255,0.03)', zeroline: false }, 
    yaxis: { color: '#64748b', gridcolor: 'rgba(255,255,255,0.03)', range: [0, 110], zeroline: false },
    legend: { x: 0.5, y: -0.3, xanchor: 'center', orientation: 'h', bgcolor: 'transparent', font: { color: '#94a3b8', size: 12, weight: '900' } }
  }, { responsive: true, displayModeBar: false });

  btn.innerHTML = '<i class="fas fa-arrows-rotate"></i> Run Neural Policy Simulation'; btn.disabled = false;
  toast(`Policy impact: +${delta.score} score, $${d.totalCost}B investment, ROI: ${d.roi}x`, 'success');
}

// ════════════════════════════════════════════════════════════════════════════
// LIVE MARKETS TAB — Carbon credits, energy prices, real-time charts
// ════════════════════════════════════════════════════════════════════════════
function marketHTML() {
  return `
  <div class="space-y-5">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h2 class="text-xl font-black text-emerald-300 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          ${t('marketTab')} — Live Carbon & Energy Markets
        </h2>
        <p class="text-xs text-gray-500 mt-0.5">EU ETS carbon credits · Renewable index · Fossil index · Energy prices · Atmospheric CO₂</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-gray-500" id="market-update-time">Loading...</span>
        <span class="text-[9px] px-2 py-0.5 bg-emerald-900/40 text-emerald-400 rounded-full border border-emerald-800/50">
          <i class="fas fa-signal mr-0.5"></i>Live feed
        </span>
      </div>
    </div>
    <!-- Primary market cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="et-card border-emerald-900/50">
        <div class="flex items-center gap-2 mb-2"><i class="fas fa-certificate text-emerald-400 text-sm"></i><span class="text-[10px] text-gray-400">EU ETS Carbon Credit</span></div>
        <div class="text-3xl font-black text-emerald-300" id="mkt-cc-price">—</div>
        <div class="text-[10px] text-gray-400">EUR per tonne CO₂</div>
        <div class="flex items-center gap-1 mt-1" id="mkt-cc-change-el">
          <span class="text-[10px] text-emerald-400">Live</span>
        </div>
      </div>
      <div class="et-card border-cyan-900/50">
        <div class="flex items-center gap-2 mb-2"><i class="fas fa-solar-panel text-cyan-400 text-sm"></i><span class="text-[10px] text-gray-400">Renewable Index</span></div>
        <div class="text-3xl font-black text-cyan-300" id="mkt-ri-price">—</div>
        <div class="text-[10px] text-gray-400">Index points</div>
        <div class="flex items-center gap-1 mt-1" id="mkt-ri-change-el">
          <span class="text-[10px] text-cyan-400">Live</span>
        </div>
      </div>
      <div class="et-card border-red-900/50">
        <div class="flex items-center gap-2 mb-2"><i class="fas fa-industry text-red-400 text-sm"></i><span class="text-[10px] text-gray-400">Fossil Index</span></div>
        <div class="text-3xl font-black text-red-300" id="mkt-fi-price">—</div>
        <div class="text-[10px] text-gray-400">Index points</div>
        <div class="flex items-center gap-1 mt-1" id="mkt-fi-change-el">
          <span class="text-[10px] text-red-400">Live</span>
        </div>
      </div>
      <div class="et-card border-yellow-900/50">
        <div class="flex items-center gap-2 mb-2"><i class="fas fa-smog text-yellow-400 text-sm"></i><span class="text-[10px] text-gray-400">Atmospheric CO₂</span></div>
        <div class="text-3xl font-black text-yellow-300" id="mkt-co2-price">—</div>
        <div class="text-[10px] text-gray-400">Parts per million</div>
        <div class="flex items-center gap-1 mt-1"><span class="text-[10px] text-yellow-400">NOAA seasonal model</span></div>
      </div>
    </div>
    <!-- Live Intelligence Grid: Chart + Vertical Prices -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <!-- Left: Carbon Trajectory -->
      <div class="lg:col-span-8 et-card p-0 overflow-hidden group">
        <div class="p-6 border-b border-void-800/50 flex items-center justify-between">
           <h3 class="et-card-title m-0"><i class="fas fa-chart-line text-emerald-400"></i> Market Price Trajectory (Live)</h3>
           <div class="flex gap-2">
             <button onclick="setMarketChart('cc')" id="mkt-btn-cc" class="px-3 py-1 text-[10px] rounded-lg bg-emerald-800 text-emerald-300 border border-emerald-700 font-black">CARBON</button>
             <button onclick="setMarketChart('ri')" id="mkt-btn-ri" class="px-3 py-1 text-[10px] rounded-lg bg-gray-800 text-gray-400 border border-gray-700 font-black">RENEW.</button>
             <button onclick="setMarketChart('fi')" id="mkt-btn-fi" class="px-3 py-1 text-[10px] rounded-lg bg-gray-800 text-gray-400 border border-gray-700 font-black">FOSSIL</button>
             <button onclick="setMarketChart('co2')" id="mkt-btn-co2" class="px-3 py-1 text-[10px] rounded-lg bg-gray-800 text-gray-400 border border-gray-700 font-black">CO₂ PPM</button>
           </div>
        </div>
        <div id="mkt-chart" class="p-4" style="height:320px"></div>
      </div>
      <!-- Right: Vertical Energy Prices -->
      <div class="lg:col-span-4 et-card grad-border">
        <h3 class="et-card-title mb-5 flex items-center justify-between">
           <span class="flex items-center gap-2"><i class="fas fa-bolt text-yellow-400"></i> Live Price Feed</span>
           <span class="text-[9px] text-gray-600 font-mono tracking-widest">USD/MWH</span>
        </h3>
        <div class="space-y-3" id="mkt-energy-prices"></div>
      </div>
    </div>
    <!-- Market insights -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="et-card border-emerald-900/40">
        <h3 class="et-card-title mb-3 text-emerald-300"><i class="fas fa-arrow-trend-up"></i> Market Signals</h3>
        <div id="mkt-signals" class="space-y-2"></div>
      </div>
      <div class="et-card">
        <h3 class="et-card-title mb-3"><i class="fas fa-chart-bar text-violet-400"></i> Carbon vs Renewables Spread</h3>
        <div id="mkt-spread-chart" style="height:200px"></div>
      </div>
    </div>
  </div>`;
}

let marketChartField = 'cc';
let marketInterval = null;

function setMarketChart(field) {
  marketChartField = field;
  ['cc', 'ri', 'fi', 'co2'].forEach(f => {
    const btn = document.getElementById('mkt-btn-' + f);
    if (btn) btn.className = `px-2 py-0.5 text-[9px] rounded ${f === field ? 'bg-emerald-800 text-emerald-300 border border-emerald-700' : 'bg-gray-800 text-gray-400 border border-gray-700'}`;
  });
  if (ST.marketData) renderMarketChart(ST.marketData);
}

function renderMarketChart(d) {
  const h = d.history || [];
  const ts = h.map(x => new Date(x.ts).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }));
  const fieldMap = { cc: { key: 'cc', color: '#10b981', label: 'Carbon €/t' }, ri: { key: 'ri', color: '#22d3ee', label: 'Renew. Idx' }, fi: { key: 'fi', color: '#ef4444', label: 'Fossil Idx' }, co2: { key: 'co2', color: '#f59e0b', label: 'CO₂ ppm' } };
  const f = fieldMap[marketChartField];
  Plotly.newPlot('mkt-chart', [{
    type: 'scatter', mode: 'lines', name: f.label,
    x: ts, y: h.map(x => x[f.key]),
    line: { color: f.color, width: 2 }, fill: 'tozeroy', fillcolor: f.color + '11',
  }], {
    paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(17,24,39,0.4)',
    font: { color: '#9ca3af', size: 10 }, margin: { l: 55, r: 10, t: 8, b: 40 },
    xaxis: { color: '#4b5563', gridcolor: '#1f2937', tickangle: -45 },
    yaxis: { color: '#4b5563', gridcolor: '#1f2937', title: f.label },
  }, { responsive: true, displayModeBar: false });
}

async function loadMarket() {
  await fetchAndUpdateMarket();
  marketInterval = setInterval(fetchAndUpdateMarket, 5000);
  // Clear when tab changes
  const origSwitch = window.switchTab;
  window._mktCleanup = () => { if (marketInterval) { clearInterval(marketInterval); marketInterval = null; } };
}

async function fetchAndUpdateMarket() {
  try {
    const r = await fetch('/market_data');
    const d = await r.json();
    ST.marketData = d;
    const c = d.current;
    const timeEl = document.getElementById('market-update-time');
    if (timeEl) timeEl.textContent = 'Updated: ' + new Date().toLocaleTimeString();

    // Update primary cards
    const formatChange = (v) => `<span class="${v >= 0 ? 'text-emerald-400' : 'text-red-400'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v)}%</span>`;
    const setCard = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setCard('mkt-cc-price', '€' + c.carbonCreditEUR);
    setCard('mkt-ri-price', c.renewableIndex);
    setCard('mkt-fi-price', c.fossilIndex);
    setCard('mkt-co2-price', c.globalCO2ppm);
    const ccChgEl = document.getElementById('mkt-cc-change-el');
    if (ccChgEl) ccChgEl.innerHTML = formatChange(c.carbonCreditChange) + '<span class="text-[10px] text-gray-500 ml-1">vs 1h ago</span>';

    // Energy prices
    const epEl = document.getElementById('mkt-energy-prices');
    if (epEl) {
      const ep = d.energyPrices;
      epEl.innerHTML = [
        { name: 'Solar', val: ep.solar, icon: 'fa-sun', color: 'yellow' },
        { name: 'Wind', val: ep.wind, icon: 'fa-wind', color: 'blue' },
        { name: 'Natural Gas', val: ep.gas, icon: 'fa-fire', color: 'orange' },
        { name: 'Coal', val: ep.coal, icon: 'fa-smog', color: 'gray' },
        { name: 'Nuclear', val: ep.nuclear, icon: 'fa-atom', color: 'violet' },
      ].map(e => `
        <div class="bg-void-950 border border-void-800 rounded-xl p-3 px-4 flex items-center justify-between hover:border-${e.color}-500/40 transition-all group">
          <div class="flex items-center gap-3">
             <div class="w-8 h-8 rounded-lg bg-${e.color}-900/20 border border-${e.color}-800/30 flex items-center justify-center">
                <i class="fas ${e.icon} text-${e.color}-400 text-xs"></i>
             </div>
             <span class="text-[11px] font-black text-gray-200 uppercase tracking-tight">${e.name}</span>
          </div>
          <div class="text-right">
             <div class="text-base font-black text-${e.color}-300 font-mono">$${e.val}</div>
             <div class="text-[8px] text-gray-600 font-black uppercase tracking-widest -mt-1">Real-time</div>
          </div>
        </div>`).join('');
    }

    // Market signals
    const sigEl = document.getElementById('mkt-signals');
    if (sigEl) {
      const signals = [
        c.carbonCreditEUR > 70 ? { msg: `Carbon at €${c.carbonCreditEUR}/t — strong decarbonization incentive`, color: 'emerald', icon: 'fa-arrow-up' } : { msg: `Carbon at €${c.carbonCreditEUR}/t — below optimal incentive threshold`, color: 'yellow', icon: 'fa-arrow-down' },
        c.renewableIndex > 140 ? { msg: `Renewable index ${c.renewableIndex} — above baseline, clean energy scaling`, color: 'emerald', icon: 'fa-solar-panel' } : { msg: `Renewable index ${c.renewableIndex} — near baseline`, color: 'gray', icon: 'fa-minus' },
        c.fossilIndex < 100 ? { msg: `Fossil index ${c.fossilIndex} — declining, coal/gas phase-out accelerating`, color: 'emerald', icon: 'fa-leaf' } : { msg: `Fossil index ${c.fossilIndex} — elevated, fossil dependency persists`, color: 'red', icon: 'fa-triangle-exclamation' },
        c.globalCO2ppm > 422 ? { msg: `CO₂ at ${c.globalCO2ppm} ppm — above 2024 baseline of 421.08`, color: 'red', icon: 'fa-smog' } : { msg: `CO₂ at ${c.globalCO2ppm} ppm`, color: 'yellow', icon: 'fa-smog' },
      ];
      sigEl.innerHTML = signals.map(s => `
        <div class="flex items-center justify-between p-3.5 bg-void-950/60 border border-void-800/50 rounded-2xl group hover:bg-void-900 shadow-inner">
           <div class="flex items-start gap-4 flex-1">
              <div class="w-8 h-8 rounded-full bg-${s.color}-900/30 border border-${s.color}-800/40 flex items-center justify-center flex-none mt-0.5">
                 <i class="fas ${s.icon} text-${s.color}-400 text-xs shadow-glow"></i>
              </div>
              <span class="text-[11px] font-bold text-gray-300 leading-snug">${s.msg}</span>
           </div>
           <div class="w-1.5 h-1.5 rounded-full bg-${s.color}-500 animate-pulse ml-4 shadow-neon-${s.color}"></div>
        </div>`).join('');
    }

    // Render charts
    renderMarketChart(d);

    // Spread chart
    const h = d.history.slice(-30);
    const ts = h.map(x => new Date(x.ts).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }));
    Plotly.newPlot('mkt-spread-chart', [
      { 
        type: 'scatter', mode: 'lines', name: 'Carbon Trajectory', x: ts, y: h.map(x => x.cc), 
        line: { color: '#10b981', width: 4.5, shape: 'spline' }, 
        fill: 'tozeroy', fillcolor: 'rgba(16,185,129,0.08)' 
      },
      { 
        type: 'scatter', mode: 'lines', name: 'Renewable Flow', x: ts, y: h.map(x => x.ri), 
        line: { color: '#22d3ee', width: 4.5, shape: 'spline' }, 
        fill: 'tozeroy', fillcolor: 'rgba(34,211,238,0.08)' 
      },
    ], {
      paper_bgcolor: 'transparent', plot_bgcolor: 'rgba(17,24,39,0.2)', font: { color: '#9ca3af', size: 10, weight: 'bold' }, 
      margin: { l: 45, r: 15, t: 15, b: 40 },
      xaxis: { color: '#4b5563', gridcolor: 'rgba(255,255,255,0.03)', zeroline: false, tickangle: -45 }, 
      yaxis: { color: '#4b5563', gridcolor: 'rgba(255,255,255,0.03)', zeroline: false },
      legend: { x: 0.5, y: 1.25, xanchor: 'center', orientation: 'h', bgcolor: 'transparent', font: { color: '#e2e8f0', size: 11 } }
    }, { responsive: true, displayModeBar: false });
  } catch (e) { console.error('Market load error:', e); }
}

// ════════════════════════════════════════════════════════════════════════════
// SUSTAINABILITY NEWS FEED
// ════════════════════════════════════════════════════════════════════════════
function newsHTML() {
  return `
  <div class="space-y-5">
    <div class="flex flex-wrap items-center gap-3">
      <div>
        <h2 class="text-xl font-black text-cyan-300 flex items-center gap-2"><i class="fas fa-newspaper text-blue-300"></i> Sustainability News Feed</h2>
        <p class="text-xs text-gray-500 mt-0.5">Curated global sustainability intelligence & policy updates</p>
      </div>
      <div class="ml-auto flex gap-2 flex-wrap">
        <button onclick="filterNews('all')" id="nf-all" class="news-filter px-2.5 py-1 text-[10px] rounded-lg font-bold bg-cyan-700 text-white transition-all">All</button>
        ${['Policy', 'Climate', 'Energy', 'Transport', 'Oceans', 'Forests', 'Water', 'Technology', 'Achievement', 'Economics'].map(c =>
    `<button onclick="filterNews('${c}')" id="nf-${c}" class="news-filter px-2.5 py-1 text-[10px] rounded-lg font-bold bg-gray-800 text-gray-400 hover:bg-gray-700 transition-all">${c}</button>`
  ).join('')}
      </div>
    </div>
    <div class="flex gap-2 items-center">
      <button onclick="filterNews('all','positive')" class="px-2.5 py-1 text-[10px] rounded-lg bg-emerald-900/40 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-800/40 transition-all">🟢 Positive</button>
      <button onclick="filterNews('all','negative')" class="px-2.5 py-1 text-[10px] rounded-lg bg-red-900/40 text-red-300 border border-red-800/50 hover:bg-red-800/40 transition-all">🔴 Concerning</button>
    </div>
    <div id="news-grid" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="flex justify-center py-12 col-span-2"><div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>
    </div>
  </div>`;
}

let _allNews = [];
async function loadNews() {
  const r = await fetch('/news_feed'); _allNews = await r.json();
  renderNews(_allNews);
}

function filterNews(category, sentiment = null) {
  document.querySelectorAll('.news-filter').forEach(b => { b.className = b.className.replace('bg-cyan-700 text-white', 'bg-gray-800 text-gray-400'); });
  const btn = document.getElementById('nf-' + (category === 'all' ? 'all' : category));
  if (btn) btn.className = btn.className.replace('bg-gray-800 text-gray-400', 'bg-cyan-700 text-white');
  let filtered = _allNews;
  if (category !== 'all') filtered = filtered.filter(a => a.category === category);
  if (sentiment) filtered = filtered.filter(a => a.sentiment === sentiment);
  renderNews(filtered);
}

function renderNews(articles) {
  const el = document.getElementById('news-grid'); if (!el) return;
  if (!articles.length) { el.innerHTML = '<div class="col-span-3 text-center py-12 text-gray-600">No articles found</div>'; return; }
  el.innerHTML = articles.map(a => {
    const sCol = a.sentiment === 'positive' ? 'emerald' : 'red';
    return `
    <div class="et-card p-0 overflow-hidden flex flex-col group hover:border-${sCol}-500/50 transition-all duration-300">
      <!-- Mood Banner -->
      <div class="h-2 bg-gradient-to-r from-${sCol}-600 to-void-900 opacity-80"></div>
      
      <div class="p-6 flex flex-col flex-1">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-[10px] px-3 py-1 rounded-lg font-black tracking-widest uppercase border border-${sCol}-800/40 bg-${sCol}-950/40 text-${sCol}-400">
            ${a.sentiment === 'positive' ? 'SIGNAL_POSITIVE' : 'SIGNAL_CONCERNING'}
          </span>
          <span class="text-[10px] px-2.5 py-1 bg-void-950 border border-void-800 rounded-lg text-gray-400 font-bold uppercase tracking-tight">${a.category}</span>
          ${a.freshness ? `<span class="text-[9px] px-2 py-0.5 bg-cyan-900 shadow-neon-blue text-cyan-200 rounded-lg font-black animate-pulse">NEURAL_NEW</span>` : ''}
          <span class="ml-auto text-[10px] text-gray-600 font-black uppercase tracking-widest">${a.region}</span>
        </div>

        <h3 class="text-xl font-black text-white mb-3 leading-tight group-hover:text-cyan-300 transition-colors">${a.title}</h3>
        <p class="text-sm text-gray-400 flex-1 leading-relaxed font-medium mb-4">${a.summary}</p>
        
        ${a.liveData ? `
          <div class="mb-5 p-3.5 bg-void-950 rounded-xl border-l-4 border-emerald-500/50 text-xs text-gray-300 font-mono shadow-inner">
            <div class="flex justify-between items-center mb-1">
               <span class="text-[9px] text-emerald-500 font-black tracking-[0.2em]">LIVE_TELEMETRY</span>
               <i class="fas fa-signal text-[10px] text-emerald-900"></i>
            </div>
            CO₂: <span class="text-emerald-400 font-black">${a.liveData.co2ppm} ppm</span> · 
            Carbon: <span class="text-emerald-400 font-black">€${a.liveData.carbonPrice}/t</span>
          </div>` : ''}

        <div class="pt-4 border-t border-void-800 flex items-center justify-between">
          <div class="flex flex-wrap gap-2">
            ${a.tags.slice(0, 4).map(tag => `<span class="text-[9px] px-2 py-0.5 bg-void-950 text-gray-500 rounded border border-void-800/50 font-bold uppercase tracking-tighter hover:border-cyan-500/30 transition-colors">#${tag}</span>`).join('')}
          </div>
          <div class="text-right">
            <div class="text-[10px] text-cyan-400 font-black uppercase tracking-widest">${a.source}</div>
            <div class="text-[9px] text-gray-600 font-bold">${a.date}</div>
          </div>
        </div>
      </div>
    </div>`}).join('');
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORT DATA
// ════════════════════════════════════════════════════════════════════════════
function exportData(fmt) {
  const a = document.createElement('a');
  a.href = `/export/${fmt}`;
  a.download = `ecotwin_data.${fmt}`;
  a.click();
  toast(`Downloading ${fmt.toUpperCase()} data...`, 'success');
}

// ════════════════════════════════════════════════════════════════════════════
// PEER COMPARE  (multi-country radar)
// ════════════════════════════════════════════════════════════════════════════
async function runPeerCompare(codes) {
  const r = await fetch('/peer_compare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codes }) });
  const d = await r.json();
  return d;
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadI18n(ST.lang);
  renderShell();
  // Pre-fetch world data
  fetch('/world_data').then(r => r.json()).then(d => { ST.worldData = d; ST.lastWorldUpdate = Date.now(); });
  // Pre-fetch market data for ticker
  fetch('/market_data').then(r => r.json()).then(d => ST.marketData = d);
});

// ════════════════════════════════════════════════════════════════════════════
// PLANET HEALTH SCORE — Multi-dimensional radial gauge + dimension breakdown
// ════════════════════════════════════════════════════════════════════════════
function healthHTML() {
  return `
<div class="space-y-5">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-xl font-black text-white flex items-center gap-2.5">
        <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-900/80 to-teal-900/80 border border-emerald-700/50 flex items-center justify-center">
          <i class="fas fa-heart-pulse text-emerald-400 text-sm"></i>
        </span>
        Planet Health Score
        <span class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700 text-emerald-300 font-semibold animate-pulse">● LIVE</span>
      </h1>
      <p class="text-[10px] text-gray-500 mt-0.5 ml-10">Composite multi-sphere index · Atmosphere, Biosphere, Hydrosphere, Cryosphere, Human Systems, Biodiversity</p>
    </div>
    <button onclick="loadPlanetHealth()" class="px-3 py-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700 text-emerald-300 text-xs font-semibold hover:bg-emerald-900/70 transition-all flex items-center gap-1.5">
      <i class="fas fa-rotate-right"></i> Resync
    </button>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
    <!-- Central Radial Gauge -->
    <div class="et-card grad-border flex flex-col items-center justify-center py-8" id="health-gauge-card">
      <div class="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-4">Composite Index</div>
      <div class="relative" style="width:220px;height:220px;">
        <svg viewBox="0 0 220 220" width="220" height="220">
          <!-- Background rings -->
          <circle cx="110" cy="110" r="90" fill="none" stroke="rgba(34,211,238,0.06)" stroke-width="18"/>
          <circle cx="110" cy="110" r="70" fill="none" stroke="rgba(16,185,129,0.06)" stroke-width="12"/>
          <circle cx="110" cy="110" r="52" fill="none" stroke="rgba(139,92,246,0.06)" stroke-width="8"/>
          <!-- Main ring track -->
          <circle cx="110" cy="110" r="90" fill="none" stroke="rgba(34,211,238,0.08)" stroke-width="18" class="health-ring-track"/>
          <!-- Main ring fill — animated via JS -->
          <circle id="health-main-ring" cx="110" cy="110" r="90" fill="none"
                  stroke="url(#healthGrad)" stroke-width="18"
                  stroke-dasharray="565" stroke-dashoffset="565"
                  stroke-linecap="round" transform="rotate(-90 110 110)" class="health-ring-fill"/>
          <defs>
            <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#ef4444"/>
              <stop offset="50%" stop-color="#f59e0b"/>
              <stop offset="100%" stop-color="#10b981"/>
            </linearGradient>
          </defs>
          <!-- Center score -->
          <text id="health-score-num" x="110" y="100" text-anchor="middle" font-size="38" font-weight="900" fill="#e2e8f0" font-family="monospace">—</text>
          <text id="health-grade-text" x="110" y="126" text-anchor="middle" font-size="13" font-weight="700" fill="#94a3b8">/100</text>
          <text id="health-label-text" x="110" y="148" text-anchor="middle" font-size="11" font-weight="600" fill="#64748b">Loading…</text>
        </svg>
      </div>
      <div class="mt-4 flex items-center gap-3 text-[10px]">
        <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-red-500"></span><span class="text-gray-500">Critical</span></div>
        <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span><span class="text-gray-500">Stressed</span></div>
        <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-gray-500">Stable</span></div>
      </div>
      <div class="mt-3 text-[9px] text-gray-600" id="health-updated">—</div>
    </div>

    <!-- Dimension Bars -->
    <div class="et-card lg:col-span-2">
      <h3 class="et-card-title mb-4"><i class="fas fa-layer-group text-teal-400"></i> Earth System Dimensions</h3>
      <div id="health-dims" class="space-y-3">
        ${[1, 2, 3, 4, 5, 6].map(() => `<div class="animate-pulse h-10 bg-gray-800/40 rounded-xl"></div>`).join('')}
      </div>
    </div>
  </div>

  <!-- 24-hour trend chart -->
  <div class="et-card">
    <div class="flex items-center justify-between mb-3">
      <h3 class="et-card-title"><i class="fas fa-chart-area text-teal-400"></i> 24-Hour Health Trend</h3>
      <span class="text-[9px] text-gray-500 mono" id="health-change-badge">Loading…</span>
    </div>
    <canvas id="health-trend-canvas" height="80"></canvas>
  </div>

  <!-- Dimension Detail Grid -->
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" id="health-detail-grid">
    ${[1, 2, 3, 4, 5, 6].map(() => `<div class="animate-pulse h-24 bg-gray-800/40 rounded-xl"></div>`).join('')}
  </div>
</div>`;
}

async function initPlanetHealth() {
  await loadPlanetHealth();
  ST.healthInterval = setInterval(loadPlanetHealth, 15000);
}

async function loadPlanetHealth() {
  try {
    const r = await fetch('/planet_health');
    const d = await r.json();
    renderPlanetHealth(d);
  } catch (e) { console.error('Planet health:', e); }
}

function renderPlanetHealth(d) {
  // Main gauge
  const pct = d.composite / 100;
  const circumference = 2 * Math.PI * 90;
  const dashOffset = circumference * (1 - pct);
  const ring = document.getElementById('health-main-ring');
  const scoreEl = document.getElementById('health-score-num');
  const labelEl = document.getElementById('health-label-text');
  const gradeEl = document.getElementById('health-grade-text');
  const updEl = document.getElementById('health-updated');
  const badgeEl = document.getElementById('health-change-badge');

  if (ring) ring.style.strokeDashoffset = dashOffset;
  if (scoreEl) scoreEl.textContent = d.composite.toFixed(1);
  if (labelEl) {
    labelEl.textContent = d.label;
    const c = d.composite >= 70 ? '#10b981' : d.composite >= 50 ? '#f59e0b' : '#ef4444';
    labelEl.setAttribute('fill', c);
    if (scoreEl) scoreEl.setAttribute('fill', c);
  }
  if (gradeEl) gradeEl.textContent = `Grade: ${d.grade}`;
  if (updEl) updEl.textContent = `Updated: ${new Date(d.lastUpdated).toLocaleTimeString()}`;
  if (badgeEl) {
    const sign = d.change24h >= 0 ? '+' : '';
    badgeEl.textContent = `24h change: ${sign}${d.change24h.toFixed(3)} pts`;
    badgeEl.className = `text-[9px] mono ${d.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
  }

  // Dimension bars
  const dimsEl = document.getElementById('health-dims');
  if (dimsEl) {
    dimsEl.innerHTML = d.dimensions.map(dim => {
      const pct = dim.score;
      const color = pct >= 70 ? 'emerald' : pct >= 50 ? 'amber' : 'red';
      const hexColor = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
      return `
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-md bg-${color}-900/40 border border-${color}-800/40 flex items-center justify-center">
              <i class="fas fa-${dim.icon} text-${color}-400 text-[9px]"></i>
            </div>
            <span class="text-xs font-semibold text-gray-300">${dim.name}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[9px] text-gray-500">${(dim.weight * 100).toFixed(0)}% weight</span>
            <span class="text-xs font-black mono text-${color}-300">${dim.score}</span>
          </div>
        </div>
        <div class="metric-bar">
          <div class="metric-bar-fill" style="width:${pct}%; background: linear-gradient(90deg, ${hexColor}88, ${hexColor});"></div>
        </div>
      </div>`;
    }).join('');
  }

  // Detail grid
  const detailEl = document.getElementById('health-detail-grid');
  if (detailEl) {
    detailEl.innerHTML = d.dimensions.map(dim => {
      const color = dim.score >= 70 ? 'emerald' : dim.score >= 50 ? 'amber' : 'red';
      return `
      <div class="et-card text-center">
        <i class="fas fa-${dim.icon} text-${color}-400 text-lg mb-2 block"></i>
        <div class="text-xl font-black text-${color}-300 mono">${dim.score}</div>
        <div class="text-[9px] text-gray-400 mt-0.5 font-semibold">${dim.name}</div>
        <div class="text-[8px] text-gray-600 mt-1">${(dim.trend > 0 ? '▲ ' : '▼ ')}${Math.abs(dim.trend).toFixed(2)}/yr</div>
      </div>`;
    }).join('');
  }

  // Trend chart
  const canvas = document.getElementById('health-trend-canvas');
  if (canvas && window.Chart) {
    if (canvas._hchart) canvas._hchart.destroy();
    canvas._hchart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: d.history.map(h => `${h.hour}h`),
        datasets: [{
          label: 'Planet Health Score',
          data: d.history.map(h => h.score),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.06)',
          tension: 0.5, fill: true, pointRadius: 0, borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#4b5563', font: { size: 8 } }, grid: { color: '#111827' } },
          y: {
            ticks: { color: '#4b5563', font: { size: 8 } }, grid: { color: '#111827' },
            min: Math.floor(d.composite - 5), max: Math.ceil(d.composite + 5),
          }
        }
      }
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// AI THREAT FORECAST — 18-month probability timeline + severity heatmap
// ════════════════════════════════════════════════════════════════════════════
function threatHTML() {
  return `
<div class="space-y-5">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-xl font-black text-white flex items-center gap-2.5">
        <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-red-900/80 to-orange-900/80 border border-red-700/50 flex items-center justify-center">
          <i class="fas fa-radiation text-red-400 text-sm"></i>
        </span>
        AI Threat Forecast
        <span class="text-[9px] px-2 py-0.5 rounded-full bg-red-900/60 border border-red-700 text-red-300 font-semibold animate-pulse">● LIVE ML</span>
      </h1>
      <p class="text-[10px] text-gray-500 mt-0.5 ml-10">EcoTwin-ThreatNet-v3 · 18-month environmental risk probability timeline · 84.7% accuracy</p>
    </div>
    <button onclick="loadThreat()" class="px-3 py-1.5 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-xs font-semibold hover:bg-red-900/70 transition-all flex items-center gap-1.5">
      <i class="fas fa-rotate-right"></i> Rerun Model
    </button>
  </div>

  <!-- Model Info Bar -->
  <div class="et-card flex flex-wrap items-center gap-4 py-3">
    <div class="flex items-center gap-2"><i class="fas fa-microchip text-violet-400 text-xs"></i><span class="text-[10px] text-gray-400">Model:</span><span class="text-[10px] text-violet-300 font-bold mono">EcoTwin-ThreatNet-v3</span></div>
    <div class="flex items-center gap-2"><i class="fas fa-bullseye text-emerald-400 text-xs"></i><span class="text-[10px] text-gray-400">Accuracy:</span><span class="text-[10px] text-emerald-300 font-bold mono">84.7%</span></div>
    <div class="flex items-center gap-2"><i class="fas fa-database text-cyan-400 text-xs"></i><span class="text-[10px] text-gray-400">Training:</span><span class="text-[10px] text-cyan-300 font-bold mono">1980–2025</span></div>
    <div class="flex items-center gap-2"><i class="fas fa-clock text-amber-400 text-xs"></i><span class="text-[10px] text-gray-400">Horizon:</span><span class="text-[10px] text-amber-300 font-bold mono">18 months</span></div>
    <div id="threat-risk-level" class="ml-auto px-3 py-1 rounded-full text-[10px] font-bold border">—</div>
  </div>

  <!-- Top Threats List + Timeline Heatmap -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <!-- Threat Cards -->
    <div class="space-y-2" id="threat-list">
      ${[1, 2, 3, 4, 5].map(() => `<div class="animate-pulse h-20 bg-gray-800/40 rounded-xl"></div>`).join('')}
    </div>
    <!-- Probability Chart -->
    <div class="et-card">
      <h3 class="et-card-title mb-3"><i class="fas fa-chart-bar text-red-400"></i> Threat Probability This Month</h3>
      <canvas id="threat-prob-chart" height="200"></canvas>
    </div>
  </div>

  <!-- 18-month heatmap -->
  <div class="et-card">
    <h3 class="et-card-title mb-4"><i class="fas fa-calendar-days text-orange-400"></i> 18-Month Risk Probability Heatmap</h3>
    <div class="overflow-x-auto">
      <div id="threat-heatmap" class="min-w-[700px]">
        <div class="animate-pulse h-48 bg-gray-800/40 rounded-xl"></div>
      </div>
    </div>
  </div>
</div>`;
}

async function initThreat() {
  await loadThreat();
  ST.threatInterval = setInterval(loadThreat, 20000);
}

async function loadThreat() {
  try {
    const r = await fetch('/threat_forecast');
    const d = await r.json();
    renderThreat(d);
  } catch (e) { console.error('Threat forecast:', e); }
}

function renderThreat(d) {
  // Risk level badge
  const lvlEl = document.getElementById('threat-risk-level');
  if (lvlEl) {
    const cls = d.overallRiskLevel === 'CRITICAL' ? 'bg-red-900/50 border-red-600 text-red-300' :
      d.overallRiskLevel === 'HIGH' ? 'bg-orange-900/50 border-orange-600 text-orange-300' :
        'bg-yellow-900/50 border-yellow-600 text-yellow-300';
    lvlEl.className = `ml-auto px-3 py-1 rounded-full text-[10px] font-bold border ${cls}`;
    lvlEl.innerHTML = `<i class="fas fa-triangle-exclamation mr-1"></i> ${d.overallRiskLevel} RISK`;
  }

  // Threat list
  const listEl = document.getElementById('threat-list');
  if (listEl) {
    listEl.innerHTML = d.threats.slice(0, 6).map((th, i) => {
      const prob = th.probability;
      const cls = prob > 0.75 ? 'threat-critical' : prob > 0.55 ? 'threat-high' : prob > 0.35 ? 'threat-medium' : 'threat-low';
      const trendIcon = th.trend === 'rising' ? 'fa-arrow-trend-up text-red-400' : 'fa-arrow-trend-down text-emerald-400';
      return `
      <div class="et-card timeline-node">
        <div class="flex items-start gap-3">
          <div class="w-7 h-7 rounded-full flex items-center justify-center flex-none text-[9px] font-black
                      ${prob > 0.75 ? 'bg-red-900/70 border border-red-700 text-red-300' :
          prob > 0.55 ? 'bg-orange-900/70 border border-orange-700 text-orange-300' :
            'bg-amber-900/70 border border-amber-700 text-amber-300'}">${i + 1}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs font-bold text-gray-200">
                ${th.name}
                ${th.source === 'NASA EONET' ? `<span class="ml-2 text-[8px] uppercase tracking-wider text-emerald-400 bg-emerald-900/30 px-1 py-0.5 rounded border border-emerald-800/50"><i class="fas fa-tower-broadcast mr-1"></i>NASA EONET</span>` : ''}
              </span>
              <span class="text-xs font-black mono ${prob > 0.75 ? 'text-red-300' : prob > 0.55 ? 'text-orange-300' : 'text-amber-300'}">${(prob * 100).toFixed(0)}%</span>
            </div>
            <div class="metric-bar mb-1.5">
              <div class="metric-bar-fill" style="width:${prob * 100}%; background: ${prob > 0.75 ? '#ef4444' : prob > 0.55 ? '#f97316' : '#f59e0b'};"></div>
            </div>
            <div class="flex items-center gap-3 text-[9px] text-gray-500">
              <span><i class="fas fa-tag mr-1 opacity-60"></i>${th.category}</span>
              <span><i class="fas ${trendIcon} mr-1"></i>${th.trend}</span>
              <span><i class="fas fa-calendar-check mr-1 opacity-60"></i>Peak: month ${th.peakMonth}</span>
              <span class="ml-auto text-red-400 font-semibold">~$${th.estimatedImpactBn}B impact</span>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // Probability bar chart
  const canvas = document.getElementById('threat-prob-chart');
  if (canvas && window.Chart) {
    if (canvas._tchart) canvas._tchart.destroy();
    const colors = d.threats.map(th => th.probability > 0.75 ? '#ef4444' : th.probability > 0.55 ? '#f97316' : '#f59e0b');
    canvas._tchart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: d.threats.map(th => th.name.slice(0, 16)),
        datasets: [{
          label: 'Probability',
          data: d.threats.map(th => (th.probability * 100).toFixed(1)),
          backgroundColor: colors.map(c => c + '80'),
          borderColor: colors,
          borderWidth: 1, borderRadius: 4,
        }]
      },
      options: {
        indexAxis: 'y', responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { min: 0, max: 100, ticks: { color: '#6b7280', font: { size: 9 }, callback: v => v + '%' }, grid: { color: '#111827' } },
          y: { ticks: { color: '#9ca3af', font: { size: 9 } }, grid: { display: false } }
        }
      }
    });
  }

  // 18-month heatmap
  const hmEl = document.getElementById('threat-heatmap');
  if (hmEl) {
    const threats = d.threats.slice(0, 6);
    const months = d.timeline;
    hmEl.innerHTML = `
      <div class="text-[9px] text-gray-500 mb-3">Probability % per threat per month (darker = higher risk)</div>
      <!-- Month header -->
      <div class="flex gap-0" style="margin-left:120px">
        ${months.map(m => `<div class="flex-1 text-center text-[8px] text-gray-600 font-medium min-w-[32px]">${m.label}</div>`).join('')}
      </div>
      <!-- Rows -->
      ${threats.map(th => {
      const row = months.map(m => {
        const prob = m.threats.find(t => t.id === th.id)?.probability ?? 0;
        const alpha = 0.1 + prob * 0.85;
        const bg = prob > 0.75 ? `rgba(239,68,68,${alpha})` : prob > 0.55 ? `rgba(249,115,22,${alpha})` : `rgba(245,158,11,${alpha})`;
        return `<div class="flex-1 min-w-[32px] h-8 flex items-center justify-center text-[8px] font-bold transition-all hover:scale-105 cursor-default rounded-sm"
                       style="background:${bg}; color:${prob > 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)'}"
                       title="${th.name} · ${m.label}: ${(prob * 100).toFixed(0)}%">${(prob * 100).toFixed(0)}</div>`;
      }).join('');
      return `
        <div class="flex items-center gap-0 mt-0.5">
          <div class="w-[120px] flex-none text-[9px] text-gray-400 pr-2 truncate font-medium">${th.name}</div>
          <div class="flex flex-1 gap-0">${row}</div>
        </div>`;
    }).join('')}`;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CO2 EMISSION BAR RACE — animated year slider + live rankings
// ════════════════════════════════════════════════════════════════════════════
const RACE_STATE = { year: 1990, playing: false, timer: null };

function raceHTML() {
  return `
<div class="space-y-5">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-xl font-black text-white flex items-center gap-2.5">
        <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-900/80 to-red-900/80 border border-orange-700/50 flex items-center justify-center">
          <i class="fas fa-ranking-star text-orange-400 text-sm"></i>
        </span>
        CO₂ Emission Race
        <span class="text-[9px] px-2 py-0.5 rounded-full bg-orange-900/60 border border-orange-700 text-orange-300 font-semibold">ANIMATED</span>
      </h1>
      <p class="text-[10px] text-gray-500 mt-0.5 ml-10">Live animated ranking of CO₂ per capita (tonnes) · 1990–2024 · 16 major economies</p>
    </div>
  </div>

  <!-- Controls -->
  <div class="et-card flex flex-wrap items-center gap-4">
    <button id="race-play-btn" onclick="toggleRacePlay()" class="et-btn-primary flex items-center gap-2 min-w-[100px] justify-center">
      <i class="fas fa-play" id="race-play-icon"></i>
      <span id="race-play-label">Play</span>
    </button>
    <button onclick="resetRace()" class="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-xs font-semibold hover:bg-gray-700 transition-all flex items-center gap-1.5">
      <i class="fas fa-rotate-left"></i> Reset
    </button>
    <div class="flex-1 flex items-center gap-3 min-w-[200px]">
      <span class="text-[9px] text-gray-500 mono">1990</span>
      <input type="range" id="race-year-slider" min="1990" max="2024" value="1990"
             oninput="onRaceSlider(this.value)"
             class="flex-1" />
      <span class="text-[9px] text-gray-500 mono">2024</span>
    </div>
    <div class="text-2xl font-black mono gradient-text-fire" id="race-year-display">1990</div>
  </div>

  <!-- Bar Race -->
  <div class="et-card" style="min-height:500px;">
    <div class="flex items-center justify-between mb-4">
      <h3 class="et-card-title"><i class="fas fa-chart-bar text-orange-400"></i> CO₂ per capita · tonnes</h3>
      <span class="text-[9px] text-gray-500">Top 16 economies · Live ranked</span>
    </div>
    <div id="race-bars" class="space-y-1.5">
      ${[1, 2, 3, 4, 5, 6, 7, 8].map(() => `<div class="animate-pulse h-8 bg-gray-800/40 rounded-lg"></div>`).join('')}
    </div>
  </div>

  <!-- Stats footer -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" id="race-stats">
    <div class="et-card text-center"><div class="text-[9px] text-gray-500 mb-1">Highest CO₂</div><div class="text-lg font-black text-red-300 mono" id="race-stat-max">—</div></div>
    <div class="et-card text-center"><div class="text-[9px] text-gray-500 mb-1">Lowest CO₂</div><div class="text-lg font-black text-emerald-300 mono" id="race-stat-min">—</div></div>
    <div class="et-card text-center"><div class="text-[9px] text-gray-500 mb-1">#1 Ranked</div><div class="text-lg font-black text-amber-300 mono" id="race-stat-rank1">—</div></div>
    <div class="et-card text-center"><div class="text-[9px] text-gray-500 mb-1">Global Avg</div><div class="text-lg font-black text-cyan-300 mono" id="race-stat-avg">—</div></div>
  </div>
</div>`;
}

async function initRace() {
  RACE_STATE.year = 1990;
  RACE_STATE.playing = false;
  await fetchAndRenderRace(1990);
}

async function fetchAndRenderRace(year) {
  try {
    const r = await fetch(`/co2_race?year=${year}`);
    const d = await r.json();
    renderRaceBars(d);
  } catch (e) { console.error('Race:', e); }
}

function renderRaceBars(d) {
  const el = document.getElementById('race-bars');
  const yearEl = document.getElementById('race-year-display');
  const sliderEl = document.getElementById('race-year-slider');
  if (yearEl) yearEl.textContent = d.year;
  if (sliderEl) sliderEl.value = d.year;

  if (!el) return;
  const maxCo2 = d.maxCo2;
  el.innerHTML = d.entries.map((e, i) => {
    const pct = (e.co2 / maxCo2 * 100).toFixed(1);
    return `
    <div class="flex items-center gap-2">
      <div class="w-6 text-center text-[9px] font-black mono ${i === 0 ? 'text-amber-300' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500'}">${e.rank}</div>
      <div class="text-sm" title="${e.name}">${e.flag}</div>
      <div class="w-20 text-[9px] font-semibold text-gray-300 truncate">${e.name}</div>
      <div class="flex-1 relative h-7 bg-gray-900/60 rounded-r-lg overflow-hidden border border-gray-800/40">
        <div class="race-bar h-full" style="width:${pct}%; background: ${e.color}55; border-right: 2px solid ${e.color};">
        </div>
        <div class="absolute right-2 top-0 bottom-0 flex items-center text-[10px] font-black mono" style="color:${e.color}">${e.co2}</div>
      </div>
      <div class="text-[8px] text-gray-600 w-14 text-right">${e.continent}</div>
    </div>`;
  }).join('');

  // Stats
  const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  setEl('race-stat-max', d.entries[0].co2 + ' t');
  setEl('race-stat-min', d.entries[d.entries.length - 1].co2 + ' t');
  setEl('race-stat-rank1', d.entries[0].flag + ' ' + d.entries[0].name);
  const avg = (d.entries.reduce((s, e) => s + e.co2, 0) / d.entries.length).toFixed(2);
  setEl('race-stat-avg', avg + ' t');
}

function onRaceSlider(val) {
  RACE_STATE.year = parseInt(val);
  fetchAndRenderRace(RACE_STATE.year);
}

function toggleRacePlay() {
  RACE_STATE.playing = !RACE_STATE.playing;
  const icon = document.getElementById('race-play-icon');
  const label = document.getElementById('race-play-label');
  if (icon) icon.className = RACE_STATE.playing ? 'fas fa-pause' : 'fas fa-play';
  if (label) label.textContent = RACE_STATE.playing ? 'Pause' : 'Play';

  if (RACE_STATE.playing) {
    if (RACE_STATE.year >= 2024) RACE_STATE.year = 1990;
    ST.raceInterval = setInterval(async () => {
      RACE_STATE.year++;
      await fetchAndRenderRace(RACE_STATE.year);
      if (RACE_STATE.year >= 2024) {
        clearInterval(ST.raceInterval);
        RACE_STATE.playing = false;
        const icon2 = document.getElementById('race-play-icon');
        const label2 = document.getElementById('race-play-label');
        if (icon2) icon2.className = 'fas fa-play';
        if (label2) label2.textContent = 'Play';
      }
    }, 700);
  } else {
    clearInterval(ST.raceInterval);
  }
}

function resetRace() {
  clearInterval(ST.raceInterval);
  RACE_STATE.playing = false;
  RACE_STATE.year = 1990;
  const icon = document.getElementById('race-play-icon');
  const label = document.getElementById('race-play-label');
  if (icon) icon.className = 'fas fa-play';
  if (label) label.textContent = 'Play';
  fetchAndRenderRace(1990);
}

// Expose globals
window.initPlanetHealth = initPlanetHealth;
window.loadPlanetHealth = loadPlanetHealth;
window.initThreat = initThreat;
window.loadThreat = loadThreat;
window.initRace = initRace;
window.toggleRacePlay = toggleRacePlay;
window.resetRace = resetRace;
window.onRaceSlider = onRaceSlider;

// ════════════════════════════════════════════════════════════════════════════
// ADVANCED LIVE INTERACTIVE MODULES v5.0
// 1. Realtime Globe Visualization (Canvas-based)
// 2. Wind Patterns & Ocean Temperature Map
// 3. Carbon Budget Live Tracker
// 4. Deforestation 3D Heatmap (Canvas)
// 5. Seismic Risk Monitor
// 6. Advanced Alert Feed with filters + sound toggle
// ════════════════════════════════════════════════════════════════════════════

// ── MODULE STATE ──────────────────────────────────────────────────────────────
const ADV = {
  globe: { interval: null, anim: null, rotation: 0, hotspots: [], orbits: [], canvas: null, ctx: null },
  wind: { interval: null, chart: null, data: null },
  ocean: { interval: null, chart: null },
  carbon: { interval: null, donut: null, bar: null, line: null, countdown: null },
  defo3d: { interval: null, canvas: null, ctx: null, region: 'amazon', chart: null },
  seismic: { interval: null, events: [] },
  alerts: { items: [], filter: 'ALL', soundOn: false, interval: null },
};

// ────────────────────────────────────────────────────────────────────────────
