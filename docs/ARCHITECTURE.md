# Cro-co アーキテクチャ

最終更新日: 2026-06-04

実コードを直接確認した事実のみを記載する。憶測・未検証の挙動は書かない。
行番号は 2026-05-27 時点のもの。コード変更時はこのファイルを更新すること。

---

## 1. システム構成

```
[ ブラウザ / PWA ]
   React 19 + Vite + TS (Vercel: crocoweb.jp)
        |  axios (Bearer JWT) / WebSocket
        v
[ FastAPI ] (Render: api.crocoweb.jp)
   - 認証: Supabase JWT 検証 (get_active_user / require_admin)
   - DB アクセス: Supabase Python クライアント (service_role ＝ RLS バイパス)
   - APScheduler: privacy_purge 毎日 03:00 JST
   - BackgroundTasks: メール送信 (Resend) / Web Push (VAPID)
        |
        v
[ Supabase ]  PostgreSQL + Auth + Storage
   - Storage: student-ids (Private) / profile-images (Private・2026-05-27 確認)。dev/prod 両方でバケット完備（migration 041 で作成・同設定）
   - pg_cron: like_quota 日次生成
   - トリガー: handle_new_user / detect_match / enforce_university_email_domain
        |
        +-- [ Resend ]  トランザクションメール (noreply@crocoweb.jp)
        +-- [ Web Push ] VAPID
```

### 認証の2層
- `get_current_user` (`auth/dependencies.py:11`): `Authorization: Bearer <JWT>` を `supabase.auth.get_user` で検証
- `get_active_user` (`auth/active_user.py:8`): 上記をラップし `status in ('banned','deleted')` を 403 でブロック。**ほぼ全 API がこれを使用**。ただし退会（deleted）は `DELETE /api/profile/me` で `auth.users` も物理削除するため、退会後の JWT 検証が上流で 401 になる（get_active_user の 403 には到達しない）。BAN（banned）は auth.users が残るため JWT 検証を通過後にここで 403 を返す
- `require_admin` (`auth/dependencies.py:32`): `email` を `settings.admin_emails` と照合（admin.py 全エンドポイント）
- WebSocket は JWT をクエリパラメータ `token` で受け取り `supabase.auth.get_user` で検証（ws.py）

### ディレクトリ構造（抜粋）
```
backend/app/
├── main.py                  # FastAPI app・ルーター12本登録・APScheduler・CORS・セキュリティヘッダー
├── core/  config.py / supabase_client.py / block_utils.py / identity_hide.py / image_utils.py /
│          privacy_purge.py / email.py / push.py / ws_manager.py / limiter.py / admin_log.py
├── auth/  dependencies.py (get_current_user / require_admin) / active_user.py (get_active_user)
├── schemas/  profile / browse / like / match / message / notifications / safety / admin / inquiries
└── routers/  health / profile / browse / like / match / message / ws /
              notifications / safety / push / inquiries / admin
frontend/src/
├── App.tsx                  # 26ルート（lazy + Suspense）
├── lib/ api.ts / supabase.ts / utils.ts / validation.ts / db.ts
├── contexts/ AuthContext.tsx
├── hooks/ useProfile / useChat / usePWAInstall / usePageTitle
├── components/ Layout / *Guard / MarqueeBar / ColorfulCard / MatchModal ほか
└── pages/  (+ admin/tabs/, admin/components/)
```

---

## 2. API エンドポイント一覧

全エンドポイントの prefix・認証・他ユーザー情報の有無・ブロックフィルタを列挙する。
- **認証**: `active` = `get_active_user`（BAN ブロック込み）、`admin` = `require_admin`、`なし` = 認証不要
- **RLS**: 全 API はバックエンド service_role で実行 → RLS はバイパスされる（アプリ層が防御）

### 2.1 ヘルスチェック (health.py, prefix なし)
| Method | Path | 行 | 認証 | 他者情報 | ブロックフィルタ |
|---|---|---|---|---|---|
| GET | /health | health.py:6 | なし | — | — |

### 2.2 プロフィール (profile.py, prefix `/api/profile`, 全 active)
| Method | Path | 行 | 他者情報 | 備考 |
|---|---|---|---|---|
| GET | /me | 72 | 自分のみ | 全カラム + photos + liked_count（`SELECT *`） |
| PATCH | /me | 105 | 自分のみ | 60/min。`ProfileUpdateRequest` allowlist（`schemas/profile.py`）でフィールドを制限。`real_name`(max_length=100)・`student_number`(max_length=20・英数字 pattern)・`interests`(要素50字・20件)・`clubs`/`hidden_clubs`(要素50字・5件)。gender/interest_in は設定後変更不可。identity_verified 後は学籍情報変更無視。必須項目が揃うと profile_setup_completed=true |
| POST | /upload-student-id | 209 | 自分のみ | 5/hour。EXIF 削除（`_strip_exif`・fail-close 422）。Form に `real_name`(max=100)・`student_number`(max=20・英数字)・`faculty`(max=50)・`department`(max=100)・`year`(ge=1,le=11)の制約付き（PATCH 側と統一・2026-06-03 [5.7]）。status→pending_review。student-ids バケット |
| ~~POST~~ | ~~upload-avatar~~ | ~~削除済み~~ | — | 2026-06-03 削除（審査スキップ経路・フロント呼び出し元ゼロ確認）|
| GET | /avatar-url | 342 | 自分のみ | 署名付き URL（自己閲覧） |
| PATCH | /photos/reorder | 369 | 自分のみ | 全 ID が自分のものか検証 |
| POST | /photos | 409 | 自分のみ | 6枚制限。status='pending' で INSERT。EXIF 削除（`_strip_exif`・fail-close 422）。初回アップ時の自動 profile_image_path セットなし（[8.3]） |
| DELETE | /photos/{photo_id} | 521 | 自分のみ | 所有者チェック→Storage 物理削除→後継は approved 写真のみ（[8.3]） |
| POST | /reapply | 614 | 自分のみ | rejected のみ。旧学生証を Storage から物理削除してから DB: status→pending_review / student_id_image_path=NULL（2026-06-02 修正） |
| POST | /ping | 654 | 自分のみ | 20/min。last_seen_at 更新 |
| DELETE | /me | 669 | 自分のみ | 退会。Storage/写真物理削除 + ソフトデリート + auth.users 削除 |
| POST | /complete-onboarding | 764 | 自分のみ | 必須項目・学生証提出をサーバー検証 |
| POST | /photos/{photo_id}/set-main | 808 | 自分のみ | 所有者チェック + status='approved' 確認（[8.3]）|

### 2.3 ブラウズ (browse.py, prefix `/api`, 全 active)
| Method | Path | 行 | 他者情報 | ブロックフィルタ | 身バレ防止 |
|---|---|---|---|---|---|
| GET | /profiles | 66 | ○ 一覧 | ○ 双方向 block + hide を `not_.in_` で除外 | ○ `identity_hide.is_hidden_between` を候補に Python 適用 | **approved 必須**（`get_approved_user`・2026-06-03） |
| GET | /profiles/recommended | 252 | ○ 一覧 | ○ 双方向 block + hide + match 済み除外 | ○ `get_hidden_user_ids_for` を `excluded` に合流し `not_.in_` |
| GET | /profiles/views | 373 | ○ 一覧（足跡） | ○ `get_blocked_user_ids` で除外 | ○ `get_hidden_user_ids_for` で viewer 除外 |
| POST | /profiles/views/confirm | 448 | 自分のみ | — | — |
| GET | /profiles/completeness-rank | 476 | 集計のみ | — | — |
| GET | /profiles/hometowns | 537 | 集計のみ（出身地の重複なし一覧） | — | — |
| GET | /profiles/{user_id} | 549 | ○ 単一 | ○ 双方向 block → 403 / status≠approved → 404 | ○ `is_hidden_from_viewer` → 404（block 403 より前） | 自己閲覧は pending 許可・他人閲覧は **approved 必須**（is_self 分岐・2026-06-03） |

