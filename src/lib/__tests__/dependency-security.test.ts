import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const sentryRequire = createRequire(require.resolve("@sentry/bundler-plugins/webpack"));
const glob = sentryRequire("glob");
const estreeRequire = createRequire(require.resolve("@typescript-eslint/typescript-estree"));
const minimatch = estreeRequire("minimatch");

describe("patched build dependency compatibility", () => {
  it("preserves Sentry's synchronous and asynchronous artifact matching", async () => {
    const directory = mkdtempSync(join(tmpdir(), "warrantee-glob-security-"));
    try {
      for (const folder of ["src", "ignored", ".hidden"]) {
        mkdirSync(join(directory, folder));
      }
      writeFileSync(join(directory, "src", "app.js.map"), "{}");
      writeFileSync(join(directory, ".hidden", "server.js.map"), "{}");
      writeFileSync(join(directory, "ignored", "vendor.js.map"), "{}");
      const options = { cwd: directory, dot: true, nodir: true, ignore: ["ignored/**"] };
      const expected = [".hidden/server.js.map", "src/app.js.map"];
      expect(glob.globSync("**/*.map", options).sort()).toEqual(expected);
      expect((await glob.glob("**/*.map", options)).sort()).toEqual(expected);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects traversal when its abort signal is already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(glob.glob("**/*", { cwd: tmpdir(), signal: controller.signal }))
      .rejects.toMatchObject({ name: "AbortError" });
  });

  it("preserves TypeScript tooling's file matching and exclusion semantics", () => {
    expect(minimatch.minimatch("src/app.ts", "**/*.ts")).toBe(true);
    expect(minimatch.minimatch("src/app.js", "**/*.ts")).toBe(false);
    expect(minimatch.minimatch("src/app.ts", "!**/*.js")).toBe(true);
    expect(minimatch.minimatch(".hidden/app.ts", "**/*.ts", { dot: true })).toBe(true);
  });
});
