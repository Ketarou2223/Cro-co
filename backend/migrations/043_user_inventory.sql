-- 043_user_inventory.sql
-- 目的: 消費型アイテム在庫テーブル（まず like_stock）。
--   ③ 男性のいいね送信在庫（初期10・ログイン+2・安全弁10000）を保持。
--   将来の課金アイテムは item_type を CHECK で広げて拡張（042 と同パターン）。
-- 設計: 案X（item_type 縦持ち）・profiles 参照・service_role only RLS。
-- 冪等: CREATE IF NOT EXISTS + ON CONFLICT。再実行可。

CREATE TABLE IF NOT EXISTS public.user_inventory (
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type       text NOT NULL CHECK (item_type IN ('like_stock')),
  quantity        int  NOT NULL DEFAULT 0 CHECK (quantity >= 0 AND quantity <= 10000),
  last_grant_date date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_type)
);

CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON public.user_inventory(user_id);

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_inventory TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_inventory'
      AND policyname = 'service_role full access'
  ) THEN
    CREATE POLICY "service_role full access" ON public.user_inventory
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_updated_at ON public.user_inventory;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- one-shot: 既存の男性 approved ユーザーに like_stock=10 初期付与（本番移行も兼ねる）
INSERT INTO public.user_inventory (user_id, item_type, quantity, last_grant_date)
SELECT id, 'like_stock', 10, (now() AT TIME ZONE 'Asia/Tokyo')::date
FROM public.profiles
WHERE gender = 'male' AND status = 'approved'
ON CONFLICT (user_id, item_type) DO NOTHING;
