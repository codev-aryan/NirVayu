import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.use(
  express.json({
    limit: "50mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ limit: "50mb", extended: false }));

setupAuth(app);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Register routes (async IIFE)
let ready = false;
const init = registerRoutes(httpServer, app).then(() => {
  ready = true;
});

export default async function handler(req: any, res: any) {
  if (!ready) await init;
  app(req, res);
}
