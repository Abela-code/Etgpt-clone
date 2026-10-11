import db from "../../../../db/db.config.js";
import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const geminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function mapGeminiError(err) {
  const msg = err?.message || String(err);
  const lower = msg.toLowerCase();
  if (lower.includes("api key") || lower.includes("api_key") || lower.includes("401") || lower.includes("403")) {
    const e = new Error("Invalid or missing Gemini API key. Check backend/.env");
    e.status = 401;
    e.code = "INVALID_API_KEY";
    return e;
  }
  if (lower.includes("rate") || lower.includes("429") || lower.includes("quota")) {
    const e = new Error("Rate limit exceeded. Please wait a moment and try again.");
    e.status = 429;
    e.code = "RATE_LIMIT";
    return e;
  }
  if (lower.includes("model") || lower.includes("not found")) {
    const e = new Error(`Model error: ${msg}. Try GEMINI_MODEL=gemini-2.5-flash in .env`);
    e.status = 400;
    e.code = "MODEL_ERROR";
    return e;
  }
  const e = new Error(msg || "AI service error");
  e.status = 502;
  e.code = "AI_ERROR";
  return e;
}

function mapDbError(err) {
  const msg = err?.message || String(err);
  if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("connect")) {
    const e = new Error("Database is unreachable. Is MySQL running?");
    e.status = 503;
    e.code = "DB_DOWN";
    return e;
  }
  const e = new Error(msg);
  e.status = 500;
  e.code = "DB_ERROR";
  return e;
}

async function assertChatOwner(chatId, userId) {
  const [rows] = await db.execute(
    `SELECT id FROM chats WHERE id = ? AND user_id = ? LIMIT 1`,
    [chatId, userId]
  );
  if (!rows[0]) {
    const e = new Error("Chat not found");
    e.status = 404;
    throw e;
  }
}

export async function listChats(userId) {
  try {
    const [rows] = await db.execute(
      `SELECT id, title, created_at, updated_at
       FROM chats WHERE user_id = ?
       ORDER BY updated_at DESC`,
      [userId]
    );
    return rows;
  } catch (err) {
    throw mapDbError(err);
  }
}

export async function createChat(userId, title = "New chat") {
  try {
    const [result] = await db.execute(
      `INSERT INTO chats (user_id, title) VALUES (?, ?)`,
      [userId, title || "New chat"]
    );
    const [rows] = await db.execute(
      `SELECT id, title, created_at, updated_at FROM chats WHERE id = ?`,
      [result.insertId]
    );
    return rows[0];
  } catch (err) {
    throw mapDbError(err);
  }
}

export async function renameChat(userId, chatId, title) {
  if (!title?.trim()) {
    const e = new Error("Title is required");
    e.status = 400;
    throw e;
  }
  try {
    const [result] = await db.execute(
      `UPDATE chats SET title = ? WHERE id = ? AND user_id = ?`,
      [title.trim().slice(0, 255), chatId, userId]
    );
    if (result.affectedRows === 0) {
      const e = new Error("Chat not found");
      e.status = 404;
      throw e;
    }
    const [rows] = await db.execute(
      `SELECT id, title, created_at, updated_at FROM chats WHERE id = ?`,
      [chatId]
    );
    return rows[0];
  } catch (err) {
    if (err.status) throw err;
    throw mapDbError(err);
  }
}

export async function deleteChat(userId, chatId) {
  try {
    const [result] = await db.execute(
      `DELETE FROM chats WHERE id = ? AND user_id = ?`,
      [chatId, userId]
    );
    if (result.affectedRows === 0) {
      const e = new Error("Chat not found");
      e.status = 404;
      throw e;
    }
    return { deleted: true, id: Number(chatId) };
  } catch (err) {
    if (err.status) throw err;
    throw mapDbError(err);
  }
}

