import { Page, expect } from '@playwright/test';

export class CorporateTrainingFormPage {
  constructor(private page: Page) {
    this.page.setDefaultTimeout(60000);
  }

  // ================= INPUT =================
  async safeFill(locator: any, value: string) {
    await locator.click();
    await locator.fill('');

    if (value) {
      await locator.type(value, { delay: 50 });
    }

    // 🔥 IMPORTANT: trigger React validation
    await locator.press('Tab');
  }

  // ================= DROPDOWN =================
  async selectDropdown(page1: Page, label: string, value: string) {
    const labelLocator = page1.locator('label', {
      hasText: new RegExp(label, 'i'),
    });

    const dropdown = labelLocator.locator('xpath=..').locator('[role="button"]');

    await dropdown.waitFor({ state: 'visible' });
    await dropdown.click();

    const option = page1.locator('li[role="option"]', {
      hasText: new RegExp(`^${value}$`, 'i'),
    });

    await option.waitFor({ state: 'visible' });
    await option.click();

    // 🔥 IMPORTANT: update React state
    await page1.keyboard.press('Tab');
  }


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

    async fillForm(data: any) {

     await this.page.getByRole('tab', { name: 'Corporate Group Inquiry' }).click();
     await this.page.waitForTimeout(500);

    // ---------------- BASIC FIELDS ----------------
    await this.safeFill(this.page.getByRole('textbox', { name: 'Enter your First Name' }), data.firstName);
    await this.page.waitForTimeout(1500);

    await this.safeFill(this.page.getByRole('textbox', { name: 'Enter your Last Name' }), data.lastName);
    await this.page.waitForTimeout(1500);

    await this.safeFill(this.page.getByRole('textbox', { name: 'Enter your Email' }), data.email);
    await this.page.waitForTimeout(1500);


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


    // -------- COURSES --------
    try {
      await this.page.getByRole('button', { name: 'Open' }).click();
      await this.page.waitForTimeout(500);

      for (const course of data.courseName || []) {
        await this.page.locator('li', { hasText: course }).first().click();
      }
    } catch {}

    // 🔥 allow real-time validation to render
    await this.page.waitForTimeout(3000);

    // 🔥 allow real-time validation to render
    await this.page.waitForTimeout(1500);


    await this.page.getByRole('textbox', { name: 'Enter your Company Name' }).fill(data.company);
        await this.page.waitForTimeout(1500);

    await this.page.getByRole('textbox', { name: 'Enter your Job Title' }).fill(data.job);
        await this.page.waitForTimeout(1500);


     //EXperience
   // await this.selectDropdownByLabel('Select Size of Group Training', data.groupSize);

      await this.selectDropdown(this.page, 'Size of Group Training', data.groupSize);        
      await this.page.waitForTimeout(500);


    //training mode
     await this.selectDropdown(this.page, 'Training Delivery Mode', data.trainingMode);        
     await this.page.waitForTimeout(500);



     // -------- REQUIREMENTS --------
    await this.safeFill(this.page.getByRole('textbox', { name: 'Enter your Training Requirements' }),data.requirements);
    await this.page.waitForTimeout(1500);


  // -------- CONTACT PREF --------
    try {
      await this.page.getByRole('radio', { name: 'Email' }).check();
    } catch {}


        // -------- SUBMIT --------
   // await this.page.getByRole('button', { name: 'Submit' }).click();
  
/*const submitBtn = this.page.getByRole('button', { name: 'Submit' });

await submitBtn.waitFor({ state: 'visible' });
await expect(submitBtn).toBeEnabled();

await submitBtn.click();
       
  }  */

const submitBtn = this.page.getByRole('button', { name: 'Submit' });

console.log('Enabled:', await submitBtn.isEnabled());
const errors = await this.page.locator('.Mui-error').allTextContents();
console.log('Errors before submit:', errors);

//const submitBtn = this.page.getByRole('button', { name: 'Submit' });

await submitBtn.waitFor({ state: 'visible' });
await expect(submitBtn).toBeEnabled();

await submitBtn.scrollIntoViewIfNeeded();

// 🔥 trigger final validation
await this.page.keyboard.press('Tab');
await this.page.keyboard.press('Tab');

// 🔥 real click
await submitBtn.click();

// ✅ wait for result
await Promise.race([
  this.page.locator('text=Thank you').waitFor({ timeout: 10000 }),
  this.page.locator('.Mui-error').first().waitFor({ timeout: 10000 })
]);
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
  const dropdownErrors = this.page.locator(
    'text=/Select your/i'
  );

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
// ================= FINAL ERROR CAPTURE =================
async captureErrors() {
  console.log('⚠️ Capturing validation errors...');

  // ✅ Wait for either success OR error UI
  await Promise.race([
    this.page.locator('text=Thank you').waitFor({ timeout: 5000 }).catch(() => {}),
    this.page.locator('.Mui-error, [role="alert"]').first().waitFor({ timeout: 5000 }).catch(() => {})
  ]);

  // ✅ SUCCESS CHECK
  const isSuccess = await this.page
    .locator('text=Thank you')
    .isVisible()
    .catch(() => false);

  if (isSuccess) {
    console.log('✅ Form submitted successfully — no validation errors');
    return [];
  }

  // ✅ Collect errors ONCE (no loops, no waits)
  let messages = await this.collectErrors();

  // ✅ normalize
  messages = messages
    .map(m => m.replace(/\s+/g, ' ').trim())
    .filter(m => m.length > 2);

  // ✅ remove duplicates
  messages = Array.from(
    new Map(messages.map(m => [m.toLowerCase(), m])).values()
  );

  // ✅ filter only validation messages
  messages = messages.filter(msg => {
    const text = msg.toLowerCase();
    return (
      text.includes('valid') ||
      text.includes('invalid') ||
      text.includes('required') ||
      text.includes('minimum') ||
      text.includes('maximum') ||
      text.includes('allowed') ||
      text.includes('must') ||
      text.includes('upload') ||
      text.includes('select')
    );
  });

  // ✅ OUTPUT
  if (messages.length > 0) {
    console.log('❌ Errors:');
    messages.forEach((e, i) => console.log(`❌ ${i + 1}: ${e}`));
  } else {
    console.log('⚠️ No validation messages found');
  }

  return messages;
}
}