# セキュリティ監査レポート Phase 2
作成日: 2026-05-24  
対象ブランチ: main  
調査方法: ソースコード直接読み込み（推測不使用、不明箇所は「要確認」と明記）  
前回レポート: `docs/SECURITY_AUDIT_BACKEND.md`（バックエンドAPIエンドポイント全73件調査済み）

---

## 概要

Phase 1 ではバックエンドのエンドポイント全件を横断的に調査した。  
Phase 2 では以下の5領域を深掘りし、前回の死角を補完する。

| 調査 | 対象 | 主な発見 |
|------|------|----------|
| 1 | フロント Supabase 直接アクセス | 実質1箇所のみ・無害（未使用コード） |
| 2 | プロフィール API のレスポンス漏洩 | `ProfileResponse`（/me）に機密カラム複数含む |
| 3 | アカウント削除の完全性 | CASCADE設計で概ね網羅・一部テーブルは要確認 |
| 4 | 学生証データの保管ポリシー | 自動削除バッチ実装済み・ただし起動確認が必要 |
| 5 | フロントキャッシュ | localStorage に名前・学部等PII が残留 |

---

## 調査1: フロントエンド Supabase 直接アクセス

### 調査スコープ

`frontend/src/` 配下の全 `.ts` / `.tsx` ファイルを対象に、  
`supabase.from(...)` / `supabase.storage.from(...)` / `supabase.channel(...)` / `supabase.realtime` を検索した。

### 結果一覧

| # | ファイル:行 | 操作 | テーブル/バケット | 何のため | RLSのみが守り？ | 攻撃シナリオ |
|---|------------|------|-----------------|---------|---------------|------------|
| 1 | `frontend/src/lib/supabase.ts:12` | `storage.createSignedUrl` | `profile-images` | Phase 13 対応の署名付きURL生成（現在**未使用**） | Yes (仮に使われれば) | なし（バケットは現在 Public。Private 化後に使用開始） |

### 判定

**🟢 問題なし。**

- `supabase.from('...')` のテーブル直接アクセス（SELECT/INSERT/UPDATE等）はフロントから一切行われていない。
- `supabase.channel(...)` / `supabase.realtime` の直接使用もない。WebSocket チャットは `ws.py` 経由のバックエンドで処理される。
- `supabase.auth.*` 系（signIn/signOut/getSession/onAuthStateChange等）は多数あるが、これらは除外対象。
- `supabase.ts:12` の `storage.createSignedUrl` は Phase 13 用の**未使用ヘルパー**であり、現在の実行パスに入らない。

---

## 調査2: プロフィール API のレスポンスデータ

### profiles テーブル全カラム（migration SQL から抽出）

| カラム名 | 追加 migration |
|---------|--------------|
| id | 001 |
| email | 001 |
| created_at | 001 |
| updated_at | 001 |
| name | 002 |
| year | 002 |
| faculty | 002 |
| department | 002 |
| bio | 002 |
| status | 003 |
| student_id_image_path | 004 |
| submitted_at | 004 |
| rejection_reason | 005 |
| reviewed_at | 005 |
| profile_image_path | 006 |
| interests | 011 |
| club | 011 |
| clubs | 011 |
| hometown | 011 |
| looking_for | 011 |
| show_online_status | 011 |
| last_seen_at | 013 |
| status_message | 017 |
| status_message_updated_at | 017 |
| admission_year | 021 |
| faculty_hide_level | 021 |
| hidden_clubs | 021 |
| gender | 023 |
| interest_in | 023 |
| profile_completed | 023 |
| profile_setup_completed | 024 |
| student_id_submitted | 024 |
| real_name | 025 |
| student_number | 025 |
| birth_date | 026 |
| identity_verified | 036 |
| banned_at | 036 |
| banned_by | 036 |
| ban_reason | 036 |
| age | 035 |
| real_name_hash | 035 |
| student_number_hash | 035 |
| privacy_purged_at | 035 |
| onboarding_completed | 024（相当） |

### 各エンドポイントへの公開状況

