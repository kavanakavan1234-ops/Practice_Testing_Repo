import { Page } from '@playwright/test';

export class PMPCoursePage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ─────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────
  async openCourse(courseSlug: string, countryCode: string): Promise<number> {
    const url = `https://invensislearning.com/${countryCode}/${courseSlug}/`;
    console.log(`🌐 Opening: ${url}`);
    try {
      const response = await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await this.page.waitForTimeout(3000);
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
        if (await el.isVisible({ timeout: 1500 })) {
          await el.click({ timeout: 3000 });
          await this.page.waitForTimeout(500);
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
  // CLICK "VIEW DATES & ENROLL" / SCHEDULES BUTTON
  // ─────────────────────────────────────────────
  async clickSchedule(): Promise<void> {
    const patterns = [
      /view dates/i,
      /enroll/i,
      /schedules/i,
      /batch/i,
      /book now/i,
    ];

    for (const pattern of patterns) {
      try {
        const btn = this.page.getByRole('button', { name: pattern });
        if (await btn.first().isVisible({ timeout: 3000 })) {
          await btn.first().scrollIntoViewIfNeeded();
          await btn.first().click({ timeout: 5000 });
          console.log(`   📅 Schedule button clicked (matched: ${pattern})`);
          await this.page.waitForTimeout(2500);
          return;
        }
      } catch { /* try next */ }
    }

    // Final fallback — text match
    try {
      const btn = this.page.getByText('Schedules', { exact: true });
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.scrollIntoViewIfNeeded();
        await btn.click({ timeout: 5000 });
        console.log(`   📅 Schedules tab clicked (text fallback)`);
        await this.page.waitForTimeout(2500);
      }
    } catch { /* tab not present */ }
  }

  // ─────────────────────────────────────────────
  // SELECT MONTH FROM DROPDOWN
  //
  // Tries multiple strategies:
  // 1. Native <select id="custom-id"> via selectOption
  // 2. Click-to-open then click option (styled dropdown)
  // 3. Any <select> on page that contains the month option
  // ─────────────────────────────────────────────
  async selectMonth(month: string): Promise<boolean> {
    // Strategy 1: Native select with id="custom-id"
    try {
      const dropdown = this.page.locator('#custom-id');
      await dropdown.waitFor({ state: 'visible', timeout: 6000 });
      await dropdown.selectOption({ label: month });
      console.log(`   📆 Month "${month}" selected via #custom-id (native select)`);
      await this.page.waitForTimeout(2000);
      return true;
    } catch { /* try next strategy */ }

    // Strategy 2: Click to open styled dropdown, then click the option
    try {
      const dropdown = this.page.locator('#custom-id');
      if (await dropdown.isVisible({ timeout: 3000 })) {
        await dropdown.click({ timeout: 4000 });
        await this.page.waitForTimeout(600);

        // Try getByRole option first
        const option = this.page.getByRole('option', { name: month, exact: true });
        if (await option.isVisible({ timeout: 2000 })) {
          await option.click({ timeout: 3000 });
          console.log(`   📆 Month "${month}" selected via option click on #custom-id`);
          await this.page.waitForTimeout(2000);
          return true;
        }

        // Try li/div containing month text inside dropdown
        const listItem = this.page.locator(`[id*="custom"] li:has-text("${month}"), [class*="dropdown"] li:has-text("${month}")`).first();
        if (await listItem.isVisible({ timeout: 2000 })) {
          await listItem.click({ timeout: 3000 });
          console.log(`   📆 Month "${month}" selected via list item fallback`);
          await this.page.waitForTimeout(2000);
          return true;
        }
      }
    } catch { /* try next strategy */ }

    // Strategy 3: Any <select> on the page with a matching option
    try {
      const allSelects = this.page.locator('select');
      const count = await allSelects.count();
      for (let i = 0; i < count; i++) {
        const sel = allSelects.nth(i);
        try {
          await sel.selectOption({ label: month });
          console.log(`   📆 Month "${month}" selected via fallback select[${i}]`);
          await this.page.waitForTimeout(2000);
          return true;
        } catch { /* try next */ }
      }
    } catch { /* ignore */ }

    // Strategy 4: Look for any visible element with exact month text inside a known schedule section
    try {
      const monthBtn = this.page.locator(
        `[class*="schedule"] *:has-text("${month}"), [class*="batch"] *:has-text("${month}"), [class*="filter"] *:has-text("${month}")`
      ).first();
      if (await monthBtn.isVisible({ timeout: 2000 })) {
        await monthBtn.click({ timeout: 3000 });
        console.log(`   📆 Month "${month}" selected via section element fallback`);
        await this.page.waitForTimeout(2000);
        return true;
      }
    } catch { /* ignore */ }

    console.log(`   ⚠️  Could not select month "${month}" — dropdown not found or month not in list`);
    return false;
  }

  // ─────────────────────────────────────────────
  // CLICK "LOAD MORE SCHEDULES" UNTIL GONE
  // ─────────────────────────────────────────────
  async loadAllSchedules(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      try {
        // Try multiple selectors for the Load More button
        const selectors = [
          this.page.getByText('Load More Schedules', { exact: true }),
          this.page.getByText('Load More Schedules'),
          this.page.getByRole('button', { name: /load more/i }),
          this.page.locator('button:has-text("Load More")'),
          this.page.locator('[class*="loadMore"], [class*="load-more"]'),
        ];

        let clicked = false;
        for (const btn of selectors) {
          try {
            const visible = await btn.first().isVisible({ timeout: 1500 });
            if (visible) {
              await btn.first().scrollIntoViewIfNeeded();
              await btn.first().click({ timeout: 5000 });
              console.log(`   🔽 "Load More Schedules" clicked (attempt ${attempts + 1})`);
              await this.page.waitForTimeout(2500);
              clicked = true;
              break;
            }
          } catch { /* try next selector */ }
        }

        if (!clicked) break; // No button visible → all schedules loaded
        attempts++;
      } catch {
        break;
      }
    }

    if (attempts === 0) {
      console.log(`   ℹ️  No "Load More Schedules" button found (all schedules already visible)`);
    } else {
      console.log(`   ✅ All schedules loaded (${attempts} click(s))`);
    }
  }

  // ─────────────────────────────────────────────
  // EXTRACT ALL PRICES VISIBLE ON PAGE
  //
  // Matches: "USD 1495"  "BHD 195270"  "$ 745"  "62440"
  // Also matches: "1,495" "1495.00"
  // Excludes years (2020–2030) and short numbers.
  // ─────────────────────────────────────────────
  async extractAllVisiblePrices(): Promise<string[]> {
    return await this.page.evaluate((): string[] => {
      const priceCodeRx   = /^[A-Z]{2,4}\s+([\d,]+)(\.\d+)?$/;
      const priceSymbolRx = /^[$€£₹¥₩₦฿₫₱]\s*([\d,]+)(\.\d+)?$/;
      const bareRx        = /^[\d,]{3,12}(\.\d{1,2})?$/;

      function parsePrice(raw: string): string | null {
        const t = raw.trim();
        if (!t || t.length > 25) return null;

        const m1 = t.match(priceCodeRx);
        if (m1) {
          const n = m1[1].replace(/,/g, '');
          return n.length >= 3 && n.length <= 9 ? n : null;
        }
        const m2 = t.match(priceSymbolRx);
        if (m2) {
          const n = m2[1].replace(/,/g, '');
          return n.length >= 3 && n.length <= 9 ? n : null;
        }
        const m3 = t.match(bareRx);
        if (m3) {
          // Remove decimals (e.g. "1495.00" → "1495")
          const n = t.split('.')[0].replace(/,/g, '');
          if (n.length >= 3 && n.length <= 9 && !(n >= '2020' && n <= '2030')) {
            return n;
          }
        }
        return null;
      }

      const prices: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const p = parsePrice(node.textContent || '');
        if (p) prices.push(p);
      }
      return [...new Set(prices)];
    });
  }

  // ─────────────────────────────────────────────
  // VERIFY PRICE (AND OPTIONALLY DISCOUNT) FOR ONE MONTH
  //
  // 1. Select month from dropdown
  // 2. Click "Load More Schedules" until gone
  // 3. Extract all visible prices
  // 4. Return pass/fail based on what was found
  //
  // If only price is provided → verify price is on page
  // If price + discount provided → verify BOTH are on page
  // ─────────────────────────────────────────────
  async verifyPriceForMonth(
    month: string,
    targetPrice: string,
    targetDiscount?: string
  ): Promise<{ found: boolean; webPrices: string[]; matchDetails: string }> {
    const selected = await this.selectMonth(month);
    if (!selected) {
      return { found: false, webPrices: [], matchDetails: 'Month selection failed' };
    }

    await this.loadAllSchedules();

    const webPrices = await this.extractAllVisiblePrices();

    const priceFound    = webPrices.includes(targetPrice);
    const discountFound = targetDiscount ? webPrices.includes(targetDiscount) : true; // no discount to check → true

    const found = priceFound && discountFound;

    let matchDetails = '';
    if (found) {
      matchDetails = targetDiscount
        ? `Price ${targetPrice} ✅ + Discount ${targetDiscount} ✅`
        : `Price ${targetPrice} ✅`;
    } else {
      const parts: string[] = [];
      if (!priceFound)    parts.push(`Price ${targetPrice} ❌`);
      if (targetDiscount && !discountFound) parts.push(`Discount ${targetDiscount} ❌`);
      matchDetails = parts.join(' | ');
    }

    return { found, webPrices, matchDetails };
  }
}