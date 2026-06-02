/*  import { test } from '@playwright/test';

// ─────────────────────────────────────────────
// RUN THIS FIRST to find the correct selector
// and coordinates of the number plate on your page
// ─────────────────────────────────────────────
test('find number plate selector and coordinates', async ({ page }) => {

  await page.goto('https://www.bmw.in/en/index.html', {
    waitUntil: 'networkidle',
  });

  // ── Step 1: Print all elements that might be the plate ──
  // Look for text patterns like "TN 09", "KA 01", "MH 12" etc.
  const possiblePlates = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    return all
      .filter(el => {
        const text = el.textContent?.trim() || '';
        // Adjust this pattern to match your number plate format
        return /^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}$/.test(text);
      })
      .map(el => ({
        tag:       el.tagName,
        class:     el.className,
        id:        el.id,
        text:      el.textContent?.trim(),
        testId:    el.getAttribute('data-testid'),
        rect:      el.getBoundingClientRect(),
      }));
  });

  console.log('Possible number plate elements found:');
  console.table(possiblePlates);

  // ── Step 2: Take a full page screenshot to visually inspect ──
  await page.screenshot({
    path: 'screenshots/page.png',
    fullPage: true,
  });  

  console.log('Full page screenshot saved to screenshots/full-page-inspect.png');
  console.log('Open it to visually identify where the number plate is.');

  // ── Step 3: Use Playwright codegen to auto-detect selectors ──
  // Run this command in your terminal:
  //   npx playwright codegen https://your-car-website.com
  // Then hover over the number plate to see its selector automatically.
});   */

/* import { test } from '@playwright/test';




 test('Capture BMW homepage screenshot', async ({ page }) => {
 await page.goto('https://www.bmw.in/en/index.html', {

//test('Capture pmi acp course homepage screenshot', async ({ page }) => {

  // await page.goto('https://stagingbeta.invensislearning.com/pmi-acp-certification-training/', {

    waitUntil: 'networkidle',

    
  });

  await page.waitForTimeout(5000);

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

  // Capture only the visible viewport (homepage)
  await page.screenshot({
    path: 'screenshots/dashboard.png',
    fullPage: false,   // ← only visible area, not full scroll
  });

  console.log('✅ Homepage screenshot saved → screenshots/homepage.png');
});  */


/*import { test } from '@playwright/test';

test('capture number plate screenshot', async ({ page }) => {
  await page.goto('https://www.bmw.in/en/index.html', {
    waitUntil: 'networkidle',
  });

  await page.waitForTimeout(6000);

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

  // ── Capture ONLY the number plate "M·SE 1631" ──
  await page.screenshot({
    path: 'screenshots/number-plate.png',
    clip: {
      x: 550,    // left edge of plate
      y: 298,    // top edge of plate
      width: 100, // width of plate
      height: 25, // height of plate
    },
  });

  console.log('Number plate screenshot saved → screenshots/number-plate.png');
});    */

  
    
/* import { test } from '@playwright/test';

test.setTimeout(60000);

test('capture 2nd car number plate screenshot', async ({ page }) => {

  // Step 1: Set viewport to match full screenshot width
  await page.setViewportSize({ width: 1560, height: 768 });

  // Step 2: Navigate to URL
  await page.goto('https://www.bmw.in/en/index.html', {
    waitUntil: 'domcontentloaded',
  });

  await page.waitForTimeout(6000);

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

  // Step 3: Scroll DOWN slowly so scroll is visible on UI
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy({ top: 100, behavior: 'smooth' }));
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(3000);

  // Step 4: Full viewport screenshot to verify 2nd car is visible
  await page.screenshot({
    path: 'screenshots/second-car-full.png',
    fullPage: false,
  });
  console.log('📸 second-car-full.png saved');

  // Step 5: Capture ONLY the 2nd car number plate "M·CI 3948"
  await page.screenshot({
    path: 'screenshots/number-plate-2.png',
    clip: {
       x: 1370,   // slightly left to catch full plate
      y: 485,    // ← moved down to center on plate
      width: 115, // slightly wider
      height: 45, // slightly taller
    },
  });

  console.log('✅ 2nd car number plate "M·CI 3948" captured → screenshots/number-plate-2.png');
}); */

import { test } from '@playwright/test';

test.setTimeout(60000);

test('capture both car number plates', async ({ page }) => {

  // Step 1: Set viewport
  await page.setViewportSize({ width: 1560, height: 768 });

  // Step 2: Navigate to URL
  await page.goto('https://www.bmw.in/en/index.html', {
    waitUntil: 'domcontentloaded',
  });

  await page.waitForTimeout(6000);

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

  // ─────────────────────────────────────────
  // 1ST CAR NUMBER PLATE — "M·SE 1631"
  // ─────────────────────────────────────────



  // Step 5: Capture 1st car number plate
  await page.screenshot({
    path: 'screenshots/number-plate-1.png',
    clip: {
      x: 550,
      y: 298,
      width: 100,
      height: 25,
    },
  });
  console.log('✅ 1st car number plate "M·SE 1631" captured → screenshots/number-plate-1.png');

  // ─────────────────────────────────────────
  // 2ND CAR NUMBER PLATE — "M·CI 3948"
  // ─────────────────────────────────────────

  // Step 6: Scroll DOWN slowly so scroll is visible on UI
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy({ top: 100, behavior: 'smooth' }));
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(3000);

  // Step 7: Full screenshot to verify 2nd car
  await page.screenshot({
    path: 'screenshots/second-car-full.png',
    fullPage: false,
  });
  console.log('📸 Second car full screenshot saved');

  // Step 8: Capture 2nd car number plate
  await page.screenshot({
    path: 'screenshots/number-plate-2.png',
    clip: {
      x: 1375,
      y: 483,
      width: 115,
      height: 35,
    },
  });
  console.log('✅ 2nd car number plate "M·CI 3948" captured → screenshots/number-plate-2.png');

});