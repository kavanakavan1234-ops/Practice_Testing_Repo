 /*  import { test, expect } from '@playwright/test';
import { LoginPage } from '../Pages/LoginPage';
import { ProductsPage } from '../Pages/ProductsPage';
import { CartPage } from '../Pages/CartPage';
import { CheckoutPage } from '../Pages/CheckoutPage';
import { PaymentPage } from '../Pages/PaymentPage';
import { paymentData } from '../test-data/PaymentData';

test('User can place an order successfully', async ({ page, context }) => {
  const loginPage = new LoginPage(page);
  const productsPage = new ProductsPage(page);
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);
  const paymentPage = new PaymentPage(page);

  // Safety net: if an ad ever manages to open a popup/new tab, close it
  // immediately so it can't steal focus or crash the session.
  context.on('page', async (popup) => {
    await popup.close().catch(() => {});
  });

  // Block ads BEFORE navigating — must happen before goto()
  await productsPage.blockAds();

  // Step 1: Login
  await loginPage.goto();
  await loginPage.login('kavanakavan1234@gmail.com', 'Test@123');
  await expect(page.getByText('Logged in as')).toBeVisible();

  // Step 2: Add product to cart
  await productsPage.addProductToCartByIndex(1);
  await productsPage.goToCart();

  // Step 3: Checkout
  await cartPage.proceedToCheckout();
  await checkoutPage.placeOrder();

  // Step 4: Payment
  await paymentPage.fillPaymentDetails(paymentData);
  await paymentPage.confirmOrder();

  // Step 5: Verify success and finish
  await expect(page.getByText('Congratulations! Your order has been confirmed!')).toBeVisible();
  console.log('Order placed successfully');

  await paymentPage.clickContinue();
});  */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../Pages/LoginPage';
import { ProductsPage } from '../Pages/ProductsPage';
import { CartPage } from '../Pages/CartPage';
import { CheckoutPage } from '../Pages/CheckoutPage';
import { PaymentPage } from '../Pages/PaymentPage';
import { paymentData } from '../test-data/PaymentData';

test('User can place an order successfully', async ({ page, context }) => {
  const loginPage = new LoginPage(page);
  const productsPage = new ProductsPage(page);
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);
  const paymentPage = new PaymentPage(page);

  context.on('page', async (popup) => {
    await popup.close().catch(() => {});
  });

  await productsPage.blockAds();

  await loginPage.goto();
  await loginPage.login('kavanakavan1234@gmail.com', 'Test@123');
  await expect(page.getByText('Logged in as')).toBeVisible();

  await productsPage.addProductToCartByIndex(1);
  await productsPage.goToCart();

  await cartPage.proceedToCheckout();
  await checkoutPage.placeOrder();

  await paymentPage.fillPaymentDetails(paymentData);
  await paymentPage.confirmOrder();

  await expect(page.getByText('Congratulations! Your order has been confirmed!')).toBeVisible();
  console.log('Order placed successfully');

  await paymentPage.clickContinue();
});