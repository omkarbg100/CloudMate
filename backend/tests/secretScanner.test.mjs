import { scanForSecrets, hasSecrets } from "../services/secretScanner.js";

const cases = [
  { path: "aws.ts", content: "const key = 'AKIAIOSFODNN7EXAMPLE';", expect: ["AWS Access Key ID"] },
  { path: "token.txt", content: 'auth = "ghp_abc1234567890abcdefghijkl"' + ";", expect: ["GitHub Token"] },
  { path: "key.pem", content: "-----BEGIN RSA PRIVATE KEY-----", expect: ["Private Key"] },
  { path: "cfg.json", content: '{"passwd": "hunter2-secret"}', expect: ["Generic Secret Assignment"] },
  { path: "clean.ts", content: "const x = 1; // nothing here", expect: [] },
];

let ok = true;
for (const c of cases) {
  const found = scanForSecrets([c]).map((f) => f.category);
  const pass = JSON.stringify(found) === JSON.stringify(c.expect);
  if (!pass) {
    ok = false;
    console.log("FAIL", c.path, "found:", found, "expected:", c.expect);
  }
}

if (scanForSecrets([{ path: "a", content: "AKIAIOSFODNN7EXAMPLE" }])[0]?.count !== 1) {
  ok = false;
  console.log("FAIL: count for single AWS key");
}

if (!hasSecrets([{ path: "a", content: "AKIAIOSFODNN7EXAMPLE" }]) || hasSecrets([{ path: "z", content: "hello world" }])) {
  ok = false;
  console.log("FAIL: hasSecrets");
}

console.log(ok ? "SCANNER OK" : "SCANNER FAILED");
process.exit(ok ? 0 : 1);