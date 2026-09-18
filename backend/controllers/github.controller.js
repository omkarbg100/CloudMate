import { listUserRepos, getRepoTree, getRepoFile, commitRepoFile } from "../services/githubService.js";
import { requireOwnedProject } from "../services/projectService.js";

/**
 * GET /api/github/repos
 * Lists repositories the authenticated user can access, using their GitHub
 * OAuth token. Demo users have no token, so an empty list is returned.
 */
export async function listRepos(req, res, next) {
  try {
    if (!req.user.accessToken) {
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
 * VS Code-style explorer in the Repository view.
 */
export async function getProjectFiles(req, res, next) {
  try {
    if (!req.user.accessToken) {
      return res.status(401).json({ error: "Connect GitHub to browse repository files." });
    }
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const tree = await getRepoTree(
      req.user.accessToken,
      project.repoOwner,
      project.repoName,
      project.branch
    );
    res.json(tree);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/github/projects/:projectId/file?path=src/index.js
 * Content of a single repository file.
 */
export async function getProjectFileContent(req, res, next) {
  try {
    if (!req.user.accessToken) {
      return res.status(401).json({ error: "Connect GitHub to browse repository files." });
    }
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const file = await getRepoFile(
      req.user.accessToken,
      project.repoOwner,
      project.repoName,
      req.query.path ?? "",
      project.branch
    );
    res.json(file);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/github/projects/:projectId/commit
 * Applies an accepted AI proposal as a real commit to the project's branch.
 * Body: { file, content, message }. Demo users have no GitHub token, so this
 * requires a real GitHub connection.
 */
export async function commitProjectFile(req, res, next) {
  try {
    if (!req.user.accessToken) {
      return res.status(401).json({ error: "Connect GitHub to apply changes. Create the project from a real GitHub login." });
    }
    const project = await requireOwnedProject(req.user._id, req.params.projectId);

    const { file, content, message } = req.body ?? {};
    if (typeof file !== "string" || typeof content !== "string") {
      return res.status(400).json({ error: "file and content are required." });
    }

    const result = await commitRepoFile(
      req.user.accessToken,
      project.repoOwner,
      project.repoName,
      project.branch,
      file,
      content,
      message || `chore: apply AI-proposed change to ${file}`
    );

    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
}
