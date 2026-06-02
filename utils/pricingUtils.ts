// ─────────────────────────────────────────────
// extractCourseAndCountry
//
// Handles the Excel format where courseName is:
//   "pfmp-certification-training/al"
//   "pmp-certification-training/us"
//   "https://stagingbeta.invensislearning.com/us/pmp-certification-training/"
//
// Returns:
//   courseSlug  — e.g. "pfmp-certification-training"
//   countryCode — e.g. "al"
//   courseNameRaw — the original string
// ─────────────────────────────────────────────
export function extractCourseAndCountry(raw: string): {
  courseSlug:    string;
  countryCode:   string;
  courseNameRaw: string;
} {
  const trimmed = raw.trim();

  // Case 1: Full URL — extract slug + country from path segments
  // e.g. https://stagingbeta.invensislearning.com/us/pmp-certification-training/
  const urlMatch = trimmed.match(
    /invensislearning\.com\/([a-z]{2})\/([^/]+)/i
  );
  if (urlMatch) {
    return {
      courseSlug:    urlMatch[2].replace(/\/$/, ''),
      countryCode:   urlMatch[1].toLowerCase(),
      courseNameRaw: trimmed,
    };
  }

  // Case 2: "slug/countryCode" format
  // e.g. "pfmp-certification-training/al"
  const slashMatch = trimmed.match(/^(.+?)\/([a-z]{2})$/i);
  if (slashMatch) {
    return {
      courseSlug:    slashMatch[1].trim(),
      countryCode:   slashMatch[2].toLowerCase(),
      courseNameRaw: trimmed,
    };
  }

  // Case 3: "slug countryCode" (space-separated, country at end)
  // e.g. "pmp-certification-training us"
  const spaceMatch = trimmed.match(/^(.+?)\s+([a-z]{2})$/i);
  if (spaceMatch) {
    return {
      courseSlug:    spaceMatch[1].trim(),
      countryCode:   spaceMatch[2].toLowerCase(),
      courseNameRaw: trimmed,
    };
  }

  // Fallback — treat entire string as slug, country unknown
  console.warn(`⚠️  Could not parse course/country from: "${trimmed}"`);
  return {
    courseSlug:    trimmed,
    countryCode:   'us',
    courseNameRaw: trimmed,
  };
}