export async function getChatMessages(userId, chatId, limit = 100) {
  try {
    await assertChatOwner(chatId, userId);
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const [rows] = await db.execute(
      `SELECT id, chat_id, role, content, token_count, created_at
       FROM conversations WHERE chat_id = ?
       ORDER BY id ASC LIMIT ${safeLimit}`,
      [chatId]
    );
    return rows.map((r) => ({ ...r, role: String(r.role).toLowerCase() }));
  } catch (err) {
    if (err.status) throw err;
    throw mapDbError(err);
  }
}

async function touchChat(chatId) {
  await db.execute(
    `UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [chatId]
  );
}

async function maybeSetTitleFromQuestion(chatId, question) {
  const [rows] = await db.execute(`SELECT title FROM chats WHERE id = ?`, [chatId]);
  if (!rows[0]) return;
  if (rows[0].title === "New chat") {
    const title =
      question.trim().slice(0, 60) + (question.trim().length > 60 ? "…" : "");
    await db.execute(`UPDATE chats SET title = ? WHERE id = ?`, [title, chatId]);
  }
}

async function getHistoryForChat(chatId, limit = 10) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const [rows] = await db.execute(
    `SELECT role, content FROM conversations
     WHERE chat_id = ? ORDER BY id DESC LIMIT ${safeLimit}`,
    [chatId]
  );
  return rows.reverse().map((r) => ({
    role: String(r.role).toLowerCase() === "assistant" ? "model" : "user",
    parts: [{ text: r.content }],
  }));
}

export async function streamConversationService(userId, chatId, question, res, image = null) {
  if (typeof question !== "string" || !question.trim()) {
    const error = new Error("question is required");
    error.status = 400;
    throw error;
  }
  if (!chatId) {
    const error = new Error("chatId is required");
    error.status = 400;
    throw error;
  }

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await assertChatOwner(chatId, userId);
    const history = await getHistoryForChat(chatId, 10);

    const [userInsert] = await db.execute(
      `INSERT INTO conversations (chat_id, content, role) VALUES (?, ?, 'user')`,
      [chatId, question.trim()]
    );

    const [[userRow]] = await db.execute(
      `SELECT id, chat_id, role, content, token_count, created_at FROM conversations WHERE id = ?`,
      [userInsert.insertId]
    );

    await maybeSetTitleFromQuestion(chatId, question);
    await touchChat(chatId);

    send("user_message", { ...userRow, role: "user" });

    let fullText = "";
    try {
      const chat = geminiClient.chats.create({
        model: GEMINI_MODEL,
        config: { maxOutputTokens: 2048 },
        history,
      });

      // Multimodal message if image attached
      let messagePayload;
      if (image?.data && image?.mimeType) {
        messagePayload = {
          message: [
            { text: question.trim() },
            {
              inlineData: {
                mimeType: image.mimeType,
                data: image.data,
              },
            },
          ],
        };
      } else {
        messagePayload = { message: question.trim() };
      }

      const stream = await chat.sendMessageStream(messagePayload);

      for await (const chunk of stream) {
        const piece = chunk.text || "";
        if (piece) {
          fullText += piece;
          send("token", { text: piece });
        }
      }
    } catch (aiErr) {
      const mapped = mapGeminiError(aiErr);
      send("error", { message: mapped.message, code: mapped.code });
      res.end();
      return;
    }

    const [assistantInsert] = await db.execute(
      `INSERT INTO conversations (chat_id, content, role, token_count) VALUES (?, ?, 'assistant', ?)`,
      [chatId, fullText, 0]
    );

    const [[assistantRow]] = await db.execute(
      `SELECT id, chat_id, role, content, token_count, created_at FROM conversations WHERE id = ?`,
      [assistantInsert.insertId]
    );

    const [[chatRow]] = await db.execute(
      `SELECT id, title, created_at, updated_at FROM chats WHERE id = ?`,
      [chatId]
    );

    send("done", {
      assistantConversation: { ...assistantRow, role: "assistant" },
      chat: chatRow,
    });
    res.end();
  } catch (err) {
    const mapped = err.status ? err : mapDbError(err);
    try {
      send("error", { message: mapped.message, code: mapped.code || "ERROR" });
    } catch (_) {}
    res.end();
  }
}
