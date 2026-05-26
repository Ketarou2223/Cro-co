# Cro-co 開発引き継ぎドキュメント

最終更新日: 2026-05-25
（実コードを直接確認した事実のみ記載。推測は含まない）

---

## プロジェクト概要

大阪大学（@ecs.osaka-u.ac.jp）限定マッチングアプリ（Web 版）。個人開発。

| 役割 | サービス | URL |
|---|---|---|
| フロントエンド | Vercel | https://crocoweb.jp |
| バックエンド | Render | https://api.crocoweb.jp |
| DB / Auth / Storage | Supabase | — |
| メール | Resend | noreply@crocoweb.jp |

---

## サービス規模

- **対象**: 大阪大学学部生（`@ecs.osaka-u.ac.jp`）
- **母数**: 約12,000人（1学年 約3,000人 × 4学年）
- **想定 DAU 目安**:

| フェーズ | 目安 |
|---|---|
| クローズドテスト | 10〜30人 |
| β | 50〜100人 |
| 本番初期 | 100〜300人 |
| 課金導入トリガー | 登録200人到達 |
| 他大学展開トリガー | 登録100人到達（神戸大・関西大候補） |

---

## 現在のフェーズ

**βリリース前セキュリティ修正 + 法務整備（終盤）**

- Step 0（セキュリティ監査）: ✅ 完了（2026-05-24）
- Step 1（privacy_purge バッチ確認）: ✅ 完了（2026-05-25）
- Step 2（dev/prod 環境分離）: ✅ 完了（2026-05-25）
- Step 3（ProfileResponse 機密フィールド整理）: ✅ 完了（2026-05-25）
- Step 4（ログアウト・退会クリーンアップ統一）: ✅ 完了（2026-05-25）
- Step 5（blocks RLS 修正）: ✅ 完了（dev 適用済み・⚠️ 本番手動適用が残り）
- Step 6（ブロック 403）: ✅ 完了（2026-05-25）
- Step 7-a（EXIF 削除・署名付き URL ヘルパー）: ✅ 完了（2026-05-25）
- Step 7-b（profile-images 署名付き URL 切り替え）: ✅ 完了（2026-05-25）
- Step 7（バケット Private 化）: ⬜ 未着手（Supabase ダッシュボード手動作業）
- Step 8（細かい修正）: ✅ 完了（Render ログのクエリパラメータ除外は残り）
- Step 9（Resend メール認証）: ✅ 完了（2026-05-25）
- Step 10（安全機能 E2E 確認）: ⬜ 未着手
- Step 11（PP・利用規約実装）: ✅ 完了（施行日プレースホルダーは弁護士確認後）
- Step 12（βリリース前最終チェック）: ⬜ 未着手

次にやること: **Step 10（安全機能 E2E 確認）** または **Step 7（バケット Private 化）**

### βリリース方針

- β中は**完全無料**（ユーザー獲得優先・課金は登録200人到達後に検討）
- β中に課金を導入しない（炎上リスクが高いため絶対にやらない）
- 「動く・壊れない・運営できる」+α に絞って機能追加
- 月の運営コスト目標: **1,000円以下**（Supabase / Render / Resend の Free Tier 最大活用）

---

## 完了済み機能一覧

