import express from "express";

const router = express.Router();

// HEALTH API
router.get("/", async (req, res) => {
  res.status(200).json({ status: "server running..." });
});

export default router;
