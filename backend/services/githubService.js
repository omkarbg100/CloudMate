/**
 * Thin GitHub REST client used for repository connection (listing repos,
 * verifying a repository). Uses the user's OAuth access token; never stores it
 * anywhere except the User document.
 */

const GITHUB_API = "https://api.github.com";

async function githubFetch(path, accessToken, options = {}) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "DeployMate-Studio",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = new Error(`GitHub request failed (${response.status})`);
    error.status = response.status === 404 ? 404 : 502;
    throw error;
  }
  return response.json();
}

export async function listUserRepos(accessToken) {
  const repos = await githubFetch("/user/repos?per_page=100&sort=updated", accessToken);
  // Same shape the GitHub API exposes, so callers can rely on full_name and
  // owner.login (the frontend picks repos by these fields).
  return repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    owner: { login: repo.owner?.login },
    defaultBranch: repo.default_branch ?? "main",
    private: repo.private,
    language: repo.language,
    updatedAt: repo.updated_at,
  }));
}

export async function verifyRepo(accessToken, owner, name) {
  const repo = await githubFetch(`/repos/${owner}/${name}`, accessToken);
  return {
    fullName: repo.full_name,
    defaultBranch: repo.default_branch ?? "main",
    private: repo.private,
    language: repo.language,
  };
}

export async function getRepoBranches(accessToken, owner, name) {
  const branches = await githubFetch(`/repos/${owner}/${name}/branches?per_page=100`, accessToken);
  return branches.map((branch) => branch.name);
}

/** Latest commit SHA of a branch, or null when the branch does not exist. */
export async function getBranchRefSha(accessToken, owner, name, branch) {
  const ref = encodeURIComponent(branch);
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${name}/git/ref/${ref}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "DeployMate-Studio",
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const error = new Error(`GitHub request failed (${response.status})`);
    error.status = 502;
    throw error;
  }
  const data = await response.json();
  return data.object?.sha ?? null;
}

/** Creates a branch ref pointing at an existing commit SHA. Returns { created, sha }. */
export async function createBranchRef(accessToken, owner, name, branch, fromSha) {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${name}/git/refs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "DeployMate-Studio",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: fromSha }),
  });
  if (response.status === 201) {
    const data = await response.json();
    return { created: true, sha: data.object?.sha ?? fromSha };
  }
  if (response.status === 422) {
    // Branch already exists — treat as success with its current head.
    const existing = await getBranchRefSha(accessToken, owner, name, branch);
    return { created: false, sha: existing ?? fromSha };
  }
  const error = new Error(`GitHub branch creation failed (${response.status})`);
  error.status = 502;
  throw error;
}

/**
 * Ensures a branch exists, branched off a source branch when newly created.
 * Never touches the default branch after creation.
 */
export async function ensureBranch(accessToken, owner, name, branch, fromBranch = "main") {
  const existingSha = await getBranchRefSha(accessToken, owner, name, branch);
  if (existingSha) {
    return { branch, sha: existingSha, created: false };
  }
  const fromSha = await getBranchRefSha(accessToken, owner, name, fromBranch);
  if (!fromSha) {
    const error = new Error(`Source branch "${fromBranch}" does not exist in the repository.`);
    error.status = 400;
    throw error;
  }
  const created = await createBranchRef(accessToken, owner, name, branch, fromSha);
  return { branch, sha: created.sha, created: true };
}

/**
 * Opens a pull request (head -> base). Used to surface the deploymate branch
 * against the project's default branch.
 */
export async function createPullRequest(accessToken, owner, name, { head, base, title, body }) {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${name}/pulls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "DeployMate-Studio",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      head,
      base,
      title: title?.trim() || `DeployMate: changes on ${head}`,
      body: body?.trim() || "Automated proposal from DeployMate Studio.",
    }),
  });
  if (!response.ok) {
    const error = new Error(`GitHub pull request failed (${response.status})`);
    error.status = response.status === 422 ? 400 : 502;
    throw error;
  }
  const data = await response.json();
  return { number: data.number, url: data.html_url, title: data.title, state: data.state, head: data.head?.ref, base: data.base?.ref };
}

const NOISE_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".cache",
  ".venv",
  "venv",
  "__pycache__",
  ".idea",
  ".vscode",
]);

