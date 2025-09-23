import { Request, Response } from "express";
import Joi from "joi";
import { userService } from "../services";

export const signUpController = async (req: Request, res: Response) => {
  try {
    console.log("Signup request received:", req.body);

    const requestSchema = Joi.object({
      username: Joi.string().min(1).required(),
      password: Joi.string().min(1).required(),
    });
    const { error } = requestSchema.validate(req.body);
    if (error) {
      console.log("Validation error:", error.message);
      return res.status(406).send({ status: "error", message: error.message });
    }
    const { username, password } = req.body;
    const [status, data] = await userService.signUp(username, password);
    if (!status) {
      return res.status(401).send({ status: "error", message: data });
    }
    return res.status(200).send({ status: "ok", message: data });
  } catch (error: any) {
    return res
      .status(503)
      .send({ status: "error", message: "server error " + error.message });
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const requestSchema = Joi.object({
      username: Joi.string().min(1).required(),
      password: Joi.string().min(1).required(),
    });
    const { error } = requestSchema.validate(req.body);
    if (error) {
      return res.status(406).send({ status: "error", message: error.message });
    }
    const { username, password } = req.body;
    const [status, data] = await userService.login(username, password);
    if (!status) {
      return res.status(401).send({ status: "error", message: data });
    }
    return res
      .status(200)
      .send({ status: "ok", token: data.token, user: data.user });
  } catch (error) {
    return res.status(503).send({ status: "error", message: "server error" });
  }
};
