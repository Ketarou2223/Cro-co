# Cro-co デプロイ手順

最終更新日: 2026-05-25

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
5. カスタムドメイン追加:
   - `crocoweb.jp`（Primary）
   - `www.crocoweb.jp`（crocoweb.jp へリダイレクト設定）

### DNS 設定（ドメインレジストラ側）
```
A     @    → 76.76.21.21（Vercel）
CNAME www  → cname.vercel-dns.com
```

### デプロイ
- `main` ブランチへの push で自動デプロイ（Production）
- その他ブランチは Preview URL として自動デプロイ

> **Preview 環境変数**: `dev` ブランチの Preview デプロイは dev 環境変数（`VITE_API_URL=https://cro-co-api-dev.onrender.com` 等）を使用するよう設定済み（2026-05-25 完了）。

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
VAPID_ADMIN_EMAIL=
```

### カスタムドメイン設定
```
CNAME api → <Render が指定するホスト名>
```

### デプロイ
- `main` ブランチへの push で自動デプロイ
- Render ダッシュボード > Logs でデプロイ状況確認

---

## Supabase（DB / Auth / Storage）

### Authentication 設定
1. Authentication → URL Configuration:
   - Site URL: `https://crocoweb.jp`
   - Redirect URLs に追加:
     - `https://crocoweb.jp/**`
     - `https://www.crocoweb.jp/**`
2. Authentication → Sign In / Providers → Email:
   - Confirm email: **ON**（本番必須。開発時 OFF にしていた場合は戻すこと）
3. Authentication → SMTP Settings（Custom SMTP）:
   - Resend の API キーを設定（デフォルト SMTP は 2通/時間の制限あり）

### Storage 設定確認
| バケット | 現状 | リリース前に必要な作業 |
|---|---|---|
| `student-ids` | Private ✅ | — |
| `profile-images` | **Public** ⚠️ | Step 7 で Private 化 + 署名付き URL 切り替え |

---

## Resend（メール）

1. Domains で `crocoweb.jp` を追加
2. DNS に表示された SPF / DKIM レコードを追加:
   ```
   TXT  @          → v=spf1 include:amazonses.com ~all（Resend 指定に従う）
   CNAME resend._domainkey → resend._domainkey.crocoweb.jp.（Resend 指定値）
   ```
3. 検証完了後 `FROM_EMAIL=noreply@crocoweb.jp` が有効

---

## マイグレーション適用手順

マイグレーションは Supabase SQL Editor で手動実行（ORM なし）。

1. Supabase ダッシュボード → SQL Editor を開く
2. `backend/migrations/` 配下の SQL ファイルを番号順に実行
3. 現在のファイル数: 38個（一部 036 が重複番号）
4. 新しいマイグレーションを追加するときは `039_*.sql` から採番

> **冪等性**: 全マイグレーションは `IF NOT EXISTS` / `IF EXISTS` を使い
> 再実行してもエラーにならないように書く。

---

## dev 環境の構成（✅ 構築済み 2026-05-25）

### Supabase dev プロジェクト
- project_id: `hpkpndjqtzycnytymdkk`
- 全マイグレーション 001〜038 適用済み
- Authentication Site URL: dev 用に設定済み

### Vercel Preview 環境変数（設定済み）
- Project Settings → Environment Variables の `Preview` 環境に以下が設定済み:
  ```
  VITE_API_URL=https://cro-co-api-dev.onrender.com
  VITE_SUPABASE_URL=（dev プロジェクト URL）
  VITE_SUPABASE_ANON_KEY=（dev プロジェクト anon key）
  ```

### Render dev サービス（構築済み）
- サービス名: `cro-co-api-dev`
- URL: https://cro-co-api-dev.onrender.com
- dev 用の Supabase URL / キーを環境変数に設定済み

### VAPID キー（dev/prod 分離済み）
- dev / prod それぞれ別キーを生成済み
- 各 Render サービスの環境変数に設定済み

> ⚠️ **本番 Supabase への残作業**: `038_fix_blocks_rls.sql` の手動適用がまだ。
> Supabase ダッシュボード → SQL Editor で `backend/migrations/038_fix_blocks_rls.sql` を実行すること。

---

## デプロイ前チェックリスト

- [ ] Supabase の Redirect URLs に本番 URL 追加済み
- [ ] Supabase の Confirm email が ON
- [ ] Supabase の Custom SMTP（Resend）設定済み
- [ ] Vercel の環境変数設定済み（Production）
- [ ] Render の環境変数設定済み
- [ ] `SECRET_KEY` が本番用に生成済み（開発用と異なる値）
- [ ] `ADMIN_EMAILS` が正しい値に設定済み
- [ ] DNS の伝播確認（A レコード・CNAME）
- [ ] HTTPS 証明書の発行確認（Vercel / Render 自動）
- [ ] 本番でのサインアップ・ログイン動作確認
- [ ] CORS エラーが出ないか確認
- [ ] `docs/PRE_RELEASE_SECURITY_CHECKLIST.md` の全項目を確認

---

## GitHub Branch Protection

`main` ブランチへの直接 push を禁止し、PR 経由のみにする設定。

### 設定手順

1. GitHub リポジトリ → **Settings** → **Branches**
2. 「Add branch protection rule」をクリック
3. Branch name pattern: `main`
4. 以下にチェック:
   - [x] Require a pull request before merging
   - [x] Require approvals: `0`（個人開発のため）
   - [x] Dismiss stale pull request approvals when new commits are pushed
   - [x] Do not allow bypassing the above settings（管理者でも適用）
5. Save changes

### 設定後の作業フロー

- 開発は `dev` ブランチで行う
- `dev` → `main` への変更は GitHub 上で PR 作成
- 自分でレビューしてマージ
- `main` への直接 push は不可（誤操作防止）
