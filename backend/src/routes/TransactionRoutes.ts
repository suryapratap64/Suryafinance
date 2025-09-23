import express from "express";
import { authMiddleware } from "../middleware/auth";
import { upload } from "../middleware/upload";
import {
  motilalOswalSyncController,
  uploadPortfolioCSVController,
  createTransactionController,
  getTransactionsController,
  getSecurityTransactionsController,
} from "../controllers/TransactionController";

const transactionRouter = express.Router();

transactionRouter.use(authMiddleware);

// Data import routes
transactionRouter.post(
  "/upload-csv",
  upload.single("file"),
  uploadPortfolioCSVController
);
transactionRouter.post("/motilal-oswal", motilalOswalSyncController);

// Transaction CRUD routes
transactionRouter.post("/", createTransactionController); 
transactionRouter.get("/user", getTransactionsController);
transactionRouter.get(
  "/security/:securityId",
  getSecurityTransactionsController
);

export default transactionRouter;
