# Cro-co セキュリティ監査レポート

**日付**: 2026-05-16  
**監査対象**: backend/ 全ルーター・コア / frontend/src/  
**監査者**: Claude Sonnet 4.6（静的コード解析）

---

## 🔴 緊急対応が必要（Critical）

### C-1: 認証なしの `/api/test/supabase` エンドポイントが本番に残っている

**ファイル**: `backend/app/main.py:29-40`

```python
@app.get("/api/test/supabase")
def test_supabase() -> dict[str, object]:
    engine = create_engine(settings.database_url)
    tables: list[str] = sa_inspect(engine).get_table_names(schema="public")
    ...
    return {"status": "error", "message": str(e)}  # ← DBエラー内容を丸ごと返す
```

**問題**:
1. **認証不要** — Bearer トークンなしで誰でもアクセス可能
2. **スキーマ漏洩** — `public` スキーマの全テーブル名を返す（profiles, messages, blocks 等）
3. **クレデンシャル漏洩リスク** — `str(e)` が接続文字列やパスワードを含む可能性がある（`database_url` の接続エラー時）
4. **直接DB接続** — SQLAlchemy で Supabase の RLS を完全バイパスする接続を使用

**推奨対応**: このエンドポイントを**即時削除**する。ヘルスチェックが必要であれば `/api/health` を使用すること。

---

### C-2: メール本文にユーザー入力を HTML エスケープせず埋め込んでいる

**ファイル**: `backend/app/core/email.py:22-26, 42-46`

```python
"html": (
    f"<p>{matched_user_name}さんとマッチしました！</p>"  # ← 未エスケープ
    '<p><a href="http://localhost:5173/matches">Cro-coを開く</a></p>'
)
```

**問題**:
- `matched_user_name` はユーザーが登録した名前（`ProfileUpdateRequest` の `name` フィールド）
- 例えば `<b>テスト</b><img src=x onerror=alert(1)>` という名前を登録すると、メールクライアント側でHTMLインジェクションが発生する
- Gmail・Outlook 等のリッチメールクライアントはHTML emailを解釈するため、フィッシング誘導に悪用可能

**追加問題**: URL が `http://localhost:5173` にハードコードされており、本番環境では動作しない（`email.py:25, 43`）

**推奨対応**:
```python
import html
safe_name = html.escape(matched_user_name)
f"<p>{safe_name}さんとマッチしました！</p>"
```
URLは環境変数 `FRONTEND_URL` から読む。

---

## 🟡 改善推奨（High / Medium）

### H-1: WebSocket 認証トークンが URL クエリパラメータに露出している

**ファイル**: `backend/app/routers/ws.py:14`

```python
token: str = Query(...)  # ?token=eyJhbGc... としてURLに含まれる
```

**問題**:
- WebSocket 接続 URL は nginx/uvicorn のアクセスログに記録される
- ブラウザの履歴・デベロッパーツールの Network タブに完全なJWTが表示される
- ロードバランサーの access.log にも残る

**補足**: WebSocket はヘッダー認証が困難という実用上の制約があるため、この構造自体はよくあるパターン。ただしログレベルを調整し、トークンをマスクする対応が望ましい。

**推奨対応**: サーバーログで `token=` パラメータをマスクする設定を追加する。トークンの有効期限を短くする（Supabase の JWT expiry 設定）。

---

### H-2: `e.message` で内部 DB エラーがクライアントに漏洩している

**ファイル**: `profile.py:107, 164, 283, 295, 380, 504` など多数

```python
# 例: profile.py:107
detail=f"プロフィールの更新に失敗しました: {e.message}"
```

**問題**:
- `APIError.message` は PostgreSQL のエラー文字列をそのまま含む場合がある
- DB カラム名・制約名・インデックス名などが露出する可能性
- 例: `duplicate key value violates unique constraint "profiles_pkey"`

**推奨対応**: 本番では `e.message` を除外し、汎用エラーメッセージのみを返す。

```python
# 開発時
detail=f"プロフィールの更新に失敗しました: {e.message}"
# 本番
detail="プロフィールの更新に失敗しました"
```

---

### H-3: セキュリティ HTTP ヘッダーが未設定

