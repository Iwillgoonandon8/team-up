import { Module } from '@nestjs/common';
import { FeishuModule } from '../../integrations/feishu/feishu.module';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

@Module({
  imports: [FeishuModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService]
})
export class ApplicationsModule {}
