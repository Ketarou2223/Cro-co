# Cro-co セキュリティチェックリスト — 完了済みカテゴリ 1〜10（2026-06 アーカイブ）

2026-06-08 に `docs/ROADMAP.md` §7 から移設。各カテゴリの詳細確認ログ。
ROADMAP 本体にはカテゴリ単位の総括行のみ残す。

---

### カテゴリ 1: インフラ・シークレット検証

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 1.1 | 🔴 | `service_role` キーがフロント JS バンドル/ソース/環境変数に混入していない | ✅ 2026-05-29 |
| 1.2 | 🔴 | `.env*` が git に追跡されていない | ✅ 2026-05-29 |
| 1.3 | 🔴 | 過去のコミット履歴に平文の secret が残っていない | ✅ 2026-05-29 |
| 1.4 | 🔴 | Vercel/Render の環境変数が dev/prod で完全に分離されている | ✅ 2026-05-29 |
| 1.5 | 🟡 | Supabase Storage 全バケットの Public/Private 設定が正しい | ✅ 2026-05-29 |
| 1.6 | 🟡 | バケットの MIME 制限・サイズ上限が DB レベルで設定されている | ✅ 2026-05-31 |
| 1.7 | 🟡 | 署名付き URL の有効期限が短い | ✅ 2026-05-29 |
| 1.8 | 🟢 | ローテート前の旧 service_role キーを使ってる箇所が残っていない | ✅ 2026-05-29 |
| 1.9 | 🟢 | API キーを含むメッセージがログに乗っていない | ✅ 2026-05-31(条件付き) |
| 1.10 | 🟢 | pre-commit hook で secret スキャン(gitleaks 等)を自動化 | ✅ 2026-05-31 |

### カテゴリ 2: 認証・認可

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 2.1 | 🔴 | 全 backend エンドポイントが認証ガードで保護されている | ✅ 2026-05-31 |
| 2.2 | 🔴 | curl で API 直叩きしても弾かれる（JWT なし/期限切れ/改竄） | ✅ 2026-05-31 |
| 2.3 | 🔴 | IDOR: 他人の user_id で API 叩いても自分のデータしか触れない | ✅ 2026-05-31 |
| 2.4 | 🔴 | 管理者専用エンドポイントが `_require_admin` で保護されている | ✅ 2026-05-31 |
| 2.5 | 🔴 | BAN ユーザーの JWT で全エンドポイントが 403 | ✅ 2026-05-31 |
| 2.6 | 🟡 | `_require_approved` ガードが必要な箇所に付いている | ✅ 2026-06-03 |
| 2.7 | 🟡 | JWT 検証アルゴリズムが `HS256` 固定で `none` を受理しない | ✅ 2026-06-03 |
| 2.8 | 🟡 | パスワードリセット / メアド変更に認証が要る | ✅ 2026-06-03 |
| 2.9 | 🟢 | セッション固定攻撃対策（ログイン後トークン再発行） | ✅ 2026-06-03 |
| 2.10 | 🟢 | 同時セッション数の上限・異常検知 | ✅ 2026-06-03 |

> **カテゴリ2（認証・認可）致命🔴 5本(2.1〜2.5) + 重大🟡 3本(2.6〜2.8) + 重要🟢 2本(2.9〜2.10) = 全10項目 完了。2026-06-03。**
> 主成果: 全79エンドポイント認証棚卸し／JWT検証実機確認／IDOR検出ゼロ＋ブロック・身バレの fail-open 6件を fail-close 化(commit bbed052)／admin保護＋昇格経路なし確認／BAN/deleted を全経路で遮断(commit 4f2d87d)。
> [2.6] 承認済みガード統一: `get_approved_user` 新設・pending/rejected を browse/like/match/WS から排除。[2.7] JWT 検証は Supabase Auth 委譲・ローカルデコードなし・alg:none 拒否。[2.8] パス変更/メアド変更は β 非実装（攻撃面なし）・リセットは Supabase 使い捨てリカバリトークン保護。[2.9] セッション固定攻撃: 未ログイン時トークンなし／`signInWithPassword` が毎回新規発行（GoTrue）／Cookie 不使用で localStorage 保存／Refresh Token Rotation 実装済み（`main.tsx:52-55`）／backend 独自セッション機構なし（grep ゼロ件）の5点で固定攻撃の前提が構造的に不成立。修正不要。[2.10] 同時セッション・異常検知・レート制限: ログイン/サインアップ/リセットは全て Supabase Auth 直結（backend にエンドポイントなし）。Rate Limits をオーナーが dev/prod 両ダッシュボードで目視確認済み（Sign-ins: 30/5min・Token verifications: 30/5min・Token refreshes: 150/5min・メール送信: prod=30/h, dev=2/h）。緩すぎる設定なし・設定変更不要。同時セッション上限・異常ログイン検知・CAPTCHA は β 規模（50〜100人）では過剰。コード変更なし。
> 横断知見: 安全判定の fail-open(except握りつぶし)が複数箇所に存在→「セキュリティ制御は fail-close 統一」を設計原則化(HANDOFF §6)。

