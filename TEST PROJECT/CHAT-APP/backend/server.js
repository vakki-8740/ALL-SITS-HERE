const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDB, query } = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const JWT_SECRET = 'chat-app-secret-key-123';
const PORT = 3000;

app.use(cors());
app.use(express.json());

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/signup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }
  try {
    const existing = query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    const hashed = bcrypt.hashSync(password, 10);
    query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed]);
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const users = query('SELECT * FROM users WHERE username = ?', [username]);
    const user = users[0];
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/messages', authMiddleware, (req, res) => {
  const messages = query('SELECT username, message, created_at FROM messages ORDER BY created_at ASC LIMIT 100');
  res.json(messages);
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('send_message', (data) => {
    const { token, message } = data;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const username = decoded.username;
      query('INSERT INTO messages (username, message) VALUES (?, ?)', [username, message]);
      io.emit('new_message', { username, message, created_at: new Date().toISOString() });
    } catch {
      socket.emit('error', 'Invalid token');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

async function start() {
  await initDB();
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
