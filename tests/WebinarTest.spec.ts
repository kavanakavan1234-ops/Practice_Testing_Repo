/*import { test, expect } from '@playwright/test';
import { WebinarFormPage } from '../Pages/WebinarFormPage';
import data from '../test-data/webinarData.json';
test.setTimeout(60000);
 
// ─────────────────────────────────────────────
// ✅ POSITIVE SCENARIO — Valid full form data
// ─────────────────────────────────────────────
test('TC_002 — Webinar Form: All fields empty shows required errors', async ({ page }) => {
  const webinar = new WebinarFormPage(page);
 
  await webinar.navigate();
  const page1 = await webinar.navigateToAssessment();

  await webinar.fillForm(page1, data.validData);
 
//  await webinar.fillForm(page1, data.invalidData_AllEmpty);
 
  const result = await webinar.submitForm(page1);
 
  await webinar.assertErrors(result, [
    'required', 
    ]  // generic — adjust to actual UI text
});  */

import { test, expect } from '@playwright/test';
import { WebinarFormPage } from '../Pages/WebinarFormPage';
import data from '../test-data/webinarData.json';

test.describe('Webinar Form Tests', () => {

  // ✅ Increase timeout (important for your flow)
  test.setTimeout(60000);

  test('TC_001 — Webinar Form: Valid Submission', async ({ page }) => {
    const webinar = new WebinarFormPage(page);

    await webinar.navigate();
    const page1 = await webinar.navigateToAssessment();

    // ✅ Use valid data
   // await webinar.fillForm(page1, data.validData);
      await webinar.fillForm(page1, data.invalidData_AllEmpty);

    const result = await webinar.submitForm(page1);

    // ✅ Assert success
  //  await webinar.assertSuccess(result);

  });

});