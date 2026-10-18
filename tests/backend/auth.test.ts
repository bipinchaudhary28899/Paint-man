import { afterEach, describe, expect, it, vi } from "vitest";
import { hashPassword, safeEqual, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, getSessionSecret, SESSION_TTL_SECONDS, verifySessionToken } from "@/lib/auth/session";

const FAST = { N: 2 ** 14, r: 8, p: 1 };
const SECRET = "x".repeat(40);

describe("password hashing", () => {
  it("produces an env-safe scrypt hash with a random salt", async () => {
    const a = await hashPassword("correct horse battery", FAST);
    const b = await hashPassword("correct horse battery", FAST);
    expect(a).toMatch(/^scrypt:16384:8:1:[\w-]+:[\w-]+$/);
    expect(a).not.toContain("$");
    expect(a).not.toBe(b);
  });

  it("verifies the right password and rejects wrong ones", async () => {
    const hash = await hashPassword("correct horse battery", FAST);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterY", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("rejects passwords shorter than 12 characters", async () => {
    await expect(hashPassword("short", FAST)).rejects.toThrow(/12/);
  });

  it.each([
    "",
    "plaintext-password",
    "bcrypt:10:abc:def",
    "scrypt:16384:8:1:salt",
    "scrypt:1024:8:1:c2FsdA:aGFzaA", // work factor too low
    "scrypt:16384:8:1:c2FsdA:dG9vc2hvcnQ", // wrong hash length
  ])("treats malformed or weak stored hash %j as a failure", async (stored) => {
    expect(await verifyPassword("anything at all", stored)).toBe(false);
  });

  it("detects a tampered hash", async () => {
    const hash = await hashPassword("correct horse battery", FAST);
    const parts = hash.split(":");
    parts[5] = parts[5].slice(0, -2) + (parts[5].endsWith("AA") ? "BB" : "AA");
    expect(await verifyPassword("correct horse battery", parts.join(":"))).toBe(false);
  });

  it("safeEqual compares strings exactly", () => {
    expect(safeEqual("admin", "admin")).toBe(true);
    expect(safeEqual("admin", "Admin")).toBe(false);
    expect(safeEqual("admin", "admin2")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("session tokens", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("round-trips a valid token", async () => {
    const token = await createSessionToken("owner", SECRET, 1_000_000);
    const s = await verifySessionToken(token, SECRET, 1_000_000 + 5_000);
    expect(s?.sub).toBe("owner");
    expect(s!.exp - s!.iat).toBe(SESSION_TTL_SECONDS);
  });

  it("gives each session a unique id", async () => {
    const a = await createSessionToken("owner", SECRET);
    const b = await createSessionToken("owner", SECRET);
    expect(a).not.toBe(b);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken("owner", SECRET);
    expect(await verifySessionToken(token, "y".repeat(40))).toBeNull();
  });

  it("rejects a token whose payload was edited", async () => {
    const token = await createSessionToken("owner", SECRET);
    const [, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "attacker", iat: 0, exp: 9e9, jti: "x" })).toString("base64url");
    expect(await verifySessionToken(`${forged}.${sig}`, SECRET)).toBeNull();
  });

  it("rejects a token with a tampered signature", async () => {
    const token = await createSessionToken("owner", SECRET);
    const [body, sig] = token.split(".");
    const i = 10; // a middle character: every bit there is significant
    const flipped = sig.slice(0, i) + (sig[i] === "A" ? "B" : "A") + sig.slice(i + 1);
    expect(await verifySessionToken(`${body}.${flipped}`, SECRET)).toBeNull();
  });

  it("rejects a non-canonical spelling of a valid signature", async () => {
    const token = await createSessionToken("owner", SECRET);
    const [body, sig] = token.split(".");
    // 32 bytes = 256 bits, but 43 base64url chars hold 258: the last char's lowest
    // 2 bits are padding, so flipping bit 0 keeps the same signature bytes.
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const last = alphabet.indexOf(sig.at(-1)!);
    const twin = alphabet[last ^ 1];
    expect(await verifySessionToken(`${body}.${sig.slice(0, -1)}${twin}`, SECRET)).toBeNull();
    expect(await verifySessionToken(token, SECRET)).not.toBeNull();
  });

  it("rejects expired tokens", async () => {
    const now = 1_000_000_000;
    const token = await createSessionToken("owner", SECRET, now);
    expect(await verifySessionToken(token, SECRET, now + SESSION_TTL_SECONDS * 1000 + 1000)).toBeNull();
  });

  it("rejects tokens issued in the future", async () => {
    const token = await createSessionToken("owner", SECRET, Date.now() + 10 * 60 * 1000);
    expect(await verifySessionToken(token, SECRET)).toBeNull();
  });

  it.each([undefined, "", "abc", "a.b.c", "!!!.???", "x".repeat(2000)])("rejects garbage token %j", async (t) => {
    expect(await verifySessionToken(t, SECRET)).toBeNull();
  });

  it("requires a session secret of at least 32 characters", () => {
    vi.stubEnv("SESSION_SECRET", "too-short");
    expect(getSessionSecret()).toBeNull();
    vi.stubEnv("SESSION_SECRET", SECRET);
    expect(getSessionSecret()).toBe(SECRET);
  });
});