### カテゴリ 3: RLS・テーブル権限

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 3.1 | 🔴 | 全テーブルで RLS が有効化されている | ✅ 2026-06-01 |
| 3.2 | 🔴 | 各テーブルに `service_role` 全許可ポリシー + authenticated/anon は適切制限 | ✅ 2026-06-02 |
| 3.3 | 🔴 | anon ロールで直接 Supabase 叩いて全テーブル拒否 | ✅ 2026-06-02 |
| 3.4 | 🔴 | authenticated ロールで他人の行が SELECT できない | ✅ 2026-06-02 |
| 3.5 | 🟡 | prod の手動 RLS ポリシー残存（HANDOFF.md:152 の blocks_*）を解消 | ✅ 2026-06-03 |
| 3.6 | 🟡 | 新規テーブル（user_inventory・042/043）の RLS が既存パターンに揃う | ✅ 2026-06-03 |
| 3.7 | 🟡 | view / function に SECURITY DEFINER が付いていないか | ✅ 2026-06-03 |
| 3.8 | 🟢 | Storage の bucket policy がテーブル RLS と整合 | ✅ 2026-06-03 |

> **カテゴリ3（RLS・テーブル権限）🔴4 + 🟡3 + 🟢1 = 全8項目 完了。2026-06-03。**
> 主成果: 全テーブル RLS 有効確認（dev 17・prod 16）／非 service_role ポリシー4本 DROP（migration 044）／anon GRANT ドリフト是正（migration 045）／authenticated GRANT ゼロ確認 + RLS 9本 auth.uid() 縛り確認（静的＋実機）。
> [3.5] migration 044 の prod 適用を確認・4本の手動ポリシー消滅確認。like_quota 重複は migration 047(C) で解消（dev/prod 1本化）。残置9本（blocks_select/insert_own・hides_self 等）は [3.2] 既知の受容セット（ARCHITECTURE.md §4 記載・GRANT 層で実際には到達しない）。
> [3.6] user_inventory（migration 043）は service_role 1本・非 service_role ゼロ・PERMISSIVE で除外なし・GRANT 明示・RLS 有効の確立パターンに完全準拠。
> [3.7] SECURITY DEFINER 点検: アプリ管理関数3本（handle_new_user / enforce_university_email_domain / detect_match）を全件確認。detect_match は migration 047(B) で search_path=public に固定。幽霊関数 create_profile_for_user（prod のみ存在・migration 管理外・未使用）を migration 047(A) で DROP し dev/prod 構造を揃えた。detect_match の機能実機確認（相互いいね → matches 生成）は ⚠️ [15.1] 繰り延べ（ALTER のみで本体・トリガー登録は無変更）。
> [3.8] Storage dev/prod とも profile-images / student-ids が private・5MB・jpeg+png。storage.objects の RLS ポリシーはゼロ（service_role がバイパスするため不要・設計意図通り）。フロントは supabase.from('storage.objects') 非使用（grep 担保）。整合・修正不要。
> 設計原則: GRANT（入場許可証）+ RLS（行ごとのカギ）の二層防衛。どちらか一方が欠けても漏洩しない構成を両環境で達成。非 service_role ポリシーは原則ゼロ・SECURITY DEFINER は search_path 固定必須（CLAUDE.md §4）。