**ファイル**: `backend/app/main.py`

CORSMiddleware のみが設定されており、以下のヘッダーが欠如している:

| ヘッダー | 効果 |
|---|---|
| `X-Content-Type-Options: nosniff` | MIMEスニッフィング防止 |
| `X-Frame-Options: DENY` | クリックジャッキング防止 |
| `X-XSS-Protection: 1; mode=block` | ブラウザXSS保護 |
| `Referrer-Policy: strict-origin-when-cross-origin` | Referrer漏洩防止 |
| `Permissions-Policy` | カメラ・マイク等の権限制限 |
| `Content-Security-Policy` | XSS・インジェクション防止 |

**推奨対応**:
```python
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(SecurityHeadersMiddleware)
```

---

### H-4: CORS が `allow_headers=["*"]` で過剰に許可されている

**ファイル**: `backend/app/main.py:15-16`

```python
allow_methods=["*"],
allow_headers=["*"],
```

**推奨対応**:
```python
allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
allow_headers=["Authorization", "Content-Type"],
```

---

### M-1: `unblock_user` / `unhide_user` の path パラメータが UUID 未検証

**ファイル**: `backend/app/routers/safety.py:79, 160`

```python
async def unblock_user(blocked_id: str, ...)   # str — UUID形式チェックなし
async def unhide_user(hidden_id: str, ...)     # str — UUID形式チェックなし
```

**問題**: 不正な文字列を渡しても DB クエリが `blocker_id=me` で絞り込まれるため実害はほぼないが、Pydantic の `UUID` 型に変更すれば入力検証が一貫する。

**同様の問題**:
- `browse.py:339` の `get_profile(user_id: str)`
- `admin.py:44, 119, 160, 200` の `user_id: str`（管理者のみなので低リスク）

**推奨対応**: `UUID` 型に変更する。

---

### M-2: `.or_()` フィルタで f-string を使用している

**ファイル**: `match.py:51`, `browse.py:162`, `safety.py:66-68`

```python
.or_(f"user_a_id.eq.{my_id},user_b_id.eq.{my_id}")
```

**問題**: `my_id` は `str(current_user.id)`（Supabase Auth の UUID）から来るため、実際の SQL インジェクションリスクはほぼゼロ。ただし supabase-py の OR フィルタに直接 f-string を渡すパターンは、将来コードが変更されたとき危険になりうる。

**補足**: Supabase クライアントは内部で REST API（PostgREST）を使用しており、パラメータは URL クエリとして送信されるため、SQL インジェクションの経路ではない。

---

### M-3: レート制限がない

**問題**: 以下のエンドポイントにレート制限がない:
- `POST /api/likes/` — 無制限にいいねを送信可能
- `POST /api/safety/report` — 同一ユーザーへの大量通報
- `POST /api/profile/ping` — DB 更新の連打
- `POST /api/messages/` — メッセージスパム

**推奨対応**: `slowapi` などで IP・ユーザー単位のレート制限を追加する。

---

### M-4: `profile-images` バケットが Public（認証不要でアクセス可能）

**ファイル**: `backend/app/routers/profile.py:26`、その他多数

```python
f"{settings.supabase_url}/storage/v1/object/public/profile-images/{path}"
```

**問題**: 承認されていないユーザー（あるいは未登録の第三者）が、URL を知っていれば画像に直接アクセスできる。パスに UUID + タイムスタンプが含まれるため推測は困難（security through obscurity）。

**現状の設計判断**: CLAUDE.md に「Phase 13前: バケットを Public CDN 化して読み込み速度を改善」と記載されており、この方向性は既知。ただし「承認ユーザーのみが見られる」という仕様とは厳密には一致していない。

---

## 🟢 良好（問題なし）

### 認証・セッション
- ✅ JWT 検証: 全保護エンドポイントで `Depends(get_current_user)` 経由の Supabase `get_user()` が呼ばれている
- ✅ パスワードハッシュ: Supabase Auth（bcrypt）に委譲しており、アプリ層にパスワードが届かない
- ✅ ログアウト: フロントの `supabase.auth.signOut()` でローカルセッションを破棄
- ✅ リフレッシュトークン: Supabase クライアントが自動管理（アプリ層で扱わない）

