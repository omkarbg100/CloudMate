import { Router } from "express";
import analysisRoutes from "./analysis.routes.js";
import architectureRoutes from "./architecture.routes.js";
import authRoutes from "./auth.routes.js";
import awsRoutes from "./aws.routes.js";
import chatRoutes from "./chat.routes.js";
import codeRoutes from "./code.routes.js";
import deploymentRoutes from "./deployment.routes.js";
import githubRoutes from "./github.routes.js";
import monitoringRoutes from "./monitoring.routes.js";
import projectRoutes from "./project.routes.js";
import securityRoutes from "./security.routes.js";
import validationRoutes from "./validation.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "deploymate-backend", timestamp: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/github", githubRoutes);
router.use("/aws", awsRoutes);

// Project collection + per-project sub-resources.
router.use("/projects", projectRoutes);
router.use("/projects/:projectId", analysisRoutes);
router.use("/projects/:projectId", architectureRoutes);
router.use("/projects/:projectId", securityRoutes);
router.use("/projects/:projectId", validationRoutes);
router.use("/projects/:projectId", codeRoutes);

router.use("/deployments", deploymentRoutes);
router.use("/monitoring", monitoringRoutes);
router.use("/chat", chatRoutes);

export default router;
