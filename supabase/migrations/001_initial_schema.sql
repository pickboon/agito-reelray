-- ReelRay Phase 1 初始 Schema
-- 7 张表：projects, characters, episodes, shots, generation_logs, subscriptions, credit_transactions

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================== 1. projects ====================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  template_id TEXT,
  target_languages TEXT[] DEFAULT '{en}',
  aspect_ratio TEXT DEFAULT '9:16',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

-- ==================== 2. characters ====================
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_characters_project_id ON characters(project_id);

-- ==================== 3. episodes ====================
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed')),
  duration_seconds INTEGER DEFAULT 120,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_episodes_project_id ON episodes(project_id);
CREATE UNIQUE INDEX idx_episodes_project_episode ON episodes(project_id, episode_number);

-- ==================== 4. shots ====================
CREATE TABLE shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  shot_number INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT DEFAULT 'happyhorse-1.1-t2v',
  mode TEXT DEFAULT 't2v' CHECK (mode IN ('t2v', 'r2v')),
  reference_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  aspect_ratio TEXT DEFAULT '9:16',
  duration INTEGER DEFAULT 5,
  seed INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'running', 'completed', 'failed')),
  task_id TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
  error_message TEXT,
  elapsed_seconds INTEGER,
  retry_count INTEGER DEFAULT 0,
  credits_consumed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shots_episode_id ON shots(episode_id);
CREATE INDEX idx_shots_status ON shots(status);
CREATE INDEX idx_shots_task_id ON shots(task_id);
CREATE UNIQUE INDEX idx_shots_episode_shot ON shots(episode_id, shot_number);

-- ==================== 5. generation_logs ====================
CREATE TABLE generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  mode TEXT NOT NULL,
  task_id TEXT,
  status TEXT NOT NULL,
  video_url TEXT,
  error_message TEXT,
  elapsed_seconds INTEGER,
  credits_consumed INTEGER DEFAULT 0,
  cost_estimate REAL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_generation_logs_shot_id ON generation_logs(shot_id);
CREATE INDEX idx_generation_logs_status ON generation_logs(status);

-- ==================== 6. subscriptions ====================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'studio')),
  credits_remaining INTEGER DEFAULT 0,
  credits_total INTEGER DEFAULT 0,
  monthly_spending_cap INTEGER DEFAULT 500000,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE UNIQUE INDEX idx_subscriptions_user_active ON subscriptions(user_id) WHERE status = 'active';

-- ==================== 7. credit_transactions ====================
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'consume', 'refund', 'bonus')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- ==================== RLS 策略 ====================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- 用户只能操作自己的数据
CREATE POLICY "Users manage own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own characters" ON characters FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = characters.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users manage own episodes" ON episodes FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = episodes.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users manage own shots" ON shots FOR ALL
  USING (EXISTS (SELECT 1 FROM episodes JOIN projects ON episodes.project_id = projects.id WHERE episodes.id = shots.episode_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users view own generation logs" ON generation_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM shots JOIN episodes ON shots.episode_id = episodes.id JOIN projects ON episodes.project_id = projects.id WHERE shots.id = generation_logs.shot_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
