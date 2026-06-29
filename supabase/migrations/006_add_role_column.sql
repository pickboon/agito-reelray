-- 为 characters 表添加 role 列（角色定位：主角/配角/反派等）
ALTER TABLE characters ADD COLUMN IF NOT EXISTS role TEXT DEFAULT '';
