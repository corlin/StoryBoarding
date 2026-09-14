CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  custom_settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  shot_id TEXT,
  job_type TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  input_revision TEXT NOT NULL DEFAULT '',
  reference_asset_version TEXT NOT NULL DEFAULT '',
  parameters TEXT NOT NULL DEFAULT '{}',
  external_task_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT NOT NULL DEFAULT '',
  result_url TEXT NOT NULL DEFAULT '',
  result_metadata TEXT NOT NULL DEFAULT '{}',
  cost_amount REAL DEFAULT 0,
  cost_currency TEXT NOT NULL DEFAULT '',
  cost_unit TEXT NOT NULL DEFAULT '',
  submitted_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

CREATE TABLE membership_plans (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  version INTEGER NOT NULL,
  price_cents_cny INTEGER NOT NULL CHECK (price_cents_cny >= 0),
  cycle_days INTEGER NOT NULL CHECK (cycle_days > 0),
  credits_per_cycle INTEGER NOT NULL CHECK (credits_per_cycle >= 0),
  credit_valid_days INTEGER NOT NULL CHECK (credit_valid_days > 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  effective_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE (code, version)
);

CREATE TABLE user_memberships (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES membership_plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  registered_by TEXT REFERENCES users(id),
  external_payment_reference TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE credit_accounts (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  available_credits INTEGER NOT NULL DEFAULT 0 CHECK (available_credits >= 0),
  held_credits INTEGER NOT NULL DEFAULT 0 CHECK (held_credits >= 0),
  lifetime_granted INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_granted >= 0),
  lifetime_spent INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE credit_lots (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('signup', 'membership', 'purchase', 'adjustment')),
  granted_credits INTEGER NOT NULL CHECK (granted_credits > 0),
  remaining_credits INTEGER NOT NULL CHECK (remaining_credits >= 0 AND remaining_credits <= granted_credits),
  held_credits INTEGER NOT NULL DEFAULT 0 CHECK (held_credits >= 0 AND held_credits <= granted_credits),
  membership_id TEXT REFERENCES user_memberships(id),
  source_reference TEXT NOT NULL DEFAULT '',
  granted_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE credit_ledger (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lot_id TEXT REFERENCES credit_lots(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('grant', 'hold', 'settle', 'release', 'expire', 'adjustment', 'reversal')),
  available_delta INTEGER NOT NULL,
  held_delta INTEGER NOT NULL,
  available_after INTEGER NOT NULL CHECK (available_after >= 0),
  held_after INTEGER NOT NULL CHECK (held_after >= 0),
  business_type TEXT NOT NULL DEFAULT '',
  business_id TEXT NOT NULL DEFAULT '',
  idempotency_key TEXT NOT NULL UNIQUE,
  actor_user_id TEXT REFERENCES users(id),
  reason TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE model_rates (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  operation TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('second', 'image', 'character', 'input_token', 'output_token', 'request')),
  credits_numerator INTEGER NOT NULL CHECK (credits_numerator >= 0),
  credits_denominator INTEGER NOT NULL DEFAULT 1 CHECK (credits_denominator > 0),
  minimum_credits INTEGER NOT NULL DEFAULT 0 CHECK (minimum_credits >= 0),
  provider_cost_microusd INTEGER NOT NULL DEFAULT 0 CHECK (provider_cost_microusd >= 0),
  provider_cost_unit_count INTEGER NOT NULL DEFAULT 1 CHECK (provider_cost_unit_count > 0),
  fx_microunits_cny_per_usd INTEGER NOT NULL DEFAULT 0 CHECK (fx_microunits_cny_per_usd >= 0),
  source_url TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
  version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE (provider, model, operation, version)
);

CREATE TABLE usage_charges (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  generation_job_id TEXT REFERENCES generation_jobs(id) ON DELETE SET NULL,
  rate_id TEXT REFERENCES model_rates(id),
  billing_mode TEXT NOT NULL CHECK (billing_mode IN ('platform', 'byok', 'shadow')),
  status TEXT NOT NULL CHECK (status IN ('quoted', 'held', 'submitted', 'processing', 'settled', 'released', 'reconciliation_required')),
  estimated_units INTEGER NOT NULL DEFAULT 0 CHECK (estimated_units >= 0),
  actual_units INTEGER CHECK (actual_units IS NULL OR actual_units >= 0),
  held_credits INTEGER NOT NULL DEFAULT 0 CHECK (held_credits >= 0),
  settled_credits INTEGER NOT NULL DEFAULT 0 CHECK (settled_credits >= 0),
  provider_cost_microusd INTEGER CHECK (provider_cost_microusd IS NULL OR provider_cost_microusd >= 0),
  quote_snapshot_json TEXT NOT NULL,
  usage_snapshot_json TEXT NOT NULL DEFAULT '{}',
  external_task_id TEXT NOT NULL DEFAULT '',
  failure_code TEXT NOT NULL DEFAULT '',
  reconciliation_note TEXT NOT NULL DEFAULT '',
  idempotency_key TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  submitted_at TEXT,
  settled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE (generation_job_id)
);

CREATE TABLE billing_audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before_json TEXT NOT NULL DEFAULT '{}',
  after_json TEXT NOT NULL DEFAULT '{}',
  reason TEXT NOT NULL,
  request_id TEXT NOT NULL,
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX idx_user_memberships_user_status ON user_memberships(user_id, status, ends_at);
CREATE INDEX idx_credit_lots_spend_order ON credit_lots(user_id, expires_at, granted_at);
CREATE INDEX idx_credit_ledger_user_created ON credit_ledger(user_id, created_at, id);
CREATE INDEX idx_model_rates_lookup ON model_rates(provider, model, operation, status, effective_from, effective_to);
CREATE INDEX idx_usage_charges_user_created ON usage_charges(user_id, created_at, id);
CREATE INDEX idx_usage_charges_status ON usage_charges(status, updated_at);
CREATE INDEX idx_billing_audit_actor_created ON billing_audit_logs(actor_user_id, created_at);

INSERT INTO membership_plans (
  id, code, name, version, price_cents_cny, cycle_days,
  credits_per_cycle, credit_valid_days, effective_at
) VALUES
  ('plan-free-v1', 'free', 'Free', 1, 0, 30, 200, 30, '2026-09-14T00:00:00Z'),
  ('plan-creator-v1', 'creator', 'Creator', 1, 3900, 30, 3000, 30, '2026-09-14T00:00:00Z'),
  ('plan-studio-v1', 'studio', 'Studio', 1, 12900, 30, 10000, 30, '2026-09-14T00:00:00Z');

INSERT INTO model_rates (
  id, provider, model, operation, unit, credits_numerator,
  credits_denominator, minimum_credits, provider_cost_microusd,
  provider_cost_unit_count, source_url, verified_at, effective_from, version
) VALUES
  ('rate-minimax-h3-768p-v1', 'minimax', 'MiniMax-H3', 'video_768p', 'second', 80, 1, 80, 80000, 1, 'https://platform.minimax.io/subscribe/token-plan?tab=api-enterprise', '2026-09-14T00:00:00Z', '2026-09-14T00:00:00Z', '2026-09-14-v1'),
  ('rate-minimax-hailuo02-768p6-v1', 'minimax', 'MiniMax-Hailuo-02', 'video_768p_6s', 'request', 280, 1, 280, 280000, 1, 'https://platform.minimax.io/docs/guides/pricing-paygo', '2026-09-14T00:00:00Z', '2026-09-14T00:00:00Z', '2026-09-14-v1'),
  ('rate-openrouter-seedream5pro-standard-v1', 'openrouter', 'bytedance-seed/seedream-5-0-pro', 'image_standard', 'image', 45, 1, 45, 45000, 1, 'https://openrouter.ai/bytedance-seed/seedream-5-0-pro?view=api', '2026-09-14T00:00:00Z', '2026-09-14T00:00:00Z', '2026-09-14-v1'),
  ('rate-openrouter-seedream5pro-high-v1', 'openrouter', 'bytedance-seed/seedream-5-0-pro', 'image_high_resolution', 'image', 90, 1, 90, 90000, 1, 'https://openrouter.ai/bytedance-seed/seedream-5-0-pro?view=api', '2026-09-14T00:00:00Z', '2026-09-14T00:00:00Z', '2026-09-14-v1');

INSERT INTO credit_accounts (
  user_id, available_credits, held_credits, lifetime_granted, lifetime_spent
)
SELECT id, 200, 0, 200, 0 FROM users;

INSERT INTO credit_lots (
  id, user_id, source, granted_credits, remaining_credits,
  source_reference, granted_at, expires_at
)
SELECT
  'migration:2026-09-14:signup:lot:' || id,
  id,
  'signup',
  200,
  200,
  'existing-user-bootstrap',
  CURRENT_TIMESTAMP,
  datetime('now', '+30 days')
FROM users;

INSERT INTO credit_ledger (
  id, user_id, lot_id, entry_type, available_delta, held_delta,
  available_after, held_after, business_type, business_id,
  idempotency_key, reason, metadata_json
)
SELECT
  'migration:2026-09-14:signup:ledger:' || id,
  id,
  'migration:2026-09-14:signup:lot:' || id,
  'grant',
  200,
  0,
  200,
  0,
  'migration',
  '2026-09-14-existing-users',
  'migration:2026-09-14:signup:' || id,
  'Existing user Free signup grant',
  '{"plan":"free","retroactive_charge":false}'
FROM users;
