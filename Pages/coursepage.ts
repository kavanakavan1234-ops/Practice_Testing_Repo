import { Page, Locator } from '@playwright/test';

export class CoursePage {
  private page: Page;
  private scheduleBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.scheduleBtn = page.getByText('Schedules', { exact: true });
  }

  // ─────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────
  async openCourse(courseSlug: string, countryCode: string): Promise<number> {
    const url = `https://stagingbeta.invensislearning.com/${countryCode}/${courseSlug}/`;
    console.log(`🌐 Opening : ${url}`);
    try {
      const response = await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 25_000,
      });
      await this.page.waitForTimeout(2500);
      return response?.status() || 0;
    } catch {
      console.log(`   ⚠️  Navigation failed`);
      return 0;
    }
  }

  // ─────────────────────────────────────────────
  // CLOSE POPUP — silent
  // ─────────────────────────────────────────────
  async closePopupIfVisible(): Promise<void> {
    const selectors = [
      '.cyt-closeIcon > svg',
      '[class*="closeIcon"]',
      '[aria-label="close"]',
      'button.close',
      '[class*="modal"] [class*="close"]',
    ];
    for (const sel of selectors) {
      try {
        const el = this.page.locator(sel).first();
        if (await el.isVisible({ timeout: 1000 })) {
          await el.click({ timeout: 3000 });
          await this.page.waitForTimeout(400);
          break;
        }
      } catch { /* no popup */ }
    }
  }

  // ─────────────────────────────────────────────
  // SCROLL — silent
  // ─────────────────────────────────────────────
  async scrollPage(): Promise<void> {
    try {
      await this.page.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight / 2)
      );
      await this.page.waitForTimeout(800);
      await this.page.evaluate(() => window.scrollTo(0, 0));
      await this.page.waitForTimeout(300);
    } catch { /* ignore */ }
  }

  // ─────────────────────────────────────────────
  // CLICK SCHEDULES TAB
  // ─────────────────────────────────────────────
  async clickSchedule(): Promise<void> {
    try {
      const visible = await this.scheduleBtn.isVisible({ timeout: 4000 });
      if (!visible) return;
      await this.scheduleBtn.scrollIntoViewIfNeeded();
      await this.scheduleBtn.click({ timeout: 5000 });
      console.log(`   📅 Schedules tab clicked`);
      await this.page.waitForTimeout(2000);
    } catch { /* tab not present */ }
  }

  // ─────────────────────────────────────────────
  // EXTRACT COURSE PRICES
  //
  // From screenshot the schedule card shows:
  //   ALL 125290  ← strikethrough  (<del> or <s>)
  //   ALL 112765  ← bold price     (main price text)
  //
  // These text nodes look like:  "ALL 125290"
  // Pattern: 2-4 uppercase letters + space + digits
  //
  // We ONLY extract numbers that are directly
  // preceded by a currency code (ALL, EUR, USD etc.)
  // This guarantees we never pick up IDs or years.
  // ─────────────────────────────────────────────
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