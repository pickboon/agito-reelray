-- Phase 2: 模板保存/分享 — user_templates 表

-- 用户模板表
CREATE TABLE IF NOT EXISTS user_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  model_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  duration INTEGER NOT NULL,
  seed INTEGER,
  is_public BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_templates_user ON user_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_templates_public ON user_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_user_templates_uses ON user_templates(use_count DESC);

ALTER TABLE user_templates ENABLE ROW LEVEL SECURITY;

-- RLS: 任何人都可以查看公开模板
CREATE POLICY "Anyone can view public templates"
  ON user_templates FOR SELECT
  USING (is_public = true);

-- RLS: 用户只能管理自己的模板
CREATE POLICY "Users manage own templates"
  ON user_templates FOR ALL
  USING (auth.uid() = user_id);
