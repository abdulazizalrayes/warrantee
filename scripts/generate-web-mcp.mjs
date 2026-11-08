import { writeFileSync } from "node:fs";
import { LOCALES } from "../src/lib/locales.ts";
import { buildWebMcpScript } from "../src/lib/web-mcp-script.mjs";

writeFileSync("public/web-mcp.js", buildWebMcpScript(LOCALES));
console.log("Generated same-origin WebMCP bootstrap.");
