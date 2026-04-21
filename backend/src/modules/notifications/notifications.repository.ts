import { Injectable } from '@nestjs/common';
import { getPool } from '../../config/database.config';
import type { NotificationItem } from './entities/notification.entity';

@Injectable()
export class NotificationsRepository {
  private get pool() {
    return getPool();
  }

  async findByRecipient(recipientId: string): Promise<NotificationItem[]> {
    const { rows } = await this.pool.query(`
      SELECT
        n.id, n.type, n.message, n.read, n.created_at,
        json_build_object('initials', s.initials, 'name', s.name) AS sender,
        CASE WHEN n.task_id IS NOT NULL THEN
          json_build_object(
            'id',         t.id,
            'identifier', CONCAT(p.code, '-', t.sequential_id),
            'title',      t.title
          )
        ELSE NULL END AS task,
        CASE WHEN n.project_id IS NOT NULL THEN
          json_build_object('name', proj.name)
        ELSE NULL END AS project
      FROM notifications n
      JOIN  users s ON s.id = n.sender_id
      LEFT JOIN tasks    t    ON t.id    = n.task_id
      LEFT JOIN projects p    ON p.id    = t.project_id
      LEFT JOIN projects proj ON proj.id = n.project_id
      WHERE n.recipient_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50
    `, [recipientId]);
    return rows;
  }

  async countUnread(recipientId: string): Promise<number> {
    const { rows } = await this.pool.query(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE recipient_id = $1 AND read = false',
      [recipientId],
    );
    return rows[0].count;
  }

  async markRead(id: string, recipientId: string): Promise<void> {
    await this.pool.query(
      'UPDATE notifications SET read = true WHERE id = $1 AND recipient_id = $2',
      [id, recipientId],
    );
  }

  async markAllRead(recipientId: string): Promise<void> {
    await this.pool.query(
      'UPDATE notifications SET read = true WHERE recipient_id = $1 AND read = false',
      [recipientId],
    );
  }

  async createMentionNotification(data: {
    recipientId: string;
    senderId:    string;
    taskId:      string;
    message:     string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO notifications (recipient_id, sender_id, type, message, task_id)
       VALUES ($1, $2, 'mention', $3, $4)`,
      [data.recipientId, data.senderId, data.message, data.taskId],
    );
  }

  async getPrefs(userId: string): Promise<{
    mentions: boolean; assignments: boolean; comments: boolean; updates: boolean;
  }> {
    const { rows } = await this.pool.query(
      `SELECT mentions, assignments, comments, updates
       FROM user_notification_prefs
       WHERE user_id = $1`,
      [userId],
    );
    if (rows.length) return rows[0];
    return { mentions: true, assignments: true, comments: false, updates: false };
  }

  async savePrefs(userId: string, prefs: {
    mentions: boolean; assignments: boolean; comments: boolean; updates: boolean;
  }): Promise<{ mentions: boolean; assignments: boolean; comments: boolean; updates: boolean }> {
    const { rows } = await this.pool.query(
      `INSERT INTO user_notification_prefs (user_id, mentions, assignments, comments, updates)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE
         SET mentions    = EXCLUDED.mentions,
             assignments = EXCLUDED.assignments,
             comments    = EXCLUDED.comments,
             updates     = EXCLUDED.updates,
             updated_at  = NOW()
       RETURNING mentions, assignments, comments, updates`,
      [userId, prefs.mentions, prefs.assignments, prefs.comments, prefs.updates],
    );
    return rows[0];
  }
}

