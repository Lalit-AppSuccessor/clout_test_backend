import express from "express";

import {
  createOrLoginUser,
  deleteUser,
  getUserById,
  refreshToken,
  updateUser,
} from "../controllers/userprofileControls.js";

import { authMiddleware } from "../middleware/authVerify.js";

const router = express.Router();

router.post("/", createOrLoginUser);

router.get("/", authMiddleware, getUserById);

router.patch("/", authMiddleware, updateUser);

router.delete("/", authMiddleware, deleteUser);

router.post("/refresh", refreshToken);

export default router;
