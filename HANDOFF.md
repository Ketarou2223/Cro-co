# Cro-co 開発引き継ぎドキュメント

最終更新日: 2026-05-27
（実コードを直接確認した事実のみ記載。推測は含まない。未検証は ⚠️ で明示する）

---

## 1. 引き継ぎの要点（最初に読む）

- **プロジェクト**: `@ecs.osaka-u.ac.jp` 限定の阪大学部生マッチングアプリ（Web）。個人開発。
- **現フェーズ**: βリリース前セキュリティ修正 + 法務整備（終盤）。機能はほぼ実装済み。
- **絶対ルール・触らないファイル・デザインシステム**: `CLAUDE.md` を正とする。
- **API 一覧・DB スキーマ・どこで弾くか・マイグレーション・環境変数**: `docs/ARCHITECTURE.md` を正とする。
- **残タスク・セキュリティ Step・リリース前チェックリスト**: `docs/ROADMAP.md` を正とする。
- **進捗の俯瞰・コスト**: `STATUS.md` を正とする。

技術スタック概要: フロント React 19 + Vite + TS（Vercel）、バック FastAPI + Python 3.14（Render）、DB/Auth/Storage Supabase、メール Resend。ORM なし・Supabase service_role でアクセス。

---

## 2. 開発フロー

- 開発は `dev` ブランチ → push → Vercel Preview で確認 → GitHub で PR → 自分でレビューしてマージ → `main` で本番デプロイ
- main は Branch Protection で直接 push 禁止（PR 経由のみ）
- migration は dev / 本番の両 Supabase に SQL Editor で手動適用が必要。適用状況は docs/ARCHITECTURE.md のマイグレーション表で追跡する

### 環境分離（2026-05-25 構築完了）

| 環境 | Supabase | Render | Vercel | VAPID |
|---|---|---|---|---|
| prod | 本番プロジェクト | cro-co-backend (api.crocoweb.jp) | Production | 本番キー |
| dev | hpkpndjqtzycnytymdkk | cro-co-api-dev.onrender.com | Preview（dev 変数設定済み） | dev キー |

---

## 3. 実装済み機能の客観的事実

| 機能 | フロント | バックエンド | 備考 |
|---|---|---|---|
| サインアップ / ログイン / メール確認 | ✅ | ✅ | Supabase Auth。ドメイン制限は DB トリガー `enforce_university_email_domain`（migration 034）でも強制 |
| パスワードリセット | ✅ | ✅ | `/reset-password` |
| オンボーディング（必須→任意→PWA→通知→完了） | ✅ | ✅ | `OnboardingGuard` が `student_id_submitted` / `onboarding_completed` で誘導 |
| 学生証アップロード・審査フロー | ✅ | ✅ | `student-ids` バケット（Private）。EXIF 削除済み |
| プロフィール編集・写真（最大6枚・写真審査） | ✅ | ✅ | `profile_images.status` pending/approved/rejected |
| ユーザー一覧（さがす・検索バー + 詳細検索） | ✅ | ✅ | 2026-05-27 刷新: bio 検索バー + 詳細検索（学年複数/文理/出身地複数/並び替え）。学部学科は直接検索せず文理で弾く。検索条件は全てサーバー適用。身バレ防止は全6経路に適用済み（identity_hide.py） |
| おすすめ（HomePage） | ✅ | ✅ | `GET /api/profiles/recommended`（興味スコア順・最大5件） |
| プロフィール詳細 | ✅ | ✅ | `GET /api/profiles/{user_id}`・双方向ブロックで 403 |
| いいね送受信・取り消し（dismiss）・既読 | ✅ | ✅ | マッチ自動成立は `detect_match` トリガー |
| BeReal型いいね受信枠（5件/日・女性のみ） | ✅ | ✅ | `like_quota` + `should_count_quota` RPC + pg_cron 日次生成。フロントは `HomePage.tsx:350-386` の受信枠カード（`GET /api/likes/quota`）。確認 2026-05-27 |
| マッチ一覧・解除（unmatch） | ✅ | ✅ | 退会相手は匿名化して表示（is_deleted） |
| チャット（WebSocket + ポーリング fallback） | ✅ | ✅ | リアクション・リプライ・既読・タイピング通知あり |
| 足跡（プロフィール閲覧履歴） | ✅ | ✅ | `GET /api/profiles/views`・confirmed_at で既読管理 |
| いいね受信一覧 | ✅ | ✅ | `GET /api/likes/received` |
| 通知タブ | ✅ | ✅ | match/like/view/message/admin_warning |
| ブロック / 通報 / 非表示 | ✅ | ✅ | ブロックは解除不可（CLAUDE.md セクション9）。多層防御済み |
| 管理者ダッシュボード | ✅ | ✅ | Overview / Pending / PhotoReview / Reports / Inquiries / Logs / Users タブ |
| PWA（インストール誘導・更新バナー） | ✅ | — | |
| Web Push 通知（VAPID） | ✅ | ✅ | `push_subscriptions` テーブル |
| 問い合わせ機能 | ✅ | ✅ | `inquiries` テーブル |
| 退会・PII 削除（privacy_purge バッチ） | — | ✅ | APScheduler 毎日 03:00 JST |
| プライバシーポリシー・利用規約ページ | ✅（施行日仮） | — | `/privacy` `/terms` |

