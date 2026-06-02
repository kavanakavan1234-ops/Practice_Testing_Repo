import { test } from '@playwright/test';
import { readExcel, writeResults } from '../utils/pricingexcel';
import { extractCourseAndCountry } from '../utils/priceutils';
import { PricingVerification, TARGET_MONTHS } from '../Pages/PricingVerification';
import type { EventPriceGroup, TargetMonth } from '../Pages/PricingVerification';


test.setTimeout(18_000_000);

// ⏱ Per-row budget:
//   Fixed (nav + scroll + schedule click) : ~3.8s
//   Per month × 6 (select + extract)      : ~7.8s
//   Total                                 : ~11.6s + network headroom = 60s
const ROW_TIMEOUT_MS = 60_000;

// ─────────────────────────────────────────────
// Helper: number → string, empty string if 0
// ─────────────────────────────────────────────
function str(n: number): string {
  return n > 0 ? n.toString() : '';
}

// ─────────────────────────────────────────────
// FORMAT EVENT GROUPS FOR CONSOLE
// pricePairs: [ [fPrice,''], [fpPrice,''], [pPrice,''] ]
// ─────────────────────────────────────────────
function formatEventGroups(
  groups:     EventPriceGroup[],
  pricePairs: Array<[string, string]>
): string {
  if (groups.length === 0) return '      NOT FOUND';

  const allTargets = new Set(pricePairs.flat().filter(Boolean));

  // Flat fallback (no named cards)
  if (groups.length === 1 && groups[0].eventName === '') {
    const display = groups[0].prices
      .map(p => allTargets.has(p) ? `✅${p}` : `~~${p}~~`)
      .join(', ');
    return `      [${display}]`;
  }

  return groups
    .map((g, idx) => {
      const [tPrice] = pricePairs[idx] ?? ['', ''];
      const groupTargets = new Set([tPrice].filter(Boolean));

      const priceDisplay = g.prices
        .map(p => {
          if (groupTargets.has(p)) return `✅${p}`;
          if (allTargets.has(p))   return `🔶${p}`;
          return `~~${p}~~`;
        })
        .join(', ');

      const name = g.eventName.length > 60
        ? g.eventName.slice(0, 57) + '...'
        : g.eventName;

      return `      ${idx + 1}. ${name} : [${priceDisplay}]`;
    })
    .join('\n');
}

