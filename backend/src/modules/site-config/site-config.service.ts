import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BitableService } from '../../integrations/feishu/bitable.service';
import { UpdateSiteConfigDto } from './dto';

export type SiteConfig = {
  teamRegEnabled: boolean;
  teamRegOpenDate: number;
  teamRegCloseDate: number;
  checkinEnabled: boolean;
  checkinOpenDate: number;
  checkinCloseDate: number;
  notice: string;
  // 计算后的实际状态（给前端直接用）
  teamRegOpen: boolean;
  checkinOpen: boolean;
};

const DEFAULTS: Omit<SiteConfig, 'teamRegOpen' | 'checkinOpen'> = {
  teamRegEnabled: true,
  teamRegOpenDate: 0,
  teamRegCloseDate: 0,
  checkinEnabled: true,
  checkinOpenDate: 0,
  checkinCloseDate: 0,
  notice: '',
};

@Injectable()
export class SiteConfigService {
  private recordId: string | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly bitable: BitableService,
  ) {}

  async getConfig(): Promise<SiteConfig> {
    const tableId = this.getTableId();
    const all = await this.bitable.listAllRecords(tableId);
    const raw = all[0]?.fields ?? {};
    const recordId = all[0]?.record_id;
    if (recordId) this.recordId = recordId;

    const cfg = {
      teamRegEnabled: this.readBool(raw['team_reg_enabled'], DEFAULTS.teamRegEnabled),
      teamRegOpenDate: this.readNum(raw['team_reg_open_date']),
      teamRegCloseDate: this.readNum(raw['team_reg_close_date']),
      checkinEnabled: this.readBool(raw['checkin_enabled'], DEFAULTS.checkinEnabled),
      checkinOpenDate: this.readNum(raw['checkin_open_date']),
      checkinCloseDate: this.readNum(raw['checkin_close_date']),
      notice: this.readStr(raw['notice']),
    };

    return { ...cfg, teamRegOpen: this.isOpen(cfg.teamRegEnabled, cfg.teamRegOpenDate, cfg.teamRegCloseDate), checkinOpen: this.isOpen(cfg.checkinEnabled, cfg.checkinOpenDate, cfg.checkinCloseDate) };
  }

  async updateConfig(dto: UpdateSiteConfigDto): Promise<SiteConfig> {
    const tableId = this.getTableId();

    // 确保 recordId 是最新的
    if (!this.recordId) await this.getConfig();

    const fields: Record<string, unknown> = {};
    if (dto.teamRegEnabled !== undefined) fields['team_reg_enabled'] = String(dto.teamRegEnabled);
    if (dto.teamRegOpenDate !== undefined) fields['team_reg_open_date'] = dto.teamRegOpenDate;
    if (dto.teamRegCloseDate !== undefined) fields['team_reg_close_date'] = dto.teamRegCloseDate;
    if (dto.checkinEnabled !== undefined) fields['checkin_enabled'] = String(dto.checkinEnabled);
    if (dto.checkinOpenDate !== undefined) fields['checkin_open_date'] = dto.checkinOpenDate;
    if (dto.checkinCloseDate !== undefined) fields['checkin_close_date'] = dto.checkinCloseDate;
    if (dto.notice !== undefined) fields['notice'] = dto.notice;

    if (this.recordId) {
      await this.bitable.updateRecord(tableId, this.recordId, fields);
    } else {
      // 第一次：创建记录
      const id = await this.bitable.createRecord(tableId, { ...this.defaultFields(), ...fields });
      this.recordId = id;
    }

    return this.getConfig();
  }

  private isOpen(enabled: boolean, openDate: number, closeDate: number): boolean {
    if (!enabled) return false;
    const now = Date.now();
    if (openDate && now < openDate) return false;
    if (closeDate && now > closeDate) return false;
    return true;
  }

  private defaultFields() {
    return {
      team_reg_enabled: 'true',
      team_reg_open_date: 0,
      team_reg_close_date: 0,
      checkin_enabled: 'true',
      checkin_open_date: 0,
      checkin_close_date: 0,
      notice: '',
    };
  }

  private getTableId() {
    const id = this.config.get<string>('FEISHU_CONFIG_TABLE_ID');
    if (!id) throw new InternalServerErrorException('Missing FEISHU_CONFIG_TABLE_ID');
    return id;
  }

  private readBool(v: unknown, def: boolean): boolean {
    if (v === 'true' || v === true) return true;
    if (v === 'false' || v === false) return false;
    return def;
  }

  private readNum(v: unknown): number {
    return typeof v === 'number' ? v : Number(v ?? 0) || 0;
  }

  private readStr(v: unknown): string {
    return typeof v === 'string' ? v : '';
  }
}
