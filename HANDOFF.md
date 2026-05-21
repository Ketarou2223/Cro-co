# Cro-co 開発引き継ぎドキュメント

> 生成日: 2026-05-21  
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
- **重要な方針転換（直近）**: オンボーディングフローを大幅に再設計。従来は複数ページに分割していたが、`/setup/required`（必須項目を1ページで一括入力 + 学生証提出）→ `/setup/thanks`（提出完了）→ `/setup/optional`（オプション入力）→ `/setup/complete`（完了画面）の4段階フローに統合。
- **BeReal型いいね受信枠システム（2026-05実装）**: 男女マッチ志向の女性のみが対象。1日に受け取れるいいね上限5件。ランダムな時刻（JST 8〜18時）に開放するシステム。バックエンド実装済み、フロントエンドの枠状態UIは未実装。
- **通知タブ分離（2026-05）**: ボトムナビを4タブ→5タブに変更。マッチタブと通知タブを分離し、通知タブは足跡・いいね・マッチへのナビゲーションハブとして再設計。
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
| react-virtuoso | — | チャット仮想スクロール |
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
| pg_cron（Supabase内蔵） | 毎日 JST 0:00 に like_quota の翌日分枠を生成 |
| Resend | マッチ通知・メッセージ通知メール |
| Stripe | 未実装（Phase 12 予定） |

---

## 3. ディレクトリ構成

