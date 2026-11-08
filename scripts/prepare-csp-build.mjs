import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync(".warrantee-csp", { recursive: true });
writeFileSync(".warrantee-csp/static-routes.json", JSON.stringify({ schemaVersion: 1, complete: false, routes: {} }));
