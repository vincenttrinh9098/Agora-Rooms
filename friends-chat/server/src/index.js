
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const requireAuth = require('./auth-middleware');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
app.use(cors());
app.use(express.json());

console.log('Loaded JWT_SECRET:', process.env.JWT_SECRET);
const JWT_SECRET = process.env.JWT_SECRET;

const getUserByUsername = db.prepare(`
  SELECT id, username, password_hash FROM users WHERE username = ?
`);

const getRoomsForUser = db.prepare(`
  SELECT r.id, r.name, r.icon
  FROM rooms r
  JOIN room_members m ON r.id = m.room_id
  WHERE m.user_id = ?
`);


//------------------------------------------------------------------------
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  const user = getUserByUsername.get(username);

  const genericFail = () => res.status(401).json({ error: 'Invalid username or password' });

  if (!user) {
    return genericFail();
  }

  const passwordMatches = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatches) {
    return genericFail();
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});


//------------------------------------------------------------------------
app.get('/rooms', requireAuth, (req, res) => {
  const rooms = getRoomsForUser.all(req.userId);
  res.json(rooms);
});





//------------------------------------------------------------------------

const getRoomByName = db.prepare(`
  SELECT id, name, password_hash FROM rooms WHERE name = ?
`);



const insertRoomMember = db.prepare(`
  INSERT OR IGNORE INTO room_members (room_id, user_id, encrypted_room_key)
  VALUES (?, ?, ?)
`);

const insertRoom = db.prepare(`
  INSERT INTO rooms (name, password_hash, icon, created_by)
  VALUES (?, ?, ?, ?)
`);



app.post('/rooms/join', requireAuth, (req, res) => {
  const { roomName, roomPassword, icon } = req.body;
  const name = roomName;
  const password = roomPassword;

  if (!name || !password) {
    return res.status(400).json({ error: 'Room name and password are required' });
  }

  const existingRoom = getRoomByName.get(name);

  if (!existingRoom) {
    const passwordHash = bcrypt.hashSync(password, 10);
    const result = insertRoom.run(name, passwordHash, icon || 'chatbubbles-outline', req.userId);
    const newRoomId = result.lastInsertRowid;

    insertRoomMember.run(newRoomId, req.userId, null);

    return res.json({ id: newRoomId, name, icon: icon || 'chatbubbles-outline', created: true });
  }

  const passwordMatches = bcrypt.compareSync(password, existingRoom.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid room name or password' });
  }

  insertRoomMember.run(existingRoom.id, req.userId, null);

  res.json({ id: existingRoom.id, name: existingRoom.name, created: false });
});




//------------------------------------------------------------------------
const checkMembership = db.prepare(`
  SELECT * FROM room_members
  WHERE room_id = ? AND user_id = ?
`);


const getMessagesForRoom = db.prepare(`
SELECT m.id, m.sender_id, m.ciphertext, m.nonce, m.sent_at, m.edited_at, u.username AS sender_username
FROM messages m
JOIN users u ON u.id = m.sender_id
WHERE m.room_id = ?
ORDER BY m.sent_at ASC
`);
const getUsernameById = db.prepare(`
  SELECT username FROM users WHERE id = ?
`);
 
app.get('/rooms/:id/messages', requireAuth, (req, res) => {
  const roomId = req.params.id;

  const membership = checkMembership.get(roomId, req.userId);
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this room' });
  }

  const messages = getMessagesForRoom.all(roomId);

  // Convert stored Buffers back to base64 strings for transport — still
  // encrypted, the client decrypts after receiving.
  const formatted = messages.map((msg) => ({
    id: msg.id,
    senderId: msg.sender_id,
    senderUsername: msg.sender_username,
    ciphertext: msg.ciphertext.toString('base64'),
    nonce: msg.nonce.toString('base64'),
    sentAt: msg.sent_at,
    editedAt: msg.edited_at,
  }));

  res.json(formatted);
});




//------------------------------------------------------------------------
const insertMessage = db.prepare(`
  INSERT INTO messages (room_id, sender_id, ciphertext, nonce)
  VALUES (?, ?, ?, ?)
`);

