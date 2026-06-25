-- backend/migrations/066_daily_questions.sql
-- 日替わり二択。グローバル日替わり（全員同じ問題・JST日境界・決定的ローテ）。
-- その日の問題 = is_active 昇順 display_order の (JST通算日数 % アクティブ問題数) 番目。

-- 1. 問題マスタ
CREATE TABLE IF NOT EXISTS public.daily_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_order int  NOT NULL UNIQUE,
  body          text NOT NULL,
  options       jsonb NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- options は [{key,label}] が 2〜4 個
  CONSTRAINT daily_questions_options_len
    CHECK (jsonb_typeof(options) = 'array'
           AND jsonb_array_length(options) BETWEEN 2 AND 4)
);

-- 2. 回答（当日変更不可＝INSERT only・1日1回）
CREATE TABLE IF NOT EXISTS public.daily_answers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.daily_questions(id) ON DELETE CASCADE,
  choice      text NOT NULL,
  answer_date date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_answers_one_per_day UNIQUE (user_id, answer_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_answers_user      ON public.daily_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_answers_question  ON public.daily_answers(question_id);

-- 3. RLS（service_role 経由のみ＝既定 fail-close）
ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_answers  ENABLE ROW LEVEL SECURITY;
-- ポリシー無し＝anon/authenticated は不可。backend(service_role)のみ。

-- 4. seed（3問・display_order 連番）
INSERT INTO public.daily_questions (display_order, body, options) VALUES
  (1, '朝型？夜型？', '[{"key":"a","label":"朝型"},{"key":"b","label":"夜型"}]'),
  (2, '旅行するなら？', '[{"key":"a","label":"海"},{"key":"b","label":"山"},{"key":"c","label":"街"}]'),
  (3, '勉強するなら？', '[{"key":"a","label":"家"},{"key":"b","label":"カフェ"},{"key":"c","label":"図書館"}]')
ON CONFLICT (display_order) DO NOTHING;