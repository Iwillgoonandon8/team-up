import { Module } from '@nestjs/common';
import { SiteConfigController } from './site-config.controller';
import { SiteConfigService } from './site-config.service';
import { FeishuModule } from '../../integrations/feishu/feishu.module';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [FeishuModule, TeamsModule],
  controllers: [SiteConfigController],
  providers: [SiteConfigService],
  exports: [SiteConfigService],
})
export class SiteConfigModule {}
