import { Injectable } from '@nestjs/common';
import { getPool } from '../../config/database.config';
import type { User, SafeUser } from './entities/user.entity';

const SAFE_COLS = `
  id, name, email, role, user_type, role_type, initials, avatar_url, avatar_color,
  presence_status, last_seen_at, is_active, created_at, updated_at
`;

export interface CreateUserData {
  name: string;
  email: string;
  password_hash: string;
  initials: string;
  role?: string;
  user_type?: string;
  role_type?: string | null;
  avatar_color?: string | null;
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
    const AVATAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
    const avatarColor = data.avatar_color ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const { rows } = await this.pool.query<SafeUser>(
      `INSERT INTO users (name, email, password_hash, initials, role, user_type, role_type, avatar_color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${SAFE_COLS}`,
      [
        data.name,
        data.email,
        data.password_hash,
        data.initials,
        data.role ?? 'member',
        data.user_type ?? 'member',
        data.role_type ?? null,
        avatarColor,
      ],
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

  async update(id: string, data: {
    name?: string;
    email?: string;
    role?: string;
    user_type?: string;
    role_type?: string | null;
    initials?: string;
    avatar_url?: string | null;
    avatar_color?: string | null;
  }): Promise<SafeUser | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.name         !== undefined) { fields.push(`name = $${idx++}`);         values.push(data.name); }
    if (data.email        !== undefined) { fields.push(`email = $${idx++}`);        values.push(data.email); }
    if (data.role         !== undefined) { fields.push(`role = $${idx++}`);         values.push(data.role); }
    if (data.user_type    !== undefined) { fields.push(`user_type = $${idx++}`);    values.push(data.user_type); }
    if ('role_type' in data)             { fields.push(`role_type = $${idx++}`);    values.push(data.role_type ?? null); }
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

  async isLicenseOwnerOrAdmin(userId: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM licenses WHERE owner_id = $1
         UNION ALL
         SELECT 1 FROM license_members WHERE user_id = $1 AND role IN ('owner', 'admin')
       ) AS exists`,
      [userId],
    );
    return rows[0]?.exists ?? false;
  }

  async findAll(userId: string): Promise<(SafeUser & { projects: string[]; tasks_open: number })[]> {
    const { rows } = await this.pool.query(`
      WITH accessible_licenses AS (
        SELECT l.id
        FROM licenses l
        WHERE l.owner_id = $1
        UNION
        SELECT lm.license_id
        FROM license_members lm
        WHERE lm.user_id = $1
      ),
      visible_users AS (
        SELECT DISTINCT lm.user_id AS id
        FROM license_members lm
        WHERE lm.license_id IN (SELECT id FROM accessible_licenses)
        UNION
        SELECT $1::uuid
      )
      SELECT
        ${SAFE_COLS},
        COALESCE(
          (SELECT json_agg(DISTINCT p.name ORDER BY p.name)
           FROM projects p
           WHERE p.id IN (
             SELECT pm.project_id FROM project_members pm WHERE pm.user_id = u.id
             UNION
             SELECT p2.id FROM projects p2 WHERE p2.created_by = u.id
             UNION
             SELECT t.project_id FROM tasks t WHERE t.assignee_id = u.id AND t.project_id IS NOT NULL
           )), '[]'::json
        )              AS projects,
        COALESCE(tc.open_count, 0)::int AS tasks_open,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM project_members pm2 WHERE pm2.user_id = u.id AND pm2.role = 'owner'
          ) OR EXISTS (
            SELECT 1 FROM projects p3 WHERE p3.created_by = u.id
          ) THEN 'Owner'
          ELSE INITCAP(u.role)
        END AS effective_role
      FROM users u
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS open_count
        FROM tasks
        WHERE assignee_id = u.id
          AND status NOT IN ('completada', 'backlog')
      ) tc ON true
      WHERE u.is_active = true
        AND u.id IN (SELECT id FROM visible_users)
      ORDER BY u.name
    `, [userId]);
    return rows;
  }
}
