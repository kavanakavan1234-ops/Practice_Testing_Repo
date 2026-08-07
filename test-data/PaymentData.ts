export interface PaymentData {
  nameOnCard: string;
  cardNumber: string;
  cvc: string;
  expiryMonth: string;
  expiryYear: string;
}

export const paymentData: PaymentData = {
  nameOnCard: 'kavana Naik',
  cardNumber: '4242424242424242',
  cvc: '123',
  expiryMonth: '12',
  expiryYear: '2028',
};