- `/profiles` は 30/min。男性が女性一覧を見る場合の like_quota フィルタは `LIKE_QUOTA_ENABLED=true` のときのみ有効（β は未設定＝OFF = 男性が全女性をいつでも閲覧可）。デフォルト並び順は `last_seen_at.desc.nullslast`（アクティブな人が上・未ログインは末尾）
- `/profiles` のクエリパラメータ（全てサーバー側で適用・フロントを介さない直叩きでも回避不可）:
  - `years`（複数指定可・例 `?years=1&years=2`）: `year` を `in_`。4 以上は「4年以上」として `year>=4` を `or_` で合流（`year.in.(1),year.gte.4`）
  - `science_humanities`（`humanities` / `sciences`）: 文理を `faculty_classification` の集合へ展開し `in_("faculty", ...)`。**学部学科を直接の検索条件にはしない**（身バレ低減）
  - `hometowns`（複数指定可）: `in_("hometown", ...)`
  - `bio_keyword`: `ilike("bio", "%kw%")`。`_sanitize_bio_keyword` で `%` `_` `\` をエスケープ・`*` を除去し、LIKE/PostgREST ワイルドカードによる全件マッチを防止
  - `sort_by`: `last_seen`（`last_seen_at.desc.nullslast`＝未ログインを末尾）/ `year_asc` / `year_desc` / 既定 `last_seen_at.desc.nullslast`（2026-05-28 以降。①受信制限オフでアクティブな人を上に出すため）
  - ※ 旧 `faculty`（部分一致）・単一 `year` パラメータは廃止（文理＋複数学年に置換）
- `/profiles/hometowns` は承認済みプロフィールに実在する出身地の重複なし一覧を返す（詳細検索の出身地候補・並び順はフロントで都道府県正準順に整列）
- `/profiles/{user_id}` は閲覧時に足跡（profile_views）を upsert する
- **メイン写真先頭（2026-05-27）**: `/profiles` のカードサムネ（`avatar_url`）と `/profiles/{user_id}` の `photos[]` は、`profiles.profile_image_path`（メイン写真）を必ず先頭に並べ替えて返す。カードは「メインが承認済みなら採用・なければ display_order 先頭」、詳細は「メインを先頭・残りは display_order 順（安定ソート）」。`/recommended` は元から `profile_image_path` を使用。`is_main` カラムは存在せず、メインは `profile_image_path` と `profile_images.image_path` の一致で判定
- **文理（science_humanities）（2026-05-27）**: `ProfileDetail`（`/profiles/{user_id}`）に `science_humanities: "humanities" | "sciences" | null` を追加。`faculty_classification.classify(faculty)` で変換。`faculty` / `department` フィールド自体は残す（他箇所が依存・別タスクで段階的廃止）。フロント詳細ページは文理 tag-pill のみ表示し学部学科は出さない。カードは学部学科・文理とも非表示

### 2.4 いいね (like.py, prefix `/api/likes`, 全 active)
| Method | Path | 行 | 他者情報 | ブロックフィルタ |
|---|---|---|---|---|
| POST | / | 81 | — | ○ 身バレ防止 `is_hidden_from_viewer` → 404（block 403 より前）。双方向 block → 403（中立メッセージ）。60/min。男→女・非足跡で `consume_like_stock` を実行し在庫切れは 400（足跡経由・女性・同性ペアは無料）。**approved 必須**（`get_approved_user`・2026-06-03） |
| GET | /quota | 284 | 自分のみ（`LIKE_QUOTA_ENABLED=false` の間は全員 `is_target=false` で返す） |
| GET | /stock | 395 | 自分のみ（男性のみ `is_applicable=true`・`quantity` 等を返す。`get_like_stock` で ensure を兼ね lazy +2 がこの GET で発火） |
| GET | /today-count | 361 | 自分のみ |
| GET | /received | 383 | ○ 一覧 | ○ block + match 済み + 身バレ防止 `get_hidden_user_ids_for` 除外 |
| POST | /dismiss/{liker_id} | 469 | — | — |
| POST | /received/confirm | 496 | 自分のみ | — |

- POST `/` は BeReal型受信枠チェック（`should_count_quota` RPC）→ INSERT → `detect_match` トリガーがマッチ自動成立 → メール/Push を BackgroundTasks で送信

### 2.5 マッチ (match.py, prefix `/api/matches`, 全 active)
| Method | Path | 行 | 他者情報 | ブロックフィルタ |
|---|---|---|---|---|
| GET | / | 19 | ○ 一覧 | ○ 双方向 block 除外。退会相手は匿名化（is_deleted）。**approved 必須**（`get_approved_user`・2026-06-03） |
| GET | /unread-count | 129 | 集計 | ○ block 除外（messages/views/likes 各カウント） |
| GET | /{match_id} | 243 | ○ 単一 | ○ メンバーチェック + block → 403。**approved 必須**（`get_approved_user`・2026-06-03） |
| DELETE | /{match_id} | 317 | — | メンバーチェック。マッチ解除（messages CASCADE）。**approved 必須**（`get_approved_user`・2026-06-03） |

### 2.6 メッセージ (message.py, prefix `/api/messages`, 全 active)
| Method | Path | 行 | ブロックフィルタ |
|---|---|---|---|
| POST | / | 147 | `_assert_approved` + `_assert_match_member`（block → 403）。30/min。reply 検証あり |
| GET | /{match_id} | 253 | `_assert_match_member`。カーソルページネーション（50件・before）。リアクション/リプライ集計 |
| POST | /{message_id}/react | 366 | `_assert_match_member`。heart トグル |
| POST | /{match_id}/read | 428 | `_assert_match_member`。既読を WS でブロードキャスト |

### 2.7 WebSocket (ws.py, prefix なし)
| Method | Path | 行 | 認証 | ブロックフィルタ |
|---|---|---|---|---|
| WS | /ws/chat/{match_id}?token=JWT | 11 | クエリ JWT | マッチメンバー確認 + 双方向 block → close 1008。**approved 以外 close 4003**（ws.py:37・2026-06-03） |

- `ping`→`pong`、`typing:start:` / `typing:stop:` でタイピング通知をブロードキャスト

### 2.8 通知 (notifications.py, prefix `/api/notifications`, 全 active)
| Method | Path | 行 | 他者情報 | ブロックフィルタ |
|---|---|---|---|---|
| GET | / | 20 | ○ from_user 情報含む | ○ from_user_id が block 相手の通知を除外 |
| POST | /read-all | 82 | 自分のみ | — |
| POST | /{notification_id}/read | 105 | 自分のみ | — |

### 2.9 安全機能 (safety.py, prefix `/api/safety`, 全 active)
| Method | Path | 行 | 備考 |
|---|---|---|---|
| POST | /block | 44 | approved 限定。冪等。マッチを CASCADE 削除 |
| DELETE | /block/{blocked_id} | 88 | **常に 403**（ブロック解除不可仕様） |
| POST | /report | 102 | approved 限定。10/min。通報後 hides に自動 upsert |
| POST | /hide | 147 | approved 限定。冪等 |
| DELETE | /hide/{hidden_id} | 174 | approved 限定。非表示解除 |
| GET | /blocks | 187 | ブロック一覧（閲覧のみ・プロフィール情報込み） |
| GET | /hides | 224 | 非表示一覧（プロフィール情報込み・created_at desc）。2026-05-28 新設 |
| GET | /blocked-ids | 267 | 自分がブロックした ID 配列 |
| GET | /hidden-ids | 282 | 自分が非表示にした ID 配列 |

### 2.10 プッシュ通知 (push.py, prefix `/api/push`)
| Method | Path | 行 | 認証 |
|---|---|---|---|
| GET | /vapid-public-key | 19 | なし |
| POST | /subscribe | 25 | active |
| DELETE | /subscribe | 41 | active |
| DELETE | /subscribe/all | 50 | active |
| POST | /test | 59 | active（テスト通知送信） |

### 2.11 問い合わせ (inquiries.py, prefix `/api/inquiries`, 全 active)
| Method | Path | 行 | 備考 |
|---|---|---|---|
| POST | / | 16 | 5/hour。insert 成功直後に BackgroundTasks で `send_inquiry_notification_to_admin` を呼び、`settings.admin_emails`（CSV）宛に Resend で管理者通知メールを送る。メール失敗は warning ログのみで 201 を返す |
| GET | /me | 50 | 自分の問い合わせ一覧（管理者返信 `admin_reply` 含む） |

### 2.12 管理者 (admin.py, prefix `/api/admin`, 全 admin)
| Method | Path | 行 | 説明 |
|---|---|---|---|
| GET | /pending | 44 | 審査待ちユーザー一覧（AdminGuard の認証判定にも使用） |
| GET | /student-id/{user_id} | 66 | 学生証署名付き URL（5分有効・student-ids バケット） |
| POST | /approve/{user_id} | 147 | 承認（identity_verified=true）。審査済みは 409 |
| POST | /reject/{user_id} | 200 | 却下（rejection_reason）。審査済みは 409 |
| POST | /suspend/{user_id} | 253 | 通報による停止（status→rejected・上書き可） |
| GET | /stats | 303 | 集計統計 |
| POST | /privacy-purge | 364 | PII 削除バッチ手動実行（監査ログ記録）。`/privacy-purge/run` は 2026-06-03 に統合削除 |
| GET | /users | 386 | ユーザー一覧（フィルター・検索・ページネーション）。`search`（max_length=100）は `_sanitize_admin_search`（LIKE ワイルドカード無効化）→ name/.ilike + email/.ilike を別クエリ実行 → アプリ側 ID 和集合 → `.in_("id",...)` で主クエリに渡す。`.or_()` 生文字列不使用（PostgREST フィルタ注入ゼロ・2026-06-03 [5.3] 対策） |
| GET | /users/{user_id} | 441 | ユーザー詳細（閲覧ログ記録） |
| POST | /users/{user_id}/ban | 531 | BAN（status=banned） |
| POST | /users/{user_id}/unban | 568 | BAN 解除（status→approved） |
| GET | /reports | 607 | 通報一覧（ステータスフィルター） |
| PATCH | /reports/{report_id} | 662 | 通報更新。warning+resolved で通報相手に admin_warning 通知 |
| GET | /stats/timeseries | 780 | 登録・マッチの時系列 |
| GET | /stats/breakdown | 847 | 学部・性別・学年別内訳 |
| GET | /logs | 898 | 管理者操作ログ |
| GET | /inquiries | 926 | 問い合わせ一覧 |
| POST | /inquiries/{inquiry_id}/reply | 968 | 問い合わせ返信 |
| GET | /photos/pending | 1001 | 審査待ち写真一覧 |
| POST | /photos/{photo_id}/approve | 1047 | 写真承認（status=approved） |
| POST | /photos/{photo_id}/reject | 1097 | 写真却下（status=rejected） |
| PATCH | /inquiries/{inquiry_id} | 1130 | 問い合わせステータス更新 |

---

## 3. DB スキーマ

migration を正とする。型・制約は `backend/migrations/` の各 SQL に基づく。

### 3.1 profiles（001 + 多数の ALTER）
PK `id uuid` = `auth.users.id`（ON DELETE CASCADE）。主要カラム:

| カラム | 型 | 備考 / 制約 |
|---|---|---|
| id / email | uuid / text | email は @ecs.osaka-u.ac.jp（DB トリガーで強制） |
| created_at / updated_at | timestamptz | updated_at はトリガー自動更新 |
| status | text | pending_review / approved / rejected / banned / deleted（'deleted' は migration 042 で追加） |
| name / year / faculty / department / bio | text / int / text / text / text | year 1〜6、bio ≤500 |
| gender / interest_in | text | male / female |
| interests / clubs / hidden_clubs | text[] | |
| club / hometown / looking_for | text | looking_for ∈ 恋愛/友達/なんでも |
| faculty_hide_level | text | none / faculty / department（身バレ防止） |
| status_message / status_message_updated_at | text / timestamptz | ≤30 |
| last_seen_at / show_online_status | timestamptz / bool | |
| profile_image_path | text | Storage パス |
| student_id_image_path / submitted_at | text / timestamptz | 学生証 |
| real_name / student_number / birth_date | text / text / date | PII（退会・purge で削除） |
| age / real_name_hash / student_number_hash | int / text / text | purge 後の代替・再登録検出用 |
| privacy_purged_at / deleted_at | timestamptz | |
| identity_verified / profile_completed / profile_setup_completed / student_id_submitted / onboarding_completed | bool | フロー制御フラグ |
| rejection_reason / reviewed_at | text / timestamptz | 審査 |
| admission_year | int | 参照のみ（027 で利用停止） |
| banned_at / banned_by / ban_reason | timestamptz / uuid / text | BAN |

### 3.2 likes（007 + 028/029/030）
PK `(liker_id, liked_id)`、CHECK `liker_id != liked_id`。
カラム: created_at, via_footprint, counted_to_quota, receiver_read_at, dismissed_from_match。
INSERT トリガー `detect_match` でマッチ自動成立。

### 3.3 matches（008 + 009）
PK `id uuid`、UNIQUE `(user_a_id, user_b_id)`、CHECK `user_a_id < user_b_id`。created_at。

### 3.4 messages（009 + 014/020）
PK `id`、`match_id`→matches（CASCADE）、`sender_id`、content（1〜1000）、created_at、read_at、`reply_to_id`→messages（SET NULL）。

### 3.5 message_reactions（016）
PK `(message_id, user_id)`、reaction='heart'、created_at。

### 3.6 profile_images（010 + 036_profile_images_status）
PK `id`、user_id、image_path、display_order、created_at、status（pending/approved/rejected・**デフォルト pending**）。UNIQUE `(user_id, image_path)`。

### 3.7 blocks / reports / hides（012 + 036/038）
- blocks: PK `(blocker_id, blocked_id)`、CHECK no self
- reports: id、reporter_id、reported_id、reason（不適切な写真/ハラスメント/なりすまし/スパム/その他）、detail（≤500）、status（pending/investigating/resolved/dismissed）、resolved_at/by、resolution_note、action_taken（warning/suspend/ban/none）
- hides: PK `(hider_id, hidden_id)`、CHECK no self

### 3.8 profile_views（015 + 022）
PK `id`、UNIQUE `(viewer_id, viewed_id)`、viewed_at、confirmed_at（既読管理）。

### 3.9 notifications（018 + 039）
id、user_id、type（match/like/view/message/**admin_warning**）、from_user_id（SET NULL）、match_id（CASCADE）、message_preview、read_at、created_at。

### 3.10 like_quota（028 + 033）
PK `(user_id, date)`、opens_at、used_count、created_at。pg_cron `generate-like-quota` が毎日 UTC 15:00（JST 0:00）に女性×interest_in=male×approved の翌日枠を生成。⚠️ **2026-05-28 以降: `LIKE_QUOTA_ENABLED=false`（β 既定）の間は本テーブルへの参照は `like.py` / `browse.py` で skip される（死に枠）。テーブル・pg_cron は drop せず将来 ON で復活可能**。

### 3.10b user_inventory（043）
PK `(user_id, item_type)`、quantity（`CHECK 0<=quantity<=10000`）、last_grant_date、created_at、updated_at。item_type 縦持ち（CHECK `IN ('like_stock')`・将来 042 と同パターンで広げる）。`set_updated_at` トリガー流用。③ 男性のいいね送信在庫を保持（初期10・毎日ログイン報酬+2 は `inventory.ensure_like_stock` の lazy 加算で発火・足跡経由消費なし）。one-shot 投入で既存 male approved 全員に `quantity=10` 初期付与済み（043 末尾）。

### 3.11 push_subscriptions（032）
id、user_id、endpoint、p256dh、auth、user_agent、created_at。UNIQUE `(user_id, endpoint)`。

### 3.12 admin_logs（036_admin_extensions）
id、admin_id、admin_email、action、target_type、target_id、details jsonb、ip_address、user_agent、created_at。

### 3.13 inquiries（036_admin_extensions）
id、user_id、category（bug/feature/account/report/other）、subject（≤100）、body（≤2000）、status（unread/read/replied/closed）、admin_reply、admin_note、replied_at、replied_by、created_at、updated_at。

### 3.14 login_history（019）
id、user_id、ip_address、user_agent、logged_in_at。⚠️ **作成済みだが書き込みコードが存在しない（未使用）**。

### 主要トリガー・関数
| 名前 | 対象 | 動作 |
|---|---|---|
| handle_new_user | auth.users AFTER INSERT | profiles へ自動 INSERT（SECURITY DEFINER・search_path=public） |
| set_updated_at | profiles BEFORE UPDATE | updated_at = now() |
| detect_match | likes AFTER INSERT | 相互いいねで matches へ INSERT（正規化・ON CONFLICT DO NOTHING）（SECURITY DEFINER・search_path=public：migration 047(B) で固定） |
| enforce_university_email_domain | auth.users BEFORE INSERT | @ecs.osaka-u.ac.jp 以外を拒否（034）（SECURITY DEFINER・search_path=public） |
| should_count_quota | RPC | BeReal型受信枠のカウント対象判定（028） |

> **SECURITY DEFINER 関数（アプリ管理・2026-06-03 時点）**: 上記3関数（handle_new_user / enforce_university_email_domain / detect_match）が全て `search_path=public` で固定済み。Supabase 組み込み（pgbouncer.get_auth / vault.*）は search_path="" 固定で Supabase 管理。prod のみ存在した手動 DDL 残骸 `create_profile_for_user`（未使用・migration 管理外）は migration 047(A) で DROP し dev/prod の構造差分を解消済み。

---

## 4. RLS ポリシー一覧

全テーブルで RLS 有効 + service_role フルアクセス。**バックエンドは service_role で接続するため、API レスポンスは RLS の保護を受けない**。PostgREST 直叩き（anon/authenticated によるロール切替）に対して **GRANT（入場許可証）と RLS の二層で防衛**：
- **GRANT 層（第1層）**: anon/authenticated への DML GRANT（SELECT/INSERT/UPDATE/DELETE）なし → テーブルに辿り着けない。dev は migration 045 で revoke 済み（prod は元からなし）。
- **RLS 層（第2層）**: RLS ポリシーで自分の行のみ or service_role のみに限定。GRANT 突破された場合の最終防衛線。

以下は RLS 層の authenticated 向けポリシー一覧（GRANT 層は別途 role_table_grants で確認）。

| テーブル | authenticated 向けポリシー |
|---|---|
| profiles | 自分の行のみ SELECT（`auth.uid() = id`） |
| notifications | 自分の行を SELECT / UPDATE |
| login_history | 自分の行を SELECT |
| inquiries | 自分の行を SELECT |
| message_reactions | マッチメンバーが SELECT 可 |
| blocks | `blocks_select_own` / `blocks_insert_own`: いずれも `auth.uid() = blocker_id`（`blocks_delete_own` は 044 で DROP ─ Supabase REST API 直叩きによるブロック解除バイパスを封鎖。DELETE ポリシーなし = デフォルト拒否で解除不可を RLS が担保）。dev 適用済み 2026-06-02 / prod 手動待ち |
| reports | service_role のみ（`reports_self` は 044 で DROP ─ authenticated ユーザーが Supabase REST API 直叩きで通報を DELETE・INSERT できた穴を封鎖。フロントは supabase.from 非使用のため影響なし）。dev 適用済み 2026-06-02 / prod 手動待ち |
| hides | hider_id のみ全操作 |
| messages | service_role のみ（`hide_messages_with_deleted_user`〔roles: public = anon 全件読み〕/ `match participants can view messages`〔prod 手動 authenticated SELECT〕を 044 で DROP ─ anon キー直叩きによる全件 SELECT を封鎖）。dev 適用済み 2026-06-02 / prod 手動待ち |
| like_quota | **authenticated ポリシーなし**（service_role のみ・033 で RLS 有効化） |
| likes / matches / profile_images / profile_views / push_subscriptions / admin_logs | service_role のみ |

> 重要原則: ブロック防御の本丸はアプリ層（`get_blocked_user_ids`）。PostgREST 直叩きは GRANT（第1層）+ RLS（第2層）の二重で防衛する（CLAUDE.md §4「DB ポリシー（RLS）の鉄則」Rule 4 参照）。

**known-good baseline（2026-06-04 CLEAN 確認済み）**: 全テーブル RLS 有効（dev 17・prod 16 ＝ user_inventory が dev のみ・migration 043 prod 未適用の既知差分）。anon/authenticated/public への DML GRANT ゼロ（migration 045）。ポリシーは全26本で `scripts/rls_allowlist.json` と一致（非 service_role 9本の存在理由は同 note に記録・穴4本は migration 044 で DROP 済み）。SECURITY DEFINER 3本（handle_new_user / enforce_university_email_domain / detect_match）は全て `search_path=public` 固定・幽霊関数 `create_profile_for_user` は migration 047(A) で DROP 済み。dev/prod 実走とも `check_rls_drift.ps1` で CLEAN（2026-06-04・テザリング回線・Session pooler URI）。

---

## 5. フロント-バック対応表

主要画面ごとの呼び出し API とフィルタ実装場所。フロント側は API が返したものをそのまま表示し、独自フィルタは行っていない（確認済み）。

| 画面 | コンポーネント | 主な API | フロント側フィルタ | バック側フィルタ |
|---|---|---|---|---|
| ホーム | HomePage.tsx | GET /api/profiles/recommended, /matches/, /profiles/completeness-rank, /likes/quota, /likes/stock | なし | ブロック・hide・match・身バレ防止 除外。男性は「ITEMS」セクションでいいねストック表示・女性は LIKE_QUOTA_ENABLED=true 時のみ受信枠カード表示 |
| さがす | BrowsePage.tsx → ColorfulCard（HomePage おすすめと共有） | GET /api/profiles（検索バー bio + 詳細検索: 学年/文理/出身地/並び替え）, /api/profiles/hometowns, /likes/today-count, /likes/stock, POST /likes/ | なし（検索条件は全てサーバー適用・履歴は localStorage `crocoBrowseHistory` のみ） | ブロック・hide・身バレ防止・LIKE_QUOTA_ENABLED 時のみ枠フィルタ + 学年/文理/出身地/bio 絞り込み。デフォルト並び順は `last_seen_at.desc.nullslast`。男性は右上に在庫残数 `♥ {n}` 表示・在庫0で送信時はトーストのみ（リクエスト送らない） |
| プロフィール詳細 | ProfileDetailPage.tsx（自分/他人 共通・isSelf 分岐） | GET /api/profiles/{id}, POST /likes/, /safety/* | なし | 双方向ブロック 403・身バレ防止 404。3段構成（カルーセル左右矢印+ドット・メイン写真先頭 / 名前ブロック=学年/文理/出身地 tag-pill / 詳細ブロック=自己紹介+登録日）。背景はユーザー固有色全面・円形アバター廃止・興味/サークル非表示・横長浮遊いいねボタン |
| プロフィール編集 | ProfileEditPage.tsx | GET/PATCH /api/profile/me, /profile/photos* | なし | 自分のみ |
| マッチ | MatchesPage.tsx | GET /api/matches/, /matches/unread-count, /likes/received?for_match_tab=true, POST /likes/, /likes/dismiss/, /safety/hide | なし | ブロック・match 除外 |
| いいね受信 | LikesReceivedPage.tsx | GET /api/likes/received, POST /likes/received/confirm, /likes/ | なし | ブロック・match・身バレ防止 除外 |
| 通知 | NotificationsPage.tsx | GET /api/notifications/, /matches/unread-count, POST /notifications/{id}/read | なし | from_user_id ブロック除外 |
| 足跡 | FootprintsPage.tsx | GET /api/profiles/views, POST /profiles/views/confirm, /likes/ | なし | ブロック・身バレ防止 除外 |
| チャット | ChatPage.tsx + useChat | GET /api/matches/{id}, /messages/{id}, WS, POST /messages/, /messages/{id}/react, /safety/* | なし | マッチメンバー + ブロック確認 |
| 設定 | SettingsPage.tsx | GET /api/profile/me, /safety/blocks, /safety/hides（件数バッジ用・length のみ）, /admin/pending, PATCH /profile/me, DELETE /profile/me, POST /push/test | なし | 自分のみ。ブロック/非表示/お問い合わせは専用ページへ入口リンク3カードで分離（顔は出さない・問い合わせはバッジなし） |
| ブロック・非表示 | SafetyListPage.tsx（`/settings/safety`・タブ `?tab=block`/`?tab=hide`） | GET /api/safety/blocks, /safety/hides, DELETE /safety/hide/{id} | なし | 自分のみ。ブロックタブは閲覧専用（解除不可）・非表示タブは解除ボタンあり |
| お問い合わせ | ContactPage.tsx（`/settings/contact`） | POST /api/inquiries/, GET /api/inquiries/me | なし | 自分のみ。送信フォーム（category/subject/body・残量カウンター・5/hour）+ 履歴一覧（運営返信 admin_reply あれば別ブロック表示）。送信成功でトースト→navigate(-1)。429 専用文言あり。テキストのみ（画像添付はフェーズ2） |
| 管理 | admin/* | GET/POST/PATCH /api/admin/* | なし | require_admin |

---

## 6. データフロー図

### 6.1 認証・オンボーディング
```
/signup → メール確認(Supabase Auth) → /setup/required
OnboardingGuard:
  student_id_submitted === false        → /setup/required
  submitted === true && !onboarding_completed → /setup/optional