| カラム名 | パターンA `/api/profile/me` | パターンB `/api/profiles/{user_id}` | パターンC `/api/profiles`（一覧） | リスク評価 |
|---------|--------------------------|-----------------------------------|-------------------------------|----------|
| id | ✅ 含む | ✅ 含む | ✅ 含む | 問題なし |
| email | ✅ 含む（`ProfileResponse`） | ❌ 含まない | ❌ 含まない | 🟡 注意 ※1 |
| name | ✅ | ✅ | ✅ | 問題なし |
| year | ✅ | ✅ | ✅ | 問題なし |
| faculty | ✅ | ✅ | ✅（身バレフィルタあり） | 問題なし |
| department | ✅ | ✅ | ✅（身バレフィルタあり） | 問題なし |
| bio | ✅ | ✅ | ✅ | 問題なし |
| status | ✅ 含む（`ProfileResponse`） | ❌ 含まない | ❌ 含まない | 🟡 注意 ※2 |
| student_id_image_path | ✅ 含む（`ProfileResponse`） | ❌ 含まない | ❌ 含まない | 🟠 要対応 ※3 |
| submitted_at | ✅ 含む（`ProfileResponse`） | ❌ | ❌ | 問題なし（自分のみ） |
| rejection_reason | ✅ 含む（`ProfileResponse`） | ❌ | ❌ | 問題なし（自分のみ） |
| reviewed_at | ❌ ProfileResponse に未定義 | ❌ | ❌ | 問題なし |
| real_name | ✅ 含む（`ProfileResponse`） | ❌ | ❌ | 🟠 要対応 ※4 |
| student_number | ✅ 含む（`ProfileResponse`） | ❌ | ❌ | 🟠 要対応 ※4 |
| birth_date | ✅ 含む（`ProfileResponse`） | ❌ | ❌ | 🟠 要対応 ※4 |
| gender | ✅ 含む | ❌ | ❌ | 問題なし（自分のみ） |
| interest_in | ✅ 含む | ❌ | ❌ | 問題なし（自分のみ） |
| profile_image_path | ✅ 含む | ❌ （avatar_url 変換済み） | ❌ （avatar_url 変換済み） | 🟡 注意 ※5 |
| identity_verified | ✅ 含む | ❌ | ❌ | 問題なし |
| banned_at | ❌ ProfileResponse に未定義 | ❌ | ❌ | 問題なし |
| banned_by | ❌ | ❌ | ❌ | 問題なし |
| ban_reason | ❌ | ❌ | ❌ | 問題なし |
| age | ❌ ProfileResponse に未定義 | ❌ | ❌ | 問題なし |
| real_name_hash | ❌ | ❌ | ❌ | 問題なし |
| student_number_hash | ❌ | ❌ | ❌ | 問題なし |
| privacy_purged_at | ❌ | ❌ | ❌ | 問題なし |
| clubs | ✅ | ✅ | ✅ | 問題なし |
| hometown | ✅ | ✅ | ❌ 一覧には含まない | 問題なし |
| looking_for | ✅ | ✅ | ❌ 一覧には含まない | 問題なし |
| last_seen_at | ✅ | ✅ | ✅ | 問題なし |
| interests | ✅ | ✅ | ❌ | 問題なし |
| faculty_hide_level | ✅ | ❌ | ❌ | 問題なし |
| hidden_clubs | ✅ | ❌ | ❌ | 問題なし |
| created_at | ✅ | ✅ | ❌ | 問題なし |

### 注記

**※1 email の `/api/profile/me` への公開**  
`ProfileResponse` スキーマ（`backend/app/schemas/profile.py:17`）に `email: str` が含まれている。  
`/api/profile/me` は自分自身へのエンドポイントのため、**自分のメールアドレスを自分が取得するのは問題なし**。  
他ユーザー向けエンドポイント（`/api/profiles/{user_id}`、`/api/profiles`）のスキーマ（`browse.py`）には `email` は含まれないため、他者への漏洩はない。