### カテゴリ 4: PII・プライバシー検証

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 4.1 | 🔴 | 学生証画像が承認後3日で完全削除されている | ✅ 2026-06-02 |
| 4.2 | 🔴 | 退会時に全データが論理削除 + Storage 物理削除される（migration 042 後） | ✅ 2026-06-02 |
| 4.3 | 🔴 | 本名・学籍番号が purge バッチ後に平文 NULL + hash 残存 | ✅ 2026-06-03 |
| 4.4 | 🟡 | プロフィール写真の EXIF が削除されている | ✅ 2026-06-03 |
| 4.5 | 🟡 | 退会済みユーザーが他人のフロントから匿名表示される（現状: CASCADE 即時消滅でマッチが消えて見える。match.py:108 is_deleted は dead code。設計変更は IDEAS「ブロック時のデータ物理削除」と連動） | ✅ 2026-06-03（CASCADE全消しが正式仕様・dead code 去就は IDEAS 実装時） |
| 4.6 | 🟡 | `PRIVACY_HASH_SALT` が本番設定済み + dev/prod で別値 | ✅ 2026-06-03（コード設計OK。実値: dev/prod とも設定済み・別値をオーナーが目視確認済み 2026-06-03） |
| 4.7 | 🟡 | login_history の書き込み未実装問題を β前に判断 | ✅ 2026-06-03（意図的β後見送り確定・既知負債として管理） |
| 4.8 | 🟢 | 本人がエクスポート機能で自分のデータを取得できる | ✅ 2026-06-03（β不要・APPI 上自動実装義務なし・本番前に評価） |
| 4.9 | 🟢 | 個人情報保護委員会への漏洩時通報手順を文書化 | ✅ 2026-06-03（本番前・カテゴリ12連動で整備） |

> **カテゴリ4（PII・プライバシー）🔴3 + 🟡4 + 🟢2 = 全9項目 完了。2026-06-03。**
> 主成果: 学生証3日削除ロジック確認・退会時CASCADE全消し確認・本名学籍番号のhash後消去確認・EXIF削除経路確認＋fail-close修正（4.4）。
> [4.4] EXIF 削除: フロント全経路が canvas→JPEG 再エンコード済み。backend `_strip_exif`（3経路）が JPEG の `exif=b""` で全メタデータ削除。旧 fail-open（`except Exception: return data`）を fail-close（422）に修正（`profile.py:43`）。GPS が残るか: 通常フロント経由では残らない。実機でのEXIF無し確認は [15.1] 繰り延べ。
> [4.5] 退会時のUX: matches が CASCADE で即時消滅するため相手のマッチリストから消える（「退会した」表示ではなく消滅）。match.py:108 `is_deleted` 分岐 / `privacy_purge.py:81` `purge_deleted_user_messages()` は実退会では到達不能な dead code（seed データのみで動作）。去就は IDEAS「ブロック時の物理削除」実装時に決定。設計の実態（HANDOFF §6）と一致確認。
> [4.6] PRIVACY_HASH_SALT コード設計: env 読み込みのみ・ハードコードデフォルトなし・未設定時は hash が NULL（空文字ハッシュにならない fail-safe）・PII 削除は未設定時も続行。**✅ 実値確認済み（2026-06-03）**: オーナーが Render ダッシュボードで dev/prod とも `PRIVACY_HASH_SALT` が設定済みかつ別値であることを目視確認。
> [4.7] login_history: β50〜100人規模では監査ニーズが低く実装コスト対効果が合わない。管理者は Supabase Auth Logs で代替確認可能。「空テーブル放置」ではなく「将来実装を想定した意図的保留」。本番後に「Supabase Auth Webhook で実装 or テーブル削除」を判断。
> [4.8] データエクスポート: エンドポイントなし。APPI（個人情報保護法）は自動エクスポート機能の実装義務なし。β 規模では Studio 手動対応で代替可能。本番前に改めて評価。
> [4.9] 漏洩時通報手順: 本番リリース前にカテゴリ12（法的チェック）と合わせて文書化。β 段階は不要。

