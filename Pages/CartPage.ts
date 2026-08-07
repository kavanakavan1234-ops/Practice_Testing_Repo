/*import { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly page: Page;

  readonly proceedToCheckoutButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.proceedToCheckoutButton = page.getByText('Proceed To Checkout');
  }

  async proceedToCheckout() {
    await this.proceedToCheckoutButton.click();
  }
} */

  import { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly proceedToCheckoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.proceedToCheckoutButton = page.getByText('Proceed To Checkout');
  }

  async proceedToCheckout() {
    await this.proceedToCheckoutButton.click();
  }
}