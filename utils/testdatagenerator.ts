
/**
 * Generates a unique email for signup tests so the same address
 * doesn't collide with an already-registered account on re-runs.
 */
export function generateRandomEmail(baseName: string): string {
  const timestamp = Date.now();
  return `${baseName}${timestamp}@gmail.com`;
}
 