import { test } from '@playwright/test';
import { readExcel, writeResults, MONTHS } from '../utils/newpricingexcel';
import type { ResultRow, MonthResult } from '../utils/newpricingexcel';
import { extractCourseAndCountry } from '../utils/priceutils';
import { PMPCoursePage } from '../Pages/PMPCoursePage';

test.setTimeout(60000000); // 30 min total

const ROW_TIMEOUT_MS = 180_000; // 3 min per row (6 months × ~30s each)

// ─────────────────────────────────────────────
// MAIN TEST
// ─────────────────────────────────────────────
test.describe('🌍 Price Validation - Month-wise (July → December)', () => {
  test('Validate pricing per month and write results', async ({ page }) => {

    // ── Load test data ──────────────────────────────────────────────────
    // FILE: test-data/Events8.xlsx
    // Columns: id | courseName (slug/country) | price | [discount optional]
    const testData = await readExcel('test-data/Pricing10.xlsx');
    const total    = testData.length;

    console.log(`\n📊 Total rows to validate : ${total}`);
    console.log(`📆 Months to check        : ${MONTHS.join(', ')}`);
    console.log(`⏱️  Per-row timeout        : ${ROW_TIMEOUT_MS / 1000}s`);
    console.log('═'.repeat(70));

    const coursePage = new PMPCoursePage(page);
    const results: ResultRow[] = [];
    let rowIndex = 0;

    for (const data of testData) {
      rowIndex++;

      const { courseSlug, countryCode, courseNameRaw } =
        extractCourseAndCountry(data.courseName);

      // Target price as string (rounded, no decimals)
      const targetPrice    = data.price > 0 ? Math.round(data.price).toString() : '';
      // Discount is optional — only check if present in Excel
      const targetDiscount = data.discount && data.discount > 0
        ? Math.round(data.discount).toString()
        : '';

      console.log(`\n${'─'.repeat(70)}`);
      console.log(`[${rowIndex}/${total}] 📋 Course  : ${courseNameRaw}`);
      console.log(`           🌍 Country : ${countryCode.toUpperCase()}`);
      console.log(`           💵 Price   : ${targetPrice || '(none)'}`);
      if (targetDiscount) {
        console.log(`           🏷️  Discount: ${targetDiscount}`);
      }

      const monthResults: MonthResult[] = [];
      let httpStatus   = 0;
      let timedOut     = false;
      let navFailed    = false;

      try {
        await Promise.race([
          (async () => {
            // ── Step 1: Open the course page ────────────────────────────
            httpStatus = await coursePage.openCourse(courseSlug, countryCode);
            if (httpStatus === 0) {
              console.log(`   ❌ Navigation failed — skipping all months`);
              navFailed = true;
              return;
            }

            // ── Step 2: Dismiss any popup, scroll to trigger lazy load ──
            await coursePage.scrollPage();
            await coursePage.closePopupIfVisible();

            // ── Step 3: Click the Schedules / "View Dates & Enroll" tab ─
            await coursePage.clickSchedule();

            // ── Step 4: Loop each month July → December ──────────────────
            for (const month of MONTHS) {
              console.log(`\n   ── ${month} ──`);

              // If no price to validate, mark NOT_FOUND
              if (!targetPrice) {
                monthResults.push({
                  month,
                  status:    'NOT_FOUND',
                  webPrices: [],
                  matched:   '',
                });
                console.log(`      ⚠️  No Excel price — skipping month`);
                continue;
              }

              // Verify price (+ optional discount) for this month
              const { found, webPrices, matchDetails } =
                await coursePage.verifyPriceForMonth(month, targetPrice, targetDiscount || undefined);

              const status: MonthResult['status'] = found ? 'PASS' : 'FAIL';

              monthResults.push({
                month,
                status,
                webPrices,
                matched: found ? targetPrice : '',
              });

              if (found) {
                console.log(`      ✅ PASS — ${matchDetails}`);
              } else {
                console.log(`      ❌ FAIL — ${matchDetails}`);
              }
              console.log(`         Web prices: ${webPrices.slice(0, 10).join(', ') || 'none'}${webPrices.length > 10 ? ' ...' : ''}`);
            }
          })(),

          // Per-row timeout guard
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('ROW_TIMEOUT')), ROW_TIMEOUT_MS)
          ),
        ]);

      } catch (err: any) {
        timedOut = err?.message === 'ROW_TIMEOUT';
        if (timedOut) {
          console.log(`\n   ⏱️  ROW TIMED OUT — marking remaining months as FAIL`);
        } else {
          console.log(`\n   ❌ Unexpected error: ${err?.message}`);
        }
      }

      // ── Fill in any months that didn't complete ─────────────────────
      for (const month of MONTHS) {
        if (!monthResults.find(m => m.month === month)) {
          monthResults.push({
            month,
            status:    'FAIL',
            webPrices: [],
            matched:   '',
          });
        }
      }

      // ── Overall PASS: only if ALL months pass ───────────────────────
      const overallStatus: 'PASS' | 'FAIL' =
        navFailed || timedOut
          ? 'FAIL'
          : monthResults.every(m => m.status === 'PASS')
            ? 'PASS'
            : 'FAIL';

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

      // Auto-save every 10 rows
      if (rowIndex % 10 === 0) {
        await writeResults('test-results/output.xlsx', results);
        console.log(`\n   💾 Auto-saved: ${rowIndex}/${total} rows`);
      }
    }

    // ── Final save ──────────────────────────────────────────────────────
    await writeResults('test-results/output.xlsx', results);

    // ── Final Summary ───────────────────────────────────────────────────
    const passed = results.filter(r => r.overallStatus === 'PASS').length;
    const failed = results.filter(r => r.overallStatus === 'FAIL').length;

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🎯 RESULTS SUMMARY`);
    console.log(`   ✅ OVERALL PASS : ${passed}`);
    console.log(`   ❌ OVERALL FAIL : ${failed}`);
    console.log(`   📦 TOTAL        : ${results.length}`);
    console.log(`\n   📆 Month-wise breakdown:`);

    for (const month of MONTHS) {
      const mPass = results.filter(r =>
        r.monthResults.find(m => m.month === month && m.status === 'PASS')
      ).length;
      const mFail = results.filter(r =>
        r.monthResults.find(m => m.month === month && m.status !== 'PASS')
      ).length;
      console.log(`      ${month.padEnd(12)}: ✅ ${mPass}  ❌ ${mFail}`);
    }

    console.log(`${'═'.repeat(70)}\n`);
    console.log(`💾 Final results written to: test-results/output.xlsx`);
  });
});