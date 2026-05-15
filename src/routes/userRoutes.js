import express from "express";

import {
  createUser,
  deleteUser,
  getUserById,
  updateUser,
} from "../controllers/userprofileControls.js";

const router = express.Router();

router.post("/", createUser);

router.get("/:id", getUserById);

router.patch("/:id", updateUser);

router.delete("/:id", deleteUser);

export default router;
