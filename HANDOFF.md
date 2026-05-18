# Cro-co 開発引き継ぎドキュメント

> 生成日: 2026-05-18  
> ソースコードを直接確認した上で事実のみ記載。不明・未確認の項目は明示。

---

## 1. プロジェクト概要

| 項目 | 内容 |
|---|---|
| アプリ名 | **Cro-co**（Crocodile の Croco + 一緒に の co） |
| 目的 | 大阪大学（@ecs.osaka-u.ac.jp）限定のマッチングアプリ（Web版） |
| 想定ユーザー | 大阪大学の学生（学部生〜博士課程） |
| 開発形態 | 個人開発・バイブコーディング |
| リポジトリ | `C:\01_WorkSpace\Cro-co` |

### 経緯と方針転換

- **Phase 1〜3**: 認証・学生証審査・管理者ダッシュボードを順次実装
- **Phase 4a〜4c**: プロフィール写真アップロード・ユーザー一覧（/browse）・プロフィール詳細ページ
- **WebSocket追加**: チャットをポーリングからリアルタイム WebSocket に切り替え
- **重要な方針転換（直近）**: オンボーディングフローを大幅に再設計。従来は複数ページ（性別設定→プロフィール設定→学生証）に分割していたが、`/setup/required`（必須項目を1ページで一括入力 + 学生証提出）と `/setup/optional`（3ステップのオプション入力）に統合。`onboarding_completed` フラグを追加して完了状態を管理。
- **身バレ防止機能**: 学部・学科・サークルによる双方向除外フィルタをブラウズに追加
- **セキュリティ修正**: メールエスケープ処理、セキュリティヘッダー追加、CORS最小化、レート制限追加

---

## 2. 技術スタック

### フロントエンド

| ライブラリ | バージョン | 用途 |
|---|---|---|
| React | ^19.2.5 | UIフレームワーク |
| TypeScript | ~6.0.2 | 型安全 |
| Vite | ^8.0.10 | ビルドツール |
| react-router-dom | ^7.15.0 | ルーティング |
| @tanstack/react-query | ^5.100.10 | サーバー状態管理 |
| axios | ^1.16.0 | HTTP クライアント |
| tailwindcss | ^4.2.4 | CSS フレームワーク |
| lucide-react | ^1.14.0 | アイコン |
| @supabase/supabase-js | ^2.105.3 | Supabase クライアント（認証） |
| motion | ^12.38.0 | アニメーション |
| react-swipeable | ^7.0.2 | スワイプ操作 |
| @fontsource/noto-sans-jp | ^5.2.9 | 日本語フォント |
| @fontsource/space-mono | ^5.2.9 | モノスペースフォント |

### バックエンド

| ライブラリ | バージョン | 用途 |
|---|---|---|
| fastapi | 0.136.1 | Webフレームワーク |
| pydantic | 2.13.4 | バリデーション |
| pydantic-settings | >=2.0,<3.0 | 環境変数管理 |
| uvicorn | 0.46.0 | ASGIサーバー |
| supabase | >=2.0,<2.12 | DB/Storage クライアント（service_role） |
| slowapi | >=0.1.9 | レート制限 |
| resend | >=2.0 | メール送信 |
| python-multipart | >=0.0.9 | ファイルアップロード |
| Python | 3.14 | ランタイム |

### データ層・外部サービス

| サービス | 用途 |
|---|---|
| Supabase (PostgreSQL) | 全テーブルの永続化 |
| Supabase Auth | JWT認証・セッション管理 |
| Supabase Storage | profile-images（Public）・student-ids（Private）バケット |
| Resend | マッチ通知・メッセージ通知メール |
| Stripe | 未実装（Phase 12 予定） |

---

## 3. ディレクトリ構成

