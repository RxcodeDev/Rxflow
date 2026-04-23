import { IsString, IsNotEmpty, IsOptional, IsDateString, IsIn } from 'class-validator';

const STATUSES = ['planificado', 'activo', 'completado'] as const;

export class UpdateCycleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: 'planificado' | 'activo' | 'completado';

  @IsOptional()
  @IsDateString()
  start_date?: string | null;

  @IsOptional()
  @IsDateString()
  end_date?: string | null;
}
