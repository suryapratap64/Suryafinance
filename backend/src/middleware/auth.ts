import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("No token provided");
    }

    const token = authHeader.split(" ")[1];

    // Verify the JWT token with Supabase
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error) {
      console.error("Auth error:", error);
      throw error;
    }

    if (!user) {
      throw new Error("User not found");
    }

    // Add the verified user object to the request
    req.user = user;
    next();
  } catch (err: any) {
    console.error("Auth middleware error:", err.message);
    res.status(401).json({
      status: "error",
      message: "Unauthorized",
      details: err.message,
    });
  }
};
