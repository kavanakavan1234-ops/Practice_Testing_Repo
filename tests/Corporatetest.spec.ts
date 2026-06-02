
import { test } from '@playwright/test';
import { CorporateTrainingFormPage } from '../Pages/CorporateTrainingFormPage.spec';
import data from '../test-data/corporateData.json';

test.setTimeout(100000);
test('Form Submission - Capture Errors', async ({ page }) => {
  const form = new CorporateTrainingFormPage(page);

  await form.navigate();
  //await form.closePopupIfVisible();
  //await form.clickDownload();

  await form.fillForm(data.validData8);
  //await form.submit();

  await form.captureErrors();
}); 