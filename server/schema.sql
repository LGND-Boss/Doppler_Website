CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Phase 1: marketing site + content admin only.
-- (Orders / seats / customers / points tables were removed for this phase.)

CREATE TABLE IF NOT EXISTS site_content (
  id   integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);
INSERT INTO site_content (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Published menu document (single row), edited from the admin Menu tab and
-- served to the public menu page via /api/menu. Same shape as the editor.
CREATE TABLE IF NOT EXISTS site_menu (
  id   integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);
INSERT INTO site_menu (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS staff_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'admin',
  created_at    timestamptz NOT NULL DEFAULT now()
);
