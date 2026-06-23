-- migration 061: 本人確認2枚目（写真付き身分証）用カラム追加
-- 学生証(student_id_image_path)と同型。種類は記録しない（運用で表面のみ受領）。
-- バケットは既存 student-ids を流用（パスは {uid}/id_doc_{ts}.{ext}）。

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id_doc_image_path text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id_doc_submitted boolean NOT NULL DEFAULT false;
