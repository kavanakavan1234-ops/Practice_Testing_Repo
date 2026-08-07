import { test, expect } from '@playwright/test';
import { SignupPage } from '../Pages/SignupPage';
import { accountData } from '../test-data/SignupData';
import { generateRandomEmail } from '../utils/testdatagenerator';
 test.setTimeout(90000);

test('User can sign up and create a new account', async ({ page }) => {
  const signupPage = new SignupPage(page);
  const email = generateRandomEmail(accountData.name);

  await signupPage.goto();
  await signupPage.startSignup(accountData.name, email);
  await signupPage.fillAccountCreationForm({ ...accountData, email });
  await signupPage.submitAccountCreation();

  await expect(page.getByText('Account Created!')).toBeVisible();
  console.log('Signup successful');

  await signupPage.clickContinue();
});