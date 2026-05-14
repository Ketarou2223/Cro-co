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
- ※ SQLAlchemy/Alembic はインストール済みだが未使用。マイグレーションは Supabase の SQL Editor で直接実行
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

- **[未修正]** backend/app/routers/safety.py の block エンドポイントで matches テーブルを `user1_id/user2_id` で検索しているが、実際のカラム名は `user_a_id/user_b_id`。ブロック時のマッチ削除が機能しない（Ph10前に修正予定）
- **[未確認]** ChatPage のポーリングが Phase 7 のUI改修で削除されていないか要確認
- **[Ph11予定]** rejected ユーザーの再申請フローが未実装
- **[Ph12予定]** Stripe 課金機能が未実装
- **[Ph13前]** profile-images バケットを Public CDN 化して読み込み速度を改善

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