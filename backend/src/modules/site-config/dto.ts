import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StageConfigDto {
  @IsString()
  name!: string;

  @IsNumber()
  maxTeams!: number;
}

export class UpdateSiteConfigDto {
  @IsOptional()
  @IsBoolean()
  teamRegEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  teamRegOpenDate?: number;

  @IsOptional()
  @IsNumber()
  teamRegCloseDate?: number;

  @IsOptional()
  @IsBoolean()
  checkinEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  checkinOpenDate?: number;

  @IsOptional()
  @IsNumber()
  checkinCloseDate?: number;

  @IsOptional()
  @IsString()
  notice?: string;

  /** 阶段配置：[{ name: 'F1_基础', maxTeams: 10 }, ...] */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageConfigDto)
  stagesConfig?: StageConfigDto[];
}
