 import dotenv from 'dotenv';
dotenv.config(); // must run before anything reads process.env

import { test, expect, request, APIRequestContext } from '@playwright/test';
import { ApiHelper } from '../../utils/apiHelper';
import { userData } from '../../test-data/userData';

test.describe('GoREST User APIs', () => {

    let api: ApiHelper;
    let apiContext: APIRequestContext;
    let createdUserId: number;

    test.beforeEach(async () => {
        apiContext = await request.newContext({
            baseURL: process.env.BASE_URL,
            extraHTTPHeaders: {
                Authorization: `Bearer ${process.env.TOKEN}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        });
        api = new ApiHelper(apiContext);
    });

    test.afterEach(async () => {
        await apiContext.dispose();
    });

    test('Get Users', async () => {
        const response = await api.getUsers();
        console.log(await response.text());
        expect(response.status()).toBe(200);
    });

    test('Create User', async () => {
        const response = await api.createUser(userData.createUser);
        const body = await response.json();
        console.log(body);

        expect(response.status()).toBe(201);
        expect(body.name).toBe(userData.createUser.name);
        expect(body.email).toBe(userData.createUser.email);

        createdUserId = body.id; // reuse for the tests below
    });

    test('Get Single User', async () => {
        // create a fresh user first so this test doesn't depend on a hardcoded/stale ID
        const createResp = await api.createUser(userData.createUser);
        const created = await createResp.json();

        const response = await api.getUser(created.id);
        console.log(await response.text());
        expect(response.status()).toBe(200);
    });

    test('Update User', async () => {
        const createResp = await api.createUser(userData.createUser);
        const created = await createResp.json();

        const response = await api.updateUser(created.id, userData.updateUser);
        const body = await response.json();
        console.log(body);


        expect(response.status()).toBe(200);
        expect(body.name).toBe(userData.updateUser.name);
        expect(body.status).toBe(userData.updateUser.status);
    });

    test('Delete User', async () => {
        const createResp = await api.createUser(userData.createUser);
        const created = await createResp.json();

        const response = await api.deleteUser(created.id);
        console.log(response.status());
        expect(response.status()).toBe(204);
        
    });

});   

/*  import { test, expect, request } from '@playwright/test';
import { ApiHelper } from '../../utils/apiHelper';

test.describe('GoREST User APIs', () => {
  let apiHelper: ApiHelper;

  test.beforeAll(async () => {
    const requestContext = await request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${process.env.TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    apiHelper = new ApiHelper(requestContext);
  });

  test('Get Users', async () => {
    const response = await apiHelper.getUsers();

    expect(response.status()).toBe(200);

    const users = await response.json();
    expect(Array.isArray(users)).toBeTruthy();
  });

  test('Create User', async () => {
    const userData = {
      name: `Test User ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      gender: 'male',
      status: 'active',
    };

    const response = await apiHelper.createUser(userData);

    expect(response.status()).toBe(201);

    const user = await response.json();

    expect(user.name).toBe(userData.name);
    expect(user.email).toBe(userData.email);
  });

  test('Get Single User', async () => {
    const usersResponse = await apiHelper.getUsers();

    expect(usersResponse.status()).toBe(200);

    const users = await usersResponse.json();

    expect(users.length).toBeGreaterThan(0);

    const userId = users[0].id;

    const response = await apiHelper.getUser(userId);

    expect(response.status()).toBe(200);

    const user = await response.json();

    expect(user.id).toBe(userId);
  });

  test('Update User', async () => {
    const usersResponse = await apiHelper.getUsers();

    expect(usersResponse.status()).toBe(200);

    const users = await usersResponse.json();
    const userId = users[0].id;

    const updateData = {
      name: `Updated User ${Date.now()}`,
    };

    const response = await apiHelper.updateUser(userId, updateData);

    expect(response.status()).toBe(200);

    const user = await response.json();

    expect(user.name).toBe(updateData.name);
  });

  test('Delete User', async () => {
    const createData = {
      name: `Delete User ${Date.now()}`,
      email: `delete${Date.now()}@example.com`,
      gender: 'male',
      status: 'active',
    };

    const createResponse = await apiHelper.createUser(createData);

    expect(createResponse.status()).toBe(201);

    const createdUser = await createResponse.json();

    const deleteResponse = await apiHelper.deleteUser(createdUser.id);

    expect(deleteResponse.status()).toBe(204);
  });
});  */

 /*  import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/apiHelper';

test.describe('GoREST User APIs', () => {
  test('Get Users', async ({ request }) => {
    const apiHelper = new ApiHelper(request);

    const response = await apiHelper.getUsers();

    expect(response.status()).toBe(200);

    const users = await response.json();

    expect(Array.isArray(users)).toBeTruthy();
  });

  test('Create User', async ({ request }) => {
    const apiHelper = new ApiHelper(request);

    const userData = {
      name: `Test User ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      gender: 'male',
      status: 'active',
    };

    const response = await apiHelper.createUser(userData);

    expect(response.status()).toBe(201);
  });

  test('Get Single User', async ({ request }) => {
    const apiHelper = new ApiHelper(request);

    const usersResponse = await apiHelper.getUsers();

    expect(usersResponse.status()).toBe(200);

    const users = await usersResponse.json();
    const userId = users[0].id;

    const response = await apiHelper.getUser(userId);

    expect(response.status()).toBe(200);
  });

  test('Update User', async ({ request }) => {
    const apiHelper = new ApiHelper(request);

    const usersResponse = await apiHelper.getUsers();

    expect(usersResponse.status()).toBe(200);

    const users = await usersResponse.json();
    const userId = users[0].id;

    const response = await apiHelper.updateUser(userId, {
      name: `Updated User ${Date.now()}`,
    });

    expect(response.status()).toBe(200);
  });

  test('Delete User', async ({ request }) => {
    const apiHelper = new ApiHelper(request);

    const userData = {
      name: `Delete User ${Date.now()}`,
      email: `delete${Date.now()}@example.com`,
      gender: 'male',
      status: 'active',
    };

    const createResponse = await apiHelper.createUser(userData);

    expect(createResponse.status()).toBe(201);

    const createdUser = await createResponse.json();

    const deleteResponse = await apiHelper.deleteUser(createdUser.id);

    expect(deleteResponse.status()).toBe(204);
  });
});  */

 /* import { test, expect, request, APIRequestContext } from '@playwright/test';
import { ApiHelper } from '../../utils/apiHelper';

let apiContext: APIRequestContext;
let apiHelper: ApiHelper;

test.beforeAll(async () => {
    apiContext = await request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: {
            Authorization: `Bearer ${process.env.GOREST_TOKEN}`,
            Accept: 'application/json',
        },
    });

    apiHelper = new ApiHelper(apiContext);
});

test.afterAll(async () => {
    await apiContext.dispose();
});

test.describe('GoREST User APIs', () => {

    test('Get Users', async () => {
        const response = await apiHelper.getUsers();

        expect(response.status()).toBe(200);
    });

    test('Create User', async () => {
        const response = await apiHelper.createUser({
            name: 'Kavana',
            email: `kavana${Date.now()}@example.com`,
            gender: 'female',
            status: 'active',
        });

        expect(response.status()).toBe(201);
    });

    test('Get Single User', async () => {
        const createResponse = await apiHelper.createUser({
            name: 'Test User',
            email: `test${Date.now()}@example.com`,
            gender: 'male',
            status: 'active',
        });

        expect(createResponse.status()).toBe(201);

        const user = await createResponse.json();

        const response = await apiHelper.getUser(user.id);

        expect(response.status()).toBe(200);
    });

    test('Update User', async () => {
        const createResponse = await apiHelper.createUser({
            name: 'Test User',
            email: `update${Date.now()}@example.com`,
            gender: 'male',
            status: 'active',
        });

        expect(createResponse.status()).toBe(201);

        const user = await createResponse.json();

        const response = await apiHelper.updateUser(user.id, {
            name: 'Updated User',
        });

        expect(response.status()).toBe(200);
    });

    test('Delete User', async () => {
        const createResponse = await apiHelper.createUser({
            name: 'Delete User',
            email: `delete${Date.now()}@example.com`,
            gender: 'male',
            status: 'active',
        });

        expect(createResponse.status()).toBe(201);

        const user = await createResponse.json();

        const response = await apiHelper.deleteUser(user.id);

        expect(response.status()).toBe(204);
    });
});  */
        
/* import { test, expect, request } from '@playwright/test';
import { ApiHelper } from '../../utils/apiHelper';

test.describe('GoREST User APIs', () => {

  let apiHelper: ApiHelper;
  let apiContext: any;

  test.beforeAll(async () => {

    console.log('BASE_URL:', process.env.BASE_URL);
    console.log(
      'TOKEN loaded:',
      process.env.GOREST_TOKEN ? 'YES' : 'NO'
    );

    apiContext = await request.newContext({
      baseURL: process.env.BASE_URL,

      extraHTTPHeaders: {
        Authorization: `Bearer ${process.env.GOREST_TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    apiHelper = new ApiHelper(apiContext);
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  // Your tests here...

}); */
