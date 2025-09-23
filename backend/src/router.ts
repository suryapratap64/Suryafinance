import portfolioRouter from "./routes/PortfolioRoutes";
import transactionRouter from "./routes/TransactionRoutes";
import { userRouter } from "./routes/UserRoutes";

export const AllRoutes = [
  {
    path: "/api/user",
    handler: userRouter,
  },
  {
    path: "/api/portfolio",
    handler: portfolioRouter,
  },
  {
    path: "/api/transactions",
    handler: transactionRouter,
  },
];
