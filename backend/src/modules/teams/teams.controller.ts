import { Body, Controller, Get, Param, Query, Post } from '@nestjs/common';
import { CurrentUserId } from '../../common/utils/current-user.decorator';
import { Public } from '../../common/utils/public.decorator';
import { CreateTeamDto } from './dto';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Public()
  @Get('health')
  health() {
    return { ok: true, module: 'teams' };
  }

  @Post()
  async create(@Body() dto: CreateTeamDto, @CurrentUserId() userId: string) {
    return this.teamsService.createTeam(dto, userId);
  }

  @Public()
  @Get()
  async list(
    @Query('status') status?: string,
    @Query('topic') topic?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.teamsService.listTeams({
      status,
      topic,
      page: Number(page ?? 1),
      pageSize: Number(pageSize ?? 20)
    });
  }

  @Get('my')
  async myTeam(@CurrentUserId() userId: string) {
    return this.teamsService.getMyTeam(userId);
  }

  @Public()
  @Get(':teamId/applications')
  async listTeamApplications(
    @Param('teamId') teamId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.teamsService.listTeamApplications(teamId, {
      status,
      page: Number(page ?? 1),
      pageSize: Number(pageSize ?? 20)
    });
  }

  @Post(':teamId/quit')
  async quitTeam(@Param('teamId') teamId: string, @CurrentUserId() userId: string) {
    return this.teamsService.quitTeam(teamId, userId);
  }
}
