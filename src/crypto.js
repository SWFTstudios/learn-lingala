// Password hashing (PBKDF2-SHA256 via WebCrypto) and session tokens.

const ITERATIONS = 100_000; // the maximum Workers' WebCrypto allows for PBKDF2
const encoder = new TextEncoder();

function toB64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromB64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

function toB64Url(bytes) {
  return toB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

function constantTimeEqual(a, b) {
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2-sha256$${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iter, salt, hash] = String(stored).split('$');
  if (scheme !== 'pbkdf2-sha256') return false;
  const actual = await pbkdf2(password, fromB64(salt), Number(iter));
  return constantTimeEqual(actual, fromB64(hash));
}

// A real hash for a password nobody has, so logins for unknown emails take
// the same time as logins for real ones (no account enumeration by timing).
let dummyHash;
export async function burnPasswordCheck(password) {
  dummyHash ??= await hashPassword(crypto.randomUUID());
  await verifyPassword(password, dummyHash);
}

export function newSessionToken() {
  return toB64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
