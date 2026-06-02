
import { test } from '@playwright/test';
import { DownloadForm } from '../Pages/DownloadForm';
import data from '../test-data/downloadData.json';

test.setTimeout(100000);
test('Form Submission - Capture Errors', async ({ page }) => {
  const form = new DownloadForm(page);

  await form.navigate();
  await form.closePopupIfVisible();
  await form.clickDownload();

  await form.fillForm(data.validData1);
  await form.submit();

  await form.captureErrors();
}); 