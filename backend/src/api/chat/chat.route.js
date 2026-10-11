import express from "express";
import {
  listChatsController,
  createChatController,
  renameChatController,
  deleteChatController,
  getChatMessagesController,
  streamConversationController,
} from "./controller/chat.controller.js";
import { requireAuth } from "../../middleware/auth.js";

const chatRouter = express.Router();

chatRouter.use(requireAuth);

chatRouter.get("/chats", listChatsController);
chatRouter.post("/chats", createChatController);
chatRouter.patch("/chats/:id", renameChatController);
chatRouter.delete("/chats/:id", deleteChatController);
chatRouter.get("/chats/:id/messages", getChatMessagesController);
chatRouter.post("/conversations/stream", streamConversationController);

export default chatRouter;
