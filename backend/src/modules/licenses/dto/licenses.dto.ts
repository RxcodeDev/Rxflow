import { IsString, MinLength, MaxLength, IsOptional, IsUUID, IsIn, IsEmail } from 'class-validator';


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

export class UpdateMemberRoleDto {
  @IsString()
  @IsIn(['owner', 'admin', 'member'])
  role: string;
}

export class CreatePositionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}

export class CreateInviteDto {
  @IsString()
  @IsIn(['owner', 'admin', 'member'])
  role: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  roleType?: string;
}

export class AcceptInviteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
