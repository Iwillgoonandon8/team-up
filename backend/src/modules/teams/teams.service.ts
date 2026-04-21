import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { BitableService } from '../../integrations/feishu/bitable.service';
import { CreateTeamDto, MAX_TEAMS_PER_STAGE } from './dto';

type ListTeamsParams = {
  status?: string;
  topic?: string;
  stage?: string;
  page: number;
  pageSize: number;
};

type ListTeamApplicationsParams = {
  status?: string;
  page: number;
  pageSize: number;
};

@Injectable()
export class TeamsService {
  constructor(
    private readonly config: ConfigService,
    private readonly bitable: BitableService
  ) {}

  async createTeam(dto: CreateTeamDto, leaderUserId: string) {
    const tableId = this.getRequiredConfig('FEISHU_TEAMS_TABLE_ID');

    // 每个阶段最多 MAX_TEAMS_PER_STAGE 支队伍
    const all = await this.bitable.listAllRecords(tableId);
    const countInStage = all.filter(
      r => this.readString(r.fields['stage']) === dto.stage
    ).length;
    if (countInStage >= MAX_TEAMS_PER_STAGE) {
      throw new BadRequestException(
        `「${dto.stage}」阶段已有 ${MAX_TEAMS_PER_STAGE} 支队伍，暂不开放新建`
      );
    }

    const teamId = randomUUID();
    const now = Date.now();

    const recordId = await this.bitable.createRecord(tableId, {
      team_id: teamId,
      leader_user_id: leaderUserId,
      team_name: dto.teamName,
      stage: dto.stage,
      topic: dto.topic,
      max_members: dto.maxMembers,
      current_members: 1,
      recruit_status: 'open',
      created_at: now
    });

    return { teamId, recordId };
  }

