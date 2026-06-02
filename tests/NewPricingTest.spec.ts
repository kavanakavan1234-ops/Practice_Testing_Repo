import { test } from '@playwright/test';
import { readExcel, writeResults, MONTHS } from '../utils/newpricingexcel';
import type { ResultRow, MonthResult } from '../utils/newpricingexcel';
import { extractCourseAndCountry } from '../utils/priceutils';
import { NewPricingCoursePage } from '../Pages/NewPricingCoursePage';

test.setTimeout(18_000_000);

// 6 months × ~12s (select + extract) = ~72s + buffer
const ROW_TIMEOUT_MS = 90_000;

test.describe('🌍 Price Validation - First Event Only (July → December)', () => {
  test('Validate first event price per month and write results', async ({ page }) => {

    const testData = await readExcel('test-data/Pricing12.xlsx');
    const total    = testData.length;

    console.log(`\n📊 Total rows to validate : ${total}`);
    console.log(`📆 Months to check        : ${MONTHS.join(', ')}`);
    console.log(`⏱️  Per-row timeout        : ${ROW_TIMEOUT_MS / 1000}s`);
    console.log(`📌 Mode                   : First event price only (no Load More)`);
    console.log('═'.repeat(70));

    const coursePage = new NewPricingCoursePage(page);
    const results: ResultRow[] = [];
    let rowIndex = 0;

    for (const data of testData) {
      rowIndex++;

      const { courseSlug, countryCode, courseNameRaw } =
        extractCourseAndCountry(data.courseName);

      const targetPrice    = data.price > 0 ? Math.round(data.price).toString() : '';
      const targetDiscount = data.discount && data.discount > 0
        ? Math.round(data.discount).toString()
        : '';

      console.log(`\n${'─'.repeat(70)}`);
      console.log(`[${rowIndex}/${total}] 📋 Course  : ${courseNameRaw}`);
      console.log(`           🌍 Country : ${countryCode.toUpperCase()}`);
      console.log(`           💵 Price   : ${targetPrice || '(none)'}`);
      if (targetDiscount) console.log(`           🏷️  Discount: ${targetDiscount}`);

      const monthResults: MonthResult[] = [];
      let httpStatus = 0;
      let timedOut   = false;
      let navFailed  = false;

      try {
        await Promise.race([
          (async () => {
            // Step 1: Open course page
            httpStatus = await coursePage.openCourse(courseSlug, countryCode);
            if (httpStatus === 0) {
              console.log(`   ❌ Navigation failed — skipping all months`);
              navFailed = true;
              return;
            }

            // Step 2: Dismiss popup, trigger lazy load
            await coursePage.scrollPage();
            await coursePage.closePopupIfVisible();

            // Step 3: Click Schedule / Enroll tab
            await coursePage.clickSchedule();

            // Step 4: Loop each month
            for (const month of MONTHS) {
              console.log(`\n   ── ${month} ──`);

              if (!targetPrice) {
                monthResults.push({ month, status: 'NOT_FOUND', webPrices: [], matched: '' });
                console.log(`      ⚠️  No Excel price — skipping month`);
                continue;
              }

              const { found, webPrice, matchDetails } =
                await coursePage.verifyFirstEventPriceForMonth(
                  month,
                  targetPrice,
                  targetDiscount || undefined,
                );

              const status: MonthResult['status'] = found ? 'PASS' : 'FAIL';

              monthResults.push({
                month,
                status,
                webPrices: webPrice ? [webPrice] : [],
                matched:   found ? webPrice : '',
              });

              console.log(`      ${found ? '✅ PASS' : '❌ FAIL'} — ${matchDetails}`);
            }
          })(),

          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('ROW_TIMEOUT')), ROW_TIMEOUT_MS)
          ),
        ]);

      } catch (err: any) {
        timedOut = err?.message === 'ROW_TIMEOUT';
        console.log(timedOut
          ? `\n   ⏱️  ROW TIMED OUT — marking remaining months as FAIL`
          : `\n   ❌ Unexpected error: ${err?.message}`
        );
      }

      // Fill in any months that didn't complete
      for (const month of MONTHS) {
        if (!monthResults.find(m => m.month === month)) {
          monthResults.push({ month, status: 'FAIL', webPrices: [], matched: '' });
        }
      }

      const overallStatus: 'PASS' | 'FAIL' =
        navFailed || timedOut
          ? 'FAIL'
          : monthResults.every(m => m.status === 'PASS') ? 'PASS' : 'FAIL';

      const summary = monthResults
        .map(m => `${m.month.slice(0, 3)}:${m.status === 'PASS' ? '✅' : m.status === 'NOT_FOUND' ? '⚠️' : '❌'}`)
        .join('  ');
      console.log(`\n   📊 Summary: ${summary}`);
      console.log(`   🏁 Overall: ${overallStatus}`);

      results.push({
        courseName:    courseNameRaw,
        country:       countryCode.toUpperCase(),
        excelPrice:    targetPrice,
        excelDiscount: targetDiscount,
        httpStatus,
        monthResults,
        overallStatus,
      });

      if (rowIndex % 10 === 0) {
        await writeResults('test-results/output.xlsx', results);
        console.log(`\n   💾 Auto-saved: ${rowIndex}/${total} rows`);
      }
    }

    await writeResults('test-results/output.xlsx', results);

    const passed = results.filter(r => r.overallStatus === 'PASS').length;
    const failed = results.filter(r => r.overallStatus === 'FAIL').length;

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🎯 RESULTS SUMMARY`);
    console.log(`   ✅ OVERALL PASS : ${passed}`);
    console.log(`   ❌ OVERALL FAIL : ${failed}`);
    console.log(`   📦 TOTAL        : ${results.length}`);
    console.log(`\n   📆 Month-wise breakdown:`);
    for (const month of MONTHS) {
      const mPass = results.filter(r => r.monthResults.find(m => m.month === month && m.status === 'PASS')).length;
      const mFail = results.filter(r => r.monthResults.find(m => m.month === month && m.status !== 'PASS')).length;
      console.log(`      ${month.padEnd(12)}: ✅ ${mPass}  ❌ ${mFail}`);
    }
    console.log(`${'═'.repeat(70)}\n`);
    console.log(`💾 Final results written to: test-results/output.xlsx`);
  });
});