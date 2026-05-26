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
| ユーザー一覧（さがす・年次/学部/並び替えフィルター） | ✅ | ✅ | 身バレ防止フィルタはこの一覧のみ（後述の負債参照） |
| おすすめ（HomePage） | ✅ | ✅ | `GET /api/profiles/recommended`（興味スコア順・最大5件） |
| プロフィール詳細 | ✅ | ✅ | `GET /api/profiles/{user_id}`・双方向ブロックで 403 |
| いいね送受信・取り消し（dismiss）・既読 | ✅ | ✅ | マッチ自動成立は `detect_match` トリガー |
| BeReal型いいね受信枠（5件/日・女性のみ） | ⚠️ UI 未実装 | ✅ | `like_quota` + `should_count_quota` RPC + pg_cron 日次生成 |
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

- ⬜ セキュリティ Step 10: ブロック・通報・退会・BAN の E2E 確認（⚠️ 未実施）
- ⬜ セキュリティ Step 7 残り: `profile-images` バケットの Public → Private 化（Supabase ダッシュボード手動作業）
- ⬜ セキュリティ Step 12: βリリース前最終チェック（ROADMAP のチェックリスト照合）
- ⬜ Render アクセスログで WebSocket `token` クエリパラメータの露出防止（Step 8 残り）
- ⬜ BeReal型受信枠のフロントエンド UI 実装
- ⬜ PP・利用規約の施行日プレースホルダーを弁護士確認後に確定

詳細・完了済み Step は docs/ROADMAP.md。

---

## 5. 既知の技術的負債

| 種別 | 内容 |
|---|---|
| ⚠️ 運用 | dev / 本番の SQL マイグレーション適用が手動。適用漏れリスクあり。docs/ARCHITECTURE.md の表で追跡 |
| ⚠️ セキュリティ | `profile-images` バケットが Public（コードは署名付き URL 切り替え済み・バケット設定が残り） |
| ⚠️ 仕様（要監査） | 身バレ防止（同じ学部・サークル除外）が `GET /api/profiles` のみ実装。`/recommended`・詳細・足跡・いいね受信には未適用。直リンク・足跡経由で見えうる |
| ⚠️ 未使用 | `login_history` テーブル（migration 019）は作成済みだが書き込みコードが存在しない |
| 🐛 未修正 | WebSocket `token` クエリパラメータが Render ログに露出しうる |
| ⚠️ 仕様未実装 | BeReal型受信枠のフロント UI 未実装（バックエンドは完了） |
| 📝 内容未確定 | PP / 利用規約の施行日がプレースホルダー（弁護士確認後） |
| 🔜 未実装 | Stripe 課金（本番リリース前） |

---

## 6. 設計判断ログ（時系列・追記のみ）

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
