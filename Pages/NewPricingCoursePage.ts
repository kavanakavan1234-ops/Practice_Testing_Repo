import { Page } from '@playwright/test';

export class NewPricingCoursePage {
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
      await this.page.waitForTimeout(1000);
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
          await el.click({ timeout: 2000 });
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
      await this.page.waitForTimeout(600);
      await this.page.evaluate(() => window.scrollTo(0, 0));
      await this.page.waitForTimeout(200);
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
        if (await btn.first().isVisible({ timeout: 2000 })) {
          await btn.first().scrollIntoViewIfNeeded();
          await btn.first().click({ timeout: 4000 });
          console.log(`   📅 Schedule button clicked (matched: ${pattern})`);
          await this.page.waitForTimeout(2000);
          return;
        }
      } catch { /* try next */ }
    }

    try {
      const btn = this.page.getByText('Schedules', { exact: true });
      if (await btn.isVisible({ timeout: 1500 })) {
        await btn.scrollIntoViewIfNeeded();
        await btn.click({ timeout: 4000 });
        console.log(`   📅 Schedules tab clicked (text fallback)`);
        await this.page.waitForTimeout(2000);
      }
    } catch { /* tab not present */ }
  }

  // ─────────────────────────────────────────────
  // SELECT MONTH FROM DROPDOWN
  // ─────────────────────────────────────────────
  async selectMonth(month: string): Promise<boolean> {
    // Strategy 1: Native select with id="custom-id"
    try {
      const dropdown = this.page.locator('#custom-id');
      await dropdown.waitFor({ state: 'visible', timeout: 3000 });
      await dropdown.selectOption({ label: month });
      console.log(`   📆 Month "${month}" selected via #custom-id (native select)`);
      await this.page.waitForTimeout(1000);
      return true;
    } catch { /* try next */ }

    // Strategy 2: Click styled dropdown → click option
    try {
      const dropdown = this.page.locator('#custom-id');
      if (await dropdown.isVisible({ timeout: 2000 })) {
        await dropdown.click({ timeout: 3000 });
        await this.page.waitForTimeout(500);

        const option = this.page.getByRole('option', { name: month, exact: true });
        if (await option.isVisible({ timeout: 1500 })) {
          await option.click({ timeout: 2000 });
          console.log(`   📆 Month "${month}" selected via option click on #custom-id`);
          await this.page.waitForTimeout(1500);
          return true;
        }

        const listItem = this.page.locator(
          `[id*="custom"] li:has-text("${month}"), [class*="dropdown"] li:has-text("${month}")`
        ).first();
        if (await listItem.isVisible({ timeout: 1500 })) {
          await listItem.click({ timeout: 2000 });
          console.log(`   📆 Month "${month}" selected via list item fallback`);
          await this.page.waitForTimeout(1500);
          return true;
        }
      }
    } catch { /* try next */ }

    // Strategy 3: Any <select> on the page
    try {
      const allSelects = this.page.locator('select');
      const count = await allSelects.count();
      for (let i = 0; i < count; i++) {
        try {
          await allSelects.nth(i).selectOption({ label: month });
          console.log(`   📆 Month "${month}" selected via fallback select[${i}]`);
          await this.page.waitForTimeout(1500);
          return true;
        } catch { /* try next */ }
      }
    } catch { /* ignore */ }

    // Strategy 4: Section element with month text
    try {
      const monthBtn = this.page.locator(
        `[class*="schedule"] *:has-text("${month}"), [class*="batch"] *:has-text("${month}"), [class*="filter"] *:has-text("${month}")`
      ).first();
      if (await monthBtn.isVisible({ timeout: 1500 })) {
        await monthBtn.click({ timeout: 2000 });
        console.log(`   📆 Month "${month}" selected via section element fallback`);
        await this.page.waitForTimeout(1500);
        return true;
      }
    } catch { /* ignore */ }

    console.log(`   ⚠️  Could not select month "${month}"`);
    return false;
  }

  // ─────────────────────────────────────────────
  // EXTRACT FIRST EVENT PRICE FROM SCHEDULE SECTION
  //
  // The page shows prices as "ALL 125290", "DZD 195270", "USD 1495".
  // The number 94000 (seen in logs) is a phone number in the header —
  // we avoid it by:
  //   1. Scoping search to the schedule container only
  //   2. ONLY matching currency-code prefixed numbers (e.g. "ALL 125290")
  //      or symbol-prefixed numbers (e.g. "$ 1495")
  //   3. Never matching bare numbers (which catches phone numbers)
  // ─────────────────────────────────────────────
  async extractFirstEventPrice(): Promise<string> {
    // Wait for schedule content to settle after month selection
    await this.page.waitForTimeout(1000);

    const result = await this.page.evaluate((): { price: string; debug: string } => {

      // ── Regex: "ALL 125290" or "USD 1,495" or "EUR 1.310" ──
      // Group 1 = currency code (2–4 uppercase letters)
      // Group 2 = number (with optional commas or decimal)
      const currencyRx = /\b[A-Z]{2,4}\s+([\d,]+(?:\.\d{1,2})?)\b/g;

      // ── Regex: symbol-prefixed "$ 1495" "£ 1,480" "€ 1.310" ──
      const symbolRx = /[$€£₹¥₩₦฿₫₱]\s*([\d,]+(?:\.\d{1,2})?)/g;

      const yearRx = /^20[12]\d$/;

      function clean(raw: string): string {
        // Remove commas and strip decimals: "1,495.00" → "1495"
        const n = raw.replace(/,/g, '').split('.')[0];
        if (n.length < 3 || n.length > 9) return '';
        if (yearRx.test(n)) return '';
        return n;
      }

      function extractFromElement(root: Element): string {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node: Node | null;

        while ((node = walker.nextNode())) {
          const el = node.parentElement;
          if (!el) continue;

          // Skip invisible elements
          const cs = window.getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;

          // Skip structural/navigation elements
          const tag = el.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'meta', 'head'].includes(tag)) continue;

          const text = (node.textContent || '').trim();
          if (!text || text.length > 60) continue; // price nodes are short

          // Try currency-code pattern first — most reliable
          currencyRx.lastIndex = 0;
          let m = currencyRx.exec(text);
          if (m) {
            const price = clean(m[1]);
            if (price) return price;
          }

          // Try symbol pattern
          symbolRx.lastIndex = 0;
          m = symbolRx.exec(text);
          if (m) {
            const price = clean(m[1]);
            if (price) return price;
          }
        }
        return '';
      }

      // ── STEP 1: Find the schedule section container ──
      // Try specific selectors first, then walk up from the month dropdown
      const containerSelectors = [
        '[class*="scheduleSection"]',
        '[class*="schedule-section"]',
        '[class*="scheduleWrap"]',
        '[class*="schedule_wrap"]',
        '[class*="batchSection"]',
        '[class*="batch-section"]',
        '[class*="batchWrap"]',
        '[class*="batch_wrap"]',
        '[class*="scheduleTab"]',
        '[class*="schedule-tab"]',
        '[class*="scheduleListing"]',
        '[class*="schedule-listing"]',
        '[class*="courseSchedule"]',
        '[class*="course-schedule"]',
        '[id*="schedule"]',
        '[id*="batch"]',
      ];

      for (const sel of containerSelectors) {
        const el = document.querySelector(sel);
        if (el && (el.textContent || '').trim().length > 30) {
          const price = extractFromElement(el);
          if (price) return { price, debug: `selector: ${sel}` };
        }
      }

      // ── STEP 2: Walk up from the #custom-id dropdown ──
      // The dropdown and the price cards are siblings inside the same section
      const dropdown = document.querySelector('#custom-id');
      if (dropdown) {
        let parent = dropdown.parentElement;
        for (let depth = 0; depth < 10 && parent && parent !== document.body; depth++) {
          // Look for price inside this ancestor
          const price = extractFromElement(parent);
          if (price) return { price, debug: `dropdown-ancestor depth ${depth}` };
          parent = parent.parentElement;
        }
      }

      // ── STEP 3: Last resort — scan entire page innerText for
      //    currency-code prefixed prices ONLY (never bare numbers)
      //    This guarantees we never pick up phone numbers like 94000
      const bodyText = document.body.innerText;
      currencyRx.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = currencyRx.exec(bodyText)) !== null) {
        const price = clean(m[1]);
        if (price) return { price, debug: `body-text currency scan` };
      }

      return { price: '', debug: 'no currency-prefixed price found' };
    });

    if (result.price) {
      console.log(`   💰 Price: ${result.price}  [${result.debug}]`);
    } else {
      console.log(`   ⚠️  No price found  [${result.debug}]`);
    }

    return result.price;
  }

  // ─────────────────────────────────────────────
  // VERIFY FIRST EVENT PRICE FOR ONE MONTH
  // ─────────────────────────────────────────────
  async verifyFirstEventPriceForMonth(
    month: string,
    targetPrice: string,
    targetDiscount?: string,
  ): Promise<{ found: boolean; webPrice: string; matchDetails: string }> {

    const selected = await this.selectMonth(month);
    if (!selected) {
      return { found: false, webPrice: '', matchDetails: 'Month selection failed' };
    }

    const webPrice = await this.extractFirstEventPrice();

    if (!webPrice) {
      return { found: false, webPrice: '', matchDetails: 'No price found on page' };
    }

    const priceMatched    = webPrice === targetPrice;
    const discountMatched = targetDiscount ? webPrice === targetDiscount : false;
    const found           = priceMatched || discountMatched;

    let matchDetails: string;
    if (found) {
      matchDetails = priceMatched
        ? `Price ${targetPrice} ✅  (web: ${webPrice})`
        : `Discount ${targetDiscount} ✅  (web: ${webPrice})`;
    } else {
      matchDetails = `Expected ${targetPrice}${targetDiscount ? ` or ${targetDiscount}` : ''} ❌  (web: ${webPrice})`;
    }

    return { found, webPrice, matchDetails };
  }
}