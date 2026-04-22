import { Body, Controller, ForbiddenException, Get, Headers, Post, Put } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/utils/public.decorator';
import { TeamsService } from '../teams/teams.service';
import { UpdateSiteConfigDto } from './dto';
import { SiteConfigService } from './site-config.service';

@Controller('site-config')
export class SiteConfigController {
  constructor(
    private readonly siteConfigService: SiteConfigService,
    private readonly teamsService: TeamsService,
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
    this.checkAdminKey(adminKey);
    return this.siteConfigService.updateConfig(dto);
  }

  /** 管理员：存档所有队伍，开启新一期 */
  @Public()
  @Post('archive-teams')
  archiveTeams(@Headers('x-admin-key') adminKey: string) {
    this.checkAdminKey(adminKey);
    return this.teamsService.archiveAllTeams();
  }

  private checkAdminKey(key: string) {
    const expected = this.config.get<string>('ADMIN_KEY');
    if (!expected || key !== expected) {
      throw new ForbiddenException('无效的管理员密钥');
    }
  }
}
