import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, decodeUTF8, encodeUTF8 } from 'tweetnacl-util';
import * as SecureStore from 'expo-secure-store';

const PRIVATE_KEY_STORAGE_KEY = 'private_key';

// Ensures a keypair exists on this device, generating one if needed.
// ALWAYS returns the current base64 public key (whether freshly generated
// or derived from an existing private key) — so the caller can always
// upload it, keeping the server in sync even if it somehow drifted out
// of sync before (self-healing, rather than a one-time upload assumption).
async function ensureKeypairExists() {
  const existingPrivateKeyB64 = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);

  if (existingPrivateKeyB64) {
    // Already have a private key — derive the matching public key from it
    // rather than assuming the server already has the right value.
    const secretKey = decodeBase64(existingPrivateKeyB64);
    const { publicKey } = nacl.box.keyPair.fromSecretKey(secretKey);
    return encodeBase64(publicKey);
  }

  // No private key yet — generate a brand new keypair.
  const { publicKey, secretKey } = nacl.box.keyPair();
  const base64PrivateKey = encodeBase64(secretKey);
  const base64PublicKey = encodeBase64(publicKey);

  await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, base64PrivateKey);

  return base64PublicKey;
}

async function encryptRoomKeyForMember(roomKey, recipientPublicKeyB64) {
  const myPrivateKeyB64 = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
  const myPrivateKey = decodeBase64(myPrivateKeyB64);
  const recipientPublicKey = decodeBase64(recipientPublicKeyB64);
 
  // nacl.box requires a fresh, random nonce for every single encryption —
  // reusing a nonce with the same key pair would seriously weaken security.
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
 
  const encrypted = nacl.box(roomKey, nonce, recipientPublicKey, myPrivateKey);
 
  // The recipient needs BOTH the encrypted bytes AND the nonce to decrypt —
  // pack them together into one base64 string, nonce first, so there's
  // only one value to store/transmit per encrypted room key.
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
 
  return encodeBase64(combined);
}

async function decryptRoomKey(encryptedRoomKeyB64, senderPublicKeyB64) {
  const myPrivateKeyB64 = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
  const myPrivateKey = decodeBase64(myPrivateKeyB64);
  const senderPublicKey = decodeBase64(senderPublicKeyB64);

  const combined = decodeBase64(encryptedRoomKeyB64);

  // Reverse the packing done in encryptRoomKeyForMember: the nonce was
  // written first, so the first `nonceLength` bytes are the nonce, and
  // everything after that is the actual ciphertext.
  const nonce = combined.slice(0, nacl.box.nonceLength);
  const ciphertext = combined.slice(nacl.box.nonceLength);

  const roomKey = nacl.box.open(ciphertext, nonce, senderPublicKey, myPrivateKey);

  return roomKey; // Uint8Array on success, or null if decryption failed
}




// Encrypts a plain text message using the room's shared symmetric key.
// Returns { ciphertext, nonce } as base64 strings, matching the two
// separate columns already in your messages table.
function encryptMessage(plainText, roomKeyBytes) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageBytes = decodeUTF8(plainText);

  const encrypted = nacl.secretbox(messageBytes, nonce, roomKeyBytes);

  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  };
}

// Reverses encryptMessage: given the stored base64 ciphertext/nonce and
// the raw room key, returns the original plain text — or null if
// decryption fails (wrong key, corrupted/tampered data).
function decryptMessage(ciphertextB64, nonceB64, roomKeyBytes) {
  const ciphertext = decodeBase64(ciphertextB64);
  const nonce = decodeBase64(nonceB64);

  const decrypted = nacl.secretbox.open(ciphertext, nonce, roomKeyBytes);

  if (!decrypted) return null;

  return encodeUTF8(decrypted);
}


function generateRoomKey() {
  return nacl.randomBytes(nacl.secretbox.keyLength);
}
 
export {
  ensureKeypairExists,
  encryptRoomKeyForMember,
  generateRoomKey,
  decryptRoomKey,
  encryptMessage,
  decryptMessage,
}; 