import bcrypt from "bcryptjs";
import db from "../../../../db/db.config.js";
import { signToken } from "../../../middleware/auth.js";

export async function registerUser({ name, email, password }) {
  if (!name?.trim() || !email?.trim() || !password) {
    const e = new Error("Name, email, and password are required");
    e.status = 400;
    throw e;
  }
  if (password.length < 6) {
    const e = new Error("Password must be at least 6 characters");
    e.status = 400;
    throw e;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const hash = await bcrypt.hash(password, 10);

  try {
    const [result] = await db.execute(
      `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`,
      [name.trim(), normalizedEmail, hash]
    );
    const user = {
      id: result.insertId,
      name: name.trim(),
      email: normalizedEmail,
    };
    return { user, token: signToken(user) };
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      const e = new Error("Email already registered");
      e.status = 409;
      e.code = "EMAIL_EXISTS";
      throw e;
    }
    throw err;
  }
}

export async function loginUser({ email, password }) {
  if (!email?.trim() || !password) {
    const e = new Error("Email and password are required");
    e.status = 400;
    throw e;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const [rows] = await db.execute(
    `SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1`,
    [normalizedEmail]
  );

  if (!rows[0]) {
    const e = new Error("Invalid email or password");
    e.status = 401;
    e.code = "INVALID_CREDENTIALS";
    throw e;
  }

  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) {
    const e = new Error("Invalid email or password");
    e.status = 401;
    e.code = "INVALID_CREDENTIALS";
    throw e;
  }

  const user = {
    id: rows[0].id,
    name: rows[0].name,
    email: rows[0].email,
  };
  return { user, token: signToken(user) };
}
