-- 069_like_economy_bonus_flags.sql
-- いいね経済: 男性ヘテロの一回性ボーナス(+5@80% / +10@100%)の付与済みフラグ。
-- 跨ぎ（閾値を下回って再度上回る）で再付与しないための永続フラグ。same_sex/female は未使用。
ALTER TABLE public.user_inventory
  ADD COLUMN IF NOT EXISTS bonus_80_granted  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bonus_100_granted boolean NOT NULL DEFAULT false;
