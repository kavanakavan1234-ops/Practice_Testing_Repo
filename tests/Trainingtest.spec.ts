/*import { test } from '@playwright/test';
import { TrainingFormPage } from '../Pages/TrainingFormPage';
import testData from '../test-data/formData.json';

// 👉 CHANGE THIS ONLY
let RUN_TYPE: 'positive' | 'negative' = 'positive';

test(`${RUN_TYPE} scenario`, async ({ page }) => {
  const form = new TrainingFormPage(page);

  // ✅ Correct logic
  const data = RUN_TYPE === 'positive'
  //? { ...testData.positive, type: 'valid' }
   // { ...testData.negative, type: 'invalid' };

  console.log(`🚀 Running ${RUN_TYPE.toUpperCase()} test`);

  await form.navigate();
  await form.openForm();
  await form.fillForm(data);
});   */


//negetive input
/*import { test } from '@playwright/test';
import { TrainingFormPage } from '../Pages/TrainingFormPage';
import testData from '../test-data/formData.json';

// 👉 Change here only
let RUN_TYPE: 'negative' | 'positive' = 'negative';

test(`${RUN_TYPE} Training Form Test`, async ({ page }) => {

  const form = new TrainingFormPage(page);

  const data =
    RUN_TYPE === 'negative'
      ? { ...testData.negative, type: 'invalid' }
      : { ...testData.positive, type: 'valid' };

  console.log(`🚀 Running ${RUN_TYPE.toUpperCase()} test`);

  await form.navigate();
  await form.openForm();
  await form.fillForm(data);
});   */


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


