import express from "express";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";

const app = express();

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

// registerRoutes returns a Promise — we bootstrap it once and export app immediately.
// Vercel will not invoke the handler until the module finishes loading,
// but requests will still be handled after the async setup completes
// because Express queues them until the routes are registered.
registerRoutes(app).catch((err: Error) => {
  console.error("Failed to register routes:", err);
  process.exit(1);
});

// CJS export — esbuild compiles this file with format:"cjs"
// so module.exports is valid here even though the source is TypeScript/ESM
export = app;
