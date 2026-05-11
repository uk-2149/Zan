// src/routes/auth.routes.ts
import { Router } from "express";
import {
  registerUser,
  loginUser,
  getMe,
  updateWallet,
  getWalletChallenge,
  getWalletStatus,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";

const authRouter: Router = Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.get("/me", verifyJWT, getMe);
authRouter.get("/wallet/status", verifyJWT, getWalletStatus);
authRouter.get("/wallet/challenge", verifyJWT, getWalletChallenge);
authRouter.patch("/wallet", verifyJWT, updateWallet);

export { authRouter };
