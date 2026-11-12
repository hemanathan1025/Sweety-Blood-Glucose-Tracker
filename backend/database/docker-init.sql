-- Initialize only a new local Docker database with the schema the app expects.
-- This file is not used against an existing database or deployment.
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE health_records (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,
  reading_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT health_records_time_slot_check CHECK (time_slot IN ('Morning', 'After breakfast', 'After lunch', 'After dinner')),
  CONSTRAINT unique_user_daily_slot UNIQUE (user_id, reading_date, time_slot)
);
