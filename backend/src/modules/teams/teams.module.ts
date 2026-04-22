import { Module } from '@nestjs/common';
import { FeishuModule } from '../../integrations/feishu/feishu.module';
import { SiteConfigModule } from '../site-config/site-config.module';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [FeishuModule, SiteConfigModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService]
})
export class TeamsModule {}
