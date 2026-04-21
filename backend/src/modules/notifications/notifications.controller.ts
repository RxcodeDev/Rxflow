import {
  Controller, Get, Patch, Param, Body, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import type { SafeUser } from '../users/entities/user.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: SafeUser) {
    return this.svc.findMine(user.id);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: SafeUser) {
    return this.svc.countUnread(user.id);
  }

  @Get('prefs')
  getPrefs(@CurrentUser() user: SafeUser) {
    return this.svc.getPrefs(user.id);
  }

  @Patch('prefs')
  savePrefs(
    @CurrentUser() user: SafeUser,
    @Body() body: { mentions: boolean; assignments: boolean; comments: boolean; updates: boolean },
  ) {
    return this.svc.savePrefs(user.id, body);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.svc.markRead(id, user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: SafeUser) {
    return this.svc.markAllRead(user.id);
  }
}

