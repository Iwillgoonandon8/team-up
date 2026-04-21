import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { BitableService } from '../../integrations/feishu/bitable.service';
import { CreateCheckinDto } from './dto';

@Injectable()
export class CheckinsService {
  constructor(
    private readonly config: ConfigService,
    private readonly bitable: BitableService,
  ) {}

  async createCheckin(dto: CreateCheckinDto, userId: string) {
    const tableId = this.getRequiredConfig('FEISHU_CHECKINS_TABLE_ID');
    const checkinId = randomUUID();
    const now = Date.now();

    const recordId = await this.bitable.createRecord(tableId, {
      checkin_id: checkinId,
      team_id: dto.teamId,
      user_id: userId,
      stage: dto.stage,
      milestone: dto.milestone,
      content: dto.content,
      blocked_by: dto.blockedBy ?? '',
      created_at: now,
    });

    return { checkinId, recordId };
  }

  async listTeamCheckins(teamId: string, page = 1, pageSize = 20) {
    const tableId = this.getRequiredConfig('FEISHU_CHECKINS_TABLE_ID');
    const all = await this.bitable.listAllRecords(tableId);

    const filtered = all
      .filter(r => this.readString(r.fields['team_id']) === teamId)
      .sort((a, b) => this.readNumber(b.fields['created_at']) - this.readNumber(a.fields['created_at']))
      .map(r => ({ recordId: r.record_id, ...r.fields }));

    const start = (page - 1) * pageSize;
    return {
      list: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  async listMyCheckins(userId: string, page = 1, pageSize = 20) {
    const tableId = this.getRequiredConfig('FEISHU_CHECKINS_TABLE_ID');
    const all = await this.bitable.listAllRecords(tableId);

    const filtered = all
      .filter(r => this.readString(r.fields['user_id']) === userId)
      .sort((a, b) => this.readNumber(b.fields['created_at']) - this.readNumber(a.fields['created_at']))
      .map(r => ({ recordId: r.record_id, ...r.fields }));

    const start = (page - 1) * pageSize;
    return {
      list: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  private getRequiredConfig(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) throw new InternalServerErrorException(`Missing ${key}`);
    return value;
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value : String(value ?? '');
  }

  private readNumber(value: unknown): number {
    return typeof value === 'number' ? value : Number(value ?? 0);
  }
}
