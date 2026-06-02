import { test, expect } from '@playwright/test';
import { readScheduleExcel, writeScheduleResults } from '../utils/eventexcel';
import { ScheduleVerification } from '../Pages/ScheduleVerification';

test.setTimeout(1200000);

const ROW_TIMEOUT_MS = 90_000;
const BASE_URL       = 'https://stagingbeta.invensislearning.com';

test.describe('🌍 Schedule Month Verification - Excel vs UI', () => {
  test('Verify months and events for each course-country', async ({ page }) => {

    // ── Load Excel ────────────────────────────────────────────────────
    const rows  = await readScheduleExcel('test-data/Events1.xlsx');
    // ↑ Change filename to match your actual schedule Excel file
    const total = rows.length;

    console.log(`\n📊 Total rows      : ${total}`);
    console.log(`⏱️  Row timeout     : ${ROW_TIMEOUT_MS / 1000}s`);
    console.log('═'.repeat(70));

    // Show sample
    console.log(`\n🔍 Sample rows (first 3):`);
    rows.slice(0, 3).forEach(r =>
      console.log(`   [${r.id}] ${r.courseSlug}/${r.country}  months:[${r.months.join(',')}]`)
    );
    console.log('═'.repeat(70));

    const schedulePage = new ScheduleVerification(page);
    const allResults: {
      id:          number;
      courseName:  string;
      country:     string;
      months:      string[];
      monthStatus: { month: string; inDropdown: boolean; eventCount: number; status: 'PASS' | 'FAIL' }[];
      httpStatus:  number;
      status:      'PASS' | 'FAIL' | 'NAV_FAIL';
    }[] = [];

    const summary = {
      pass:    0,
      fail:    0,
      navFail: 0,
    };

    let rowIndex = 0;

    for (const row of rows) {
      rowIndex++;

      const url = `${BASE_URL}/${row.country}/${row.courseSlug}/`;

      console.log(`\n${'─'.repeat(70)}`);
      console.log(`[${rowIndex}/${total}] 📋 Course  : ${row.courseSlug}`);
      console.log(`           🌍 Country : ${row.country}`);
      console.log(`           📆 Months  : ${row.months.join(', ')}`);
      console.log(`           🌐 URL     : ${url}`);

      let httpStatus  = 0;
      let navFail     = false;
      let timedOut    = false;
      const monthStatus: {
        month:      string;
        inDropdown: boolean;
        eventCount: number;
        status:     'PASS' | 'FAIL';
      }[] = [];

      try {
        await Promise.race([
          (async () => {
            // ── Open page ───────────────────────────────────────────────
            httpStatus = await schedulePage.open(url);

            if (httpStatus === 0 || httpStatus >= 400) {
              navFail = true;
              if (httpStatus >= 400)
                console.log(`   ⚠️  HTTP ${httpStatus} — page not found`);
              return;
            }

            await schedulePage.closePopupIfVisible();
            await schedulePage.clickSchedules();

            // ── Open dropdown & get available months ────────────────────
            const opened = await schedulePage.openMonthDropdown();

            if (!opened) {
              console.log(`   ⚠️  Month dropdown could not be opened`);
              // Mark all months as FAIL
              for (const month of row.months) {
                monthStatus.push({ month, inDropdown: false, eventCount: 0, status: 'FAIL' });
              }
              return;
            }

            const uiMonths = await schedulePage.getUIMonths();
            console.log(`   📆 Dropdown months: [${uiMonths.join(', ')}]`);

            // ── For each expected month ─────────────────────────────────
            for (const month of row.months) {
              // Check if this month exists in the UI dropdown
              const inDropdown = uiMonths.some(
                ui => ui.toLowerCase().startsWith(month.toLowerCase().slice(0, 3))
              );

              if (!inDropdown) {
                // Month not in dropdown — FAIL immediately
                console.log(`\n      ❌ ${month} : NOT IN DROPDOWN`);
                monthStatus.push({ month, inDropdown: false, eventCount: 0, status: 'FAIL' });
                continue;
              }

              // ── Open dropdown and select this month ─────────────────
              await schedulePage.openMonthDropdown();
              await schedulePage.selectMonth(month);

              // ── Load all schedules for this month ───────────────────
              await schedulePage.loadAllSchedules();

              // ── Count events ────────────────────────────────────────
              const eventCount = await schedulePage.getEventCount();

              const monthPass = eventCount > 0;
              const icon      = monthPass ? '✅' : '❌';

              if (monthPass) {
                console.log(`\n      ${icon} ${month} : PASS — ${eventCount} schedule(s) found`);
              } else {
                console.log(`\n      ${icon} ${month} : FAIL — schedules not found`);
              }

              monthStatus.push({
                month,
                inDropdown,
                eventCount,
                status: monthPass ? 'PASS' : 'FAIL',
              });
            }
          })(),

          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('ROW_TIMEOUT')), ROW_TIMEOUT_MS)
          ),
        ]);

      } catch (err: any) {
        timedOut = err?.message === 'ROW_TIMEOUT';
        if (timedOut) console.log(`   ⏱️  Timed out — moving to next row`);
      }

      // ── Determine overall status ──────────────────────────────────
      let overallStatus: 'PASS' | 'FAIL' | 'NAV_FAIL';

      if (navFail) {
        overallStatus = 'NAV_FAIL';
        summary.navFail++;
      } else if (timedOut || monthStatus.some(m => m.status === 'FAIL') || monthStatus.length === 0) {
        overallStatus = 'FAIL';
        summary.fail++;
      } else {
        overallStatus = 'PASS';
        summary.pass++;
      }

      // ── Console result block ──────────────────────────────────────
      const icon = overallStatus === 'PASS' ? '✅' : overallStatus === 'NAV_FAIL' ? '⚠️ ' : '❌';
      console.log(`\n   ${icon} OVERALL : ${overallStatus}${timedOut ? ' (timeout)' : ''}   HTTP:${httpStatus}`);

      if (navFail) {
        console.log(`   🌐 Page does not exist for "${row.country}" — skipped`);
      } else {
        console.log(`   📅 Month results:`);
        for (const ms of monthStatus) {
          const mIcon = ms.status === 'PASS' ? '✅' : '❌';
          if (ms.status === 'PASS') {
            console.log(`      ${mIcon} ${ms.month.padEnd(10)} : PASS — ${ms.eventCount} schedule(s) found`);
          } else if (!ms.inDropdown) {
            console.log(`      ${mIcon} ${ms.month.padEnd(10)} : FAIL — month not in dropdown`);
          } else {
            console.log(`      ${mIcon} ${ms.month.padEnd(10)} : FAIL — schedules not found`);
          }
        }
      }

      allResults.push({
        id:          row.id,
        courseName:  row.courseSlug,
        country:     row.country,
        months:      row.months,
        monthStatus: navFail ? row.months.map(m => ({ month: m, inDropdown: false, eventCount: 0, status: 'FAIL' as const })) : monthStatus,
        httpStatus,
        status:      overallStatus,
      });

      // Auto-save every 10 rows
      if (rowIndex % 10 === 0) {
        await writeScheduleResults('test-results/output.xlsx', allResults);
        console.log(`\n   💾 Auto-saved: ${rowIndex}/${total} rows`);
      }
    }

    // ── Final save ────────────────────────────────────────────────────
    await writeScheduleResults('test-results/output.xlsx', allResults);

    // ── Summary ───────────────────────────────────────────────────────
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