```
Cro-co/
├── CLAUDE.md                    # Claude Code 指示書・設計ガイドライン
├── FLOW_SUMMARY.md              # 認証・承認フロー詳細
├── HANDOFF.md                   # 本ファイル
├── backend/
│   ├── .env                     # 環境変数（gitignore済み）
│   ├── .env.example             # 環境変数テンプレート
│   ├── SECURITY_AUDIT.md        # セキュリティ監査レポート（2026-05-16実施）
│   ├── requirements.txt         # Python依存パッケージ
│   ├── .venv/                   # Python仮想環境
│   ├── app/
│   │   ├── main.py              # FastAPIアプリ定義・ミドルウェア設定
│   │   ├── auth/
│   │   │   └── dependencies.py  # get_current_user / require_admin（触らない）
│   │   ├── core/
│   │   │   ├── config.py        # Settings（pydantic-settings）
│   │   │   ├── email.py         # Resend経由メール送信
│   │   │   ├── limiter.py       # slowapi レート制限インスタンス
│   │   │   ├── supabase_client.py # Supabase service_role クライアント（触らない）
│   │   │   └── ws_manager.py    # WebSocket 接続管理
│   │   ├── routers/
│   │   │   ├── health.py        # GET /api/health
│   │   │   ├── profile.py       # プロフィールCRUD・写真・学生証
│   │   │   ├── browse.py        # ユーザー一覧・詳細・足跡・推薦
│   │   │   ├── like.py          # いいね送受信・受信枠・dismiss・受信既読
│   │   │   ├── match.py         # マッチ一覧・未読カウント
│   │   │   ├── message.py       # メッセージ送受信・既読・リアクション
│   │   │   ├── safety.py        # ブロック・通報・非表示
│   │   │   ├── admin.py         # 管理者専用（承認・却下・統計）
│   │   │   ├── notifications.py # 通知API（実装済み・main.py未include）
│   │   │   └── ws.py            # WebSocket /ws/chat/{match_id}
│   │   └── schemas/             # Pydantic モデル群
│   └── migrations/              # SQLマイグレーション 001〜031
│       ├── 001〜009_*.sql        # 基本テーブル群（profiles, likes, matches, messages等）
│       ├── 010〜022_*.sql        # 拡張フィールド・安全機能・通知・足跡・リアクション等
│       ├── 023〜025_*.sql        # 新オンボーディングフロー用フラグ・必須フィールド
│       ├── 026_add_birth_date.sql      # birth_date カラム追加
│       ├── 027_remove_admission_year.sql # admission_year 参照削除（カラムはDB残存）
│       ├── 028_like_quota_system.sql   # BeReal型受信枠システム（like_quota テーブル）
│       ├── 029_likes_receiver_read_at.sql # likes.receiver_read_at カラム追加
│       ├── 030_dismissed_likes.sql     # likes.dismissed_from_match カラム追加
│       └── 031_add_missing_indexes.sql # 14個の欠落インデックス一括追加
├── frontend/
│   ├── .env.local               # フロント環境変数（gitignore済み）
│   ├── vite.config.ts           # Vite設定
│   ├── vercel.json              # Vercelデプロイ設定（SPA用リライト）
│   ├── components.json          # shadcn/ui設定
│   └── src/
│       ├── App.tsx              # ルーター定義（React.lazy + Suspense 全ルート）
│       ├── main.tsx             # エントリポイント
│       ├── index.css            # グローバルCSS・カラー変数定義
│       ├── contexts/
│       │   ├── AuthContext.tsx  # Supabase Auth状態管理（触らない）
│       │   └── ToastContext.tsx # Toast通知 Context
│       ├── components/
│       │   ├── Layout.tsx       # ボトムナビ付きレイアウト（5タブ）
│       │   ├── MarqueeBar.tsx   # マーキーバー
│       │   ├── ColorfulCard.tsx # ユーザーカード（ネオブルータリズム）
│       │   ├── MatchModal.tsx   # マッチ成立モーダル
│       │   ├── FacultySelector.tsx # 学部・学科選択コンポーネント
│       │   ├── ClubSelector.tsx # サークル選択コンポーネント
│       │   ├── LoadingScreen.tsx # ローディング画面
│       │   ├── EmptyState.tsx   # 空状態表示
│       │   ├── ErrorState.tsx   # エラー状態表示
│       │   ├── Toast.tsx        # Toastアニメーションコンポーネント（motion使用）
│       │   ├── OnboardingGuard.tsx # オンボーディング完了状態によるリダイレクト
│       │   ├── ChatGuard.tsx    # チャットアクセス前のステータスチェック
│       │   ├── ProtectedRoute.tsx # 要認証ガード（触らない）
│       │   ├── PublicOnlyRoute.tsx # 未ログイン限定ガード（触らない）
│       │   ├── StatusGuard.tsx  # 旧ガード（App.tsxでは使用不可・ファイル残存）
│       │   └── AdminGuard.tsx   # 管理者のみ通過（触らない）
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
│           ├── SetupRequiredPage.tsx # /setup/required（必須項目・学生証一括提出）
│           ├── SetupThanksPage.tsx  # /setup/thanks（提出完了・/setup/optionalへ誘導）
│           ├── SetupOptionalPage.tsx # /setup/optional（3ステップのオプション入力）
│           ├── SetupCompletePage.tsx # /setup/complete（3秒後に/homeへ自動遷移）
│           ├── UploadStudentIdPage.tsx # /upload-student-id（再申請フロー用）
│           ├── PendingPage.tsx      # /pending 審査待ち
│           ├── RejectedPage.tsx     # /rejected 却下
│           ├── HomePage.tsx         # /home
│           ├── BrowsePage.tsx       # /browse（ToastContext利用）
│           ├── ProfileDetailPage.tsx # /profile/:id
│           ├── ProfileEditPage.tsx  # /profile/edit
│           ├── MatchesPage.tsx      # /matches（いいね確認セクション・dismiss機能含む）
│           ├── ChatPage.tsx         # /chat/:matchId
│           ├── NotificationsPage.tsx # /notifications（足跡・いいね・マッチへのハブ）
│           ├── FootprintsPage.tsx   # /footprints（足跡一覧・足跡経由いいね）
│           ├── LikesReceivedPage.tsx # /likes/received（受け取ったいいね一覧・いいね返し）
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
SUPABASE_URL=              # Supabase プロジェクトURL
SUPABASE_ANON_KEY=         # Supabase 匿名キー
SUPABASE_SERVICE_ROLE_KEY= # Supabase サービスロールキー（フルアクセス）
DATABASE_URL=              # PostgreSQL接続文字列（Supabaseから取得）
SECRET_KEY=                # FastAPI用シークレットキー
ALLOWED_ORIGINS=           # フロントURLカンマ区切り（例: http://localhost:5173）
ADMIN_EMAILS=              # 管理者メールアドレス カンマ区切り
RESEND_API_KEY=            # Resend APIキー（省略可・省略時メール送信スキップ）
FROM_EMAIL=                # 送信元メールアドレス（省略可）
FRONTEND_URL=              # フロントエンドURL（メール本文のリンクに使用）
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
| like_quota | BeReal型受信枠管理 | (user_id, date) |
| matches | マッチ成立ペア | id (uuid), UNIQUE(user_a_id, user_b_id) |
| messages | チャットメッセージ | id (uuid) |
| message_reactions | メッセージリアクション（ハート） | (message_id, user_id) |
| blocks | ブロック | (blocker_id, blocked_id) |
| reports | 通報 | id (uuid) |
| hides | 非表示 | (hider_id, hidden_id) |
| profile_views | 足跡 | (viewer_id, viewed_id) |
| notifications | 通知 | id (uuid)（018で作成・APIは実装済みだがmain.py未include） |
| login_history | ログイン履歴 | id（019で作成・未確認） |

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
| birth_date | date | 生年月日（026で追加） |
| profile_image_path | text | メインプロフィール写真パス |
| student_id_image_path | text | 学生証写真パス（student-ids バケット） |
| real_name | text | 本名（審査用・他ユーザーに非表示） |
| student_number | text | 学籍番号（審査用・他ユーザーに非表示） |
| admission_year | int | 入学年度（027以降フロント/バックから参照削除・DBカラムはNULL許容で残存） |
| submitted_at | timestamptz | 学生証提出日時 |
| reviewed_at | timestamptz | 審査完了日時 |
| rejection_reason | text | 却下理由 |
| identity_verified | bool | 本人確認済みフラグ（承認後はtrue・学籍情報変更不可） |
| profile_setup_completed | bool | プロフィール設定完了（ブラウズ解放条件） |
| student_id_submitted | bool | 学生証提出済みフラグ |
| onboarding_completed | bool | オンボーディング完了フラグ（/setup/optional完了でtrue） |
| faculty_hide_level | text | none / faculty / department（身バレ防止設定） |
| hidden_clubs | text[] | 非表示にするサークル |
| status_message | text | 今日の一言（最大30文字） |
| last_seen_at | timestamptz | 最終アクティブ日時 |
| show_online_status | bool | オンラインステータス表示設定 |

### likes テーブル拡張カラム（2026-05追加）

| カラム | 型 | 説明 |
|---|---|---|
| via_footprint | bool | 足跡経由でのいいね（受信枠カウント外） |
| counted_to_quota | bool | 受信枠に加算されたか |
| receiver_read_at | timestamptz | 受信者の既読日時（NULL=未読）（029で追加） |
| dismissed_from_match | bool | マッチタブの「今はいい」で永続非表示（030で追加） |

### like_quota テーブル（028で新規作成）

| カラム | 型 | 説明 |
|---|---|---|
| user_id | uuid | 受信対象（男女マッチ志向の女性のみ存在） |
| date | date | 対象日 |
| opens_at | timestamptz | 受信枠の開放時刻（JST 8〜18時のランダム） |
| used_count | int | 当日の使用済み枠数 |

### 重要なトリガー・DB関数

- **handle_new_user()**: auth.users への INSERT 後に profiles を自動作成
- **detect_match()**: likes への INSERT 後に相互いいねを検知し matches を自動作成（LEAST/GREATEST で user_a_id < user_b_id に正規化）
- **set_updated_at()**: profiles の UPDATE 前に updated_at を自動更新
- **should_count_quota(p_liker_id, p_liked_id, p_via_footprint)**: いいねが受信枠カウント対象かを判定する PL/pgSQL 関数
- **pg_cron ジョブ 'generate-like-quota'**: 毎日 UTC 15:00（JST 0:00）に承認済み女性ユーザー全員の翌日分受信枠を生成

### マイグレーション状況

| ファイル | 内容 | 適用状況 |
|---|---|---|
| 001〜025 | 基本テーブル群・新オンボーディングフロー | 適用済みと推定（Supabaseで確認必要） |
| 026 | profiles.birth_date カラム追加 | 適用済みと推定 |
| 027 | admission_year の参照削除（DBカラム残存） | 適用済みと推定 |
| 028 | like_quota テーブル・should_count_quota 関数・pg_cron ジョブ・likes 拡張カラム | 適用済みと推定 |
| 029 | likes.receiver_read_at カラム追加 | 適用済みと推定 |
| 030 | likes.dismissed_from_match カラム追加 | 適用済みと推定 |
| 031 | 外部キー14個 + 複合インデックス（browseパフォーマンス改善） | 適用済みと推定 |

> 「適用済みと推定」はコードから確認。実際の適用状況は Supabase SQL Editor > Migrations または Table Editor で確認すること。

---

## 6. API / 画面ルート一覧

### バックエンド API（prefix: `/api/`）

| メソッド | パス | 用途 | 認証 |
|---|---|---|---|
| GET | /health | ヘルスチェック | 不要 |
| GET | /api/profile/me | 自分のプロフィール取得 | 要 |
| PATCH | /api/profile/me | プロフィール更新 | 要 |
| DELETE | /api/profile/me | アカウント削除（Storage + auth.users 含む完全削除） | 要 |
| POST | /api/profile/upload-student-id | 学生証アップロード | 要 |
| POST | /api/profile/upload-avatar | アバター写真アップロード | 要 |
| GET | /api/profile/avatar-url | アバターURL取得 | 要 |
| POST | /api/profile/photos | 追加写真アップロード（最大6枚） | 要 |
| DELETE | /api/profile/photos/{photo_id} | 写真削除 | 要 |
| POST | /api/profile/photos/{photo_id}/set-main | メイン写真設定 | 要 |
| PATCH | /api/profile/photos/reorder | 写真並び替え | 要 |
| POST | /api/profile/reapply | 再申請（rejected → pending_review） | 要 |
| POST | /api/profile/ping | ラストアクティブ更新（20/min レート制限） | 要 |
| GET | /api/profiles | ユーザー一覧（フィルタ・身バレ防止・BeReal枠フィルタ） | 要 |
| GET | /api/profiles/recommended | おすすめユーザー（趣味スコア順・最大5件） | 要 |
| GET | /api/profiles/views | 自分のプロフィール閲覧者（足跡） | 要 |
| POST | /api/profiles/views/confirm | 足跡既読処理 | 要 |
| GET | /api/profiles/completeness-rank | プロフィール充実度ランキング | 要 |
| GET | /api/profiles/{user_id} | 特定ユーザーのプロフィール詳細（足跡記録も） | 要 |
| POST | /api/likes/ | いいね送信（60/min レート制限・BeReal枠チェック） | 要 |
| GET | /api/likes/quota | 自分の今日の受信枠情報（is_target/opens_at/used_count/is_open/is_full） | 要 |
| GET | /api/likes/today-count | 今日のいいね送信数 | 要 |
| GET | /api/likes/received | 自分へのいいね送信者一覧（for_match_tab パラメータあり） | 要 |
| POST | /api/likes/received/confirm | 受け取ったいいねを既読にする | 要 |
| POST | /api/likes/dismiss/{liker_id} | マッチタブの「今はいい」で永続非表示 | 要 |
| GET | /api/matches/ | マッチ一覧 | 要 |
| GET | /api/matches/unread-count | 未読情報（unread_messages/unread_matches/unread_views/unread_likes_received） | 要 |
| GET | /api/matches/{match_id} | 特定マッチ取得 | 要 |
| DELETE | /api/matches/{match_id} | アンマッチ | 要 |
| POST | /api/messages/ | メッセージ送信（30/min レート制限・WebSocket broadcast） | 要 |
| GET | /api/messages/{match_id} | メッセージ履歴取得（カーソルベース50件） | 要 |
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
| GET | /api/notifications/ | 通知一覧（実装済み・**main.py未include**） | 要 |
| POST | /api/notifications/read-all | 全通知既読（実装済み・**main.py未include**） | 要 |
| POST | /api/notifications/{id}/read | 単一通知既読（実装済み・**main.py未include**） | 要 |
| WS | /ws/chat/{match_id}?token=JWT | リアルタイムチャット | 要（クエリパラメータ） |

### フロントエンドルート

| パス | コンポーネント | 用途 | ガード |
|---|---|---|---|
| / | LandingPage | ランディング | なし |
| /login | LoginPage | ログイン | PublicOnly |
| /signup | SignupPage | 新規登録（@ecs.osaka-u.ac.jp のみ） | PublicOnly |
| /setup/required | SetupRequiredPage | 必須オンボーディング（性別・本人確認・学生証） | Protected |
| /setup/thanks | SetupThanksPage | 学生証提出完了（/setup/optionalへ誘導） | Protected |
| /setup/optional | SetupOptionalPage | オプションオンボーディング（写真・趣味・サークル） | Protected |
| /setup/complete | SetupCompletePage | 完了画面（3秒後に/homeへ自動遷移） | Protected |
| /upload-student-id | UploadStudentIdPage | 学生証アップロード（再申請フロー専用） | Protected |
| /pending | PendingPage | 審査待ち | Protected |
| /rejected | RejectedPage | 却下（再申請ボタン） | Protected |
| /home | HomePage | ホーム | Protected + OnboardingGuard |
| /browse | BrowsePage | ユーザー一覧 | Protected + OnboardingGuard |
| /profile/:id | ProfileDetailPage | ユーザー詳細 | Protected + OnboardingGuard |
| /profile/edit | ProfileEditPage | 自分のプロフィール編集 | Protected + OnboardingGuard |
| /matches | MatchesPage | マッチ一覧 + いいね確認セクション | Protected + OnboardingGuard |
| /chat/:matchId | ChatPage | チャット | Protected + OnboardingGuard + ChatGuard |
| /notifications | NotificationsPage | 通知ハブ（足跡・いいね・マッチへのリンク） | Protected + OnboardingGuard |
| /footprints | FootprintsPage | 足跡一覧（足跡経由いいね可） | Protected + OnboardingGuard |
| /likes/received | LikesReceivedPage | 受け取ったいいね一覧（いいね返し可） | Protected + OnboardingGuard |
| /settings | SettingsPage | 設定（ブロック管理・アカウント削除等） | Protected + OnboardingGuard |
| /admin | AdminDashboardPage | 管理ダッシュボード | Protected + AdminGuard |
| /privacy | PrivacyPolicyPage | プライバシーポリシー | なし |
| /terms | TermsOfServicePage | 利用規約 | なし |

---

## 7. 実装済み機能（動作確認済み）

> 動作確認はコード静的解析による。実際のE2Eテストは**未実施**。

| 機能 | 関連ファイル | 動作概要 |
|---|---|---|
| メール認証登録 | `frontend/src/pages/SignupPage.tsx` | @ecs.osaka-u.ac.jp のみ許可。supabase.auth.signUp() → 確認メール送信 |
| ログイン | `frontend/src/pages/LoginPage.tsx` | Supabase Auth メール/パスワード認証 |
| オンボーディング（必須） | `SetupRequiredPage.tsx`, `backend/routers/profile.py:upload_student_id` | 1ページで性別・本人確認情報・学生証を一括入力・提出 → /setup/thanks |
| オンボーディング（オプション） | `SetupOptionalPage.tsx`, `SetupCompletePage.tsx` | 3ステップで写真・趣味・サークル等をオプション入力 → /setup/complete（3秒後/homeへ） |
| OnboardingGuard | `components/OnboardingGuard.tsx` | student_id_submitted=false → /setup/required、onboarding_completed=false → /setup/optional にリダイレクト |
| ChatGuard | `components/ChatGuard.tsx` | pending/rejected ユーザーのチャットアクセスをブロック |
| 学生証審査（管理者） | `admin/AdminDashboardPage.tsx`, `backend/routers/admin.py` | 審査待ち一覧・学生証署名URL確認・承認/却下 |
| 再申請 | `RejectedPage.tsx`, `UploadStudentIdPage.tsx`, `backend/routers/profile.py:reapply` | rejected → pending_review にリセット |
| プロフィール閲覧 | `BrowsePage.tsx`, `backend/routers/browse.py` | 性別・身バレ防止・BeReal受信枠フィルタ・ブロック/非表示除外 |
| プロフィール詳細 | `ProfileDetailPage.tsx`, `backend/routers/browse.py:get_profile` | 足跡自動記録・いいね状態表示 |
| いいね送信（BeReal枠対応） | `backend/routers/like.py:create_like` | should_count_quota 判定 → 受信枠チェック → INSERT → マッチ確認 → メール送信 |
| 足跡経由いいね | `FootprintsPage.tsx`, `LikesReceivedPage.tsx`, `MatchesPage.tsx` | via_footprint=true でいいね送信（受信枠カウント外） |
| 受信枠情報取得 | `backend/routers/like.py:get_my_quota` | GET /api/likes/quota（フロントエンドUI未実装） |
| いいね既読 | `backend/routers/like.py:confirm_received_likes` | POST /api/likes/received/confirm で receiver_read_at を設定 |
| いいね dismiss | `MatchesPage.tsx`, `backend/routers/like.py:dismiss_like` | マッチタブの「今はいい」→ dismissed_from_match=true |
| 足跡一覧 | `FootprintsPage.tsx`, `backend/routers/browse.py:get_profile_views` | 足跡確認後に自動既読・手動「全員既読」ボタン |
| 受け取ったいいね一覧 | `LikesReceivedPage.tsx`, `backend/routers/like.py:get_received_likes` | is_new フラグ・NEWバッジ表示・表示後自動既読 |
| マッチタブいいね確認 | `MatchesPage.tsx` | for_match_tab=true で dismissed=false のいいね表示・「いいね」「今はいい」ボタン |
| 通知ハブ | `NotificationsPage.tsx` | 足跡・いいね・マッチへのナビゲーション + 未読バッジ表示 |
| 未読カウント | `backend/routers/match.py:get_unread_count` | unread_messages / unread_matches / unread_views / unread_likes_received の4フィールド |
| マッチ確認 | `MatchesPage.tsx`, `backend/routers/match.py` | マッチ一覧・アンマッチ・非表示 |
| リアルタイムチャット | `hooks/useChat.ts`, `backend/routers/ws.py`, `backend/core/ws_manager.py` | WebSocket + HTTP 既読・リアクション・タイピングインジケータ |
| 写真管理（最大6枚） | `ProfileEditPage.tsx`, `backend/routers/profile.py` | アップロード・削除・並び替え・メイン写真設定 |
| ブロック | `backend/routers/safety.py` | ブロック時にマッチも自動削除（messages は CASCADE） |
| 通報 | `backend/routers/safety.py` | 通報時に自動非表示。管理者が停止操作可能 |
| 非表示 | `backend/routers/safety.py` | ブラウズから除外 |
| アカウント削除 | `backend/routers/profile.py:delete_my_account` | Storage + profiles + auth.users を完全削除 |
| 身バレ防止 | `backend/routers/browse.py`, `SettingsPage.tsx` | 学部/学科レベルでの双方向除外・サークルによる双方向除外 |
| メール通知 | `backend/core/email.py` | マッチ成立・オフライン時のメッセージ受信時に Resend でメール送信 |
| レート制限 | `backend/core/limiter.py` | ping(20/min), likes(60/min), messages(30/min), report(10/min) |
| セキュリティヘッダー | `backend/app/main.py:SecurityHeadersMiddleware` | X-Content-Type-Options, X-Frame-Options 等 |
| Toast通知 | `components/Toast.tsx`, `contexts/ToastContext.tsx` | BrowsePage でのいいね送信後フィードバック（motion アニメーション） |
| PWA | `frontend/public/manifest.json`, `hooks/usePWAInstall.ts` | インストール可能 |
| コードスプリッティング | `frontend/src/App.tsx` | React.lazy + Suspense で全ページを遅延ロード |

---

## 8. 実装中・未完成機能

### 8-1. BeReal型受信枠のフロントエンドUI（午後機能・Phase 3予定）

- **進捗**: バックエンド実装済み（migrations 028-031, `GET /api/likes/quota`）、フロントエンドUI**未実装**
- **仕様**: 男女マッチ志向の女性のみが対象。1日に受け取れるいいねの上限5件。JST 8〜18時のランダムな時刻に開放（BeReal風）。
- **未実装箇所**:
  - 自分の受信枠状態（opens_at/used_count/is_open/is_full）を表示するUI
  - 枠が未開放の場合に「まだ枠が開いていない」旨のメッセージ
  - 枠が満杯の場合の表示
  - ブラウズ画面でいいね不可ユーザーのグレーアウト等
- **関連API**: `GET /api/likes/quota`（`like.py:get_my_quota`）
- **設計仕様詳細**: `CLAUDE.md` の「いいね・通知の仕様（2026-05 確定）」セクション参照

### 8-2. 通知ルーター（notifications.py）の main.py への追加

- **進捗**: ルーター完全実装済み（GET /api/notifications/, POST /api/notifications/read-all, POST /api/notifications/{id}/read）
- **残タスク**: `backend/app/main.py` に `from app.routers import notifications` を追加し `app.include_router(notifications.router)` を呼ぶだけ
- **備考**: NotificationsPage.tsx はナビゲーションハブとして再設計済みで `/api/notifications/` を直接使っていない。notifications テーブル自体の活用は後回し。
- **関連ファイル**: `backend/app/routers/notifications.py`, `backend/app/main.py:11`

### 8-3. StatusGuard.tsx の整理

- **進捗**: App.tsx での使用は OnboardingGuard に完全移行済み。ファイルは残存。
- **残タスク**: `frontend/src/components/StatusGuard.tsx` を削除するか残すかの判断。削除して問題なし。

### 8-4. Stripe 課金機能

- **進捗**: 0%（未着手）
- **残タスク**: Phase 12 で実装予定。要件未定義。

### 8-5. profile-images バケットの Private 化

- **進捗**: 0%（TODO）
- **残タスク**: 現在 Public CDN。Private + 署名付きURL に変更すると全画像URL生成ロジックの変更が必要。`CLAUDE.md` に「Ph13前」として記録済み。

---

## 9. 既知のバグ・技術的負債

| 優先度 | 内容 | 再現条件 | 暫定対処 | 影響範囲 |
|---|---|---|---|---|
| 高 | `SUPPORT_EMAIL` が `support@example.com` のままハードコード | RejectedPage を表示する | なし | `frontend/src/pages/RejectedPage.tsx:8` |
| 高 | notifications ルーターが `main.py` に include されていない | 通知API呼び出し時 | なし | `backend/app/main.py`, `backend/app/routers/notifications.py` |
| 中 | `PATCH /api/profile/me` のレスポンスに photos が含まれない（空リスト固定） | プロフィール更新後に写真一覧が消える可能性 | フロント側で GET を別途呼ぶことで回避 | `backend/app/routers/profile.py:~185` |
| 中 | `GET /api/profiles/completeness-rank` が `club`（単数）カラムを参照している可能性 | completeness-rank API呼び出し時 | スコアの club 項目が正しく加算されない可能性 | `backend/app/routers/browse.py:~430` |
| 低 | WebSocket 認証トークンが URL クエリパラメータに露出（ログに記録される） | チャット接続時 | なし（WebSocketの実用上の制約） | `backend/app/routers/ws.py:14` |
| 低 | `e.message` で内部 DB エラーがクライアントに漏洩している箇所が多数 | DB エラー発生時 | なし | `profile.py`, `admin.py` 等多数 |
| 低 | `LikesReceivedPage.tsx` が via_footprint: true でいいね返しを送っている（受信枠カウント外になる） | いいね返し時 | 意図的設計かどうか未確認 | `LikesReceivedPage.tsx:48` |

### 技術的負債

- `_public_image_url()` 関数が `profile.py`, `browse.py`, `like.py`, `match.py`, `safety.py`, `notifications.py` に重複定義（DRY 原則違反）
- マイグレーション実際の適用状況をコードから確認できない（Supabase ダッシュボードで確認必要）
- `StatusGuard.tsx`（旧ガード）がファイルとして残存（App.tsx では OnboardingGuard に移行済み）
- `HomePage.tsx` が `club`（単数）と `clubs`（配列）の両方を interface に持つ（後方互換性のための残骸）

---

## 10. パフォーマンス方針・実装済みの最適化

| 項目 | 内容 | 実装場所 |
|---|---|---|
| コードスプリッティング | React.lazy + Suspense で全ページを遅延ロード | `App.tsx` |
| クエリキャッシュ | React Query staleTime を各クエリに個別設定（10〜300秒） | 各ページ |
| チャット仮想化 | react-virtuoso で大量メッセージを仮想スクロール | `ChatPage.tsx` |
| メール非同期化 | FastAPI BackgroundTasks | `like.py`, `message.py` |
| DBインデックス | 外部キー14個 + 複合インデックス（status+gender+interest_in） | migration 031 |
| N+1解消 | browse.py でDB側一括フィルタ + バッチプロフィール取得 | `browse.py`, `match.py` |
| ページネーション | メッセージ取得をカーソルベース50件に変更 | `message.py` |
| BeReal枠フィルタ | 男性の一覧取得時に like_quota テーブルをDB側で JOIN してフィルタ | `browse.py:119-136` |
| データプリフェッチ | Layout マウント時に profile/matches を先読み | `Layout.tsx:52-62` |
| ボトムナビバッジ | 30秒ポーリングで未読数を更新 | `Layout.tsx` |

---

## 11. テスト状況

- **自動テスト**: 一切なし（backend にも frontend にもテストファイルが存在しない）
- **型チェック**: `npm run build`（tsc -b）で TypeScript 型エラーを検出可能
- **Lint**: `npm run lint`（ESLint）
- **動作確認**: 手動テストのみ

---

## 12. 設計上の重要な決定事項

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
| 受信枠スケジューリング | pg_cron（Supabase 内蔵） | アプリサーバー不要・確実に毎日実行 |

### いいね・通知の仕様（2026-05 確定）

| 項目 | 仕様 |
|---|---|
| 受信上限の対象 | 男女マッチ志向の女性のみ（同性ペアは双方無制限） |
| 1日の上限 | 5件 |
| 開放時刻 | JST 8〜18時のランダムな時刻（pg_cron ジョブで毎日生成） |
| 枠カウント外のルート | 足跡経由（via_footprint=true）・/footprints から・/likes/received から・/notifications 経由のプロフィール |
| 枠フィルタの適用範囲 | GET /api/profiles（一覧）のみ。個別プロフィール・足跡・いいね受信経由は適用しない |
| マッチタブ vs 通知タブ | マッチタブ: 未確認のいいね + マッチ済みの会話（dismiss後消える）<br>通知タブ: ナビゲーションハブ（足跡・いいね・マッチへの未読バッジ付きリンク） |

---

## 13. 次にやるべきタスク（優先順位順）

### Phase 3: BeReal型受信枠フロントエンドUI（午後機能）

1. **[必須] `GET /api/likes/quota` を使った受信枠UIの実装**
   - 対象: 男女マッチ志向の女性ユーザー（`is_target=true`）
   - 表示すべき情報: `opens_at`（開放時刻）、`used_count/max_count`（残り枠数）、`is_open`（現在受け取れるか）、`is_full`（満杯か）
   - 実装候補ページ: `/notifications` または `/home` に受信枠バナーを追加

2. **[必須] ブラウズ画面での枠未開放ユーザーへの説明改善**
   - 現状: 男性から見て受信枠が開いていない女性は一覧に出ない
   - 改善案: 「相手の受け取り可能な時間になると表示されます」等のメッセージ

3. **[高] 枠満杯・未開放時のいいねエラーのフロントエンド対応**
   - 現状: バックエンドは `400 Bad Request` でエラー返却済み
   - 未対応: フロントで適切なエラーメッセージ表示

### 直近のバグ修正

4. **[高] `SUPPORT_EMAIL` を実際のサポートアドレスに変更**
   - `frontend/src/pages/RejectedPage.tsx:8`

5. **[高] notifications ルーターを `main.py` に include する**
   - `backend/app/main.py:11` に import と `app.include_router(notifications.router)` を追加

6. **[中] `PATCH /api/profile/me` のレスポンスで photos を返す**
   - `backend/app/routers/profile.py` の update_my_profile で `_fetch_photos(user_id)` を呼んでレスポンスに含める

7. **[中] completeness-rank の `club` を `clubs` に修正**
   - `backend/app/routers/browse.py:~430` の `club` 参照を `clubs`（配列）に変更

8. **[低] StatusGuard.tsx の削除**
   - `frontend/src/components/StatusGuard.tsx` は App.tsx で使われなくなっているため削除可能

### 中期ロードマップ

- **Phase 12**: Stripe 課金機能
- **Phase 13前**: profile-images バケットを Private 化（署名付きURL対応）
- **テスト整備**: pytest でバックエンドの主要エンドポイントをテスト化
- **本番デプロイ**: Vercel（フロント）+ Fly.io or Railway（バックエンド）候補
- **全大学展開**: 阪大→他大学展開（ドメイン制限の汎化）

---

## 14. ハマりどころ・引継ぎ注意事項

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

- **Windows/PowerShell**: パス区切りは `\`、コマンド連結は `&&` または `;`
- **pydantic-settings v2**: `.env` から `list[str]` を直接読むと JSON パースエラー。文字列で受け取り property で分割する（config.py 参照）
- **Supabase Python クライアント `>=2.0,<2.12`**: バージョンをメジャーで固定。2.12 以降では API が変わる可能性
- **マイグレーションの実行**: Supabase の SQL Editor で手動実行。Alembic 等の自動化なし。`DROP TABLE IF EXISTS ... CASCADE` から始める冪等設計
- **RLS ポリシー**: テーブルに RLS を有効化したら必ず service_role 用ポリシーを追加する（忘れるとバックエンドから読めなくなる）
- **pg_cron ジョブ**: Supabase の Cron Jobs 管理画面（または SQL Editor）で確認・管理する。migration 028 の `cron.schedule()` 呼び出しで登録済みのはず

### ドキュメント化されていない暗黙の前提

- **OnboardingGuard の動作**: `student_id_submitted=false` → `/setup/required`、`onboarding_completed=false` → `/setup/optional` にリダイレクト。`/browse` は pending ユーザーも OnboardingGuard を通過できる（setup完了前提）
- **via_footprint=true の挙動**: 足跡経由いいねは受信枠をカウントしない。`LikesReceivedPage.tsx` でのいいね返しも `via_footprint: true` を送っている（通知タブ経由は受信枠外という仕様の実装）
- **gender/interest_in は一度設定したら変更不可**: バックエンドの `update_my_profile` で既存値があればスキップ。フロント側でも disabled
- **identity_verified=true なら学籍情報の変更を無視**: 承認後に faculty/department/admission_year を変更しようとしても API 側でスルーされる
- **マッチ通知メールは is_online（5分以内にping）の場合は送らない**: オンライン中はリアルタイムチャットで見えるため
- **profile-images のパス**: user_id + timestamp + rand 含む。URL の推測は困難だがバケットは現在 Public
- **WebSocket はマッチ参加者でない接続を code 4003 で切断**: 不正アクセス防止済み
- **Browse でのBeReal枠フィルタ**: 男性が女性一覧を取得する場合のみ適用。available_ids が空（受け取り可能な女性が1人もいない）の場合は空配列を返す
- **like_quota の初回生成**: migration 028 の末尾で既存の承認済み女性ユーザー全員に対して今日分の枠を一括 INSERT している

---

*このドキュメントはコードベースの静的解析に基づいて生成。マイグレーションの実際の適用状況・本番環境の設定は Supabase ダッシュボードで直接確認すること。*
