
import { test, expect } from '@playwright/test';
import { AssessmentFormPage } from '../Pages/AssessmentFormPage';
import data from '../test-data/assessmentData.json';

test.setTimeout(100000);
test('Assessment Form Submission', async ({ page }) => {
  const form = new AssessmentFormPage(page);

  await form.navigate();

  const page1 = await form.navigateToAssessment();

  await form.fillForm(page1, data.validData12);

  await form.submitForm(page1);

  // 🔥 IMPORTANT: wait for navigation or change
  await page1.waitForLoadState('domcontentloaded');

//ait form.validateSuccess(page1);
});  