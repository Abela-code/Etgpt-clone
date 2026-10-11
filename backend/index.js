import "dotenv/config";
import express from "express";
import db from "./db/db.config.js";
import mainRouter from "./src/api/main.routes.js";
import {errorHandler} from "./src/middleware/error-handler.js"
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT) || 3888;
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean).map((origin) => origin.replace(/\/+$/, ""));

app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header include health checks and server-to-server calls.
    if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ""))) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS"));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10mb" }));
app.get("/health", (_req, res) => res.status(200).json({ status: true, message: "EtGPT API is healthy" }));
app.use('/api', mainRouter);
app.use(errorHandler);


async function startServer() {
  try {
    const connection = await db.getConnection();
    connection.release();

    app.listen(PORT, () => {
      console.log(`EtGPT API is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting EtGPT API:", error.message);
    process.exit(1);
  }
}

startServer();
