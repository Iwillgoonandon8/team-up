import { Module } from '@nestjs/common';
import { BitableService } from './bitable.service';
import { FeishuClient } from './feishu.client';
import { TokenService } from './token.service';

@Module({
  providers: [TokenService, FeishuClient, BitableService],
  exports: [BitableService]
})
export class FeishuModule {}
