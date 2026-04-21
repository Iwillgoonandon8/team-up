import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export const YSYX_STAGES = ['F1_基础', 'F2_基础', 'F_加强', 'E1_基础', 'E2_基础', 'E_加强'] as const;
export const MAX_TEAMS_PER_STAGE = 10;
export type YsyxStage = (typeof YSYX_STAGES)[number];

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  teamName!: string;

  /** 学习阶段：预学习/F阶段、PA0、PA1 … */
  @IsString()
  @IsIn(YSYX_STAGES)
  stage!: YsyxStage;

  @IsString()
  @IsNotEmpty()
  topic!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(8)
  maxMembers!: number;
}
