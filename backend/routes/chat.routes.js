import { Router } from "express";
import { z } from "zod";
import { chat } from "../controllers/chat.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const chatSchema = z.object({
  projectId: z.string().min(1),
  message: z.string().min(1),
});

router.use(requireAuth);

router.post("/", validateBody(chatSchema), chat);

export default router;
