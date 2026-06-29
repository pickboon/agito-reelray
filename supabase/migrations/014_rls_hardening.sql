-- Phase 5: RLS 补全 — S-10

-- generation_tasks RLS
ALTER TABLE generation_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own generation tasks" ON generation_tasks;
CREATE POLICY "Users view own generation tasks"
  ON generation_tasks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own generation tasks" ON generation_tasks;
CREATE POLICY "Users manage own generation tasks"
  ON generation_tasks FOR ALL
  USING (auth.uid() = user_id);
