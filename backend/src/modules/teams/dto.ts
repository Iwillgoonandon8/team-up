import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  teamName!: string;

  @IsString()
  @IsNotEmpty()
  stage!: string;

  @IsString()
  @IsNotEmpty()
  topic!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(8)
  maxMembers!: number;
}
