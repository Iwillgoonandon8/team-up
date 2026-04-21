import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/utils/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async wxLogin(@Body('code') code: string) {
    if (!code) {
      return { error: 'code is required' };
    }
    return this.authService.wxLogin(code);
  }
}
