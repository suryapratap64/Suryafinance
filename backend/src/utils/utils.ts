import jwt from "jsonwebtoken";
import { Config } from "../config";
import bcrypt from "bcryptjs";

export const generateJWTToken = (userId: any, username: any) => {
  if (!Config.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not configured");
  }
  const token = jwt.sign({ userId, username }, Config.JWT_SECRET, {
    expiresIn: "24h",
  });
  return token;
};

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
) => {
  return bcrypt.compare(password, hashedPassword);
};