### 認証の実装メモ
- `get_current_user`（`auth/dependencies.py`）: JWT を `supabase.auth.get_user` で検証
- `get_active_user`（`auth/active_user.py`）: 上記をラップし `status='banned'` を全エンドポイントで 403 ブロック。ほぼ全 API がこれを使用
- `require_admin`（`auth/dependencies.py`）: `current_user.email` を `settings.admin_emails`（`ADMIN_EMAILS` CSV）と照合。admin.py の全エンドポイントで使用

### 退会・PII 削除フロー
- `DELETE /api/profile/me`: Storage の写真・学生証を物理削除 → `profile_images` 物理削除 → `profiles` をソフトデリート（`status='deleted'` + PII 即時クリア）→ `auth.users` 削除
- `privacy_purge` バッチ（`core/privacy_purge.py`）: 承認後3日で PII 削除（ハッシュ保持）、却下後30日で同様、退会後30日でメッセージ物理削除、ハッシュは1年後に削除
- ハッシュ化には `PRIVACY_HASH_SALT` 環境変数が必須（未設定だとハッシュ化を中止）

---

## 4. 進行中・未実装タスク

βリリースまでのフローは docs/ROADMAP.md セクション8。下記はそこから抽出した未着手項目。

**Step 1（機能・UI 完成・β前必須）:**
- ✅ 身バレ防止を全経路サーバー側で適用（2026-05-27・`identity_hide.py` で6経路に反映。⚠️ dev 実機 curl 検証は未実施）
- ⬜ 非表示一覧ページ新設
- ⬜ ブロック一覧を別ページへ分離
- ✅ 探索タブ UI 改善（2026-05-27・検索バー + 詳細検索 + 文理検索。⚠️ 実 HTTP curl は未実施＝下記設計判断ログ参照）
- ⬜ プロフィール見え方改善（探索条件は文理化したが、プロフィール表示の学部学科文理化は別タスク・ROADMAP セクション5 参照）
- 🔜 アプリアイコン（画像ファイル作成待ち）

**Step 2（β明記）:**
- ⬜ ランディングと初回登録最初に「β版」明記（文面は Code 側決定）

**Step 3（セキュリティ）:**
- ⚠️ Step 10 のテスト証跡整備（2026-05-26 オーナー目視確認済み・記録なし）
- ⬜ ROADMAP セクション7 のリリース前セキュリティチェックリスト全項目

**Step 4（実機テスト）:**
- ⬜ Resend メール到達の実機確認
- ⬜ E2E シナリオを記録付きで再実施

**Step 5（法務 + クリーンアップ）:**
- ⬜ PP・利用規約の施行日プレースホルダーを弁護士確認後に確定
- ⬜ Supabase 内のお試しデータを全削除

**β後送り:**
- ⬜ migration 040 post-apply 検証（blocks ポリシー3本収束を schema で確認）
- ⬜ 最終オンライン時刻表示
- ⬜ Render アクセスログで WebSocket `token` クエリパラメータの露出防止
- ⬜ `login_history` の書き込み実装 or テーブル削除判断

詳細・完了済み Step は docs/ROADMAP.md。

---

## 5. 既知の技術的負債

