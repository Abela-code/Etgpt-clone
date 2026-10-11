import mysql from "mysql2/promise";

const sslEnabled = process.env.DB_SSL === "true";
const ssl = sslEnabled
  ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
      ...(process.env.DB_SSL_CA
        ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, "\n") }
        : {}),
    }
  : undefined;

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  charset: "utf8mb4",
  ...(ssl ? { ssl } : {}),
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

export default db;
