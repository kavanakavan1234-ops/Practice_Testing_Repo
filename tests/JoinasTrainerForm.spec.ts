
import { test } from '@playwright/test';
import { JoinasTrainer } from '../Pages/JoinasTrainer';
import data from '../test-data/trainerData.json';

test.setTimeout(100000);
test('Form Submission - Capture Errors', async ({ page }) => {
  const form = new JoinasTrainer(page);

  await form.navigate();
  await form.closePopupIfVisible();
  await form.clickDownload();

  await form.fillForm(data.invalidData4);
  await form.submit();

  await form.captureErrors();
}); 