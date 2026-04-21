import { Body, Controller, ForbiddenException, Get, Headers, Put } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/utils/public.decorator';
import { UpdateSiteConfigDto } from './dto';
import { SiteConfigService } from './site-config.service';

@Controller('site-config')
export class SiteConfigController {
  constructor(
    private readonly siteConfigService: SiteConfigService,
    private readonly config: ConfigService,
  ) {}

  /** 公开：所有人可查看当前配置 */
  @Public()
  @Get()
  getConfig() {
    return this.siteConfigService.getConfig();
  }

  /** 管理员：更新配置（需要 x-admin-key 请求头） */
  @Public()
  @Put()
  updateConfig(
    @Headers('x-admin-key') adminKey: string,
    @Body() dto: UpdateSiteConfigDto,
  ) {
    const expected = this.config.get<string>('ADMIN_KEY');
    if (!expected || adminKey !== expected) {
      throw new ForbiddenException('无效的管理员密钥');
    }
    return this.siteConfigService.updateConfig(dto);
  }
}
