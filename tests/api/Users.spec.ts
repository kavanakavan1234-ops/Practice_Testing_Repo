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