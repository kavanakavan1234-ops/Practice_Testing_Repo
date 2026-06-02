export function extractCourseAndCountry(courseRaw: string) {
  const parts = courseRaw.split('/');

  const courseNameRaw = parts[0].trim();
  const countryCode   = parts[1]?.trim() ?? '';

  // Build URL slug: lowercase, spaces → hyphens
  const courseSlug = courseNameRaw
    .toLowerCase()
    .replace(/\s+/g, '-');

  return {
    courseSlug,
    countryCode,
    courseNameRaw,
  };
}

// ─────────────────────────────────────────────
// Compare web prices against the 3 Excel prices
// (no discount column — price-only check)
// ─────────────────────────────────────────────
export function comparePrices(
  webPrices: string[],
  fPrice:    string,
  fpPrice:   string,
  pPrice:    string
): boolean {
  return (
    (fPrice  !== '' && webPrices.includes(fPrice))  ||
    (fpPrice !== '' && webPrices.includes(fpPrice)) ||
    (pPrice  !== '' && webPrices.includes(pPrice))
  );
}