-- Batch1: プロフ拡充16列 + 星座生成列。全列 additive・任意（null許容）。
-- 文字列値は CHECK で許可セットを固定（DBが値の意味を保証）。配列は text[]。

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS height_cm      smallint,
  ADD COLUMN IF NOT EXISTS body_type      text,
  ADD COLUMN IF NOT EXISTS blood_type     text,
  ADD COLUMN IF NOT EXISTS sibling_rank   text,
  ADD COLUMN IF NOT EXISTS languages      text[],
  ADD COLUMN IF NOT EXISTS campus         text,
  ADD COLUMN IF NOT EXISTS housing        text,
  ADD COLUMN IF NOT EXISTS commute_time   text,
  ADD COLUMN IF NOT EXISTS commute_means  text[],
  ADD COLUMN IF NOT EXISTS second_lang    text,
  ADD COLUMN IF NOT EXISTS relationship_goal text,
  ADD COLUMN IF NOT EXISTS marriage_intent   text,
  ADD COLUMN IF NOT EXISTS preferred_age_band text,
  ADD COLUMN IF NOT EXISTS drinking       text,
  ADD COLUMN IF NOT EXISTS smoking        text,
  ADD COLUMN IF NOT EXISTS mbti           text,
  ADD COLUMN IF NOT EXISTS love_type      text;

-- 星座: birth_date(date) から STORED 生成列。null は null。
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS zodiac text
  GENERATED ALWAYS AS (
    CASE
      WHEN birth_date IS NULL THEN NULL
      ELSE (
        CASE
          WHEN (EXTRACT(MONTH FROM birth_date)=3  AND EXTRACT(DAY FROM birth_date)>=21) OR (EXTRACT(MONTH FROM birth_date)=4  AND EXTRACT(DAY FROM birth_date)<=19) THEN 'aries'
          WHEN (EXTRACT(MONTH FROM birth_date)=4  AND EXTRACT(DAY FROM birth_date)>=20) OR (EXTRACT(MONTH FROM birth_date)=5  AND EXTRACT(DAY FROM birth_date)<=20) THEN 'taurus'
          WHEN (EXTRACT(MONTH FROM birth_date)=5  AND EXTRACT(DAY FROM birth_date)>=21) OR (EXTRACT(MONTH FROM birth_date)=6  AND EXTRACT(DAY FROM birth_date)<=21) THEN 'gemini'
          WHEN (EXTRACT(MONTH FROM birth_date)=6  AND EXTRACT(DAY FROM birth_date)>=22) OR (EXTRACT(MONTH FROM birth_date)=7  AND EXTRACT(DAY FROM birth_date)<=22) THEN 'cancer'
          WHEN (EXTRACT(MONTH FROM birth_date)=7  AND EXTRACT(DAY FROM birth_date)>=23) OR (EXTRACT(MONTH FROM birth_date)=8  AND EXTRACT(DAY FROM birth_date)<=22) THEN 'leo'
          WHEN (EXTRACT(MONTH FROM birth_date)=8  AND EXTRACT(DAY FROM birth_date)>=23) OR (EXTRACT(MONTH FROM birth_date)=9  AND EXTRACT(DAY FROM birth_date)<=22) THEN 'virgo'
          WHEN (EXTRACT(MONTH FROM birth_date)=9  AND EXTRACT(DAY FROM birth_date)>=23) OR (EXTRACT(MONTH FROM birth_date)=10 AND EXTRACT(DAY FROM birth_date)<=23) THEN 'libra'
          WHEN (EXTRACT(MONTH FROM birth_date)=10 AND EXTRACT(DAY FROM birth_date)>=24) OR (EXTRACT(MONTH FROM birth_date)=11 AND EXTRACT(DAY FROM birth_date)<=22) THEN 'scorpio'
          WHEN (EXTRACT(MONTH FROM birth_date)=11 AND EXTRACT(DAY FROM birth_date)>=23) OR (EXTRACT(MONTH FROM birth_date)=12 AND EXTRACT(DAY FROM birth_date)<=21) THEN 'sagittarius'
          WHEN (EXTRACT(MONTH FROM birth_date)=12 AND EXTRACT(DAY FROM birth_date)>=22) OR (EXTRACT(MONTH FROM birth_date)=1  AND EXTRACT(DAY FROM birth_date)<=19) THEN 'capricorn'
          WHEN (EXTRACT(MONTH FROM birth_date)=1  AND EXTRACT(DAY FROM birth_date)>=20) OR (EXTRACT(MONTH FROM birth_date)=2  AND EXTRACT(DAY FROM birth_date)<=18) THEN 'aquarius'
          ELSE 'pisces'
        END
      )
    END
  ) STORED;

-- 値ドメインを固定（任意・null許容。許可セット外は拒否）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_body_type_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_body_type_chk
      CHECK (body_type IS NULL OR body_type IN ('slim','average','muscular','glamorous','chubby'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_blood_type_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_blood_type_chk
      CHECK (blood_type IS NULL OR blood_type IN ('A','B','O','AB'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_sibling_rank_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_sibling_rank_chk
      CHECK (sibling_rank IS NULL OR sibling_rank IN ('only','eldest_son','eldest_daughter','second_son','second_daughter','third_son','third_daughter','later'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_campus_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_campus_chk
      CHECK (campus IS NULL OR campus IN ('toyonaka','suita','minoh'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_housing_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_housing_chk
      CHECK (housing IS NULL OR housing IN ('alone','family','dorm','share'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_commute_time_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_commute_time_chk
      CHECK (commute_time IS NULL OR commute_time IN ('le30','le60','le90','le120','le150','gt150'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_second_lang_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_second_lang_chk
      CHECK (second_lang IS NULL OR second_lang IN ('de','fr','zh','es','ru','ko','it','other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_relationship_goal_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_relationship_goal_chk
      CHECK (relationship_goal IS NULL OR relationship_goal IN ('marriage','partner','friend_first'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_marriage_intent_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_marriage_intent_chk
      CHECK (marriage_intent IS NULL OR marriage_intent IN ('someday','not_now','unsure'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_preferred_age_band_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_preferred_age_band_chk
      CHECK (preferred_age_band IS NULL OR preferred_age_band IN ('older','younger','same','any'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_drinking_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_drinking_chk
      CHECK (drinking IS NULL OR drinking IN ('often','sometimes','no'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_smoking_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_smoking_chk
      CHECK (smoking IS NULL OR smoking IN ('no','yes','vape','not_around_others'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_height_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_height_chk
      CHECK (height_cm IS NULL OR (height_cm BETWEEN 140 AND 190));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_mbti_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_mbti_chk
      CHECK (mbti IS NULL OR mbti ~ '^(INTJ|INTP|ENTJ|ENTP|INFJ|INFP|ENFJ|ENFP|ISTJ|ISFJ|ESTJ|ESFJ|ISTP|ISFP|ESTP|ESFP)$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_love_type_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_love_type_chk
      CHECK (love_type IS NULL OR love_type ~ '^[LF][CA][RP][OE]$');
  END IF;
END $$;
