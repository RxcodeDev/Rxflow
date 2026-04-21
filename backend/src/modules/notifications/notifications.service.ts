import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  findMine(recipientId: string) {
    return this.repo.findByRecipient(recipientId);
  }

  countUnread(recipientId: string) {
    return this.repo.countUnread(recipientId);
  }

  markRead(id: string, recipientId: string) {
    return this.repo.markRead(id, recipientId);
  }

  markAllRead(recipientId: string) {
    return this.repo.markAllRead(recipientId);
  }

  getPrefs(userId: string) {
    return this.repo.getPrefs(userId);
  }

  savePrefs(userId: string, prefs: {
    mentions: boolean; assignments: boolean; comments: boolean; updates: boolean;
  }) {
    return this.repo.savePrefs(userId, prefs);
  }
}

