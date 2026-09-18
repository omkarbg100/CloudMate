/**
 * Secret scanner.
 *
 * Runs BEFORE any file content is committed or sent to an AI model payload, so
 * credentials do not leak into the repository or get transpiled by the engine.
 *
 * Detection is deliberately conservative (many false positives are fine — it
 * blocks commits, which is safe). Values are NEVER returned to callers; only
 * the file path and the matched secret category are surfaced.
 */

const PATTERNS = [
  {
    category: "AWS Access Key ID",
    regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    category: "AWS Secret Access Key",
    regex: /(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{40}(?![A-Za-z0-9+/])/g,
  },
  {
    category: "GitHub Token",
    regex: /\b(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)[A-Za-z0-9_]{20,}\b/g,
  },
  {
    category: "Private Key",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    category: "Generic Secret Assignment",
    // Tolerates quoted keys ("password": "...") and config-style separators.
    regex: /\b(?:password|passwd|secret|api[-_ ]?key|token|client[-_ ]?secret|twilio[-_ ]?api[-_ ]?secret|access[-_ ]?token)\b\s*["']?\s*[:=]\s*["']?[^"'\s,;]{8,}/gi,
  },
];

/**
 * @param {Array<{path: string, content: string}>} files
 * @returns {Array<{path: string, category: string}>} findings (no values).
 */
export function scanForSecrets(files) {
  const findings = [];
  for (const file of files ?? []) {
    if (typeof file?.content !== "string") continue;
    for (const rule of PATTERNS) {
      rule.regex.lastIndex = 0;
      const matches = String(file.content).match(rule.regex);
      if (matches && matches.length) {
        findings.push({ path: file.path, category: rule.category, count: matches.length });
      }
    }
  }
  return findings;
}

/** True when any of the files carry a potential secret. */
export function hasSecrets(files) {
  return scanForSecrets(files).length > 0;
}