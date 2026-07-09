import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";

const app = express();
const httpServer = createServer(app);

app.use(
  express.json({
    limit: "50mb",
    verify: (req: any, _res: any, buf: any) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ limit: "50mb", extended: false }));

// DEBUG: log every incoming request URL to diagnose Vercel routing
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[Vercel] ${req.method} ${req.url} (originalUrl: ${req.originalUrl})`);
  next();
});


setupAuth(app);

// Track initialization promise so we can await it on each request (cold start safety)
const initPromise = registerRoutes(httpServer, app).catch((err: Error) => {
  console.error("Failed to register routes:", err);
});

// Middleware that waits for routes to finish registering before handling any request
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  await initPromise;
  next();
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("[Vercel Error]", err);
  res.status(status).json({ message });
});

// CJS export for Vercel serverless
export = app;