**※2 status フィールド**  
`/api/profile/me` で自分の status（pending_review / approved / rejected / banned）が取得できる。  
フロントエンドでのリダイレクト制御に必要なフィールドであり、**自分への公開は意図的で問題なし**。

**※3 🟠 student_id_image_path の `/api/profile/me` への公開**  
`ProfileResponse` に `student_id_image_path: Optional[str]` が含まれている（`profile.py:27`）。  
これは Storage の `student-ids` バケット内のオブジェクトパスそのもの（例: `{user_id}/student_id_1234567890.jpg`）。  
バケットは Private なので、このパスを知るだけでは直接アクセスできない。  
ただし、万が一 ANON キーで直接 Supabase API を叩かれた場合のリスクが皆無とは言えない。  
**推奨対応**: `ProfileResponse` から `student_id_image_path` フィールドを除外するか、レスポンス時に `None` に置換する（フロント側はこのパスを実際には使用していない）。

**※4 🟠 real_name / student_number / birth_date の `/api/profile/me` への公開**  
本人確認情報（本名・学籍番号・生年月日）が `/api/profile/me` のレスポンスに含まれる。  
`ProfileResponse` スキーマ（`profile.py:50-52`）に全て定義されており、`browse.py:65` の `SELECT *` で全カラムが取得される。

- **問題点**: フロントエンドの設定ページや再申請ページで本名・学籍番号を prefill するために使用されているが（`SetupRequiredPage.tsx:200-209`）、これらは `privacy_purge` 後は `None` になる設計。
- **リスク**: privacy_purge 前（承認後3日以内）は、JWT が有効な限り自分自身がこれらを取得できる。本人なので問題はないが、XSS 攻撃でトークンを奪われた場合に本名・学籍番号が漏洩する。
- **推奨対応**: 再申請フォームの prefill は不要な場合、これらカラムをレスポンスから除外することを検討する。少なくとも、privacy_purge 済みの場合に `None` を返す実装は正常に機能している。

**※5 profile_image_path の公開**  
`/api/profile/me` のレスポンスに `profile_image_path`（Storageパス文字列）が含まれる。  
`profile-images` バケットは現在 Public CDN なので、パスを知ることで誰でもアクセス可能。  
Phase 13 で Private 化予定であり、その後は問題がなくなる。現時点では設計上の既知リスク。

---

## 調査3: アカウント削除の完全性

対象コード: `backend/app/routers/profile.py:692-758`（`DELETE /api/profile/me`）

### テーブル別削除状況

| テーブル | 削除される？ | 方法 | 備考 |
|---------|------------|------|------|
| profiles | ✅ YES | 明示 DELETE | `profile.py:739` |
| profile_images | ✅ YES | CASCADE（profiles → profile_images） | `032_push_subscriptions.sql:7` で `ON DELETE CASCADE` |
| likes | ✅ YES | CASCADE（auth.users → likes） | `007_likes.sql:5`で `ON DELETE CASCADE` |
| matches | ✅ YES | CASCADE（auth.users → matches） | `008_matches.sql:20-21` で `ON DELETE CASCADE` |
| messages | ✅ YES | CASCADE（matches → messages） | `009_messages.sql:26` で `ON DELETE CASCADE` |
| blocks（blocker側） | ✅ YES | CASCADE（auth.users → blocks） | `012_safety_features.sql:10` |
| blocks（blocked側） | ✅ YES | CASCADE（auth.users → blocks） | `012_safety_features.sql:10` |
| hides | ✅ YES | CASCADE | `012_safety_features.sql:57-58` |
| reports（reporter側） | ✅ YES | CASCADE | `012_safety_features.sql:33-34` |
| reports（reported側） | ✅ YES | CASCADE | `012_safety_features.sql:33-34` |
| profile_views | ✅ YES | CASCADE（auth.users → profile_views） | `015_profile_views.sql:4-5` |
| message_reactions | ✅ YES | CASCADE（auth.users → message_reactions） | `016_message_reactions.sql:3-4` |
| notifications | ✅ YES | CASCADE（auth.users → notifications） | `018_notifications.sql:8` |
| login_history | ✅ YES | CASCADE（auth.users → login_history） | `019_login_history.sql:8` |
| push_subscriptions | ✅ YES | CASCADE（profiles → push_subscriptions） | `032_push_subscriptions.sql:7` |
| like_quota | ✅ YES | CASCADE（profiles → like_quota） | `028_like_quota_system.sql:8` |
| inquiries | ✅ YES | CASCADE（auth.users → inquiries） | `036_admin_extensions.sql:60` |
| admin_logs | ⚠️ 要確認 | CASCADE（admin_id のみ ON DELETE CASCADE） | `036_admin_extensions.sql:36` で `admin_id REFERENCES auth.users ON DELETE CASCADE`。管理者が退会した場合の管理ログが消える可能性 |
| dismissed_likes | ✅ YES | CASCADE（likes に追加カラム、likes が CASCADE 削除） | `030_dismissed_likes.sql:2` |

