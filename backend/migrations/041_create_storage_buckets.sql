-- 041_create_storage_buckets.sql
-- 目的: profile-images / student-ids バケットを作成する（prod と完全同設定）。
--       dev には未作成だったため、migration ファイルだけで dev/prod を再現可能にする。
-- 設定: いずれも Private(public=false) / 5MB(5242880) / image/jpeg・image/png のみ。
--       avif_autodetection / owner / owner_id / type は prod の値（既定）に一致。
-- 安全性: storage.buckets への直 INSERT は Supabase 公式が推奨する方法
--         （Create a bucket の SQL タブ / self-hosting 移行ガイドの ON CONFLICT パターン）。
-- 冪等性: ON CONFLICT (id) DO NOTHING で再実行してもエラーにならない（既存は変更しない）。

insert into storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-images', 'profile-images', false, 5242880,
   array['image/jpeg', 'image/png']),
  ('student-ids', 'student-ids', false, 5242880,
   array['image/jpeg', 'image/png'])
on conflict (id) do nothing;
