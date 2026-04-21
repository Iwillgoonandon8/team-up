import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CheckinsService } from './checkins.service';
import { CreateCheckinDto } from './dto';
import { CurrentUserId } from '../../common/utils/current-user.decorator';
import { Public } from '../../common/utils/public.decorator';

@Controller('checkins')
export class CheckinsController {
  constructor(private readonly checkinsService: CheckinsService) {}

  /** 提交打卡 */
  @Post()
  createCheckin(@Body() dto: CreateCheckinDto, @CurrentUserId() userId: string) {
    return this.checkinsService.createCheckin(dto, userId);
  }

  /** 查看我的打卡记录 */
  @Get('my')
  listMyCheckins(
    @CurrentUserId() userId: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    return this.checkinsService.listMyCheckins(userId, Number(page), Number(pageSize));
  }

  /** 查看某队伍的打卡记录（公开） */
  @Public()
  @Get('team/:teamId')
  listTeamCheckins(
    @Param('teamId') teamId: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    return this.checkinsService.listTeamCheckins(teamId, Number(page), Number(pageSize));
  }
}
