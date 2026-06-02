import { Page, Locator } from '@playwright/test';

export class ScheduleGroup {
  readonly page: Page;
  readonly scheduleTab: Locator;
  readonly monthDropdown: Locator;

  constructor(page: Page) {
    this.page = page;
    this.scheduleTab = page.locator('a.scroll-link', { hasText: 'Schedules' }).first();
    this.monthDropdown = page.locator('[title="Click Here to Select Preferred Month"] [role="button"]').first();
  }

  async open(url: string): Promise<number> {
    const response = await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await this.page.waitForTimeout(2000);
    return response?.status() ?? 0;
  }

  async clickSchedules(): Promise<void> {
    await this.scheduleTab.scrollIntoViewIfNeeded();
    await this.scheduleTab.click();
    await this.page.waitForTimeout(2000);
    console.log('📅 Schedules tab clicked');
  }

  // ─────────────────────────────
  // MONTH DROPDOWN
  // ─────────────────────────────
 /* async openMonthDropdown(): Promise<boolean> {
    try {
      await this.monthDropdown.click();

      await this.page.locator('[role="listbox"]').waitFor({
        state: 'visible',
        timeout: 5000,
      });

      return true;
    } catch {
      return false;
    }
  }

  async getUIMonths(): Promise<string[]> {
    const opened = await this.openMonthDropdown();
    if (!opened) return [];

    const options = this.page.locator('[role="listbox"] [role="option"]');
    const texts = await options.allTextContents();

    await this.page.keyboard.press('Escape');

    return texts.map(t => t.trim().slice(0, 3));
  } */

  // ─────────────────────────────
  // SELECT MONTH (FIXED)
  // ─────────────────────────────
  /* async selectMonth(month: string): Promise<boolean> {
    const opened = await this.openMonthDropdown();
    if (!opened) return false;

    const options = this.page.locator('[role="listbox"] [role="option"]');

    const target = options
      .filter({ hasText: new RegExp(`^${month}`, 'i') })
      .first();

    if (!(await target.isVisible().catch(() => false))) {
      console.log(`⏭ ${month} not found`);
      await this.page.keyboard.press('Escape');
      return false;
    }

    // capture current schedule content
    const before = await this.page.locator('[class*="schedule"]').first().textContent();

    await target.click();

    // wait for DOM change (NOT network)
    await this.page.waitForFunction(
      (prev) => {
        const el = document.querySelector('[class*="schedule"]');
        return el && el.textContent !== prev;
      },
      before
    ).catch(() => {});

    await this.page.waitForTimeout(1000);

    console.log(`📆 Selected month: ${month}`);
    return true;
  }  */
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



  // ─────────────────────────────
  // LOAD ALL EVENTS
  // ─────────────────────────────
/*  async loadAllSchedules(): Promise<void> {
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
  }  */

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
  // ────────

  // ─────────────────────────────
  // DATE EXTRACTION (UNCHANGED)
  // ─────────────────────────────
/*  async extractPageDates(): Promise<string[]> {
    return await this.page.evaluate(() => {
      const monthMap: Record<string, string> = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04',
        May: '05', Jun: '06', Jul: '07', Aug: '08',
        Sep: '09', Oct: '10', Nov: '11', Dec: '12',
      };

      const allDates: string[] = [];

      const anchors = Array.from(document.querySelectorAll('*')).filter(el =>
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+20\d\d/i.test(el.textContent || '')
      );

      for (const anchor of anchors) {
        const txt = (anchor.textContent || '').trim();
        const match = txt.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(20\d\d)\b/i);

        if (!match) continue;

        const month = monthMap[match[1].slice(0, 3)];
        const year = match[2];

        const dayMatches = txt.match(/\b\d{1,2}\b/g) || [];

        for (const d of dayMatches) {
          const day = Number(d);
          if (day >= 1 && day <= 31) {
            allDates.push(`${year}-${month}-${String(day).padStart(2, '0')}`);
          }
        }
      }

      return [...new Set(allDates)].sort();
    });
  }  */

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


  // ─────────────────────────────
  // PRICE EXTRACTION (FIXED)
  // ─────────────────────────────
/*  async extractPagePrices(): Promise<string[]> {
    return await this.page.evaluate(() => {
      const results: string[] = [];

      const codePattern   = /^[A-Z]{2,4}\s+([\d,]+)$/;   // ALL 83390
      const symbolPattern = /^[$€£₹¥₩₦฿₫₱]\s*([\d,]+)$/; // ₹ 83390

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      );

      let node: Node | null;

      while ((node = walker.nextNode())) {
        const raw = (node.textContent || '').trim();

        if (!raw || raw.length > 20) continue;

        let num: string | null = null;

        const m1 = raw.match(codePattern);
        if (m1) num = m1[1].replace(/,/g, '');

        if (!num) {
          const m2 = raw.match(symbolPattern);
          if (m2) num = m2[1].replace(/,/g, '');
        }

        if (num && num.length >= 3 && num.length <= 8) {
          results.push(num);
        }
      }

      return [...new Set(results)]; */
       private async extractCoursePrices(): Promise<string[]> {
    return await this.page.evaluate(() => {
      const results: string[] = [];

      // Match: "ALL 125290" | "EUR 1,180" | "USD 1495" | "$ 1310"
      const codePattern   = /^[A-Z]{2,4}\s+([\d,]+)$/;   // "ALL 125290"
      const symbolPattern = /^[$€£₹¥₩₦฿₫₱]\s*([\d,]+)$/; // "$ 1310"

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      );

      let node: Node | null;
      while ((node = walker.nextNode())) {
        const raw = (node.textContent || '').trim();

        // Skip empty, too long, or pure whitespace
        if (!raw || raw.length > 20) continue;

        let num: string | null = null;

        const m1 = raw.match(codePattern);
        if (m1) num = m1[1].replace(/,/g, '');

        if (!num) {
          const m2 = raw.match(symbolPattern);
          if (m2) num = m2[1].replace(/,/g, '');
        }

        // Only keep if it's a valid price-length number (3–8 digits)
        if (num && num.length >= 3 && num.length <= 8) {
          results.push(num);
        }
      }

      return [...new Set(results)];
    });
  }

  // ─────────────────────────────────────────────
  // GET MATCHED PRICES — main method for spec
  //
  // PASS → returns matched prices only
  // FAIL → returns actual prices from page
  //         e.g. [125290, 112765]
  // ─────────────────────────────────────────────
  async getMatchedPrices(
    excelPrice: string,
    excelDiscount: string
  ): Promise<{
    matchedPrices: string[];
    displayPrices: string[];
  }> {
    const pagePrices = await this.extractCoursePrices();
    const targets    = [excelPrice, excelDiscount].filter(Boolean);
    const matched    = pagePrices.filter(p => targets.includes(p));

    if (matched.length > 0) {
      return { matchedPrices: matched, displayPrices: matched };
    }

    // FAIL — show exactly what's on the page
    return { matchedPrices: [], displayPrices: pagePrices };
  }
}