| 種別 | 内容 |
|---|---|
| ⚠️ 運用 | dev / 本番の SQL マイグレーション適用が手動。035/037/038/039 は両環境で適用確認済み（2026-05-27）。040 は 2026-05-27 にオーナーが dev/prod 手動適用（3本収束の schema 確認は次回）。041（storage バケット作成）は 2026-05-27 に dev/prod へ適用し両環境の `storage.buckets` 一致を確認・dev の HTTP 疎通も `scripts/storage_smoke_dev.ps1` で検証済み（200/200/200）。新規分は引き続き手動・docs/ARCHITECTURE.md の表で追跡 |
| ✅ 解消（2026-05-27） | dev に storage バケット（profile-images / student-ids）が未作成だった問題。migration 041 で dev/prod 両方に作成（prod 同設定 Private/5MB/image/jpeg+png）。dev での service_role アップロード→署名 URL→削除の HTTP 疎通を `scripts/storage_smoke_dev.ps1` で検証済み（upload=200 download=200 delete=200・2026-05-27）。dev/prod を migration ファイルだけで再現可能な状態に到達 |
| ✅ 解消（2026-05-27） | 身バレ防止（同じ学部・サークル除外）を全6経路サーバー側で適用。`backend/app/core/identity_hide.py` に判定を一本化し、`/profiles`・`/recommended`・`/profiles/{id}`・`/profiles/views`・`/likes/received`・`POST /likes/` に反映。直リンク・いいね送信は 404 |
| ⚠️ 未使用 | `login_history` テーブル（migration 019）は作成済みだが書き込みコードが存在しない |
| 🐛 未修正 | WebSocket `token` クエリパラメータが Render ログに露出しうる |
| 📝 内容未確定 | PP / 利用規約の施行日がプレースホルダー（弁護士確認後） |
| 🔜 未実装 | Stripe 課金（本番リリース前） |

---

## 6. 設計判断ログ（時系列・追記のみ）