  async listTeams(params: ListTeamsParams) {
    const teamsTableId = this.getRequiredConfig('FEISHU_TEAMS_TABLE_ID');
    const all = await this.bitable.listAllRecords(teamsTableId);
    const normalizedStatus = (params.status ?? '').trim();
    const normalizedTopic = (params.topic ?? '').trim();

    const normalizedStage = (params.stage ?? '').trim();

    const filtered = all
      .map(record => ({ recordId: record.record_id, fields: record.fields }))
      .filter(item => {
        if (
          normalizedStatus &&
          this.readString(item.fields['recruit_status']) !== normalizedStatus
        ) {
          return false;
        }
        if (
          normalizedTopic &&
          !this.readString(item.fields['topic'])
            .toLowerCase()
            .includes(normalizedTopic.toLowerCase())
        ) {
          return false;
        }
        if (
          normalizedStage &&
          this.readString(item.fields['stage']) !== normalizedStage
        ) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) => this.readNumber(b.fields['created_at']) - this.readNumber(a.fields['created_at'])
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

  async getMyTeam(userId: string) {
    if (!userId.trim()) {
      throw new BadRequestException('x-user-id is required');
    }

    const teamsTableId = this.getRequiredConfig('FEISHU_TEAMS_TABLE_ID');
    const membersTableId = this.getRequiredConfig('FEISHU_TEAM_MEMBERS_TABLE_ID');

    const [teams, members] = await Promise.all([
      this.bitable.listAllRecords(teamsTableId),
      this.bitable.listAllRecords(membersTableId)
    ]);

    const activeMembership = members.find(record => {
      const memberUserId = this.readString(record.fields.user_id);
      const memberStatus = this.readString(record.fields.status);
      return memberUserId === userId && memberStatus === 'active';
    });

    if (activeMembership) {
      const joinedTeamId = this.readString(activeMembership.fields.team_id);
      const team = teams.find(record => this.readString(record.fields.team_id) === joinedTeamId);
      return {
        hasTeam: Boolean(team),
        team: team ? { recordId: team.record_id, ...team.fields } : null,
        source: 'team_members'
      };
    }

    const leaderTeam = teams.find(
      record => this.readString(record.fields.leader_user_id) === userId
    );
    return {
      hasTeam: Boolean(leaderTeam),
      team: leaderTeam ? { recordId: leaderTeam.record_id, ...leaderTeam.fields } : null,
      source: 'teams_leader'
    };
  }

  async listTeamApplications(teamId: string, params: ListTeamApplicationsParams) {
    if (!teamId.trim()) {
      throw new BadRequestException('Path param teamId is required');
    }

    const teamsTableId = this.getRequiredConfig('FEISHU_TEAMS_TABLE_ID');
    const applicationsTableId = this.getRequiredConfig('FEISHU_APPLICATIONS_TABLE_ID');
    const normalizedStatus = (params.status ?? '').trim();

    const [teams, applications] = await Promise.all([
      this.bitable.listAllRecords(teamsTableId),
      this.bitable.listAllRecords(applicationsTableId)
    ]);

    const targetTeam = teams.find(record => this.readString(record.fields.team_id) === teamId);
    if (!targetTeam) {
      throw new BadRequestException('Team does not exist');
    }

    const filtered = applications
      .map(record => ({ recordId: record.record_id, fields: record.fields }))
      .filter(item => {
        const itemTeamId = this.readString(item.fields['team_id']);
        const itemStatus = this.readString(item.fields['status']);
        if (itemTeamId !== teamId) {
          return false;
        }
        if (normalizedStatus && itemStatus !== normalizedStatus) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) => this.readNumber(b.fields['created_at']) - this.readNumber(a.fields['created_at'])
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
      team: { recordId: targetTeam.record_id, ...targetTeam.fields },
      list,
      total: filtered.length,
      page,
      pageSize
    };
  }

  async quitTeam(teamId: string, userId: string) {
    if (!teamId.trim()) {
      throw new BadRequestException('Path param teamId is required');
    }
    if (!userId.trim()) {
      throw new BadRequestException('x-user-id is required');
    }

    const teamsTableId = this.getRequiredConfig('FEISHU_TEAMS_TABLE_ID');
    const membersTableId = this.getRequiredConfig('FEISHU_TEAM_MEMBERS_TABLE_ID');

    const [teams, members] = await Promise.all([
      this.bitable.listAllRecords(teamsTableId),
      this.bitable.listAllRecords(membersTableId)
    ]);

    const targetTeam = teams.find(record => this.readString(record.fields.team_id) === teamId);
    if (!targetTeam) {
      throw new BadRequestException('Team does not exist');
    }

    const leaderUserId = this.readString(targetTeam.fields.leader_user_id);
    if (leaderUserId === userId) {
      throw new ConflictException('Leader cannot quit team directly');
    }

    const membership = members.find(record => {
      const memberTeamId = this.readString(record.fields.team_id);
      const memberUserId = this.readString(record.fields.user_id);
      const memberStatus = this.readString(record.fields.status);
      return memberTeamId === teamId && memberUserId === userId && memberStatus === 'active';
    });

    if (!membership) {
      return { success: true, message: 'User is not an active member of this team' };
    }

    await this.bitable.updateRecord(membersTableId, membership.record_id, {
      status: 'quit'
    });

    const currentMembers = this.readNumber(targetTeam.fields.current_members);
    const maxMembers = this.readNumber(targetTeam.fields.max_members);
    const nextMembers = Math.max(0, currentMembers - 1);

    await this.bitable.updateRecord(teamsTableId, targetTeam.record_id, {
      current_members: nextMembers,
      recruit_status: nextMembers < maxMembers ? 'open' : this.readString(targetTeam.fields.recruit_status)
    });

    return {
      success: true,
      teamId,
      userId,
      currentMembers: nextMembers
    };
  }

  private getRequiredConfig(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new InternalServerErrorException(`Missing ${key}`);
    }
    return value;
  }

  private readString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    return '';
  }

  private readNumber(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}
