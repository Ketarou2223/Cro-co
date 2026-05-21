-- 不足している外部キーインデックスを一括追加
CREATE INDEX IF NOT EXISTS idx_likes_liker_id ON likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id ON profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_id ON reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_hides_hider_id ON hides(hider_id);
CREATE INDEX IF NOT EXISTS idx_hides_hidden_id ON hides(hidden_id);

-- notifications テーブルが存在する場合のみ
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_from_user_id ON notifications(from_user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_match_id ON notifications(match_id);
  END IF;
END $$;

-- 複合インデックス: ブラウズ用（status + gender + interest_in）
CREATE INDEX IF NOT EXISTS idx_profiles_browse
  ON profiles(status, gender, interest_in)
  WHERE status = 'approved';
