export function parseJsonArray<T = string>(value?: string | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseJsonObject<T extends Record<string, unknown> = Record<string, unknown>>(
  value?: string | null,
): T {
  if (!value) return {} as T;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : ({} as T);
  } catch {
    return {} as T;
  }
}
