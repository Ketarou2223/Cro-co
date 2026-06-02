# Cro-co — 進捗ボード

最終更新日: 2026-06-02（[4.1] ✅）

このファイルはプロジェクトオーナー向けの俯瞰ボード。「今どこにいて、何ができて、次に何をやるか」を一目で掴むためのもの。
技術的な引き継ぎは HANDOFF.md、API 詳細は docs/ARCHITECTURE.md を見ること。

---

## このプロジェクトが目指すもの

`@ecs.osaka-u.ac.jp` 限定の阪大学部生向けマッチングアプリ（Web版）。個人開発。

- キャッチコピー: 「普通の日常を、カラフルに。」 / サブコピー: 「思ったより、近くに。」
- 対象: 大阪大学**学部生全員**（共通メール `@ecs.osaka-u.ac.jp`）・母数 約12,000人
- 方針: β中は完全無料（ユーザー獲得優先）。月の運営コスト目標 1,000円以下

---

## 直近のマイルストーン

| マイルストーン | 時期 | 状態 |
|---|---|---|
| β版リリース | 2026年7月中 | 準備中（リリースフロー進行中） |
| 本番リリース・課金開始 | 2026年10月初旬 | 未着手 |
| 課金導入（フリーミアム） | 登録200人到達後 | 未着手 |
| 他大学展開検討開始 | 登録100人到達後 | 未着手 |

---

## 今どこ?

**βリリースまでの最終フロー進行中**。クローズドテストは実施せず、β一本に集中する方針（2026-05-27 決定）。

下記5 step を順に消化していく。各 step の完了条件は docs/ROADMAP.md セクション8 参照。

1. 機能・UI 面で β 版を完成（残: 身バレ防止全経路適用・非表示/ブロック一覧別ページ・プロフィール/探索タブ UI 改善・β明記）
2. β版である旨を各所に明記（ランディング・初回登録最初）
3. セキュリティチェック（超厳重・複数 AI レビュー + 手動ペネトレ）
4. 実機テスト + メール確認
5. PP・利用規約の施行日確定 + Supabase テストデータ除去 → βリリース

---

## 直近で動いたもの（新しい順）

