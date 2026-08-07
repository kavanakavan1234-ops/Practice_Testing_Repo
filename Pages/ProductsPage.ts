/*import { Page, Locator } from '@playwright/test';

export class ProductsPage {
  readonly page: Page;

  readonly addToCartButtons: Locator;
  readonly viewCartLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.addToCartButtons = page.getByText('Add to cart');
    this.viewCartLink = page.getByRole('link', { name: 'View Cart' });
  }

  /**
   * Blocks known ad-serving domains AND hides any iframe via CSS as a
   * second layer of defense. Call this BEFORE navigation (right after
   * page creation), not after — route interception only affects
   * requests made after it's registered.
   */
   /*async blockAds() {
    await this.page.route(
      /doubleclick\.net|googlesyndication\.com|googleadservices\.com|adnxs\.com|google\.com\/pagead|googletagservices\.com/,
      (route) => route.abort()
    );
  }

  async addProductToCartByIndex(index: number) {
    const button = this.addToCartButtons.nth(index);
    await button.scrollIntoViewIfNeeded();
    await button.click();
  }

  async goToCart() {
    await this.viewCartLink.click();
  }
} */

  import { Page, Locator } from '@playwright/test';

export class ProductsPage {
  readonly page: Page;
  readonly viewCartLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.viewCartLink = page.getByRole('link', { name: 'View Cart' });
  }

  async blockAds() {
    await this.page.route(
      /doubleclick\.net|googlesyndication\.com|googleadservices\.com|adnxs\.com|google\.com\/pagead|googletagservices\.com/,
      (route) => route.abort()
    );
  }

  async addProductToCartByIndex(index: number) {
    const productCard = this.page.locator('.product-image-wrapper').nth(index);
    await productCard.scrollIntoViewIfNeeded();
    await productCard.hover();

    // Each product card has two "Add to cart" elements (image overlay +
    // one near product info) — scope to the card and take the first match.
    const button = productCard.getByText('Add to cart').first();
    await button.click();
  }

  async goToCart() {
    await this.viewCartLink.click();
  }
}