| 機能 | フロント | バックエンド |
|---|---|---|
| サインアップ / ログイン / メール確認 | ✅ | ✅ |
| パスワードリセット | ✅ | ✅ |
| オンボーディング（6ステップ） | ✅ | ✅ |
| 学生証アップロード・審査フロー | ✅ | ✅ |
| プロフィール編集 | ✅ | ✅ |
| プロフィール写真（最大6枚・写真審査） | ✅ | ✅ |
| ユーザー一覧（/browse・年次/学部フィルター） | ✅ | ✅ |
| プロフィール詳細（/profile/:id） | ✅ | ✅ |
| いいね送受信・取り消し | ✅ | ✅ |
| BeReal型いいね受信枠（5件/日・女性のみ） | ❌ UI 未実装 | ✅ |
| マッチ一覧 | ✅ | ✅ |
| チャット（WebSocket + ポーリング fallback） | ✅ | ✅ |
| 足跡（/footprints） | ✅ | ✅ |
| いいね受信一覧（/likes/received） | ✅ | ✅ |
| 通知タブ（/notifications） | ✅ | ✅ |
| ブロック / 通報 / 非表示 | ✅ | ✅ |
| 管理者ダッシュボード（ユーザー審査・写真審査・BAN・通報・ログ・統計） | ✅ | ✅ |
| PWA（インストール誘導） | ✅ | — |
| Web Push 通知（VAPID） | ✅ | ✅ |
| 問い合わせ機能 | ✅ | ✅ |
| privacy_purge バッチ（毎日 03:00 JST） | — | ✅ |
| プライバシーポリシー・利用規約ページ | ✅（仮） | — |

---

## 直近完了タスク（2026-05-24〜25）

### Step 0: セキュリティ監査（完了 2026-05-24）
- Supabase RLS を全16テーブルで確認（全テーブル有効）
- バックエンド全エンドポイント監査 → `docs/archive/SECURITY_AUDIT_BACKEND.md`
- フロント監査（Supabase 直叩き・退会完全性・学生証保管）→ `docs/archive/SECURITY_AUDIT_PHASE2.md`

### Step 1: privacy_purge バッチ確認（完了 2026-05-25）
- `main.py` の APScheduler で毎日 03:00 JST に `run_purge_batch()` が登録済み
- `misfire_grace_time=3600` でスリープ明け1時間以内に実行保証
- 手動トリガー `POST /api/admin/privacy-purge/run` を追加
- 本番動作ログ確認: 2026-05-25T04:07:51 JST、status=completed、failed=0

### Step 2: dev/prod 環境分離（完了 2026-05-25）
- GitHub `dev` ブランチ作成済み
- Supabase dev プロジェクト作成（project_id: `hpkpndjqtzycnytymdkk`）・全マイグレーション適用済み
- Render dev サービス（https://cro-co-api-dev.onrender.com）作成済み
- Vercel 環境変数を Production / Preview(dev) に分離済み
- VAPID キーを dev/prod 別々に生成済み

### Step 3: ProfileResponse 機密フィールド整理（完了 2026-05-25）
- `student_id_image_path` を `ProfileResponse`（`schemas/profile.py`）から削除
- browse.py は元から機密フィールドを SELECT していないことを確認

### Step 4: ログアウト・退会クリーンアップ統一（完了 2026-05-25）
- `frontend/src/lib/db.ts` に `clearSensitiveStorage()` を追加
- `SettingsPage.tsx` / `HomePage.tsx` / `PendingPage.tsx` / `RejectedPage.tsx` の全ログアウト経路で実行

### Step 5: blocks RLS 修正（完了、本番適用残り）
- `038_fix_blocks_rls.sql` で `blocks_self` ポリシーを修正（blocker_id のみに操作を制限）
- ⚠️ 本番 Supabase への手動適用が残っている

### Step 6: ブロック相手に 403（完了 2026-05-25）
- `browse.py` の `get_profile` に b1/b2 ブロックチェックを追加（`is_self=False` のときのみ）

### Step 7-a: EXIF 削除・署名付き URL ヘルパー（完了 2026-05-25）
- `requirements.txt` に `Pillow>=10.0` 追加
- `profile.py` に `_strip_exif` / `_signed_image_url` を追加
- `upload_student_id` / `upload_avatar` / `upload_photo` の3箇所で EXIF 削除を実装

### Step 7-b: profile-images 署名付き URL 切り替え（完了 2026-05-25）
- `backend/app/core/image_utils.py` を新規作成（`get_signed_image_url` ヘルパー）
- 全ルーター（profile / browse / like / match / safety / notifications / admin）で切り替え済み
- `_public_image_url()` は削除済み

