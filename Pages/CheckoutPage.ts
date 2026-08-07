   /* import { Page, Locator } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;

  readonly placeOrderLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.placeOrderLink = page.getByRole('link', { name: 'Place Order' });
  }

  async placeOrder() {
    await this.placeOrderLink.click();
  }
}  */

  import { Page, Locator } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;
  readonly placeOrderLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.placeOrderLink = page.getByRole('link', { name: 'Place Order' });
  }

  async placeOrder() {
    await this.placeOrderLink.click();
  }
}