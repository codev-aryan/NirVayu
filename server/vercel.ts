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

setupAuth(app);

// Register all API routes synchronously (registerRoutes calls app.get/post etc. immediately)
registerRoutes(httpServer, app).catch((err: Error) => {
  console.error("Failed to register routes:", err);
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("[Vercel Error]", err);
  res.status(status).json({ message });
});

// Export app for serverless entry
export default app;
