--
-- PostgreSQL database dump
--

\restrict N0qzMO0xKgCHUwYAEGqWHssUZNLIzZtMjKfzb7FHzomL2MDm1eXBXNYayB06hGo

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: detect_match(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.detect_match() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- 相手(NEW.liked_id)から自分(NEW.liker_id)へのいいねが存在するか確認
    IF EXISTS (
        SELECT 1 FROM public.likes
        WHERE liker_id = NEW.liked_id AND liked_id = NEW.liker_id
    ) THEN
        -- user_a_id < user_b_id になるよう LEAST/GREATEST で正規化して INSERT
        INSERT INTO public.matches (user_a_id, user_b_id)
        VALUES (
            LEAST(NEW.liker_id, NEW.liked_id),
            GREATEST(NEW.liker_id, NEW.liked_id)
        )
        ON CONFLICT (user_a_id, user_b_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: enforce_university_email_domain(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_university_email_domain() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- 1) ローカルパートに '+' を含むプラスエイリアスを拒否
  -- 2) ドメインが ecs.osaka-u.ac.jp と完全一致すること（後方一致 ILIKE から厳格化）
  IF NEW.email IS NULL
     OR lower(NEW.email) LIKE '%+%@%'
     OR split_part(lower(NEW.email), '@', 2) != 'ecs.osaka-u.ac.jp'
  THEN
    RAISE EXCEPTION '大阪大学のメールアドレス（@ecs.osaka-u.ac.jp）でのみ登録できます'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: should_count_quota(uuid, uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.should_count_quota(p_liker_id uuid, p_liked_id uuid, p_via_footprint boolean) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  liker_gender text;
  liker_interest text;
  liked_gender text;
  liked_interest text;
  footprint_exists boolean;
BEGIN
  SELECT gender, interest_in INTO liker_gender, liker_interest
    FROM profiles WHERE id = p_liker_id;
  SELECT gender, interest_in INTO liked_gender, liked_interest
    FROM profiles WHERE id = p_liked_id;

  -- 男女マッチペアでない場合はカウント外
  IF NOT (liker_gender = 'male' AND liked_gender = 'female'
         AND liker_interest = 'female' AND liked_interest = 'male') THEN
    RETURN false;
  END IF;

  -- 足跡経由でカウント外
  IF p_via_footprint THEN
    SELECT EXISTS(
      SELECT 1 FROM profile_views
      WHERE viewer_id = p_liker_id AND viewed_id = p_liked_id
    ) INTO footprint_exists;
    IF footprint_exists THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;


--
-- Name: snapshot_daily_metrics(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.snapshot_daily_metrics(target date) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _now timestamptz := now();
BEGIN
  INSERT INTO public.daily_metrics (snapshot_date, metric_key, value)
  VALUES
    -- ── 累計（スナップ時点 as-of） ────────────────────────────────────
    -- users_total: 削除済みを除く全ユーザー数
    (target, 'users_total',
      (SELECT COUNT(*) FROM profiles
       WHERE status NOT IN ('deleted'))),
    (target, 'users_approved',
      (SELECT COUNT(*) FROM profiles WHERE status = 'approved')),
    (target, 'users_pending',
      (SELECT COUNT(*) FROM profiles WHERE status = 'pending_review')),
    -- users_rejected: 審査で不合格（identity_verified=false のまま rejected）
    (target, 'users_rejected',
      (SELECT COUNT(*) FROM profiles
       WHERE status = 'rejected' AND identity_verified IS NOT TRUE)),
    -- users_suspended: 承認後に管理者が suspend（identity_verified=true で rejected）
    (target, 'users_suspended',
      (SELECT COUNT(*) FROM profiles
       WHERE status = 'rejected' AND identity_verified IS TRUE)),
    (target, 'users_banned',
      (SELECT COUNT(*) FROM profiles WHERE status = 'banned')),
    (target, 'users_approved_male',
      (SELECT COUNT(*) FROM profiles
       WHERE status = 'approved' AND gender = 'male')),
    (target, 'users_approved_female',
      (SELECT COUNT(*) FROM profiles
       WHERE status = 'approved' AND gender = 'female')),
    (target, 'matches_total',
      (SELECT COUNT(*) FROM matches)),
    (target, 'messages_total',
      (SELECT COUNT(*) FROM messages)),
    (target, 'likes_total',
      (SELECT COUNT(*) FROM likes)),
    (target, 'reports_pending',
      (SELECT COUNT(*) FROM reports WHERE status = 'pending')),
    (target, 'inquiries_unread',
      (SELECT COUNT(*) FROM inquiries WHERE status = 'unread')),
    (target, 'photos_pending',
      (SELECT COUNT(*) FROM profile_images WHERE status = 'pending')),
    -- ── その日の増分（JST 暦日・created_at / reviewed_at 基準） ─────────
    (target, 'signups_new',
      (SELECT COUNT(*) FROM profiles
       WHERE (created_at AT TIME ZONE 'Asia/Tokyo')::date = target)),
    -- approvals_new: identity_verified=true が確定した日の件数
    (target, 'approvals_new',
      (SELECT COUNT(*) FROM profiles
       WHERE identity_verified IS TRUE
         AND (reviewed_at AT TIME ZONE 'Asia/Tokyo')::date = target)),
    (target, 'matches_new',
      (SELECT COUNT(*) FROM matches
       WHERE (created_at AT TIME ZONE 'Asia/Tokyo')::date = target)),
    (target, 'messages_new',
      (SELECT COUNT(*) FROM messages
       WHERE (created_at AT TIME ZONE 'Asia/Tokyo')::date = target)),
    (target, 'likes_new',
      (SELECT COUNT(*) FROM likes
       WHERE (created_at AT TIME ZONE 'Asia/Tokyo')::date = target)),
    -- ── アクティブ（スナップ時点 rolling・last_seen_at 由来・approved のみ） ──
    (target, 'active_24h',
      (SELECT COUNT(*) FROM profiles
       WHERE status = 'approved'
         AND last_seen_at >= _now - INTERVAL '24 hours')),
    (target, 'active_7d',
      (SELECT COUNT(*) FROM profiles
       WHERE status = 'approved'
         AND last_seen_at >= _now - INTERVAL '7 days')),
    (target, 'active_30d',
      (SELECT COUNT(*) FROM profiles
       WHERE status = 'approved'
         AND last_seen_at >= _now - INTERVAL '30 days'))
  ON CONFLICT (snapshot_date, metric_key) DO UPDATE
    SET value = EXCLUDED.value;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    admin_email text NOT NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: announcement_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcement_reads (
    announcement_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE announcement_reads; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.announcement_reads IS 'お知らせ既読管理。announcement_id ON DELETE CASCADE。user退会はFKなし（profiles ソフトデリートのため）。';


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    target_all boolean DEFAULT false NOT NULL,
    target_faculties text[] DEFAULT '{}'::text[] NOT NULL,
    target_grades integer[] DEFAULT '{}'::integer[] NOT NULL,
    target_genders text[] DEFAULT '{}'::text[] NOT NULL,
    created_by uuid,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE announcements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.announcements IS '運営お知らせ。セグメント配信（target_all/faculties/grades/genders）。is_deleted=true で論理削除。';


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocks (
    blocker_id uuid NOT NULL,
    blocked_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT blocks_no_self CHECK ((blocker_id <> blocked_id))
);


--
-- Name: daily_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_metrics (
    snapshot_date date NOT NULL,
    metric_key text NOT NULL,
    value bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hides (
    hider_id uuid NOT NULL,
    hidden_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hides_no_self CHECK ((hider_id <> hidden_id))
);


--
-- Name: identity_block_hashes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_block_hashes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    retain_until timestamp with time zone,
    is_permanent boolean DEFAULT false NOT NULL,
    reason text,
    source_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email_hash text
);


--
-- Name: TABLE identity_block_hashes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.identity_block_hashes IS '再登録ブロック用ハッシュ永続保持テーブル。auth.users CASCADE の影響を受けないよう FK を張らない。';


--
-- Name: COLUMN identity_block_hashes.retain_until; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_block_hashes.retain_until IS 'NULL=在籍中(無期限ブロック) / 値あり=期限切れで物理削除対象';


--
-- Name: COLUMN identity_block_hashes.is_permanent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_block_hashes.is_permanent IS 'BAN/規約違反者=true: purge 対象外・永久保持';


--
-- Name: COLUMN identity_block_hashes.source_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_block_hashes.source_user_id IS '元ユーザーの profiles.id 参照用。FK なし（退会で消えないため）';


--
-- Name: COLUMN identity_block_hashes.email_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_block_hashes.email_hash IS 'メールアドレスの PRIVACY_HASH_SALT 付き SHA-256。照合キー（Phase A 以降）。normalize_email(strip+lower) 後にハッシュ化。';


--
-- Name: inquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'unread'::text NOT NULL,
    admin_reply text,
    admin_note text,
    replied_at timestamp with time zone,
    replied_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inquiries_body_check CHECK ((char_length(body) <= 2000)),
    CONSTRAINT inquiries_category_check CHECK ((category = ANY (ARRAY['bug'::text, 'feature'::text, 'account'::text, 'report'::text, 'other'::text]))),
    CONSTRAINT inquiries_status_check CHECK ((status = ANY (ARRAY['unread'::text, 'read'::text, 'replied'::text, 'closed'::text]))),
    CONSTRAINT inquiries_subject_check CHECK ((char_length(subject) <= 100))
);


--
-- Name: like_quota; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.like_quota (
    user_id uuid NOT NULL,
    date date NOT NULL,
    opens_at timestamp with time zone NOT NULL,
    used_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.likes (
    liker_id uuid NOT NULL,
    liked_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    via_footprint boolean DEFAULT false NOT NULL,
    counted_to_quota boolean DEFAULT false NOT NULL,
    receiver_read_at timestamp with time zone,
    dismissed_from_match boolean DEFAULT false NOT NULL,
    CONSTRAINT likes_check CHECK ((liker_id <> liked_id))
);

ALTER TABLE ONLY public.likes FORCE ROW LEVEL SECURITY;


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    user_a_id uuid NOT NULL,
    user_b_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    CONSTRAINT matches_check CHECK ((user_a_id < user_b_id))
);

ALTER TABLE ONLY public.matches FORCE ROW LEVEL SECURITY;


--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_reactions (
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction text DEFAULT 'heart'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_reactions_reaction_check CHECK ((reaction = 'heart'::text))
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    reply_to_id uuid,
    CONSTRAINT messages_content_check CHECK (((char_length(content) >= 1) AND (char_length(content) <= 1000)))
);

ALTER TABLE ONLY public.messages FORCE ROW LEVEL SECURITY;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    from_user_id uuid,
    match_id uuid,
    message_preview text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['match'::text, 'like'::text, 'view'::text, 'message'::text, 'admin_warning'::text])))
);


