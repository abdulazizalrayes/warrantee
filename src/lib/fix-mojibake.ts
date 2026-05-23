export function fixMojibake(value: string) {
  try {
    return decodeURIComponent(escape(value));
  } catch {
    return value;
  }
}

export function fixMojibakeRecord<T extends Record<string, string>>(record: T): T {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, fixMojibake(value)])
  ) as T;
}
