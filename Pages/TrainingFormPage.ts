import { Locator, Page, expect } from '@playwright/test';

export class TrainingFormPage {
  constructor(private page: Page) {
    this.page.setDefaultTimeout(60000);
  }

  // ================= NAVIGATE =================
  async navigate() {
    await this.page.goto('https://stagingbeta.invensislearning.com/pmi-acp-certification-training/');
  }

  // ================= OPEN FORM =================
  async openForm() {
    try {
      const frame = this.page.frameLocator('iframe[title="Find more information here"]');
      const btn = frame.getByRole('button', { name: /Minimise/i });
      if (await btn.isVisible({ timeout: 3000 })) await btn.click();
    } catch {}

    const enquireBtn = this.page.locator('[title^="Click Here to Enquire"]').first();
    await enquireBtn.scrollIntoViewIfNeeded();
    await enquireBtn.click();

    await expect(this.page.locator('text=Request for Training')).toBeVisible();
  }

  // ================= SAFE FILL =================
  async safeFill(locator: Locator, value: string) {
    try {
      await locator.waitFor({ state: 'visible', timeout: 10000 });
      await locator.click();
      await locator.fill('');
      if (value) await locator.type(value);

      // 🔥 trigger real-time validation
      await locator.blur();
    } catch {
      console.log('⚠️ Field interaction failed');
    }
  }

  // ================= FILL FORM =================
  async fillForm(data: any) {

    // -------- BASIC --------
    await this.safeFill(this.page.getByRole('textbox', { name: 'Enter your First Name' }), data.firstName);
    await this.safeFill(this.page.getByRole('textbox', { name: 'Enter your Last Name' }), data.lastName);
    await this.safeFill(this.page.getByRole('textbox', { name: 'Enter your Email' }), data.email);

    // -------- COUNTRY --------
    try {
      const flagDropdown = this.page.locator('.iti__flag-container, .selected-flag, [class*="flag"]').first();
      await flagDropdown.click();
      const searchBox = this.page.getByPlaceholder('search');
      await searchBox.fill(data.countryName || '');
      await searchBox.press('ArrowDown');
      await searchBox.press('Enter');
    } catch {}
    await this.page.waitForTimeout(1500);

    //Phone number

   try {
  const phone = this.page.getByRole('textbox', { name: 'Enter Your Contact Number' });

  await phone.click();
  await phone.fill('');

  if (data.phoneNumber) {
    await phone.type(data.phoneNumber);
  }

  // 🔥 VERY IMPORTANT (this triggers validation)
  await phone.blur();
  await this.page.keyboard.press('Tab');

} catch (err) {
  console.log('⚠️ Phone field handling failed');
} 
    await this.page.waitForTimeout(1500);


    // -------- CONTACT PREF --------
    try {
      await this.page.getByRole('radio', { name: 'Email' }).check();
    } catch {}
        await this.page.waitForTimeout(1500);


    // -------- REQUIREMENTS --------
    await this.safeFill(
      this.page.getByRole('textbox', { name: 'Enter your Training Requirements' }),
      data.requirements
    );
        await this.page.waitForTimeout(1500);


    // -------- COURSES --------
    try {
      await this.page.getByRole('button', { name: 'Open' }).click();
      await this.page.waitForTimeout(500);

      for (const course of data.courseName || []) {
        await this.page.locator('li', { hasText: course }).first().click();
      }
    } catch {}

    // 🔥 allow real-time validation to render
    await this.page.waitForTimeout(1500);

    // -------- SUBMIT --------
    await this.page.getByRole('button', { name: 'Submit' }).click();
        await this.page.waitForTimeout(1500);


    // ================= FLOW =================
   /* if (data.type === 'invalid') {
      await this.captureErrors();
      await this.page.waitForTimeout(7000);
      return;
    } */

    // -------- SUCCESS --------
    const success = this.page.locator('h1.thank-you');
    await expect(success).toBeVisible({ timeout: 15000 });

    console.log('✅ Form submitted successfully');

    await this.page.waitForTimeout(7000);
  }

  // ================= CORE ERROR COLLECTOR =================
  async collectErrors(): Promise<string[]> {
    let messages: string[] = [];

    const fields = this.page.locator('input, textarea, select');
    const count = await fields.count();

    // 🔥 1. HTML5 VALIDATION (MOST IMPORTANT)
    for (let i = 0; i < count; i++) {
      try {
        const field = fields.nth(i);

        const validationMessage = await field.evaluate((el: any) => el.validationMessage);
        if (validationMessage) messages.push(validationMessage.trim());

        const title = await field.getAttribute('title');
        if (title && /required|invalid|enter|must|digit|number|min|max|length/i.test(title)) {
          messages.push(title.trim());
        }
      } catch {}
    }

    // 🔥 2. GLOBAL UI ERRORS
    const global = this.page.locator(
      '.Mui-error:visible, .invalid-feedback:visible, .error:visible, .helper-text:visible, [class*="error"]:visible'
    );

    const globalCount = await global.count();

    for (let i = 0; i < globalCount; i++) {
      try {
        const txt = (await global.nth(i).innerText()).trim();
        if (txt) messages.push(txt);
      } catch {}
    }

    // 🔥 3. aria-describedby (MUI)
    for (let i = 0; i < count; i++) {
      try {
        const field = fields.nth(i);
        const describedBy = await field.getAttribute('aria-describedby');

        if (describedBy) {
          const ids = describedBy.split(' ');
          for (const id of ids) {
            const el = this.page.locator(`#${id}`);
            if (await el.count()) {
              const txt = (await el.innerText()).trim();
              if (txt) messages.push(txt);
            }
          }
        }
      } catch {}
    }

    // 🔥 4. PARENT CONTAINER ERRORS
    for (let i = 0; i < count; i++) {
      try {
        const field = fields.nth(i);

        const parent = field.locator(
          'xpath=ancestor::*[contains(@class,"form") or contains(@class,"field") or contains(@class,"MuiFormControl")]'
        );

        const texts = await parent.locator('*').allTextContents();

        texts.forEach(t => {
          const txt = t.trim();

          if (
            txt &&
            txt.length > 3 &&
            txt.length < 120 &&
            /required|invalid|enter|must|please|digit|number|min|max|length/i.test(txt)
          ) {
            messages.push(txt);
          }
        });
      } catch {}
    }

    return messages;
  }

  // ================= FINAL ERROR CAPTURE =================
  async captureErrors() {
    console.log('⚠️ Capturing validation errors...');

    let messages: string[] = [];

    // 🔁 MULTI PASS (handles dynamic UI)
    messages.push(...await this.collectErrors());
    await this.page.waitForTimeout(1500);

    messages.push(...await this.collectErrors());
    await this.page.waitForTimeout(1500);

    messages.push(...await this.collectErrors());
    await this.page.waitForTimeout(1500);

    messages.push(...await this.collectErrors());

    // -------- CLEAN --------
    messages = messages
      .map(e => e.replace('*', '').trim())
      .filter(e => e && e.length > 2);

    messages = [...new Set(messages)];

    // -------- OUTPUT --------
    if (messages.length > 0) {
      console.log('❌ Validation Errors:');
      messages.forEach((e, i) => console.log(`❌ ${i + 1}: ${e}`));
    } else {
      console.log('⚠️ No validation messages found');
    }
  }
}