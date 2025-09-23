import express from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getMutualFundHoldingsController,
  getStockHoldingsController,
  getSummaryController,
} from "../controllers/PortfolioController";

const portfolioRouter = express.Router();

portfolioRouter.use(authMiddleware);

portfolioRouter.get("/stocks", getStockHoldingsController);

portfolioRouter.get("/mutual-funds", getMutualFundHoldingsController);

portfolioRouter.get("/summary", getSummaryController);

export default portfolioRouter;
