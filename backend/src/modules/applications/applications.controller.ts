import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUserId } from '../../common/utils/current-user.decorator';
import { Public } from '../../common/utils/public.decorator';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto, ReviewApplicationDto } from './dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Public()
  @Get('health')
  health() {
    return { ok: true, module: 'applications' };
  }

  @Post()
  async create(@Body() dto: CreateApplicationDto, @CurrentUserId() userId: string) {
    return this.applicationsService.createApplication(dto, userId);
  }

  @Get()
  async listMyApplications(
    @CurrentUserId() userId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.applicationsService.listApplications({
      userId,
      status,
      page: Number(page ?? 1),
      pageSize: Number(pageSize ?? 20)
    });
  }

  @Post(':applyId/approve')
  async approve(
    @Param('applyId') applyId: string,
    @Body() dto: ReviewApplicationDto,
    @CurrentUserId() userId: string
  ) {
    return this.applicationsService.approveApplication(
      applyId,
      userId,
      dto.reviewReason
    );
  }

  @Post(':applyId/reject')
  async reject(
    @Param('applyId') applyId: string,
    @Body() dto: ReviewApplicationDto,
    @CurrentUserId() userId: string
  ) {
    return this.applicationsService.rejectApplication(
      applyId,
      userId,
      dto.reviewReason
    );
  }
}
