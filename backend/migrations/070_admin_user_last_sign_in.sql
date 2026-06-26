-- 070_admin_user_last_sign_in.sql
-- admin ユーザー一覧に last_sign_in_at（auth.users）を JOIN するビューを追加。
-- service_role のみ SELECT 可。RLS なし（ビューは RLS 対象外のため GRANT で制御）。
CREATE OR REPLACE VIEW public.admin_user_list_v AS
SELECT
  p.id,
  p.email,
  p.name,
  p.status,
  p.gender,
  p.year,
  p.faculty,
  p.department,
  p.profile_image_path,
  p.last_seen_at,
  p.created_at,
  p.reviewed_at,
  p.banned_at,
  p.privacy_purged_at,
  u.last_sign_in_at
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id;

GRANT SELECT ON public.admin_user_list_v TO service_role;