app.post('/rooms/:id/messages', requireAuth, (req, res) => {
  const roomId = req.params.id;
  const { ciphertext, nonce } = req.body;

  if (!ciphertext || !nonce) {
    return res.status(400).json({ error: 'Ciphertext and nonce are required' });
  }

  const membership = checkMembership.get(roomId, req.userId);
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this room' });
  }

  // The client already encrypted this — the server just stores the raw
  // bytes as-is, base64-decoded into Buffers. No encryption logic here.
  const result = insertMessage.run(
    roomId,
    req.userId,
    Buffer.from(ciphertext, 'base64'),
    Buffer.from(nonce, 'base64')
  );

  const sender = getUsernameById.get(req.userId);

  const newMessage = {
    id: result.lastInsertRowid,
    senderId: req.userId,
    senderUsername: sender.username,
    ciphertext,
    nonce,
    sentAt: new Date().toISOString(),
  };

  io.to(roomId.toString()).emit('new_message', newMessage);

  res.json(newMessage);
});

//------------------------------------------------------------------
const getMessageById = db.prepare(`
  SELECT id, sender_id FROM messages WHERE id = ?
`);



const updateMessage = db.prepare(`
  UPDATE messages
  SET ciphertext = ?, nonce = ?, edited_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

app.patch('/messages/:id', requireAuth, (req, res) => {
  const messageId = req.params.id;
  const { ciphertext, nonce } = req.body;

  if (!ciphertext || !nonce) {
    return res.status(400).json({ error: 'Ciphertext and nonce are required' });
  }

  const message = getMessageById.get(messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (message.sender_id !== req.userId) {
    return res.status(403).json({ error: 'You can only edit your own messages' });
  }

  updateMessage.run(
    Buffer.from(ciphertext, 'base64'),
    Buffer.from(nonce, 'base64'),
    messageId
  );

  res.json({ id: messageId, ciphertext, nonce, editedAt: new Date().toISOString() });
});

const deleteMessageStmt = db.prepare(`
  DELETE FROM messages WHERE id = ?
`);


app.delete('/messages/:id', requireAuth, (req, res) => {
  const messageId = req.params.id;

  const message = getMessageById.get(messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (message.sender_id !== req.userId) {
    return res.status(403).json({ error: 'You can only delete your own messages' });
  }

  deleteMessageStmt.run(messageId);

  res.json({ id: messageId, deleted: true });
});


//------------------------------------------------------------------

const getMembersForRoom = db.prepare(`
  SELECT u.id, u.username, r.encrypted_room_key
  FROM users u
  JOIN room_members r ON r.user_id = u.id
  WHERE r.room_id = ?
`);
app.get('/rooms/:id/members', requireAuth, (req, res) => {
  const roomId = req.params.id;

  const membership = checkMembership.get(roomId, req.userId);
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this room' });
  }

  const members = getMembersForRoom.all(roomId);

  const formatted = members.map((m) => ({
    id: m.id,
    username: m.username,
    isPending: m.encrypted_room_key === null,
    myEncryptedRoomKey: m.id === req.userId ? m.encrypted_room_key : undefined,
  }));

  res.json(formatted);
});




//------------------------------------------------------------------------


const updatePublicKey = db.prepare(`
  UPDATE users SET public_key = ? WHERE id = ?
`);

app.patch('/users/me/public-key', requireAuth, (req, res) => {
  const { publicKey } = req.body;

  if (!publicKey) {
    return res.status(400).json({ error: 'Public key is required' });
  }

  updatePublicKey.run(publicKey, req.userId);

  res.json({ success: true });
});




//------------------------------------------------------------------------


const setEncryptedRoomKey = db.prepare(`
  UPDATE room_members
  SET encrypted_room_key = ?
  WHERE room_id = ? AND user_id = ?
`);

app.patch('/rooms/:roomId/members/:memberId/key', requireAuth, (req, res) => {
  const { roomId, memberId } = req.params;
  const { encryptedRoomKey } = req.body;

  if (!encryptedRoomKey) {
    return res.status(400).json({ error: 'Encrypted room key is required' });
  }

  // The caller must already be a member of this room — only someone who
  // already holds the room key is able to encrypt a copy for someone else.
  const callerMembership = checkMembership.get(roomId, req.userId);
  if (!callerMembership) {
    return res.status(403).json({ error: 'Not a member of this room' });
  }

  const result = setEncryptedRoomKey.run(encryptedRoomKey, roomId, memberId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Target member not found in this room' });
  }

  res.json({ success: true });
});


//------------------------------------------------------------------------

const getPublicKeyById = db.prepare(`
  SELECT public_key FROM users WHERE id = ?
`);

app.get('/users/:id/public-key', requireAuth, (req, res) => {
  const userId = req.params.id;

  const user = getPublicKeyById.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.public_key) {
    return res.status(404).json({ error: 'This user has no public key yet' });
  }

  res.json({ publicKey: user.public_key });
});





//------------------------------------------------------------------




const getRoomById = db.prepare(`
  SELECT id, name, icon, created_by FROM rooms WHERE id = ?
`);

const deleteMessagesForRoom = db.prepare(`
  DELETE FROM messages WHERE room_id = ?
`);

const deleteMembersForRoom = db.prepare(`
  DELETE FROM room_members WHERE room_id = ?
`);

const deleteRoomStmt = db.prepare(`
  DELETE FROM rooms WHERE id = ?
`);

app.delete('/rooms/:id', requireAuth, (req, res) => {
  const roomId = req.params.id;

  const room = getRoomById.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.created_by !== req.userId) {
    return res.status(403).json({ error: 'Only the room creator can delete this room' });
  }

  // Order matters: delete anything referencing the room BEFORE the room
  // itself, or the foreign key constraint will reject the final delete.
  deleteMessagesForRoom.run(roomId);
  deleteMembersForRoom.run(roomId);
  deleteRoomStmt.run(roomId);

  res.json({ success: true });
});





//------------------------------------------------------------------
app.get('/rooms/:id', requireAuth, (req, res) => {
  const roomId = req.params.id;
 
  const membership = checkMembership.get(roomId, req.userId);
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this room' });
  }
 
  const room = getRoomById.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
 
  res.json({
    id: room.id,
    name: room.name,
    icon: room.icon,
    createdBy: room.created_by,
  });
});
 
 
//------------------------------------------------------------------------


const getMembershipRow = db.prepare(`
  SELECT encrypted_room_key FROM room_members WHERE room_id = ? AND user_id = ?
`);

const resetAllRoomKeys = db.prepare(`
  UPDATE room_members SET encrypted_room_key = NULL WHERE room_id = ?
`);

app.post('/rooms/:id/rotate-key', requireAuth, (req, res) => {
  const roomId = req.params.id;

  const membership = getMembershipRow.get(roomId, req.userId);
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this room' });
  }

  // Only a RESOLVED member can rotate — someone still pending has no
  // meaningful key to rotate away from in the first place.
  if (!membership.encrypted_room_key) {
    return res.status(403).json({ error: 'You must have an active room key to rotate it' });
  }

  // Wipe all message history — old ciphertext is undecryptable once the
  // key that encrypted it is gone, so there's nothing worth keeping.
  deleteMessagesForRoom.run(roomId);

  // Reset EVERY member (including the caller) back to pending. A fresh
  // key gets generated and distributed by the client right after this.
  resetAllRoomKeys.run(roomId);

  res.json({ success: true });
});


//------------------------------------------------------------------------

const getUserById = db.prepare(`
  SELECT id, username, created_at FROM users WHERE id = ?
`);
 
app.get('/users/me', requireAuth, (req, res) => {
  const user = getUserById.get(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
 
  res.json({
    id: user.id,
    username: user.username,
    createdAt: user.created_at,
  });
});


//------------------------------------------------------------------------

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }, // fine for local dev with a handful of trusted friends
});
 
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
 
  socket.on('join_room', (roomId) => {
    socket.join(roomId.toString()); // room names in Socket.IO are strings
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });
 
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});
 
// Replace your existing app.listen(...) at the bottom with:
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
 