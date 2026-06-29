-- Phase 1: Rate Limit 持久化 — DB-backed 限流表
-- 替代内存 Map，支持多实例部署

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- 自动清理过期记录（每次查询时清理）
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_ms INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
  v_window_interval INTERVAL := make_interval(secs => p_window_ms / 1000.0);
BEGIN
  -- 尝试获取现有记录
  SELECT count, window_start INTO v_count, v_window_start
  FROM rate_limits WHERE key = p_key;

  IF v_count IS NULL THEN
    -- 新 key，插入记录
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (p_key, 1, v_now)
    ON CONFLICT (key) DO UPDATE SET count = 1, window_start = v_now;
    RETURN TRUE;
  END IF;

  -- 窗口已过期，重置
  IF v_now > v_window_start + v_window_interval THEN
    UPDATE rate_limits SET count = 1, window_start = v_now WHERE key = p_key;
    RETURN TRUE;
  END IF;

  -- 窗口内检查计数
  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  -- 递增计数
  UPDATE rate_limits SET count = count + 1 WHERE key = p_key;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 定期清理旧记录（可选，通过 pg_cron 或手动）
-- DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour';