--
-- Name: profile_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    image_path text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT profile_images_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: profile_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    viewer_id uuid NOT NULL,
    viewed_id uuid NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text,
    year integer,
    faculty text,
    bio text,
    status text DEFAULT 'pending_review'::text NOT NULL,
    student_id_image_path text,
    submitted_at timestamp with time zone,
    rejection_reason text,
    reviewed_at timestamp with time zone,
    profile_image_path text,
    interests text[] DEFAULT '{}'::text[],
    club text,
    hometown text,
    last_seen_at timestamp with time zone,
    show_online_status boolean DEFAULT true NOT NULL,
    status_message text,
    status_message_updated_at timestamp with time zone,
    department text,
    clubs text[] DEFAULT '{}'::text[],
    admission_year integer,
    faculty_hide_level text DEFAULT 'none'::text NOT NULL,
    hidden_clubs text[] DEFAULT '{}'::text[],
    identity_verified boolean DEFAULT false NOT NULL,
    gender text,
    interest_in text,
    profile_completed boolean DEFAULT false NOT NULL,
    profile_setup_completed boolean DEFAULT false NOT NULL,
    student_id_submitted boolean DEFAULT false NOT NULL,
    onboarding_completed boolean DEFAULT false NOT NULL,
    birth_date date,
    age integer,
    privacy_purged_at timestamp with time zone,
    banned_at timestamp with time zone,
    banned_by uuid,
    ban_reason text,
    deleted_at timestamp with time zone,
    CONSTRAINT profiles_bio_check CHECK (((bio IS NULL) OR (char_length(bio) <= 500))),
    CONSTRAINT profiles_faculty_hide_level_check CHECK ((faculty_hide_level = ANY (ARRAY['none'::text, 'faculty'::text, 'department'::text]))),
    CONSTRAINT profiles_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text]))),
    CONSTRAINT profiles_interest_in_check CHECK ((interest_in = ANY (ARRAY['male'::text, 'female'::text]))),
    CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['pending_review'::text, 'approved'::text, 'rejected'::text, 'banned'::text, 'deleted'::text]))),
    CONSTRAINT profiles_status_message_check CHECK ((char_length(status_message) <= 30)),
    CONSTRAINT profiles_year_check CHECK (((year IS NULL) OR ((year >= 1) AND (year <= 11))))
);

