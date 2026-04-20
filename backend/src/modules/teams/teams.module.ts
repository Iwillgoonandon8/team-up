import { Module } from '@nestjs/common';
import { FeishuModule } from '../../integrations/feishu/feishu.module';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [FeishuModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService]
})
export class TeamsModule {}
