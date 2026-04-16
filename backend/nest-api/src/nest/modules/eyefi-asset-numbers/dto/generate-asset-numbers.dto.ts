import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class GenerateAssetNumbersDto {
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @IsIn(['New', 'Used'])
  category?: string;
}