/setup/required(学生証+必須項目, POST /api/profile/upload-student-id → status=pending_review)
  → /setup/thanks → /setup/optional(PATCH /profile/me) → /setup/install
  → /setup/notify → /setup/complete(POST /complete-onboarding) → /home
```

### 6.2 学生証審査
```
POST /api/profile/upload-student-id → status=pending_review → /pending
管理者: GET /api/admin/pending → GET /api/admin/student-id/{id}(署名URL 5分)
  ├ 承認 POST /api/admin/approve/{id} → approved + identity_verified=true
  └ 却下 POST /api/admin/reject/{id} → rejected(+reason) → /rejected
        → POST /api/profile/reapply → pending_review → /setup/required?mode=reapply
```

### 6.3 写真審査
```
POST /api/profile/photos → profile_images.status='pending'（profile-images バケット）
  ※ 初回アップロード時は profile_image_path を自動セットしない（pending は他人に見せない不変条件）
管理者: GET /api/admin/photos/pending
  ├ 承認 POST /api/admin/photos/{id}/approve → approved
  │   profile_image_path が NULL の場合は承認パスをセット（「承認されて初めてメインになりうる」導線）
  └ 却下 POST /api/admin/photos/{id}/reject → rejected
POST /api/profile/photos/{id}/set-main → profile_image_path に設定（status='approved' のみ許可・[8.3]）
DELETE /api/profile/photos/{id} → 削除後、後継メインを approved 写真から選ぶ（pending 繰り上げ不可・[8.3]）
※ POST /api/profile/upload-avatar は 2026-06-03 に削除（審査スキップ経路・フロント呼び出し元ゼロ確認）
不変条件（2026-06-03 確立）: profiles.profile_image_path には status='approved' の写真パスのみ入る。
  他人向けエンドポイントは不変条件に依存。GET /api/profiles/{id} は二重防御（approved セット照合）も実装済み。
