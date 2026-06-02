export function extractCourseAndCountry(courseRaw: string) {

  const parts = courseRaw.split('/');

  const courseNameRaw = parts[0].trim();

  const countryCode = parts[1]?.trim();

  const courseSlug =
    courseNameRaw
      .toLowerCase()
      .replace(/\s+/g, '-');

  return {
    courseSlug,
    countryCode,
    courseNameRaw,
  };
}

export function normalizePrice(
  value: string | number
): string {

  return String(value)
    .replace(/[^\d]/g, '')
    .trim();
}