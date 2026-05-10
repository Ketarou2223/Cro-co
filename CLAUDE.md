# Cro-co 開発ガイド

## プロジェクト概要
- 特定の1大学限定マッチングアプリ（Web版）
- 個人開発・バイブコーディング

## 技術スタック
### フロントエンド (frontend/)
- React 19 + Vite + TypeScript
- Tailwind CSS v4 + shadcn/ui (Radix preset, Nova theme)
- パスエイリアス: @/ → ./src/
- 起動: cd frontend && npm run dev (localhost:5173)

### バックエンド (backend/)
- FastAPI + Python 3.14
- 仮想環境: backend/.venv
- 主な依存: fastapi, uvicorn, sqlalchemy, alembic, pydantic, python-dotenv, stripe, supabase
- 起動: cd backend && .venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload --port 8000

### データ層（予定）
- Supabase (PostgreSQL + Auth + Storage)
- Stripe（課金）

## セキュリティルール（最重要・必ず守る）
- シークレット・APIキーをコードに直接書かない。必ず .env から読む
- .env は .gitignore に必ず含める
- 認証が必要なAPIには必ず Depends(get_current_user) を付ける
- CORS の allow_origins は本番では特定オリジンに限定する
- Stripe Webhook は必ず construct_event で署名検証する
- SQLAlchemy ORMを使い、生のSQLは書かない
- ファイルアップロードは MIME タイプとサイズを検証する

## コーディング規約
- Python: 型ヒント必須、Pydanticでバリデーション必須
- TypeScript: any 型の使用禁止
- 新機能はフロントとバックを同時に実装する

## 回答スタイル
- 日本語で説明する
- コードを書く前に「何をするか」を一言で説明する
- 複数ファイルにまたがる変更は一度にすべて書く

## 環境
- OS: Windows
- シェル: PowerShell
- ターミナルコマンドは Windows 形式で書くこと（&& は使えるが、パス区切りは \ を使う）

## Supabase RLS のルール
- RLSを有効化したテーブルには必ずservice_role用のポリシーも作成すること
- GRANT ALL ON [table] TO service_role; と
  CREATE POLICY ... TO service_role USING (true) WITH CHECK (true) を含める

## SQL マイグレーションのルール（経験則）

- DROP TRIGGER ... ON テーブル名 は、テーブルが存在しない時にエラーを起こす
- 解決策：DROP は CASCADE 付きで親オブジェクトから消すか、IF EXISTS とブロック分割を使う
- 推奨パターン：
```sql
  DROP TABLE IF EXISTS public.profiles CASCADE;  -- これだけで関連triggerも消える
  CREATE TABLE public.profiles ( ... );
  CREATE FUNCTION ... ;
  CREATE TRIGGER ... ON public.profiles ... ;
```
- マイグレーションは「テーブル削除 → テーブル作成 → 関連オブジェクト作成」の順で書く
- 長いSQLは複数のクエリに分割実行して、各段階で Table Editor を確認する

## pydantic-settings の落とし穴（経験則）

- .env から list[str] や list[int] を読むときは要注意
- pydantic-settings v2 はリスト型を読むときに JSON 解釈を先に試みる
- `ADMIN_EMAILS=a@x.com,b@x.com` のような CSV は JSON ではないのでエラーになる
- field_validator(mode="before") でも回避できない
- 解決策: 文字列として保持し、property で分割する
```python
  admin_emails_csv: str = Field(default="", alias="ADMIN_EMAILS")
  
  @property
  def admin_emails(self) -> list[str]:
      return [e.strip().lower() for e in self.admin_emails_csv.split(",") if e.strip()]
```
- `model_config = SettingsConfigDict(populate_by_name=True)` を忘れずに