```
Cro-co/
├── CLAUDE.md                    # Claude Code 指示書・設計ガイドライン
├── FLOW_SUMMARY.md              # 認証・承認フロー詳細（課題一覧含む）
├── HANDOFF.md                   # 本ファイル
├── Production_Checklist.md      # 空ファイル（未記入）
├── backend/
│   ├── .env                     # 環境変数（gitignore済み）
│   ├── .env.example             # 環境変数テンプレート
│   ├── SECURITY_AUDIT.md        # セキュリティ監査レポート（2026-05-16実施）
│   ├── requirements.txt         # Python依存パッケージ
│   ├── .venv/                   # Python仮想環境
│   ├── app/
│   │   ├── main.py              # FastAPIアプリ定義・ミドルウェア設定
│   │   ├── auth/
│   │   │   └── dependencies.py  # get_current_user / require_admin
│   │   ├── core/
│   │   │   ├── config.py        # Settings（pydantic-settings）
│   │   │   ├── email.py         # Resend経由メール送信
│   │   │   ├── limiter.py       # slowapi レート制限インスタンス
│   │   │   ├── supabase_client.py # Supabase service_role クライアント
│   │   │   └── ws_manager.py    # WebSocket 接続管理
│   │   ├── routers/
│   │   │   ├── health.py        # GET /api/health
│   │   │   ├── profile.py       # プロフィールCRUD・写真・学生証
│   │   │   ├── browse.py        # ユーザー一覧・詳細・足跡・推薦
│   │   │   ├── like.py          # いいね送受信
│   │   │   ├── match.py         # マッチ一覧・未読カウント
│   │   │   ├── message.py       # メッセージ送受信・既読・リアクション
│   │   │   ├── safety.py        # ブロック・通報・非表示
│   │   │   ├── admin.py         # 管理者専用（承認・却下・統計）
│   │   │   ├── notifications.py # 通知（未確認・実装状況未詳）
│   │   │   └── ws.py            # WebSocket /ws/chat/{match_id}
│   │   └── schemas/             # Pydantic モデル群
│   └── migrations/              # SQLマイグレーション 001〜025
│       ├── 001〜009_*.sql        # 基本テーブル群（profiles, likes, matches, messages等）
│       ├── 010〜021_*.sql        # 拡張フィールド・安全機能・通知等
│       ├── 022〜023_*.sql        # 足跡既読・性別フロー
│       ├── 024_new_flow.sql     # 新オンボーディングフロー用フラグ追加
│       └── 025_required_fields.sql # real_name, student_number, onboarding_completed 追加
├── frontend/
│   ├── .env.local               # フロント環境変数（gitignore済み）
│   ├── vite.config.ts           # Vite設定
│   ├── vercel.json              # Vercelデプロイ設定（SPA用リライト）
│   ├── components.json          # shadcn/ui設定
│   └── src/
│       ├── App.tsx              # ルーター定義（全ルート一覧）
│       ├── main.tsx             # エントリポイント
│       ├── index.css            # グローバルCSS・カラー変数定義
│       ├── contexts/
│       │   └── AuthContext.tsx  # Supabase Auth状態管理（触らない）
│       ├── components/
│       │   ├── Layout.tsx       # ボトムナビ付きレイアウト
│       │   ├── MarqueeBar.tsx   # マーキーバー
│       │   ├── ColorfulCard.tsx # ユーザーカード（ネオブルータリズム）
│       │   ├── MatchModal.tsx   # マッチ成立モーダル
│       │   ├── FacultySelector.tsx # 学部・学科選択コンポーネント
│       │   ├── ClubSelector.tsx # サークル選択コンポーネント
│       │   ├── LoadingScreen.tsx # ローディング画面
│       │   ├── EmptyState.tsx   # 空状態表示
│       │   ├── ErrorState.tsx   # エラー状態表示
│       │   ├── ProtectedRoute.tsx # 要認証ガード
│       │   ├── PublicOnlyRoute.tsx # 未ログイン限定ガード
│       │   ├── StatusGuard.tsx  # approvedのみ通過
│       │   └── AdminGuard.tsx   # 管理者のみ通過
│       ├── hooks/
│       │   ├── useChat.ts       # WebSocketチャット管理
│       │   ├── useProfile.ts    # プロフィール取得フック
│       │   ├── usePageTitle.ts  # ページタイトル管理
│       │   └── usePWAInstall.ts # PWAインストールプロンプト
│       ├── lib/
│       │   ├── api.ts           # axios + Bearer インターセプター（触らない）
│       │   ├── supabase.ts      # Supabase クライアント（触らない）
│       │   ├── utils.ts         # ユーティリティ関数
│       │   ├── validation.ts    # @ecs.osaka-u.ac.jp ドメイン検証
│       │   └── osaka-u-data.ts  # 大阪大学 学部・学科・サークルデータ
│       └── pages/
│           ├── LandingPage.tsx      # / ランディングページ
│           ├── LoginPage.tsx        # /login
│           ├── SignupPage.tsx       # /signup
│           ├── SetupRequiredPage.tsx # /setup/required（新オンボーディング必須）
│           ├── SetupOptionalPage.tsx # /setup/optional（新オンボーディングオプション）
│           ├── UploadStudentIdPage.tsx # /upload-student-id（再申請用・旧フロー残存）
│           ├── PendingPage.tsx      # /pending 審査待ち
│           ├── RejectedPage.tsx     # /rejected 却下
│           ├── HomePage.tsx         # /home
│           ├── BrowsePage.tsx       # /browse
│           ├── ProfileDetailPage.tsx # /profile/:id
│           ├── ProfileEditPage.tsx  # /profile/edit
│           ├── MatchesPage.tsx      # /matches
│           ├── ChatPage.tsx         # /chat/:matchId
│           ├── NotificationsPage.tsx # /notifications
│           ├── SettingsPage.tsx     # /settings
│           ├── PrivacyPolicyPage.tsx # /privacy
│           ├── TermsOfServicePage.tsx # /terms
│           └── admin/
│               └── AdminDashboardPage.tsx # /admin
```

