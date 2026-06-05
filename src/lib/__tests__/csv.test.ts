import { describe, expect, it } from "vitest";
import { escapeCsvCell, rowsToCsv } from "../csv";

describe("csv export escaping", () => {
  it("prefixes spreadsheet formulas before exporting", () => {
    expect(escapeCsvCell("=IMPORTXML(\"https://example.com\")")).toBe(
      "\"'=IMPORTXML(\"\"https://example.com\"\")\""
    );
    expect(escapeCsvCell("+123")).toBe("'+123");
    expect(escapeCsvCell("-123")).toBe("'-123");
    expect(escapeCsvCell("@cmd")).toBe("'@cmd");
  });

  it("quotes commas, quotes, and newlines", () => {
    expect(escapeCsvCell("ACME, Inc.")).toBe("\"ACME, Inc.\"");
    expect(escapeCsvCell("A \"quoted\" value")).toBe("\"A \"\"quoted\"\" value\"");
    expect(escapeCsvCell("line 1\nline 2")).toBe("\"line 1\nline 2\"");
  });

  it("exports rows with safe headers and values", () => {
    expect(rowsToCsv([{ product: "=bad", status: "active" }])).toBe("product,status\n'=bad,active");
  });
});
