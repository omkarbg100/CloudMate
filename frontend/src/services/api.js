const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

async function request(path, init = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    credentials: "include",
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  return response.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function getMe() {
  return request("/auth/me");
}

export function logout() {
  return request("/auth/logout", { method: "POST" });
}

export function loginWithGitHub() {
  window.location.href = `${API_BASE_URL}/auth/github`;
}

export function loginDemo() {
  return request("/auth/demo", { method: "POST" });
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function getProjects() {
  return request("/projects");
}

export function createProject(input) {
  return request("/projects", { method: "POST", body: JSON.stringify(input) });
}

export function getProject(projectId) {
  return request(`/projects/${projectId}`);
}

export function deleteProject(projectId) {
  return request(`/projects/${projectId}`, { method: "DELETE" });
}

// ─── GitHub ───────────────────────────────────────────────────────────────────

export function getRepos() {
  return request("/github/repos");
}

export function getRepoTree(projectId) {
  return request(`/github/projects/${projectId}/tree`);
}

export function getRepoFile(projectId, path) {
  return request(`/github/projects/${projectId}/file?path=${encodeURIComponent(path)}`);
}

export function getRepoBranches(projectId) {
  return request(`/github/projects/${projectId}/branches`);
}

export function ensureDeploymateBranch(projectId) {
  return request(`/github/projects/${projectId}/branch`, { method: "POST" });
}

export function commitRepoFile(projectId, { file, content, message }) {
  return request(`/github/projects/${projectId}/commit`, {
    method: "POST",
    body: JSON.stringify({ file, content, message }),
  });
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

export function analyzeProject(projectId) {
  return request(`/projects/${projectId}/analyze`, { method: "POST" });
}

export function getAnalysis(projectId) {
  return request(`/projects/${projectId}/analysis`);
}

// ─── Architecture ─────────────────────────────────────────────────────────────

export function generateArchitecture(projectId) {
  return request(`/projects/${projectId}/architecture`, { method: "POST" });
}

export function getArchitecture(projectId) {
  return request(`/projects/${projectId}/architecture`);
}

// ─── Security ─────────────────────────────────────────────────────────────────

export function runSecurityScan(projectId) {
  return request(`/projects/${projectId}/security/scan`, { method: "POST" });
}

export function getSecurity(projectId) {
  return request(`/projects/${projectId}/security`);
}

// ─── Code ─────────────────────────────────────────────────────────────────────

export function generateCode(projectId, payload = {}) {
  return request(`/projects/${projectId}/code`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateProject(projectId, payload = {}) {
  return request(`/projects/${projectId}/validate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Deployments ──────────────────────────────────────────────────────────────

export function createDeploymentPlan(projectId, awsConnectionId) {
  return request("/deployments/plan", {
    method: "POST",
    body: JSON.stringify({ projectId, awsConnectionId }),
  });
}

export function approveDeployment(deploymentId) {
  return request(`/deployments/${deploymentId}/approve`, { method: "POST" });
}

export function rejectDeployment(deploymentId) {
  return request(`/deployments/${deploymentId}/reject`, { method: "POST" });
}

export function getDeployment(deploymentId) {
  return request(`/deployments/${deploymentId}`);
}

export function getDeploymentLogs(deploymentId) {
  return request(`/deployments/${deploymentId}/logs`);
}

export function rollbackDeployment(deploymentId) {
  return request(`/deployments/${deploymentId}/rollback`, { method: "POST" });
}

// ─── Monitoring ───────────────────────────────────────────────────────────────

export function getHealth(projectId) {
  return request(`/monitoring/${projectId}/health`);
}

export function getMetrics(projectId) {
  return request(`/monitoring/${projectId}/metrics`);
}

export function getMetricsLogs(projectId) {
  return request(`/monitoring/${projectId}/logs`);
}

export function getAlerts(projectId) {
  return request(`/monitoring/${projectId}/alerts`);
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export function sendChatMessage(projectId, message) {
  return request("/chat", {
    method: "POST",
    body: JSON.stringify({ projectId, message }),
  });
}

// ─── AWS Connections ──────────────────────────────────────────────────────────

export function getAwsConnections() {
  return request("/aws/connections");
}

export function connectAwsAccount(input) {
  return request("/aws/connect", { method: "POST", body: JSON.stringify(input) });
}

export function getAwsStatus(projectId) {
  return request(`/aws/status?projectId=${encodeURIComponent(projectId)}`);
}

export function testAwsConnection(projectId) {
  return request("/aws/test", { method: "POST", body: JSON.stringify({ projectId }) });
}

export function discoverProjectAws(projectId) {
  return request("/aws/discover", { method: "POST", body: JSON.stringify({ projectId }) });
}

export function getAwsResources(projectId) {
  return request(`/aws/resources?projectId=${encodeURIComponent(projectId)}`);
}

export function disconnectAwsAccount(projectId) {
  return request("/aws/disconnect", { method: "DELETE", body: JSON.stringify({ projectId }) });
}