### Step 8: その他の細かい修正（完了 2026-05-25）
- `push.py` の `/api/push/debug/all` エンドポイントを削除
- `vite.config.ts` で本番ビルド時に `console.log` を drop するよう設定
- `RejectedPage.tsx` の `SUPPORT_EMAIL` を `support@crocoweb.jp` に修正

### Step 9: Resend メール認証（完了 2026-05-25）
- Resend で `crocoweb.jp` ドメイン認証済み（DKIM / SPF / DMARC DNS 設定済み）
- Supabase Authentication > SMTP Settings に Resend を設定済み

### Step 11: PP・利用規約アプリ内実装（完了 2026-05-25）
- `PrivacyPolicyPage.tsx` / `TermsOfServicePage.tsx` を全文書き換え済み
- 施行日は「2026年●月●日」プレースホルダーのまま（弁護士確認後に埋める）

### 写真審査フロー（完了、Step とは別枠）
- `GET /api/admin/photos/pending` / `POST /api/admin/photos/{id}/approve` / `reject` 実装済み
- `AdminDashboardPage` に `PhotoReviewTab.tsx` 組み込み済み

---

## バックエンド API 一覧

`main.py` で include されている全ルーター（12本）:

### health.py
| メソッド | パス | 説明 |
|---|---|---|
| GET | `/health` | ヘルスチェック |

### profile.py（prefix: `/api/profile`）
| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/profile/me` | 自分のプロフィール取得（photos, liked_count 含む） |
| PATCH | `/api/profile/me` | プロフィール更新 |
| POST | `/api/profile/upload-student-id` | 学生証アップロード（status を pending_review に設定） |
| POST | `/api/profile/upload-avatar` | アバター画像アップロード |
| GET | `/api/profile/avatar-url` | アバター URL 取得 |
| PATCH | `/api/profile/photos/reorder` | 写真順序変更 |
| POST | `/api/profile/photos` | 写真アップロード（status='pending' で挿入） |
| DELETE | `/api/profile/photos/{photo_id}` | 写真削除 |
| POST | `/api/profile/photos/{photo_id}/set-main` | メイン写真設定 |
| POST | `/api/profile/reapply` | 再申請（rejected のみ） |
| POST | `/api/profile/ping` | 最終閲覧時刻更新 |
| POST | `/api/profile/complete-onboarding` | オンボーディング完了マーク |
| DELETE | `/api/profile/me` | アカウント削除 |

### browse.py（prefix: `/api`）
| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/profiles` | ユーザー一覧（year/faculty/sort_by フィルター） |
| GET | `/api/profile-detail/{user_id}` | プロフィール詳細 |
| GET | `/api/profile-views` | 足跡一覧 |
| POST | `/api/profile-views` | 足跡記録 |

### like.py（prefix: `/api/likes`）
| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/likes/` | いいね作成（受信枠チェック） |
| DELETE | `/api/likes/{liked_id}` | いいね取り消し |
| GET | `/api/likes/received` | 受け取ったいいね一覧 |
| POST | `/api/likes/received/{like_id}/read` | いいね既読 |

### match.py（prefix: `/api/matches`）
| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/matches/` | マッチ一覧 |

### message.py（prefix: `/api/messages`）
| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/messages/` | メッセージ送信 |
| GET | `/api/messages/{match_id}` | メッセージ一覧（カーソルベース・50件） |
| PATCH | `/api/messages/{message_id}` | メッセージ既読 |
| DELETE | `/api/messages/{message_id}` | メッセージ削除 |

### safety.py（prefix: `/api/safety`）
| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/safety/block` | ブロック（matches を CASCADE 削除） |
| DELETE | `/api/safety/block/{blocked_id}` | ブロック解除 |
| POST | `/api/safety/report` | 通報（自動的に非表示化） |
| GET | `/api/safety/blocks` | ブロック一覧 |
| POST | `/api/safety/hide` | 非表示 |
| DELETE | `/api/safety/hide/{hidden_id}` | 非表示解除 |