- 2026-06-02 **[4.1]✅ 学生証3日削除ロジック確認＋孤立ファイル2経路を修正（`profile.py`）**。主軸（approved→reviewed_at 起点 3日→バッチ Storage.remove()+DB null）は正実装。reapply 時・upload 再アップ時に旧学生証が孤立する2穴を発見・修正。dev Storage 孤立ファイル1件確認（手動削除推奨）。⚠️ 3日実機は時間依存でコード精読代替。
- 2026-06-02 **[3.4]✅ authenticated 直叩き静的＋実機実証 + カテゴリ3 🔴 4本 完遂**。dev: authenticated JWT（ユーザーX）で代表テーブル 6本 SELECT → 全て 403 / 他人（ユーザーY UUID）の profiles を直指定 SELECT/PATCH/DELETE → 全て 403（`42501 permission denied`・GRANT 層で拒否・RLS 未到達を本文で明示）。prod: DML GRANT ゼロ + ポリシー qual auth.uid() 縛り 9本を静的確認。anon(3.3) + authenticated(3.4) で両ロール実証済み。カテゴリ3 二層防衛（GRANT + RLS）が両環境で完成。次フェーズ: 3.5🟡〜3.8🟢。
- 2026-06-02 **[3.3]✅ anon 直叩き全テーブル拒否を実証 + dev GRANT ドリフトを migration 045 で是正**。prod: 全 16 テーブル × 4操作 = 401✅。dev: SELECT=200[] / UPDATE/DELETE=204 だったが RLS が実データを守っていた（実害なし）。根本原因は Supabase デフォルト GRANT による anon DML 全付与 → migration 045 で revoke し prod と二層防衛を統一。revoke 後 dev も全操作 401✅。カテゴリ3 致命🔴 第3項 完了。
- 2026-06-02 **[3.2]✅ 非 service_role RLS ポリシー4本 DROP（migration 044・案A・dev/prod 両方適用済み）**。`hide_messages_with_deleted_user`/`match participants can view messages`/`blocks_delete_own`/`reports_self` を DROP。GRANT 層調査で実際には dead code（anon/authenticated に DML なし・即時インシデントではなく latent 脆弱性）と判明。ラッチン構成解消のため DROP は正しい判断。ARCHITECTURE §4/§7/§8 + ROADMAP [3.2]✅/[3.5] 更新。カテゴリ3 致命🔴 第2項 完了。
- 2026-06-01 **[3.1]✅ 全テーブル RLS 有効確認（dev 17テーブル・prod 16テーブル・RLS 無効ゼロ・修正不要）**。Supabase MCP で両環境同時確認。副次: user_inventory が dev に存在（migration 043 適用済み・ARCHITECTURE.md §8 訂正）、prod の like_quota ポリシー重複・messages 手動ポリシー検出 → 3.2 スコープへ。カテゴリ3 致命🔴 第1項 完了。
- 2026-05-31 [2.5]✅ BAN/deleted を全HTTP経路で403・WS 4003(commit 4f2d87d・§5限定解除で active_user/dependencies 修正)。実機でBANユーザー403確認。【カテゴリ2 致命🔴 5本 完遂】WS実機と[17.9]は別途。limited_admin構想はIDEASへ
- 2026-05-31 [2.4]✅ 管理者専用23本の保護を静的+実機確認(一般トークンで403)。fail-close一貫・昇格経路なし・二重ガード。🟡lower非対称(実害なし)とBAN済みadmin通過は[2.5]へ申し送り
- 2026-05-31 [2.3]✅ IDOR検出ゼロ＋ブロック/身バレの fail-open 6件を fail-close 化(commit bbed052・§5外)。実機で被ブロックid直叩き403確認。当初200はアカウント取り違えの可能性ありと注記。権限外🟡4件はカテゴリ10へ登録。BAN(active_user §5)は[2.5]へ
- 2026-06-01: **[2.3]✅ ブロック/身バレ防止 fail-open 6件を fail-closed に修正**。調査([2.3]棚卸し)で判明した 🔴4件+🟡7件のうちブロック3件+身バレ3件を修正。①`browse.py:115,292`のインライン b1/b2 ブロッククエリを `get_blocked_user_ids()` に一元化（`except Exception: pass` 削除）、②`browse.py:652`の 24行ブロックチェックを同関数1行に簡略化（元の except で 403 が握りつぶされていた根本原因を排除）、③`identity_hide.py:57,75`の `except APIError: return set()` を `raise` に変更（DB 障害時に呼び出し側を 500 で止める）、④`identity_hide.py:102`の `return False` を `return True` に変更（取得失敗時は「隠す」に倒す）。py_compile OK・b1/b2 インラインクエリ残存ゼロ・active_user.py 変更なし（git diff で確認）。⚠️ 未検証: 実機で被ブロック相手の `/api/profiles/{id}` 直叩きが 403 になること（元のバグ再現→修正後確認）
- 2026-05-31: **[2.2]✅ JWT認証 実機検証完了(dev・ヘッダなし401/有効200/改竄401)**。穴1(403→401軽微・β据置)記録、穴2(active_user.py BAN判定フェイルオープン)は[2.5]へ登録
- 2026-05-31: **[2.1]✅ 全backendエンドポイント認証ガード検証完了(79本・🚩ゼロ・目視+grep二重確認)**。グレー2件(admin BAN通過/WS受信)は[2.5]へ持ち越し
- 2026-05-31: **Step 3 カテゴリ1（インフラ・シークレット）全10項目 ✅ 完了**。[1.10] gitleaks 動作確認（`pre-commit run gitleaks --all-files` → Passed・本物 secret ゼロ・false positive なし）で締め。致命🔴4 + 重大🟡3 + 重要🟢3 を全消化。残課題は [17.9][17.10]（本番前）と一括ローテート対象（prod DB pass / dev service_role）に集約。次はカテゴリ2（認証・認可）の致命🔴 から。
- 2026-05-31: **[1.9] API キーのログ露出チェック ✅(条件付き)**。backend/app の *.py のみ（.env 除外）で logger/print 全件 grep・例外ハンドリング・リクエストロギング・Supabase デバッグログ・PII 出力・フロント console.log を検査。結果: secret（service_role / Resend / VAPID private / DATABASE_URL / SECRET_KEY / PRIVACY_HASH_SALT）がサーバーログに乗る経路ゼロ。残課題2件を本番前対応として登録: [17.9] WebSocket JWT のアクセスログ露出（`ws.py:14-15` の `?token=` クエリ渡し・β据え置き）/ [17.10] `AuthContext.tsx:44,59` のメアド console.log（ブラウザ DevTools のみ・§5 触らないファイル・β据え置き）。
- 2026-05-29: **[1.5] Storage バケット Public/Private ✅ + HomePage 自分アバター非表示バグ修正**。[1.5] は migration 041 で両バケット `public=false`・backend は `get_signed_image_url` 徹底（`get_public_url` ゼロ）・オーナー dashboard 目視で Public=OFF 確認し ✅ クローズ（ROADMAP 完了ログに記録・webp MIME 不整合は [1.6] 送り）。同時に HomePage で自分のアバターが表示されないバグを修正＝Private 化後に HomePage だけ直 public URL 構築が残っていたのが原因。`/api/profile/me` に署名 URL の `avatar_url` フィールドを追加（`schemas/profile.py:29`・`profile.py:102-107`）し、HomePage はそれを表示（`HomePage.tsx:26,155`）。未使用ヘルパー `lib/supabase.ts` の `getProfileImageSignedUrl` を削除。検証: `py_compile` OK / `tsc -b`+`vite build` exit 0 / grep（直 public URL・未使用ヘルパー双方ゼロ）。⚠️ **未検証**: dev push 後の Vercel Preview 実機での自分アバター表示はオーナー確認待ち。変更: `backend/app/schemas/profile.py`・`backend/app/routers/profile.py`・`frontend/src/pages/HomePage.tsx`・`frontend/src/lib/supabase.ts`（+ md 4件）
- 2026-05-29: **Step 3 セキュリティチェックリストを17カテゴリ89項目に拡張**。ROADMAP セクション7 を旧8カテゴリ29項目から17カテゴリ89項目（致命🔴24 / 重大🟡41 / 重要🟢22）の [ID]＋重大度マーク付き表形式に刷新。AI 生成コード固有（カテゴリ7）と Cro-co 固有（カテゴリ8）を新設。1項目ずつ「調査→修正→再調査→✅追記」サイクルで消化するフェーズへ移行準備完了。関連: docs/ROADMAP.md セクション7・コミット c52753b。
- 2026-05-28: **いいねシステム改修①受信制限オフ + ③男性送信在庫**（1 PR）。**①** `like.py` 受信枠チェックと `browse.py` 男性向け閲覧フィルタ2箇所を `if settings.like_quota_enabled:` で囲み、`LIKE_QUOTA_ENABLED` 未設定（=False）の β は受信制限・閲覧制限がともに skip される（女性は無制限受信可・男性は全女性を常時閲覧可）。コードは削除せず gate 化＝将来 True で BeReal 復活可能。あわせて男性タイムラインのデフォルトソートを `created_at desc`→`last_seen_at.desc.nullslast` に変更（`/profiles` 既定・`/profiles/recommended`）。**③** 新規 `user_inventory` テーブル（migration 043・案X 縦持ち・`profiles` 参照・service_role only RLS・`set_updated_at` 流用・冪等）と `backend/app/core/inventory.py`（ensure/consume/refund・アトミック UPDATE）を新設。男性が異性志向の女性に非足跡経由でいいね送信時のみ `consume_like_stock` が発火（足跡経由・女性・同性ペアは無料）。初期10・毎日ログイン +2（lazy 加算・`GET /api/likes/stock` ensure で発火）・安全弁10000（DB CHECK + アプリ層の二重）。新規 `GET /api/likes/stock` を追加し HomePage に「ITEMS」セクション（男性のみ・いいねストック数 + 補充ルール）/ BrowsePage 右上に在庫残数 `♥ {n}`（在庫0で背景 acid）を実装。在庫0で送信時はリクエストせずトースト「いいねが足りない。明日ログインで補充される。」を表示。400 レスポンスの detail もそのままトースト。`config.py` への `like_quota_enabled: bool` 追加は CLAUDE.md §5 例外運用（過去5回の env Field 追加実績あり・オーナー承認）。検証: `py_compile` OK / `tsc -b`+`vite build` exit 0 / grep（`like_quota_enabled` 4箇所参照・`consume_like_stock` は `if should_count:` 内のみ・refund は4経路で揃う）。⚠️ **未検証**: (1) migration 043 の dev/prod SQL Editor 適用（オーナー手動・既存 male approved への one-shot 付与含む）、(2) dev push 後の Vercel Preview 実機での HomePage アイテム表示 / BrowsePage 在庫表示 / 在庫切れトースト / ログイン報酬発火、(3) prod の `LIKE_QUOTA_ENABLED` 未設定確認（β は OFF が前提）。変更ファイル: `backend/migrations/043_user_inventory.sql`(新)・`backend/app/core/config.py`・`backend/app/core/inventory.py`(新)・`backend/app/routers/like.py`・`backend/app/routers/browse.py`・`frontend/src/pages/HomePage.tsx`・`frontend/src/pages/BrowsePage.tsx`（+ md 5件）
- 2026-05-28: **アプリ内お問い合わせのユーザー送信 UI を実装（フェーズ1・テキスト版）**。専用ページ `/settings/contact`（`ContactPage.tsx` 新規・約280行）を新設し、POST /api/inquiries/ への送信フォーム（category=radio5択 / subject=max100 / body=max2000・残量カウンター・5/hour）と GET /api/inquiries/me による履歴セクション（運営返信 admin_reply は黄色サブブロックで表示）を実装。`SettingsPage.tsx` は旧メアドテキスト表示（`cro-co.support@…`）を撤去し、ブロック/非表示の2枚に並ぶ3枚目の入口カード（`#FFE94D`・MessageSquare アイコン・バッジなし）を追加。backend は `send_inquiry_notification_to_admin`（`core/email.py:58-91` 新設）を追加し、`POST /api/inquiries/` の insert 成功直後に `BackgroundTasks` で ADMIN_EMAILS 宛 Resend 通知（失敗は warning ログのみ・本体 201 はブロックしない）。送信成功で `showToast('送信しました')` → `invalidateQueries(['inquiries-me'])` → `navigate(-1)`。429 は専用文言「もう少し時間をおいて試してみて。」・他エラーは「うまくいかなかった。もう一度試してみて。」。ユーザーへの受付確認メールは送らない（履歴 UI で代替・Resend 枠節約）。検証: `tsc -b` exit 0 / `vite build` exit 0 / `py_compile email.py routers/inquiries.py` OK / grep（`/settings/contact` 2件・`cro-co.support` 0件・`POST /api/inquiries/` 1件）/ Vercel Preview Ready 確認 SHA `67721f4`（GitHub commit status `Vercel=success`「Deployment has completed」）。⚠️ **未検証**: 実機ハードリロードでの動作確認（送信完了 → 管理者メール到達 → 履歴 admin_reply 表示 → 429 文言）はオーナー側。Step1 機能・UI 完成の取りこぼし（問い合わせ受け口）を解消。画像添付はフェーズ2で別途。変更ファイル: `backend/app/core/email.py`・`backend/app/routers/inquiries.py`・`frontend/src/pages/ContactPage.tsx`(新)・`frontend/src/App.tsx`・`frontend/src/pages/SettingsPage.tsx`（+ md 4件）
- 2026-05-28: **退会バグ修正 migration 042 作成 + seed v2 PII 完成（フェーズB）**。新規 `backend/migrations/042_add_deleted_status.sql` で `profiles_status_check` に 'deleted' を追加（023/036 と同形・冪等）。これで本番退会バグ（`DELETE /api/profile/me` が CHECK 違反で 500）と seed v2 No.10 deleted の 400 が同時に解消する見込み。あわせて `scripts/seed_test_users_dev_v2.ps1` の approved 7人を本番の2状態に分散投入（**案①**）: **No.1〜4 = 「審査直後」状態**（real_name/student_number 平文・hash NULL・privacy_purged_at NULL）、**No.5〜7 = 「purgeバッチ後」状態**（平文 NULL・hash あり・privacy_purged_at = 4 日前）。pending(No.8)/banned(No.9) は平文 PII（banned は `privacy_purge.py:124-156` の eligible 外で本番でも purge されない）。department は学部別固定1個マッピング（`identity_hide.py` は faculty_hide_level='department' のときのみ department を読むが、seed は faculty_hide_level を設定しない＝DB default 'none' のため身バレ判定に影響しない）。新設 `Get-SaltedSha256Hex` は `privacy_purge.py:26-33`（`hashlib.sha256(f"{salt}:{value}".encode("utf-8")).hexdigest()`）と完全一致を Python と PowerShell の双方計算で3入力検証（テスト太郎/`e99MF01`/実 No.5 値 `テスト太郎MF-5` & `e99MF05` の全 hex が完全一致）。`DEV_PRIVACY_HASH_SALT` を env で渡す（チャット/コミットに残さない）。未設定でも `--create` は動くが No.5-7 の hash 列が NULL になる旨の Warning が1セッション1回出る。検証: `[Parser]::ParseFile` 0 エラー / Build-UserFields の5状態出力 JSON が期待通り / Python⇔PowerShell hash 一致 / salt 未設定の Warning 1回・hash null フォールバック。⚠️ **未検証**: (1) migration 042 の dev/prod 適用は SQL 未実行（オーナー手動・dev → prod の順）、(2) seed の実 `--create` 実行はオーナー実行待ち（期待 `created=40 errors=0 matches=16 blocks=12`）、(3) 退会バグの本番実機確認も別途。042 を先に適用してから `--create` を実行すること（順序が逆だと No.10 deleted の PATCH が引き続き 400）。変更ファイル: `backend/migrations/042_add_deleted_status.sql`(新) / `scripts/seed_test_users_dev_v2.ps1` / md 4件
- 2026-05-28: **dev テストユーザー seed を v2 化**（Step 4 実機テストの下準備・更新）。新規 `scripts/seed_test_users_dev_v2.ps1` を追加（v1 は残置）。40人構成（4組 `MF`/`FM`/`MM`/`FF` × 10人）で全状態（approved 7・pending・banned・deleted）と全志向を網羅。各組7人内に同形のマッチ（`1↔2,3↔4,5↔6,5↔7`）とブロック（`1→3,4→5,6→7`）を配線（マッチは likes 両方向 INSERT + matches 直接 upsert で順序非依存・冪等／ブロック片方向／両者は排他で衝突なし）。deleted は auth.users を残し profiles のみ status=deleted + PII クリア（番号付き名前は保持＝匿名化テスト用）。パスワード既定値を `TestUser_2026!`→`keita2004` に変更。`--cleanup` は v1 残骸（`e2etest_*`/`fm1`/`fm2`）も厳格な正規表現で巻き取り。検証: `[Parser]::ParseFile` 0 エラー・PNG 6色を System.Drawing でデコードし RGB 完全一致・40人分 JSON ボディ妥当・マッチ/ブロックグラフ（16マッチ全て両方向 like・衝突0・12ブロック）を確認。⚠️ **未検証**: Admin API 実送信はオーナー実行待ち（オフライン検証のみ・v1 と同じ運用）。DEPLOY のシード手順を v2 用に更新（v1 は廃止予定マーク付きで残置）。変更: `scripts/seed_test_users_dev_v2.ps1`(新)
- 2026-05-28: **β版明記を実装**（Step 2 完了）。ランディング（`LandingPage.tsx:325-333`）のヒーロー説明文直後に `bg-acid` のβ告知ボックス（Sparkles アイコン + 「いまβ版。たまにつまずくかも。」軽トーン）を追加。初回登録「ようこそ」ページ（`SetupRequiredPage.tsx:379-383`・STEP 0 のボタン直上）に中立※書式（`text-xs text-gray-400`）のフットノート「※ Cro-coは現在β版です。正式リリースは2026年10月を予定しています。β版は完全無料です。」を追加（硬めトーン）。同意チェックボックスは置かない方針を維持。配置・配色はフェーズA 調査（マーキーは英語uppercaseで日本語会話調に不向き・W1 は審査時間情報と混在）に基づきオーナー決定。`tsc -b`+`vite build` 成功・grep でβ表記が想定2箇所のみを確認。あわせて STATUS/HANDOFF/DEPLOY の `/check-email` 誤記（現行コードに該当ルート不存在・実装はインライン success 表示）を3ファイルで訂正。⚠️ **未検証**: 実機ハードリロードでの両画面確認はオーナー側。変更: `LandingPage.tsx`/`SetupRequiredPage.tsx`
- 2026-05-28: **非表示・ブロック一覧を専用ページ化**（Step 1 サブタスク2件まとめて完了）。新ルート `/settings/safety` を新設し、1ページ + 上部タブ（ブロック / 非表示・URL クエリ `?tab=` で保持）に分離。ブロックタブは閲覧専用（解除不可仕様維持）、非表示タブは各行に解除ボタン（確認ダイアログなし・トーストのみ）。設定画面は既存ブロックリスト直描画を撤去し、件数バッジ付き入口リンク2カード（顔を出さない）に置換。バックエンドは `GET /api/safety/hides`（顔写真/名前を返す一覧・`HiddenUserItem` 新設）を追加、解除は既存 `DELETE /api/safety/hide/{id}` を流用。hide/block 実行箇所5件すべてに `invalidateQueries(['safety-hides'|'safety-blocks'])` を追加し件数バッジを自動同期。`tsc -b`+`vite build`+`py_compile` 成功・grep 最終チェック合格。⚠️ 実機ハードリロード確認は別途。変更: `safety.py`/`schemas/safety.py`/`SafetyListPage.tsx`(新)/`App.tsx`/`SettingsPage.tsx`/`ProfileDetailPage.tsx`/`ChatPage.tsx`/`MatchesPage.tsx`
- 2026-05-28: **さがすカードのスケルトンを正方形化**（Step 1 仕上げの補修）。8cd5165 で ColorfulCard を 1:1 化した際、BrowsePage のローディングスケルトン（インライン実装）がスコープ漏れし `aspectRatio: '3/4'` のまま残っていた＝実カードは正方形なのにロード中だけ縦長で一瞬ジャンプが出ていた。`BrowsePage.tsx:686` を実カードと同じ `aspect-square` クラスに統一。`frontend/src` 配下の 3/4 表記が grep でゼロ件になったことを確認。`tsc -b`+`vite build` 成功。⚠️ 実機ハードリロード確認は別途
- 2026-05-27: **さがすカード正方形化**（Step 1 仕上げ）。v2 で詳細ページを 1:1 にしたのに合わせ、ColorfulCard（さがす/ホーム共用）も写真エリアを 3:4→1:1 正方形に統一。写真なしユーザーは lucide の User シルエット→Croco SVG（CrocoIllust）中央配置に置換。名前+ひとことの下文言タブは既存構造（白背景・border-t-2・truncate）をそのまま維持＝全カード同じ高さ。ホームのおすすめカードにも自動反映。変更は `ColorfulCard.tsx` のみ。`tsc -b`+`vite build` 成功。⚠️ dev push 後の実機確認は別途
- 2026-05-27: **プロフィール改修 v2（細部調整）**（Step 1 仕上げ）。dev Vercel Preview 実機確認で出た3点を修正。(1) 詳細ページの写真エリアを 1:1（正方形）に統一（写真あり/なし共通・写真ゼロ時の間延び解消）。(2) 浮遊いいねボタンが下部ナビと接触していた問題を修正（`bottom-16`→`bottom-[calc(5rem+env(safe-area-inset-bottom))]`でセーフエリア込み常時 16px ギャップ）。(3) PC（>=768px）でユーザー固有カラー背景を画面全幅に展開（breakout 技法・コンテンツは 480px 維持・スマホは `md:` 限定で無影響）。さがすカードは前回完成済みのため未変更。変更は `ProfileDetailPage.tsx` のみ。`tsc -b`+`vite build` 成功。⚠️ dev push 後の実機確認は別途
- 2026-05-27: **dev テストユーザー作成スクリプト追加**（Step 4 実機テストの下準備）。`scripts/seed_test_users_dev.ps1` を新設（`--create` / `--cleanup` / `--list`）。dev はメール確認 OFF だが、フロントは新規サインアップ後にルート遷移せずインラインで確認メール送信済み表示を出す（`SignupPage` の success ステート・`/check-email` というルートは存在しない）だけで、アプリ内に進むにはメール内リンク（`emailRedirectTo=/setup/required`）のクリックが必要なため、メール確認 OFF の dev では通常フローで `/setup/required` に到達できない。そこで Supabase Admin API で `email_confirm=true` のユーザーを作り PostgREST で approved/banned/pending/deleted へ直接昇格させてサインアップフローをバイパスする（2026-05-28 訂正: 当初記述「フロントが新規サインアップを固定で /check-email に飛ばす」は誤り。実装はインライン success 表示・該当ルート不存在）。テストユーザー13人（オーナー/異性ターゲット6/同性ペア2/BAN/審査待ち/退会済み/ブロック対象）。`e2etest_` プレフィックスで識別し `--cleanup` で一括削除。ダミー写真は実行時に純 PowerShell で 6 色ソリッド PNG を生成（System.Drawing も Base64 ハードコードも使わず・手動 CRC32+Adler32+stored zlib）。使い方は docs/DEPLOY.md「テストユーザーシード手順」。あわせて ROADMAP セクション5 に「ローカル `.env` が prod を指している問題」のクリーンアップ項目を追記、HANDOFF 設計判断ログに「詳細ページから clubs 表示を削除（身バレ防止には裏で使用継続・UI 非表示）」を追記。⚠️ **未検証**: Admin API への実送信はオーナー実行待ち。オフライン検証のみ実施（`[Parser]::ParseFile` 0 エラー・PNG が System.Drawing でデコード可能・JSON ボディ妥当）
- 2026-05-27: **プロフィール見え方改修**（Step 1 の最終サブタスク）。さがすカードを固定サイズ化（写真3:4 / 名前 / 今日のひとこと / でっかく学年のみ・学部学科や興味タグは削除）。プロフィール詳細ページを3段構成（カルーセル左右矢印+ドット / 名前ブロック / 詳細ブロック）に刷新し、背景をユーザー固有色で全面化・円形アバター廃止。学部学科 → 文理表示（他人視点＝詳細ページのみ・自分の編集は学部学科のまま）。メイン写真を必ず先頭に返すよう backend に集約。デフォルトひとこと30パターンを user_id ハッシュで決定的に割当。ColorfulCard は HomePage おすすめと共有のため Home のカードも同じ見た目に統一。⚠️ ローカル `.env` が prod を指し詳細閲覧が足跡を書き込むため実 HTTP curl は未実施（`tsc -b`+`vite build`+`py_compile` 成功・主要ロジックはオフライン検証済み）。dev デプロイ後に実機確認予定
- 2026-05-27: **dev 環境構築完了**。バケット作成（migration 041）・`PRIVACY_HASH_SALT` 追加・疎通スクリプト検証（200/200/200）・Branch Protection 実態確認。`scripts/storage_smoke_dev.ps1` を dev service_role で実行し upload=200 / download=200 / delete=200 を確認。Branch Protection は新形式 Repository Rulesets で実装済み（Dismiss stale approvals OFF だが approvals=0 のため無害・追加保護として deletion 禁止 / force push 禁止）。dev/prod を migration ファイルだけで再現可能な状態に到達
- 2026-05-27: dev 環境の storage バケットを構築。`profile-images` / `student-ids` を migration 041（`041_create_storage_buckets.sql`）で dev/prod 両方に作成（prod 同設定: Private/5MB/image/jpeg+png）。SQL 直 INSERT が Supabase 公式推奨であることを確認のうえ B-1（SQL 化）を採用。両環境で `storage.buckets` 全カラム一致を確認。これで dev でも画像アップロードのバケットが揃った。✅ dev での service_role 経由アップロード→署名 URL→削除の HTTP 疎通を `scripts/storage_smoke_dev.ps1` で検証済み（2026-05-27・upload=200 download=200 delete=200）。✅ `PRIVACY_HASH_SALT` を dev Render に追加済み（本番と別値）。✅ GitHub Branch Protection は新形式 Repository Rulesets で設定済みを確認（Dismiss stale approvals OFF だが approvals=0 のため無害）
- 2026-05-27: 探索タブ刷新 + 身バレ防止全経路適用を `dev` に push（commit `d6ae640`・身バレ防止 Task と探索タブ Task が同一ファイル内で混在していたためオーナー判断で1コミットに集約）。**Render dev が新コードを配信中であることを確認**（`/api/profiles/hometowns` が 404 でなく 401＝今コミットで新設した経路が存在・`/health` 200）。JWT 必須の機能通し確認は Step 4 で実施予定。Vercel Preview のビルド成否はダッシュボード未確認（手元に vercel CLI 無し）
- 2026-05-27: 探索タブ（さがす）を「検索バー + 詳細検索」に刷新。自己紹介検索・学年（複数）・文理（文系/理系/不問）・出身地（複数）・並び替え（最終ログイン順含む）を追加。学部学科は直接見せず文理で絞る方針。検索条件はすべてサーバー側で適用。検索履歴は端末内のみ（ログアウトで消去）。⚠️ dev のシードデータで SQL レベル検証は完了したが、実 HTTP（ブラウザ/curl）での通し確認は未実施（ローカル起動に必要な dev 鍵が手元になく、dev のサーバーは更新前コードのため）
- 2026-05-27: 身バレ防止を全6経路にサーバー側適用（`backend/app/core/identity_hide.py` に判定一本化・直リンク/いいね送信は 404）。Step 1 のサブタスク完了。⚠️ dev 実機 curl 検証は未実施
- 2026-05-27: βリリースまでのフローを5 step で確定（クローズドテスト廃止・β一本化・身バレ防止を全経路サーバー側で実装する方針決定・β明記方針決定）
- 2026-05-27: ドキュメント全面更新（STATUS / HANDOFF / ROADMAP / README をβリリースフローに合わせて再整理）
- 2026-05-27: `profile-images` バケットの Private 化を確認（Supabase `storage.buckets` で `public=false`）。コード側は 2026-05-25 に署名付き URL 切替済み
- 2026-05-27: BeReal型いいね受信枠のフロント UI が実装済みであることを確認（`HomePage.tsx:350-386` の受信枠カード・`GET /api/likes/quota` を表示）
- 2026-05-27: 本番（`fspbzagpilhjorfdvtxe`）/ dev（`hpkpndjqtzycnytymdkk`）両 Supabase で migration 035/037/038/039 の適用を schema introspection で確認
- 2026-05-27: ドキュメント全面再構築（md 管理ルール導入・ファイル構成再編・ARCHITECTURE.md 新設）
- 2026-05-26: ブロック・通報・退会・BAN の E2E をオーナーが目視で動作確認（⚠️ 記録なし・テスト証跡未整備）
- 2026-05-26: ブロック機能のバックエンド多層防御を完了（通報機能・写真表示の修正含む / 直近コミット `9b651df`）
- 2026-05-26: 通報「警告して終了」アクションで通報相手にシステム通知を送信（migration 039 で `admin_warning` 通知タイプ追加）
- 2026-05-25: dev 環境構築完了（Vercel Preview + Render dev + Supabase dev `hpkpndjqtzycnytymdkk`）
- 2026-05-25: 写真審査フロー実装完了（pending/approved/rejected・管理者 PhotoReview タブ）
- 2026-05-25: PP・利用規約のアプリ内実装（施行日プレースホルダーは弁護士確認後）
- 2026-05-25: Resend メール認証（crocoweb.jp ドメイン認証 + Supabase SMTP 設定）
- 2026-05-25: セキュリティ Step 1〜9 完了（privacy_purge 確認・環境分離・機密フィールド整理・EXIF 削除・署名付き URL 切替 ほか）

