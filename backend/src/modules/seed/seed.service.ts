import { Injectable, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { getPool } from '../../config/database.config';

@Injectable()
export class SeedService {
  private get pool() {
    return getPool();
  }

  async seed() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Seed no disponible en producción');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const password = await bcrypt.hash('audit1234', 10);

      await client.query(`
        INSERT INTO users (name, email, password_hash, initials, role, presence_status)
        VALUES
          ('Audit User', 'audit@rxcode.com', $1, 'AU', 'admin',  'online'),
          ('Test User',  'test@rxcode.com',  $1, 'TU', 'member', 'offline')
        ON CONFLICT (email) DO UPDATE
          SET name     = EXCLUDED.name,
              initials = EXCLUDED.initials,
              role     = EXCLUDED.role
      `, [password]);

      await client.query('COMMIT');
      return { seeded: true, users: ['audit@rxcode.com', 'test@rxcode.com'] };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async status() {
    const { rows } = await this.pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)    AS users,
        (SELECT COUNT(*) FROM projects) AS projects,
        (SELECT COUNT(*) FROM tasks)    AS tasks,
        (SELECT COUNT(*) FROM cycles)   AS cycles
    `);
    return rows[0];
  }
}

