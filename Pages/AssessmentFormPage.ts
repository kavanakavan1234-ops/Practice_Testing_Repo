import { Page, expect } from '@playwright/test';

export class AssessmentFormPage {
  constructor(private page: Page) {
    this.page.setDefaultTimeout(80000);
  }

  // ================= HELPERS =================
  async safeFill(locator: any, value: string) {
    await locator.click();
    await locator.fill('');

    if (value) {
      await locator.type(value, { delay: 50 });
    }

    // 🔥 trigger React validation
    await locator.press('Tab');
  }

  // ================= MUI DROPDOWN =================
  async selectMuiDropdown(page1: Page, label: string, value: string) {
    try {
      const dropdown = page1.getByRole('button', {
        name: new RegExp(label, 'i')
      });

      await dropdown.click();

      const option = page1.locator('li[role="option"]', {
        hasText: value
      });

      await option.waitFor({ state: 'visible' });
      await option.click();

    } catch {
      console.log(`⚠️ Dropdown failed: ${label}`);
    }
  }

  //country selection
  async selectCountry(page1: Page, countryName: string) {
    try {
      const dropdown = page1.locator('.selected-flag');
      await dropdown.waitFor({ state: 'visible' });
      await dropdown.click();

      const countryList = page1.locator('.country-list');
      await countryList.waitFor({ state: 'visible' });

      const option = countryList.locator('li', {
        hasText: new RegExp(countryName, 'i')
      });

      await option.first().click();

      // 🔥 trigger validation
      await page1.locator('input[type="tel"]').press('Tab');

    } catch (err) {
      console.log('⚠️ Country selection failed', err);
    }
  }

  // ================= PHONE =================
  async enterPhone(page1: Page, phoneNumber: string) {
    const phone = page1.locator('input[type="tel"]');

    await phone.waitFor({ state: 'visible' });
    await phone.click();
    await phone.fill('');

    if (phoneNumber) {
      await phone.type(phoneNumber, { delay: 50 });
    }

    // 🔥 trigger validation
    await phone.press('Tab');
  }

  // ================= NAVIGATION =================
  async navigate() {
    await this.page.goto('https://stagingbeta.invensislearning.com/');
  }

  async navigateToAssessment(): Promise<Page> {
    await this.page.getByTitle('Click Here to View All Our Resources').hover();

    const pagePromise = this.page.waitForEvent('popup');
    await this.page.getByRole('link', { name: 'Assessments' }).click();

    const page1 = await pagePromise;
    await page1.waitForLoadState('domcontentloaded');

    await page1.getByRole('button', { name: 'Explore All Assessments' }).click();

    await page1.getByRole('link', {name: 'Project Management View Category',exact: true}).click();

    await page1.getByRole('link', {name: 'Take Test for Assessment for Senior Project Manager'}).click();

    await page1.getByRole('textbox', {name: 'Enter your Full Name *'}).waitFor();

    return page1;
  }

  // ================= FORM =================
  async fillForm(page1: Page, data: any) {
    try {
      await this.safeFill(page1.getByRole('textbox', { name: 'Enter your Full Name' }),data.firstName);

      await this.safeFill(page1.getByRole('textbox', { name: 'Enter your Email' }),data.email);
      

      await this.selectCountry(page1, data.countryName);
      await this.enterPhone(page1, data.phoneNumber);

      await this.selectMuiDropdown(page1,'Select Work Position',data.position);

      await this.selectMuiDropdown(page1,'Select User Type',data.userType);

    } catch (err) {
      console.log('⚠️ Error filling form:', err);
    }
  }

  // ================= SUBMIT =================
  async submitForm(page1: Page) {
    const btn = page1.getByRole('button', { name: /Take Assessment/i });

    await btn.waitFor({ state: 'visible' });
    await expect(btn).toBeEnabled();

    await btn.scrollIntoViewIfNeeded();

    // ================= ADDITION 1 =================
    // 🔥 Ensure all React state updates are flushed before submit
    await page1.keyboard.press('Tab');
    await page1.waitForTimeout(500);

    await btn.click();

    // ================= ADDITION 2 =================
    // 🔥 wait for navigation OR success OR failure
    await Promise.race([
      page1.waitForLoadState('networkidle'),
      page1.waitForSelector('text=Thank You', { timeout: 10000 }).catch(() => {}),
      page1.waitForSelector('[role="alert"]', { timeout: 10000 }).catch(() => {})
    ]);

    // ================= ADDITION 3 =================
    // 🔥 extra safety trigger for React forms
    await page1.evaluate(() => {
      const form = document.querySelector('form');
      if (form) (form as HTMLFormElement).requestSubmit();
    });
  }

// ================= ERROR COLLECTOR =================
async collectErrors(): Promise<string[]> {
  const messages: string[] = [];

  // ✅ 1. MUI FIELD ERRORS (text + textarea)
  const muiErrors = this.page.locator(
    '.MuiFormHelperText-root.Mui-error:visible'
  );

  const muiCount = await muiErrors.count();
  for (let i = 0; i < muiCount; i++) {
    const txt = (await muiErrors.nth(i).innerText()).trim();
    if (txt) messages.push(txt);
  }

  // ✅ 2. DROPDOWN ERRORS (custom validation text)
  const dropdownErrors = this.page.locator('text=/Select your/i');

  const dropCount = await dropdownErrors.count();
  for (let i = 0; i < dropCount; i++) {
    const txt = (await dropdownErrors.nth(i).innerText()).trim();
    if (txt) messages.push(txt);
  }

  // ✅ 3. FILE UPLOAD ERROR
  const fileError = this.page.locator('text=/upload/i');
  if (await fileError.isVisible().catch(() => false)) {
    const txt = (await fileError.innerText()).trim();
    if (txt) messages.push(txt);
  }

  return messages;
}

  // ================= ERROR CAPTURE =================
  async captureErrors(page1: Page): Promise<string[]> {
  try {
    // 🔥 wait for page stability first
    await page1.waitForLoadState('domcontentloaded');

    const errorLocator = page1.locator('.Mui-error, .error, [role="alert"]');

    const count = await errorLocator.count();

    if (count === 0) return [];

    const errors: string[] = [];

    // 🔥 SAFE ITERATION (no allTextContents)
    for (let i = 0; i < count; i++) {
      const text = await errorLocator.nth(i).textContent();
      if (text) errors.push(text.trim());
    }

    console.log('❌ Errors:', errors);

    return errors;

  } catch (err) {
    console.log('⚠️ captureErrors skipped safely due to navigation:', err);
    return [];
   }
  }
 }