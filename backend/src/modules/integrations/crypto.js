const crypto = require("crypto");
const { env } = require("../../lib/env");
const { ApiError } = require("../../lib/ApiError");

// Format: v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>
// The "v1:" prefix lets us rotate the encryption key in the future without
// losing access to old rows — a future v2 wrapper can branch on the prefix.
const CIPHER = "aes-256-gcm";
const VERSION = "v1";
const KEY_BYTES = 32;
const IV_BYTES = 12; // GCM standard

let cachedKey = null;

function loadKey() {
  if (cachedKey) return cachedKey;
  const raw = env.INTEGRATION_ENCRYPTION_KEY;
  if (!raw) {
    throw new ApiError(500, "INTEGRATION_ENCRYPTION_KEY is not set");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== KEY_BYTES) {
    throw new ApiError(
      500,
      `INTEGRATION_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${buf.length}). Generate with: openssl rand -base64 32`,
    );
  }
  cachedKey = buf;
  return cachedKey;
}

function encrypt(plaintext) {
  if (plaintext == null) return null;
  const key = loadKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(CIPHER, key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

function decrypt(payload) {
  if (payload == null) return null;
  if (typeof payload !== "string") {
    throw new ApiError(500, "decrypt(): expected string");
  }
  const parts = payload.split(":");
  if (parts.length !== 4) {
    throw new ApiError(500, "decrypt(): malformed ciphertext");
  }
  const [version, ivB64, tagB64, ctB64] = parts;
  if (version !== VERSION) {
    throw new ApiError(500, `decrypt(): unsupported ciphertext version "${version}"`);
  }
  const key = loadKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = crypto.createDecipheriv(CIPHER, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

// Convenience wrappers for credential JSON blobs.
function encryptJson(obj) {
  return encrypt(JSON.stringify(obj ?? {}));
}

function decryptJson(payload) {
  const plain = decrypt(payload);
  if (plain == null) return null;
  try {
    return JSON.parse(plain);
  } catch {
    throw new ApiError(500, "decryptJson(): plaintext is not valid JSON");
  }
}

module.exports = { encrypt, decrypt, encryptJson, decryptJson };
