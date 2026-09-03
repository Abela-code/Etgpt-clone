import {
  creatConversationService,
  getRecentConversationrows,
} from "../service/chat.service.js";

export const createConversationController = async (req, res, next) => {
  try {
    const { question } = req.body ?? {};

    const result = await creatConversationService(question);

    return res.status(201).json({
      status: true,
      message: "Conversation created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export async function getConversationController(req, res) {
  try {
    const result = await getRecentConversationrows(100);
    res.status(200).json({
      status: true,
      message: "conversation fetched successfully.",
      data: result,
    });
  } catch (error) {
    throw error;
  }
}
