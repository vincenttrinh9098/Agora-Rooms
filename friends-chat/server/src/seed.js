const bcrypt = require('bcrypt');
const db = require('./db');

const USERS = [
  { username: 'vince', password: 'vince' },
  { username: 'ben',   password: 'ben' },
  { username: 'rich', password: 'rich' },
];

const SALT_ROUNDS = 10;

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, password_hash)
  VALUES (?, ?)
`);

const getUserIdByUsername = db.prepare(`
  SELECT id FROM users WHERE username = ?
`);

for (const { username, password } of USERS) {
  const hash = bcrypt.hashSync(password, SALT_ROUNDS);
  const result = insertUser.run(username, hash);

  if (result.changes === 1) {
    console.log(`Created user: ${username}`);
  } else {
    console.log(`Skipped (already exists): ${username}`);
  }
}

// --- Rooms ---
// TODO: add a `password` field to each room below (this is the test/dev
// password for that room — pick anything, e.g. "test123")

/*
const ROOMS = [
  { name: 'test room', password: 'test123', created_by: 'alice', members: ['alice', 'bob']},
  { name: 'test room 2', password: 'test456', created_by: 'alice', members: ['alice', 'carol']},
];

const insertRoom = db.prepare(`
  INSERT OR IGNORE INTO rooms (name, password_hash, created_by)
  VALUES (?, ?, ?)
`);

const getRoomIdByName = db.prepare(`
  SELECT id FROM rooms WHERE name = ?
`);

const insertRoomMember = db.prepare(`
  INSERT OR IGNORE INTO room_members (room_id, user_id, encrypted_room_key)
  VALUES (?, ?, ?)
`);

for (const room of ROOMS) {
  const creator = getUserIdByUsername.get(room.created_by);
  if (!creator) {
    console.log(`Skipping room "${room.name}" — creator "${room.created_by}" not found`);
    continue;
  }

  // TODO: hash room.password with bcrypt, same as user passwords above,
  // and pass that hash (not the plaintext) into insertRoom.run(...)
const roomPasswordHash = bcrypt.hashSync(room.password, SALT_ROUNDS);



  const roomResult = insertRoom.run(room.name, roomPasswordHash, creator.id);
  if (roomResult.changes === 1) {
    console.log(`Created room: ${room.name}`);
  } else {
    console.log(`Skipped (already exists): ${room.name}`);
  }

  const roomRow = getRoomIdByName.get(room.name);

  for (const memberUsername of room.members) {
    const member = getUserIdByUsername.get(memberUsername);
    if (!member) {
      console.log(`  Skipping member "${memberUsername}" — not found`);
      continue;
    }

    const memberResult = insertRoomMember.run(roomRow.id, member.id, null);
    if (memberResult.changes === 1) {
      console.log(`  Added member: ${memberUsername}`);
    } else {
      console.log(`  Skipped (already a member): ${memberUsername}`);
    }
  }
}

*/

console.log('Done.');