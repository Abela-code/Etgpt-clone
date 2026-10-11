import "dotenv/config";
import express from "express";
import db from "./db/db.config.js";
import mainRouter from "./src/api/main.routes.js";
import {errorHandler} from "./src/middleware/error-handler.js"
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use('/api', mainRouter);
app.use(errorHandler);


async function startServer() {
  try {
    const connection = await db.getConnection();
    connection.release();

    app.listen(3888, (err) => {
      if (err) {
        throw err;
      }
      console.log("server is running on port http://localhost:3888");
    });
  } catch (error) {
    console.error("error starting server:", error.message);
  }
}

startServer();
