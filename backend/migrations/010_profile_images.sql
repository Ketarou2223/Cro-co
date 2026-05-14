-- 冪等性のためDROPから始める（関連トリガーも含めてCASCADE）
DROP TABLE IF EXISTS public.profile_images CASCADE;

CREATE TABLE public.profile_images (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_path   text        NOT NULL,
    display_order int        NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, image_path)
);

CREATE INDEX idx_profile_images_user_id
    ON public.profile_images(user_id, display_order);

ALTER TABLE public.profile_images ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.profile_images TO service_role;

CREATE POLICY "service_role full access on profile_images"
    ON public.profile_images
    TO service_role
    USING (true)
    WITH CHECK (true);
