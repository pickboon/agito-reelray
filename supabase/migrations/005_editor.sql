-- Phase 3: 编辑器 — 时间轴状态持久化 + 导出任务

-- 时间轴状态持久化（每个 episode 最多一条记录）
CREATE TABLE IF NOT EXISTS editor_timelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}',
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(episode_id)
);

CREATE INDEX IF NOT EXISTS idx_editor_timelines_episode ON editor_timelines(episode_id);
CREATE INDEX IF NOT EXISTS idx_editor_timelines_user ON editor_timelines(user_id);

ALTER TABLE editor_timelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own timelines"
  ON editor_timelines FOR ALL
  USING (auth.uid() = user_id);

-- 导出任务
CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timeline_id UUID NOT NULL REFERENCES editor_timelines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  progress INTEGER DEFAULT 0,
  output_url TEXT,
  credits_consumed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_user ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_timeline ON export_jobs(timeline_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);

ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own export jobs"
  ON export_jobs FOR ALL
  USING (auth.uid() = user_id);