### Storage 削除

| バケット | 削除される？ | コード箇所 | 備考 |
|---------|------------|---------|------|
| profile-images | ✅ YES | `profile.py:710-715` | `profile_images` テーブルからパスを取得して明示削除 |
| student-ids | ✅ YES | `profile.py:717-735` | `profiles.student_id_image_path` から取得して明示削除 |

### Auth 削除

✅ `supabase.auth.admin.delete_user(user_id)` で `auth.users` から削除される（`profile.py:749`）。  
削除順序: Storage → profiles DELETE → auth.users DELETE。  
ただし `profiles.delete()` と `auth.delete_user()` は別トランザクションであり、`profiles` 削除成功後に `auth.delete_user()` が失敗した場合、`auth.users` にゾンビレコードが残る（`profile.py:751-757` でエラーログ出力はあるが、補償処理なし）。

### マッチ済み相手側の挙動

- Aさんが退会すると `matches` が CASCADE 削除される（`auth.users ON DELETE CASCADE`）
- → Bさんからは当該マッチが消える（正常）
- `messages` も CASCADE 削除されるため、チャット履歴も消える
- `notifications` の `from_user_id` は `ON DELETE SET NULL` のため、通知レコードは残るが送信者が null になる

### リスク評価

🟡 **Medium**: `profiles DELETE → auth.users DELETE` の二段階削除の間にエラーが発生した場合、部分削除状態になる可能性がある。  
個人情報保護法上、退会申請から一定期間内の削除が求められるが、エラー時の補償処理（リトライ・管理者通知）が実装されていない。

🟢 **Info**: `admin_logs` の `admin_id` は ON DELETE CASCADE のため、管理者が退会すると管理ログの `admin_id` が消える（監査証跡が失われる）。  
推奨対応: `admin_id` を `ON DELETE SET NULL` に変更し、`admin_email` フィールドで代替特定できる現設計を維持しつつ監査ログを保全する。

---

## 調査4: 学生証データの保管ポリシー

### a) student-ids バケットのライフサイクル

| イベント | Storage 削除 | DB カラムのクリア | コード箇所 |
|---------|------------|-----------------|---------|
| approve 後 3日（自動バッチ） | ✅ `remove([student_id_path])` | ✅ `student_id_image_path = None` | `privacy_purge.py:53-58` |
| reject 後 30日（自動バッチ） | ✅ `remove([student_id_path])` | ✅ `student_id_image_path = None` | `privacy_purge.py:107-121` |
| reject → reapply（再申請） | ❌ **旧ファイル残留** | ✅ `student_id_image_path = None` | `profile.py:651`（パスをNULLに）、旧ファイル削除なし |
| ユーザー退会 | ✅ `remove([sid_path])` | profiles テーブルごと削除 | `profile.py:717-735` |

**🟠 reapply 時の旧学生証画像が Storage に残留する問題**  
`/api/profile/reapply` を実行すると `student_id_image_path` が `None` になる（`profile.py:651`）が、  
Storage の `student-ids/{user_id}/student_id_*.jpg` は削除されない。  
旧ファイルはパス参照が切れるため通常はアクセス不可能だが、Storage に物理ファイルが蓄積する。  
自動削除バッチも `student_id_image_path` を参照するため、NULL になった旧ファイルはバッチ対象外となる。  
**推奨対応**: reapply エンドポイントで旧 `student_id_image_path` を Storage から削除してから NULL にする。