```

### 6.4 いいね・マッチ
```
POST /api/likes/ → 双方向ブロックチェック → 受信枠チェック(should_count_quota)
  → likes INSERT → detect_match トリガー
    ├ 相互いいねあり → matches 自動 INSERT → 両者にマッチ通知(メール+Push)
    └ なし → 相手に「いいね」通知(Push)
BeReal型受信枠: 男女マッチ志向の女性のみ5件/日。同性ペア・足跡経由(via_footprint)はカウント外。
```

### 6.5 チャット
```
/chat/:matchId → ChatGuard(pending_review/rejected をブロック)
WebSocket /ws/chat/{match_id}?token=JWT（マッチメンバー+ブロック確認）
  接続失敗時 → ポーリング fallback（POST /messages/ + GET /messages/{id}）
既読は POST /messages/{id}/read → WS で read_receipt ブロードキャスト
```

### 6.6 退会・PII 削除
```
DELETE /api/profile/me
  → Storage(profile-images / student-ids) 物理削除
  → profile_images 物理削除
  → profiles ソフトデリート(status=deleted + PII 即時クリア)
  → auth.users 削除
POST /api/profile/reapply（却下→再申請）
  → 旧 student_id_image_path を Storage から物理削除（2026-06-02 修正）
  → DB: student_id_image_path=NULL / status=pending_review