### push.py（prefix: `/api/push`）
| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/push/vapid-public-key` | VAPID 公開鍵（認証不要） |
| POST | `/api/push/subscribe` | プッシュ購読登録 |
| DELETE | `/api/push/subscribe` | プッシュ購読解除 |

### notifications.py（prefix: `/api/notifications`）
| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/notifications/` | 通知一覧 |
| POST | `/api/notifications/read-all` | 全通知既読 |
| POST | `/api/notifications/{id}/read` | 通知既読 |

### ws.py
| メソッド | パス | 説明 |
|---|---|---|
| WS | `/ws/chat/{match_id}?token=JWT` | WebSocket チャット |

### inquiries.py（prefix: `/api/inquiries`）
| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/inquiries/` | 問い合わせ作成 |
| GET | `/api/inquiries/me` | 自分の問い合わせ一覧 |

### admin.py（prefix: `/api/admin`）
| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/admin/pending` | 審査待ちユーザー一覧（AdminGuard の認証確認にも使用） |
| GET | `/api/admin/student-id/{user_id}` | 学生証署名付き URL（5分有効） |
| POST | `/api/admin/approve/{user_id}` | ユーザー承認 |
| POST | `/api/admin/reject/{user_id}` | ユーザー却下 |
| POST | `/api/admin/suspend/{user_id}` | 通報による停止 |
| GET | `/api/admin/users` | ユーザー一覧（検索・フィルター・ページネーション） |
| GET | `/api/admin/users/{user_id}` | ユーザー詳細 |
| POST | `/api/admin/users/{user_id}/ban` | BAN |
| POST | `/api/admin/users/{user_id}/unban` | BAN 解除 |
| GET | `/api/admin/stats` | 統計 |
| GET | `/api/admin/stats/timeseries` | 時系列統計 |
| GET | `/api/admin/stats/breakdown` | 学部・性別・学年別内訳 |
| GET | `/api/admin/reports` | 通報一覧 |
| PATCH | `/api/admin/reports/{report_id}` | 通報更新 |
| GET | `/api/admin/logs` | 管理者操作ログ |
| GET | `/api/admin/inquiries` | 問い合わせ一覧 |
| POST | `/api/admin/inquiries/{id}/reply` | 問い合わせ返信 |
| PATCH | `/api/admin/inquiries/{id}` | 問い合わせステータス更新 |
| GET | `/api/admin/photos/pending` | 審査待ち写真一覧 |
| POST | `/api/admin/photos/{photo_id}/approve` | 写真承認 |
| POST | `/api/admin/photos/{photo_id}/reject` | 写真却下 |
| POST | `/api/admin/privacy-purge/run` | 個人情報削除バッチ手動実行 |

---

## フロントエンドルート一覧

（`frontend/src/App.tsx` から抽出、全26ルート）

| パス | コンポーネント | ガード |
|---|---|---|
| `/` | LandingPage | — |
| `/login` | LoginPage | PublicOnlyRoute |
| `/signup` | SignupPage | PublicOnlyRoute |
| `/reset-password` | ResetPasswordPage | — |
| `/pending` | PendingPage | ProtectedRoute |
| `/upload-student-id` | UploadStudentIdPage | ProtectedRoute |
| `/rejected` | RejectedPage | ProtectedRoute |
| `/setup/required` | SetupRequiredPage | ProtectedRoute |
| `/setup/thanks` | SetupThanksPage | ProtectedRoute |
| `/setup/optional` | SetupOptionalPage | ProtectedRoute |
| `/setup/install` | SetupInstallPage | ProtectedRoute |
| `/setup/notify` | SetupNotifyPage | ProtectedRoute |
| `/setup/complete` | SetupCompletePage | ProtectedRoute |
| `/home` | HomePage | ProtectedRoute + OnboardingGuard |
| `/browse` | BrowsePage | ProtectedRoute + OnboardingGuard |
| `/profile/:id` | ProfileDetailPage | ProtectedRoute + OnboardingGuard |
| `/profile/edit` | ProfileEditPage | ProtectedRoute + OnboardingGuard |
| `/matches` | MatchesPage | ProtectedRoute + OnboardingGuard |
| `/chat/:matchId` | ChatPage | ProtectedRoute + OnboardingGuard + ChatGuard |
| `/notifications` | NotificationsPage | ProtectedRoute + OnboardingGuard |
| `/footprints` | FootprintsPage | ProtectedRoute + OnboardingGuard |
| `/likes/received` | LikesReceivedPage | ProtectedRoute + OnboardingGuard |
| `/settings` | SettingsPage | ProtectedRoute + OnboardingGuard |
| `/admin` | AdminDashboardPage | ProtectedRoute + AdminGuard |
| `/privacy` | PrivacyPolicyPage | — |
| `/terms` | TermsOfServicePage | — |

