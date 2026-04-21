import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findByEmail(dto.email);
    if (existing) throw new ConflictException('El correo ya está en uso');

    const initials = dto.name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');

    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersRepo.create({
      name: dto.name,
      email: dto.email,
      password_hash,
      initials,
    });

    const access_token = this.sign({ sub: user.id, email: user.email, name: user.name, role: user.role });
    return { user, access_token };
  }

  async login(dto: LoginDto) {
    const userWithHash = await this.usersRepo.findByEmail(dto.email);
    if (!userWithHash) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, userWithHash.password_hash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    const { password_hash: _, ...user } = userWithHash;
    const access_token = this.sign({ sub: user.id, email: user.email, name: user.name, role: user.role });
    return { user, access_token };
  }

  private sign(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}
