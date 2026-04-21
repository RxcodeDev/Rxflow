import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateCycleDto {
  @IsString()
  @IsNotEmpty()
  project_code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}
