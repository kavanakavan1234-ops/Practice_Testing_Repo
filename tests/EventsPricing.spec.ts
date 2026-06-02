/*import { test, expect } from '@playwright/test';
import { readCombinedExcel } from '../utils/eventspricedates';
import { SchedulesTesting } from '../Pages/SchedulesTesting';

const BASE_URL = 'https://stagingbeta.invensislearning.com';

test.setTimeout(1200000);

test('Verify events and pricing from Excel vs UI', async ({ page }) => {
  const groups = await readCombinedExcel('test-data/Events5.xlsx');

  console.log(`📊 Loaded groups: ${groups.length}`);

  const app = new SchedulesTesting(page);

  for (const group of groups) {
    const url = `${BASE_URL}/${group.country}/${group.courseSlug}/`;

    console.log(`\n🌐 Opening: ${url}`);

    const status = await app.open(url);
    if (status === 0 || status >= 400) {
      console.log(`❌ Failed to load page`);
      continue;
    }

    await app.clickSchedules();

    // 🔥 open dropdown once
    const opened = await app.openMonthDropdown();
    if (!opened) {
      console.log('❌ Month dropdown not opening');
      continue;
    }

    const uiMonths = await app.getUIMonths();
    console.log(`📆 UI months available: ${uiMonths.join(', ')}`);

    for (const [month, expected] of group.months) {
      console.log(`\n📆 Month: ${month}`);

      if (!uiMonths.includes(month)) {
        console.log(`⏭ ${month} not found in UI`);
        continue;
      }

      // 🔥 reopen dropdown every time
      await app.openMonthDropdown();
      await app.selectMonth(month);

      await app.loadAllSchedules();

      // ───────── EVENTS CHECK ─────────
      const pageDates = await app.extractPageDates();
      const excelDates = [...new Set(expected.dates)].sort();

      const missingDates = excelDates.filter(d => !pageDates.includes(d));

      if (missingDates.length) {
        console.log(`⚠️ Missing dates (UI may not show past batches):`);
        console.log(missingDates.join(', '));
      }

      console.log(`Excel dates: ${excelDates.length}`);
      console.log(`Page dates : ${pageDates.length}`);

      // ❌ DO NOT FAIL TEST FOR DATES
      // expect(missingDates).toEqual([]);

      // ───────── PRICE CHECK (CORRECTED) ─────────
      const { displayPrices } = await app.getMatchedPrices('', '');

      const excelPrices = [...new Set(expected.prices)];

      console.log(`Excel prices: ${excelPrices.join(', ')}`);
      console.log(`Page prices : ${displayPrices.join(', ')}`);

      const match = excelPrices.some(price =>
        displayPrices.includes(price)
      );

      if (!match) {
        console.log(`❌ No matching price found`);
        console.log(`👉 Excel: ${excelPrices}`);
        console.log(`👉 UI: ${displayPrices}`);
      }

      expect(match).toBeTruthy();

      console.log(`✅ PASS: ${group.courseSlug}/${group.country}/${month}`);
    }
  }
});  */

import { test, expect } from '@playwright/test';
import { readCombinedExcel } from '../utils/eventspricedates';
import { SchedulesTesting } from '../Pages/SchedulesTesting';

const BASE_URL = 'https://stagingbeta.invensislearning.com';

test.setTimeout(1200000);

test('Verify events and pricing from Excel vs UI', async ({ page }) => {
  const groups = await readCombinedExcel('test-data/Pricing6.xlsx');

  console.log(`📊 Loaded groups: ${groups.length}`);

  const app = new SchedulesTesting(page);

  for (const group of groups) {
    const url = `${BASE_URL}/${group.country}/${group.courseSlug}/`;

    console.log(`\n🌐 Opening: ${url}`);

    const status = await app.open(url);
    if (status === 0 || status >= 400) {
      console.log(`❌ Page load failed`);
      continue;
    }

    await app.clickSchedules();

    const opened = await app.openMonthDropdown();
    if (!opened) {
      console.log('❌ Month dropdown not opening');
      continue;
    }

    const uiMonths = await app.getUIMonths();
    console.log(`📆 UI months: ${uiMonths.join(', ')}`);

    for (const [month, expected] of group.months) {
      console.log(`\n📆 Month: ${month}`);

      if (!uiMonths.includes(month)) {
        console.log(`⏭ Skipped (not in UI)`);
        continue;
      }

      await app.openMonthDropdown();
      await app.selectMonth(month);
      await app.loadAllSchedules();

      // ───────── EVENTS ─────────
      const pageDates = await app.extractPageDates();
      const excelDates = [...new Set(expected.dates)].sort();

      console.log(`📊 Excel Events (${excelDates.length}):`);
      console.log(excelDates.join(', '));

      console.log(`📊 UI Events (${pageDates.length}):`);
      console.log(pageDates.join(', '));

      const missingDates = excelDates.filter(d => !pageDates.includes(d));

      if (missingDates.length > 0) {
        console.log(`❌ Missing Events:`);
        console.log(missingDates.join(', '));
      }

      // ───────── PRICING ─────────
      const { displayPrices } = await app.getMatchedPrices('', '');
      const excelPrices = [...new Set(expected.prices)];

      console.log(`💰 Excel Prices: ${excelPrices.join(', ')}`);
      console.log(`💰 UI Prices: ${displayPrices.join(', ')}`);

      const priceMatch = excelPrices.some(p => displayPrices.includes(p));

      if (!priceMatch) {
        console.log(`❌ No matching price found`);
      }

      // ───────── FINAL ASSERTION ─────────
      if (missingDates.length > 0 || !priceMatch) {
        throw new Error(`
❌ VALIDATION FAILED
Course: ${group.courseSlug}
Country: ${group.country}
Month: ${month}

Missing Events:
${missingDates.join(', ') || 'None'}

Price Match:
${priceMatch ? 'YES' : 'NO'}
        `);
      }

      console.log(`✅ PASS: ${group.courseSlug}/${group.country}/${month}`);
    }
  }
});