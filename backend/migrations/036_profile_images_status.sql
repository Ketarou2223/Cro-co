-- profile_images: status カラム追加（写真公開前審査機能）
-- 既存写真は approved として移行（リリース前に公開済みのため）
ALTER TABLE public.profile_images
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
        CHECK (status IN ('pending', 'approved', 'rejected'));

-- 今後の新規アップロードはデフォルト pending（アプリコードでも明示的に指定）
ALTER TABLE public.profile_images
    ALTER COLUMN status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_profile_images_user_status
    ON public.profile_images(user_id, status);