ALTER TABLE ONLY public.profiles FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN profiles.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.status IS 'pending_review: 審査待ち, approved: 承認済み, rejected: 却下';


--
-- Name: COLUMN profiles.student_id_image_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.student_id_image_path IS 'Supabase Storage student-ids バケットのオブジェクトパス';


--
-- Name: COLUMN profiles.submitted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.submitted_at IS '学生証提出日時';


--
-- Name: COLUMN profiles.age; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.age IS '誕生日から計算した年齢（birth_date削除後の代替）';


--
-- Name: COLUMN profiles.privacy_purged_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.privacy_purged_at IS '個人情報削除実行日時';


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid NOT NULL,
    reported_id uuid NOT NULL,
    reason text NOT NULL,
    detail text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    resolution_note text,
    action_taken text,
    CONSTRAINT reports_action_taken_check CHECK (((action_taken IS NULL) OR (action_taken = ANY (ARRAY['warning'::text, 'suspend'::text, 'ban'::text, 'none'::text])))),
    CONSTRAINT reports_detail_check CHECK ((char_length(detail) <= 500)),
    CONSTRAINT reports_no_self CHECK ((reporter_id <> reported_id)),
    CONSTRAINT reports_reason_check CHECK ((reason = ANY (ARRAY['不適切な写真'::text, 'ハラスメント'::text, 'なりすまし'::text, 'スパム'::text, 'その他'::text]))),
    CONSTRAINT reports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'investigating'::text, 'resolved'::text, 'dismissed'::text])))
);


