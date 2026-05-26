# Cro-co 開発ガイド（Claude Code 用）

最終更新日: 2026-05-25

---

## セキュリティ
リリース前には必ず `docs/PRE_RELEASE_SECURITY_CHECKLIST.md` の全項目をチェックすること。

---

## プロジェクト概要

大阪大学（@ecs.osaka-u.ac.jp）限定マッチングアプリ（Web 版）。個人開発。
リポジトリ: `C:\01_WorkSpace\Cro-co`

---

## サービス対象（重要・誤認しやすい）

> **AI への注意**: `@ecs.osaka-u.ac.jp` は阪大「工学系」専用ではなく、**学部生全員**の共通メールアドレス。
> 「工学系限定」「数千人規模」と書いたり説明したりしないこと。

- `@ecs.osaka-u.ac.jp` は大阪大学**学部生全員**の共通メールアドレス
- 対象母数: **約12,000人**（1学年 約3,000人 × 4学年）
- 院生は対象外（大学院入学でメールアドレスが変わるため。将来的な対象拡大は検討中）

---

## 技術スタック

### フロントエンド（`frontend/`）
- React 19 + Vite + TypeScript
- Tailwind CSS v4 + shadcn/ui（Radix preset, Nova theme）
- ルーティング: react-router-dom v7
- HTTP: axios（`lib/api.ts` に Bearer インターセプター）
- アイコン: lucide-react（絵文字禁止・lucide-react または SVG で代替）
- フォント: Noto Sans JP + Space Mono
- パスエイリアス: `@/` → `./src/`
- 起動: `cd frontend && npm run dev` → http://localhost:5173

### バックエンド（`backend/`）
- FastAPI + Python 3.14
- 仮想環境: `backend/.venv`
- DB アクセス: Supabase Python クライアント（service_role）
- ORM なし。SQLAlchemy / Alembic は削除済み。マイグレーションは Supabase SQL Editor で直接実行
- 起動: `cd backend && .venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload --port 8000`

### データ層
- Supabase（PostgreSQL + Auth + Storage）
- Stripe（Phase 12 で実装予定・未統合）

---

## 環境

- OS: Windows
- シェル: PowerShell
- パス区切り: `\`
- コマンド連結: `&&` または `;`

---

## ディレクトリ構造

```
Cro-co/
├── frontend/src/
│   ├── main.tsx / App.tsx          # ルーター定義（27ルート）
│   ├── lib/
│   │   ├── api.ts                  # axios 設定（触らない）
│   │   ├── supabase.ts             # Supabase クライアント（触らない）
│   │   ├── utils.ts
│   │   └── validation.ts           # @ecs.osaka-u.ac.jp ドメイン制限
│   ├── contexts/
│   │   └── AuthContext.tsx         # 認証状態管理（触らない）
│   ├── components/
│   │   ├── Layout.tsx              # ボトムナビ・マーキーバー
│   │   ├── ProtectedRoute.tsx      # 要認証（触らない）
│   │   ├── PublicOnlyRoute.tsx     # 非認証のみ（触らない）
│   │   ├── OnboardingGuard.tsx     # オンボーディング未完了リダイレクト（触らない）
│   │   ├── ChatGuard.tsx           # チャット制限（触らない）
│   │   ├── AdminGuard.tsx          # 管理者判定（触らない）
│   │   └── ui/                     # shadcn コンポーネント群
│   └── pages/
│       ├── LandingPage.tsx
│       ├── LoginPage.tsx / SignupPage.tsx / ResetPasswordPage.tsx
│       ├── setup/                  # オンボーディング（6ステップ）
│       │   ├── SetupRequiredPage.tsx   # 学生証 + 必須項目
│       │   ├── SetupThanksPage.tsx     # 提出完了メッセージ
│       │   ├── SetupOptionalPage.tsx   # 任意項目
│       │   ├── SetupInstallPage.tsx    # PWA インストール誘導
│       │   ├── SetupNotifyPage.tsx     # プッシュ通知許可
│       │   └── SetupCompletePage.tsx   # 完了 → ホームへ
│       ├── PendingPage.tsx / RejectedPage.tsx / UploadStudentIdPage.tsx
│       ├── HomePage.tsx / BrowsePage.tsx / ProfileDetailPage.tsx
│       ├── ProfileEditPage.tsx / MatchesPage.tsx / ChatPage.tsx
│       ├── NotificationsPage.tsx / FootprintsPage.tsx / LikesReceivedPage.tsx
│       ├── SettingsPage.tsx
│       ├── PrivacyPolicyPage.tsx / TermsOfServicePage.tsx
│       └── admin/
│           └── AdminDashboardPage.tsx
│
├── backend/app/
│   ├── main.py                     # FastAPI app・ルーター登録（12本）
│   ├── core/
│   │   ├── config.py               # 設定（触らない）
│   │   ├── supabase_client.py      # Supabase クライアント（触らない）
│   │   └── image_utils.py          # 署名付き URL 生成（get_signed_image_url）
│   ├── auth/
│   │   └── dependencies.py         # get_current_user / require_admin（触らない）
│   ├── schemas/                    # Pydantic モデル
│   └── routers/
│       ├── health.py / profile.py / admin.py
│       ├── browse.py / like.py / match.py / message.py
│       ├── safety.py / push.py / notifications.py
│       ├── ws.py                   # WebSocket チャット
│       └── inquiries.py
│
├── backend/migrations/             # SQL マイグレーション（001〜038、一部重複番号あり）
│
├── README.md / CLAUDE.md / HANDOFF.md / DEPLOY.md / ROADMAP.md
└── docs/
    ├── FLOW.md                     # 認証・フロー図
    ├── PRE_RELEASE_SECURITY_CHECKLIST.md
    └── archive/                    # 旧ドキュメント（参照のみ）
