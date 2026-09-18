/**
 * Simple authenticated encryption (AES-256-GCM) for AWS secret access keys.
 *
 * The encryption key comes from AWS_CREDENTIAL_ENCRYPTION_KEY (server-side
 * secret, never stored in MongoDB, never sent to the browser). A stable
 * development fallback is used only when the variable is absent so local
 * development keeps working; production must set the variable.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function encryptionKey() {
  const secret = process.env.AWS_CREDENTIAL_ENCRYPTION_KEY ?? "";
  if (!secret) {
    console.warn("[awsCrypto] AWS_CREDENTIAL_ENCRYPTION_KEY is not set — using development fallback key.");
  }
  // Any length secret -> 32-byte key.
  return createHash("sha256").update(secret || "deploymate-dev-encryption-key").digest();
}

/** Encrypt a secret. Returns "v1:<iv>:<tag>:<ciphertext>" (all hex). */
export function encryptSecret(plaintext) {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("Cannot encrypt an empty secret.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decrypt a value produced by encryptSecret. Throws on tampering or wrong key. */
export function decryptSecret(stored) {
  if (typeof stored !== "string") {
    throw new Error("Stored credentials are malformed.");
  }
  const [version, ivHex, tagHex, dataHex] = stored.split(":");
  if (version !== VERSION || !ivHex || !tagHex || !dataHex) {
    throw new Error("Stored credentials are malformed.");
  }
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}