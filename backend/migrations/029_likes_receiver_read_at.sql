-- 029: いいね受信既読管理カラム追加
ALTER TABLE likes ADD COLUMN IF NOT EXISTS receiver_read_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_likes_receiver_read ON likes(liked_id, receiver_read_at);
