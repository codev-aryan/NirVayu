import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const _filename = typeof import.meta !== "undefined" && import.meta?.url ? fileURLToPath(import.meta.url) : (typeof __filename !== "undefined" ? __filename : process.cwd());
const _dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(_filename);

export function serveStatic(app: Express) {
  const distPath = path.resolve(_dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
