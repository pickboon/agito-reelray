-- Phase 2: 社区分享 — community_posts 表

-- 社区作品表
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES generation_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id)
);

CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_public ON community_posts(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_community_posts_likes ON community_posts(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);

-- 点赞记录表
CREATE TABLE IF NOT EXISTS community_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_community_likes_user ON community_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_post ON community_likes(post_id);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

-- RLS: 任何人都可以查看公开作品
CREATE POLICY "Anyone can view public posts"
  ON community_posts FOR SELECT
  USING (is_public = true);

-- RLS: 用户只能管理自己的作品
CREATE POLICY "Users manage own posts"
  ON community_posts FOR ALL
  USING (auth.uid() = user_id);

-- RLS: 用户只能管理自己的点赞
CREATE POLICY "Users manage own likes"
  ON community_likes FOR ALL
  USING (auth.uid() = user_id);

-- RLS: 任何人都可以查看点赞记录
CREATE POLICY "Anyone can view likes"
  ON community_likes FOR SELECT
  USING (true);
