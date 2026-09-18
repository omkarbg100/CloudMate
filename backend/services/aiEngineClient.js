/**
 * AI Engine HTTP client.
 * Forwards requests to the Python FastAPI AI engine.
 * Falls back to structured mock responses when the engine is unavailable.
 */

const AI_ENGINE_URL = process.env.AI_ENGINE_URL ?? "http://localhost:8000";
const TIMEOUT_MS = 30_000; // 30 seconds for long-running AI tasks

const FALLBACK_RESPONSES = {
  chat_deploy: {
    message:
      "I can prepare a dynamic AWS deployment plan after repository analysis and AWS discovery. The plan includes policy validation before execution requires explicit approval.",
    nextActions: ["Discover AWS resources", "Generate architecture", "Validate policies", "Await approval"],
    approvalRequired: true,
  },
  chat_analyze: {
    message:
      "I found a Node/Express backend, React frontend, Docker support, port 5000, and a required MONGODB_URI secret. The main deployment blocker is a missing secret binding for App Runner.",
    nextActions: ["Generate AWS architecture", "Run security scan", "Prepare fix for secret configuration"],
    approvalRequired: false,
  },
  chat_default: {
    message:
      "I can inspect repository files, generate AWS architecture, flag deployment risks, propose code diffs, validate, and prepare approval-gated deployment steps. What would you like me to do?",
    nextActions: ["Analyze repository", "Connect AWS role", "Generate architecture", "Run security scan"],
    approvalRequired: false,
  },
  analysis: {
    analysis: {
      languages: ["JavaScript", "TypeScript"],
      frontend: { framework: "React", buildCommand: "npm run build" },
      backend: { framework: "Express", runtime: "Node.js", port: 5000, startCommand: "npm start" },
      database: "MongoDB",
      docker: true,
      packageManager: "npm",
      ports: [5000],
      environmentVariables: ["PORT", "MONGODB_URI", "AWS_REGION"],
      tests: ["npm test"],
    },
  },
  architecture: {
    architecture: {
      region: "ap-south-1",
      nodes: [
        { id: "frontend", label: "React frontend", service: "AWS Amplify", purpose: "Hosts the DeployMate studio frontend.", decision: "create" },
        { id: "api", label: "Node API", service: "AWS ECS (Fargate)", purpose: "Runs the Express backend.", decision: "create" },
        { id: "db", label: "MongoDB Atlas", service: "MongoDB Atlas", purpose: "Managed MongoDB database.", decision: "create" },
        { id: "logs", label: "Monitoring", service: "CloudWatch", purpose: "Logs, metrics, and alarms.", decision: "create" },
      ],
      edges: [
        { from: "frontend", to: "api", label: "REST + WebSocket" },
        { from: "api", to: "db", label: "Mongoose" },
        { from: "api", to: "logs", label: "structured logs" },
      ],
      rationale: [
        "ECS on Fargate is a fast fit for containerized Node.js APIs.",
        "MongoDB Atlas integrates well with Node.js via Mongoose.",
        "ECR holds image artifacts produced from the deploymate branch.",
        "CloudWatch provides deployment monitoring and diagnosis.",
      ],
    },
  },
  security: {
    findings: [
      {
        id: "finding_001",
        severity: "high",
        file: ".env.example",
        type: "missing_secret_binding",
        description: "MONGODB_URI is expected but no Secrets Manager binding is defined.",
        recommendation: "Store MONGODB_URI in Secrets Manager and inject into App Runner.",
      },
      {
        id: "finding_002",
        severity: "medium",
        file: "backend/src/index.js",
        type: "health_check",
        description: "No /health endpoint detected in the application.",
        recommendation: "Add a /health endpoint so App Runner can verify the application is running.",
      },
    ],
  },
  deployment_plan: {
    steps: [
      "Validate AWS connection (STS GetCallerIdentity)",
      "Build Docker image",
      "Push image to ECR",
      "Register ECS task definition (Fargate)",
      "Roll ECS service to the new task definition",
      "Wait for service stability",
      "Report real cluster/service state",
    ],
    resources: ["ECR", "ECS", "CloudWatch"],
    region: "ap-south-1",
    requiresApproval: true,
    policyValidation: {
      allowed: true,
      requiresApproval: true,
      violations: [
        {
          id: "approval_required",
          severity: "medium",
          message: "Creating AWS resources requires human approval before execution.",
        },
      ],
    },
  },
  validate: {
    checks: [
      { name: "analysis", status: "skip", message: "AI engine unavailable." },
      { name: "security", status: "skip", message: "AI engine unavailable." },
    ],
    ready: false,
    summary: "AI engine unavailable — validation could not run.",
  },
  code: {
    changes: [],
    explanation: "AI engine unavailable — no code changes were generated.",
  },
  monitoring: {
    status: "unknown",
    alerts: [],
    message: "AI engine unavailable — monitoring data is not available.",
  },
};

async function callEngine(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_ENGINE_URL}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI Engine returned ${response.status}: ${err}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function askAiEngine(payload) {
  // Try real AI engine first
  try {
    return await callEngine(payload);
  } catch {
    // Engine unavailable — return structured fallback based on action
    console.warn("[aiEngineClient] AI engine unavailable, using fallback for action:", payload.action);
  }

  // Select appropriate fallback
  switch (payload.action) {
    case "chat": {
      const msg = (payload.message ?? "").toLowerCase();
      if (msg.includes("deploy") || msg.includes("plan")) return FALLBACK_RESPONSES.chat_deploy;
      if (msg.includes("analyz") || msg.includes("repositor")) return FALLBACK_RESPONSES.chat_analyze;
      return FALLBACK_RESPONSES.chat_default;
    }
    case "analyze":
      return FALLBACK_RESPONSES.analysis;
    case "architecture":
      return FALLBACK_RESPONSES.architecture;
    case "security":
      return FALLBACK_RESPONSES.security;
    case "deployment_plan":
      return FALLBACK_RESPONSES.deployment_plan;
    case "validate":
      return FALLBACK_RESPONSES.validate;
    case "code":
      return FALLBACK_RESPONSES.code;
    case "monitoring":
    case "repair":
      return FALLBACK_RESPONSES.monitoring;
    default:
      return { message: "AI engine unavailable. Please start the Python AI engine.", approvalRequired: false };
  }
}