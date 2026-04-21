import { Injectable } from '@nestjs/common';
import { getPool } from '../../config/database.config';
import type { User, SafeUser } from './entities/user.entity';

const SAFE_COLS = `
  id, name, email, role, initials, avatar_url, avatar_color,
  presence_status, last_seen_at, is_active, created_at, updated_at
`;

export interface CreateUserData {
  name: string;
  email: string;
  password_hash: string;
  initials: string;
  role?: string;
}

@Injectable()
export class UsersRepository {
  private get pool() {
    return getPool();
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query<User>(
      'SELECT * FROM users WHERE email = $1 AND is_active = true LIMIT 1',
      [email],
    );
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<SafeUser | null> {
    const { rows } = await this.pool.query<SafeUser>(
      `SELECT ${SAFE_COLS} FROM users WHERE id = $1 AND is_active = true LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async create(data: CreateUserData): Promise<SafeUser> {
    const { rows } = await this.pool.query<SafeUser>(
      `INSERT INTO users (name, email, password_hash, initials, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SAFE_COLS}`,
      [data.name, data.email, data.password_hash, data.initials, data.role ?? 'member'],
    );
    return rows[0];
  }

  async updatePresence(
    id: string,
    status: 'online' | 'away' | 'offline',
  ): Promise<void> {
    await this.pool.query(
      'UPDATE users SET last_seen_at = NOW(), presence_status = $1 WHERE id = $2',
      [status, id],
    );
  }

  async deactivate(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET is_active = false WHERE id = $1',
      [id],
    );
  }

  async changePassword(id: string, newHash: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, id],
    );
  }

  async update(id: string, data: { name?: string; email?: string; role?: string; initials?: string; avatar_url?: string | null; avatar_color?: string | null }): Promise<SafeUser | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.name         !== undefined) { fields.push(`name = $${idx++}`);         values.push(data.name); }
    if (data.email        !== undefined) { fields.push(`email = $${idx++}`);        values.push(data.email); }
    if (data.role         !== undefined) { fields.push(`role = $${idx++}`);         values.push(data.role); }
    if (data.initials     !== undefined) { fields.push(`initials = $${idx++}`);     values.push(data.initials); }
    if (data.avatar_url   !== undefined) { fields.push(`avatar_url = $${idx++}`);   values.push(data.avatar_url); }
    if (data.avatar_color !== undefined) { fields.push(`avatar_color = $${idx++}`); values.push(data.avatar_color); }
    if (fields.length === 0) return this.findById(id);
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const { rows } = await this.pool.query<SafeUser>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} AND is_active = true RETURNING ${SAFE_COLS}`,
      values,
    );
    return rows[0] ?? null;
  }

  async findAll(): Promise<(SafeUser & { projects: string[]; tasks_open: number })[]> {
    const { rows } = await this.pool.query(`
      SELECT
        ${SAFE_COLS},
        COALESCE(
          (SELECT json_agg(p.name ORDER BY p.name)
           FROM project_members pm
           JOIN projects p ON p.id = pm.project_id
           WHERE pm.user_id = u.id), '[]'::json
        )              AS projects,
        COALESCE(tc.open_count, 0)::int AS tasks_open
      FROM users u
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS open_count
        FROM tasks
        WHERE assignee_id = u.id
          AND status NOT IN ('completada', 'backlog')
          AND parent_task_id IS NULL
      ) tc ON true
      WHERE u.is_active = true
      ORDER BY u.name
    `);
    return rows;
  }
}
