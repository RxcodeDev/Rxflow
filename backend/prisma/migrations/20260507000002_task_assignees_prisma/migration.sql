-- Migration: task_assignees via Prisma
-- Uses IF NOT EXISTS because the table may already exist (created by V007 raw migration).

CREATE TABLE IF NOT EXISTS "task_assignees" (
    "task_id"     UUID        NOT NULL,
    "user_id"     UUID        NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_assignees_pkey"         PRIMARY KEY ("task_id", "user_id"),
    CONSTRAINT "task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id")  ON DELETE CASCADE,
    CONSTRAINT "task_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_task_assignees_task" ON "task_assignees"("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_assignees_user" ON "task_assignees"("user_id");
