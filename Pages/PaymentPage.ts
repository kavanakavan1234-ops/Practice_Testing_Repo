/* import { Page, Locator } from '@playwright/test';
import { PaymentData } from '../test-data/PaymentData';

export class PaymentPage {
  readonly page: Page;

  readonly nameOnCardInput: Locator;
  readonly cardNumberInput: Locator;
  readonly cvcInput: Locator;
  readonly expiryMonthInput: Locator;
  readonly expiryYearInput: Locator;
  readonly payAndConfirmButton: Locator;
  readonly continueLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.nameOnCardInput = page.locator('input[name="name_on_card"]');
    this.cardNumberInput = page.locator('input[name="card_number"]');
    this.cvcInput = page.locator('input[name="cvc"]');
    this.expiryMonthInput = page.locator('input[name="expiry_month"]');
    this.expiryYearInput = page.locator('input[name="expiry_year"]');
    this.payAndConfirmButton = page.getByRole('button', { name: 'Pay and Confirm Order' });
    this.continueLink = page.getByRole('link', { name: 'Continue' });
  }

  async fillPaymentDetails(data: PaymentData) {
    await this.nameOnCardInput.click();
    await this.nameOnCardInput.fill(data.nameOnCard);

    await this.cardNumberInput.click();
    await this.cardNumberInput.fill(data.cardNumber);

    await this.cvcInput.click();
    await this.cvcInput.fill(data.cvc);

    await this.expiryMonthInput.click();
    await this.expiryMonthInput.fill(data.expiryMonth);

    await this.expiryYearInput.click();
    await this.expiryYearInput.fill(data.expiryYear);
  }

  async confirmOrder() {
    await this.payAndConfirmButton.click();
  }

  async clickContinue() {
    await this.continueLink.click();
  }
}  */

  import { Page, Locator } from '@playwright/test';
import { PaymentData } from '../test-data/PaymentData';

export class PaymentPage {
  readonly page: Page;
  readonly nameOnCardInput: Locator;
  readonly cardNumberInput: Locator;
  readonly cvcInput: Locator;
  readonly expiryMonthInput: Locator;
  readonly expiryYearInput: Locator;
  readonly payAndConfirmButton: Locator;
  readonly continueLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameOnCardInput = page.locator('input[name="name_on_card"]');
    this.cardNumberInput = page.locator('input[name="card_number"]');
    this.cvcInput = page.locator('input[name="cvc"]');
    this.expiryMonthInput = page.locator('input[name="expiry_month"]');
    this.expiryYearInput = page.locator('input[name="expiry_year"]');
    this.payAndConfirmButton = page.getByRole('button', { name: 'Pay and Confirm Order' });
    this.continueLink = page.getByRole('link', { name: 'Continue' });
  }

  async fillPaymentDetails(data: PaymentData) {
    await this.nameOnCardInput.click();
    await this.nameOnCardInput.fill(data.nameOnCard);
    await this.cardNumberInput.click();
    await this.cardNumberInput.fill(data.cardNumber);
    await this.cvcInput.click();
    await this.cvcInput.fill(data.cvc);
    await this.expiryMonthInput.click();
    await this.expiryMonthInput.fill(data.expiryMonth);
    await this.expiryYearInput.click();
    await this.expiryYearInput.fill(data.expiryYear);
  }

  async confirmOrder() {
    await this.payAndConfirmButton.click();
  }

  async clickContinue() {
    await this.continueLink.click();
  }
}