import express from "express";

import {
  loginController,
  signUpController,
} from "../controllers/UserController";

const userRouter = express.Router();

userRouter.post("/signup", signUpController);

userRouter.post("/login", loginController);

export { userRouter };