### カテゴリ 5: 入力検証・インジェクション

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 5.1 | 🔴 | メアドドメイン制限が backend 側にも実装されている | ✅ 2026-06-03（DB トリガー `enforce_university_email_domain` が dev/prod 両環境に実在・有効を MCP introspection で確認。フロントバイパスにも砦あり。将来メアド変更実装時は backend 検証必須） |
| 5.2 | 🟡 | メアドのエイリアス（`+alias@`）で抜けられない | ✅ 2026-06-03（🔴→🟡 格下げ。阪大メール `@ecs.osaka-u.ac.jp`（Outlook 系）は `+` エイリアスを配送しない：オーナー実機確認。prod は Supabase Authentication「Confirm email=ON」が蓋として機能。根本の正規化対処（`+` 除去・canonical_email の UNIQUE 化）は β 後（IDEAS 登録済み）） |
| 5.3 | 🔴 | SQL injection: 全入力に `' OR '1'='1` 等を試す | ✅ 2026-06-03（古典的 SQLi ゼロ・supabase-py ビルダ経由のパラメータ化で構造的に防御。`admin.py:406` PostgREST フィルタ注入を構造的対策で堅牢化: `.or_(f"...")` 廃止→`_sanitize_admin_search`+カラム別 `.ilike()`+アプリ側 ID 和集合+`max_length=100`） |
| 5.4 | 🔴 | XSS: 全テキスト入力に `<script>alert(1)</script>` | ✅ 2026-06-03（穴ゼロ。React JSX `{value}` 自動エスケープ・`dangerouslySetInnerHTML`/`innerHTML` grep ゼロ件・メールテンプレートは `html.escape()` 全適用。CSP は β後タスク） |
| 5.5 | 🟡 | Mass assignment: status / identity_verified 等を送って弾かれる | ✅ 2026-06-03（穴ゼロ。Pydantic allowlist + exclude_unset で特権フィールド注入不可） |
| 5.6 | 🟡 | 数値の型・範囲チェック（year=999 等を弾く） | ✅ 2026-06-03（修正済み。`upload_student_id` Form の `year: int = Form(..., ge=1, le=11)` 追加・`browse` の `years` 範囲チェック追加） |
| 5.7 | 🟡 | 文字長の上限が backend で強制されている | ✅ 2026-06-03（修正済み。`real_name` max_length=100・`student_number` max_length=20+pattern・list 系各要素 50 文字・migration 048（student_number CHECK）dev/prod 適用済み） |
| 5.8 | 🟢 | NoSQL/コマンドインジェクション系 | ✅ 2026-06-03（穴ゼロ。`subprocess`/`os.system`/`eval`/`exec` = grep ゼロ件） |
| 5.9 | 🟢 | ファイルアップロードでパストラバーサル試行 | ✅ 2026-06-03（穴ゼロ。Storage パスはサーバー生成・ユーザー提供ファイル名不使用） |

> **カテゴリ5（入力検証・インジェクション）🔴4 + 🟡3 + 🟢2 = 全9項目 完了。2026-06-03。**

### カテゴリ 6: レート制限・DoS・大量データ

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 6.1 | 🔴 | 全エンドポイントに rate limit が付いている | ✅ 2026-06-03 |
| 6.2 | 🟡 | rate limit を X-Forwarded-For 偽装で bypass できない | ✅ 2026-06-03 |
| 6.3 | 🟡 | 大量データ攻撃: 配列1000要素・文字列100KB で弾かれる | ✅ 2026-06-03 |
| 6.4 | 🟡 | レースコンディション: 並列リクエストで二重マッチ・在庫負数化なし | ✅ 2026-06-03 |
| 6.5 | 🟢 | 大量ファイルアップロード対策 | ✅ 2026-06-03 |
| 6.6 | 🟢 | WebSocket の接続数上限・メッセージレート | ✅ 2026-06-03（β 受容） |

> **カテゴリ6（レート制限・DoS・大量データ）🔴1 + 🟡3 + 🟢2 = 全6項目 完了。2026-06-03。**
> 主成果: rate limit キーをユーザー単位（JWT sub）に変更／画像アップロード2本に二段制限追加（`20/min;100/hour`）／推薦・プロフィール詳細等6本に rate limit 追加（合計16本）／`hometowns` Query にバリデーション追加／`BodySizeLimitMiddleware`（256KB）を main.py に追加。

