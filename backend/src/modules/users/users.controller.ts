import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import type { SafeUser } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: SafeUser) {
    return user;
  }

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Post()
  invite(@Body() body: { name: string; email: string; password: string }) {
    return this.svc.invite(body);
  }

  @Post('invite')
  sendInvite(
    @Body() body: { name: string; email: string; role?: string },
    @CurrentUser() user: SafeUser,
  ) {
    return this.svc.sendInvite(body, user?.name);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.svc.deactivate(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; avatar_url?: string | null; avatar_color?: string | null },
  ) {
    return this.svc.update(id, body);
  }

  @Post(':id/change-password')
  @HttpCode(204)
  async changePassword(
    @Param('id') id: string,
    @Body() body: { currentPassword: string; newPassword: string },
    @CurrentUser() caller: SafeUser,
  ) {
    if (caller.id !== id) throw new ForbiddenException();
    await this.svc.changePassword(id, body);
  }
}
