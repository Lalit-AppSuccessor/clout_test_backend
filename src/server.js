import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

import newsRoutes from "./routes/news.js";
import healthRoutes from "./routes/health.js";
import { syncNewsFeed } from "./service/newsFetcher.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/news", newsRoutes);
app.use("/media", express.static(path.join(process.cwd(), "media")));

mongoose.connect(process.env.MONGO_URI);

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running!!");
});

// syncNewsFeed();

// setInterval(
//   () => {
//     syncNewsFeed();
//   },
//   1000 * 60 * 5,
// );
