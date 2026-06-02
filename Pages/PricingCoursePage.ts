import { Page } from '@playwright/test';

export class PricingCoursePage {
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
      // ⏱ 1500ms — enough for JS to paint initial content
      await this.page.waitForTimeout(1500);
      return response?.status() || 0;
    } catch {
      console.log(`   ⚠️  Navigation failed`);
      return 0;
    }
  }

  // ─────────────────────────────────────────────
  // CLOSE POPUP — silent, fast
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
        // ⏱ 500ms check — popup is either there or not
        if (await el.isVisible({ timeout: 500 })) {
          await el.click({ timeout: 1500 });
          await this.page.waitForTimeout(300);
          break;
        }
      } catch { /* no popup */ }
    }
  }

  // ─────────────────────────────────────────────
  // SCROLL — triggers lazy-load, then resets
  // ─────────────────────────────────────────────
  async scrollPage(): Promise<void> {
    try {
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await this.page.waitForTimeout(400);
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
        // ⏱ 1500ms — reduced from 2000ms
        if (await btn.first().isVisible({ timeout: 1500 })) {
          await btn.first().scrollIntoViewIfNeeded();
          await btn.first().click({ timeout: 3000 });
          console.log(`   📅 Schedule button clicked (matched: ${pattern})`);
          // ⏱ 1500ms — reduced from 2000ms
          await this.page.waitForTimeout(1500);
          return;
        }
      } catch { /* try next */ }
    }

    try {
      const btn = this.page.getByText('Schedules', { exact: true });
      if (await btn.isVisible({ timeout: 1000 })) {
        await btn.scrollIntoViewIfNeeded();
        await btn.click({ timeout: 3000 });
        console.log(`   📅 Schedules tab clicked (text fallback)`);
        await this.page.waitForTimeout(1500);
      }
    } catch { /* tab not present */ }
  }

  // ─────────────────────────────────────────────
  // SELECT MONTH FROM DROPDOWN
  //
  // ⚡ KEY OPTIMISATION:
  // The site uses a STYLED dropdown (not a native <select>), so
  // Strategy 1 (native selectOption via waitFor) ALWAYS fails and
  // burned 5,000ms per month = 30s per row = ~57 wasted minutes total.
  //
  // New order:
  //   S1: Try native selectOption with a SHORT 800ms probe only
  //   S2: Click to open → click option  ← this is what actually works
  //   S3: Any <select> fallback
  //   S4: Section text element fallback
  // ─────────────────────────────────────────────
  async selectMonth(month: string): Promise<boolean> {

    // ── Strategy 1: Quick native-select probe (800ms max, not 5000ms) ──
    // Only attempt if the element exists AND responds to selectOption fast.
    // If the site truly has a native <select>, this saves a click-cycle.
    try {
      const dropdown = this.page.locator('#custom-id');
      // Short visibility check — don't wait 5s for something that isn't there
      const visible = await dropdown.isVisible({ timeout: 800 }).catch(() => false);
      if (visible) {
        // Try native selectOption with a tight timeout
        await Promise.race([
          dropdown.selectOption({ label: month }),
          new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 800)),
        ]);
        console.log(`   📆 Month "${month}" selected via #custom-id (native)`);
        await this.page.waitForTimeout(800);
        return true;
      }
    } catch { /* styled dropdown — fall through immediately */ }

    // ── Strategy 2: Click to open styled dropdown → click option ──
    // This is the path that actually works on this site.
    try {
      const dropdown = this.page.locator('#custom-id');
      if (await dropdown.isVisible({ timeout: 1500 })) {
        await dropdown.click({ timeout: 2000 });
        // ⏱ 400ms — enough for dropdown list to paint
        await this.page.waitForTimeout(400);

        // Try role=option first
        const option = this.page.getByRole('option', { name: month, exact: true });
        if (await option.isVisible({ timeout: 1000 })) {
          await option.click({ timeout: 1500 });
          console.log(`   📆 Month "${month}" selected via option click on #custom-id`);
          // ⏱ 800ms — wait for schedule cards to re-render
          await this.page.waitForTimeout(800);
          return true;
        }

        // li / div text match inside dropdown
        const listItem = this.page.locator(
          `[id*="custom"] li:has-text("${month}"), [class*="dropdown"] li:has-text("${month}")`
        ).first();
        if (await listItem.isVisible({ timeout: 1000 })) {
          await listItem.click({ timeout: 1500 });
          console.log(`   📆 Month "${month}" selected via list item click`);
          await this.page.waitForTimeout(800);
          return true;
        }
      }
    } catch { /* try next */ }

    // ── Strategy 3: Any <select> on page ──
    try {
      const allSelects = this.page.locator('select');
      const count = await allSelects.count();
      for (let i = 0; i < count; i++) {
        try {
          await allSelects.nth(i).selectOption({ label: month });
          console.log(`   📆 Month "${month}" selected via fallback select[${i}]`);
          await this.page.waitForTimeout(800);
          return true;
        } catch { /* try next */ }
      }
    } catch { /* ignore */ }

    // ── Strategy 4: Section element containing month text ──
    try {
      const monthBtn = this.page.locator(
        `[class*="schedule"] *:has-text("${month}"), ` +
        `[class*="batch"] *:has-text("${month}"), ` +
        `[class*="filter"] *:has-text("${month}")`
      ).first();
      if (await monthBtn.isVisible({ timeout: 1000 })) {
        await monthBtn.click({ timeout: 1500 });
        console.log(`   📆 Month "${month}" selected via section text element`);
        await this.page.waitForTimeout(800);
        return true;
      }
    } catch { /* ignore */ }

    console.log(`   ⚠️  Could not select month "${month}"`);
    return false;
  }

  // ─────────────────────────────────────────────
  // EXTRACT FIRST EVENT PRICE FROM SCHEDULE SECTION
  //
  // Prices appear as "ALL 125290", "DZD 195270", "USD 1,495".
  // We scope to the schedule container so we never pick up phone
  // numbers (like 94000) from the header/footer.
  // ─────────────────────────────────────────────
  async extractFirstEventPrice(): Promise<string> {
    // ⏱ 500ms — reduced from 1000ms; page already re-rendered after selectMonth
    await this.page.waitForTimeout(500);

    const result = await this.page.evaluate((): { price: string; debug: string } => {

      // "ALL 125290" / "USD 1,495" / "DZD 195270"
      const currencyRx = /\b[A-Z]{2,4}\s+([\d,]+(?:\.\d{1,2})?)\b/g;
      // "$ 1495" / "£ 1,480"
      const symbolRx = /[$€£₹¥₩₦฿₫₱]\s*([\d,]+(?:\.\d{1,2})?)/g;
      const yearRx   = /^20[12]\d$/;

      function clean(raw: string): string {
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

          const cs = window.getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;

          const tag = el.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'meta', 'head'].includes(tag)) continue;

          // Skip phone / nav / header / footer areas
          const ctx = ((el.className || '') + ' ' + (el.id || '')).toLowerCase();
          if (/phone|tel|contact|header|footer|nav|menu|topbar|banner/.test(ctx)) continue;

          const text = (node.textContent || '').trim();
          if (!text || text.length > 60) continue;

          currencyRx.lastIndex = 0;
          let m = currencyRx.exec(text);
          if (m) { const p = clean(m[1]); if (p) return p; }

          symbolRx.lastIndex = 0;
          m = symbolRx.exec(text);
          if (m) { const p = clean(m[1]); if (p) return p; }
        }
        return '';
      }

      // Step 1: Known schedule container selectors
      const containerSelectors = [
        '[class*="scheduleSection"]', '[class*="schedule-section"]',
        '[class*="scheduleWrap"]',    '[class*="schedule_wrap"]',
        '[class*="batchSection"]',    '[class*="batch-section"]',
        '[class*="batchWrap"]',       '[class*="batch_wrap"]',
        '[class*="scheduleTab"]',     '[class*="schedule-tab"]',
        '[class*="scheduleListing"]', '[class*="schedule-listing"]',
        '[class*="courseSchedule"]',  '[class*="course-schedule"]',
        '[id*="schedule"]',           '[id*="batch"]',
      ];
      for (const sel of containerSelectors) {
        const el = document.querySelector(sel);
        if (el && (el.textContent || '').trim().length > 30) {
          const price = extractFromElement(el);
          if (price) return { price, debug: `selector:${sel}` };
        }
      }

      // Step 2: Walk up from #custom-id dropdown
      const dropdown = document.querySelector('#custom-id');
      if (dropdown) {
        let parent = dropdown.parentElement;
        for (let depth = 0; depth < 10 && parent && parent !== document.body; depth++) {
          const price = extractFromElement(parent);
          if (price) return { price, debug: `dropdown-ancestor depth:${depth}` };
          parent = parent.parentElement;
        }
      }

      // Step 3: Full-page currency-code scan — NEVER matches bare phone numbers
      const bodyText = document.body.innerText;
      currencyRx.lastIndex = 0;
      let m2: RegExpExecArray | null;
      while ((m2 = currencyRx.exec(bodyText)) !== null) {
        const price = clean(m2[1]);
        if (price) return { price, debug: `body currency scan` };
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

    const matchDetails = found
      ? (priceMatched
          ? `Price ${targetPrice} ✅  (web: ${webPrice})`
          : `Discount ${targetDiscount} ✅  (web: ${webPrice})`)
      : `Expected ${targetPrice}${targetDiscount ? ` or ${targetDiscount}` : ''} ❌  (web: ${webPrice})`;

    return { found, webPrice, matchDetails };
  }
}