POST /api/profile/upload-student-id（再アップ時）
  → 新ファイルを Storage へ upload・DB 更新
  → 旧ファイルがあれば Storage から物理削除（2026-06-02 修正）
privacy_purge バッチ(APScheduler 毎日 03:00 JST, core/privacy_purge.py)
  → approved 後3日: PII 削除・ハッシュ保持（起点: reviewed_at）
  → approved + reviewed_at=NULL の場合: submitted_at 起点で同等処理（2026-06-02 追加）
  → rejected 後30日: 同上
  → 退会後30日: messages 物理削除（※ dead code: auth.users 削除で matches が CASCADE 即時削除されるためメッセージが残ることはなく、purge_deleted_user_messages() は常に 0件）
  → purge 後1年: ハッシュ削除
```

---

## 7. 「どこで何を弾いているか」マトリックス

各「弾くべき機能」をフロント・バック・RLS のどこで弾いているかを示す。
推奨レベル: ✅ OK / ⚠️ 要監査。

| 機能 | フロント | バック | RLS | レベル | 備考 |
|---|---|---|---|---|---|
| BAN ユーザーを全 API から排除 | — | ○ get_active_user | △ service_role でバイパス | ✅ OK | 全 active エンドポイントに適用 |
| 未承認（pending/rejected）ユーザーを社交機能から排除 | ○ ChatGuard / OnboardingGuard | ○ get_approved_user（`auth/approved_user.py`）+ ws.py inline | △ | ✅ OK | 2026-06-03 [2.6] 適用。対象: GET /profiles・POST /likes/・GET/DELETE /matches/*・WS。GET /profiles/{id} は is_self 分岐あり（自己閲覧は pending でも許可） |
| メールドメイン制限 | ○ validation.ts | ○ DB トリガー enforce_university_email_domain | — | ✅ OK | クライアント+DB の二重 |
| ブロック相手を一覧から除外 | — | ○ browse/like/match/notifications | △ | ✅ OK | get_blocked_user_ids |
| ブロック相手へのいいね送信防止 | — | ○ POST /api/likes/ | △ | ✅ OK | 双方向 403 |
| ブロック相手とのチャット遮断 | — | ○ message _assert_match_member / ws | △ | ✅ OK | 403 / close 1008 |
| ブロック相手のプロフィール直リンク | — | ○ GET /api/profiles/{id} | △ | ✅ OK | 双方向 403 |
| ブロック解除を不可にする | ○ UI なし | ○ DELETE /safety/block 常に403 | ○ blocks_delete_own を 044 で DROP → DELETE ポリシーなし = デフォルト拒否 | ✅ OK | アプリ層 + RLS（ポリシー不在）の多層 |
| 写真審査 pending を他人から非表示 | ○ | ○ 不変条件（profile_image_path=approved のみ・[8.3]）+ browse(approved のみ) / detail(is_self 以外 approved + avatar 二重防御) | — | ✅ OK 2026-06-03 | Option B 実装済み。本人向けは pending 表示維持 |
| 退会済みユーザーを一覧から除外 | — | ○ status='approved' フィルタ | ○ messages 037 | ✅ OK | 詳細は 404。マッチは **実退会では CASCADE 即時消滅**（match.py の is_deleted 表示は seed のみ動作・実退会では matches ごと消える）→ [4.5] で設計レビュー要 |
| like_quota 直接操作の防止 | — | ○ service_role のみ | ○ 033 authenticated 不可 | ✅ OK | |
| 学生証画像の保護 | — | ○ admin のみ署名URL(5分) | — | ✅ OK | student-ids は Private |
| 同じ学部・学科の除外（身バレ防止） | — | ○ 全6経路（identity_hide に集約） | — | ✅ OK | 一覧は除外、詳細/いいね送信は 404。2026-05-27 全経路適用 |
| 同じサークルの除外（身バレ防止） | — | ○ 全6経路（identity_hide に集約） | — | ✅ OK | 同上 |
| プロフィール写真バケットの非公開化 | — | ○ コードは署名URL対応 | — | ✅ OK | prod バケット Private 化確認（`storage.buckets` で `public=false`・2026-05-27） |
| WebSocket token のログ露出防止 | — | ✗ 未対応 | — | ⚠️ 要監査 | クエリパラメータが Render ログに残りうる |

### ⚠️ 要監査の要点
1. **WebSocket token のログ露出**。`/ws/chat/{id}?token=JWT` の token が Render アクセスログに残りうる。

> 身バレ防止（学部・サークル）は 2026-05-27 に全6経路（`/profiles`・`/recommended`・`/profiles/{id}`・`/profiles/views`・`/likes/received`・`POST /likes/`）へサーバー側適用し解消。判定は `backend/app/core/identity_hide.py` に一本化（`is_hidden_between` / `get_hidden_user_ids_for` / `is_hidden_from_viewer`）。直リンク・いいね送信は 404（双方向ブロックの 403 とは別扱い）。

> profile-images バケットの Public 問題は 2026-05-27 に Private 化を確認し解消（`storage.buckets` で `public=false`）。

これらは STATUS.md「既知の問題」・HANDOFF.md「既知の技術的負債」・docs/ROADMAP.md にも反映済み。

---

## 8. マイグレーション一覧

Supabase SQL Editor で番号順に手動実行（ORM なし）。冪等性あり。新規は `041_*.sql` から採番。

| # | ファイル | 目的 / 対象 |
|---|---|---|
| 001 | profiles | profiles テーブル・RLS・handle_new_user / set_updated_at トリガー |
| 002 | profile_fields | name / year / faculty / bio |
| 003 | status | status 列（pending_review/approved/rejected） |
| 004 | student_id_fields | student_id_image_path / submitted_at |
| 005 | review_metadata | rejection_reason / reviewed_at |
| 006 | profile_image | profile_image_path |
| 007 | likes | likes テーブル + idx_likes_liked_id |
| 008 | matches | matches テーブル + detect_match トリガー |
| 009 | messages | matches PK を uuid 化 + messages テーブル |
| 010 | profile_images | profile_images テーブル |
| 011 | profile_extra_fields | interests / club / hometown / looking_for |
| 012 | safety_features | blocks / reports / hides |
| 013 | last_seen | last_seen_at / show_online_status |
| 014 | message_read | messages.read_at |
| 015 | profile_views | profile_views（足跡） |
| 016 | message_reactions | message_reactions（heart） |
| 017 | status_message | status_message / status_message_updated_at |
| 018 | notifications | notifications テーブル |
| 019 | login_history | login_history（⚠️ 未使用） |
| 020 | message_reply | messages.reply_to_id |
| 021 | faculty_clubs | department / clubs[] / admission_year / faculty_hide_level / hidden_clubs / identity_verified |
| 022 | profile_views_read | profile_views.confirmed_at |
| 023 | gender_flow | gender / interest_in / profile_completed |
| 024 | new_flow | profile_setup_completed / student_id_submitted |
| 025 | required_fields | real_name / student_number / onboarding_completed |
| 026 | add_birth_date | birth_date |
| 027 | remove_admission_year | admission_year 参照停止（DROP はしない） |
| 028 | like_quota_system | like_quota + should_count_quota + pg_cron |
| 029 | likes_receiver_read_at | likes.receiver_read_at |
| 030 | dismissed_likes | likes.dismissed_from_match |
| 031 | add_missing_indexes | 外部キー14個 + ブラウズ複合インデックス |
| 032 | push_subscriptions | push_subscriptions |
| 033 | like_quota_rls | like_quota の RLS 有効化（028 の脆弱性修正） |
| 034 | email_domain_check | enforce_university_email_domain トリガー |
| 035 | privacy_purge | age / real_name_hash / student_number_hash / privacy_purged_at |
| 036 | admin_extensions | reports 拡張 / banned 関連 / admin_logs / inquiries（※036 重複） |
| 036 | profile_images_status | profile_images.status（写真審査・※036 重複） |
| 037 | soft_delete | profiles.deleted_at + messages RLS（退会者隠蔽） |
| 038 | fix_blocks_rls | blocks_self を blocker_id のみに修正 |
| 039 | admin_warning_notification | notifications.type に admin_warning 追加 |
| 040 | normalize_blocks_rls | prod/dev の blocks RLS 差分を解消（blocks_self FOR ALL を操作別3本 SELECT/INSERT/DELETE に統一）。dev/prod 適用済み 2026-05-27（オーナー手動） |
| 041 | create_storage_buckets | profile-images / student-ids バケット作成（prod 同設定: Private/5MB/image/jpeg+png）。`ON CONFLICT (id) DO NOTHING` で冪等。dev/prod 適用済み 2026-05-27（dev は新規作成・prod は既存のため no-op）。両環境で `storage.buckets` の全カラム一致を確認。dev の HTTP 疎通（service_role upload→署名 URL→削除）も `scripts/storage_smoke_dev.ps1` で検証済み（200/200/200） |
| 042 | add_deleted_status | `profiles_status_check` に 'deleted' を追加（DROP + ADD・023/036 と同形・冪等）。退会バグ修正: `DELETE /api/profile/me`（`profile.py:772-786`）が `status='deleted'` を書くため CHECK 違反で 500 になっていた経路を解消。seed v2 No.10 deleted の 400 も解消。✅ **dev 適用日: 2026-06-02 確認済み（Supabase MCP で 'deleted' 含有確認）**・✅ **prod 適用日: 2026-06-02 確認済み（Supabase MCP で 'deleted' 含有確認）** |
| 043 | user_inventory | `user_inventory(user_id,item_type,quantity[0..10000],last_grant_date,timestamps)` PK 複合・`item_type CHECK IN ('like_stock')`・`profiles` 参照・service_role only RLS・`set_updated_at` トリガー流用・冪等（CREATE IF NOT EXISTS + `pg_policies` 重複チェック + ON CONFLICT）。末尾 one-shot で既存 male approved 全員に `like_stock=10` 初期付与（本番移行も兼ねる）。✅ **dev 適用日: 2026-06-01 以前（Supabase MCP introspection で存在・rls_enabled=true・policy_count=1 を 2026-06-01 確認）**・⚠️ **prod 適用日: 未適用（オーナー手動待ち）** |
| 044 | fix_rls_policies | 非 service_role ポリシー4本を DROP（再作成なし）: `hide_messages_with_deleted_user`〔messages・roles=public〕/ `match participants can view messages`〔messages・authenticated・prod 手動〕/ `blocks_delete_own`〔blocks・authenticated DELETE〕/ `reports_self`〔reports・authenticated ALL〕。調査でこれら全ポリシーは GRANT 層（anon/authenticated に SELECT/INSERT/DELETE なし）で実際には dead code だった（即時インシデントではなく将来 GRANT が誤追加された際のラッチン脆弱性）。フロントは supabase.from 非使用のため再作成不要（service_role 一本化）。冪等。**dev 適用日: 2026-06-02（MCP apply_migration）** / **prod 適用日: 2026-06-02（MCP apply_migration）** |
| 045 | revoke_anon_grants_dev | ⚠️ **DEV 専用・prod 適用不要**（prod は anon/authenticated に DML GRANT なし = 既にこの状態）。dev の Supabase デフォルト GRANT で anon/authenticated が全テーブルに SELECT/INSERT/UPDATE/DELETE を持っていた問題（3.3 調査で発見）を是正。`REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon, authenticated` + `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated`（postgres grantor 分）。supabase_admin grantor 分は権限不足で revoke 不可・マイグレーションは postgres ロールで実行するため新規テーブルへの影響なし。service_role の GRANT は完全に維持。**dev 適用日: 2026-06-02（MCP apply_migration）** / prod: 適用不要 |
| 046 | backfill_reviewed_at | approved かつ `reviewed_at=NULL` のユーザーに `COALESCE(submitted_at, created_at)` を設定。[4.1] で発見した「Supabase Studio 直接操作で approved にしたユーザーが privacy_purge バッチに永久スキップされる」穴を是正。冪等（WHERE で未処理行のみ対象）。dev 適用: 2026-06-02（MCP）/ prod 適用: 2026-06-02（オーナー手動）。適用後 `reviewed_at=NULL AND student_id_image_path IS NOT NULL = 0件` を両環境で確認済み |
| 047 | security_definer_cleanup | (A) `public.create_profile_for_user` を DROP（prod のみ実体・migration 管理外の手動 DDL 残骸・未使用・コード参照ゼロ確認済み）。(B) `public.detect_match` に `SET search_path = public`（SECURITY DEFINER + search_path 未固定の best practice 違反を是正）。(C) `like_quota` の `"service_role full access"` ポリシーを DROP（prod の重複2本を1本化・"service_role full access on like_quota" を残す・dev は no-op）。**dev 適用日: 2026-06-03（MCP apply_migration）** / **prod 適用日: 2026-06-03（オーナー手動）** |
| 048 | input_constraints | `profiles.student_number` に `profiles_student_number_format` CHECK 制約を追加（`NULL IS NULL OR (char_length BETWEEN 1 AND 20 AND ~ '^[A-Za-z0-9]+$')`）。NULL 許容で privacy_purge と矛盾なし。適用前に prod の規格外 student_number が COUNT=0 であることをオーナーが確認後に適用。アプリ層（Pydantic / Form）と二層で input 形式を保証。冪等（`IF NOT EXISTS`）。**dev 適用日: 2026-06-03**・**prod 適用日: 2026-06-03（オーナー手動・衝突チェック COUNT=0 確認済み）** |
| 049〜 | 未追加 | — |

> **適用状況の追跡**: 2026-05-27 時点、prod（`fspbzagpilhjorfdvtxe`）・dev（`hpkpndjqtzycnytymdkk`）の両環境で migration 035/037/038/039 の適用を schema introspection で確認済み（profiles の deleted_at/real_name_hash/student_number_hash/privacy_purged_at/age・blocks_self ポリシー＝blocker_id 限定・notifications CHECK の admin_warning）。新規マイグレーション追加時は dev / 本番それぞれの適用日をこの表に追記すること。
> **prod/dev 差分（解消）**: prod に存在していた migration 外の手動 RLS ポリシー `blocks_delete_own/insert_own/select_own`（dev には無かった）は、`040_normalize_blocks_rls.sql` を dev/prod に適用済み 2026-05-27（オーナー手動適用）で正規化。⚠️ blocks ポリシーが3本に収束した事実の post-apply schema 確認は次回。
> **storage バケット（解消）**: 以前は dev に storage バケットが未作成だったが、2026-05-27 に migration 041 で profile-images / student-ids を dev/prod 両方に作成（prod 同設定 Private/5MB/image/jpeg+png）。両環境で `storage.buckets` の全カラム（public/file_size_limit/allowed_mime_types/avif_autodetection/owner/owner_id/type）が一致することを SELECT で確認済み。storage の RLS ポリシーは prod/dev とも 0 件（バックエンドは service_role でアップロード＆署名 URL 生成＝RLS バイパスのため不要）。dev での service_role アップロード→署名 URL 取得→削除の HTTP 疎通を `scripts/storage_smoke_dev.ps1` で検証済み（upload=200 download=200 delete=200・2026-05-27）。
> **036 は番号重複**（admin_extensions と profile_images_status）。新規採番では 043 以降を使う。

---

## 9. 環境変数一覧（バックエンド）

`backend/app/core/config.py` を正とする。

| 変数 | 用途 | 例 / 既定 |
|---|---|---|
| SUPABASE_URL | Supabase API URL | https://xxx.supabase.co |
| SUPABASE_ANON_KEY | anon キー | — |
| SUPABASE_SERVICE_ROLE_KEY | service_role キー（バック専用・RLS バイパス） | — |
| DATABASE_URL | DB 接続文字列 | — |
| ALLOWED_ORIGINS | CORS 許可オリジン（カンマ区切り） | https://crocoweb.jp,https://www.crocoweb.jp |
| SECRET_KEY | アプリシークレット | `secrets.token_hex(32)` で生成 |
| RESEND_API_KEY | Resend API キー | — |
| FROM_EMAIL | 送信元 | noreply@crocoweb.jp |
| FRONTEND_URL | フロント URL（メールリンク用） | https://crocoweb.jp |
| VAPID_PUBLIC_KEY | Web Push 公開鍵 | — |
| VAPID_PRIVATE_KEY | Web Push 秘密鍵 | — |
| VAPID_EMAIL | VAPID 連絡先（`mailto:`） | mailto:admin@example.com |
| PRIVACY_HASH_SALT | PII ハッシュ化ソルト（purge に必須） | — |
| LIKE_QUOTA_ENABLED | BeReal型受信枠（女性5件/日・男性向け閲覧フィルタ）の ON/OFF。β は未設定＝False（受信制限オフ・閲覧制限オフ・男性に送信在庫`user_inventory`が発動）。True にすると `like_quota` 受信枠と男性向け like_quota フィルタが復活する（pg_cron `generate-like-quota` は drop していない） | （未設定） |
| ADMIN_EMAILS | 管理者メール（カンマ区切り・小文字比較） | a@ecs.osaka-u.ac.jp,b@... |

> 注意: `config.py` が読むのは `VAPID_EMAIL`（`VAPID_ADMIN_EMAIL` ではない）。`PRIVACY_HASH_SALT` が未設定だとハッシュ値が NULL になる（バッチ削除は継続・平文は消えるが hash が NULL になり再登録検出の指紋が失われる）。[4.3] 確認済み。

### フロントエンド環境変数（Vercel）
| 変数 | 用途 |
|---|---|
| VITE_API_URL | バックエンド URL |
| VITE_SUPABASE_URL | Supabase URL |
| VITE_SUPABASE_ANON_KEY | anon キー |
| VITE_GA_MEASUREMENT_ID | GA4 測定 ID（例: G-XXXXXXXXXX）。未設定なら GA 機能は完全 no-op。本番 Production 環境にのみ設定する（dev/Preview では `import.meta.env.PROD=false` のため自動スキップ） |

> フロントに管理者リスト（VITE_ADMIN_EMAILS 等）は置かない。AdminGuard は `GET /api/admin/pending` の試行で判定する。

---

## 10. 番人ツール（自動の番人）

リリース前セキュリティの逸脱を機械で見張る2本。いずれもローカル実行（デプロイ対象外・dev/prod 両 DB を読むだけ）。

### ① check_rls_drift.ps1（RLS/GRANT ドリフト検知）

- **実行**: `.\scripts\check_rls_drift.ps1 -Target dev`（または `-Target prod`）
- **構成**: 本体 `scripts/check_rls_drift.ps1` ＋ `scripts/_rls_query.py`（pg8000 直結）＋ `scripts/rls_allowlist.json`（許可リスト・全26ポリシー網羅）
- **終了コード**: 0=CLEAN / 1=DRIFT（逸脱検知） / 2=ERROR（接続失敗・取得0件 ＝ 番人が嘘をつかないためのサニティ停止）
- **検査7項目**: (i) anon/authenticated/public への DML GRANT (ii) 許可リスト外ポリシー (iii) 許可リスト外 PERMISSIVE 非 service_role ポリシー (iv) SECURITY DEFINER search_path 未固定 (v) RLS 無効テーブル ＋（消失検知）service_role ALL 欠如・SECURITY DEFINER 関数欠如
- **依存**: `backend/.venv` に pg8000（`pip install pg8000`）・`backend/.env` に `DEV_DATABASE_URL` / `PROD_DATABASE_URL`（Session pooler URI 形式）
- **接続要件**: Direct(5432)/Transaction pooler(6543) は IPv6 経路。IPv4 のみの回線（特定 Wi-Fi 等）からは到達不可 → IPv4 で 5432 が通る回線（テザリング等）から Session pooler URI（`postgres.<project_ref>@...pooler.supabase.com:5432`）を使う。接続文字列は認証情報のためチャットに貼らない・取り扱いはオーナー手作業
- **許可リスト更新**: `rls_allowlist.json` の `policies` 配列に追記 ＋ HANDOFF §6 に理由記録（→ CLAUDE.md §4「新機能追加チェックリスト」B-5）

### ② semgrep CE（SAST・静的解析）

```powershell
# backend
$env:PYTHONUTF8="1"
semgrep --config p/default --config p/python --config p/security-audit --config p/owasp-top-ten --config p/secrets --metrics off backend/app

# frontend
semgrep --config p/default --config p/python --config p/security-audit --config p/owasp-top-ten --config p/secrets --config p/javascript --config p/typescript --config p/react --metrics off --exclude node_modules --exclude dist --exclude build frontend/src
```

- **依存**: `uv tool install semgrep`（CE・ログイン不要・¥0）。`--no-git-ignore`（必要に応じて追加）
- **基準**: findings 0件 ＝ 既知パターン不在。canary 6パターンでエンジン健全性を確認（詳細は HANDOFF §6 [11.3]）
- **CE 未カバーの3盲点**: コマンド注入（subprocess 文字列結合）・PostgREST フィルタ注入（`.or_()` 生文字列）・汎用キー形式直書き ＝ いずれも grep ＋ CLAUDE.md §4 設計原則で別途対応済み
