/**
 * Deployment lifecycle projection.
 *
 * Derives the "what stage is my deployment at?" story from the real API
 * payloads. Each stage reports its own state + a short, human line to show
 * in the Overview timeline.
 */

const stage = (key, label, state, line) => ({ key, label, state, line });

/**
 * @param {{project, analysis, architecture, security, validation, changes, deploymentPlan, deploymentEvents, health}} source
 */
export function projectLifecycle(source) {
  const {
    project,
    analysis,
    architecture,
    security,
    changes,
    validation,
    deploymentPlan,
    deploymentEvents,
    health,
  } = source;

  const analyzing = project?.status === "analyzing";
  const securityFindings =
    security?.summary
      ? security.summary.critical + security.summary.high + security.summary.medium
      : (security?.findings?.length ?? 0);

  const deploymentProgressStage = latestDeploymentStage(deploymentEvents, deploymentPlan);

  return [
    stage(
      "repository",
      "Repository",
      "connected",
      "Connected — GitHub repository linked"
    ),
    stage(
      "analysis",
      "Analysis",
      analyzing ? "analyzing" : analysis ? "success" : "not_started",
      analyzing
        ? "Repository agent is analyzing…"
        : analysis
          ? "Repository analyzed"
          : "Not started"
    ),
    stage(
      "architecture",
      "Architecture",
      architecture?.nodes?.length ? "success" : "not_started",
      architecture?.nodes?.length ? "Architecture generated" : "Not generated"
    ),
    stage(
      "security",
      "Security",
      security?.scanStatus === "completed"
        ? securityFindings > 0
          ? "warning"
          : "success"
        : "not_started",
      security?.scanStatus === "completed"
        ? securityFindings > 0
          ? `${securityFindings} finding(s) to review`
          : "No issues found"
        : "Not scanned"
    ),
    stage(
      "changes",
      "Changes",
      changes ? "success" : "not_started",
      changes ? "AI changes proposed" : "No changes proposed"
    ),
    stage(
      "validation",
      "Validation",
      validation
        ? validation.ready
          ? "success"
          : "blocked"
        : "not_started",
      validation
        ? validation.ready
          ? "Validation passed"
          : "Validation blocked"
        : "Not run"
    ),
    stage(
      "deployment",
      "Deployment",
      project?.status === "deployed"
        ? "deployed"
        : ["deploying", "awaiting_approval"].includes(project?.status)
          ? project.status
          : deploymentProgressStage ?? (deploymentPlan ? "awaiting_approval" : "not_started"),
      deploymentProgressStage || project?.status === "deployed"
        ? deploymentProgressStage ?? "Deployment live"
        : project?.status === "awaiting_approval" || deploymentPlan
          ? "Awaiting your approval"
          : "No deployment yet"
    ),
    stage(
      "monitoring",
      "Monitoring",
      project?.status === "deployed" ? "running" : "not_started",
      health?.status ?? project?.health
        ? project?.status === "deployed"
          ? "Operational monitoring"
          : "Will start after deployment"
        : "Not started"
    ),
  ];
}

/** Overall project status shown at the top of Overview. */
export function projectStatus(source) {
  const { project, analysis, architecture, security, validation, deploymentEvents, health } =
    source;

  if (project?.status === "failed") return "DEPLOYMENT FAILED";
  if (project?.status === "deployed") return "DEPLOYED";
  if (project?.status === "deploying") return "DEPLOYING";
  if (project?.status === "analyzing") return "ANALYZING";

  const validating = validation ? (validation.ready ? "READY TO DEPLOY" : "BLOCKED") : null;
  if (validating) return validating;

  if (project?.status === "awaiting_approval") return "AWAITING APPROVAL";

  const hasOpenFindings =
    security?.scanStatus === "completed" &&
    ((security.summary?.critical ?? 0) > 0 || (security.summary?.high ?? 0) > 0);
  if (hasOpenFindings) return "ACTION REQUIRED";

  if (architecture?.nodes?.length) return "READY TO DEPLOY";
  if (analysis && !architecture?.nodes?.length) return "NEXT STEP AVAILABLE";

  return "SETUP INCOMPLETE";
}

function latestDeploymentStage(events, deploymentPlan) {
  if (!events) return null;
  return events
    .slice()
    .reverse()
    .find((e) => ["DEPLOYMENT_STARTED", "DEPLOYMENT_PROGRESS", "DEPLOYMENT_COMPLETED", "DEPLOYMENT_FAILED"].includes(e.type))?.type ?? null;
}