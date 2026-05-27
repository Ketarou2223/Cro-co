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
| `student-ids` | Private ✅（dev/prod 両方・5MB・image/jpeg+png） | — |
| `profile-images` | Private ✅（dev/prod 両方・5MB・image/jpeg+png・2026-05-27 確認） | — |

> バケットは **migration 041（`041_create_storage_buckets.sql`）で作成**する（prod 同設定: Private/5MB/`image/jpeg`+`image/png`）。`ON CONFLICT (id) DO NOTHING` で冪等なので、新環境セットアップ時はマイグレーションを番号順に流すだけでバケットも再現される。Dashboard での手動作成は不要。dev では `scripts/storage_smoke_dev.ps1` で service_role アップロード→署名 URL→削除の HTTP 疎通を検証済み（200/200/200・2026-05-27）。

---

## Resend（メール）

1. Domains で `crocoweb.jp` を追加（DKIM / SPF / DMARC 設定済み）
2. 検証完了後 `FROM_EMAIL=noreply@crocoweb.jp` が有効

---

## マイグレーション適用手順

マイグレーションは Supabase SQL Editor で手動実行（ORM なし）。

1. Supabase ダッシュボード → SQL Editor
2. `backend/migrations/` 配下の SQL を番号順に実行
3. 現在のファイル: 001〜041（036 が番号重複。詳細 docs/ARCHITECTURE.md セクション8）
4. 新規追加は `042_*.sql` から採番
5. **dev / 本番の両方に適用**し、適用状況を docs/ARCHITECTURE.md のマイグレーション表に追記する

> 冪等性: 全マイグレーションは `IF NOT EXISTS` / `IF EXISTS` を使い再実行可能。

---

## dev 環境の構成（✅ 構築済み 2026-05-25）

- Supabase dev: project_id `hpkpndjqtzycnytymdkk`（035/037/038/039/040/041 適用確認済み・Authentication 設定済み。storage バケット profile-images / student-ids は migration 041 で作成済み 2026-05-27・prod 同設定。dev の HTTP 疎通を `scripts/storage_smoke_dev.ps1` で検証済み 200/200/200）
- Vercel Preview 環境変数（dev）設定済み
- Render dev サービス `cro-co-api-dev`（https://cro-co-api-dev.onrender.com）
- VAPID キーを dev / prod 別々に生成・設定済み
- `PRIVACY_HASH_SALT`: ✅ **dev Render に設定済み**（2026-05-27 追加）。**dev / prod で別値**（`python -c "import secrets; print(secrets.token_hex(32))"` で生成）。未設定だと privacy_purge のハッシュ化が中止される
- `HASH_RETENTION_DAYS`: env 非対象（`backend/app/core/privacy_purge.py:22` のハードコード定数 365）。現状 dev Render に設定が残っていても**無効・削除しても影響なし**

---

## テストユーザーシード手順（dev のみ）

dev で実機テストするためのテストユーザーを `scripts/seed_test_users_dev.ps1` で作成・削除・一覧する。dev はメール確認 OFF だがフロントが新規サインアップを固定で `/check-email` に飛ばすため、Supabase Admin API でユーザーを作成し profiles を直接昇格させてサインアップフローをバイパスする。

> ⚠️ **dev 専用**。`$base` は dev プロジェクト（`hpkpndjqtzycnytymdkk`）固定。prod の service_role キーを `DEV_SRK` に入れて実行しないこと（prod に書き込まれる）。

```powershell
# service_role キーは env 経由で渡す（チャット/ログに残さない）
$env:DEV_SRK = '<dev service_role key>'
$env:DEV_TEST_PASSWORD = 'TestUser_2026!'   # 省略可。未指定なら TestUser_2026! を使用しログに出力

.\scripts\seed_test_users_dev.ps1 --create     # テストユーザー13人を作成
.\scripts\seed_test_users_dev.ps1 --list        # 現在の e2etest_ ユーザー一覧
.\scripts\seed_test_users_dev.ps1 --cleanup     # e2etest_ ユーザーを全削除

$env:DEV_SRK = $null
$env:DEV_TEST_PASSWORD = $null
```

- 期待出力末尾（create）: `RESULT: created=13 errors=0`
- 全テストユーザーの email は `e2etest_*@ecs.osaka-u.ac.jp`。パスワードは全員共通（`DEV_TEST_PASSWORD` 未指定時は `TestUser_2026!`）
- 構成: オーナー1 / 異性ターゲット6（写真あり・なし・複数枚・デフォルトひとことの各パターン）/ 同性ペア2 / BAN1 / 審査待ち1 / 退会済み1 / ブロック対象1
- ダミー写真は実行時に純 PowerShell で生成（6 色ソリッド PNG・`profile-images` バケットへ service_role でアップロード + `profile_images` へ approved で登録）
- `--create` は冪等: 既存ユーザーがいれば再作成せず profiles を再適用する
- `--cleanup` は storage（profile-images / student-ids）を物理削除 → `auth.users` を削除（profiles / profile_images は CASCADE 連動削除）
- βリリース前（docs/ROADMAP.md Step 5）に prod のテストデータを除去するのとは別物。これは dev 限定のシード

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

`main` への直接 push を禁止し PR 経由のみにする。**新形式の Repository Rulesets** で実装済み（2026-05-27 確認・旧 Branch Protection Rules 形式ではない）。

現状の設定（`main` 対象 ruleset）:

| 項目 | 状態 |
|---|---|
| Require a pull request before merging | ON |
| Require approvals | 0 |
| Dismiss stale pull request approvals | OFF（approvals=0 のため stale approval は発生しない・無害） |
| Do not allow bypassing the above settings | ON |
| Restrict deletions（ブランチ削除禁止） | ON（追加保護） |
| Restrict non-fast-forward pushes（force push 禁止） | ON（追加保護） |

- 作業フロー: `dev` で開発 → PR 作成 → 自分でレビューしてマージ → `main` 本番デプロイ
- 将来 approvals を 1 以上に変える場合は **Dismiss stale pull request approvals を ON** にすること（古い承認が新しい push を承認したまま残らないようにするため）
