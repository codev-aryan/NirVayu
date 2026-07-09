// ESM wrapper — package.json has "type":"module" so this file is ESM.
// We use createRequire to load the CJS bundle that esbuild compiled from server/vercel.ts
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const app = require("../dist/vercel.cjs");

// Vercel serverless: export the Express app as the default handler
export default app;
