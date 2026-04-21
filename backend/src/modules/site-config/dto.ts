import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSiteConfigDto {
  /** 是否允许创建/加入队伍 */
  @IsOptional()
  @IsBoolean()
  teamRegEnabled?: boolean;

  /** 开放时间（毫秒时间戳，0 = 不限） */
  @IsOptional()
  @IsNumber()
  teamRegOpenDate?: number;

  /** 关闭时间（毫秒时间戳，0 = 不限） */
  @IsOptional()
  @IsNumber()
  teamRegCloseDate?: number;

  /** 是否允许打卡 */
  @IsOptional()
  @IsBoolean()
  checkinEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  checkinOpenDate?: number;

  @IsOptional()
  @IsNumber()
  checkinCloseDate?: number;

  /** 公告文字（展示给所有学员） */
  @IsOptional()
  @IsString()
  notice?: string;
}
