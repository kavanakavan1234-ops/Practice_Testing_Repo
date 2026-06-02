import { Page, expect } from '@playwright/test';

export interface FormResult {
  success: boolean;
  errors: Record<string, string>;
  rawErrors: string[];
}

export class WebinarFormPage {
  constructor(private page: Page) {
    this.page.setDefaultTimeout(80000);
  }

  // ================= INPUT =================
  async safeFill(locator: any, value: string) {
    await locator.click();
    await locator.fill('');

    if (value) {
      await locator.type(value, { delay: 50 });
    }

    await locator.press('Tab');
  }

  // ================= DROPDOWN =================
  async selectDropdown(page1: Page, label: string, value: string) {
    if (!value || value.toString().trim() === '') return;

    const labelLocator = page1.locator('label', {
      hasText: new RegExp(label, 'i'),
    });

    const dropdown = labelLocator.locator('xpath=..').locator('[role="button"]');

    await dropdown.waitFor({ state: 'visible' });
    await dropdown.click();

    const option = page1.locator('li[role="option"]', {
      hasText: new RegExp(`^${value}$`, 'i'),
    });

    const optionCount = await option.count();
    if (optionCount === 0) {
      console.log(`⚠️ Option "${value}" not found for ${label}`);
      return;
    }

    await option.first().waitFor({ state: 'visible' });
    await option.first().click();

    await page1.keyboard.press('Tab');
  }

  // ================= COUNTRY =================
  async selectCountry(page1: Page, countryName: string) {
    if (!countryName) return;

    const dropdown = page1.locator('.selected-flag');
    await dropdown.click();

    const option = page1.locator('.country-list li', {
      hasText: new RegExp(countryName, 'i'),
    });

    await option.first().click();

    await page1.locator('input[type="tel"]').press('Tab');
  }

  // ================= PHONE =================
  async enterPhone(page1: Page, phoneNumber: string) {
    const phone = page1.locator('input[type="tel"]');

    await phone.click();
    await phone.fill('');

    if (phoneNumber) {
      await phone.type(phoneNumber, { delay: 50 });
    }

    await phone.press('Tab');
  }

  // ================= NAVIGATION =================
  async navigate() {
    await this.page.goto('https://stagingbeta.invensislearning.com/');
  }

  async navigateToAssessment(): Promise<Page> {
    await this.page.getByTitle('Click Here to View All Our Resources').hover();

    const popupPromise = this.page.waitForEvent('popup');
    await this.page.getByRole('link', { name: 'Webinars' }).click();

    const page1 = await popupPromise;

    await page1.waitForLoadState('domcontentloaded');

    await page1.getByRole('link', { name: 'Explore Webinar' }).nth(1).click();

    await page1.waitForLoadState('domcontentloaded');

    await page1.getByRole('textbox', { name: /First Name/i }).waitFor();

    return page1;
  }

  // ================= FORM =================
  async fillForm(page1: Page, data: any) {
    await this.safeFill(page1.getByRole('textbox', { name: 'Enter your First Name' }), data.firstName ?? '');
    await this.page.waitForTimeout(1500);

    await this.safeFill(page1.getByRole('textbox', { name: 'Enter your Last Name' }), data.lastName ?? '');
    await this.page.waitForTimeout(1500);

    await this.selectCountry(page1, data.countryName ?? '');
    await this.page.waitForTimeout(1500);

    await this.enterPhone(page1, data.phoneNumber ?? '');
    await this.page.waitForTimeout(1500);

    await this.safeFill(page1.getByRole('textbox', { name: 'Enter your Email' }), data.email ?? '');
    await this.page.waitForTimeout(1500);

    await this.safeFill(page1.getByRole('textbox', { name: 'Enter your Company Name' }), data.company ?? '');
    await this.page.waitForTimeout(1500);

    await this.safeFill(page1.getByRole('textbox', { name: 'Enter your Job Title' }), data.jobTitle ?? '');
    await this.page.waitForTimeout(1500);

    await this.selectDropdown(page1, 'Industry', data.industry ?? '');
    await this.page.waitForTimeout(1500);

    await this.selectDropdown(page1, 'Country', data.country ?? '');
    await this.page.waitForTimeout(1500);

    await this.selectDropdown(page1, 'City', data.city ?? '');
    await this.page.waitForTimeout(1500);
  }

  // ================= SUBMIT =================
  async submitForm(page1: Page): Promise<FormResult> {
    await page1.locator('text=Accept All').click().catch(() => {});

    await page1.keyboard.press('Tab');
    await page1.waitForTimeout(300);

    const btn = page1
      .locator('button[type="submit"]', {
        hasText: 'Register for this free webinar',
      })
      .first();

    await btn.waitFor({ state: 'visible' });
    await btn.scrollIntoViewIfNeeded();

    await btn.click();
    await this.page.waitForTimeout(2000);

    await Promise.race([
      page1.locator('text=Thank You').waitFor({ timeout: 10000 }),
      page1.locator('.MuiFormHelperText-root.Mui-error').first().waitFor({ timeout: 10000 }),
    ]).catch(() => {});

    return await this.captureFormResult(page1);
  }

  // ================= CAPTURE ERRORS =================
  async captureFormResult(page1: Page): Promise<FormResult> {
    const successLocator = page1.locator('text=Thank You');
    const isSuccess = await successLocator.isVisible().catch(() => false);

    if (isSuccess) {
      return { success: true, errors: {}, rawErrors: [] };
    }

    // ✅ ONLY real error messages
    const rawErrors = await page1
      .locator('.MuiFormHelperText-root.Mui-error')
      .allTextContents();

    // ✅ CLEAN + DEDUPE
    const uniqueRawErrors = [
      ...new Set(
        rawErrors
          .map(e =>
            e
              .replace(/\*/g, '')
              .replace(/\./g, '')
              .trim()
          )
          .filter(e => e.length > 0)
      )
    ];

    const errors: Record<string, string> = {};
    uniqueRawErrors.forEach((e, i) => {
      errors[`field_${i + 1}`] = e;
    });

    return { success: false, errors, rawErrors: uniqueRawErrors };
  }  

  // ================= ASSERT ERRORS =================
  async assertErrors(result: FormResult, expectedErrors: string[]) {
    if (result.success) {
      throw new Error('❌ Expected form to fail validation, but it was submitted successfully.');
    }

    const allErrorText = result.rawErrors.join(' | ');

    console.log(`\n🔴 Captured ${result.rawErrors.length} error(s):`);
    result.rawErrors.forEach((e, i) => console.log(`  [${i + 1}] ${e}`));

    for (const expected of expectedErrors) {
      const found = result.rawErrors.some(e =>
        e.toLowerCase().includes(expected.toLowerCase())
      );

      if (!found) {
        throw new Error(
          `❌ Expected error containing "${expected}" not found.\nActual errors: ${allErrorText}`
        );
      }

      console.log(`  ✅ Found expected error: "${expected}"`);
    }
  }
}