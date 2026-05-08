import { IsString, IsUUID, IsOptional, IsObject, MaxLength, MinLength } from 'class-validator';

export class CreateWikiPageDto {
  @IsUUID()
  workspaceId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  projectCode?: string;

  @IsOptional()
  @IsUUID()
  epicId?: string;

  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsUUID()
  parentPageId?: string;
}
