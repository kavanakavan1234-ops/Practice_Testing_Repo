/* import { APIRequestContext, APIResponse } from '@playwright/test';

export class ApiHelper {

    constructor(private request: APIRequestContext) {}

    // ---------- Users ----------
    async getUsers(): Promise<APIResponse> {
        return await this.request.get('users');
    }

    async getUser(id: number): Promise<APIResponse> {
        return await this.request.get(`users/${id}`);
    }

    async createUser(data: any): Promise<APIResponse> {
        return await this.request.post('users', { data });
    }

    async updateUser(id: number, data: any): Promise<APIResponse> {
        return await this.request.patch(`users/${id}`, { data });
    }

    async replaceUser(id: number, data: any): Promise<APIResponse> {
        return await this.request.put(`users/${id}`, { data });
    }

    async deleteUser(id: number): Promise<APIResponse> {
        return await this.request.delete(`users/${id}`);
    }
} */

    import { APIRequestContext, APIResponse } from '@playwright/test';

export class ApiHelper {
  constructor(private request: APIRequestContext) {}

  // ---------- Users ----------

  async getUsers(): Promise<APIResponse> {
    return await this.request.get('users');
  }

  async getUser(id: number): Promise<APIResponse> {
    return await this.request.get(`users/${id}`);
  }

  async createUser(data: any): Promise<APIResponse> {
    return await this.request.post('users', { data });
  }

  async updateUser(id: number, data: any): Promise<APIResponse> {
    return await this.request.patch(`users/${id}`, { data });
  }

  async replaceUser(id: number, data: any): Promise<APIResponse> {
    return await this.request.put(`users/${id}`, { data });
  }

  async deleteUser(id: number): Promise<APIResponse> {
    return await this.request.delete(`users/${id}`);
  }
}