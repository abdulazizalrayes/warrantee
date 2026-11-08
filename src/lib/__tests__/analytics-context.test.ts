import { describe, expect, it } from "vitest";
import { LOCALES } from "../locales";
import { createAnalyticsContextSanitizers } from "../analytics-context.mjs";

describe("standalone and bundled analytics context contract", () => {
  it("keeps bootstrap locale prefixes aligned with the supported application locales", () => {
    expect(createAnalyticsContextSanitizers().locales).toEqual([...LOCALES]);
  });

  it.each(["/en/pricing?email=private@example.invalid#private", "/ar/pricing?token=private"])("strips query and fragment without changing public routing (%s)", path => {
    expect(createAnalyticsContextSanitizers().path(path)).toBe(path.split("?")[0]);
  });
});