- **2026-05-27**: dev 環境構築タスクを完了。下記を実施: (1) migration 041 で profile-images / student-ids バケットを dev/prod 両方に作成（prod と完全同設定）。(2) `PRIVACY_HASH_SALT` を dev Render に追加（本番と別値）。(3) `scripts/storage_smoke_dev.ps1` を新設し dev Storage の疎通を service_role で検証（upload=200 download=200 delete=200）。(4) GitHub Branch Protection は新形式 Repository Rulesets で実装済み・実質 DEPLOY.md 想定を満たすことを確認（Require PR・approvals=0・bypass 不可・deletion 禁止・force push 禁止。Dismiss stale approvals は OFF だが approvals=0 のため無害）。(5) dev/prod を migration ファイルだけで再現可能な状態に到達。これにより前回 ⚠️ としていた「dev での service_role 経由アップロード→署名 URL の HTTP 疎通」と「GitHub Branch Protection 現状確認」の2点が解消。
- **2026-05-27**: dev に profile-images / student-ids バケットを作成（prod と完全同設定: Private/`file_size_limit=5242880`/`allowed_mime_types={image/jpeg,image/png}`/`avif_autodetection=false`/`owner=null`/`type=STANDARD`）。**migration 041 として SQL 化**（B-1 採用）。理由: Supabase 公式が `storage.buckets` への直 INSERT を第一級の手段として明記（「Create a bucket」の SQL タブ / self-hosting 移行ガイドの `ON CONFLICT (id) DO NOTHING` 冪等パターン）しており、`auth.users` のような Dashboard 専用テーブルではない。STANDARD バケットは `storage.buckets` の1行で完結し付随メタデータの分散もない。Step A のフィージビリティ調査結果を報告しオーナーが B-1 を選択。dev（新規作成）/prod（既存のため no-op）の両方に冪等 INSERT を適用し、両環境で `storage.buckets` 全カラムが一致することを SELECT で確認。storage の RLS ポリシーは prod/dev とも 0 件（service_role でアップロード＆署名 URL 生成＝RLS バイパスのため不要）。これにより設計判断「dev/prod を migration ファイルだけで完全再現」が storage まで到達。✅ **検証済み**（2026-05-27 更新）: dev での service_role 経由アップロード→署名 URL 取得→削除の HTTP 疎通を `scripts/storage_smoke_dev.ps1` で実行し upload=200 download=200 delete=200 を確認。✅ **確認済み**（2026-05-27 更新）: GitHub Branch Protection は新形式 Repository Rulesets で実装済みであることを確認（Require PR・approvals=0・bypass 不可・deletion 禁止・force push 禁止。Dismiss stale approvals は OFF だが approvals=0 のため無害）。設定変更は一切行っていない。
- **2026-05-27**: 探索タブ（BrowsePage）を「タグ式絞り込み」から「検索バー + 詳細検索」形式に刷新。検索バーは自己紹介（bio）部分一致。詳細検索は **学年（複数・1/2/3/4年以上）/ 文理（文系/理系/不問）/ 出身地（複数）/ 並び替え（新着・最終ログイン・学年）**。**学部学科を直接の検索条件にはせず文理（`backend/app/core/faculty_classification.py`）で弾く**（身バレ低減）。検索条件は全てサーバー側（`GET /api/profiles` の `years`/`science_humanities`/`hometowns`/`bio_keyword`/`sort_by`）で適用し、フロントを介さない curl 直叩きでも回避できない。`bio_keyword` は `_sanitize_bio_keyword` で `%` `_` `\` をエスケープ・`*` を除去し、ワイルドカードによる全件マッチを防止。`last_seen` 並び替えは postgrest-py 0.19.x が `nullsfirst=False` を NULLS LAST に変換しないため `order("last_seen_at.desc.nullslast")` で直接指定（未ログイン者を末尾へ）。旧 `faculty`（部分一致）・単一 `year` パラメータは廃止。出身地候補は新設 `GET /api/profiles/hometowns`（承認済みに実在する都道府県の重複なし一覧）で取得。検索履歴は localStorage `crocoBrowseHistory`（直近5件・復元可・ログアウトで `clearSensitiveStorage` がクリア）のみで DB 変更なし。検証: dev に承認済みシード9件を投入し、学年/文理/出身地/bio の絞り込み・SQLi/ワイルドカード耐性（`'`/`%`/`_` を含むキーワードで全件マッチしないこと）・身バレ/ブロック維持を SQL レベルで全件確認（期待値と一致）。生成される PostgREST クエリ（`or=(year.in.(1),year.gte.4)`・`bio=ilike.%100\%%`・`last_seen_at.desc.nullslast`・`hometown=not.is.null`）を dev へ実送信し HTTP 200 で構文受理を確認。⚠️ FastAPI エンドポイント自体の実 HTTP curl は未実施（ローカルに dev service_role キーがなくバックエンドをローカル起動できず、dev Render は変更前コードを配信中）。シードデータはクリーンアップ済み。
- **2026-05-27**: 身バレ防止を全経路サーバー側で適用。`backend/app/core/identity_hide.py` を新規作成し判定を一本化（`is_hidden_between` 予測関数 / `get_hidden_user_ids_for` 一括取得 / `is_hidden_from_viewer` 単一判定）、6エンドポイント（`/profiles`・`/recommended`・`/profiles/{id}`・`/profiles/views`・`/likes/received`・`POST /likes/`）に反映。直リンク・いいね送信は **404**（「存在しない」として隠す。双方向ブロックの 403 とは別扱い・身バレ判定をブロック判定より前に置き「ブロックの有無」を漏らさない）。`list_profiles` は挙動を変えないため既存どおり候補を Python フィルタするが、インライン条件を `is_hidden_between` に差し替え（40,000 ペアで旧ロジックと完全一致を確認）。`/recommended`・`/views`・`/received` は `get_hidden_user_ids_for` で一括除外（各1回呼び出し・N+1 なし）。フォールバックは既存 browse.py を踏襲（faculty/clubs が None/空なら該当条件は不成立＝隠さない）。⚠️ dev 実機 curl 検証は未実施（テストアカウントの JWT 未保有）。
- **2026-05-27**: クローズドテスト（6月末予定）を廃止しβリリース一本に集中する方針決定。理由: クローズドテストとβの境界が曖昧で運用負担が増えるため。STATUS / ROADMAP のマイルストーン表からクローズドテスト行を削除。
- **2026-05-27**: 身バレ防止（同じ学部・サークル除外）を `GET /api/profiles` 以外にも全経路サーバー側で適用する方針決定（`/recommended`・プロフィール詳細・足跡・いいね受信）。理由: ID 直リンクや足跡経由で見えうる漏れ穴があり、β前に塞ぐ。フロント側で隠す対応ではなくサーバー側で 403 or フィルタする実装にする（クライアントを通さない直叩きでも漏れない）。
- **2026-05-27**: β版である旨の明記方針決定。ランディングと初回登録の最初の画面に「β版です・予期せぬ不具合が起こる可能性があります」を**さらっと**表示する（個人情報保護は通常通り行うため、過度な不安を煽る文言は避ける）。同意チェックボックスは置かない。文面と配置は Claude Code 側で決定。
- **2026-05-27**: prod の blocks テーブルに dev に無い手動 RLS ポリシー（blocks_select_own/insert_own/delete_own）が存在することを発見。出所不明（オーナーは追加した記憶なし・Claude Code が過去に追加した可能性）。`040_normalize_blocks_rls.sql` を切り、038 の blocks_self（FOR ALL）を DROP して操作別の3本（SELECT/INSERT/DELETE 各 blocker_id 限定）に統一。意図: dev/prod を migration ファイルだけで完全に再現できる状態にし、UPDATE を暗黙禁止することで最小権限の原則に近づける。
- **2026-05-27**: profile-images バケットの Private 化を Supabase `storage.buckets` で確認（`profile-images public=false`）。コード側は 2026-05-25 に署名付き URL（`image_utils.get_signed_image_url`）へ全切替済み。本日バケット設定で最終確認。
- **2026-05-27**: BeReal型いいね受信枠のフロント UI は `HomePage.tsx:112-124`（`GET /api/likes/quota`）+ `350-386`（受信枠カード）に実装済みであることを確認。旧記載「⚠️ UI 未実装」は誤りだったため ✅ に訂正。
- **2026-05-27**: 本番（`fspbzagpilhjorfdvtxe`）/ dev（`hpkpndjqtzycnytymdkk`）両 Supabase で migration 035/037/038/039 の適用を schema introspection で確認（profiles 列・blocks_self ポリシー・notifications CHECK・storage.buckets）。あわせて prod に migration 外の手動 RLS ポリシー `blocks_delete_own/insert_own/select_own`（全て `blocker_id` 限定で無害）が存在し dev には無い差分を発見。dev には storage バケットが未作成。
- **2026-05-27**: ブロック・通報・退会・BAN の E2E はオーナーが完了報告。⚠️ リポジトリに E2E テスト・実機ログが無いため未検証扱いとする。
- **2026-05-27**: ドキュメントを4ルート + docs/4 + archive に再構築。md 管理ルールを CLAUDE.md に明文化。理由: ファイルの役割が曖昧で更新漏れが起きていたため。「どこで何を弾いているか」を ARCHITECTURE.md のマトリックスで一元管理することにした。
- **2026-05-26**: ブロックは解除不可仕様にした。理由: 個人開発でサポート対応コストを下げるため。誤ブロックは管理者が Supabase で直接対応。
- **2026-05-26**: 通報「警告して終了（action_taken=warning, status=resolved）」時に通報相手へシステム通知を送る。migration 039 で通知 type に `admin_warning` を追加。
- **2026-05-25**: console.log drop（vite.config.ts）を一旦削除（コミット `553ace1`）。理由: Vite 8 + esbuild の型問題でビルドが不安定だったため。βリリース優先。
- **2026-05-25**: `profile-images` を署名付き URL（`image_utils.get_signed_image_url`）に全ルーター切り替え。`_public_image_url()` は削除。理由: バケット Private 化への準備。
- **2026-05-25**: ProfileResponse から `student_id_image_path` を削除。理由: 機密フィールドのレスポンス露出防止。
- **2026-05-25**: matches の PK を複合キーから単一 uuid（id）に変更し、(user_a_id,user_b_id) は UNIQUE 制約として残す（migration 009）。`detect_match` の ON CONFLICT がこの UNIQUE を使用。
- **当初設計**: matches は `user_a_id < user_b_id`（LEAST/GREATEST）で正規化し重複ペアを防止。マッチ自動成立は likes INSERT トリガー `detect_match`。管理者判定は `backend/.env` の `ADMIN_EMAILS` のみ（フロントに管理者リストを置かない）。

---

## 7. 詳細情報へのポインタ

- API 全エンドポイント（file:line・認証・ブロックフィルタ）→ docs/ARCHITECTURE.md セクション2
- DB スキーマ・RLS → docs/ARCHITECTURE.md セクション3・4
- フロント-バック対応・どこで弾くか → docs/ARCHITECTURE.md セクション5・7
- マイグレーション一覧・適用状況 → docs/ARCHITECTURE.md セクション8
- 環境変数 → docs/ARCHITECTURE.md セクション9
- デプロイ手順 → docs/DEPLOY.md
- 残タスク・チェックリスト → docs/ROADMAP.md
