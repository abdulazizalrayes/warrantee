import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { inspectHtml } from "../../scripts/audit-csp-build.mjs";

describe("offline CSP build inventory", () => {
  it("hashes exact inline script bytes and deduplicates without authorizing remote scripts", () => {
    const body = '\nwindow.example = "<&>";\n';
    const html = `<script>${body}</script><script>${body}</script><script src="/app.js"></script>`;
    expect(inspectHtml(html).hashes).toEqual([`'sha256-${createHash("sha256").update(body).digest("base64")}'`]);
  });
  it("preserves script entity spelling and whitespace", () => {
    expect(inspectHtml('<script>"&amp;"</script>').hashes)
      .not.toEqual(inspectHtml('<script>"&"</script>').hashes);
    expect(inspectHtml('<script>run()</script>').hashes)
      .not.toEqual(inspectHtml('<script> run()</script>').hashes);
  });
  it("counts inline styles and handlers structurally, not text inside scripts", () => {
    const result = inspectHtml('<button STYLE="color:red" ONCLICK="run()">Go</button><script>"onclick=x"</script>');
    expect(result.styleAttributes).toBe(1);
    expect(result.eventAttributes).toBe(1);
  });
  it("is deterministic and does not alter the supplied HTML", () => {
    const html = '<main><script type="application/ld+json">{"name":"Warrantee"}</script></main>';
    expect(inspectHtml(html)).toEqual(inspectHtml(html));
    expect(html).toContain('{"name":"Warrantee"}');
  });
});