```

---

## 触らないファイル一覧（変更禁止）

以下のファイルは認証・API・設定の中核であり、変更すると動作が壊れる。

```
frontend/src/lib/api.ts                     # axios + Bearer インターセプター
frontend/src/lib/supabase.ts                # Supabase クライアント
frontend/src/contexts/AuthContext.tsx       # 認証状態管理
frontend/src/components/ProtectedRoute.tsx  # 要認証ルート
frontend/src/components/PublicOnlyRoute.tsx # 非認証専用ルート
frontend/src/components/OnboardingGuard.tsx # オンボーディング未完了リダイレクト
frontend/src/components/ChatGuard.tsx       # チャット制限（審査中 / 却下）
frontend/src/components/AdminGuard.tsx      # 管理者 API 試行で判定
backend/app/core/config.py                  # pydantic-settings 設定
backend/app/core/supabase_client.py         # Supabase Python クライアント
backend/app/auth/dependencies.py            # get_current_user / require_admin
**/.env  **/.env.local                      # 環境変数ファイル
```

---

## データベーステーブル一覧

| テーブル | 主な役割 |
|---|---|
| `profiles` | ユーザー情報・status管理（33フィールド） |
| `profile_images` | プロフィール写真（最大6枚）・status: pending/approved/rejected |
| `likes` | いいね記録・受信枠カウント |
| `like_quota` | 女性の1日あたり受信枠（BeReal型） |
| `matches` | 両思い成立（UNIQUE: user_a_id < user_b_id） |
| `messages` | チャットメッセージ |
| `blocks` | ブロック（blocker_id のみ操作可） |
| `reports` | 通報 |
| `hides` | 非表示 |
| `notifications` | 通知 |
| `push_subscriptions` | Web Push 購読情報（VAPID） |
| `profile_views` | 足跡 |
| `admin_logs` | 管理者操作ログ |
| `inquiries` | 問い合わせ |

詳細スキーマは `backend/migrations/` の各 SQL ファイルを正とする。

---

## API エンドポイント一覧

すべて prefix `/api/` 配下。認証は `Authorization: Bearer <JWT>` ヘッダー。

| グループ | prefix | 主なエンドポイント |
|---|---|---|
| ヘルスチェック | — | `GET /health` |
| プロフィール | `/api/profile` | 自分のプロフィール CRUD・写真管理・学生証アップ・再申請・退会 |
| ブラウズ | `/api` | `GET /api/profiles`・`GET /api/profile-detail/{id}`・足跡 |
| いいね | `/api/likes` | 送受信・取り消し・既読 |
| マッチ | `/api/matches` | 一覧・単一取得 |
| メッセージ | `/api/messages` | 送受信・既読・削除 |
| 安全機能 | `/api/safety` | ブロック・通報・非表示 |
| プッシュ通知 | `/api/push` | VAPID 公開鍵・購読登録解除 |
| 通知 | `/api/notifications` | 一覧・既読 |
| WebSocket | `/ws` | `GET /ws/chat/{match_id}?token=JWT` |
| 問い合わせ | `/api/inquiries` | 作成・自分の一覧 |
| 管理者 | `/api/admin` | ユーザー審査・写真審査・BAN・通報・ログ・統計・バッチ |

詳細は `backend/app/routers/*.py` を参照。

---

## 重要な設計決定

### matches の正規化
`user_a_id < user_b_id`（LEAST/GREATEST）で重複ペアを防止。

### マッチ自動成立
`likes` への INSERT トリガー（`detect_match` 関数）で `matches` を自動作成。

### 管理者判定
`backend/.env` の `ADMIN_EMAILS`（カンマ区切り）で判定。
フロントには管理者リストを置かない。`AdminGuard` は `GET /api/admin/pending` への API 試行で判定。`VITE_ADMIN_EMAILS` のような env は使わない。

### Storage バケット
- `student-ids`: **Private**。管理者のみ署名付き URL（5分有効）でアクセス
- `profile-images`: **現在 Public**。Step 7（ROADMAP.md）で Private 化予定。
  Private 化後は `image_utils.py` の `get_signed_image_url()` + フロントの `getProfileImageSignedUrl()` に切り替える。

### 写真審査フロー
1. `POST /api/profile/photos` でアップロード → `status='pending'` で DB 挿入
2. 管理者が `GET /api/admin/photos/pending` で確認
3. 承認: `POST /api/admin/photos/{id}/approve` → `status='approved'`
4. 却下: `POST /api/admin/photos/{id}/reject` → `status='rejected'`

### BeReal型いいね受信枠
- 対象: 男女マッチ志向の女性のみ（5件/日）
- 同性ペア（男男・女女）は双方無制限
- 足跡・いいね受信一覧・通知経由のいいね（`via_footprint=true`）はカウント外
- バックエンド実装済み・フロントエンド UI は未実装

### オンボーディングフロー
```
/setup/required → /setup/thanks → /setup/optional → /setup/install → /setup/notify → /setup/complete
```
- `OnboardingGuard`: `student_id_submitted === false` → `/setup/required`
- `OnboardingGuard`: `student_id_submitted === true && !onboarding_completed` → `/setup/optional`

### 退会フロー
`DELETE /api/profile/me` でソフトデリート + PII 除去。
`privacy_purge` バッチが毎日 03:00 JST に実行し、ハッシュ以外の PII を削除。

### 本名・学籍番号のハッシュ保持
退会後も重複登録防止のため、ハッシュ値のみ保持（本名・学籍番号の平文は削除）。

---

## セキュリティルール（最重要）

- シークレット・API キーをコードに直接書かない。必ず `.env` から読む
- `.env` は `.gitignore` に含めること
- 認証が必要な API には必ず `Depends(get_current_user)` を付ける
- 管理者専用 API には `Depends(require_admin)` を付ける
- CORS の `allow_origins` は本番では特定オリジンに限定する
- ファイルアップロードは MIME タイプとサイズを必ず検証する
- フロントエンドに管理者リストを置かない

---

## コーディング規約

- Python: 型ヒント必須、Pydantic でバリデーション必須
- TypeScript: `any` 型の使用禁止
- ORM なし: DB 操作は Supabase クライアントを直接使用
- 日本語のエラーメッセージで返す
- `SELECT *` を使わない（必要カラムを明示）
- ループ内で DB クエリを発行しない（N+1 厳禁）
- 新機能はフロント・バックを同時に実装する

### コメントのルール
- コメントは「なぜ」を書くときのみ。「何をするか」は書かない
- 1行以内に収める

---

## コーディング規約（SQL マイグレーション）

- 冪等性必須: `IF NOT EXISTS` / `IF EXISTS` を使い、再実行してもエラーにならないように
- 新しいマイグレーション: `039_*.sql` から採番
- RLS を有効化したテーブルには必ず service_role 用ポリシーを追加:
  ```sql
  GRANT ALL ON public.テーブル名 TO service_role;
  CREATE POLICY "service_role full access" ON public.テーブル名
    FOR ALL TO service_role USING (true) WITH CHECK (true);
  ```

---

## 既知の落とし穴

### pydantic-settings の list 型
`.env` から `list[str]` を読むと JSON 解釈エラーになる（v2 の既知挙動）。
```python
admin_emails_csv: str = Field(default="", alias="ADMIN_EMAILS")

@property
def admin_emails(self) -> list[str]:
    return [e.strip().lower() for e in self.admin_emails_csv.split(",") if e.strip()]
```
`model_config = SettingsConfigDict(populate_by_name=True)` も必要。

### SQL トリガーの DROP
`DROP TRIGGER ... ON テーブル名` はテーブルが存在しない時エラーになる。
推奨: `DROP TABLE IF EXISTS ... CASCADE` で関連オブジェクトごと一括削除してから CREATE。

---

## パフォーマンス方針

### 実装済み
- コードスプリッティング: `React.lazy` + `Suspense`（`App.tsx`）
- React Query `staleTime`: 各クエリに個別設定（10〜300秒）
- チャット仮想化: `react-virtuoso`（`ChatPage.tsx`）
- メール送信非同期: FastAPI `BackgroundTasks`
- DB インデックス: 外部キー14個 + 複合インデックス（migration 031）

### 新機能追加時のルール
- 新しい `useQuery` には必ず `staleTime` を設定する
- メール送信・外部 API 呼び出しは必ず `BackgroundTasks` で非同期化
- 新エンドポイントで `SELECT *` は使わない

---

## ナビゲーション原則

新しくページを作る際、必ず以下2つを実装する:
1. 「新しいページに飛べるボタン」を、関連する既存ページに配置する
2. 「直前のページに戻るボタン」を新ページの上部に必ず配置する（`navigate(-1)` または明示的な遷移先）

---

## 機能追加時のルール

機能を追加したら、以下を必ず更新する:
1. **CLAUDE.md**: API 一覧・DB テーブル・設計決定・触らないファイルに変更があれば更新
2. **HANDOFF.md**: 完了済み機能リスト・直近完了タスク・既知の問題を更新
3. **docs/IDEAS.md**: 新機能を追加するときはリストを確認し、該当機能があれば「判断トリガー」が満たされているかチェックする
4. 大きな仕様変更時は **HANDOFF.md** と **ROADMAP.md** も合わせて更新する

---

## デザインシステム: ネオブルータリズム × Y2K

### ブランドコア
- キャッチコピー: 「普通の日常を、カラフルに。」
- サブコピー: 「思ったより、近くに。」
- ブランドキャラクター: Croco ワニ（薄緑・デフォルメ・SVG 実装）
- アプリ名: Cro-co（Crocodile の Croco + 一緒に の co）

### カラーパレット

| 変数名 | 値 | 用途 |
|---|---|---|
| `--color-ink` | `#0A0A0A` | 黒・枠線・テキスト |
| `--color-paper` | `#ffffff` | 白・背景 |
| `--color-acid` | `#DFFF1F` | 蛍光イエロー・アクティブ・ボタン |
| `--color-mint` | `#A8F0D1` | ミントグリーン |
| `--color-hot` | `#FF3B6B` | ピンク・いいね・マッチ・削除 |

カードカラー（ユーザーカードの背景）:
```ts
const colors = ['#FFE94D','#FF7DA8','#FF7A3D','#6BB5FF','#8AE8B5','#C9A8FF'];
const color = colors[userId.charCodeAt(0) % colors.length];
```

### タイポグラフィ
- メインフォント: Noto Sans JP（見出し: 900weight・letter-spacing -0.02em）
- 英字アクセント: Space Mono（uppercase・letter-spacing 0.05em・数字・英語ラベル・タグ）
- `font-display` クラス: Noto Sans JP 900weight
- `font-mono` クラス: Space Mono

### コンポーネントルール

#### card-bold（基本カード）
```css
border: 2px solid #0A0A0A;
border-radius: 18px;
box-shadow: 4px 4px 0 0 #0A0A0A;
/* ホバー */
transform: translate(-2px, -2px);
box-shadow: 6px 6px 0 0 #0A0A0A;
transition: 0.15s ease;
```

#### ボタン種別
- `bold`: `bg-ink text-white border-2 border-ink shadow(4px 4px 0 0 ink) font-bold`
- `acid`: `bg-acid text-ink border-2 border-ink shadow(4px 4px 0 0 ink) font-bold`
- `outline-bold`: `bg-white text-ink border-2 border-ink shadow(4px 4px 0 0 ink) font-bold`
- 全ボタン: font-weight 700・押下時 translate(2px 2px) shadow 縮小

#### 入力フィールド
- `border: 2px solid #0A0A0A; border-radius: 8px;`
- focus 時: `box-shadow: 2px 2px 0 0 #0A0A0A`

