# Cro-co デプロイ手順

最終更新日: 2026-05-31

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
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX  # GA4 測定 ID（任意。未設定で GA 完全無効）
   ```
   > `VITE_GA_MEASUREMENT_ID` は Production 環境にのみ設定する。Preview（dev ブランチ）には設定しない（`import.meta.env.PROD=false` でスキップされるが設定ゼロが最もクリーン）。GA4 プロパティは Google Analytics ダッシュボード → 管理 → プロパティ → データストリーム → 測定 ID で取得。
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
# LIKE_QUOTA_ENABLED=（任意・未設定で False＝β は OFF。True にすると BeReal 型受信枠+男性向け閲覧フィルタが復活する）
```
> ⚠️ 変数名は `VAPID_EMAIL`（旧ドキュメントの `VAPID_ADMIN_EMAIL` ではない）。`PRIVACY_HASH_SALT` を忘れない。`LIKE_QUOTA_ENABLED` は β は設定不要（=False）。

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
3. 現在のファイル: 001〜043（036 が番号重複。詳細 docs/ARCHITECTURE.md セクション8）
4. 新規追加は `044_*.sql` から採番
5. **dev / 本番の両方に適用**し、適用状況を docs/ARCHITECTURE.md のマイグレーション表に追記する
6. ⚠️ **042（profiles_status_check に 'deleted' 追加）は退会バグ修正のため dev/prod とも適用必須**。未適用環境では `DELETE /api/profile/me` が CHECK 違反で 500 を返す（HANDOFF「既知の技術的負債」参照）。dev → prod の順で SQL Editor 実行後、各環境で `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='profiles_status_check'` を実行し定義に 'deleted' が含まれることを確認すること
7. ⚠️ **043（user_inventory 新設）は③ 男性送信在庫システムの基盤**。dev → prod の順で SQL Editor 実行。末尾に既存 male approved 全員に `quantity=10, last_grant_date=今日(JST)` を投入する one-shot が含まれており、適用直後から男性ユーザーが10ストックを持って稼働する。適用確認: `SELECT count(*) FROM public.user_inventory WHERE item_type='like_stock'` が `(profiles の male approved 数)` と一致すること。`LIKE_QUOTA_ENABLED` 未設定（β）でも 043 適用後は男性は在庫を消費していいねを送る仕様（足跡経由・女性・同性ペアは無料）

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

dev で実機テストするためのテストユーザーを `scripts/seed_test_users_dev_v2.ps1` で作成・削除・一覧する。dev はメール確認 OFF だが、フロントは新規サインアップ後にルート遷移せずインラインで確認メール送信済み表示を出すだけで（`SignupPage` の success ステート・`/check-email` というルートは存在しない）、アプリ内に進むにはメール内リンク（`emailRedirectTo=/setup/required`）のクリックが必要なため、メール確認 OFF の dev では通常フローで `/setup/required` に到達できない。そこで Supabase Admin API でユーザーを作成し profiles を直接昇格させてサインアップフローをバイパスする。

> ⚠️ **dev 専用**。`$base` は dev プロジェクト（`hpkpndjqtzycnytymdkk`）固定。prod の service_role キーを `DEV_SRK` に入れて実行しないこと（prod に書き込まれる）。

```powershell
# service_role キーと hash salt は env 経由で渡す（チャット/ログに残さない）
$env:DEV_SRK = '<dev service_role key>'
$env:DEV_PRIVACY_HASH_SALT = '<dev Render の PRIVACY_HASH_SALT と同じ値>'   # --create 必須（No.5-7 の hash 一致用）
$env:DEV_TEST_PASSWORD = 'keita2004'   # 省略可。未指定なら keita2004 を使用しログに出力

.\scripts\seed_test_users_dev_v2.ps1 --create     # テストユーザー40人を作成 + マッチ/ブロック配線
.\scripts\seed_test_users_dev_v2.ps1 --list        # 現在の v1+v2 テストユーザー一覧
.\scripts\seed_test_users_dev_v2.ps1 --cleanup     # v1+v2 テストユーザーを全削除

$env:DEV_SRK = $null
$env:DEV_PRIVACY_HASH_SALT = $null
$env:DEV_TEST_PASSWORD = $null
```

- ⚠️ **migration 042 を先に dev へ適用してから `--create` を実行する**こと（未適用だと No.10 deleted の PATCH が CHECK 違反で 400）
- ⚠️ **`DEV_PRIVACY_HASH_SALT` は dev Render の `PRIVACY_HASH_SALT` と完全に同じ値**にする。値がズレると No.5-7 の `real_name_hash` / `student_number_hash` が prod の purge 出力と一致せず、再登録検出のテストが偽陰性になる。未設定でも `--create` 自体は動くが、No.5-7 の hash 列が NULL になる旨の Warning が出る
- 期待出力末尾（create）: `RESULT: created=40 errors=0 (matches=16 blocks=12)`
- パスワードは全員共通（`DEV_TEST_PASSWORD` 未指定時は `keita2004`）
- **40人構成 = 4組み合わせ × 10人**:
  - 組み合わせ: `MF`（男・興味=女）/ `FM`（女・興味=男）/ `MM`（男・興味=男）/ `FF`（女・興味=女）
  - メアド: `{combo}{番号}@ecs.osaka-u.ac.jp`（例 `mf1` / `fm10` / `mm5` / `ff7`）
  - 名前: `{COMBO}-{番号}({詳細})`（例 `MF-1(m2/b3)`）
  - 状態分布（各組10人内）: No.1〜7=approved / No.8=pending_review（写真1枚 pending）/ No.9=banned / No.10=deleted（`deleted_at` セット・PII クリア・番号付き名前は匿名化テスト用に保持）
