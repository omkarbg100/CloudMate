import { encryptSecret, decryptSecret } from "../services/awsCrypto.js";
import { createHash } from "node:crypto";

process.env.AWS_CREDENTIAL_ENCRYPTION_KEY = "unit-test-encryption-key-0123456789";

const secret = "AKIAIOSFODNN7EXAMPLE/wJalrXUtnFEMI/K7MDENG+bPxRfiCY";
const stored = encryptSecret(secret);

const headerChecks = [
  ["starts with version", () => stored.startsWith("v1:")],
  ["has 4 parts", () => stored.split(":").length === 4],
  ["not plaintext", () => !stored.includes(secret.slice(0, 18))],
  ["round-trips", () => decryptSecret(stored) === secret],
];

let ok = true;
for (const [name, fn] of headerChecks) {
  if (!fn()) {
    ok = false;
    console.log("FAIL:", name);
  }
}

// Different IV each time.
if (encryptSecret(secret) === stored) {
  ok = false;
  console.log("FAIL: IV not randomized");
}

// Tampering must throw.
try {
  const tampered = stored.slice(0, -4) + "xxxx";
  decryptSecret(tampered);
  ok = false;
  console.log("FAIL: tampered ciphertext accepted");
} catch {
  // expected
}

console.log(ok ? "CRYPTO OK" : "CRYPTO FAILED");
process.exit(ok ? 0 : 1);