-- ReelRay Phase 2b 迁移：锚点图 + 一致性 + 多角色
-- 注意：此文件仅供文档参考，实际部署时需手动执行或通过 Supabase Dashboard 执行

-- 2b.1: 角色锚点图字段
ALTER TABLE characters ADD COLUMN IF NOT EXISTS anchor_image_url TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS anchor_status TEXT DEFAULT 'pending';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2b.2: 镜头一致性评分字段
ALTER TABLE shots ADD COLUMN IF NOT EXISTS consistency_score REAL;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS consistency_checks JSONB;

-- 2b.3: 多角色参考 ID 数组
ALTER TABLE shots ADD COLUMN IF NOT EXISTS reference_character_ids UUID[];
