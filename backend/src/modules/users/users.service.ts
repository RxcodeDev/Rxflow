import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { MailService } from '../../shared/mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly mail: MailService,
  ) {}

  async findById(id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  findAll() {
    return this.repo.findAll();
  }

  async invite(dto: { name: string; email: string; password: string }) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictException('El correo ya está en uso');

    const initials = dto.name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');

    const password_hash = await bcrypt.hash(dto.password, 10);
    return this.repo.create({ name: dto.name, email: dto.email, password_hash, initials });
  }

  async deactivate(id: string): Promise<void> {
    await this.findById(id);
    await this.repo.deactivate(id);
  }

  async sendInvite(
    dto: { name?: string; email: string; role?: string },
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

    const user = await this.repo.create({
      name,
      email: dto.email,
      password_hash,
      initials,
      role: dto.role,
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

  async update(id: string, dto: { name?: string; email?: string; avatar_url?: string | null; avatar_color?: string | null }) {
    await this.findById(id);
    if (dto.email) {
      const existing = await this.repo.findByEmail(dto.email);
      if (existing && existing.id !== id) throw new ConflictException('El correo ya está en uso');
    }
    const initials = dto.name
      ? dto.name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
      : undefined;
    const updated = await this.repo.update(id, { name: dto.name, email: dto.email, avatar_url: dto.avatar_url, avatar_color: dto.avatar_color, initials });
    if (!updated) throw new NotFoundException('Usuario no encontrado');
    return updated;
  }

  async changePassword(id: string, dto: { currentPassword: string; newPassword: string }) {
    const user = await this.repo.findByEmail((await this.findById(id)).email);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const valid = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!valid) throw new ConflictException('La contraseña actual no es correcta');
    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.repo.changePassword(id, newHash);
  }
}
