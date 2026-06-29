-- 修复 shots 表 status CHECK 约束
-- 原始约束只允许: pending, submitted, running, completed, failed
-- 实际需要支持: pending, submitted, processing, completed, failed, needs_review

ALTER TABLE shots DROP CONSTRAINT IF EXISTS shots_status_check;
ALTER TABLE shots ADD CONSTRAINT shots_status_check 
  CHECK (status IN ('pending', 'submitted', 'processing', 'running', 'completed', 'failed', 'needs_review'));
