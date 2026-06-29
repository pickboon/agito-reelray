-- Phase 1: 视频生成工作台

CREATE TABLE IF NOT EXISTS generation_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  mode TEXT NOT NULL,
  reference_image_url TEXT,
  aspect_ratio TEXT NOT NULL,
  duration INTEGER NOT NULL,
  seed INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  task_id TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  error_message TEXT,
  credits_consumed INTEGER DEFAULT 0,
  elapsed_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generation_tasks_user_id ON generation_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_user_created ON generation_tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_status ON generation_tasks(status);

ALTER TABLE generation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON generation_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON generation_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON generation_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all tasks"
  ON generation_tasks FOR ALL
  USING (true);