#### タグ・バッジ（tag-pill）
- `border: 1.5px solid #0A0A0A; border-radius: 9999px; font-weight: 700; font-size: 12px; padding: 4px 10px`

### ボトムナビ（Layout.tsx）
- 背景: `bg-ink`（黒）・4タブ: ホーム / さがす / マッチ / 設定
- 非アクティブ: 白アイコン + 白テキスト（text-xs）
- アクティブ: `bg-acid`（蛍光イエロー）丸の上にアイコン + 黒テキスト
- アイコン: `Home / Search / Heart / Settings`（lucide-react）
- `border-top: 2px solid #0A0A0A`

### マーキーバー（MarqueeBar.tsx）
- 黒背景（`bg-ink`）・白文字・Space Mono・uppercase・font-bold・高さ 36px
- 区切り文字: `◆`・無限横スクロール（CSS animation）

### ページ共通ルール
- `max-width: 480px`（モバイルファースト）・`mx-auto`
- ヘッダー: `sticky top-0 border-b-2 border-ink` 高さ 56px
  - 左: 「Cro-co.」font-display text-2xl
  - 右: 通知ベル + 状況に応じたボタン
- ヘッダー直下: MarqueeBar
- コンテンツ: `pb-24`（ボトムナビ分の余白）

### Croco キャラクター
使用場面: プロフィール写真未設定・ローディング・空状態・エラー画面
- 必ずインライン SVG で実装（`<img>` タグ禁止）
- `CrocoIllust.tsx` コンポーネントとして切り出す
- props: `size`（デフォルト 80）・`className`
- カラー: `#A8F0D1`（ミントグリーン）

