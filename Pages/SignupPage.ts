import { Page, Locator } from '@playwright/test';
import { AccountData } from '../test-data/SignupData';

export class SignupPage {
  readonly page: Page;

  // Initial signup box locators
  readonly nameInput: Locator;
  readonly signupEmailInput: Locator;
  readonly signupButton: Locator;

  // Account information locators
  readonly titleMrRadio: Locator;
  readonly titleMrsRadio: Locator;
  readonly passwordInput: Locator;
  readonly daysDropdown: Locator;
  readonly monthsDropdown: Locator;
  readonly yearsDropdown: Locator;

  // Address information locators
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly companyInput: Locator;
  readonly addressInput: Locator;
  readonly address2Input: Locator;
  readonly stateInput: Locator;
  readonly cityInput: Locator;
  readonly zipcodeInput: Locator;
  readonly mobileNumberInput: Locator;
  readonly createAccountButton: Locator;
  readonly continueLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.nameInput = page.getByRole('textbox', { name: 'Name' });
    this.signupEmailInput = page
      .locator('form')
      .filter({ hasText: 'Signup' })
      .getByPlaceholder('Email Address');
    this.signupButton = page.getByRole('button', { name: 'Signup' });

    this.titleMrRadio = page.getByRole('radio', { name: 'Mr.' });
    this.titleMrsRadio = page.getByRole('radio', { name: 'Mrs.' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password *' });
    this.daysDropdown = page.locator('#days');
    this.monthsDropdown = page.locator('#months');
    this.yearsDropdown = page.locator('#years');

    this.firstNameInput = page.getByRole('textbox', { name: 'First name *' });
    this.lastNameInput = page.getByRole('textbox', { name: 'Last name *' });
    this.companyInput = page.getByRole('textbox', { name: 'Company', exact: true });
    this.addressInput = page.getByRole('textbox', {
      name: 'Address * (Street address, P.',
    });
    this.address2Input = page.getByRole('textbox', { name: 'Address 2' });
    this.stateInput = page.getByRole('textbox', { name: 'State *' });
    this.cityInput = page.getByRole('textbox', { name: 'City * Zipcode *' });
    this.zipcodeInput = page.locator('#zipcode');
    this.mobileNumberInput = page.getByRole('textbox', { name: 'Mobile Number *' });
    this.createAccountButton = page.getByRole('button', { name: 'Create Account' });
    this.continueLink = page.getByRole('link', { name: 'Continue' });
  }

  async goto() {
    await this.page.goto('https://automationexercise.com/login');
  }

  async startSignup(name: string, email: string) {
    await this.nameInput.click();
    await this.nameInput.fill(name);
    await this.signupEmailInput.click();
    await this.signupEmailInput.fill(email);
    await this.signupButton.click();
  }

  async selectTitle(title: 'Mr.' | 'Mrs.') {
    if (title === 'Mr.') {
      await this.titleMrRadio.check();
    } else {
      await this.titleMrsRadio.check();
    }
  }

  async fillPassword(password: string) {
    await this.passwordInput.click();
    await this.passwordInput.fill(password);
  }

  async selectDateOfBirth(day: string, month: string, year: string) {
    await this.daysDropdown.selectOption(day);
    await this.monthsDropdown.selectOption(month);
    await this.yearsDropdown.selectOption(year);
  }

  async fillAddressInfo(data: AccountData) {
    await this.firstNameInput.click();
    await this.firstNameInput.fill(data.firstName);

    await this.lastNameInput.click();
    await this.lastNameInput.fill(data.lastName);

    await this.companyInput.click();
    await this.companyInput.fill(data.company);

    await this.addressInput.click();
    await this.addressInput.fill(data.address);

    await this.address2Input.click();
    await this.address2Input.fill(data.address2);

    await this.stateInput.click();
    await this.stateInput.fill(data.state);

    await this.cityInput.click();
    await this.cityInput.fill(data.city);

    await this.zipcodeInput.click();
    await this.zipcodeInput.fill(data.zipcode);

    await this.mobileNumberInput.click();
    await this.mobileNumberInput.fill(data.mobileNumber);
  }

  async submitAccountCreation() {
    await this.createAccountButton.click();
  }

  async clickContinue() {
    await this.continueLink.click();
  }

  /**
   * Fills out the entire account creation form (title, password, DOB, address block)
   * in one call, so the test file stays clean and readable.
   */
  async fillAccountCreationForm(data: AccountData) {
    await this.selectTitle(data.title);
    await this.fillPassword(data.password);
    await this.selectDateOfBirth(data.dobDay, data.dobMonth, data.dobYear);
    await this.fillAddressInfo(data);
  }
}