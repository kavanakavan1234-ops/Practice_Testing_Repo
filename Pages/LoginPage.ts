import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginEmailInput = page.locator('form').filter({ hasText: 'Login' }).getByPlaceholder('Email Address');
    this.loginPasswordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login' });
  }

  async goto() {
    await this.page.goto('https://automationexercise.com/login');
  }

  async login(email: string, password: string) {
    await this.loginEmailInput.click();
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.click();
    await this.loginPasswordInput.fill(password);
    await this.loginButton.click();
  }
}