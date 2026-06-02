import { Page, Locator } from '@playwright/test';

export class EventVerification {
  readonly page:          Page;
  readonly scheduleTab:   Locator;
  readonly monthDropdown: Locator;

  constructor(page: Page) {
    this.page = page;
    this.scheduleTab   = page.locator('a.scroll-link', { hasText: 'Schedules' }).first();
    this.monthDropdown = page.locator('[title="Click Here to Select Preferred Month"] [role="button"]').first();
  }

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

  async clickSchedules(): Promise<void> {
    try {
      await this.scheduleTab.scrollIntoViewIfNeeded();
      await this.scheduleTab.click();
      await this.page.waitForTimeout(2000);
      console.log(`   📅 Schedules tab clicked`);
    } catch {
      try {
        await this.page.getByText('Schedules', { exact: true }).first().click();
        await this.page.waitForTimeout(2000);
        console.log(`   📅 Schedules tab clicked (fallback)`);
      } catch { /* not found */ }
    }
  }

  async openMonthDropdown(): Promise<boolean> {
    try {
      const expanded = await this.monthDropdown.getAttribute('aria-expanded');
      if (expanded !== 'true') await this.monthDropdown.click();
      await this.page.locator('[role="listbox"]').waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async getUIMonths(): Promise<string[]> {
    try {
      const options = this.page.locator('[role="listbox"] [role="option"]');
      const texts   = await options.allTextContents();
      return texts.map(t => t.trim().slice(0, 3));
    } catch {
      return [];
    }
  }

  async selectMonth(month: string): Promise<void> {
    const option = this.page.locator('[role="listbox"] [role="option"]', {
      hasText: new RegExp(`^${month}`, 'i'),
    });
    await option.first().click();
    await this.page.locator('[role="listbox"]')
      .waitFor({ state: 'hidden', timeout: 5000 })
      .catch(() => {});
    await this.page.waitForTimeout(1000);
  }

    // 🔥 ADD THIS (based on your recorded code)
  async loadAllSchedules() {
    for (let i = 0; i < 20; i++) {
      const btn = this.page.getByText('Load More Schedules');

      if (await btn.isVisible().catch(() => false)) {
        console.log('🔄 Clicking Load More Schedules...');
        await btn.click();
        await this.page.waitForTimeout(2000);
      } else {
        break;
      }
    }
  }
  // ─────────────────────────────────────────────
  // EXTRACT ALL DATES VISIBLE ON PAGE
  //
  // Reads the schedule cards and extracts the
  // start date of each event as YYYY-MM-DD.
  //
  // Uses .monthYear class (confirmed from debug)
  // as anchor to find each card, then reads days.
  // ─────────────────────────────────────────────
  async extractPageDates(): Promise<string[]> {
    return await this.page.evaluate(() => {
      const monthMap: Record<string, string> = {
        Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06',
        Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12',
      };

      const allDates: string[] = [];

      // Find all small elements whose text is exactly "MonthName YYYY"
      const monthRx = /^\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(20\d\d)\s*$/i;
      const anchors = Array.from(document.querySelectorAll('*')).filter(el => {
        if (el.children.length > 2) return false;
        return monthRx.test((el.textContent || '').trim());
      });

      for (const anchor of anchors) {
        const txt   = (anchor.textContent || '').trim();
        const match = txt.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(20\d\d)\b/i);
        if (!match) continue;
        const month = monthMap[match[1].slice(0, 3)];
        const year  = match[2];
        if (!month) continue;

        // Walk UP to find the card (ancestor that has ≥2 day-number text nodes)
        let card: Element | null = anchor.parentElement;
        let ups = 0;
        while (card && ups < 15) {
          const w = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
          let dayCount = 0;
          let n: Node | null;
          while ((n = w.nextNode())) {
            const t = (n.textContent || '').trim();
            if (/^\d{1,2}$/.test(t)) {
              const d = parseInt(t, 10);
              if (d >= 1 && d <= 31) dayCount++;
            }
          }
          if (dayCount >= 2) break;
          card = card.parentElement;
          ups++;
        }
        if (!card) continue;

        // Collect all day numbers from card
        const dayNums: number[] = [];
        const w2 = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
        let n2: Node | null;
        while ((n2 = w2.nextNode())) {
          const t = (n2.textContent || '').trim();
          if (!/^\d{1,2}$/.test(t)) continue;
          const d = parseInt(t, 10);
          if (d >= 1 && d <= 31) dayNums.push(d);
        }
        if (dayNums.length === 0) continue;

        // Build all dates for this card
        const uniqueDays = [...new Set(dayNums)].sort((a, b) => a - b);
        for (const d of uniqueDays) {
          allDates.push(`${year}-${month}-${String(d).padStart(2, '0')}`);
        }
      }

      return [...new Set(allDates)].sort();
    });
  }
}