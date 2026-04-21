-- =============================================================================
-- Rxflow — V004: Notification preferences per user
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_notification_prefs (
  user_id      UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mentions     BOOLEAN     NOT NULL DEFAULT true,
  assignments  BOOLEAN     NOT NULL DEFAULT true,
  comments     BOOLEAN     NOT NULL DEFAULT false,
  updates      BOOLEAN     NOT NULL DEFAULT false,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
