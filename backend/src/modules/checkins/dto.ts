import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCheckinDto {
  @IsString()
  @IsNotEmpty()
  teamId!: string;

  /** 当前所在阶段，如 "F阶段"、"PA1.1" */
  @IsString()
  @IsNotEmpty()
  stage!: string;

  /** 本次完成的里程碑，如 "NEMU 成功运行 hello world" */
  @IsString()
  @IsNotEmpty()
  milestone!: string;

  /** 详细内容 */
  @IsString()
  @IsNotEmpty()
  content!: string;

  /** 当前卡住的问题（可选） */
  @IsString()
  @IsOptional()
  blockedBy?: string;
}