---

## 4. 環境構築・起動手順

### 必要ツール

| ツール | バージョン |
|---|---|
| Node.js | 20+ 推奨 |
| Python | 3.14 |
| Git | 任意 |

### バックエンドセットアップ

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# .env ファイルを作成（後述の必要変数を記入）
```

### フロントエンドセットアップ

```powershell
cd frontend
npm install

# .env.local ファイルを作成（後述の必要変数を記入）
```

### バックエンド `.env` 必要変数

```
SUPABASE_URL=          # Supabase プロジェクトURL
SUPABASE_ANON_KEY=     # Supabase 匿名キー
SUPABASE_SERVICE_ROLE_KEY= # Supabase サービスロールキー（フルアクセス）
DATABASE_URL=          # PostgreSQL接続文字列（Supabaseから取得）
SECRET_KEY=            # FastAPI用シークレットキー
ALLOWED_ORIGINS=       # フロントURLカンマ区切り（例: http://localhost:5173）
ADMIN_EMAILS=          # 管理者メールアドレス カンマ区切り
RESEND_API_KEY=        # Resend APIキー（省略可・省略時メール送信スキップ）
FROM_EMAIL=            # 送信元メールアドレス（省略可）
FRONTEND_URL=          # フロントエンドURL（メール本文のリンクに使用）
```

### フロントエンド `.env.local` 必要変数

```
VITE_API_URL=          # バックエンドURL（例: http://localhost:8000）
VITE_SUPABASE_URL=     # Supabase プロジェクトURL
VITE_SUPABASE_ANON_KEY= # Supabase 匿名キー
```

### 開発サーバー起動

```powershell
# バックエンド（backend/ ディレクトリで）
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000

