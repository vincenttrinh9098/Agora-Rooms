CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  public_key    BLOB,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  icon          TEXT DEFAULT 'chatbubbles-outline',
  created_by    INTEGER REFERENCES users(id),
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id             INTEGER NOT NULL REFERENCES rooms(id),
  user_id             INTEGER NOT NULL REFERENCES users(id),
  encrypted_room_key  BLOB,
  joined_at           TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id     INTEGER NOT NULL REFERENCES rooms(id),
  sender_id   INTEGER NOT NULL REFERENCES users(id),
  ciphertext  BLOB NOT NULL,
  nonce       BLOB NOT NULL,
  sent_at     TEXT DEFAULT CURRENT_TIMESTAMP,
  edited_at   TEXT
);