### 認可・IDOR対策
- ✅ 写真削除: `photo["user_id"] != str(current_user.id)` で所有権チェック（`profile.py:418`）
- ✅ 写真並び替え: 全IDが自分のものかサーバー側で検証（`profile.py:274-287`）
- ✅ メッセージ送信: `_assert_match_member()` でマッチ参加者であることを確認（`message.py:44-70`）
- ✅ アンマッチ: `user_a_id` or `user_b_id` == `my_id` を確認してから削除（`match.py:295`）
- ✅ WebSocket: 接続時にマッチ参加者確認済み（`ws.py:26-38`）
- ✅ 管理者API: 全エンドポイントで `Depends(require_admin)` が付いている
- ✅ approved チェック: browse / match / message / like 全てで `status == "approved"` を確認
- ✅ 通知の IDOR: `eq("user_id", my_id)` で自分の通知のみ取得・更新

### 入力検証
- ✅ ファイルアップロード: MIME タイプ（allow-list）+ サイズ制限を全アップロードで検証
- ✅ SVG: JPEG / PNG のみ許可（`_ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}`）
- ✅ 文字数制限: `name(50)`, `bio(500)`, `status_message(30)`, `content(1000)` を Pydantic で検証
- ✅ 年次バリデーション: `year: int = Field(ge=1, le=6)` で範囲チェック
- ✅ 通報理由: `REPORT_REASONS` タプルとのホワイトリスト照合（`safety.py:103`）
- ✅ UUID 型: photo_id、match_id（REST）、message_id 等で Pydantic `UUID` 型を使用

### インジェクション攻撃
- ✅ Supabase クライアントは PostgREST REST API を使用 — SQL は直接構築されない
- ✅ f-string によるSQL構築: なし（`.or_()` の f-string は PostgREST フィルタ構文のため SQL インジェクション経路でない）
- ✅ `eval` / `exec`: 使用なし
- ✅ Python 型ヒント: 全ルーターで使用

### 出力エンコーディング
- ✅ `dangerouslySetInnerHTML`: フロントエンドで使用なし（全ソース検索済み）
- ✅ React のデフォルト: `{variable}` の JSX 埋め込みは自動 HTML エスケープ

### エラー処理
- ✅ FastAPI のデフォルト動作: 500 エラー時にスタックトレースは返さない（`debug=False` が デフォルト）
- ✅ `except Exception:` パターン: 例外を外部に漏らさず HTTP エラーへ変換している

### 機密情報の取り扱い
- ✅ `.env` ファイル: `.gitignore` で除外済み（ルートレベル、`**/.env` パターン）
- ✅ ハードコードされたAPIキー: なし（全て `.env` 経由）
- ✅ `console.log` でのトークン出力: フロントエンドで確認なし
- ✅ `logging.error()` でのシークレット出力: バックエンドで確認なし
- ✅ ADMIN_EMAILS: フロントエンドに置かず、バックエンドの `.env` のみで管理

### 依存関係
- ✅ FastAPI 0.136.1（2025年時点の最新付近）
- ✅ pydantic 2.x を使用（v1 の多くの脆弱性を修正したバージョン）
- ✅ supabase `>=2.0,<2.12`（メジャーバージョン固定）

---

## 詳細: 優先度別アクション一覧

| 優先度 | 項目 | 対応コスト |
|---|---|---|
| 🔴 即日 | C-1: `/api/test/supabase` を削除 | 低（1行削除） |
| 🔴 即日 | C-2: email.py で `html.escape()` を適用 + URL 環境変数化 | 低 |
| 🟡 1週間 | H-1: WS トークンのログマスク | 中 |
| 🟡 1週間 | H-2: `e.message` の本番非公開化 | 低（定型対応） |
| 🟡 1週間 | H-3: セキュリティヘッダー追加 | 低 |
| 🟡 1週間 | H-4: CORS ヘッダーを最小化 | 低 |
| 🟢 随時 | M-1: `str` → `UUID` 型変換 | 低 |
| 🟢 随時 | M-3: `slowapi` でレート制限追加 | 中 |
| 🟢 随時 | M-4: profile-images を Private + 署名付きURL化 | 高（影響範囲大） |
