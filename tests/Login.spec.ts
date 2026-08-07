import { test, expect } from '@playwright/test';
import { LoginPage } from '../Pages/LoginPage';
test.setTimeout(90000);


test('User can login with valid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login('kavanakavan1234@gmail.com', 'Test@123');

  await expect(page.getByText('Logged in as')).toBeVisible();
  console.log('Login successful');
});