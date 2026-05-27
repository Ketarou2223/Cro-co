# Cro-co デプロイ手順

最終更新日: 2026-05-27

環境変数の正は `backend/app/core/config.py`（一覧は docs/ARCHITECTURE.md セクション9）。

---

## 環境の全体像

| 環境 | フロント | バックエンド | Supabase | 状態 |
|---|---|---|---|---|
| 本番 (prod) | Vercel（crocoweb.jp） | Render（api.crocoweb.jp） | 本番プロジェクト | 稼働中 |
| 開発 (dev) | Vercel Preview（dev ブランチ） | Render（cro-co-api-dev.onrender.com） | hpkpndjqtzycnytymdkk | ✅ 構築済み（2026-05-25） |

---

## ドメイン構成

| ドメイン | 用途 |
|---|---|
| `crocoweb.jp` | フロントエンド（apex） |
| `www.crocoweb.jp` | crocoweb.jp へリダイレクト |
| `api.crocoweb.jp` | バックエンド API |

---

## Vercel（フロントエンド）

### 初回セットアップ
1. GitHub リポジトリをインポート
2. Root Directory: `frontend`
3. Framework Preset: `Vite`
4. 環境変数を設定（Production 環境）:
   ```
   VITE_API_URL=https://api.crocoweb.jp
   VITE_SUPABASE_URL=（Supabase ダッシュボードから取得）
   VITE_SUPABASE_ANON_KEY=（同上）
   ```
5. カスタムドメイン追加: `crocoweb.jp`（Primary）/ `www.crocoweb.jp`（リダイレクト）

### DNS 設定（ドメインレジストラ側）
```
A     @    → 76.76.21.21（Vercel）
CNAME www  → cname.vercel-dns.com
```

### デプロイ
- `main` への push で自動デプロイ（Production）
- その他ブランチは Preview URL として自動デプロイ
- `dev` ブランチの Preview は dev 環境変数（`VITE_API_URL=https://cro-co-api-dev.onrender.com` 等）を使用（設定済み）

---

## Render（バックエンド）

### 初回セットアップ
1. Web Service を新規作成（GitHub 連携）
2. Root Directory: `backend`
3. Runtime: Python 3.14
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 環境変数
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
SECRET_KEY=（python -c "import secrets; print(secrets.token_hex(32))" で生成）
ALLOWED_ORIGINS=https://crocoweb.jp,https://www.crocoweb.jp
ADMIN_EMAILS=（カンマ区切り、スペースなし）
RESEND_API_KEY=
FROM_EMAIL=noreply@crocoweb.jp
FRONTEND_URL=https://crocoweb.jp
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:（連絡先メール）
PRIVACY_HASH_SALT=（PII ハッシュ化用・未設定だと purge が動かない）
```
> ⚠️ 変数名は `VAPID_EMAIL`（旧ドキュメントの `VAPID_ADMIN_EMAIL` ではない）。`PRIVACY_HASH_SALT` を忘れない。

### カスタムドメイン設定
```
CNAME api → <Render が指定するホスト名>
```

### デプロイ
- `main` への push で自動デプロイ。Render ダッシュボード > Logs で状況確認

---

## Supabase（DB / Auth / Storage）

### Authentication 設定
1. URL Configuration:
   - Site URL: `https://crocoweb.jp`
   - Redirect URLs: `https://crocoweb.jp/**`、`https://www.crocoweb.jp/**`
2. Sign In / Providers → Email → Confirm email: **ON**（本番必須）
3. SMTP Settings（Custom SMTP）: Resend を設定（Host `smtp.resend.com` / Port 465 / Username `resend` / Sender `noreply@crocoweb.jp`）

### Storage 設定確認
| バケット | 現状 | リリース前に必要な作業 |
|---|---|---|
| `student-ids` | Private ✅ | — |
| `profile-images` | Private ✅（2026-05-27 確認） | — |

---

## Resend（メール）

1. Domains で `crocoweb.jp` を追加（DKIM / SPF / DMARC 設定済み）
2. 検証完了後 `FROM_EMAIL=noreply@crocoweb.jp` が有効

---

## マイグレーション適用手順

マイグレーションは Supabase SQL Editor で手動実行（ORM なし）。

1. Supabase ダッシュボード → SQL Editor
2. `backend/migrations/` 配下の SQL を番号順に実行
3. 現在のファイル: 001〜040（036 が番号重複。詳細 docs/ARCHITECTURE.md セクション8）
4. 新規追加は `041_*.sql` から採番
5. **dev / 本番の両方に適用**し、適用状況を docs/ARCHITECTURE.md のマイグレーション表に追記する

> 冪等性: 全マイグレーションは `IF NOT EXISTS` / `IF EXISTS` を使い再実行可能。

---

## dev 環境の構成（✅ 構築済み 2026-05-25）

- Supabase dev: project_id `hpkpndjqtzycnytymdkk`（035/037/038/039 適用確認済み 2026-05-27・Authentication 設定済み。storage バケットは未作成）
- Vercel Preview 環境変数（dev）設定済み
- Render dev サービス `cro-co-api-dev`（https://cro-co-api-dev.onrender.com）
- VAPID キーを dev / prod 別々に生成・設定済み

---

## デプロイ前チェックリスト

- [ ] Supabase の Redirect URLs に本番 URL 追加済み
- [ ] Supabase の Confirm email が ON
- [ ] Supabase の Custom SMTP（Resend）設定済み
- [ ] Vercel の環境変数設定済み（Production）
- [ ] Render の環境変数設定済み（VAPID_EMAIL / PRIVACY_HASH_SALT を含む）
- [ ] `SECRET_KEY` が本番用に生成済み
- [ ] `ADMIN_EMAILS` が正しい値
- [x] 全マイグレーションが本番 Supabase に適用済み（035/037/038/039 を 2026-05-27 確認）
- [ ] DNS の伝播確認・HTTPS 証明書発行確認
- [ ] 本番でのサインアップ・ログイン動作確認 / CORS エラー確認
- [ ] docs/ROADMAP.md のリリース前セキュリティチェックリスト全項目を確認

---

## GitHub Branch Protection

`main` への直接 push を禁止し PR 経由のみにする。

1. Settings → Branches → Add branch protection rule
2. Branch name pattern: `main`
3. チェック: Require a pull request before merging / Require approvals: 0 / Dismiss stale approvals / Do not allow bypassing
4. 作業フロー: `dev` で開発 → PR 作成 → 自分でレビューしてマージ
