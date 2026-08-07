
export interface AccountData {
  name: string;
  email: string;
  title: 'Mr.' | 'Mrs.';
  password: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  firstName: string;
  lastName: string;
  company: string;
  address: string;
  address2: string;
  state: string;
  city: string;
  zipcode: string;
  mobileNumber: string;
}

// Static base data (mirrors the recorded script).
// Email is generated dynamically at runtime via utils/testDataGenerator.ts
// since automationexercise.com does not allow re-registering the same email.
export const accountData: Omit<AccountData, 'email'> = {
  name: 'kavana',
  title: 'Mrs.',
  password: 'Test@123',
  dobDay: '13',
  dobMonth: '12',
  dobYear: '1998',
  firstName: 'kavana',
  lastName: 'naik',
  company: 'edstellar',
  address: 'btm 2 nd stage',
  address2: 'rajaji nagar',
  state: 'karnataka',
  city: 'bangalore',
  zipcode: '560076',
  mobileNumber: '9900728402',
};