--
-- Name: user_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_inventory (
    user_id uuid NOT NULL,
    item_type text NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    last_grant_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_inventory_item_type_check CHECK ((item_type = 'like_stock'::text)),
    CONSTRAINT user_inventory_quantity_check CHECK (((quantity >= 0) AND (quantity <= 10000)))
);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: announcement_reads announcement_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_reads
    ADD CONSTRAINT announcement_reads_pkey PRIMARY KEY (announcement_id, user_id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: blocks blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_pkey PRIMARY KEY (blocker_id, blocked_id);


--
-- Name: daily_metrics daily_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_metrics
    ADD CONSTRAINT daily_metrics_pkey PRIMARY KEY (snapshot_date, metric_key);


--
-- Name: hides hides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hides
    ADD CONSTRAINT hides_pkey PRIMARY KEY (hider_id, hidden_id);


--
-- Name: identity_block_hashes identity_block_hashes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_block_hashes
    ADD CONSTRAINT identity_block_hashes_pkey PRIMARY KEY (id);


--
-- Name: inquiries inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);


--
-- Name: like_quota like_quota_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.like_quota
    ADD CONSTRAINT like_quota_pkey PRIMARY KEY (user_id, date);


--
-- Name: likes likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_pkey PRIMARY KEY (liker_id, liked_id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: matches matches_user_pair_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_user_pair_unique UNIQUE (user_a_id, user_b_id);


--
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (message_id, user_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profile_images profile_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_images
    ADD CONSTRAINT profile_images_pkey PRIMARY KEY (id);


--
-- Name: profile_images profile_images_user_id_image_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_images
    ADD CONSTRAINT profile_images_user_id_image_path_key UNIQUE (user_id, image_path);


--
-- Name: profile_views profile_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_views
    ADD CONSTRAINT profile_views_pkey PRIMARY KEY (id);


--
-- Name: profile_views profile_views_viewer_id_viewed_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_views
    ADD CONSTRAINT profile_views_viewer_id_viewed_id_key UNIQUE (viewer_id, viewed_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_user_id_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: user_inventory user_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_inventory
    ADD CONSTRAINT user_inventory_pkey PRIMARY KEY (user_id, item_type);


--
-- Name: idx_admin_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_action ON public.admin_logs USING btree (action);


--
-- Name: idx_admin_logs_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs USING btree (admin_id);


--
-- Name: idx_admin_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_created_at ON public.admin_logs USING btree (created_at DESC);


--
-- Name: idx_admin_logs_target_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_target_id ON public.admin_logs USING btree (target_id);


--
-- Name: idx_announcement_reads_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcement_reads_user_id ON public.announcement_reads USING btree (user_id);


--
-- Name: idx_announcements_is_deleted_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_is_deleted_created_at ON public.announcements USING btree (is_deleted, created_at DESC);


--
-- Name: idx_blocks_blocked_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocks_blocked_id ON public.blocks USING btree (blocked_id);


--
-- Name: idx_blocks_blocker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocks_blocker_id ON public.blocks USING btree (blocker_id);


--
-- Name: idx_hides_hidden_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hides_hidden_id ON public.hides USING btree (hidden_id);


--
-- Name: idx_hides_hider_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hides_hider_id ON public.hides USING btree (hider_id);


--
-- Name: idx_ibh_retain_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ibh_retain_until ON public.identity_block_hashes USING btree (retain_until) WHERE ((retain_until IS NOT NULL) AND (is_permanent = false));


--
-- Name: idx_ibh_source_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ibh_source_user_id ON public.identity_block_hashes USING btree (source_user_id) WHERE (source_user_id IS NOT NULL);


--
-- Name: idx_inquiries_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inquiries_created_at ON public.inquiries USING btree (created_at DESC);


--
-- Name: idx_inquiries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inquiries_status ON public.inquiries USING btree (status);


--
-- Name: idx_inquiries_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inquiries_user_id ON public.inquiries USING btree (user_id);


--
-- Name: idx_like_quota_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_like_quota_user_date ON public.like_quota USING btree (user_id, date DESC);


--
-- Name: idx_likes_dismissed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_likes_dismissed ON public.likes USING btree (liked_id, dismissed_from_match);


--
-- Name: idx_likes_liked_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_likes_liked_id ON public.likes USING btree (liked_id);


--
-- Name: idx_likes_liker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_likes_liker_id ON public.likes USING btree (liker_id);


--
-- Name: idx_likes_receiver_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_likes_receiver_read ON public.likes USING btree (liked_id, receiver_read_at);


--
-- Name: idx_matches_user_a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_user_a ON public.matches USING btree (user_a_id);


--
-- Name: idx_matches_user_b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_user_b ON public.matches USING btree (user_b_id);


--
-- Name: idx_message_reactions_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reactions_message_id ON public.message_reactions USING btree (message_id);


--
-- Name: idx_message_reactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reactions_user_id ON public.message_reactions USING btree (user_id);


--
-- Name: idx_messages_match_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_match_created ON public.messages USING btree (match_id, created_at);


--
-- Name: idx_messages_reply_to_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_reply_to_id ON public.messages USING btree (reply_to_id);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_notifications_from_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_from_user_id ON public.notifications USING btree (from_user_id);


--
-- Name: idx_notifications_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_match_id ON public.notifications USING btree (match_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_profile_images_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profile_images_user_id ON public.profile_images USING btree (user_id, display_order);


--
-- Name: idx_profile_images_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profile_images_user_status ON public.profile_images USING btree (user_id, status);


--
-- Name: idx_profile_views_viewed_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profile_views_viewed_id ON public.profile_views USING btree (viewed_id, viewed_at DESC);


--
-- Name: idx_profile_views_viewer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profile_views_viewer_id ON public.profile_views USING btree (viewer_id);


--
-- Name: idx_profiles_browse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_browse ON public.profiles USING btree (status, gender, interest_in) WHERE (status = 'approved'::text);


--
-- Name: idx_profiles_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_created_at ON public.profiles USING btree (created_at DESC);


--
-- Name: idx_profiles_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_department ON public.profiles USING btree (department);


--
-- Name: idx_profiles_faculty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_faculty ON public.profiles USING btree (faculty);


--
-- Name: idx_profiles_privacy_purged_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_privacy_purged_at ON public.profiles USING btree (privacy_purged_at);


--
-- Name: idx_profiles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_status ON public.profiles USING btree (status);


--
-- Name: idx_push_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_reports_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_created_at ON public.reports USING btree (created_at DESC);


--
-- Name: idx_reports_reported_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_reported_id ON public.reports USING btree (reported_id);


--
-- Name: idx_reports_reporter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_reporter_id ON public.reports USING btree (reporter_id);


--
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_status ON public.reports USING btree (status);


--
-- Name: idx_user_inventory_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_inventory_user_id ON public.user_inventory USING btree (user_id);


--
-- Name: uq_ibh_email_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ibh_email_hash ON public.identity_block_hashes USING btree (email_hash) WHERE (email_hash IS NOT NULL);


--
-- Name: likes on_like_inserted_detect_match; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_like_inserted_detect_match AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION public.detect_match();


--
-- Name: profiles set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_inventory set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_inventory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: admin_logs admin_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: announcement_reads announcement_reads_announcement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_reads
    ADD CONSTRAINT announcement_reads_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;


--
-- Name: blocks blocks_blocked_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: blocks blocks_blocker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: hides hides_hidden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hides
    ADD CONSTRAINT hides_hidden_id_fkey FOREIGN KEY (hidden_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: hides hides_hider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hides
    ADD CONSTRAINT hides_hider_id_fkey FOREIGN KEY (hider_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: inquiries inquiries_replied_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_replied_by_fkey FOREIGN KEY (replied_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: inquiries inquiries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: like_quota like_quota_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.like_quota
    ADD CONSTRAINT like_quota_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: likes likes_liked_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_liked_id_fkey FOREIGN KEY (liked_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: likes likes_liker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_liker_id_fkey FOREIGN KEY (liker_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: matches matches_user_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_user_a_id_fkey FOREIGN KEY (user_a_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: matches matches_user_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_user_b_id_fkey FOREIGN KEY (user_b_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: messages messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profile_images profile_images_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_images
    ADD CONSTRAINT profile_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profile_views profile_views_viewed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_views
    ADD CONSTRAINT profile_views_viewed_id_fkey FOREIGN KEY (viewed_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profile_views profile_views_viewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_views
    ADD CONSTRAINT profile_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_banned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: reports reports_reported_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: user_inventory user_inventory_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_inventory
    ADD CONSTRAINT user_inventory_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: admin_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: announcement_reads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: blocks blocks_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blocks_service_role ON public.blocks TO service_role USING (true) WITH CHECK (true);


--
-- Name: daily_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: hides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hides ENABLE ROW LEVEL SECURITY;

--
-- Name: hides hides_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hides_service_role ON public.hides TO service_role USING (true) WITH CHECK (true);


--
-- Name: identity_block_hashes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.identity_block_hashes ENABLE ROW LEVEL SECURITY;

--
-- Name: inquiries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

--
-- Name: like_quota; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.like_quota ENABLE ROW LEVEL SECURITY;

--
-- Name: likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: message_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_images ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- Name: reports reports_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_service_role ON public.reports TO service_role USING (true) WITH CHECK (true);


--
-- Name: announcement_reads service_role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access" ON public.announcement_reads TO service_role USING (true) WITH CHECK (true);


--
-- Name: announcements service_role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access" ON public.announcements TO service_role USING (true) WITH CHECK (true);


--
-- Name: app_settings service_role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access" ON public.app_settings TO service_role USING (true) WITH CHECK (true);


--
-- Name: identity_block_hashes service_role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access" ON public.identity_block_hashes TO service_role USING (true) WITH CHECK (true);


--
-- Name: message_reactions service_role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access" ON public.message_reactions TO service_role USING (true) WITH CHECK (true);


--
-- Name: notifications service_role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access" ON public.notifications TO service_role USING (true) WITH CHECK (true);


--
-- Name: profile_views service_role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access" ON public.profile_views TO service_role USING (true) WITH CHECK (true);


--
-- Name: profiles service_role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access" ON public.profiles TO service_role USING (true) WITH CHECK (true);


--
-- Name: push_subscriptions service_role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access" ON public.push_subscriptions TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_inventory service_role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access" ON public.user_inventory TO service_role USING (true) WITH CHECK (true);


--
-- Name: admin_logs service_role full access on admin_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access on admin_logs" ON public.admin_logs TO service_role USING (true) WITH CHECK (true);


--
-- Name: daily_metrics service_role full access on daily_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access on daily_metrics" ON public.daily_metrics TO service_role USING (true) WITH CHECK (true);


--
-- Name: inquiries service_role full access on inquiries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access on inquiries" ON public.inquiries TO service_role USING (true) WITH CHECK (true);


--
-- Name: like_quota service_role full access on like_quota; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access on like_quota" ON public.like_quota TO service_role USING (true) WITH CHECK (true);


--
-- Name: likes service_role full access on likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access on likes" ON public.likes TO service_role USING (true) WITH CHECK (true);


--
-- Name: matches service_role full access on matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access on matches" ON public.matches TO service_role USING (true) WITH CHECK (true);


--
-- Name: messages service_role full access on messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access on messages" ON public.messages TO service_role USING (true) WITH CHECK (true);


--
-- Name: profile_images service_role full access on profile_images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role full access on profile_images" ON public.profile_images TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict N0qzMO0xKgCHUwYAEGqWHssUZNLIzZtMjKfzb7FHzomL2MDm1eXBXNYayB06hGo

