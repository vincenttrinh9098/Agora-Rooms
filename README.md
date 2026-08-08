# Agora Rooms 

## CURRENTLY IN RE-DESIGN PHAE


A private, end-to-end encrypted messaging app built for a small group of trusted friends. Full-stack, real-time, with genuine client-side encryption — the server never has access to plaintext message content.

## Features

- **Authentication** — JWT-based sessions, bcrypt password hashing, automatic logout on token expiration
- **Rooms** — password-protected creation and joining, dynamic grid-based Home screen
- **Real-time messaging** — Socket.IO-powered live delivery, message editing and deletion, date separators, read-friendly timestamps
- **End-to-end encryption**
  - Per-user asymmetric keypairs (Curve25519, via `nacl.box`), generated on-device and never transmitted
  - Per-room symmetric keys (XSalsa20-Poly1305, via `nacl.secretbox`) for actual message content
  - Manual key distribution ("Invite") for pending members, using each recipient's public key
  - Key rotation with deliberate old-key deletion for forward secrecy
- **Room management** — creator-only deletion with cascading cleanup, member list with pending/resolved status

## Tech Stack

**Frontend:** React Native (Expo), React Navigation, Socket.IO client, `tweetnacl`, `expo-secure-store`

**Backend:** Node.js, Express, `better-sqlite3` (SQLite), Socket.IO, `bcrypt`, `jsonwebtoken`, `dotenv`

## Architecture

The app follows a two-layer encryption model:

1. **Personal keypairs** (asymmetric) — each user generates a Curve25519 keypair on first login. The private key stays in secure on-device storage forever; the public key is uploaded to the server, since it's safe to share.
2. **Room keys** (symmetric) — each room has a single shared secret key, generated once and encrypted individually for each member using their public key. This lets a message be encrypted exactly once (rather than once per recipient) while still being distributed securely.

The server only ever stores and forwards ciphertext, encrypted key material, and public keys — it never has the information needed to decrypt anything.

## Setup

### Backend

```bash
cd server
npm install
```

Create a `.env` file in `server/`:
```
JWT_SECRET=<a long, random string>
```

Seed the database with test users and rooms:
```bash
node src/seed.js
```

Start the server:
```bash
npm run dev
```

### Frontend

```bash
cd app
npm install
```

Update `constants.js` with your machine's local network IP (needed for a physical device to reach the backend during development):
```js
export const baseURL = "http://YOUR_LOCAL_IP:3000";
```

Start the Expo dev server:
```bash
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) to run on a physical device.

## Security Notes

This project uses `tweetnacl`, the same family of cryptographic primitives (Curve25519, XSalsa20-Poly1305) used by Signal and WireGuard. It does **not** implement a full protocol like Signal's Double Ratchet — forward secrecy is achieved through manual key rotation rather than per-message key derivation. This is a deliberate scope tradeoff for a small, trusted-group chat app rather than a general-purpose secure messenger.

## Status

Built as a learning project to explore full-stack architecture, real-time systems, and applied cryptography end-to-end.
