const API_URL = 'http://localhost:3000';
let socket;
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');
let isLogin = true;

const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const authTitle = document.getElementById('auth-title');
const authBtn = document.getElementById('auth-btn');
const authToggle = document.getElementById('auth-toggle');
const authError = document.getElementById('auth-error');
const usernameInput = document.getElementById('auth-username');
const passwordInput = document.getElementById('auth-password');
const userDisplay = document.getElementById('user-display');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const logoutBtn = document.getElementById('logout-btn');

if (token && username) {
  showChat();
}

authToggle.addEventListener('click', () => {
  isLogin = !isLogin;
  authTitle.textContent = isLogin ? 'Login' : 'Sign Up';
  authBtn.textContent = isLogin ? 'Login' : 'Sign Up';
  authToggle.textContent = isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login';
  authError.classList.add('hidden');
});

authBtn.addEventListener('click', async () => {
  const user = usernameInput.value.trim();
  const pass = passwordInput.value.trim();
  if (!user || !pass) {
    showError('Please fill all fields');
    return;
  }
  const endpoint = isLogin ? '/api/login' : '/api/signup';
  try {
    const res = await fetch(API_URL + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    const data = await res.json();
    if (!res.ok) {
      showError(data.error);
      return;
    }
    token = data.token;
    username = data.username;
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    showChat();
  } catch {
    showError('Server error. Make sure backend is running.');
  }
});

logoutBtn.addEventListener('click', () => {
  if (socket) socket.disconnect();
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  token = null;
  username = null;
  chatContainer.classList.add('hidden');
  authContainer.classList.remove('hidden');
  usernameInput.value = '';
  passwordInput.value = '';
});

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const msg = messageInput.value.trim();
  if (!msg || !socket) return;
  socket.emit('send_message', { token, message: msg });
  messageInput.value = '';
}

function showChat() {
  authContainer.classList.add('hidden');
  chatContainer.classList.remove('hidden');
  userDisplay.textContent = '@' + username;
  connectSocket();
  loadMessages();
}

function connectSocket() {
  socket = io(API_URL);
  socket.on('connect', () => console.log('Socket connected'));
  socket.on('new_message', (data) => {
    addMessage(data, data.username === username);
  });
  socket.on('error', (err) => console.error(err));
}

async function loadMessages() {
  try {
    const res = await fetch(API_URL + '/api/messages', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Failed');
    const msgs = await res.json();
    messagesDiv.innerHTML = '';
    msgs.forEach((m) => addMessage(m, m.username === username));
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } catch {
    console.error('Failed to load messages');
  }
}

function addMessage(data, isOwn) {
  const div = document.createElement('div');
  div.className = 'msg ' + (isOwn ? 'own' : 'other');
  const time = data.created_at ? new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  div.innerHTML = isOwn
    ? `${data.message}<div class="msg-time">${time}</div>`
    : `<div class="msg-user">${data.username}</div>${data.message}<div class="msg-time">${time}</div>`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showError(msg) {
  authError.textContent = msg;
  authError.classList.remove('hidden');
}
