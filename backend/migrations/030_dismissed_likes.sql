-- 030: マッチタブからの「今はいい」永続化
ALTER TABLE likes ADD COLUMN IF NOT EXISTS dismissed_from_match boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_likes_dismissed ON likes(liked_id, dismissed_from_match);
