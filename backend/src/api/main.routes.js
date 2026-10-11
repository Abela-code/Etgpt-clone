import express from "express";
import chatRouter from "./chat/chat.route.js";
import authRouter from "./auth/auth.route.js";

const mainRouter = express.Router();

mainRouter.use("/auth", authRouter);
mainRouter.use("/chat", chatRouter);

export default mainRouter;
