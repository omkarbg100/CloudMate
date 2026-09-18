import {
  listUserRepos,
  getRepoTree,
  getRepoFile,
  commitRepoFile,
  ensureBranch,
  getRepoBranches,
  getBranchRefSha,
  createPullRequest,
} from "../services/githubService.js";
import { scanForSecrets } from "../services/secretScanner.js";
import { requireOwnedProject } from "../services/projectService.js";

export const DEPLOYMATE_BRANCH = "deploymate";

/**
 * Resolve which branch the explorer shows: the deploymate branch when it
 * exists, otherwise the project's source branch.
 */
async function resolveBrowseBranch(accessToken, project) {
  if (project.deploymateBranch) {
    const sha = await getBranchRefSha(accessToken, project.repoOwner, project.repoName, project.deploymateBranch);
    if (sha) return project.deploymateBranch;
  }
  return project.branch || project.defaultBranch || "main";
}

/** True when the request carries a GitHub connection and a real token. */
function hasGithub(req) {
  return Boolean(req.user && req.user.accessToken);
}

/**
 * GET /api/github/repos
 * Lists repositories the authenticated user can access, using their GitHub
 * OAuth token. Demo users have no token, so an empty list is returned.
 */
export async function listRepos(req, res, next) {
  try {
    if (!hasGithub(req)) {
      return res.json({ repos: [], message: "Connect GitHub to list your repositories." });
    }
    const repos = await listUserRepos(req.user.accessToken);
    res.json({ repos });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/github/projects/:projectId/tree
 * Full recursive file tree for the project's repository, rendered as the
 * VS Code-style explorer in the Repository view. Shows the deploymate branch
 * when it exists, otherwise the project's source branch.
 */
export async function getProjectFiles(req, res, next) {
  try {
    if (!hasGithub(req)) {
      return res.status(401).json({ error: "Connect GitHub to browse repository files." });
    }
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const branch = await resolveBrowseBranch(req.user.accessToken, project);
    const tree = await getRepoTree(req.user.accessToken, project.repoOwner, project.repoName, branch);
    res.json(tree);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/github/projects/:projectId/file?path=src/index.js
 * Content of a single repository file (resolved from the deploymate branch).
 */
export async function getProjectFileContent(req, res, next) {
  try {
    if (!hasGithub(req)) {
      return res.status(401).json({ error: "Connect GitHub to browse repository files." });
    }
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const branch = await resolveBrowseBranch(req.user.accessToken, project);
    const file = await getRepoFile(
      req.user.accessToken,
      project.repoOwner,
      project.repoName,
      req.query.path ?? "",
      branch
    );
    res.json(file);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/github/projects/:projectId/branches
 * Lists repository branches so the UI can show the agent's branch state.
 */
export async function getProjectBranches(req, res, next) {
  try {
    if (!hasGithub(req)) {
      return res.status(401).json({ error: "Connect GitHub to browse branches." });
    }
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const branches = await getRepoBranches(req.user.accessToken, project.repoOwner, project.repoName);
    res.json({
      branches,
      defaultBranch: project.defaultBranch || project.branch,
      deploymateBranch: project.deploymateBranch || DEPLOYMATE_BRANCH,
      deploymateExists: branches.includes(project.deploymateBranch || DEPLOYMATE_BRANCH),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/github/projects/:projectId/branch
 * Creates (or confirms) the "deploymate" branch from the project's default
 * branch. The coding agent commits ONLY to this branch — never main/master.
 */
export async function ensureDeploymateBranch(req, res, next) {
  try {
    if (!hasGithub(req)) {
      return res.status(401).json({ error: "Connect GitHub to create the deploymate branch." });
    }
    const project = await requireOwnedProject(req.user._id, req.params.projectId);

    const sourceBranch = project.defaultBranch || project.branch || "main";
    const targetBranch = project.deploymateBranch || DEPLOYMATE_BRANCH;

    const result = await ensureBranch(req.user.accessToken, project.repoOwner, project.repoName, targetBranch, sourceBranch);

    project.defaultBranch = project.defaultBranch || sourceBranch;
    project.deploymateBranch = targetBranch;
    project.lastCommitSha = result.sha;
    await project.save();

    res.json({ ok: true, branch: result.branch, sha: result.sha, created: result.created, fromBranch: sourceBranch, note: "Commits are created only on this branch." });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/github/projects/:projectId/pr
 * Opens (or checks) a pull request from the deploymate branch into the
 * project's default branch. Returns the existing PR if one already exists.
 */
export async function ensurePullRequest(req, res, next) {
  try {
    if (!hasGithub(req)) {
      return res.status(401).json({ error: "Connect GitHub to create a pull request." });
    }
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const base = project.defaultBranch || project.branch || "main";
    const head = project.deploymateBranch || DEPLOYMATE_BRANCH;

    const result = await createPullRequest(req.user.accessToken, project.repoOwner, project.repoName, {
      head,
      base,
      title: req.body?.title,
      body: req.body?.body,
    });

    res.json({ ok: true, ...result, head, base });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/github/projects/:projectId/commit
 * Applies an accepted AI proposal as a real commit to the project's
 * DEPLOYMATE branch (auto-created when missing) — never main/master.
 * Runs the secret scanner; commits containing credentials are rejected.
 * Body: { file, content, message }.
 */
export async function commitProjectFile(req, res, next) {
  try {
    if (!hasGithub(req)) {
      return res.status(401).json({ error: "Connect GitHub to apply changes. Create the project from a real GitHub login." });
    }
    const project = await requireOwnedProject(req.user._id, req.params.projectId);

    const { file, content, message } = req.body ?? {};
    if (typeof file !== "string" || typeof content !== "string") {
      return res.status(400).json({ error: "file and content are required." });
    }

    // Secret detection — blocks the commit before anything reaches GitHub.
    const findings = scanForSecrets([{ path: file, content }]);
    if (findings.length) {
      return res.status(400).json({
        error: "Commit blocked: potential secret detected in the proposed change.",
        findings: findings.map((f) => ({ path: f.path, category: f.category })),
      });
    }

    const targetBranch = project.deploymateBranch || DEPLOYMATE_BRANCH;
    const sourceBranch = project.defaultBranch || project.branch || "main";
    const branchInfo = await ensureBranch(req.user.accessToken, project.repoOwner, project.repoName, targetBranch, sourceBranch);

    const result = await commitRepoFile(
      req.user.accessToken,
      project.repoOwner,
      project.repoName,
      targetBranch,
      file,
      content,
      message || `feat: apply AI-proposed improvement from DeployMate (${file})`
    );

    project.deploymateBranch = targetBranch;
    project.defaultBranch = project.defaultBranch || sourceBranch;
    project.lastCommitSha = result.commitSha;
    await project.save();

    res.json({ ok: true, ...result, deploymateBranch: targetBranch });
  } catch (error) {
    next(error);
  }
}