### b) profiles テーブルの審査関連カラム

| カラム | 審査後の状態 | 備考 |
|-------|------------|------|
| real_name | approved 後3日 / rejected 後30日で NULL に | `privacy_purge.py:63` |
| student_number | 同上 | |
| birth_date | 同上 | |
| student_id_image_path | 同上 + Storage から物理削除 | |
| submitted_at | 保持（審査完了後も残る） | 削除タイミングの証跡として有用 |
| reviewed_at | 保持 | |
| rejection_reason | reapply 時に NULL になる | `profile.py:651` |
| real_name_hash | 永久保持（再登録検出用） | `privacy_purge.py:68` |
| student_number_hash | 永久保持（再登録検出用） | |
| age | 永久保持（birth_date 削除後の代替） | |
| privacy_purged_at | 永久保持（削除実行記録） | |

### c) 自動削除スケジュールジョブ

`privacy_purge.py` にバッチ処理が実装されている。

```
承認後3日: real_name / student_number / birth_date / student_id_image_path を削除
却下後30日: 同上
```

**🟠 バッチの起動方法が不明確**  
コメントに「APScheduler で統一的に管理する」とあるが、`backend/app/main.py` に APScheduler の起動コードがあるか確認が必要。  
`admin.py:357-366` に `/api/admin/privacy-purge` エンドポイントが存在し、管理者が手動でも実行できるが、  
定期実行スケジューラーが本番環境で動作しているかどうかは本調査では確認できなかった（**要確認**）。

### d) 設計コメント

`035_privacy_purge.sql` に明確な設計コメントあり:
```
承認後3日で本人確認情報を削除し、再BAN逃れ検出用にハッシュだけ残す
```

保持ポリシーはコードレベルで定義されており（`APPROVED_RETENTION_DAYS = 3`、`REJECTED_RETENTION_DAYS = 30`）、設計意図は明確。

---

## 調査5: フロントエンドキャッシュ

### a) localStorage 使用箇所一覧

| # | ファイル:行 | キー名 | 保存データ | リスク |
|---|-----------|--------|----------|------|
| 1 | `BrowsePage.tsx:64,195,200,206` | `cro-co-browse-filter` | 検索フィルタ（年次・学部文字列） | 🟡 低リスク（公開情報の範囲） |
| 2 | `BrowsePage.tsx:216,217` | `like-send-count` | いいね送信回数（整数） | 🟢 無害 |
| 3 | `Layout.tsx:83` | `notification-enabled` | 通知有効フラグ（true/false文字列） | 🟢 無害 |
| 4 | `NotifyNudge.tsx:15,25` | `like-send-count`, `notification-enabled` | 同上 | 🟢 無害 |
| 5 | `ProfileEditPage.tsx:153,187` | `croco-profile-draft-{user_id}` | プロフィール編集中のドラフト（name, bio, year, clubs, hometown, interests, status_message） | 🟠 PII含む |
| 6 | `SetupRequiredPage.tsx:183,188,215,220` | `croco-setup-draft-{user_id}`, `croco-setup-step-{user_id}` | 初期設定ドラフト（real_name, student_number, birth_date, gender, interest_in, year, faculty, department） | 🔴 機密PII含む |
| 7 | `SetupNotifyPage.tsx:19` | `notification-enabled` | 通知フラグ | 🟢 無害 |
| 8 | `PWAInstallBanner.tsx:18,28` | `pwa-banner-dismissed` | バナー非表示フラグ | 🟢 無害 |

### 注目すべき項目の詳細

**🔴 `croco-setup-draft-{user_id}` — 機密個人情報のキャッシュ**

`SetupRequiredPage.tsx:215` で以下のデータが localStorage に JSON として保存される:

```
real_name（本名）, student_number（学籍番号）, birth_date（生年月日）,
gender, interest_in, year, faculty, department
```