- **PII 分散（approved 7人のみ・2状態で本番再現）**:
  - **No.1〜4 = 「審査直後」状態**: `real_name` / `student_number` 平文あり・`real_name_hash` / `student_number_hash` NULL・`privacy_purged_at` NULL
  - **No.5〜7 = 「purgeバッチ後」状態**: 平文 NULL・hash あり（SHA-256(`{salt}:{平文}`) hex 小文字＝`privacy_purge.py:26-33` と同形）・`privacy_purged_at` = 4 日前
  - **No.8 pending / No.9 banned**: 平文 PII あり・hash なし（banned は `privacy_purge.py:124-156` の対象外＝purge されない）
  - **No.10 deleted**: 全 NULL（`DELETE /api/profile/me` 後と同じ）
- **写真パターン**（各組共通）: No.1,2=3枚 approved / No.3,4=1枚 approved / No.5=2枚 approved / No.6,7=0枚 / No.8=1枚 **pending** / No.9=1枚 approved / No.10=0枚。ダミー写真は実行時に純 PowerShell で生成（6色ソリッド PNG・`profile-images` バケットへ service_role でアップロード）
- **マッチ/ブロックパターン**（各組7人内で完結・全4組同形。マッチ相手の系統は MF↔FM・MM↔MM・FF↔FF）:

  | No. | マッチ相手 | ブロック実行 |
  |---|---|---|
  | 1 | 2 | 3 |
  | 2 | 1 | — |
  | 3 | 4 | — |
  | 4 | 3 | 5 |
  | 5 | 6, 7 | — |
  | 6 | 5 | 7 |
  | 7 | 5 | — |

  マッチは likes を両方向 INSERT し matches を直接 upsert（`detect_match` トリガー非依存・順序非依存・冪等）。ブロックは片方向。マッチとブロックの相手は意図的に排他（衝突なし）
- `--create` は冪等: 既存ユーザーは再作成せず profiles を再適用。写真は既存があればアップロードをスキップ。likes/matches/blocks は PK upsert
- `--cleanup` は v1 残骸（`e2etest_*` / `fm1` / `fm2`）+ v2（`mf*`/`fm*`/`mm*`/`ff*`）を厳格な正規表現で照合し一括削除。storage（profile-images / student-ids）を物理削除 → `auth.users` を削除（profiles / profile_images / likes / matches / blocks は CASCADE 連動削除）
- βリリース前（docs/ROADMAP.md Step 5）に prod のテストデータを除去するのとは別物。これは dev 限定のシード

> ⚠️ **v1 スクリプト（`scripts/seed_test_users_dev.ps1`）は廃止予定（後方互換・ロールバック用に残置）**。新規は v2 を使うこと。v1 は `e2etest_` プレフィックスの13人（オーナー1 / 異性ターゲット6 / 同性ペア2 / BAN1 / 審査待ち1 / 退会済み1 / ブロック対象1）を作成し、パスワード既定値は `TestUser_2026!`。v2 の `--cleanup` は v1 が作った `e2etest_*` も巻き取るため、現状を白紙にしたい場合は v2 の `--cleanup` を実行すればよい。

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

## secret スキャン（pre-commit hook）

コミット時に gitleaks が staged ファイルを自動スキャンし、secret の混入をブロックする。

### 初回セットアップ（ローカル環境ごとに1回）

```powershell
# 1. pre-commit フレームワークをインストール（Python 3.x 必須）
pip install pre-commit

# 2. hook を .git/hooks/ に登録（gitleaks バイナリは自動ダウンロード）
pre-commit install
```

### 動作確認（初回セットアップ後）

```powershell
# 全追跡ファイルをスキャン（既存ファイルに本物の secret が混入していないか確認）
pre-commit run gitleaks --all-files
# → 検出ゼロなら OK。.env.example は allowlist 済みのため除外される

# テスト: わざと secret 風の文字列を含むファイルをステージして検出されることを確認
echo "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake" > test_secret.txt
git add test_secret.txt
git commit -m "test"  # → gitleaks がブロックする
git restore --staged test_secret.txt
del test_secret.txt
```

### false positive が出たとき

| 対処方法 | いつ使うか |
|---|---|
| 該当行末に `# gitleaks:allow` を追記 | 特定の1行だけ除外（最優先） |
| `.gitleaks.toml` の `regexes` に追加 | 繰り返し出るパターンをまとめて除外 |
| `.gitleaks.toml` の `paths` に追加 | 特定ファイル全体を除外 |

### --no-verify バイパス

`git commit --no-verify` で hook をスキップできる。意識的に使う場合のみ（緊急時など）。

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
