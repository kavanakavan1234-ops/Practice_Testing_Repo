import { test } from '@playwright/test';
import { readExcel, writeResults } from '../utils/excelUtil';
import { extractCourseAndCountry } from '../utils/priceutils';
import { CoursePage } from '../Pages/coursepage';

test.setTimeout(1200000);

// ✅ Timeout set ONLY in playwright.config.ts
const ROW_TIMEOUT_MS = 35_000;

// ─────────────────────────────────────────────
// FIX: Excel reads "125290" as "1252901"
// Math.round handles float precision issues
// ─────────────────────────────────────────────
function sanitizePrice(raw: any): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'number') return Math.round(raw).toString();
  return raw.toString().replace(/[^\d]/g, '');
}

test.describe('🌍 Price Validation - Excel vs UI', () => {
  test('Validate pricing and write results', async ({ page }) => {

    const testData = await readExcel('test-data/Pricing1.xlsx');
    const total    = testData.length;

    console.log(`\n📊 Total rows to validate : ${total}`);
    console.log(`⏱️  Per-row timeout        : ${ROW_TIMEOUT_MS / 1000}s`);
    console.log('═'.repeat(70));

    const coursePage = new CoursePage(page);
    const results: any[] = [];
    let rowIndex = 0;

    for (const data of testData) {
      rowIndex++;

      const { courseSlug, countryCode, courseNameRaw } =
        extractCourseAndCountry(data.courseName);

      const excelPrice    = sanitizePrice(data.price);
      const excelDiscount = sanitizePrice(data.discountPrice);

      console.log(`\n${'─'.repeat(70)}`);
      console.log(`[${rowIndex}/${total}] 📋 Course  : ${courseNameRaw}`);
      console.log(`           🌍 Country : ${countryCode}`);
      console.log(`           💵 Excel   : Price=${excelPrice} | Discount=${excelDiscount}`);

      let matchedPrices: string[] = [];
      let displayPrices: string[] = [];
      let httpStatus:    number   = 0;
      let status: 'PASS' | 'FAIL' = 'FAIL';
      let timedOut                 = false;

      try {
        await Promise.race([
          (async () => {
            httpStatus = await coursePage.openCourse(courseSlug, countryCode);
            if (httpStatus === 0) return;

            await coursePage.scrollPage();
            await coursePage.closePopupIfVisible();
            await coursePage.clickSchedule();

            ({ matchedPrices, displayPrices } = await coursePage.getMatchedPrices(
              excelPrice,
              excelDiscount
            ));
          })(),

          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('ROW_TIMEOUT')), ROW_TIMEOUT_MS)
          ),
        ]);

        status = matchedPrices.length > 0 ? 'PASS' : 'FAIL';

      } catch (err: any) {
        status   = 'FAIL';
        timedOut = err?.message === 'ROW_TIMEOUT';
        if (timedOut) console.log(`   ⏱️  Timed out — moving to next`);
      }

      // ── Result block ──────────────────────────────────────
      if (status === 'PASS') {
        console.log(`\n   ✅ STATUS     : PASS`);
        console.log(`   💰 Web Prices : [${displayPrices.join(', ')}]`);
        console.log(`   🎯 Matched    : Excel price found on website`);
      } else {
        // Shows exactly what's on the page e.g. [125290, 112765]
        const webDisplay = displayPrices.length > 0
          ? `[${displayPrices.join(', ')}]`
          : 'NOT FOUND';

        console.log(`\n   ❌ STATUS     : FAIL${timedOut ? ' (timeout)' : ''}`);
        console.log(`   💰 Web Prices : ${webDisplay}`);
        console.log(`   ⚠️  Mismatch  : Excel [${excelPrice} / ${excelDiscount}] not found on page`);
      }

      results.push({
        courseName:    courseNameRaw,
        country:       countryCode,
        excelPrice,
        excelDiscount,
        webPrices:     displayPrices,
        httpStatus,
        status,
      });

      if (rowIndex % 10 === 0) {
        await writeResults('test-results/output.xlsx', results);
        console.log(`\n   💾 Auto-saved: ${rowIndex}/${total} rows`);
      }
    }

    await writeResults('test-results/output.xlsx', results);

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🎯 RESULTS SUMMARY`);
    console.log(`   ✅ PASSED : ${passed}`);
    console.log(`   ❌ FAILED : ${failed}`);
    console.log(`   📦 TOTAL  : ${results.length}`);
    console.log(`${'═'.repeat(70)}\n`);
    console.log(`💾 Final results written to: test-results/output.xlsx`);
  });
});