// ─────────────────────────────────────────────
// MAIN TEST
// ─────────────────────────────────────────────
test.describe('🌍 Price Validation — Monthly (July → December)', () => {
  test('Validate pricing by month and write results', async ({ page }) => {

    const testData = await readExcel('test-data/Pricing14.xlsx');
    const total    = testData.length;

    console.log(`\n📊 Total rows        : ${total}`);
    console.log(`📅 Months to check   : ${TARGET_MONTHS.join(', ')}`);
    console.log(`⏱️  Per-row timeout  : ${ROW_TIMEOUT_MS / 1000}s`);
    console.log('═'.repeat(70));

    const coursePage = new PricingVerification(page);
    const results: any[] = [];
    let rowIndex = 0;

    for (const data of testData) {
      rowIndex++;

      const { courseSlug, countryCode, courseNameRaw } =
        extractCourseAndCountry(data.courseName);

      // The three price values from Excel (no discount column)
      const fPrice  = str(data.f_price);
      const fpPrice = str(data.f_p_price);
      const pPrice  = str(data.p_price);

      // Positional pairs (price only, no discount):
      //   index 0 → Foundation
      //   index 1 → Foundation + Practitioner
      //   index 2 → Practitioner
      const pricePairs: Array<[string, string]> = [
        [fPrice,  ''],
        [fpPrice, ''],
        [pPrice,  ''],
      ];

      const allTargets = [fPrice, fpPrice, pPrice].filter(Boolean);

      console.log(`\n${'─'.repeat(70)}`);
      console.log(`[${rowIndex}/${total}] 📋 Course  : ${courseNameRaw}`);
      console.log(`           🌍 Country : ${countryCode}`);
      console.log(`           💵 Excel   :`);
      console.log(`              Foundation              : ${fPrice  || '?'}`);
      console.log(`              Foundation+Practitioner : ${fpPrice || '?'}`);
      console.log(`              Practitioner            : ${pPrice  || '?'}`);

      // ── Open page once per course/country row ─────────────────────────
      let httpStatus = 0;
      let pageOpened = false;

      try {
        await Promise.race([
          (async () => {
            httpStatus = await coursePage.openCourse(courseSlug, countryCode);
            if (httpStatus === 0) return;
            await coursePage.scrollPage();
            await coursePage.closePopupIfVisible();
            await coursePage.clickSchedule();
            pageOpened = true;
          })(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('PAGE_TIMEOUT')), ROW_TIMEOUT_MS)
          ),
        ]);
      } catch (err: any) {
        if (err?.message === 'PAGE_TIMEOUT') {
          console.log(`   ⏱️  Page open timed out — skipping row`);
        }
      }

      if (!pageOpened) {
        // Record FAIL for all months if page didn't open
        for (const month of TARGET_MONTHS) {
          results.push({
            courseName:  courseNameRaw,
            country:     countryCode,
            month,
            excelFPrice:  fPrice,
            excelFPPrice: fpPrice,
            excelPPrice:  pPrice,
            webPrices:   [],
            httpStatus,
            status:      'FAIL',
          });
        }
        continue;
      }

      // ── Loop over each month ───────────────────────────────────────────
      for (const month of TARGET_MONTHS) {
        console.log(`\n   📅 Month: ${month}`);

        let matchedPrices: string[]        = [];
        let displayPrices: string[]        = [];
        let eventGroups: EventPriceGroup[] = [];
        let status: 'PASS' | 'FAIL'        = 'FAIL';
        let timedOut                        = false;

        try {
          await Promise.race([
            (async () => {
              // Select the month in the dropdown
              const monthSelected = await coursePage.selectMonth(month as TargetMonth);

              if (!monthSelected) {
                // If we can't select the month, still try to read current prices
                console.log(`      ⚠️  Month selection failed; reading visible prices`);
              }

              // Re-close popup in case it re-appeared after month change
              await coursePage.closePopupIfVisible();

              // Extract prices for the selected month
              ({ matchedPrices, displayPrices, eventGroups } =
                await coursePage.getMatchedPrices(allTargets));
            })(),

            new Promise<void>((_, reject) =>
              setTimeout(() => reject(new Error('ROW_TIMEOUT')), ROW_TIMEOUT_MS)
            ),
          ]);

          status = matchedPrices.length > 0 ? 'PASS' : 'FAIL';

        } catch (err: any) {
          status   = 'FAIL';
          timedOut = err?.message === 'ROW_TIMEOUT';
          if (timedOut) console.log(`      ⏱️  Month timed out — moving on`);
        }

        const groupedDisplay = formatEventGroups(eventGroups, pricePairs);

        if (status === 'PASS') {
          console.log(`      ✅ STATUS     : PASS`);
          console.log(`      💰 Web Prices :`);
          console.log(groupedDisplay);
          console.log(`      🎯 Matched    : Excel price found on website`);
        } else {
          console.log(`      ❌ STATUS     : FAIL${timedOut ? ' (timeout)' : ''}`);
          console.log(`      💰 Web Prices :`);
          console.log(groupedDisplay);
          console.log(`      ⚠️  Mismatch  : None of the Excel prices found on page`);
        }

        // Build web prices string for Excel output
        const webPricesForExcel: string[] =
          eventGroups.length > 0 && eventGroups[0].eventName !== ''
            ? eventGroups.map((g, i) => {
                const [tp] = pricePairs[i] ?? [''];
                const suffix = tp ? ` (Excel: ${tp})` : '';
                return `${g.eventName}: [${g.prices.join(', ')}]${suffix}`;
              })
            : displayPrices;

        results.push({
          courseName:   courseNameRaw,
          country:      countryCode,
          month,
          excelFPrice:  fPrice,
          excelFPPrice: fpPrice,
          excelPPrice:  pPrice,
          webPrices:    webPricesForExcel,
          httpStatus,
          status,
        });
      } // end month loop

      // Auto-save every 10 rows
      if (rowIndex % 10 === 0) {
        await writeResults('test-results/output.xlsx', results);
        console.log(`\n   💾 Auto-saved: ${rowIndex}/${total} rows`);
      }

    } // end row loop

    // Final save
    await writeResults('test-results/output.xlsx', results);

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🎯 RESULTS SUMMARY`);
    console.log(`   ✅ PASSED : ${passed}`);
    console.log(`   ❌ FAILED : ${failed}`);
    console.log(`   📦 TOTAL  : ${results.length}  (${testData.length} rows × ${TARGET_MONTHS.length} months)`);
    console.log(`${'═'.repeat(70)}\n`);
    console.log(`💾 Final results written to: test-results/output.xlsx`);
  });
});