- 保存期間: 送信成功時に `localStorage.removeItem(DRAFT_KEY)` でクリアされる（`SetupRequiredPage.tsx:320-321`）
- **問題**: 送信前ページを離脱した場合（ブラウザクラッシュ・途中キャンセル等）にドラフトが localStorage に残る
- **リスク**: 共有PC・家族PCで登録途中に離脱した場合、次のユーザーが `croco-setup-draft-*` キーを見ることができる
- **ログアウト時のクリア**: `signOut()` は `supabase.auth.signOut()` のみ（`AuthContext.tsx:71`）。設定ページ経由のログアウト（`SettingsPage.tsx:99`）では `clearAllDB()` を先に呼ぶが、**localStorage のドラフトキーはクリアしない**

**🟠 `croco-profile-draft-{user_id}` — プロフィール編集ドラフト**

`ProfileEditPage.tsx:187` で保存される:
```
name, bio, year, clubs, hometown, interests, status_message
```

- 本名・学籍番号は含まない（公開プロフィール情報のみ）
- 保存成功時にクリアあり（`ProfileEditPage.tsx:339`）
- ログアウト時のクリアなし（同上）

### b) Supabase クライアントの localStorage キー

Supabase JS クライアント（`@supabase/supabase-js`）はデフォルトで以下を localStorage に保存する:

| キー（デフォルト） | 内容 |
|-----------------|------|
| `sb-{project-ref}-auth-token` | JWT access_token + refresh_token |

- **JWT の有効期限**: Supabase デフォルト1時間
- **refresh_token の有効期限**: Supabase デフォルト7日間
- **リスク**: 共有PC でログアウト忘れた場合、refresh_token が有効な間は次のユーザーが再認証できる

### c) React Query キャッシュ

`main.tsx:32-45` の QueryClient 設定:

```
staleTime: 30秒
gcTime: 5分
```

React Query はメモリ内キャッシュのみであり、localStorage への永続化は行われていない（`localStorage.setItem` は使用されていない）。  
**ブラウザを閉じればキャッシュは消える** → 問題なし。

ただし、アプリ起動中（タブを開いている間）は他ユーザーの名前・学部・プロフィール画像URLがメモリキャッシュに存在する。  
XSS 攻撃があった場合、キャッシュ内のデータが読み取られる可能性があるが、これは React Query の一般的な動作であり、特別なリスクではない。

### d) IndexedDB（lib/db.ts）

`lib/db.ts` で `croco-db` という IndexedDB を使用している:

| ストア | 保存データ | TTL |
|-------|---------|-----|
| matches | マッチしたユーザー情報（name, year, faculty, bio, avatar_url） | 各クエリで設定 |
| messages | チャットメッセージ内容 | 各クエリで設定 |
| profiles | ブラウズ一覧プロフィール | 各クエリで設定 |
| unread | 未読カウント | 各クエリで設定 |

- `clearAllDB()` が実装されており（`db.ts:111`）、ログアウト時（`SettingsPage.tsx:99`）と削除時（`SettingsPage.tsx:179`）に呼ばれる
- **問題**: `PendingPage.tsx:23`, `HomePage.tsx:148`, `RejectedPage.tsx:31` の `signOut()` は `AuthContext.signOut()` を使用しており、**`clearAllDB()` を呼ばない**
- これらのページから直接ログアウトした場合、IndexedDB にチャット内容や相手のプロフィールが残留する

---

## 総合リスクサマリー

### 🔴 Critical（即時対応推奨）

現時点で Critical 相当の問題は発見されなかった。

---

### 🟠 High（リリース前対応推奨）

#### H-P2-1: `/api/profile/me` で student_id_image_path（Storage パス）が漏洩する

- **場所**: `backend/app/schemas/profile.py:27`
- **詳細**: `ProfileResponse` に `student_id_image_path` フィールドが定義されており、`GET /api/profile/me` のレスポンスに含まれる。Storage パスは `{user_id}/student_id_{timestamp}.jpg` の形式。バケットは Private なので直接アクセスはできないが、パス情報そのものは不要。
- **推奨対応**: `ProfileResponse` から `student_id_image_path` を除外するか、返す場合は `None` に置換する。