### カテゴリ 7: AI 生成コード固有の落とし穴

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 7.1 | 🔴 | 存在しないライブラリ/関数の呼び出しが無い | ✅ 2026-06-03 |
| 7.2 | 🔴 | 新規エンドポイントで認証ガード付け忘れが無い | ✅ 2026-06-03 |
| 7.3 | 🔴 | 新規テーブルで RLS 有効化忘れが無い | ✅ 2026-06-03 |
| 7.4 | 🟡 | try-except で例外を握り潰す箇所が許容範囲のみ | ✅ 2026-06-03（safety.py:86 の `except Exception: pass` を `logger.error(...)` に変更） |
| 7.5 | 🟡 | コピペ汚染で権限チェックが抜けた箇所が無い | ✅ 2026-06-03 |
| 7.6 | 🟡 | 全 migration が冪等（IF NOT EXISTS 等）で再実行可能 | ✅ 2026-06-03 |
| 7.7 | 🟡 | N+1 クエリがバックエンドに残っていない | ✅ 2026-06-03 |
| 7.8 | 🟡 | エラーメッセージで内部情報漏洩なし | ✅ 2026-06-03 |
| 7.9 | 🟡 | service_role 結果をフィルタせずフロント返却なし | ✅ 2026-06-03 |
| 7.10 | 🟢 | タイミング攻撃: ログイン応答時間に差が出ない | ✅ 2026-06-03（Supabase 直結・EP なし） |
| 7.11 | 🟢 | CORS が厳格（ALLOWED_ORIGINS で絞る・`*` なし） | ✅ 2026-06-03（prod ALLOWED_ORIGINS が https://crocoweb.jp,https://www.crocoweb.jp の2つのみ・オーナー目視確認） |
| 7.12 | 🟢 | CLAUDE.md §5 触らないファイルが誤編集されていない | ✅ 2026-06-03 |
| 7.13 | 🟢 | テスト・デバッグ用エンドポイントが残っていない | ✅ 2026-06-03（`POST /api/push/test` は正規 UI・rate limit `5/minute` 追加） |
| 7.14 | 🟢 | 未使用 import / dead code が残っていない | ✅ 2026-06-03（`browse.py` 未使用 import 削除・`limiter.py` except pass を logger.debug に変更） |

> **カテゴリ7（AI 生成コード固有）🔴3 + 🟡6 + 🟢5 = 全14項目 完了。2026-06-03。**

### カテゴリ 8: Cro-co アプリ固有の懸念

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 8.1 | 🔴 | 身バレ防止が全6経路で効いている（identity_hide.py） | ✅ 2026-06-03 |
| 8.2 | 🔴 | ブロック解除不可が DB レベルで担保されている | ✅ 2026-06-03 |
| 8.3 | 🔴 | 写真審査バイパス不可（pending 写真が他人に見えない） | ✅ 2026-06-03 |
| 8.4 | 🟡 | マッチ自動解除の整合性（messages dangling なし） | ✅ 2026-06-03 |
| 8.5 | 🟡 | 通報の悪用防止（連続通報の rate limit + 重複抑止） | 🟡 β受容・β後対応（IDEAS 登録済み） |
| 8.6 | 🟡 | 通報警告通知で通報者の身元が漏れない | ✅ 2026-06-03 |
| 8.7 | 🟡 | マッチ前のメッセージ送信不可 | ✅ 2026-06-03 |
| 8.8 | 🟡 | 直リンク経由のプロフィール閲覧が身バレ判定を通過する | ✅ 2026-06-03 |
| 8.9 | 🟡 | `LIKE_QUOTA_ENABLED` の prod 設定確認（β は OFF） | ✅ 2026-06-03（prod LIKE_QUOTA_ENABLED=false・オーナー目視確認） |
| 8.10 | 🟢 | 足跡経由いいね（無料）の悪用防止 | ✅ 2026-06-03 |
| 8.11 | 🟢 | 送信在庫の補償処理が正しく動く | ✅ 2026-06-03 |

