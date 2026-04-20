import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

type TenantTokenResponse = {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
};

@Injectable()
export class TokenService {
  private token = '';
  private expiresAt = 0;

  constructor(private readonly config: ConfigService) {}

  async getTenantAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.token && now < this.expiresAt - 60) {
      return this.token;
    }

    const appId = this.config.get<string>('FEISHU_APP_ID');
    const appSecret = this.config.get<string>('FEISHU_APP_SECRET');

    if (!appId || !appSecret) {
      throw new InternalServerErrorException('Missing FEISHU_APP_ID or FEISHU_APP_SECRET');
    }

    const { data } = await axios.post<TenantTokenResponse>(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        app_id: appId,
        app_secret: appSecret
      }
    );

    if (data.code !== 0 || !data.tenant_access_token) {
      throw new InternalServerErrorException(`Failed to fetch Feishu token: ${data.msg}`);
    }

    this.token = data.tenant_access_token;
    this.expiresAt = now + data.expire;

    return this.token;
  }
}
