import db from "../../../../db/db.config.js";
import { GoogleGenAI } from "@google/genai";


const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const geminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const getRecentConversationrows = async (limit = 5) => {
  const normlizedLimit = Number.parseInt(limit, 10);

  const safeLimit =
    Number.isNaN(normlizedLimit) || normlizedLimit <= 0
      ? 20
      : normlizedLimit;

  const [rows] = await db.execute(
    `SELECT id, role, content, created_at
      FROM conversations
      ORDER BY id DESC
      LIMIT ${safeLimit}`,
  );

  return rows.reverse();
};

const generateAssistsntAnswer = async ({ question, historyRows }) => {
  // format history for gemini startChat
  const formattedHistory = historyRows.map((row) => ({
    role: row.role === "assistant" ? "model" : "user",
    parts: [{ text: row.content }],
  }));

  const chat = geminiClient.chats.create({
    model: GEMINI_MODEL,
    config: {
      maxOutputTokens: 1024,
    },
    history: formattedHistory,
  });

  const result = await chat.sendMessage({
    message: question,
  });

  return {
    text: result.text,
    totalTokens: result.usageMetadata?.totalTokenCount ?? 0,
  };
};

const getMessageById = async (messageId) => {
  const [rows] = await db.execute(
    `SELECT id, role, content, token_count, created_at
      FROM conversations
      WHERE id = ?
      LIMIT 1`,
    [messageId],
  );

  if (!rows[0]) return null;

  return {
    id: rows[0].id,
    role: rows[0].role,
    content: rows[0].content,
    tokenCount: Number(rows[0].token_count || 0),
    createdAt: rows[0].created_at,
  };
};

export async function creatConversationService(question) {
  // validate the question input
  if (typeof question !== "string" || !question.trim()) {
    const error = new Error("question is required");
    error.status = 400;
    throw error;
  }
  // get recent conversation
  const historyRows = await getRecentConversationrows(5);
  // insert the new question into the database
  const [result] = await db.execute(
    `INSERT INTO conversations (content, role)
     VALUES (?, "user")`,
    [question.trim()],
  );

  const { text, totalTokens } = await generateAssistsntAnswer({
    question: question.trim(),
    historyRows,
  });

  const [creatAssistantMessageResult] = await db.execute(
    `INSERT INTO conversations (content, role, token_count)
     VALUES (?, ?, ?)`,
    [text, "assistant", totalTokens],
  );

  const userConversation = await getMessageById(result.insertId);

  const assistantConversation = await getMessageById(
    creatAssistantMessageResult.insertId,
  );

  return {
    userConversation,
    assistantConversation,
  };
  
}
