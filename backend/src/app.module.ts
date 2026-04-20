import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthGuard } from './common/guards/auth.guard';
import { ApplicationsModule } from './modules/applications/applications.module';
import { TeamsModule } from './modules/teams/teams.module';
import { FeishuModule } from './integrations/feishu/feishu.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    FeishuModule,
    TeamsModule,
    ApplicationsModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    }
  ]
})
export class AppModule {}