---

## 次にやること（βリリースまでのフロー）

詳細・完了条件は docs/ROADMAP.md セクション8。

1. **機能・UI 完成（進行中）**
   - ✅ 身バレ防止を全経路サーバー側で適用（2026-05-27 完了。⚠️ dev 実機 curl 検証は未実施）
   - ✅ 探索タブ UI 改善（2026-05-27 完了・検索バー + 詳細検索 + 文理検索。⚠️ 実 HTTP 通し確認は未実施）
   - ✅ 非表示一覧ページ新設・ブロック一覧を別ページへ（2026-05-28 完了・`/settings/safety` タブ切替。⚠️ 実機ハードリロード確認は別途）
   - ✅ プロフィール見え方改善（2026-05-27 完了・さがすカード固定サイズ化＋詳細ページ3段構成＋学部学科の文理表示化＋メイン写真先頭。⚠️ 実 HTTP 未検証）
   - ✅ アプリ内お問い合わせ受け口（2026-05-28 完了・フェーズ1・テキスト版・`/settings/contact`・管理者メール通知 ON。⚠️ 実機ハードリロード確認は別途。画像添付はフェーズ2残）
   - アプリアイコン（画像ファイル作成待ちで保留）
2. ✅ **β明記**: ランディングと初回登録の最初に「β版」をさらっと表示（同意チェックボックスは置かない）。2026-05-28 完了・ランディング=bg-acid ボックス / ようこそ=中立※フットノート。⚠️ 実機ハードリロード確認はオーナー側
3. **セキュリティチェック**: 複数 AI レビュー + 手動ペネトレ + 自動スキャン（ROADMAP セクション7 を全項目消化）
4. **実機テスト + メール確認**: ブロック・通報・退会・BAN シナリオを記録付きで実施。Resend 経由のメール到達も実機確認
5. **法務最終 + テストデータ除去 + リリース**: PP・利用規約の施行日確定・Supabase 内のお試しデータを全削除 → βリリース

