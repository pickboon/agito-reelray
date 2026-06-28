-- 003_checkout_hardening.sql — Stripe webhook 幂等去重
-- 防止同一 event.id 被重复处理，避免 credits 多发

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at
  ON webhook_events(processed_at DESC);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
-- 仅 service_role 可写入（默认策略拒绝所有非 service_role 访问）
