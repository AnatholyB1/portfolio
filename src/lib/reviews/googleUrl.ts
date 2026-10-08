// Google Business review URL guard (Phase 18, D-10). Pure module.
// Anything that is not a well-formed https URL without credentials yields
// null so the Google block is omitted (fail closed).

const MAX_LEN = 2048;

export function parseGoogleReviewUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.length > MAX_LEN) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:') return null;
    if (u.username || u.password) return null;
    return value;
  } catch {
    return null;
  }
}

export function reviewGoogleUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return parseGoogleReviewUrl(env.REVIEW_GOOGLE_URL);
}
