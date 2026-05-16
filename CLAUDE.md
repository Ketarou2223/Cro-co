# Cro-co 開発ガイド

## プロジェクト概要
- 大阪大学(@ecs.osaka-u.ac.jp)限定マッチングアプリ（Web版）
- 個人開発・バイブコーディング
- リポジトリパス: C:\01_WorkSpace\Cro-co

## 技術スタック

### フロントエンド (frontend/)
- React 19 + Vite + TypeScript
- Tailwind CSS v4 + shadcn/ui (Radix preset, Nova theme)
- ルーティング: react-router-dom v7
- HTTP: axios（lib/api.ts に Bearer インターセプター）
- アイコン: lucide-react
- フォント: @fontsource-variable/geist
- パスエイリアス: @/ → ./src/
- 起動: cd frontend && npm run dev → http://localhost:5173

### バックエンド (backend/)
- FastAPI + Python 3.14
- 仮想環境: backend/.venv
- DB アクセス: Supabase Python クライアント（service_role）
- ※ SQLAlchemy/Alembic は requirements.txt から削除済み。マイグレーションは Supabase の SQL Editor で直接実行
- 起動: cd backend && .venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload --port 8000

### データ層
- Supabase (PostgreSQL + Auth + Storage)
- Stripe（Phase 12 で実装予定・現時点では未統合）

## 環境
- OS: Windows
- シェル: PowerShell
- パス区切りは `\`、コマンド連結は `&&` または `;`

---

## プロジェクト構造

### frontend/src/
- main.tsx / App.tsx（ルーター定義）
- lib/: api.ts, supabase.ts, utils.ts, validation.ts
- contexts/: AuthContext.tsx
- components/: Layout, ProtectedRoute, PublicOnlyRoute, StatusGuard, AdminGuard
- components/ui/: shadcn コンポーネント群
- pages/: 各ページコンポーネント、pages/admin/ AdminDashboardPage

### backend/app/
- main.py
- core/: config.py, supabase_client.py
- auth/: dependencies.py（get_current_user, require_admin）
- schemas/: profile, browse, like, match, message, safety, admin
- routers/: health, profile, browse, like, match, message, safety, admin

---

## データベーステーブル一覧（参照用）

| テーブル | 主な役割 | 主キー |
|---|---|---|
| profiles | ユーザー情報・status管理 | id (= auth.users.id) |
| profile_images | プロフィール写真（最大6枚） | id (uuid) |
| likes | いいね記録 | (liker_id, liked_id) |
| matches | 両思い成立 | id (uuid), UNIQUE (user_a_id, user_b_id) |
| messages | チャットメッセージ | id (uuid) |
| blocks | ブロック | (blocker_id, blocked_id) |
| reports | 通報 | id (uuid) |
| hides | 非表示 | (hider_id, hidden_id) |

詳細スキーマは backend/migrations/ の各 SQL ファイルを正とする。

---

## API エンドポイント一覧（参照用）

すべて prefix `/api/` 配下。認証は Authorization: Bearer <JWT> ヘッダー。

- /api/profile/* : 自分のプロフィール CRUD・写真管理・学生証アップ・アカウント削除
- /api/profiles, /api/profiles/{id} : 他ユーザーの閲覧（approved 必須）
- /api/likes/ : いいね送信
- /api/matches/, /api/matches/{id} : マッチ一覧・単一取得
- /api/messages/, /api/messages/{match_id} : メッセージ送受信
- /api/safety/block, /report, /hide, /blocked-ids, /hidden-ids : 安全機能
- /api/admin/pending, /reports, /student-id/{id}, /approve/{id}, /reject/{id}, /suspend/{id} : 管理者専用

詳細は backend/app/routers/*.py を参照。

---

## 重要な設計決定

- **matches の正規化**: user_a_id < user_b_id（LEAST/GREATEST）で重複ペアを防止
- **マッチ自動成立**: likes への INSERT トリガー（detect_match関数）で matches を自動作成
- **管理者判定**: backend/.env の ADMIN_EMAILS（カンマ区切り）で判定。フロントには管理者リストを置かない（AdminGuard は API 試行で判定）
- **Storage**: profile-images・student-ids ともに Private、署名付き URL（5分有効）で配信
- **写真上限6枚**: profile_images の INSERT 前にアプリ側でカウントチェック
- **ドメイン制限**: フロントの validation.ts で @ecs.osaka-u.ac.jp のみ許可

---

## セキュリティルール（最重要・必ず守る）

- シークレット・APIキーをコードに直接書かない。必ず .env から読む
- .env は .gitignore に含めること
- 認証が必要なAPIには必ず Depends(get_current_user) を付ける
- 管理者専用APIには Depends(require_admin) を付ける
- CORS の allow_origins は本番では特定オリジンに限定する
- ファイルアップロードは MIME タイプとサイズを必ず検証する
- フロントエンドに管理者リストを置かない（VITE_ADMIN_EMAILS のような env も使わない）

---

## コーディング規約

- Python: 型ヒント必須、Pydantic でバリデーション必須
- TypeScript: any 型の使用禁止
- 日本語のエラーメッセージで返す
- 新機能はフロント・バックを同時に実装する

---

## Claude Code への共通指示（毎回書かなくていいこと）

### 絶対に触らないファイル
- frontend/src/lib/api.ts（axios設定）
- frontend/src/lib/supabase.ts（Supabase クライアント）
- frontend/src/contexts/AuthContext.tsx（認証状態管理）
- frontend/src/components/ProtectedRoute.tsx
- frontend/src/components/PublicOnlyRoute.tsx
- frontend/src/components/StatusGuard.tsx
- frontend/src/components/AdminGuard.tsx
- backend/app/core/config.py
- backend/app/core/supabase_client.py
- backend/app/auth/dependencies.py
- **/.env、**/.env.local

### 毎回守ること
- バックエンド変更時は既存エンドポイントを削除・変更しない（追加のみ）
- SQL マイグレーションは必ず冪等性を持たせる（DROP IF EXISTS → CREATE）
- RLS を有効化したテーブルには必ず service_role 用ポリシーを追加
- TypeScript の any 禁止、Python の型ヒント必須
- 変更前に変更ファイル一覧を提示して承認を取る
- フロントでは shadcn/ui コンポーネントを優先的に使う

---

## 既知のバグ・TODO

- **[修正済]** backend/app/routers/safety.py の block エンドポイントで matches テーブルを `user1_id/user2_id` で検索していたが、`user_a_id/user_b_id` に修正済み
- **[修正済]** ChatPage はポーリングなし・WebSocket のみ。ポーリング残留は確認されていない
- **[修正済]** 再申請フロー（/api/profile/reapply + RejectedPage）実装済み
- **[修正済]** NotificationsPage.tsx のルート（/notifications）を App.tsx に追加済み
- **[Ph12予定]** Stripe 課金機能が未実装
- **[Ph13前]** profile-images バケットを Private + 署名付きURL に変更して承認ユーザー制限を強化（現在 Public CDN）

---

## 経験則・落とし穴

### SQL マイグレーション
- DROP TRIGGER ... ON テーブル名 は、テーブルが存在しない時にエラーを起こす
- 推奨: DROP TABLE IF EXISTS ... CASCADE で関連オブジェクトごと一括削除してから CREATE
- マイグレーションは「テーブル削除 → テーブル作成 → 関連オブジェクト作成」の順
- 長いSQLは複数クエリに分割して、各段階で Table Editor を確認

### pydantic-settings の list 型
- .env から list[str] を読むと JSON 解釈エラーになる（v2 の既知挙動）
- 解決: 文字列として保持し property で分割
```python
  admin_emails_csv: str = Field(default="", alias="ADMIN_EMAILS")
  
  @property
  def admin_emails(self) -> list[str]:
      return [e.strip().lower() for e in self.admin_emails_csv.split(",") if e.strip()]
