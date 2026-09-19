// Minimal signed-cookie session, no auth library needed for a handful of
// known users. Cookie value is `${userId}.${expiresAtMs}.${hexHmacSignature}`
// — the signature proves it was issued by the server (can't be forged by
// just setting a cookie manually), and the timestamp gives it a hard expiry.
// Uses Web Crypto (crypto.subtle) rather than Node's `crypto` module so this
// works unmodified whether middleware runs on the Edge or Node runtime.

const encoder = new TextEncoder();

async function getKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionCookie(secret: string, userId: number, maxAgeMs: number): Promise<string> {
  const expiresAt = Date.now() + maxAgeMs;
  const payload = `${userId}.${expiresAt}`;
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${toHex(sig)}`;
}

// Returns the verified userId, or null if the cookie is missing, malformed,
// expired, or its signature doesn't match.
export async function verifySessionCookie(secret: string, value: string | undefined | null): Promise<number | null> {
  if (!value) return null;
  const [userIdStr, expiresStr, sig] = value.split(".");
  if (!userIdStr || !expiresStr || !sig) return null;

  const userId = Number(userIdStr);
  const expiresAt = Number(expiresStr);
  if (!Number.isInteger(userId) || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  const payload = `${userIdStr}.${expiresStr}`;
  const key = await getKey(secret);
  const expectedSig = toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  // Simple equality check, not constant-time. Acceptable for a handful of
  // known users on a personal app — not a public multi-tenant system
  // fielding real timing-attack traffic.
  return expectedSig === sig ? userId : null;
}