/**
 * Returns the full recursive file tree for a repository using the git trees
 * API. The frontend renders it as a VS Code-style explorer. Empty / noisy
 * directories are pruned so the UI stays scannable (files inside permissions
 * folders are kept).
 */
export async function getRepoTree(accessToken, owner, name, branch = "main") {
  const ref = encodeURIComponent(branch || "main");
  const data = await githubFetch(`/repos/${owner}/${name}/git/trees/${ref}?recursive=1`, accessToken);

  const entries = Array.isArray(data.tree) ? data.tree : [];
  const paths = entries
    .map((entry) => ({ path: entry.path, type: entry.type }))
    .filter((entry) => {
      const parts = entry.path.split("/");
      return !parts.some((part) => NOISE_DIRS.has(part) || part.startsWith("."));
    });

  return {
    branch: branch || "main",
    truncated: Boolean(data.truncated),
    paths,
  };
}

/**
 * Fetches a single file's content via the contents API (base64-encoded).
 * Resolves to null for binary blobs or files too large to inline.
 */
export async function getRepoFile(accessToken, owner, name, path, branch = "main") {
  const encodedPath = encodeURIComponent(path);
  const ref = encodeURIComponent(branch || "main");
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${name}/contents/${encodedPath}?ref=${ref}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "DeployMate-Studio",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return { path, content: null, reason: "not_found" };
    const error = new Error(`GitHub request failed (${response.status})`);
    error.status = response.status === 503 ? 502 : response.status;
    throw error;
  }

  const data = await response.json();
  if (data.type !== "file") {
    return { path, content: null, reason: "not_a_file" };
  }
  if (data.encoding === "base64" && data.content) {
    try {
      const content = Buffer.from(data.content, "base64").toString("utf8");
      return { path, content, size: data.size, encoding: data.encoding };
    } catch {
      return { path, content: null, reason: "binary" };
    }
  }
  return { path, content: null, reason: "binary" };
}

/**
 * Commits a file change back to the repository by creating a commit through the
 * git data API (blob -> tree -> commit -> update ref). This is what makes an
 * accepted AI proposal real on GitHub — it hands nothing to the client.
 */
export async function commitRepoFile(accessToken, owner, name, branch, path, content, message) {
  if (typeof path !== "string" || !path.trim() || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => part === ".." || part === ".")) {
    const error = new Error("Invalid file path.");
    error.status = 400;
    throw error;
  }
  if (typeof content !== "string" || !content.length) {
    const error = new Error("File content is empty.");
    error.status = 400;
    throw error;
  }
  if (content.length > 500_000) {
    const error = new Error("File content is too large (500 KB limit).");
    error.status = 400;
    throw error;
  }
  if (typeof message !== "string" || !message.trim()) {
    const error = new Error("A commit message is required.");
    error.status = 400;
    throw error;
  }

  const ref = branch || "main";
  const repo = `repos/${owner}/${name}`;
  const baseRef = `/git/ref/heads/${encodeURIComponent(ref)}`;

  // 1) Blob with the new file content.
  const blob = await githubFetch(`/${repo}/git/blobs`, accessToken, {
    method: "POST",
    body: JSON.stringify({ content: Buffer.from(content, "utf8").toString("base64"), encoding: "base64" }),
  });

  // 2) Current branch head + its root tree.
  const head = await githubFetch(`/${repo}${baseRef}`, accessToken);
  const baseCommitSha = head.object.sha;
  const baseCommit = await githubFetch(`/${repo}/git/commits/${baseCommitSha}`, accessToken);

  // 3) Tree with the updated path on top of the base tree.
  const tree = await githubFetch(`/${repo}/git/trees`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: [{ path, mode: "100644", type: "blob", sha: blob.sha }],
    }),
  });

  // 4) Commit pointing at the new tree.
  const commit = await githubFetch(`/${repo}/git/commits`, accessToken, {
    method: "POST",
    body: JSON.stringify({ message: message.trim(), tree: tree.sha, parents: [baseCommitSha] }),
  });

  // 5) Fast-forward the branch ref (never force).
  await githubFetch(`/${repo}${baseRef}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  return { file: path, branch: ref, commitSha: commit.sha, message: message.trim() };
}