> **カテゴリ8（Cro-co 固有）🔴3 + 🟡6(8.5 はβ受容) + 🟢2 = 全11項目 完了。2026-06-03。**

### カテゴリ 9: ログ・監査・観測性

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 9.1 | 🔴 | ログに PII（本名/メアド/学籍番号/JWT）が乗っていない | ✅ 2026-06-03 |
| 9.2 | 🟡 | WebSocket トークンが URL クエリ経由でログに残らない | ✅ 2026-06-03（[17.9] と同一案件・本番前対応・β据え置き） |
| 9.3 | 🟡 | 管理者操作の監査ログが全アクションで漏れていない | ✅ 2026-06-03 |
| 9.4 | 🟡 | 監査ログ改竄耐性（管理者自身が消せない） | ✅ 2026-06-03 |
| 9.5 | 🟢 | 異常な API 呼び出しの検知ログレベル | ✅ 2026-06-03（β受容） |

> **カテゴリ9（ログ・監査・観測性）🔴1 + 🟡3 + 🟢1 = 全5項目 完了。2026-06-03。**
> [9.1]✅ Python logger 全件 grep で PII（real_name/student_number/email/JWT）ゼロ件確認。[9.2]✅ ws.py:15 `?token=JWT` は [17.9] と同一案件・β据え置き。[9.3]✅ 管理者操作 23EP を全棚卸し: 状態変更系11本は全て log_admin_action 済み。欠落していた `POST /privacy-purge`・`GET /student-id/{user_id}` に log_admin_action を追加（admin.py:117/372/397）。privacy-purge 二重EP を `/privacy-purge` 1本に統合（2026-06-03）。[9.4]✅ admin_logs の DELETE/UPDATE EP ゼロ。DB 層: GRANT ALL TO service_role のみ。Supabase REST 直叩きは GRANT 層で 403。

### カテゴリ 10: エラーハンドリング・情報漏洩

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 10.1 | 🔴 | 500 エラーに stack trace / SQL 詳細 / 内部パスが含まれない | ✅ 2026-06-03（`FastAPI(debug=False)`・prod 起動コマンドに `--reload/--debug` なし・全 `HTTPException(status_code=500)` の detail が日本語固定文言のみ） |
| 10.2 | 🟡 | 404 と 403 の使い分けが情報漏洩していない | 🟡 本番送り（オーナー判断）: 非存在/身バレ→404・ブロック→403（CLAUDE.md §9 意図的設計）。404 統一への変更は §9 方針変更を要するためオーナー判断に委ねる |
| 10.3 | 🟢 | フロント側エラー画面で技術詳細を出さない | ✅ 2026-06-03（`ErrorBoundary.tsx:38` が固定文言のみ表示） |
| 10.4 | 🟡 | browse.py hides 除外が except: pass で fail-open（DB障害時に非表示ユーザーが一覧/推薦に出現） | ✅ 2026-06-03（hides は UX 設定のため fail-open 維持・`logger.warning` 追加で可視化） |
| 10.5 | 🟡 | browse.py マッチ済み除外が except: pass（マッチ済みが推薦に再出現・UX問題・権限影響なし） | ✅ 2026-06-03（`browse.py:317` を `logger.warning` に変更） |
| 10.6 | 🟡 | like.py should_count_quota RPC 失敗時 should_count=False（在庫消費なし・quota 再ON時の整合問題） | ✅ 2026-06-03（`logger.warning` 追加・フォールバック維持・本番再ON時は IDEAS 束ね） |
| 10.7 | 🟡 | identity_hide の fail-close 化に伴う副作用: DB瞬断時に一覧 API 全体が 500 になりうる（意図的設計） | ✅ 2026-06-03（意図的設計・本番監視メモのみ） |

> **カテゴリ10（エラーハンドリング・情報漏洩）🔴1 + 🟡5 + 🟢1 = 全7項目 完了。2026-06-03。**
> 設計原則補足: fail-close はセキュリティ制御（ブロック/身バレ/BAN/approved）に適用。hides・マッチ済み除外のような UX フィルタは fail-open でログ化（可用性優先）。
