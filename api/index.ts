import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../dist/server.cjs");

export default app.default ?? app;
