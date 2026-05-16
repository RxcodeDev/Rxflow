import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { MailService } from '../../shared/mail/mail.service';

const USER_TYPES = ['member', 'owner', 'admin'] as const;

type UserType = (typeof USER_TYPES)[number];
type RoleType = string;

type RoleInput = {
  role?: string;
  userType?: string;
  roleType?: string;
  user_type?: string;
  role_type?: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly mail: MailService,
  ) {}

  async findById(id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const normalized = this.parseNormalizedUserFields(user.user_type, user.role_type, user.role);
    return {
      ...user,
      user_type: normalized.userType,
      role_type: normalized.roleType,
    };
  }

  async findAll(userId: string) {
    const users = await this.repo.findAll(userId);
    return users.map((u) => {
      const normalized = this.parseNormalizedUserFields(u.user_type, u.role_type, u.role);
      return {
        ...u,
        user_type: normalized.userType,
        role_type: normalized.roleType,
      };
    });
  }

  async invite(dto: {
    name: string;
    email: string;
    password: string;
    role?: string;
    userType?: string;
    roleType?: string;
    user_type?: string;
    role_type?: string;
  }) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictException('El correo ya está en uso');

    const initials = dto.name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');

    const normalized = this.normalizeRoleInput(dto);

    const password_hash = await bcrypt.hash(dto.password, 10);
    return this.repo.create({
      name: dto.name,
      email: dto.email,
      password_hash,
      initials,
      role: normalized.storedRole,
      user_type: normalized.userType,
      role_type: normalized.roleType,
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.findById(id);
    await this.repo.deactivate(id);
  }

  async sendInvite(
    dto: {
      name?: string;
      email: string;
      role?: string;
      userType?: string;
      roleType?: string;
      user_type?: string;
      role_type?: string;
    },
    invitedBy?: string,
  ) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictException('El correo ya está en uso');

    const name = dto.name?.trim() || dto.email.split('@')[0];
    const tempPassword = this.generatePassword();
    const initials = name
      .split(' ').slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
    const password_hash = await bcrypt.hash(tempPassword, 10);

    const normalized = this.normalizeRoleInput(dto);

    const user = await this.repo.create({
      name,
      email: dto.email,
      password_hash,
      initials,
      role: normalized.storedRole,
      user_type: normalized.userType,
      role_type: normalized.roleType,
    });

    await this.mail.sendInvitation({
      to:           dto.email,
      name,
      tempPassword,
      invitedBy,
    });

    return user;
  }

  private generatePassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    return Array.from(
      { length: 12 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  }

  async update(
    id: string,
    dto: {
      name?: string;
      email?: string;
      role?: string;
      userType?: string;
      roleType?: string;
      user_type?: string;
      role_type?: string;
      avatar_url?: string | null;
      avatar_color?: string | null;
    },
  ) {
    await this.findById(id);
    if (dto.email) {
      const existing = await this.repo.findByEmail(dto.email);
      if (existing && existing.id !== id) throw new ConflictException('El correo ya está en uso');
    }
    const hasRoleChange =
      dto.role !== undefined ||
      dto.userType !== undefined ||
      dto.roleType !== undefined ||
      dto.user_type !== undefined ||
      dto.role_type !== undefined;
    const normalized = hasRoleChange ? this.normalizeRoleInput(dto) : null;

    const initials = dto.name
      ? dto.name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
      : undefined;
    const updated = await this.repo.update(id, {
      name: dto.name,
      email: dto.email,
      role: normalized?.storedRole,
      user_type: normalized?.userType,
      role_type: normalized?.roleType,
      avatar_url: dto.avatar_url,
      avatar_color: dto.avatar_color,
      initials,
    });
    if (!updated) throw new NotFoundException('Usuario no encontrado');
    const parsedUpdated = this.parseNormalizedUserFields(updated.user_type, updated.role_type, updated.role);
    return {
      ...updated,
      user_type: normalized?.userType ?? parsedUpdated.userType,
      role_type: normalized?.roleType ?? parsedUpdated.roleType,
    };
  }

  async changePassword(id: string, dto: { currentPassword: string; newPassword: string }) {
    const user = await this.repo.findByEmail((await this.findById(id)).email);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const valid = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!valid) throw new ConflictException('La contraseña actual no es correcta');
    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.repo.changePassword(id, newHash);
  }

  async adminResetPassword(callerId: string, targetId: string, newPassword: string) {
    const allowed = await this.repo.isLicenseOwnerOrAdmin(callerId);
    if (!allowed)
      throw new ForbiddenException('Solo owners y admins pueden resetear contraseñas');
    if (!newPassword || newPassword.length < 6)
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    const newHash = await bcrypt.hash(newPassword, 10);
    await this.repo.changePassword(targetId, newHash);
  }

  async updatePresence(id: string, status: 'online' | 'away' | 'offline'): Promise<void> {
    await this.repo.updatePresence(id, status);
  }

  private normalizeRoleInput(input: RoleInput): { userType: UserType; roleType: RoleType | null; storedRole: string } {
    const rawUserType = (input.userType ?? input.user_type)?.trim();
    const rawRoleType = (input.roleType ?? input.role_type)?.trim() || null;

    if (rawUserType !== undefined || rawRoleType !== undefined) {
      const userType = (rawUserType || 'member').toLowerCase();
      if (!USER_TYPES.includes(userType as UserType)) {
        throw new BadRequestException(
          `Tipo de usuario invalido. Valores permitidos: ${USER_TYPES.join(', ')}`,
        );
      }

      return {
        userType: userType as UserType,
        roleType: rawRoleType,
        storedRole: rawRoleType ?? userType,
      };
    }

    const legacy = this.parseLegacyRoleInput(input.role);
    return {
      userType: legacy.userType,
      roleType: legacy.roleType,
      storedRole: legacy.storedRole,
    };
  }

  private parseLegacyRoleInput(role?: string): { userType: UserType; roleType: RoleType | null; storedRole: string } {
    const rawRole = role?.trim();
    if (!rawRole) return { userType: 'member', roleType: null, storedRole: 'member' };

    const lc = rawRole.toLowerCase();
    if (USER_TYPES.includes(lc as UserType)) {
      return { userType: lc as UserType, roleType: null, storedRole: lc };
    }

    // Accept any free-form role string (no enum restriction)
    return { userType: 'member', roleType: rawRole, storedRole: rawRole };
  }

  private parseNormalizedUserFields(
    userType?: string | null,
    roleType?: string | null,
    legacyRole?: string | null,
  ): { userType: UserType; roleType: RoleType | null } {
    const normalizedType = userType?.trim().toLowerCase();
    const parsedUserType = USER_TYPES.includes(normalizedType as UserType)
      ? (normalizedType as UserType)
      : null;

    // Accept any free-form role_type stored in DB
    const parsedRoleType = roleType?.trim() || null;

    if (parsedUserType) {
      return { userType: parsedUserType, roleType: parsedRoleType };
    }

    const rawLegacy = legacyRole?.trim();
    if (!rawLegacy) return { userType: 'member', roleType: parsedRoleType };

    const legacyType = rawLegacy.toLowerCase();
    if (USER_TYPES.includes(legacyType as UserType)) {
      return { userType: legacyType as UserType, roleType: parsedRoleType };
    }

    return { userType: 'member', roleType: parsedRoleType ?? rawLegacy };
  }
}
