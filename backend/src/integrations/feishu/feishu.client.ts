import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { TokenService } from './token.service';

@Injectable()
export class FeishuClient {
  private readonly client: AxiosInstance;

  constructor(private readonly tokenService: TokenService) {
    this.client = axios.create({
      baseURL: 'https://open.feishu.cn/open-apis',
      timeout: 10000
    });
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const token = await this.tokenService.getTenantAccessToken();
    const { data } = await this.client.get<T>(url, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  }

  async post<T>(url: string, body?: unknown): Promise<T> {
    const token = await this.tokenService.getTenantAccessToken();
    const { data } = await this.client.post<T>(url, body, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  }

  async patch<T>(url: string, body?: unknown): Promise<T> {
    const token = await this.tokenService.getTenantAccessToken();
    const { data } = await this.client.patch<T>(url, body, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  }

  async put<T>(url: string, body?: unknown): Promise<T> {
    const token = await this.tokenService.getTenantAccessToken();
    const { data } = await this.client.put<T>(url, body, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  }
}