# フロントエンド（frontend/ ディレクトリで・別ターミナル）
npm run dev
# → http://localhost:5173
```

---

## 5. データベース設計

### テーブル一覧

| テーブル | 主な役割 | 主キー |
|---|---|---|
| profiles | ユーザー情報・ステータス管理 | id (uuid = auth.users.id) |
| profile_images | プロフィール写真（最大6枚）| id (uuid) |
| likes | いいね記録 | (liker_id, liked_id) |
| matches | マッチ成立ペア | id (uuid), UNIQUE(user_a_id, user_b_id) |
| messages | チャットメッセージ | id (uuid) |
| message_reactions | メッセージリアクション（ハート） | (message_id, user_id) |
| blocks | ブロック | (blocker_id, blocked_id) |
| reports | 通報 | id (uuid) |
| hides | 非表示 | (hider_id, hidden_id) |
| profile_views | 足跡 | (viewer_id, viewed_id) |
| notifications | 通知 | id (uuid)（未確認・018で作成） |
| login_history | ログイン履歴 | id（未確認・019で作成） |

### profiles テーブル主要カラム

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid | auth.users.id への参照 |
| email | text | Supabaseメールアドレス |
| status | text | pending_review / approved / rejected |
| name | text | 表示名（最大50文字） |
| year | int | 学年（1〜11: 1-6=学部、7-8=M1-2、9-11=D1-3） |
| faculty | text | 学部 |
| department | text | 学科 |
| bio | text | 自己紹介（最大500文字） |
| gender | text | male / female（一度設定したら変更不可） |
| interest_in | text | male / female（一度設定したら変更不可） |
| clubs | text[] | 所属サークル（最大5件） |
| interests | text[] | 趣味・興味タグ（最大10件） |
| looking_for | text | 恋愛 / 友達 / なんでも |
| hometown | text | 出身地 |
| profile_image_path | text | メインプロフィール写真パス |
| student_id_image_path | text | 学生証写真パス（student-ids バケット） |
| real_name | text | 本名（審査用・他ユーザーに非表示） |
| student_number | text | 学籍番号（審査用・他ユーザーに非表示） |
| admission_year | int | 入学年度 |
| submitted_at | timestamptz | 学生証提出日時 |
| reviewed_at | timestamptz | 審査完了日時 |
| rejection_reason | text | 却下理由 |
| identity_verified | bool | 本人確認済みフラグ（承認後はtrue・学籍情報変更不可） |
| profile_setup_completed | bool | プロフィール設定完了（ブラウズ解放条件） |
| student_id_submitted | bool | 学生証提出済みフラグ |
| onboarding_completed | bool | オンボーディング完了フラグ（新フロー用） |
| faculty_hide_level | text | none / faculty / department（身バレ防止設定） |
| hidden_clubs | text[] | 非表示にするサークル |
| status_message | text | 今日の一言（最大30文字） |
| last_seen_at | timestamptz | 最終アクティブ日時 |
| show_online_status | bool | オンラインステータス表示設定 |

### 重要なトリガー

- **handle_new_user()**: auth.users への INSERT 後に profiles を自動作成
- **detect_match()**: likes への INSERT 後に相互いいねを検知し matches を自動作成（LEAST/GREATEST で user_a_id < user_b_id に正規化）
- **set_updated_at()**: profiles の UPDATE 前に updated_at を自動更新

### マイグレーション状況

- **001〜022**: 適用済みと推定（旧フロー用含む）
- **023〜025**: 新規作成・適用状況は**未確認**（Supabase SQL Editor で手動実行が必要）
  - 023: gender, interest_in, profile_completed カラム追加
  - 024: profile_setup_completed, student_id_submitted カラム追加
  - 025: real_name, student_number, onboarding_completed カラム追加

---

## 6. API / 画面ルート一覧

### バックエンド API（prefix: `/api/`）

| メソッド | パス | 用途 | 認証 |
|---|---|---|---|
| GET | /health | ヘルスチェック | 不要 |
| GET | /api/profile/me | 自分のプロフィール取得 | 要 |
| PATCH | /api/profile/me | プロフィール更新 | 要 |
| DELETE | /api/profile/me | アカウント削除（Storage + auth.users 含む完全削除） | 要 |
| POST | /api/profile/upload-student-id | 学生証アップロード（multipart: file, real_name, student_number, admission_year, year, faculty, department, gender, interest_in） | 要 |
| POST | /api/profile/upload-avatar | アバター写真アップロード | 要 |
| GET | /api/profile/avatar-url | アバターURL取得 | 要 |
| POST | /api/profile/photos | 追加写真アップロード（最大6枚） | 要 |
| DELETE | /api/profile/photos/{photo_id} | 写真削除 | 要 |
| POST | /api/profile/photos/{photo_id}/set-main | メイン写真設定 | 要 |
| PATCH | /api/profile/photos/reorder | 写真並び替え | 要 |
| POST | /api/profile/reapply | 再申請（rejected → pending_review） | 要 |
| POST | /api/profile/ping | ラストアクティブ更新（20/min レート制限） | 要 |
| GET | /api/profiles | ユーザー一覧（フィルタ・身バレ防止・性別フィルタ） | 要 |
| GET | /api/profiles/recommended | おすすめユーザー（趣味スコア順・最大5件） | 要 |
| GET | /api/profiles/views | 自分のプロフィール閲覧者（足跡） | 要 |
| POST | /api/profiles/views/confirm | 足跡既読処理 | 要 |
| GET | /api/profiles/completeness-rank | プロフィール充実度ランキング | 要 |
| GET | /api/profiles/{user_id} | 特定ユーザーのプロフィール詳細（足跡記録も） | 要 |
| POST | /api/likes/ | いいね送信（60/min レート制限） | 要 |
| GET | /api/likes/today-count | 今日のいいね送信数 | 要 |
| GET | /api/likes/received | 自分へのいいね送信者一覧（マッチ済みを除外） | 要 |
| GET | /api/matches/ | マッチ一覧 | 要 |
| GET | /api/matches/unread-count | 未読メッセージ数・未メッセージマッチ数・足跡未確認数 | 要 |
| GET | /api/matches/{match_id} | 特定マッチ取得 | 要 |
| DELETE | /api/matches/{match_id} | アンマッチ | 要 |
| POST | /api/messages/ | メッセージ送信（30/min レート制限・WebSocket broadcast） | 要 |
| GET | /api/messages/{match_id} | メッセージ履歴取得 | 要 |
| POST | /api/messages/{message_id}/react | メッセージリアクション（ハートトグル） | 要 |
| POST | /api/messages/{match_id}/read | 既読処理（WebSocket broadcast） | 要 |
| POST | /api/safety/block | ブロック（マッチも削除） | 要 |
| DELETE | /api/safety/block/{blocked_id} | ブロック解除 | 要 |
| POST | /api/safety/report | 通報（10/min レート制限・自動非表示） | 要 |
| POST | /api/safety/hide | 非表示 | 要 |
| DELETE | /api/safety/hide/{hidden_id} | 非表示解除 | 要 |
| GET | /api/safety/blocks | ブロック中ユーザー一覧（プロフィール付き） | 要 |
| GET | /api/safety/blocked-ids | ブロックIDリストのみ | 要 |
| GET | /api/safety/hidden-ids | 非表示IDリストのみ | 要 |
| GET | /api/admin/pending | 審査待ちユーザー一覧 | 管理者 |
| GET | /api/admin/student-id/{user_id} | 学生証署名付きURL取得（5分有効） | 管理者 |
| POST | /api/admin/approve/{user_id} | ユーザー承認 | 管理者 |
| POST | /api/admin/reject/{user_id} | ユーザー却下（理由付き） | 管理者 |
| POST | /api/admin/suspend/{user_id} | 通報による停止 | 管理者 |
| GET | /api/admin/stats | 統計情報 | 管理者 |
| GET | /api/admin/reports | 通報一覧（最大200件） | 管理者 |
| WS | /ws/chat/{match_id}?token=JWT | リアルタイムチャット | 要（クエリパラメータ） |

### フロントエンドルート

| パス | コンポーネント | 用途 | ガード |
|---|---|---|---|
| / | LandingPage | ランディング | なし |
| /login | LoginPage | ログイン | PublicOnly |
| /signup | SignupPage | 新規登録（@ecs.osaka-u.ac.jp のみ） | PublicOnly |
| /setup/required | SetupRequiredPage | 必須オンボーディング（性別・本人確認・学生証） | Protected |
| /setup/optional | SetupOptionalPage | オプションオンボーディング（写真・趣味・サークル） | Protected |
| /upload-student-id | UploadStudentIdPage | 学生証アップロード（再申請フロー・旧フロー残存） | Protected |
| /pending | PendingPage | 審査待ち | Protected |
| /rejected | RejectedPage | 却下（再申請ボタン） | Protected |
| /home | HomePage | ホーム | Protected + StatusGuard |
| /browse | BrowsePage | ユーザー一覧（pending でもアクセス可） | Protected |
| /profile/:id | ProfileDetailPage | ユーザー詳細 | Protected |
| /profile/edit | ProfileEditPage | 自分のプロフィール編集 | Protected + StatusGuard |
| /matches | MatchesPage | マッチ一覧 | Protected + StatusGuard |
| /chat/:matchId | ChatPage | チャット | Protected |
| /notifications | NotificationsPage | 通知 | Protected + StatusGuard |
| /settings | SettingsPage | 設定（ブロック管理・アカウント削除等） | Protected |
| /admin | AdminDashboardPage | 管理ダッシュボード | Protected + AdminGuard |
| /privacy | PrivacyPolicyPage | プライバシーポリシー | なし |
| /terms | TermsOfServicePage | 利用規約 | なし |

---

## 7. 実装済み機能（動作確認済み）

> 動作確認はコード静的解析による。実際のE2Eテストは**未実施**。

| 機能 | 関連ファイル | 動作概要 |
|---|---|---|
| メール認証登録 | `frontend/src/pages/SignupPage.tsx` | @ecs.osaka-u.ac.jp のみ許可。`supabase.auth.signUp()` → 確認メール送信 |
| ログイン | `frontend/src/pages/LoginPage.tsx` | Supabase Auth メール/パスワード認証 |
| 新オンボーディング（必須） | `frontend/src/pages/SetupRequiredPage.tsx`, `backend/app/routers/profile.py:upload_student_id` | 1ページで性別・本人確認情報・学生証を一括入力・提出 |
| 新オンボーディング（オプション） | `frontend/src/pages/SetupOptionalPage.tsx` | 3ステップで写真・趣味・サークル等をオプション入力 |
| 学生証審査（管理者） | `frontend/src/pages/admin/AdminDashboardPage.tsx`, `backend/app/routers/admin.py` | 審査待ち一覧・学生証署名URL確認・承認/却下 |
| 再申請 | `frontend/src/pages/RejectedPage.tsx`, `backend/app/routers/profile.py:reapply` | rejected → pending_review にリセット（submitted_at・student_id_image_path もリセット） |
| プロフィール閲覧 | `frontend/src/pages/BrowsePage.tsx`, `backend/app/routers/browse.py` | 性別・身バレ防止フィルタ・ブロック/非表示除外 |
| プロフィール詳細 | `frontend/src/pages/ProfileDetailPage.tsx`, `backend/app/routers/browse.py:get_profile` | 足跡自動記録・いいね状態表示 |
| いいね送信 | `backend/app/routers/like.py` | 相互いいねでDB自動マッチ成立（トリガー）・マッチ通知メール |
| マッチ確認 | `frontend/src/pages/MatchesPage.tsx`, `backend/app/routers/match.py` | マッチ一覧・未読カウント |
| リアルタイムチャット | `frontend/src/hooks/useChat.ts`, `backend/app/routers/ws.py`, `backend/app/core/ws_manager.py` | WebSocket + HTTP 既読・リアクション・タイピングインジケータ |
| 写真管理（最大6枚） | `frontend/src/pages/ProfileEditPage.tsx`, `backend/app/routers/profile.py` | アップロード・削除・並び替え・メイン写真設定 |
| ブロック | `backend/app/routers/safety.py` | ブロック時にマッチも自動削除（messages は CASCADE） |
| 通報 | `backend/app/routers/safety.py` | 通報時に自動非表示。管理者が停止操作可能 |
| 非表示 | `backend/app/routers/safety.py` | ブラウズから除外 |
| 足跡（プロフィール閲覧通知） | `backend/app/routers/browse.py`, `backend/migrations/015_profile_views.sql` | 閲覧時に upsert・既読処理 |
| アカウント削除 | `backend/app/routers/profile.py:delete_my_account` | Storage + profiles + auth.users を完全削除 |
| 身バレ防止 | `backend/app/routers/browse.py`, `frontend/src/pages/SettingsPage.tsx` | 学部/学科レベルでの双方向除外・サークルによる双方向除外 |
| メール通知 | `backend/app/core/email.py` | マッチ成立・オフライン時のメッセージ受信時に Resend でメール送信 |
| レート制限 | `backend/app/core/limiter.py`, `backend/app/main.py` | slowapi: ping(20/min), likes(60/min), messages(30/min), report(10/min) |
| セキュリティヘッダー | `backend/app/main.py:SecurityHeadersMiddleware` | X-Content-Type-Options, X-Frame-Options 等 |
| PWA | `frontend/public/manifest.json`, `frontend/src/hooks/usePWAInstall.ts` | インストール可能 |

---

## 8. 実装中・未完成機能

### 8-1. 通知システム（notifications テーブル）
- **進捗**: 約30%
- **残タスク**: `backend/app/routers/notifications.py` が存在するが `main.py` に include されていない。テーブルは `018_notifications.sql` で作成済みだが、フロントの `NotificationsPage.tsx` の実装状況が未確認。
- **関連ファイル**: `backend/app/routers/notifications.py`, `backend/app/schemas/notifications.py`, `frontend/src/pages/NotificationsPage.tsx`

### 8-2. UploadStudentIdPage（旧フロー）の扱い
- **進捗**: 50%
- **残タスク**: `/upload-student-id` ルートと `UploadStudentIdPage.tsx` が新オンボーディングフローと並立している。再申請フローからしか呼ばれないが、旧フローとの整合性が曖昧。
- **関連ファイル**: `frontend/src/pages/UploadStudentIdPage.tsx`, `frontend/src/App.tsx`

### 8-3. Stripe 課金機能
- **進捗**: 0%（未着手）
- **残タスク**: Phase 12 で実装予定。要件未定義。

### 8-4. profile-images バケットの Private 化
- **進捗**: 0%（TODO）
- **残タスク**: 現在 Public CDN。Private + 署名付きURL に変更すると全画像URL生成ロジックの変更が必要。CLAUDE.md に「Ph13前」として記録済み。

---

## 9. 既知のバグ・技術的負債

| 優先度 | 内容 | 再現条件 | 暫定対処 | 影響範囲 |
|---|---|---|---|---|
| 高 | `SUPPORT_EMAIL` が `support@example.com` のままハードコード | RejectedPage を表示する | なし | `frontend/src/pages/RejectedPage.tsx:8` |
| 中 | `PATCH /api/profile/me` のレスポンスに photos が含まれない（空リスト固定） | プロフィール更新後に写真一覧が消える | フロント側で GET を別途呼ぶことで回避 | `backend/app/routers/profile.py:185` |
| 低 | `GET /api/profiles/completeness-rank` が `club`（単数）カラムを参照しているが、021以降は `clubs`（配列）に移行済み | completeness-rank API呼び出し時 | スコアの club 項目が正しく加算されない可能性 | `backend/app/routers/browse.py:430-450` |
| 低 | WebSocket 認証トークンが URL クエリパラメータに露出（ログに記録される） | チャット接続時 | なし（WebSocketの実用上の制約） | `backend/app/routers/ws.py:14` |
| 低 | `e.message` で内部 DB エラーがクライアントに漏洩している箇所が多数 | DB エラー発生時 | なし | `profile.py`, `admin.py` 等多数 |
| 低 | notifications ルーターが `main.py` に include されていない | 通知API呼び出し時 | なし | `backend/app/routers/notifications.py` |

### 技術的負債

- `_public_image_url()` 関数が `profile.py`, `browse.py`, `like.py`, `match.py`, `safety.py` に重複定義（DRY 原則違反）
- 024 以前のマイグレーションの適用状況をコードから確認できない（Supabase ダッシュボードで確認必要）
- `UploadStudentIdPage.tsx`（旧フロー）と新オンボーディングフローの並立

---

## 10. テスト状況

- **自動テスト**: 一切なし（backend にも frontend にもテストファイルが存在しない）
- **型チェック**: `npm run build`（tsc -b）で TypeScript 型エラーを検出可能
- **Lint**: `npm run lint`（ESLint）
- **動作確認**: 手動テストのみ

---

## 11. 設計上の重要な決定事項

### アーキテクチャ選択

| 決定 | 選択 | 理由 |
|---|---|---|
| ORM | なし（Supabase Python クライアントで直接 PostgREST API） | SQLAlchemy/Alembic は削除済み。シンプルさ優先 |
| 認証 | Supabase Auth（JWT） | パスワードハッシュ・セッション管理を委譲できる |
| マッチ自動生成 | DB トリガー（detect_match） | アプリ層のロジック漏れを防ぐ |
| マッチ正規化 | user_a_id < user_b_id（LEAST/GREATEST） | 重複ペアを DB レベルで防止 |
| リアルタイムチャット | WebSocket（ws_manager.py） | ポーリングからの移行 |
| 管理者判定 | バックエンド `.env` の ADMIN_EMAILS | フロントに管理者リストを置かない |
| 画像配信 | profile-images: Public CDN / student-ids: Private 署名付きURL | 学生証はプライバシー上 Private 必須 |

### 命名規則

- Python: スネークケース、型ヒント必須
- TypeScript: キャメルケース、any 禁止
- DB カラム: スネークケース
- API: REST（名詞複数形）、エラーメッセージは日本語

### 検討したが採用しなかった案

- **複数ページオンボーディング（旧フロー）**: 性別設定・プロフィール設定・学生証を別ページに分割していた。フロー途中で離脱するリスクと、管理が複雑になるため `/setup/required` の1ページ統合に変更。

---

## 12. 次にやるべきタスク（優先順位順）

### 直近（1〜2スプリント）

1. **[必須] マイグレーション 023〜025 の適用確認**
   - Supabase SQL Editor で 023〜025 を実行済みか確認する
   - 未実行なら実行する（順序: 023 → 024 → 025）

2. **[高] `SUPPORT_EMAIL` を実際のサポートアドレスに変更**
   - `frontend/src/pages/RejectedPage.tsx:8`

3. **[高] 通知ルーターを `main.py` に include する**
   - `backend/app/main.py` に `from app.routers import notifications` を追加
   - `NotificationsPage.tsx` の実装状況を確認・完成させる

4. **[中] `PATCH /api/profile/me` のレスポンスで photos を返す**
   - `backend/app/routers/profile.py:185` に `_fetch_photos()` を追加

5. **[中] completeness-rank の `club` を `clubs` に修正**
   - `backend/app/routers/browse.py:430` の `club` 参照を `clubs` に変更

6. **[中] 新オンボーディングの E2E 動作確認**
   - `/setup/required` → `/setup/optional` → `/browse` の全フロー手動テスト
   - `onboarding_completed` フラグが正しくセットされることを確認

### 中期ロードマップ

- **Phase 12**: Stripe 課金機能
- **Phase 13前**: profile-images バケットを Private 化（署名付きURL対応）
- **テスト整備**: pytest でバックエンドの主要エンドポイントをテスト化
- **本番デプロイ**: Vercel（フロント）+ Fly.io or Railway（バックエンド）候補
- **全大学展開**: 阪大→他大学展開（ドメイン制限の汎化）

---

## 13. ハマりどころ・引継ぎ注意事項

### 触ると壊れる箇所

| ファイル | 注意事項 |
|---|---|
| `frontend/src/lib/api.ts` | axios の Bearer インターセプター定義。変更禁止 |
| `frontend/src/lib/supabase.ts` | Supabase クライアント。変更禁止 |
| `frontend/src/contexts/AuthContext.tsx` | 認証状態管理。変更禁止 |
| `frontend/src/components/ProtectedRoute.tsx` 等各 Guard | 変更禁止 |
| `backend/app/core/config.py` | `ADMIN_EMAILS` は list[str] ではなく str で受け取り property で分割（pydantic-settings v2 の JSON 解釈バグ回避） |
| `backend/app/auth/dependencies.py` | get_current_user / require_admin。変更禁止 |

### 環境依存の罠

- **Windows/PowerShell**: パス区切りは `\`、コマンド連結は `&&` または `;`（bash は使えない）
- **pydantic-settings v2**: `.env` から `list[str]` を直接読むと JSON パースエラー。文字列で受け取り property で分割する（config.py 参照）
- **Supabase Python クライアント `>=2.0,<2.12`**: バージョンをメジャーで固定。2.12 以降では API が変わる可能性
- **マイグレーションの実行**: Supabase の SQL Editor で手動実行。Alembic 等の自動化なし。`DROP TABLE IF EXISTS ... CASCADE` から始める冪等設計
- **RLS ポリシー**: テーブルに RLS を有効化したら必ず service_role 用ポリシーを追加する（忘れるとバックエンドから読めなくなる）

### ドキュメント化されていない暗黙の前提

- **`/browse` は pending ユーザーもアクセス可能**: `StatusGuard` が付いていない。意図的設計（審査中でも他ユーザーを見られる）
- **gender/interest_in は一度設定したら変更不可**: バックエンドの `update_my_profile` で `current_profile.get("gender")` があればスキップする処理が入っている。フロント側でも disabled にしている
- **identity_verified=true なら学籍情報（faculty/department/admission_year）の変更を無視**: 承認後に自分の学部を変更しようとしても API 側でスルーされる
- **マッチ通知メールは is_online（5分以内にping）の場合は送らない**: オンライン中はリアルタイムチャットで見えるため
- **profile-images のパスには user_id + timestamp + rand が含まれる**: URL の推測は困難だが Security through Obscurity（バケットは現在 Public）
- **WebSocket はマッチ参加者でない接続を code 4003 で切断する**: 不正アクセス防止済み
- **reapply 時は submitted_at と student_id_image_path もリセットされる**（旧コードでは残っていたが修正済み）
- **completeness-rank で参照している `club` カラムは 021 以降 `clubs`（配列）に移行済み**。古いカラムが残っている可能性があり、バグ修正が必要

---

*このドキュメントはコードベースの静的解析に基づいて生成。マイグレーションの実際の適用状況・本番環境の設定は Supabase ダッシュボードで直接確認すること。*
