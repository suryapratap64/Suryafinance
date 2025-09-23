import { Request, Response } from "express";
import { portfolioService } from "../services";

export const getStockHoldingsController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId: string = req.userId;
    if (!userId || userId.trim() === "") {
      return res
        .status(401)
        .send({ status: "error", message: "Invalid userId" });
    }
    const [status, data] = await portfolioService.getStockHoldings(userId);
    return res.status(200).send({ status: "ok", stockHoldings: data });
  } catch (error: any) {
    return res.status(503).send({ status: "error", message: "server error" });
  }
};

export const getMutualFundHoldingsController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId: string = req.userId;
    if (!userId || userId.trim() === "") {
      return res
        .status(401)
        .send({ status: "error", message: "Invalid userId" });
    }
    const [status, data] = await portfolioService.getMutualFundHoldings(userId);
    return res.status(200).send({ status: "ok", mutualFundHoldings: data });
  } catch (error) {
    return res.status(503).send({ status: "error", message: "server error" });
  }
};

export const getSummaryController = async (req: Request, res: Response) => {
  try {
    const userId: string = req.userId;
    if (!userId || userId.trim() === "") {
      return res
        .status(401)
        .send({ status: "error", message: "Invalid userId" });
    }
    const [status, data] = await portfolioService.getSummary(userId);
    return res.status(200).send({ status: "ok", summary: data });
  } catch (error) {
    return res.status(503).send({ status: "error", message: "server error" });
  }
};
