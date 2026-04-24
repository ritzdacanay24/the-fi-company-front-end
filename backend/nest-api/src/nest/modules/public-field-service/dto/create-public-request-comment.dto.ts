import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePublicRequestCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  comment!: string;

  @IsBoolean()
  @IsOptional()
  request_change?: boolean;
}
