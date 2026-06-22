const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i

export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (trimmed === '') return trimmed
  return SCHEME_PATTERN.test(trimmed) ? trimmed : `https://${trimmed}`
}
