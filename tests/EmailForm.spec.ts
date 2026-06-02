import { test } from '@playwright/test';
import { EmailValidationForm } from '../Pages/EmailValidationForm';
import data from '../test-data/EmailFormData.json';

test.setTimeout(100000);
test('Form Submission - Capture Errors', async ({ page }) => {
  const form = new EmailValidationForm(page);

  await form.navigate();
  await form.closePopupIfVisible();
  await form.clickDownload();

  await form.fillForm(data.validData2);
  await form.submit();

  await form.captureErrors();
}); 
