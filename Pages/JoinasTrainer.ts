import { Page } from '@playwright/test';

export class JoinasTrainer {
  constructor(private page: Page) {
    this.page.setDefaultTimeout(800000);
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

    async selectDropdownByLabel(label: string, value: string) {
  try {
    if (!value) return;

    await this.page.getByLabel(label).click();

    const option = this.page.locator('li[role="option"]', {
      hasText: value,
    });

    await option.waitFor({ state: 'visible' });
    await option.click();

  } catch {
    console.log(`⚠️ Dropdown failed: ${label}`);
  }
}

  // ================= ACTIONS =================
  async navigate() {
    await this.page.goto(
      'https://stagingbeta.invensislearning.com/join-as-a-corporate-trainer'
    );
  }

  async closePopupIfVisible() {
    try {
      const popup = this.page.locator('.cyt-closeIcon > svg').first();
      if (await popup.isVisible()) await popup.click();
    } catch {}
  }

  async clickDownload() {
    await this.page.getByRole('button', { name: 'Join as a Trainer' }).click();
  }

  async fillForm(data: any) {
    // -------- BASIC --------
    await this.safeFill( this.page.getByRole('textbox', { name: 'Enter your First Name' }),data.firstName);

    await this.safeFill(this.page.getByRole('textbox', { name: 'Enter your Last Name' }),data.lastName);

    await this.safeFill(this.page.getByRole('textbox', { name: 'Enter your Email' }),data.email);

    await this.selectDropdownByLabel('Select Country *', data.country);

    //Counttry
     try {
      const flagDropdown = this.page.locator('.iti__flag-container, .selected-flag, [class*="flag"]').first();
      await flagDropdown.click();
      const searchBox = this.page.getByPlaceholder('search');
      await searchBox.fill(data.countryName || '');
      await searchBox.press('ArrowDown');
      await searchBox.press('Enter');
    } catch {}

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

await this.safeFill(this.page.getByRole('textbox', { name: 'Enter Company Name' }),data.company);
await this.safeFill(this.page.getByRole('textbox', { name: 'Enter Job Title' }),data.jobTitle);
await this.selectDropdownByLabel('Select Training Expertise *', data.trainingExpert);

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
    

    //EXperience
    await this.selectDropdownByLabel('Select Training Experience', data.trainingExperience);

    //check box  yes/no
   try {
    await this.page.getByRole('checkbox', { name: 'Yes' }).check();
    }catch{}
    
     //check box  full time/freelance
    try {
    await this.page.getByRole('checkbox', { name: 'Full Time' }).check();
   }catch{} 

//LinkedeInLink----------------
await this.safeFill(this.page.getByRole('textbox', { name: 'Enter LinkedIn Profile Link' }),data.linkedInLink);

//ChooseFile
await this.page.locator('input[type="file"]').setInputFiles(data.chooseFile);

// -------- REQUIREMENTS --------
await this.safeFill(this.page.getByRole('textbox', { name: 'Enter your Training Requirements' }),data.requirements);

}

//Submit
  async submit() {
  await this.page.getByRole('button', { name: 'Submit', exact: true }).click();
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

  // ✅ SUCCESS CHECK
  const isSuccess = await this.page
    .locator('text=Thank you')
    .isVisible()
    .catch(() => false);

  if (isSuccess) {
    console.log('✅ Form submitted successfully — no validation errors');
    return [];
  }

  let messages: string[] = [];

  messages.push(...(await this.collectErrors()));
  await this.page.waitForTimeout(500);
  messages.push(...(await this.collectErrors()));

  // ✅ normalize
  messages = messages
    .map(m => m.replace(/\s+/g, ' ').trim())
    .filter(m => m.length > 2);

  // ✅ remove duplicates
  messages = Array.from(
    new Map(messages.map(m => [m.toLowerCase(), m])).values()
  );

  // ✅ KEEP ONLY VALIDATION TEXT
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
      text.includes('select your')
    );
  });

  // ✅ OUTPUT
  if (messages.length > 0) {
    console.log('❌ Errors:');
    messages.forEach((e, i) => console.log(`❌ ${i + 1}: ${e}`));
  } else {
    console.log('✅ No validation errors');
  }

  return messages;
}
}