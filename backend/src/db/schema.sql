-- Westone backend schema
-- idempotent: safe to run on every boot

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(32) UNIQUE NOT NULL,
  discord_username VARCHAR(64) NOT NULL,
  discord_global_name VARCHAR(64),
  discord_avatar_hash VARCHAR(64),
  role VARCHAR(16) NOT NULL DEFAULT 'USER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  page_id INT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  question VARCHAR(500) NOT NULL,
  description TEXT,
  placeholder VARCHAR(255),
  type VARCHAR(20) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  options JSONB,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_questions_page_id ON questions(page_id);

CREATE SEQUENCE IF NOT EXISTS application_number_seq START 1;

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  application_number VARCHAR(20) UNIQUE NOT NULL,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

CREATE TABLE IF NOT EXISTS application_answers (
  id SERIAL PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  question_id INT REFERENCES questions(id) ON DELETE SET NULL,
  question_snapshot JSONB NOT NULL,
  page_title VARCHAR(160),
  answer TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_answers_application_id ON application_answers(application_id);

CREATE TABLE IF NOT EXISTS application_notes (
  id SERIAL PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  admin_id INT REFERENCES users(id) ON DELETE SET NULL,
  admin_username VARCHAR(64) NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notes_application_id ON application_notes(application_id);

CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(120) NOT NULL,
  image_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  applications_open BOOLEAN NOT NULL DEFAULT true,
  allow_multiple_applications BOOLEAN NOT NULL DEFAULT false,
  closed_message TEXT DEFAULT 'التقديم غير متاح حالياً',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT settings_single_row CHECK (id = 1)
);