```
- `model_config = SettingsConfigDict(populate_by_name=True)` を忘れずに

### RLS と service_role
- RLS を有効化したテーブルには必ず以下を追加:
```sql
  GRANT ALL ON public.テーブル名 TO service_role;
  CREATE POLICY "service_role full access" ON public.テーブル名
    FOR ALL TO service_role USING (true) WITH CHECK (true);
```

## 実行モード（重要）

### 全自動モード（現在の設定）
- ファイル変更の事前承認は不要。即座に実装する
- エラーが出たら自分でデバッグして修正まで完結させる
- 動作確認も自分で実施し、結果をレポートする
- 詰まっても質問せず、最善策で進める
- 完了したら何をしたかのサマリーだけ出す

---

## Cro-co デザインガイドライン（黒枠・Y2Kスタイル 確定版）

### ブランドコア
- キャッチコピー: 「普通の日常を、カラフルに。」
- サブコピー: 「思ったより、近くに。」
- ブランドキャラクター: Crocoワニ（薄緑・デフォルメ・SVGで実装）
- アプリ名: Cro-co（Crocodile の Croco + 一緒に の co）
- 将来: 全国の大学に展開予定

### デザインスタイル: ネオブルータリズム × Y2K
- 黒の太枠: border-2 border-ink
- shadow: 4px 4px 0 0 #0A0A0A
- カラフルなカード背景
- 大きな日本語タイポグラフィ + モノスペースの英数字
- ユーザーカードは学年を巨大表示
- マーキーバー（横スクロールテキスト）をヘッダー直下に常設

### カラーパレット
メイン:
- --color-ink: #0A0A0A（黒・枠線・テキスト）
- --color-paper: #ffffff（白・背景）
- --color-acid: #DFFF1F（蛍光イエロー・アクティブ・ボタン）
- --color-mint: #A8F0D1（ミントグリーン）
- --color-hot: #FF3B6B（ピンク・いいね・マッチ・削除）

カードカラー（ユーザーカードの背景に使用）:
- --card-yellow: #FFE94D
- --card-pink: #FF7DA8
- --card-orange: #FF7A3D
- --card-blue: #6BB5FF
- --card-green: #8AE8B5
- --card-purple: #C9A8FF

カードカラーの割り当て:
ユーザーIDのハッシュから6色のいずれかを決定する。
実装例:
```ts
const colors = ['#FFE94D','#FF7DA8','#FF7A3D','#6BB5FF','#8AE8B5','#C9A8FF'];
const color = colors[userId.charCodeAt(0) % colors.length];
```

### タイポグラフィ
- メインフォント: Noto Sans JP
  - 見出し: 900weight・letter-spacing -0.02em・line-height 0.95
  - 本文: 400weight・line-height 1.7
- 英字アクセント: Space Mono
  - uppercase・letter-spacing 0.05em
  - 数字・英語ラベル・タグに使用
- font-display クラス: Noto Sans JP 900weight
- font-mono クラス: Space Mono

### コンポーネントルール

#### card-bold（基本カード）
- border: 2px solid #0A0A0A
- border-radius: 18px
- box-shadow: 4px 4px 0 0 #0A0A0A
- ホバー: translate(-2px, -2px) + shadow 6px 6px 0 0 #0A0A0A
- transition: 0.15s ease

#### ボタン
- bold: bg-ink text-white border-2 border-ink shadow(4px 4px 0 0 ink) font-bold
- acid: bg-acid text-ink border-2 border-ink shadow(4px 4px 0 0 ink) font-bold
- outline-bold: bg-white text-ink border-2 border-ink shadow(4px 4px 0 0 ink) font-bold
- 全ボタン: font-weight 700・押下時 translate(2px 2px) shadow縮小

#### 入力フィールド
- border: 2px solid #0A0A0A
- focus時: box-shadow 2px 2px 0 0 #0A0A0A
- border-radius: 8px

#### タグ・バッジ（tag-pill）
- border: 1.5px solid #0A0A0A
- border-radius: 9999px
- font-weight: 700
- font-size: 12px
- padding: 4px 10px

#### DropdownMenu
- shadcn/ui の DropdownMenu を使用
- トリガーボタンは variant="outline-bold"

### ボトムナビ（Layout.tsx）
- 背景: bg-ink（黒）
- 4タブ: ホーム・さがす・マッチ・設定
- 非アクティブ: 白アイコン + 白テキスト（text-xs）
- アクティブ: bg-acid（蛍光イエロー）の丸の上にアイコン + 黒テキスト
- アイコン: lucide-react（絵文字は使わない）
  - ホーム: Home
  - さがす: Search
  - マッチ: Heart
  - 設定: Settings
- border-top: 2px solid #0A0A0A

### マーキーバー（MarqueeBar.tsx）
- 黒背景（bg-ink）・白文字
- Space Mono・uppercase・font-bold
- 高さ: 36px
- 上下に 2px の黒枠
- 区切り文字: ◆
- 無限横スクロール（CSS animation marquee）
- items: ["MATCH", "NEW USERS", "TODAY", "CRUSH", "U", "SPRING 2026", "MATCHING NOW"]

### ページ共通ルール
- max-width: 480px（モバイルファースト）・mx-auto
- ヘッダー: sticky top-0・白背景・border-b-2 border-ink・高さ56px
  - 左: 「Cro-co.」font-display text-2xl text-ink
  - 右: 通知ベル + 状況に応じたボタン
- ヘッダー直下: MarqueeBar
- コンテンツ: pb-24（ボトムナビ分の余白）

### 絶対に使わないもの（禁止事項）
- 絵文字（lucide-reactアイコンまたはSVGで必ず代替）
- グラデーション背景
- 装飾目的の box-shadow（card-boldの影のみ許可）
- shadcn の Card コンポーネントをそのまま使う
- 全ての要素を中央揃えにする（左揃えベース）
- ローディングスピナーをそのまま使う（文字アニメで代替）
- 赤いアラートボックス（インラインテキストでさりげなく）

### Crocoキャラクター
使用場面:
- プロフィール写真未設定時のデフォルトアイコン
- ローディング中
- 空状態（マッチ0件・メッセージ0件など）
- エラー画面

実装方法:
- 必ずインラインSVGで実装（画像ファイル・imgタグは使わない）
- CrocoIllust.tsx コンポーネントとして切り出す
- props: size（デフォルト80）・className
- カラー: #A8F0D1（ミントグリーン）

### トーン・ボイス（マイクロコピー）
人格: ちょっとユーモアのある知的な先輩
言葉: ため口寄り・敬語とため口の中間
英語: おしゃれアクセントとして使う

推奨テキスト例:
- ローディング: 「探してます、ちょっと待って。」
- 審査中: 「確認中。もう少しだけ。」
- マッチ: 「いい感じじゃないですか。」
- エラー: 「うまくいかなかった。もう一度試してみて。」
- 空状態（マッチ0件）: 「まだマッチがいない。いいねを送ってみよう。」
- 空状態（メッセージ0件）: 「最初のメッセージを送ってみよう。」
- 送信中: 「送ってます...」
- 保存中: 「保存中...」
- 登録完了: 「準備できた。次は学生証を提出して。」
- 却下理由なし: 「詳細は運営から連絡します。」

禁止テキスト:
- 「〜できます」「〜してください」「〜です。」で終わる硬い文体
- 「エラーが発生しました」
- 「操作が完了しました」
- 「ご確認ください」