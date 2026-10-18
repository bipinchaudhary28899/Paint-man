import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Password hashes use scrypt and are stored as
//   scrypt:<N>:<r>:<p>:<salt base64url>:<hash base64url>
// Colons (not "$") keep the value safe inside .env files.

const KEY_LENGTH = 64;
const DEFAULTS = { N: 2 ** 15, r: 8, p: 1 };

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, { ...opts, maxmem: 256 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string, params = DEFAULTS): Promise<string> {
  if (password.length < 12) throw new Error("Password must be at least 12 characters");
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, params);
  return ["scrypt", params.N, params.r, params.p, salt.toString("base64url"), hash.toString("base64url")].join(":");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const N = Number(n);
  const params = { N, r: Number(r), p: Number(p) };
  if (![params.N, params.r, params.p].every(Number.isInteger) || N < 2 ** 14 || N > 2 ** 20) return false;

  const expected = Buffer.from(hashB64, "base64url");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await scrypt(password, Buffer.from(saltB64, "base64url"), KEY_LENGTH, params);
  return timingSafeEqual(actual, expected);
}

/** Constant-time string comparison (pads to equal length so length isn't leaked early). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  const len = Math.max(ab.length, bb.length, 1);
  const pa = Buffer.alloc(len);
  const pb = Buffer.alloc(len);
  ab.copy(pa);
  bb.copy(pb);
  return timingSafeEqual(pa, pb) && ab.length === bb.length;
}
