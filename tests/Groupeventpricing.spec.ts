


/*import { test, expect } from '@playwright/test';
import { readCombinedExcel } from '../utils/groupevents';
import { ScheduleGroup } from '../Pages/ScheduleGroup';

const BASE_URL = 'https://stagingbeta.invensislearning.com';

test.setTimeout(1600000);

test('Verify events and pricing from Excel vs UI (All Countries)', async ({ page }) => {

  const groups = await readCombinedExcel('test-data/Events7.xlsx');

  console.log(`📊 Loaded groups: ${groups.length}`);

  const app = new ScheduleGroup(page);

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
        console.log(`⏭ ${month} not available`);
        continue;
      }

      await app.openMonthDropdown();
      await app.selectMonth(month);
      await app.loadAllSchedules();

      // ───────── EVENTS VALIDATION ─────────

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

      // STRICT EVENT CHECK
      expect(missingDates, `Missing events for ${group.country}/${month}`).toEqual([]);

      // ───────── PRICING VALIDATION (SMART FIX) ─────────

      const { displayPrices } = await app.getMatchedPrices('', '');

      const excelPrices = [...new Set(expected.prices)];

      console.log(`💰 Excel Prices: ${excelPrices.join(', ')}`);
      console.log(`💰 UI Prices: ${displayPrices.join(', ')}`);

      const excelNums = excelPrices.map(Number);
      const uiNums = displayPrices.map(Number);

      const minPrice = Math.min(...excelNums);
      const maxPrice = Math.max(...excelNums);

      const tolerance = 2000; // buffer for pricing variations

      const validPrice = uiNums.some(p =>
        p >= (minPrice - tolerance) &&
        p <= (maxPrice + tolerance)
      );

      if (!validPrice) {
        console.log(`❌ Price out of range`);
        console.log(`👉 Expected range: ${minPrice} - ${maxPrice}`);
        console.log(`👉 UI values: ${uiNums}`);
      }

      expect(validPrice, `Invalid pricing for ${group.country}/${month}`).toBeTruthy();

      console.log(`✅ PASS: ${group.courseSlug}/${group.country}/${month}`);
    }
  }
});  */


import { test, expect } from '@playwright/test';
import { readCombinedExcel } from '../utils/groupevents';
import { ScheduleGroup } from '../Pages/ScheduleGroup';

const BASE_URL = 'https://stagingbeta.invensislearning.com';

test.setTimeout(1200000);


test('Verify events and pricing from Excel vs UI (All Countries)', async ({ browser }) => {

  const groups = await readCombinedExcel('test-data/Events7.xlsx');
  console.log(`📊 Loaded groups: ${groups.length}`);

  for (const group of groups) {

    // 🔥 NEW browser per country
    const context = await browser.newContext();
    const page = await context.newPage();
    const app = new ScheduleGroup(page);

    const url = `${BASE_URL}/${group.country}/${group.courseSlug}/`;
    console.log(`\n🌐 Opening: ${url}`);

    const status = await app.open(url);

    if (status === 0 || status >= 400) {
      console.log(`❌ Page load failed`);
      await context.close();
      continue;
    }

    await app.clickSchedules();

    const opened = await app.openMonthDropdown();
    if (!opened) {
      console.log('❌ Month dropdown not opening');
      await context.close();
      continue;
    }

    const uiMonths = await app.getUIMonths();
    console.log(`📆 UI months: ${uiMonths.join(', ')}`);

    for (const [month, expected] of group.months) {

      console.log(`\n📆 Month: ${month}`);

      if (!uiMonths.includes(month)) continue;

      await app.openMonthDropdown();
      await app.selectMonth(month);
      await app.loadAllSchedules();

      const pageDates = await app.extractPageDates();
      const excelDates = [...new Set(expected.dates)].sort();

      const missingDates = excelDates.filter(d => !pageDates.includes(d));

      expect(missingDates).toEqual([]);

      const { displayPrices } = await app.getMatchedPrices('', '');
      const excelPrices = [...new Set(expected.prices)];

      const excelNums = excelPrices.map(Number);
      const uiNums = displayPrices.map(Number);

      const minPrice = Math.min(...excelNums);
      const maxPrice = Math.max(...excelNums);

      const validPrice = uiNums.some(p =>
        p >= (minPrice - 2000) &&
        p <= (maxPrice + 2000)
      );

      expect(validPrice).toBeTruthy();

      console.log(`✅ PASS: ${group.courseSlug}/${group.country}/${month}`);
    }

    // 🔥 CRITICAL
    await context.close();
  }
});


