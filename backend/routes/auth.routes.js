import { Router } from "express";
import {
  demoLogin,
  githubCallback,
  githubLogin,
  logout,
  me,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/github", githubLogin);
router.get("/callback", githubCallback);
router.post("/demo", demoLogin);
router.get("/me", requireAuth, me);
router.post("/logout", logout);

export default router;
