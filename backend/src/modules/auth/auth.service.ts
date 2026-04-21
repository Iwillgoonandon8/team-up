import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

type WxCode2SessionResponse = {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  async wxLogin(code: string): Promise<{ openid: string }> {
    const appid = this.config.get<string>('WX_APPID');
    const secret = this.config.get<string>('WX_SECRET');

    if (!appid || !secret) {
      throw new InternalServerErrorException('Missing WX_APPID or WX_SECRET');
    }

    const { data } = await axios.get<WxCode2SessionResponse>(
      'https://api.weixin.qq.com/sns/jscode2session',
      {
        params: {
          appid,
          secret,
          js_code: code,
          grant_type: 'authorization_code',
        },
      },
    );

    if (data.errcode || !data.openid) {
      throw new UnauthorizedException(`微信登录失败: ${data.errmsg ?? 'unknown error'}`);
    }

    return { openid: data.openid };
  }
}
