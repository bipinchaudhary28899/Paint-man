// Signed, expiring admin session tokens. Uses Web Crypto so it works in any
// Next.js runtime. Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256).

export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export const sessionCookieName = () => (process.env.NODE_ENV === "production" ? "__Host-pm_admin" : "pm_admin");

export type SessionPayload = { sub: string; iat: number; exp: number; jti: string };

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("bad encoding");
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createSessionToken(sub: string, secret: string, now = Date.now()): Promise<string> {
  const iat = Math.floor(now / 1000);
  const jti = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const payload: SessionPayload = { sub, iat, exp: iat + SESSION_TTL_SECONDS, jti };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

export async function verifySessionToken(token: string | undefined, secret: string, now = Date.now()): Promise<SessionPayload | null> {
  if (!token || token.length > 1024) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  try {
    const sigBytes = fromB64url(sig);
    // Only accept the canonical encoding, so a token has exactly one valid spelling.
    if (b64url(sigBytes) !== sig) return null;
    // crypto.subtle.verify compares in constant time.
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), sigBytes, enc.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as SessionPayload;
    const t = Math.floor(now / 1000);
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number" || typeof payload.iat !== "number") return null;
    if (payload.exp <= t || payload.iat > t + 60) return null;
    return payload;
  } catch {
    return null;
  }
}
