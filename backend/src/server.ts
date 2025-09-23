import "reflect-metadata";
import cluster from "cluster";
import { availableParallelism } from "os";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Container } from "typedi";
import { createServer } from "http";

import { startScheduledJobs } from "./jobs/scheduledJobs";
import { AllRoutes } from "./router";
import { Config } from "./config";
import { runMigrations } from "./migrations/migrationRunner";

const numCPUs = availableParallelism();

async function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: ["http://localhost:5173", "http://localhost:4200"],
      credentials: true,
    })
  );

  const limiter = rateLimit({ windowMs: 60_000, max: 1000 });
  app.use(limiter);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Test route
  app.get("/test", (_, res) => res.json({ message: "Backend running!" }));

  // Attach routes
  AllRoutes.forEach((route) => app.use(route.path, route.handler));

  return app;
}

async function startWorker() {
  try {
    console.log(`Worker ${process.pid} starting...`);
    Container.reset();
    await import("./services"); // inject services

    // Run database migrations
    if (cluster.isPrimary || Config.NODE_ENV === "development") {
      console.log("Running database migrations...");
      await runMigrations();
    }

    const app = await createApp();
    const server = createServer(app);

    server.listen(Config.PORT, () =>
      console.log(
        `Worker ${process.pid}: Server running on port ${Config.PORT}`
      )
    );

    startScheduledJobs(); // start cron jobs
  } catch (err) {
    console.error(`Worker ${process.pid} failed:`, err);
    process.exit(1);
  }
}

if (cluster.isPrimary && Config.NODE_ENV !== "development") {
  console.log(`Master ${process.pid} running`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();

  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  startWorker();
}
