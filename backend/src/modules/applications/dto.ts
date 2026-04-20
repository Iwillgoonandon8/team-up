import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  teamId!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}

export class ReviewApplicationDto {
  @IsString()
  @IsOptional()
  reviewReason?: string;
}
