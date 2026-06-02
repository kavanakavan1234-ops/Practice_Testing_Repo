import { Page, Locator } from '@playwright/test';

export interface EventPriceGroup {
  eventName: string;
  prices:    string[];
}

// Months we iterate July → December
export const TARGET_MONTHS = [
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
export type TargetMonth = typeof TARGET_MONTHS[number];

export class PricingVerification {
  private page:        Page;
  private scheduleBtn: Locator;

  constructor(page: Page) {
    this.page        = page;
    this.scheduleBtn = page.getByText('Schedules', { exact: true });
  }

  // ─────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────
  async openCourse(courseSlug: string, countryCode: string): Promise<number> {
    const url = `https://invensislearning.com/${countryCode}/${courseSlug}/`;
    console.log(`🌐 Opening : ${url}`);
    try {
      const response = await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout:   30_000,
      });
      await this.page.waitForTimeout(1500);
      return response?.status() ?? 0;
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
        if (await el.isVisible({ timeout: 500 })) {
          await el.click({ timeout: 1500 });
          await this.page.waitForTimeout(300);
          break;
        }
      } catch { /* no popup */ }
    }
  }

  // ─────────────────────────────────────────────
  // SCROLL — triggers lazy-load, resets view
  // ─────────────────────────────────────────────
  async scrollPage(): Promise<void> {
    try {
      await this.page.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight / 2)
      );
      await this.page.waitForTimeout(400);
      await this.page.evaluate(() => window.scrollTo(0, 0));
      await this.page.waitForTimeout(200);
    } catch { /* ignore */ }
  }

  // ─────────────────────────────────────────────
  // CLICK SCHEDULES TAB
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
        if (await btn.first().isVisible({ timeout: 1500 })) {
          await btn.first().scrollIntoViewIfNeeded();
          await btn.first().click({ timeout: 3000 });
          console.log(`   📅 Schedule button clicked (matched: ${pattern})`);
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
        console.log(`   📅 Schedules tab clicked`);
        await this.page.waitForTimeout(1500);
      }
    } catch { /* tab not present */ }
  }

  // ─────────────────────────────────────────────
  // SELECT MONTH FROM DROPDOWN
  //
  // Strategy order (fastest-first, matching the actual site):
  //
  //   S1: #custom-id as native <select> (short 800ms probe)
  //   S2: Click #custom-id styled dropdown → click the month option   ← works on this site
  //       2a: getByRole('option') — React Select / Headless UI
  //       2b: li / div inside the open dropdown list
  //   S3: Any other <select> on the page with matching month option
  //   S4: Scoped clickable element with month text (schedule/batch/filter areas)
  // ─────────────────────────────────────────────
  async selectMonth(month: TargetMonth): Promise<boolean> {
    console.log(`   📆 Selecting month: ${month}`);

    // ── S1: Quick native <select> probe on #custom-id ──────────────────
    try {
      const dropdown = this.page.locator('#custom-id');
      const visible  = await dropdown.isVisible({ timeout: 800 }).catch(() => false);
      if (visible) {
        // Race against an 800ms timeout — if it's a styled dropdown selectOption will reject fast
        await Promise.race([
          dropdown.selectOption({ label: month }),
          new Promise<void>((_, r) => setTimeout(() => r(new Error('timeout')), 800)),
        ]);
        console.log(`      ✅ Month "${month}" selected via #custom-id native select`);
        await this.page.waitForTimeout(800);
        return true;
      }
    } catch { /* styled dropdown — fall through immediately */ }

    // ── S2: Click #custom-id styled dropdown → click the option ────────
    // This is the path that actually works on this site.
    try {
      const dropdown = this.page.locator('#custom-id');
      if (await dropdown.isVisible({ timeout: 1500 })) {
        await dropdown.scrollIntoViewIfNeeded();
        await dropdown.click({ timeout: 2000 });
        // Wait for dropdown list to paint
        await this.page.waitForTimeout(400);

        // 2a: role=option (React Select / Headless UI)
        try {
          const option = this.page.getByRole('option', { name: month, exact: true });
          if (await option.isVisible({ timeout: 1000 })) {
            await option.click({ timeout: 1500 });
            console.log(`      ✅ Month "${month}" selected via role=option`);
            await this.page.waitForTimeout(800);
            return true;
          }
        } catch { /* try li fallback */ }

        // 2b: li or div inside the open dropdown
        try {
          const listItem = this.page.locator(
            `[id*="custom"] li:has-text("${month}"), ` +
            `[class*="dropdown"] li:has-text("${month}"), ` +
            `[class*="menu"] li:has-text("${month}"), ` +
            `[class*="option"]:has-text("${month}")`
          ).first();
          if (await listItem.isVisible({ timeout: 1000 })) {
            await listItem.click({ timeout: 1500 });
            console.log(`      ✅ Month "${month}" selected via li/option inside #custom-id dropdown`);
            await this.page.waitForTimeout(800);
            return true;
          }
        } catch { /* dismiss and try next */ }

        // Dismiss the open dropdown before next strategy
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(200);
      }
    } catch { /* try next */ }

    // ── S3: Any other <select> on page with matching month options ──────
    try {
      const allSelects = this.page.locator('select');
      const count      = await allSelects.count();
      for (let i = 0; i < count; i++) {
        try {
          const opts     = await allSelects.nth(i).locator('option').allTextContents();
          const hasMonth = opts.some(o => o.toLowerCase().includes(month.toLowerCase()));
          if (!hasMonth) continue;
          await allSelects.nth(i).selectOption({ label: month });
          console.log(`      ✅ Month "${month}" selected via fallback select[${i}]`);
          await this.page.waitForTimeout(800);
          return true;
        } catch { /* try next select */ }
      }
    } catch { /* ignore */ }

    // ── S4: Scoped clickable text element in schedule/batch/filter ──────
    try {
      const monthEl = this.page.locator(
        `[class*="schedule"] *:has-text("${month}"), ` +
        `[class*="batch"] *:has-text("${month}"), ` +
        `[class*="filter"] *:has-text("${month}")`
      ).first();
      if (await monthEl.isVisible({ timeout: 1000 })) {
        await monthEl.click({ timeout: 1500 });
        console.log(`      ✅ Month "${month}" selected via scoped text element`);
        await this.page.waitForTimeout(800);
        return true;
      }
    } catch { /* ignore */ }

    console.log(`      ⚠️  Could not select month "${month}" — no matching element found`);
    return false;
  }

  // ─────────────────────────────────────────────
  // EXTRACT PRICES GROUPED BY EVENT/COURSE NAME
  //
  // After selectMonth() the schedule cards re-render for the chosen month.
  // We scope extraction to the schedule section, then fall back gradually.
  // ─────────────────────────────────────────────
  async extractPricesByEvent(): Promise<EventPriceGroup[]> {
    // Wait for cards to re-render after month change
    await this.page.waitForTimeout(500);

    return await this.page.evaluate((): EventPriceGroup[] => {

      // ── Price regex helpers ────────────────────────────────────────────
      // "ALL 125290", "DZD 195270", "USD 1,495", "BHD 1350"
      const priceCodeRx   = /^[A-Z]{2,4}\s+([\d,]+)$/;
      // "$ 1310", "£ 1,480", "€ 2595"
      const priceSymbolRx = /^[$€£₹¥₩₦฿₫₱]\s*([\d,]+)$/;
      const yearRx        = /^20[12]\d$/;

      function parsePrice(raw: string): string | null {
        const t = raw.trim();
        if (!t || t.length > 25) return null;

        const m1 = t.match(priceCodeRx);
        if (m1) {
          const n = m1[1].replace(/,/g, '');
          if (n.length < 3 || n.length > 9) return null;
          if (yearRx.test(n)) return null;
          return n;
        }

        const m2 = t.match(priceSymbolRx);
        if (m2) {
          const n = m2[1].replace(/,/g, '');
          if (n.length < 3 || n.length > 9) return null;
          if (yearRx.test(n)) return null;
          return n;
        }
        return null;
      }

      function getPricesInEl(el: Element): string[] {
        const prices: string[] = [];
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = w.nextNode())) {
          const parent = n.parentElement;
          if (parent) {
            const cs = window.getComputedStyle(parent);
            if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
            const tag = parent.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'meta'].includes(tag)) continue;
            // Skip phone/header/footer/nav noise
            const ctx = ((parent.className || '') + ' ' + (parent.id || '')).toLowerCase();
            if (/phone|tel|contact|header|footer|nav|menu|topbar|banner/.test(ctx)) continue;
          }
          const p = parsePrice(n.textContent || '');
          if (p) prices.push(p);
        }
        return [...new Set(prices)];
      }

      function isPriceText(text: string): boolean {
        return parsePrice(text) !== null;
      }

      const NOISE = /^(schedules?|batches?|enroll|book|buy|date|time|mode|fee|price|cost|discount|off|save|select|view|details?|more|register|add to cart|enquire|january|february|march|april|may|june|july|august|september|october|november|december)$/i;

      function isCourseName(text: string): boolean {
        const t = text.trim();
        return (
          t.length >= 5 &&
          !isPriceText(t) &&
          !NOISE.test(t) &&
          !/^\d+$/.test(t)
        );
      }

      const containerSelectors = [
        '[class*="scheduleSection"]', '[class*="schedule-section"]',
        '[class*="scheduleWrap"]',    '[class*="schedule_wrap"]',
        '[class*="scheduleContent"]', '[class*="schedule-content"]',
        '[class*="batchSection"]',    '[class*="batch-section"]',
        '[class*="batchWrap"]',       '[class*="batch_wrap"]',
        '[class*="scheduleTab"]',     '[class*="schedule-tab"]',
        '[class*="scheduleListing"]', '[class*="schedule-listing"]',
        '[class*="courseSchedule"]',  '[class*="course-schedule"]',
        '[id*="schedule"]',           '[id*="batch"]',
      ];

      const cardSelectors = [
        '[class*="scheduleCard"]',  '[class*="schedule_card"]',  '[class*="schedule-card"]',
        '[class*="batchCard"]',     '[class*="batch_card"]',     '[class*="batch-card"]',
        '[class*="courseCard"]',    '[class*="course_card"]',    '[class*="course-card"]',
        '[class*="scheduleItem"]',  '[class*="schedule_item"]',  '[class*="schedule-item"]',
        '[class*="batchItem"]',     '[class*="batch_item"]',     '[class*="batch-item"]',
        '[class*="priceCard"]',     '[class*="price_card"]',     '[class*="price-card"]',
        '[class*="eventCard"]',     '[class*="event_card"]',     '[class*="event-card"]',
      ];

      const titleSelectors = [
        'h2', 'h3', 'h4', 'h5', 'h6',
        '[class*="courseName"]', '[class*="course_name"]', '[class*="course-name"]',
        '[class*="eventName"]',  '[class*="event_name"]',  '[class*="event-name"]',
        '[class*="cardTitle"]',  '[class*="card_title"]',  '[class*="card-title"]',
        '[class*="title"]',      '[class*="heading"]',     '[class*="name"]',
        'strong', 'b', 'p', 'span',
      ];

      function tryExtractFromCards(root: Element): EventPriceGroup[] | null {
        for (const cardSel of cardSelectors) {
          const cards = Array.from(root.querySelectorAll(cardSel));
          if (cards.length < 1) continue;

          const groups: EventPriceGroup[] = [];
          for (const card of cards) {
            const prices = getPricesInEl(card);
            if (prices.length === 0) continue;

            let eventName = '';
            for (const titleSel of titleSelectors) {
              const els = Array.from(card.querySelectorAll(titleSel));
              for (const el of els) {
                const directText = Array.from(el.childNodes)
                  .filter(n => n.nodeType === Node.TEXT_NODE)
                  .map(n => (n.textContent || '').trim())
                  .join(' ')
                  .trim();
                const fullText  = (el.textContent || '').trim();
                const candidate = directText.length >= 5 ? directText : fullText;
                if (isCourseName(candidate)) {
                  eventName = candidate;
                  break;
                }
              }
              if (eventName) break;
            }
            groups.push({ eventName: eventName || 'Unknown Event', prices });
          }
          if (groups.length >= 1) return groups;
        }
        return null;
      }

      // ── Strategy 1: Known schedule section containers ─────────────────
      for (const secSel of containerSelectors) {
        const sec = document.querySelector(secSel);
        if (!sec || (sec.textContent || '').trim().length < 10) continue;
        const result = tryExtractFromCards(sec);
        if (result) return result;
      }

      // ── Strategy 2: Walk ancestors of #custom-id dropdown ─────────────
      // The month dropdown lives inside the schedule section, so walking up
      // from it reaches the container that holds the cards.
      const dropdown = document.querySelector('#custom-id');
      if (dropdown) {
        let parent = dropdown.parentElement;
        for (let depth = 0; depth < 10 && parent && parent !== document.body; depth++) {
          const result = tryExtractFromCards(parent);
          if (result) return result;
          parent = parent.parentElement;
        }
      }

      // ── Strategy 3: Heading → following siblings prices ───────────────
      const allHeadings = Array.from(
        document.querySelectorAll('h2, h3, h4, h5, h6')
      ).filter(h => isCourseName((h.textContent || '').trim()));

      if (allHeadings.length >= 1) {
        const groups: EventPriceGroup[] = [];
        for (let i = 0; i < allHeadings.length; i++) {
          const heading   = allHeadings[i];
          const eventName = (heading.textContent || '').trim();
          const nextH     = allHeadings[i + 1] ?? null;
          const prices: string[] = [];
          let el: Element | null = heading.nextElementSibling;
          let itr = 0;
          while (el && el !== nextH && itr < 30) {
            prices.push(...getPricesInEl(el));
            el = el.nextElementSibling;
            itr++;
          }
          if (prices.length > 0) {
            groups.push({ eventName, prices: [...new Set(prices)] });
          }
        }
        if (groups.length >= 1) return groups;
      }

      // ── Strategy 4: Full-page currency-code scan (flat fallback) ──────
      // Only matches currency-prefixed prices — never bare phone numbers.
      const currencyRx = /\b[A-Z]{2,4}\s+([\d,]+(?:\.\d{1,2})?)\b/g;
      const symbolRx   = /[$€£₹¥₩₦฿₫₱]\s*([\d,]+(?:\.\d{1,2})?)/g;

      function cleanNum(raw: string): string {
        const n = raw.replace(/,/g, '').split('.')[0];
        if (n.length < 3 || n.length > 9) return '';
        if (yearRx.test(n)) return '';
        return n;
      }

      const bodyText  = document.body.innerText;
      const allPrices: string[] = [];

      currencyRx.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = currencyRx.exec(bodyText)) !== null) {
        const p = cleanNum(m[1]);
        if (p) allPrices.push(p);
      }

      symbolRx.lastIndex = 0;
      while ((m = symbolRx.exec(bodyText)) !== null) {
        const p = cleanNum(m[1]);
        if (p && !allPrices.includes(p)) allPrices.push(p);
      }

      return [{ eventName: '', prices: [...new Set(allPrices)] }];
    });
  }

  // ─────────────────────────────────────────────
  // GET MATCHED PRICES
  // allTargets = [f_price, f_p_price, p_price] (no discount columns)
  // ─────────────────────────────────────────────
  async getMatchedPrices(allTargets: string[]): Promise<{
    matchedPrices: string[];
    displayPrices: string[];
    eventGroups:   EventPriceGroup[];
  }> {
    const eventGroups = await this.extractPricesByEvent();
    const allPrices   = eventGroups.flatMap(g => g.prices);
    const targetSet   = new Set(allTargets.filter(Boolean));
    const matched     = allPrices.filter(p => targetSet.has(p));

    if (matched.length > 0) {
      return { matchedPrices: matched, displayPrices: matched, eventGroups };
    }
    return { matchedPrices: [], displayPrices: allPrices, eventGroups };
  }
}