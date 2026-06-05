const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown) {
  const raw = value == null ? "" : String(value);
  const formulaSafe = FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  const escaped = formulaSafe.replace(/"/g, '""');

  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function rowsToCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const csvRows = [headers.map(escapeCsvCell).join(",")];

  for (const row of rows) {
    csvRows.push(headers.map((header) => escapeCsvCell(row[header])).join(","));
  }

  return csvRows.join("\n");
}
