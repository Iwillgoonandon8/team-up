import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { BitableService } from '../../integrations/feishu/bitable.service';
import { CreateApplicationDto } from './dto';

type ListApplicationsParams = {
  userId: string;
  status?: string;
  page: number;
  pageSize: number;
};

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly config: ConfigService,
    private readonly bitable: BitableService
  ) {}

  async createApplication(dto: CreateApplicationDto, applicantUserId: string) {
    const applicationsTableId = this.getRequiredConfig('FEISHU_APPLICATIONS_TABLE_ID');
    const teamsTableId = this.getRequiredConfig('FEISHU_TEAMS_TABLE_ID');
    const teamMembersTableId = this.getRequiredConfig('FEISHU_TEAM_MEMBERS_TABLE_ID');

    const [teams, applications, memberships] = await Promise.all([
      this.bitable.listAllRecords(teamsTableId),
      this.bitable.listAllRecords(applicationsTableId),
      this.bitable.listAllRecords(teamMembersTableId)
    ]);

    const targetTeam = teams.find(
      record => this.readStringField(record.fields.team_id) === dto.teamId
    );
    if (!targetTeam) {
      throw new NotFoundException('Team not found');
    }

    const teamStatus = this.readStringField(targetTeam.fields.recruit_status);
    if (teamStatus !== 'open') {
      throw new ConflictException('Team is not open for recruitment');
    }
    const currentMembers = this.readNumberField(targetTeam.fields.current_members);
    const maxMembers = this.readNumberField(targetTeam.fields.max_members);
    if (currentMembers >= maxMembers) {
      throw new ConflictException('Team is full');
    }

    // 只考虑未存档的队伍
    const activeTeamIds = new Set(
      teams
        .filter(r => this.readStringField(r.fields.archived) !== 'true')
        .map(r => this.readStringField(r.fields.team_id))
    );
    const userIsActiveMember = memberships.some(record => {
      const memberUserId = this.readStringField(record.fields.user_id);
      const memberStatus = this.readStringField(record.fields.status);
      const memberTeamId = this.readStringField(record.fields.team_id);
      return memberUserId === applicantUserId && memberStatus === 'active' && activeTeamIds.has(memberTeamId);
    });
    const userIsLeader = teams.some(
      record =>
        this.readStringField(record.fields.leader_user_id) === applicantUserId &&
        this.readStringField(record.fields.archived) !== 'true'
    );
    if (userIsActiveMember || userIsLeader) {
      throw new ConflictException('User already belongs to a team');
    }

    const duplicatedPending = applications.some(record => {
      const teamId = this.readStringField(record.fields.team_id);
      const applicant = this.readStringField(record.fields.applicant_user_id);
      const status = this.readStringField(record.fields.status);
      return teamId === dto.teamId && applicant === applicantUserId && status === 'pending';
    });
    if (duplicatedPending) {
      throw new ConflictException('Duplicated pending application for this team');
    }

    const applyId = randomUUID();
    const now = Date.now();

    const recordId = await this.bitable.createRecord(applicationsTableId, {
      apply_id: applyId,
      team_id: dto.teamId,
      applicant_user_id: applicantUserId,
      message: dto.message,
      status: 'pending',
      created_at: now
    });

    return { applyId, recordId, status: 'pending' };
  }

  async listApplications(params: ListApplicationsParams) {
    if (!params.userId.trim()) {
      throw new BadRequestException('Query param userId is required');
    }

    const applicationsTableId = this.getRequiredConfig('FEISHU_APPLICATIONS_TABLE_ID');
    const normalizedStatus = (params.status ?? '').trim();
    const all = await this.bitable.listAllRecords(applicationsTableId);

    const filtered = all
      .map(record => ({ recordId: record.record_id, fields: record.fields }))
      .filter(item => {
        const applicantUserId = this.readStringField(item.fields['applicant_user_id']);
        const recordStatus = this.readStringField(item.fields['status']);
        if (applicantUserId !== params.userId) {
          return false;
        }
        if (normalizedStatus && recordStatus !== normalizedStatus) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          this.readNumberField(b.fields['created_at']) - this.readNumberField(a.fields['created_at'])
      )
      .map(item => ({ recordId: item.recordId, ...item.fields }));

    const page = Number.isFinite(params.page) && params.page > 0 ? params.page : 1;
    const pageSize =
      Number.isFinite(params.pageSize) && params.pageSize > 0
        ? Math.min(params.pageSize, 100)
        : 20;
    const start = (page - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize);

    return {
      list,
      total: filtered.length,
      page,
      pageSize
    };
  }

  async approveApplication(applyId: string, reviewerUserId: string, reviewReason?: string) {
    try {
      const applicationsTableId = this.getRequiredConfig('FEISHU_APPLICATIONS_TABLE_ID');
      const teamsTableId = this.getRequiredConfig('FEISHU_TEAMS_TABLE_ID');
      const teamMembersTableId = this.getRequiredConfig('FEISHU_TEAM_MEMBERS_TABLE_ID');

      const application = await this.findApplicationByApplyId(applicationsTableId, applyId);
      if (!application) {
        throw new NotFoundException('Application not found');
      }

      const status = this.readStringField(application.fields.status);
      if (status === 'approved') {
        return { applyId, status: 'approved', message: 'Application already approved' };
      }
      if (status !== 'pending') {
        throw new BadRequestException(`Only pending applications can be approved, current status: ${status}`);
      }

      const teamId = this.readStringField(application.fields.team_id);
      const applicantUserId = this.readStringField(application.fields.applicant_user_id);
      const team = await this.findTeamByTeamId(teamsTableId, teamId);
      if (!team) {
        throw new NotFoundException('Team not found');
      }
      const leaderUserId = this.readStringField(team.fields.leader_user_id);
      if (leaderUserId !== reviewerUserId) {
        throw new ConflictException('Only team leader can approve applications');
      }

      const teamStatus = this.readStringField(team.fields.recruit_status);
      if (teamStatus !== 'open') {
        throw new ConflictException('Team is not open for recruitment');
      }

      const currentMembers = this.readNumberField(team.fields.current_members);
      const maxMembers = this.readNumberField(team.fields.max_members);
      if (currentMembers >= maxMembers) {
        throw new ConflictException('Team is full');
      }

      const existingMembers = await this.bitable.listAllRecords(teamMembersTableId);

      // 检查申请人是否已加入任意其他队伍（防止并发审批导致重复入队）
      const alreadyInAnyTeam = existingMembers.some(record => {
        const memberUserId = this.readStringField(record.fields.user_id);
        const memberStatus = this.readStringField(record.fields.status);
        return memberUserId === applicantUserId && memberStatus === 'active';
      });
      if (alreadyInAnyTeam) {
        throw new ConflictException('该用户已加入其他队伍，无法通过此申请');
      }

      const alreadyInTeam = existingMembers.some(record => {
        const memberTeamId = this.readStringField(record.fields.team_id);
        const memberUserId = this.readStringField(record.fields.user_id);
        const memberStatus = this.readStringField(record.fields.status);
        return memberTeamId === teamId && memberUserId === applicantUserId && memberStatus === 'active';
      });

      let nextMembers = currentMembers;
      if (!alreadyInTeam) {
        await this.bitable.createRecord(teamMembersTableId, {
          membership_id: randomUUID(),
          team_id: teamId,
          user_id: applicantUserId,
          role: 'member',
          joined_at: Date.now(),
          status: 'active'
        });
        nextMembers = currentMembers + 1;
      }
      await this.bitable.updateRecord(teamsTableId, team.record_id, {
        current_members: nextMembers,
        recruit_status: nextMembers >= maxMembers ? 'closed' : 'open'
      });

      await this.bitable.updateRecord(applicationsTableId, application.record_id, {
        status: 'approved'
      });

      return { applyId, status: 'approved', teamId, applicantUserId };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Approve application failed: ${this.getErrorMessage(error)}`
      );
    }
  }

  async rejectApplication(applyId: string, reviewerUserId: string, reviewReason?: string) {
    try {
      const applicationsTableId = this.getRequiredConfig('FEISHU_APPLICATIONS_TABLE_ID');
      const teamsTableId = this.getRequiredConfig('FEISHU_TEAMS_TABLE_ID');
      const application = await this.findApplicationByApplyId(applicationsTableId, applyId);
      if (!application) {
        throw new NotFoundException('Application not found');
      }

      const status = this.readStringField(application.fields.status);
      if (status === 'rejected') {
        return { applyId, status: 'rejected', message: 'Application already rejected' };
      }
      if (status !== 'pending') {
        throw new BadRequestException(`Only pending applications can be rejected, current status: ${status}`);
      }

      const teamId = this.readStringField(application.fields.team_id);
      const team = await this.findTeamByTeamId(teamsTableId, teamId);
      if (!team) {
        throw new NotFoundException('Team not found');
      }
      const leaderUserId = this.readStringField(team.fields.leader_user_id);
      if (leaderUserId !== reviewerUserId) {
        throw new ConflictException('Only team leader can reject applications');
      }

      await this.bitable.updateRecord(applicationsTableId, application.record_id, {
        status: 'rejected'
      });

      return { applyId, status: 'rejected' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Reject application failed: ${this.getErrorMessage(error)}`
      );
    }
  }

  private getRequiredConfig(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new InternalServerErrorException(`Missing ${key}`);
    }
    return value;
  }

  private async findApplicationByApplyId(applicationsTableId: string, applyId: string) {
    const records = await this.bitable.listAllRecords(applicationsTableId);
    return records.find(record => this.readStringField(record.fields.apply_id) === applyId);
  }

  private async findTeamByTeamId(teamsTableId: string, teamId: string) {
    const records = await this.bitable.listAllRecords(teamsTableId);
    return records.find(record => this.readStringField(record.fields.team_id) === teamId);
  }

  private readStringField(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    return '';
  }

  private readNumberField(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
