-- 039_admin_warning_notification.sql
-- notifications テーブルの type CHECK 制約に 'admin_warning' を追加

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('match', 'like', 'view', 'message', 'admin_warning'));
