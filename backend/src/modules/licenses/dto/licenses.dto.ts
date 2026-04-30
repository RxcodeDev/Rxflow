import { IsString, MinLength, MaxLength, IsOptional, IsUUID, IsIn } from 'class-validator';

export class CreateLicenseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;
}

export class AddMemberDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsIn(['owner', 'admin', 'member', 'viewer'])
  role?: string;
}

export class AssignWorkspaceDto {
  @IsUUID()
  workspaceId: string;

  @IsUUID()
  userId: string;
}

export class AssignProjectDto {
  @IsUUID()
  projectId: string;

  @IsUUID()
  userId: string;
}