### 後送り（β後）
- migration 040 post-apply 検証（blocks ポリシーが3本に収束したか schema で確認）
- 最終オンライン時刻表示
- `login_history` の書き込み実装 or テーブル削除判断
- WebSocket token のログ露出対策（Render アクセスログ）→ ROADMAP [17.9] として本番前対応に正式登録（2026-05-31）

---

## 既知の問題（ユーザーの判断が要りそうなもの）

- ⚠️ **本番の退会バグ修正 migration 042 は dev/prod 適用待ち**: `profiles_status_check` に 'deleted' を追加する `042_add_deleted_status.sql` は 2026-05-28 にコード作成済み。これで `DELETE /api/profile/me` の 500 と seed v2 No.10 の 400 が同時に解消する見込みだが、**dev/prod とも SQL Editor での適用はオーナー手動待ち**。dev → prod の順で実行し、各環境で `pg_get_constraintdef` で 'deleted' 含有を確認後、退会フローの実機テストを行うこと。詳細は HANDOFF「既知の技術的負債」
- ⚠️ **E2E テスト証跡が未整備**: ブロック・通報・退会・BAN は 2026-05-26 にオーナーが目視で動作確認済みだが記録がなく、自動テストも無い（回帰検知・再現性の担保が無い）
- 📝 PP・利用規約の施行日プレースホルダー「2026年●月●日」を弁護士確認後に埋める必要あり

