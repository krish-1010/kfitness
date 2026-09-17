// Minimal signed-cookie session, no auth library needed for a single-user
// app. Cookie value is `${expiresAtMs}.${hexHmacSignature}` — the signature
// proves it was issued by the server (can't be forged by just setting a
// cookie manually), and the timestamp gives it a hard expiry.
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

export async function createSessionCookie(secret: string, maxAgeMs: number): Promise<string> {
  const expiresAt = Date.now() + maxAgeMs;
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(String(expiresAt)));
  return `${expiresAt}.${toHex(sig)}`;
}

export async function verifySessionCookie(secret: string, value: string | undefined | null): Promise<boolean> {
  if (!value) return false;
  const [expiresStr, sig] = value.split(".");
  if (!expiresStr || !sig) return false;

  const expiresAt = Number(expiresStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const key = await getKey(secret);
  const expectedSig = toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(expiresStr)));
  // Simple equality check, not constant-time. Acceptable for a single-user
  // personal app — not a multi-tenant system fielding timing attacks.
  return expectedSig === sig;
}
