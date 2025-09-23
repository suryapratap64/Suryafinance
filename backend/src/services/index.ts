import { Container } from "typedi";
import { UserService } from "./UserService";
import { PortfolioService } from "./PortfolioService";
import { TransactionService } from "./TransactionService";
// What is a Service?
// Contains the business logic.
// Works with database models, external APIs, calculations, validations.
// Independent from HTTP requests/responses (can be reused in other places like CRON jobs, CLI scripts, etc.).

// Register all services
Container.set({ id: "user.service", type: UserService });
Container.set({ id: "portfolio.service", type: PortfolioService });
Container.set({ id: "transaction.service", type: TransactionService });

// Export service instances
export const userService = Container.get<UserService>("user.service");
export const portfolioService =
  Container.get<PortfolioService>("portfolio.service");
export const transactionService = Container.get<TransactionService>(
  "transaction.service"
);