### Step 3 完了時の一括ローテート対象（2026-05-29 時点）

| secret | 露出経路 | ローテート手順 |
|---|---|---|
| prod Supabase DB password | チャット履歴（2026-05-29 [1.4] 調査時に Claude Code が平文出力。git/公開成果物への混入なし） | Supabase prod → Settings → Database → Reset database password → 新値で Render prod の `DATABASE_URL` を更新（ローカル `backend/.env` は dev 切替予定のため prod 値は破棄） |
| dev Supabase service_role key | チャット履歴（2026-05-31 [1.8] 調査時に grep が `backend/.env` をヒットし値を出力。git/公開成果物への混入なし） | Supabase dev → Settings → API → service_role キーを Reset → 新値で Render dev の `SUPABASE_SERVICE_ROLE_KEY` とローカル `backend/.env` を更新 |

棚卸し枠（露出ではないが Step 3 総点検時に確認推奨）:
- ローカル `backend/.env` が prod 直結だった期間に扱われた prod service_role / anon キー（プロアクティブにローテートしてもよい）
- dev access_token (JWT) - 2026-05-29 [1.4] オーナー目視確認時にスクショ経由で露出 → 即ログアウトで Supabase 側で無効化済み・追加対応不要(参考記録)

---

## コスト管理（運営費）

| サービス | プラン | 月額 | 備考 |
|---|---|---|---|
| Supabase | Free | ¥0 | 500MB 以下維持目標 |
| Render | Free | ¥0 | GAS ping でスリープ回避 |
| Vercel | Hobby | ¥0 | |
| Resend | Free | ¥0 | 月3,000通以内 |
| ドメイン crocoweb.jp | お名前.com | 年額（要確認） | |
| **月コスト目標** | | **¥1,000以下** | |

---

## 想定 DAU 目安

| フェーズ | 目安 |
|---|---|
| β | 50〜100人 |
| 本番初期 | 100〜300人 |
