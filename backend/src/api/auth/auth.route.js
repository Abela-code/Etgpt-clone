import express from "express";
import {
  registerController,
  loginController,
  meController,
} from "./controller/auth.controller.js";
import { requireAuth } from "../../middleware/auth.js";

const authRouter = express.Router();

authRouter.post("/register", registerController);
authRouter.post("/login", loginController);
authRouter.get("/me", requireAuth, meController);

export default authRouter;