---

## データベース設計

### profiles テーブルの主要カラム（33フィールド）

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid | = auth.users.id |
| email | text | @ecs.osaka-u.ac.jp のみ |
| status | text | pending_review / approved / rejected / banned |
| gender | text | male / female / other |
| interest_in | text | male / female / any |
| student_id_submitted | bool | 学生証提出済みか |
| onboarding_completed | bool | オンボーディング完了済みか |
| identity_verified | bool | 管理者が承認したか |
| real_name | text | 本名（退会後削除・ハッシュ保持） |
| student_number | text | 学籍番号（退会後削除・ハッシュ保持） |
| birth_date | date | 生年月日 |
| rejection_reason | text | 却下理由 |
| profile_image_path | text | Storage のパス |

### profile_images テーブル

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles.id |
| storage_path | text | Storage のパス |
| display_order | int | 表示順（初回は max+1） |
| status | text | pending / approved / rejected（デフォルト: pending） |

### 主要トリガー

| トリガー | テーブル | 動作 |
|---|---|---|
| detect_match | likes | INSERT 時にマッチ判定・自動作成 |

---

## 環境分離の状況

| 環境 | Supabase | Render | Vercel | VAPID |
|---|---|---|---|---|
| prod | 本番プロジェクト | cro-co-backend (api.crocoweb.jp) | Production | 本番キー |
| dev | hpkpndjqtzycnytymdkk | cro-co-api-dev.onrender.com | Preview（dev 変数設定済み） | dev キー |

> dev 環境は 2026-05-25 に構築完了。全マイグレーション 001〜038 適用済み。
> ⚠️ 本番 Supabase には `038_fix_blocks_rls.sql` の手動適用が残っている。

---

## 既知のバグ・技術的負債

| 種別 | 内容 | 対応ステップ |
|---|---|---|
| ⚠️ 要手動作業 | 本番 Supabase への `038_fix_blocks_rls.sql` 適用が残っている | — |
| ⚠️ セキュリティ | `profile-images` バケットが Public（コード側は署名付き URL 切り替え済み） | Step 7 |
| 🐛 未修正 | WebSocket の `token` クエリパラメータが Render ログに露出 | Step 8 残り |
| ⚠️ 仕様未実装 | BeReal型受信枠のフロントエンド UI 未実装（バックエンドは完了） | 中期タスク |
| 📝 内容未確定 | PP / 利用規約の施行日がプレースホルダー（弁護士確認後に埋める） | 法務対応 |
| 🔜 未実装 | Stripe 課金（Phase 12） | Phase 12 |

---

## 触らないファイル

→ `CLAUDE.md` の「触らないファイル一覧」を参照。

---

## マイグレーション

- ファイル数: 38個（`001_profiles.sql` 〜 `038_fix_blocks_rls.sql`、036 番が重複）
- 適用方法: Supabase ダッシュボード SQL Editor に貼り付けて手動実行
- 新規追加時: `039_*.sql` から採番
