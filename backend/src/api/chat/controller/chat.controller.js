import {
  streamConversationService,
  listChats,
  createChat,
  renameChat,
  deleteChat,
  getChatMessages,
} from "../service/chat.service.js";

export const listChatsController = async (req, res, next) => {
  try {
    const data = await listChats(req.user.id);
    res.status(200).json({ status: true, data });
  } catch (error) {
    next(error);
  }
};

export const createChatController = async (req, res, next) => {
  try {
    const title = req.body?.title || "New chat";
    const data = await createChat(req.user.id, title);
    res.status(201).json({ status: true, data });
  } catch (error) {
    next(error);
  }
};

export const renameChatController = async (req, res, next) => {
  try {
    const data = await renameChat(req.user.id, req.params.id, req.body?.title);
    res.status(200).json({ status: true, data });
  } catch (error) {
    next(error);
  }
};

export const deleteChatController = async (req, res, next) => {
  try {
    const data = await deleteChat(req.user.id, req.params.id);
    res.status(200).json({ status: true, data });
  } catch (error) {
    next(error);
  }
};

export const getChatMessagesController = async (req, res, next) => {
  try {
    const data = await getChatMessages(req.user.id, req.params.id);
    res.status(200).json({ status: true, data });
  } catch (error) {
    next(error);
  }
};

export const streamConversationController = async (req, res, next) => {
  try {
    const { question, chatId, image } = req.body ?? {};

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    await streamConversationService(req.user.id, chatId, question, res, image);
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    } else {
      try {
        res.write(
          `event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`
        );
        res.end();
      } catch (_) {}
    }
  }
};
