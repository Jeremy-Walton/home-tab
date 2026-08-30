const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "") return trimmed;
  return SCHEME_PATTERN.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isSafeHref(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
