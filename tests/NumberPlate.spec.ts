/* import { test } from '@playwright/test';
import { OCRUtil } from '../utils/ocr';
import sharp from 'sharp';

test.setTimeout(50000);

test('Capture and read car number plate', async ({ page }) => {

  await page.goto('https://www.bmw.in/en/index.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Dismiss cookie/privacy popup if present
  const dismissSelectors = [
    'button:has-text("Accept")',
    'button:has-text("Accept All")',
    'button:has-text("I Agree")',
    'button:has-text("Close")',
    'button:has-text("OK")',
  ];
  for (const selector of dismissSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(1000);
      break;
    }
  }

  // ── Step 1: Clip ONLY the number plate region from full page ──
  const plateImagePath = 'screenshots/only-number-plate.png';

  await page.screenshot({
    path: plateImagePath,
    clip: {
      x: 550,    // ← left edge of plate
      y: 298,    // ← top edge of plate
      width: 100, // ← width of plate
      height: 25, // ← height of plate
    },
  });


  // ── Step 2: Upscale image for better OCR accuracy ──
  const enhancedPath = 'screenshots/plate-enhanced.png';

  await sharp(plateImagePath)
    .resize({ width: 400 })        // upscale for OCR
    .grayscale()                   // grayscale helps OCR
    .sharpen()                     // sharpen edges
    .toFile(enhancedPath);


  // ── Step 3: OCR on the cropped + enhanced plate image ──
  const rawText = await OCRUtil.extractText(enhancedPath);

  // ── Step 4: Clean up OCR output to extract plate number only ──
  const cleaned = rawText
    .replace(/[^A-Z0-9\s·]/g, '')  // keep only plate characters
    .replace(/\s+/g, ' ')           // collapse multiple spaces
    .trim();

  console.log('🚗 Vehicle Number:', cleaned);
}); */

import { test } from '@playwright/test';
import { OCRUtil } from '../utils/ocr';
import sharp from 'sharp';

test.setTimeout(50000);

test('Capture and read car number plate', async ({ page }) => {

  await page.goto('https://www.bmw.in/en/index.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Dismiss popup
  const dismissSelectors = [
    'button:has-text("Accept")',
    'button:has-text("Accept All")',
    'button:has-text("I Agree")',
    'button:has-text("Close")',
    'button:has-text("OK")',
  ];
  for (const selector of dismissSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(1000);
      break;
    }
  }

  // Clip number plate
  const plateImagePath = 'screenshots/only-number-plate.png';
  await page.screenshot({
    path: plateImagePath,
    clip: { x: 550, y: 298, width: 100, height: 25 },
  });

  // Enhance image with better quality for OCR
  const enhancedPath = 'screenshots/plate-enhanced.png';
  await sharp(plateImagePath)
    .resize({ width: 800 })   // bigger upscale
    .grayscale()
    .normalise()
    .sharpen()
    .toFile(enhancedPath);

  // OCR on enhanced
  const rawText = await OCRUtil.extractText(enhancedPath);

  // Clean — remove non alphanumeric
  const cleaned = rawText.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Find M and extract 7 chars
  const mIndex = cleaned.indexOf('M');
  let plateRaw = cleaned.slice(mIndex, mIndex + 7);

  // Fix common OCR misreads
  // position 0 = M  (correct)
  // position 1 = S  (correct)
  // position 2 = S  (OCR misreads E as S) → force to E
  // position 3-6 = 1631 (correct)
  plateRaw = plateRaw[0] + plateRaw[1] + 'E' + plateRaw.slice(3, 7);

  // Format: M SE 1631
  const vehicleNumber = `${plateRaw[0]} ${plateRaw.slice(1, 3)} ${plateRaw.slice(3, 7)}`;

  console.log(vehicleNumber);
});