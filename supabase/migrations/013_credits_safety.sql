-- Phase 4: Credits 原子操作 + 点赞原子更新

-- L-01/L-02: 防止负余额 CHECK 约束
-- 注意：先删除旧的 CHECK 约束（如果存在）再添加新的
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS chk_credits_non_negative;
ALTER TABLE subscriptions ADD CONSTRAINT chk_credits_non_negative 
  CHECK (credits_remaining >= 0);

-- 原子扣款 RPC（L-01）
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID, p_amount INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE subscriptions 
  SET credits_remaining = credits_remaining - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id AND status = 'active' AND credits_remaining >= p_amount
  RETURNING credits_remaining INTO v_new_balance;
  
  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- 原子退款 RPC（L-02）
CREATE OR REPLACE FUNCTION refund_credits(
  p_user_id UUID, p_amount INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE subscriptions 
  SET credits_remaining = credits_remaining + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id AND status = 'active'
  RETURNING credits_remaining INTO v_new_balance;
  
  RETURN COALESCE(v_new_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- F-05: 点赞原子递增/递减 RPC
CREATE OR REPLACE FUNCTION increment_likes(
  p_post_id UUID, p_delta INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  UPDATE community_posts 
  SET likes_count = GREATEST(0, likes_count + p_delta)
  WHERE id = p_post_id
  RETURNING likes_count INTO v_new_count;
  
  RETURN COALESCE(v_new_count, 0);
END;
$$ LANGUAGE plpgsql;

-- L-08: 模板 use_count 原子递增
CREATE OR REPLACE FUNCTION increment_use_count(
  p_template_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE user_templates 
  SET use_count = use_count + 1
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql;
