import { Page, Locator } from '@playwright/test';

export class ScheduleVerification {
  readonly page:          Page;
  readonly scheduleTab:   Locator;
  readonly monthDropdown: Locator;

  constructor(page: Page) {
    this.page = page;

    // Schedule nav tab
    this.scheduleTab = page.locator('a.scroll-link', { hasText: 'Schedules' }).first();

    // MUI month dropdown trigger
    this.monthDropdown = page
      .locator('[title="Click Here to Select Preferred Month"] [role="button"]')
      .first();
  }

  // ─────────────────────────────────────────────
  // OPEN PAGE
  // ─────────────────────────────────────────────
  async open(url: string): Promise<number> {
    try {
      const response = await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout:   25_000,
      });
      await this.page.waitForTimeout(2000);
      return response?.status() ?? 0;
    } catch {
      return 0;
    }
  }

  // ─────────────────────────────────────────────
  // CLOSE POPUP
  // ─────────────────────────────────────────────
  async closePopupIfVisible(): Promise<void> {
    const selectors = [
      '.cyt-closeIcon > svg', '[class*="closeIcon"]',
      '[aria-label="close"]', 'button.close',
      '[class*="modal"] [class*="close"]',
    ];
    for (const sel of selectors) {
      try {
        const el = this.page.locator(sel).first();
        if (await el.isVisible({ timeout: 800 })) {
          await el.click({ timeout: 2000 });
          await this.page.waitForTimeout(300);
          break;
        }
      } catch { /* no popup */ }
    }
  }

  // ─────────────────────────────────────────────
  // CLICK SCHEDULES TAB
  // ─────────────────────────────────────────────
  async clickSchedules(): Promise<void> {
    try {
      await this.scheduleTab.scrollIntoViewIfNeeded();
      await this.scheduleTab.click();
      await this.page.waitForTimeout(2000);
      console.log(`   📅 Schedules tab clicked`);
    } catch {
      // Try fallback text-based locator
      try {
        await this.page.getByText('Schedules', { exact: true }).first().click();
        await this.page.waitForTimeout(2000);
        console.log(`   📅 Schedules tab clicked (fallback)`);
      } catch { /* tab not found */ }
    }
  }

  // ─────────────────────────────────────────────
  // OPEN MONTH DROPDOWN
  // ─────────────────────────────────────────────
  async openMonthDropdown(): Promise<boolean> {
    try {
      const expanded = await this.monthDropdown.getAttribute('aria-expanded');
      if (expanded !== 'true') {
        await this.monthDropdown.click();
      }
      await this.page.locator('[role="listbox"]').waitFor({
        state:   'visible',
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // GET ALL MONTHS AVAILABLE IN DROPDOWN
  // Returns short names: ["Jan", "May", "Jun"]
  // ─────────────────────────────────────────────
  async getUIMonths(): Promise<string[]> {
    try {
      const options = this.page.locator('[role="listbox"] [role="option"]');
      const texts   = await options.allTextContents();
      return texts.map(t => t.trim().slice(0, 3)); // "January" → "Jan"
    } catch {
      return [];
    }
  }

  // ─────────────────────────────────────────────
  // SELECT A MONTH FROM DROPDOWN
  // Accepts short (Jan) or full (January) name
  // ─────────────────────────────────────────────
  async selectMonth(month: string): Promise<void> {
    const option = this.page.locator('[role="listbox"] [role="option"]', {
      hasText: new RegExp(`^${month}`, 'i'),
    });
    await option.first().click();
    // Wait for dropdown to close
    await this.page.locator('[role="listbox"]').waitFor({
      state:   'hidden',
      timeout: 5000,
    }).catch(() => { /* may already be hidden */ });
    await this.page.waitForTimeout(1000);
  }

  // ─────────────────────────────────────────────
  // LOAD MORE SCHEDULES — click until gone
  // ─────────────────────────────────────────────
  async loadAllSchedules(): Promise<void> {
    let clicked = 0;
    while (clicked < 20) {
      try {
        const btn = this.page.getByRole('button', { name: /load more schedules/i });
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.scrollIntoViewIfNeeded();
          await btn.click();
          clicked++;
          await this.page.waitForTimeout(1500);
        } else {
          break;
        }
      } catch { break; }
    }
    if (clicked > 0) console.log(`   🔄 Load More clicked ${clicked} time(s)`);
  }

  // ─────────────────────────────────────────────
  // CHECK IF EVENTS EXIST FOR CURRENT VIEW
  // Returns count of schedule cards visible
  // ─────────────────────────────────────────────
  async getEventCount(): Promise<number> {
    try {
      // Count cards — tries multiple selectors
      const selectors = [
        '[class*="scheduleCard"]',
        '[class*="schedule_card"]',
        '[class*="batchCard"]',
        '[class*="batch_card"]',
        '[class*="scheduleItem"]',
        '[class*="schedule_item"]',
        '[class*="eventCard"]',
      ];
      for (const sel of selectors) {
        const count = await this.page.locator(sel).count();
        if (count > 0) return count;
      }

      // Fallback: count elements containing a month+year text pattern
      // (works regardless of class name — MUI dynamic classes like jss364)
      const count = await this.page.evaluate(() => {
        const monthRx = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+20\d\d\b/i;
        const cards = Array.from(document.querySelectorAll('*')).filter(el => {
          if (el.children.length > 3 || el.tagName === 'BODY') return false;
          return monthRx.test(el.textContent || '');
        });
        // Deduplicate: keep only leaf-most elements
        return cards.filter(el => !cards.some(other => other !== el && el.contains(other))).length;
      });
      return count;
    } catch {
      return 0;
    }
  }
}