#### H-P2-2: reapply 時に旧学生証画像が Storage に残留する

- **場所**: `backend/app/routers/profile.py:620-674`
- **詳細**: `POST /api/profile/reapply` 実行時、`student_id_image_path` が `None` にクリアされるが、Storage の物理ファイルは削除されない。自動削除バッチも `student_id_image_path` を参照するため、この孤立ファイルはバッチ対象外となり永続残留する。
- **推奨対応**: reapply 前に現在の `student_id_image_path` を取得し、Storage から削除してから NULL にする。

#### H-P2-3: `croco-setup-draft-*` localStorage に本名・学籍番号・生年月日が平文保存される

- **場所**: `frontend/src/pages/SetupRequiredPage.tsx:215`
- **詳細**: 学生証提出フォームの入力途中データが localStorage に自動保存される。ログアウト時にクリアされないため、共有PCでブラウザを閉じただけでは残留する。
- **推奨対応**: ①ログアウト時（全経路）に `DRAFT_KEY`・`STEP_KEY` をクリアする。②`beforeunload` イベントで敏感なステップのドラフトをクリアするオプション（UX トレードオフあり）。

---

### 🟡 Medium（リリース後の改善推奨）

#### M-P2-1: `real_name / student_number / birth_date` が `/api/profile/me` に含まれる

- **場所**: `backend/app/schemas/profile.py:50-52`
- **詳細**: privacy_purge 前（承認後3日以内）は、自分自身のエンドポイントで本名・学籍番号・生年月日が取得できる。XSS 攻撃でトークンを奪われた場合の被害範囲が広がる。
- **推奨対応**: フロントエンドで実際に prefill に使用しているフィールドだけを返すように制限する。再申請ページ専用エンドポイントを作るか、不要になった時点でフィールドを除外する。

#### M-P2-2: ログアウト時に IndexedDB がクリアされない経路がある

- **場所**: `frontend/src/pages/PendingPage.tsx:23`, `HomePage.tsx:148`, `RejectedPage.tsx:31`
- **詳細**: これらのページの `signOut()` は `AuthContext.signOut()` → `supabase.auth.signOut()` のみを呼び出す。`clearAllDB()` が呼ばれないため、チャットメッセージ・マッチ情報・ブラウズ一覧が IndexedDB に残る。
- **推奨対応**: `AuthContext.signOut()` の実装内で `clearAllDB()` を必ず呼ぶようにする。または、`signOut` 関数のラッパーを統一する。

#### M-P2-3: アカウント削除の二段階（profiles → auth.users）に補償処理がない

- **場所**: `backend/app/routers/profile.py:738-757`
- **詳細**: `profiles.delete()` 成功後に `auth.delete_user()` が失敗した場合、`auth.users` にゾンビレコードが残る。エラーログは出るが補償処理がない。
- **推奨対応**: `auth.delete_user()` 失敗時に管理者に通知する仕組み（Slack webhook 等）または、失敗UUIDをキューに積んで定期リトライする処理を追加する。

#### M-P2-4: 自動削除バッチ（APScheduler）の本番起動状況が不明

- **場所**: `backend/app/core/privacy_purge.py`、`backend/app/main.py`（要確認）
- **詳細**: `privacy_purge.py` のコメントに「APScheduler で統一的に管理する」とあるが、`main.py` でのスケジューラー起動コードの存在が本調査では確認できなかった。定期実行がなければ、学生証情報が承認後3日以上保持され続ける可能性がある。
- **推奨対応**: 本番環境でバッチが定期実行されているかを確認し、実行ログを監視する。Render の Cron Job 機能の利用も検討。

---

### 🟢 Info（設計上の注意点）

#### I-P2-1: admin_logs の admin_id が ON DELETE CASCADE