### 絶対に使わないもの（禁止事項）
- 絵文字（lucide-react または SVG で代替）
- グラデーション背景
- 装飾目的の box-shadow（card-bold の影のみ許可）
- shadcn の `Card` コンポーネントをそのまま使う
- 全要素の中央揃え（左揃えベース）
- ローディングスピナー（文字アニメで代替）
- 赤いアラートボックス（インラインテキストでさりげなく）

### トーン・ボイス（マイクロコピー）
人格: ちょっとユーモアのある知的な先輩（ため口寄り）

| 場面 | テキスト |
|---|---|
| ローディング | 「探してます、ちょっと待って。」 |
| 審査中 | 「確認中。もう少しだけ。」 |
| マッチ | 「いい感じじゃないですか。」 |
| エラー | 「うまくいかなかった。もう一度試してみて。」 |
| 空状態（マッチ0件） | 「まだマッチがいない。いいねを送ってみよう。」 |
| 空状態（メッセージ0件） | 「最初のメッセージを送ってみよう。」 |

禁止テキスト: 「〜できます」「エラーが発生しました」「操作が完了しました」「ご確認ください」

---

## 実行モード（全自動モード）

- ファイル変更の事前承認は不要。即座に実装する
- エラーが出たら自分でデバッグして修正まで完結させる
- 動作確認も自分で実施し、結果をレポートする
- 詰まっても質問せず、最善策で進める
- 完了したら何をしたかのサマリーだけ出す
