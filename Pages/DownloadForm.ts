import { Page } from '@playwright/test';

export class DownloadForm {
  constructor(private page: Page) {
    this.page.setDefaultTimeout(60000);
  }

  // ================= HELPERS =================
  async safeFill(locator: any, value: string) {
    try {
      await locator.click();
      await locator.fill('');

      if (value) {
        await locator.type(value, { delay: 50 });
      }

      // 🔥 trigger real-time validation
      await locator.blur();
    } catch {
      console.log('⚠️ Unable to fill field');
    }
  }

  // ================= ACTIONS =================
  async navigate() {
    await this.page.goto(
      'https://stagingbeta.invensislearning.com/pmi-acp-certification-training/'
    );
  }

  async closePopupIfVisible() {
    try {
      const popup = this.page.locator('.cyt-closeIcon > svg').first();
      if (await popup.isVisible()) await popup.click();
    } catch {}
  }

  async clickDownload() {
    await this.page.getByRole('button', { name: 'Download Syllabus' }).click();
  }

  async fillForm(data: any) {
    // -------- BASIC --------
    await this.safeFill(
      this.page.getByRole('textbox', { name: 'Enter your First Name' }),
      data.firstName
    );

    await this.safeFill(
      this.page.getByRole('textbox', { name: 'Enter your Last Name' }),
      data.lastName
    );

    await this.safeFill(
      this.page.getByRole('textbox', { name: 'Enter your Email' }),
      data.email
    );

    // -------- COUNTRY --------
    /* try {
      await this.page.locator('.iti__selected-flag').click();
      await this.page
        .locator(`.iti__country:has-text("${data.countryName || 'India'}")`)
        .first()
        .click();
    } catch {}

    // -------- PHONE (FIXED) --------
    try {
      const phone = this.page.getByRole('textbox', {
        name: 'Enter Your Contact Number'
      });

      await phone.click();
      await phone.fill('');

      if (data.phoneNumber) {
        await phone.type(data.phoneNumber, { delay: 100 });
      }

      // 🔥 trigger plugin validation
      await this.page.mouse.click(0, 0);
      await this.page.waitForTimeout(800);
    } catch {
      console.log('⚠️ Phone handling failed');
    } */
     try {
      const flagDropdown = this.page.locator('.iti__flag-container, .selected-flag, [class*="flag"]').first();
      await flagDropdown.click();
      const searchBox = this.page.getByPlaceholder('search');
      await searchBox.fill(data.countryName || '');
      await searchBox.press('ArrowDown');
      await searchBox.press('Enter');
    } catch {}

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

    // -------- DURATION --------
     try {
      await this.page.getByRole('radio', { name: '3 months' }).check();
    } catch {}

    
  }

  async submit() {
    await this.page
      .getByRole('button', { name: 'Download Course Syllabus PDF' })
      .click();
  }

  // ================= ERROR COLLECTOR =================
  async collectErrors(): Promise<string[]> {
    let messages: string[] = [];

    const fields = this.page.locator('input, textarea');
    const count = await fields.count();

    for (let i = 0; i < count; i++) {
      try {
        const field = fields.nth(i);

        // 🔹 aria-describedby (IMPORTANT for name fields)
        const describedBy = await field.getAttribute('aria-describedby');

        if (describedBy) {
          const ids = describedBy.split(' ');
          for (const id of ids) {
            const el = this.page.locator(`#${id}:visible`);
            if (await el.count()) {
              const txt = (await el.innerText()).trim();
              if (txt) messages.push(txt);
            }
          }
        }

        // 🔹 sibling helper text
        const siblingTexts = await field
          .locator('xpath=following-sibling::*')
          .allTextContents();

        siblingTexts.forEach(t => {
          const txt = t.trim();
          if (
            txt &&
            /required|enter|invalid|must|first|last|name|email|phone/i.test(txt)
          ) {
            messages.push(txt);
          }
        });

      } catch {}
    }

    // 🔹 global visible errors only
    const global = this.page.locator(
      '.Mui-error:visible, .invalid-feedback:visible, .error:visible, .helper-text:visible'
    );

    const gCount = await global.count();

    for (let i = 0; i < gCount; i++) {
      try {
        const txt = (await global.nth(i).innerText()).trim();
        if (txt) messages.push(txt);
      } catch {}
    }

    return messages;
  }


// ================= FINAL ERROR CAPTURE =================
  async captureErrors() {
    console.log('⚠️ Capturing validation errors...');

    let messages: string[] = [];

    messages.push(...await this.collectErrors());
    await this.page.waitForTimeout(800);

    messages.push(...await this.collectErrors());

    // -------- FILTER --------
    const phoneValue = await this.page
      .getByRole('textbox', { name: 'Enter Your Contact Number' })
      .inputValue();

    messages = messages.filter(msg => {
      if (!msg) return false;

      const text = msg.toLowerCase();

      if (text.includes('please fill in this field')) return false;

      // remove false phone error
      if (text.includes('phone') && phoneValue.length >= 10) return false;

      return true;
    });

    messages = [...new Set(messages)];

    if (messages.length > 0) {
      console.log('❌ Errors:');
      messages.forEach((e, i) => console.log(`❌ ${i + 1}: ${e}`));
    } else {
      console.log('✅ No validation errors');
    }

    return messages;
 
  }
}