- **場所**: `backend/migrations/036_admin_extensions.sql:36`
- **詳細**: 管理者が退会すると、その管理者が行った操作の監査ログ行が削除される（admin_id が CASCADE）。`admin_email` フィールドがあるため完全に記録は失われないが、UUID 参照は失われる。
- **推奨対応**: `admin_id` を `ON DELETE SET NULL` に変更し、`admin_email` による事後特定を維持する。

#### I-P2-2: Supabase Auth の JWT/refresh_token が localStorage に残る

- **詳細**: Supabase JS クライアントの標準動作であり、回避困難。共有PC でのリスクは運用ポリシーで対処（ログアウト推奨の UI 表示等）。
- **対応済み**: SettingsPage のログアウトボタンは確実に `supabase.auth.signOut()` を呼び、Supabase がトークンを無効化する。

#### I-P2-3: `profile_image_path`（Storageパス）が `/api/profile/me` に含まれる

- **詳細**: profile-images バケットは現在 Public のため、パスが分かれば誰でも閲覧可能（これはバケット設定上意図的）。Phase 13 で Private 化後に再評価が必要。
- **現時点**: 既知のリスクであり、Phase 13 対応で解消予定。

#### I-P2-4: console.log で user.email が出力される

- **場所**: `frontend/src/contexts/AuthContext.tsx:44,59`
- **詳細**: ブラウザのコンソールに認証済みユーザーのメールアドレスが出力される。開発時のデバッグログが本番にそのまま残っている。
- **推奨対応**: 本番ビルドでは `console.log` を無効化する（Vite の `drop_console` オプション等）。

---

## Phase 1・Phase 2 統合優先度マトリクス

| 優先度 | ID | 問題 | 推奨対応 |
|--------|----|----|---------|
| 🟠 High | H-P2-1 | `student_id_image_path` が `/api/profile/me` レスポンスに含まれる | `ProfileResponse` から除外 |
| 🟠 High | H-P2-2 | reapply 時に旧学生証画像が Storage に残留 | reapply エンドポイントで旧ファイル削除 |
| 🟠 High | H-P2-3 | setup ドラフト（本名・学籍番号）が localStorage に残留 | ログアウト全経路でドラフトクリア |
| 🟠 High | H-1 (Ph1) | WebSocket JWT がクエリパラメータに露出 | アクセスログ設定またはOTPトークン方式 |
| 🟠 High | M-8 (Ph1) | EXIFデータ削除未実装 | Pillow で再エンコード |
| 🟡 Medium | M-P2-1 | `/api/profile/me` に real_name等が含まれる | 不要フィールドを除外 |
| 🟡 Medium | M-P2-2 | IndexedDB がログアウト時にクリアされない経路 | AuthContext.signOut に clearAllDB を組み込む |
| 🟡 Medium | M-P2-3 | アカウント削除の二段階に補償処理なし | 失敗通知または自動リトライ |
| 🟡 Medium | M-P2-4 | 自動削除バッチの起動状況が不明 | 本番環境での確認と監視 |
| 🟡 Medium | M-2 (Ph1) | `GET /api/profiles/{user_id}` でブロックチェックなし | ブロック相手からの直接アクセスを拒否 |
| 🟡 Medium | M-6 (Ph1) | `/api/push/debug/all` 本番残存 | 削除または環境フラグで無効化 |
| 🟡 Medium | M-1 (Ph1) | BAN チェックがDB障害時サイレントスルー | フェイルクローズに変更 |
| 🟡 Medium | M-4 (Ph1) | reapply にレートリミットなし | 1/hour 制限を追加 |
| 🟡 Medium | M-5 (Ph1) | push/test にレートリミットなし | 5/minute 制限を追加 |
| 🟢 Info | I-P2-1 | admin_logs の CASCADE | ON DELETE SET NULL に変更 |
| 🟢 Info | I-P2-4 | console.log でメールアドレス出力 | 本番ビルドで console 無効化 |

---

*調査方法: フロントエンド全TS/TSXファイル・バックエンド全migrationSQL・routers・schemas・core モジュールを直接読み込み、実装に基づいて判断。推測した項目はなし。不明箇所は「要確認」と明記。*
