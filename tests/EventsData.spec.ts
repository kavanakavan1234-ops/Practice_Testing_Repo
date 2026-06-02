import { test } from '@playwright/test';
import {readScheduleExcel,writeScheduleResults,MonthResult,} from '../utils/eventsschedule';
import { EventVerification } from '../Pages/EventVerification';

test.setTimeout(1200000);

const ROW_TIMEOUT_MS = 120_000;
const BASE_URL       = 'https://stagingbeta.invensislearning.com';

test.describe('🌍 Schedule Event Verification - Excel vs UI', () => {
  test('Verify all events for each month per course-country', async ({ page }) => {

    // ── Load Excel ────────────────────────────────────────────────────
    // Excel format: id | courseName | name(month) | date(comma dates)
    const courseGroups = await readScheduleExcel('test-data/Events3.xlsx');
    // ↑ Change filename to your actual Excel file name
    const total        = courseGroups.length;

    console.log(`\n📊 Course-country groups : ${total}`);
    console.log(`⏱️  Row timeout           : ${ROW_TIMEOUT_MS / 1000}s`);
    console.log('═'.repeat(70));

    const schedulePage = new EventVerification(page);

    const allResults: {
      courseSlug:   string;
      country:      string;
      monthResults: MonthResult[];
      httpStatus:   number;
      status:       'PASS' | 'FAIL' | 'NAV_FAIL';
    }[] = [];

    const summary = { pass: 0, fail: 0, navFail: 0 };
    let rowIndex = 0;

    for (const group of courseGroups) {
      rowIndex++;

      const url = `${BASE_URL}/${group.country}/${group.courseSlug}/`;

      // Months expected for this course+country
      const monthNames = Array.from(group.months.keys());

      console.log(`\n${'─'.repeat(70)}`);
      console.log(`[${rowIndex}/${total}] 📋 Course  : ${group.courseSlug}`);
      console.log(`           🌍 Country : ${group.country}`);
      console.log(`           📆 Months  : ${monthNames.join(', ')}`);
      console.log(`           🌐 URL     : ${url}`);

      // Print Excel events per month
      for (const [month, events] of group.months) {
        const allExcelDates = [...new Set(events.flatMap(e => e.dates))].sort();
        console.log(`           📋 ${month.padEnd(6)} : ${allExcelDates.length} dates in Excel`);
      }

      const monthResults: MonthResult[] = [];
      let httpStatus = 0;
      let navFail    = false;
      let timedOut   = false;

      try {
        await Promise.race([
          (async () => {
            // ── Open page ─────────────────────────────────────────────
            httpStatus = await schedulePage.open(url);

            if (httpStatus === 0 || httpStatus >= 400) {
              navFail = true;
              if (httpStatus >= 400)
                console.log(`   ⚠️  HTTP ${httpStatus} — page not found`);
              return;
            }

            await schedulePage.closePopupIfVisible();
            await schedulePage.clickSchedules();

            // ── Open dropdown — get available months ──────────────────
            const dropdownOpened = await schedulePage.openMonthDropdown();
            let uiMonths: string[] = [];

            if (dropdownOpened) {
              uiMonths = await schedulePage.getUIMonths();
              console.log(`\n   📆 Dropdown months available: [${uiMonths.join(', ')}]`);
              // Close dropdown before selecting
              await page.keyboard.press('Escape');
              await page.waitForTimeout(300);
            } else {
              console.log(`   ⚠️  Month dropdown could not be opened`);
            }

            // ── Process each month from Excel ─────────────────────────
            for (const [month, events] of group.months) {

              // All Excel dates for this month (all events combined)
              const excelDates = [...new Set(events.flatMap(e => e.dates))].sort();

              console.log(`\n   ${'·'.repeat(60)}`);
              console.log(`   📆 Month: ${month}  (${excelDates.length} dates in Excel)`);
              console.log(`      Excel dates: ${excelDates.join(', ')}`);

              // ── Step 1: Check if month is in dropdown ───────────────
              const inDropdown = uiMonths.some(
                ui => ui.toLowerCase().startsWith(month.toLowerCase().slice(0, 3))
              );

              if (!inDropdown && dropdownOpened) {
                console.log(`      ❌ ${month} : NOT IN DROPDOWN`);
                monthResults.push({
                  month,
                  inDropdown: false,
                  excelDates,
                  pageDates:  [],
                  matched:    [],
                  missing:    excelDates,
                  extra:      [],
                  status:     'FAIL',
                });
                continue;
              }

              // ── Step 2: Select month from dropdown ──────────────────
              if (dropdownOpened) {
                const reopened = await schedulePage.openMonthDropdown();
                if (reopened) {
                  await schedulePage.selectMonth(month);
                } else {
                  console.log(`      ⚠️  Could not reopen dropdown for ${month}`);
                }
              }

              // ── Step 3: Load all schedules ──────────────────────────
              await schedulePage.loadAllSchedules();
              await page.waitForTimeout(500);

              // ── Step 4: Extract all dates from page ─────────────────
              const pageDates = await schedulePage.extractPageDates();
              console.log(`      Page dates: ${pageDates.length > 0 ? pageDates.join(', ') : 'NONE FOUND'}`);

              // ── Step 5: Compare Excel dates vs Page dates ───────────
              const excelSet = new Set(excelDates);
              const pageSet  = new Set(pageDates);

              const matched = excelDates.filter(d => pageSet.has(d));
              const missing = excelDates.filter(d => !pageSet.has(d));
              const extra   = pageDates.filter(d => !excelSet.has(d));

              // PASS = all Excel dates found on page (no missing)
              // Extra dates on page are allowed (more events is OK)
              const status: 'PASS' | 'FAIL' = missing.length === 0 ? 'PASS' : 'FAIL';

              // Console output
              if (status === 'PASS') {
                console.log(`\n      ✅ ${month} : PASS`);
                console.log(`         All ${matched.length} Excel dates found on page ✅`);
                if (extra.length > 0) {
                  console.log(`         Extra on page (not in Excel): ${extra.join(', ')}`);
                }
              } else {
                console.log(`\n      ❌ ${month} : FAIL`);
                console.log(`         Matched  : ${matched.length}  → ${matched.join(', ') || 'none'}`);
                console.log(`         Missing  : ${missing.length}  → ${missing.join(', ')}`);
                if (extra.length > 0) {
                  console.log(`         Extra    : ${extra.length}   → ${extra.join(', ')}`);
                }
              }

              monthResults.push({
                month,
                inDropdown: inDropdown || !dropdownOpened,
                excelDates,
                pageDates,
                matched,
                missing,
                extra,
                status,
              });
            }
          })(),

          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('ROW_TIMEOUT')), ROW_TIMEOUT_MS)
          ),
        ]);

      } catch (err: any) {
        timedOut = err?.message === 'ROW_TIMEOUT';
        if (timedOut) console.log(`   ⏱️  Timed out — moving to next`);
      }

      // ── Overall status ────────────────────────────────────────────
      const overallStatus: 'PASS' | 'FAIL' | 'NAV_FAIL' =
        navFail  ? 'NAV_FAIL' :
        timedOut ? 'FAIL' :
        monthResults.length > 0 && monthResults.every(m => m.status === 'PASS')
          ? 'PASS' : 'FAIL';

      if (navFail) {
        summary.navFail++;
      } else if (overallStatus === 'PASS') {
        summary.pass++;
      } else {
        summary.fail++;
      }

      // ── Final status line ─────────────────────────────────────────
      const icon = overallStatus === 'PASS' ? '✅' : overallStatus === 'NAV_FAIL' ? '⚠️ ' : '❌';
      console.log(`\n   ${icon} OVERALL : ${overallStatus}${timedOut ? ' (timeout)' : ''}   HTTP:${httpStatus}`);

      if (navFail) {
        console.log(`   🌐 Page does not exist for "${group.country}" — skipped`);
      } else {
        console.log(`   📅 Month summary:`);
        for (const mr of monthResults) {
          const mIcon = mr.status === 'PASS' ? '✅' : '❌';
          console.log(
            `      ${mIcon} ${mr.month.padEnd(8)} : ${mr.status.padEnd(4)}  ` +
            `matched=${mr.matched.length}  missing=${mr.missing.length}  extra=${mr.extra.length}`
          );
        }
      }

      allResults.push({
        courseSlug:   group.courseSlug,
        country:      group.country,
        monthResults: navFail
          ? Array.from(group.months.keys()).map(m => ({
              month:      m,
              inDropdown: false,
              excelDates: [],
              pageDates:  [],
              matched:    [],
              missing:    [],
              extra:      [],
              status:     'FAIL' as const,
            }))
          : monthResults,
        httpStatus,
        status: overallStatus,
      });

      // Auto-save every 10 rows
      if (rowIndex % 10 === 0) {
        await writeScheduleResults('test-results/output.xlsx', allResults);
        console.log(`\n   💾 Auto-saved: ${rowIndex}/${total}`);
      }
    }

    // ── Final save ────────────────────────────────────────────────────
    await writeScheduleResults('test-results/output.xlsx', allResults);

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🎯 RESULTS SUMMARY`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   ✅ PASS      : ${summary.pass}`);
    console.log(`   ❌ FAIL      : ${summary.fail}`);
    console.log(`   ⚠️  NAV FAIL : ${summary.navFail}`);
    console.log(`   📦 TOTAL    : ${allResults.length}`);
    console.log(`${'═'.repeat(70)}\n`);
    console.log(`💾 Results saved → test-results/output.xlsx`);
  });
});