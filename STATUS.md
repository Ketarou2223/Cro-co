# Cro-co — 進捗ボード

最終更新日: 2026-06-10（β前タスク棚卸し・方針確定）

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

- 2026-06-10 **β前タスク棚卸し（オーナー確認）。** prod テストデータ全削除 / DNS 伝播・HTTPS 証明書 / ローカル .env の dev 分離 / APP_ENV 反映後 prod レスポンス（HSTS・/docs 404）/ Resend サインアップ確認メール実受信 / パスワードリセットメール実受信 / PWA・Web Push 実機 / ADMIN_EMAILS 本番設定 / AI レビュー（カテゴリ13）を全て完了。方針確定: interests=β温存・looking_for=β後DB削除・bio再審査=β後・18歳=登録ページ自己申告チェックボックス（実装は別コミット）・有償コードレビュー=見送り。通報受理通知メールは実装しない（app内通報＋管理画面で十分）で確定。
- 2026-06-10 **B-1〜B-11 パスの残オーナー作業4件 完了。** (1) ローテート: prod DB password・dev service_role key（ローテート対象表2件）＋ prod anon key（D-2）＋棚卸し枠の prod キーを全てローテート・旧キー無効化。(2) Render prod に `APP_ENV=production` 追加（D-1）→ 本番 `/docs`・`/redoc`・`/openapi.json` 無効化・HSTS 発火条件成立。(3) migration 050 を prod Supabase に手動適用（dev は 2026-06-06 適用済み）・`check_rls_drift.ps1 -Target prod` CLEAN 確認。(4) Supabase ダッシュボード（prod/dev）の Email Templates 既定（`{{ .ConfirmationURL }}`）・Redirect URLs 実値を目視確認。(5) C-1 LIKE_QUOTA_ENABLED は β=OFF（無制限）で確定（prod env 未設定）。⚠️ APP_ENV 設定後の prod レスポンス実確認（HSTS 付与・/docs 404）は Step 4 実機で。
- 2026-06-10 **SetupRequiredPage クラッシュ（React #310）修正。** メール確認後に `/setup/required` へ着地するとエラー画面になりリロードでも復帰しない問題。原因: 早期 return（isLoading 時の LoadingScreen 等）の後に `useMemo` 2本が置かれており、プロフィール取得完了時にフック数が増えて Rules of Hooks 違反でクラッシュ（フルページロード時のみ発症・SPA 内遷移はクエリキャッシュ済みで非発症）。修正: `useMemo` を通常の式に変更（`SetupRequiredPage.tsx`）。同パターンの他ファイル残存なしを grep 確認。tsc -b エラー0・vite build ✓。⚠️ 実機（メール確認リンク実走→STEP 0 表示）は未検証。詳細は HANDOFF §6（2026-06-10）。 → ✅ 2026-06-10 実機検証済み（メール確認→/setup/required が STEP 0 表示・クラッシュなし）。
- 2026-06-10 **メール確認リンクの着地を /auth/confirmed に一本化（案A・オーナー承認済み）。** 確認リンクを踏んだユーザーが迷子になる問題を修正。原因: (a) 成功時も完了を知らせる表示がなくいきなりオンボーディングに着地、(b) 期限切れ・使用済みリンク（阪大メール=Microsoft 365 の SafeLinks 先踏みで高頻度想定）では ProtectedRoute がエラー情報ごと捨てて無言で /login に飛ばしていた。修正: `SignupPage.tsx` の `emailRedirectTo` を `/setup/required` → `/auth/confirmed` に変更し、未配線だった `AuthConfirmedPage.tsx` を状態別3分岐（成功=「確認しました」+「登録をつづける」ボタンで /setup/required へ・ログイン不要 / エラー hash=「使用済みか期限切れ」+ログイン誘導 / フォールバック=ログイン誘導）に全面書き換え。§5 保護ファイル変更ゼロ。tsc -b エラー0・vite build ✓。⚠️ 実機（メールリンク実走）は未検証——dev は Confirm email OFF のため prod 実機 or dev 一時 ON が必要。**オーナー TODO: Supabase ダッシュボードの Email Templates（既定 `{{ .ConfirmationURL }}` のままか）と Redirect URLs 実値の目視確認。** 詳細は HANDOFF §6（2026-06-10）。 → ✅ 2026-06-10 実機検証済み（メールリンク実走・確認完了画面・登録続行・期限切れリンクのエラー画面）。
- 2026-06-07 **gotrue→supabase_auth 移行完了（dev/prod 両方）。** `supabase==2.22.4` へアップグレード。13 ファイルの `from gotrue.types import User` を `from supabase_auth.types import User` に置換。py_compile 全 OK・DeprecationWarning なし・/health 200 確認済み。§5 保護ファイルは import 行のみの変更。prod Render 反映完了（2026-06-07）・DeprecationWarning 消滅確認済み。
- 2026-06-07 **support@crocoweb.jp 受信開通。** ImprovMX（無料メール転送）の MX レコード（mx1/mx2.improvmx.com・優先度10/20）を crocoweb.jp ドメインに設定。support@crocoweb.jp 宛メールがオーナー Gmail へ転送されることを確認。
- 2026-06-07 **電気通信事業届出 提出（近畿総合通信局・電子申請）。** 受理待ち。

- 2026-06-07 **フロント修正バッチ（6タスク）完了。** (1) 学生証モーダル小さい問題修正: `DialogContent` のデフォルト `sm:max-w-sm` が Q-10 の `max-w-4xl` をカスケードで上書きしていた—`sm:max-w-4xl` に変更し `max-h-[580px]` → `max-h-[75vh]` に拡大（`PendingTab.tsx`）。(2) `/auth/confirmed` ページ新設: メール確認リンクのリダイレクト先を追加（`AuthConfirmedPage.tsx` + `App.tsx` に lazy import + Route 追加—§5 ファイル最小変更）。(3) プッシュ通知文言を敬語に統一: `like.py` の「いいねが届いた」→「いいねが届きました」・「マッチした！」→「マッチしました！」・body「送ってみよう」→「送ってみましょう」。`message.py` の「メッセージが届いた」→「メッセージが届きました」。`push.py` の「プッシュ通知が動いてる。」→「プッシュ通知が届きました。」。(4) LandingPage 3修正: β告知を `text-xs` → `text-base` に拡大＋正式リリース日「2026年10月1日を予定」を追記・「0円」カードを削除・非敬語テキスト2箇所を修正。(5) MatchesPage 空状態「まだマッチがいない。」→「まだ誰ともマッチしていません。」・「読み込めなかった。」→「読み込めませんでした。」。(6) `useChat.ts` の既読処理に TODO コメント追加（β後対応予定）。tsc -b エラー0・vite build ✓・py_compile OK。⚠️ 実機確認はオーナー Preview。

- 2026-06-06 **セキュリティ最終パス dev 検証完了（B-1〜B-11 + migration 050 + RLS DROP 後スモーク）。** B-1(plus-alias拒否): SQL logic ✅ / B-2(WS 6本目1008): 5本OPEN→6本目拒否 ✅ / B-3(block→WS切断): wsA=Aborted ✅・wsB=Open（クライアント受信ループなしで close frame 未処理、サーバー側は disconnect_all で両切断済み・サーバー側セキュリティ保証は達成） / B-4(chunked 413): ✅ / B-5(rate limit 429): hide 31回目→429 ✅・dismiss 31回目→429 ✅・reapply 6回目→429 ✅（DELETE /me はコード確認のみ・物理削除のため実走スキップ） / B-11(WS subprotocol): subprotocol無し→拒否 ✅・JWT subprotocolで接続 ✅ / RLS 9本DROP後スモーク: profile/me・profiles・matches・messages・notifications・POST messages 全件 200 ✅ / RLS drift: MCP直接検証でCLEAN ✅。**残オーナー作業: migration 050 を prod Supabase に手動適用・`check_rls_drift.ps1 -Target prod` CLEAN 確認・C-1 LIKE_QUOTA_ENABLED フラグの β 方針決定・D-1 Render prod に `APP_ENV=production` 追加・D-2 prod anon key ローテート。**

- 2026-06-06 **セキュリティ最終パス B-1〜B-11 一括修正完了。** (B-1) migration 050 で `enforce_university_email_domain` を強化—`%+%@%` LIKE で plus-alias を拒否・split_part でドメイン完全一致チェックに変更。(B-2) `ws_manager.py:connect()` に `_MAX_CONNECTIONS_PER_MATCH=5` 上限を追加—超過時は False を返し ws.py が 1008 で切断。(B-3) `safety.py:block_user` が match 削除後に `ws_manager.disconnect_all(match_id)` を呼び出しブロック後 typing 通知を即時遮断。(B-4) `main.py:BodySizeLimitMiddleware` を BaseHTTPMiddleware から生 ASGI ミドルウェアに書き直し—chunked 転送も実ストリームを積算して 256KB 超で 413 を返す。(B-5) 高コスト書込みエンドポイントにレート制限追加: `DELETE /profile/me`→3/hour・`POST /profile/reapply`→5/hour・`POST /safety/hide`&`DELETE /safety/hide/*`→30/minute・`PATCH /photos/reorder`→30/minute・`POST /likes/dismiss/*`→30/minute・`POST /profile/complete-onboarding`→10/minute・`POST /photos/*/set-main`→20/minute。(B-6) `like.py:should_count_quota` RPC 失敗時のフォールバックを `False`（無制限いいね）→`True`（安全側）に変更。(B-7) migration 050 で authenticated RLS ポリシー9本を DROP（profiles/hides/blocks/message_reactions/notifications/login_history/inquiries）—service_role 一本化を完徹。rls_allowlist.json を同期更新。(B-8) `browse.py:confirm_profile_views` の非 approved 時 `return`（204）を `raise HTTPException(403)` に変更—fail-open 修正。(B-9) `AuthContext.tsx:44,59` のメール console.log 2行削除—PII ログ排除（§5 保護ファイル・ロジック不変・差分は削除2行のみ）。(B-10) `PhotoReorderRequest.order` に `max_length=6` を追加—7件以上で 422。(B-11) WebSocket JWT を URL クエリパラメータから Sec-WebSocket-Protocol ヘッダへ移行—`useChat.ts` は `new WebSocket(url, [token])` に変更、`ws.py` は `websocket.headers.get("sec-websocket-protocol")` で受け取り `accept(subprotocol=token)` でエコー。Render アクセスログへの JWT 平文記録を解消。py_compile OK・tsc -b エラー0。⚠️ **オーナー手動作業: migration 050 を dev→prod に適用・drift CLEAN 確認。B-1 は `a+x@ecs.osaka-u.ac.jp` 拒否の実走確認。B-2 は dev で6本目接続が 1008 になることを確認。B-4 は chunked 320KB が 413 になることを確認。B-5 は各エンドポイントで上限超過→429 になることを確認。**

- 2026-06-06 **セキュリティ C-1 #1〜#4 修正完了。** (#1) `ProfileUpdateRequest` から `real_name`/`student_number`/`birth_date` を除外—これらの KYC フィールドは `upload-student-id` 経由でのみ確定し、PATCH /me に混ぜてきても Pydantic が無視するように変更（schemas/profile.py:64-84・routers/profile.py:147-150）。実走で `real_name=PWN` が update_data に含まれないことを確認。(#2) 本番（APP_ENV=production）では FastAPI の `/docs`・`/redoc`・`/openapi.json` を無効化（main.py:33-40）—dev では従来どおり使用可。オーナー TODO: Render の prod 環境変数に `APP_ENV=production` を追加。(#3) API の `SecurityHeadersMiddleware` に HSTS（`Strict-Transport-Security: max-age=31536000; includeSubDomains`）を prod 限定で追加（main.py:46）。フロント vercel.json に `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors 'none'` を全ルート対象で追加（frontend/vercel.json）。フル CSP（script-src 等）は post-β 据え置き。(#4) PATCH /me の自由入力テキスト（name/faculty/department/bio/hometown/status_message/club）に HTML タグ除去（`<[^>]*>` regex）をサーバー側で追加（routers/profile.py:128-132）—`<script>alert(1)</script>` → `alert(1)` を実走確認。py_compile OK・tsc -b エラー0。⚠️ 実機（PATCH /me に real_name 混入→反映されない / bio サニタイズ後の DB 内容 / 本番 /docs→404）はオーナー確認。

- 2026-06-06 **日次メトリクス・スナップショット（migration 049）実装完了。** `daily_metrics(snapshot_date, metric_key, value)` テーブル新設・service_role 専用 RLS・`snapshot_daily_metrics(date)` SQL 関数（SECURITY DEFINER + search_path=public）・pg_cron `snapshot-daily-metrics`（UTC 15:05 = JST 0:05）登録の SQL 一式を `backend/migrations/049_daily_metrics.sql` として作成。22 metric_key（累計 14 + 日次増分 5 + アクティブ rolling 3）を ON CONFLICT DO UPDATE で upsert（冪等・手動バックフィル可）。backend env 追加なし（DB 内 cron で完結）。既存テーブルへの変更ゼロ。rls_allowlist.json・ARCHITECTURE.md・DEPLOY.md を更新済み。⚠️ **prod/dev への手動適用 + 初回シード実行はオーナー**（DEPLOY.md §マイグレーション適用手順 8 参照）。

- 2026-06-06 **管理画面 タブバッジ全接続 + 視認性パス完了。** (バッジ) `inquiryUnreadCount` が AdminTabBar に未接続だった。stats エンドポイントに `inquiry_unread_count` を追加し接続。InquiriesTab の返信/クローズ/既読・PendingTab の承認/却下後に `['admin-stats']` を invalidate しバッジがリアルタイムに減る仕組みを完成。(視認性) KpiCard ラベル 10px → 12px、グラフ軸 fontSize 9 → 11、凡例 10 → 12+bold、白地不可視だったミント折れ線 → パープル・学年バー acid → ink、学部別バーを濃色化、StatusBadge 10px → 11px。tsc -b 0エラー・vite build ✓。⚠️ 実機確認はオーナー Preview。
- 2026-06-06 **SetupRequiredPage.tsx:391 「審査は通常1〜2営業日で完了します。」を「審査には数日いただくことがあります。結果はアプリ内のステータスでご確認いただけます。」に置換。** #426（SetupThanksPage）との整合取り。tsc -b エラー0・vite build ✓。⚠️ 実機確認はオーナー Preview。
- 2026-06-06 **パスB4 Q-3 文言書き換え 仕上げスイープ完了。** チャンク1〜3適用後の残存ため口（「探してます、ちょっと待って。」×5・「〜だよ。」×1・「〜しよう。」×5 他）を15ファイルで修正。MatchModal.tsx に `pickRandom` + `useState` で マッチ成立3パターンを実装（「さっそく話しかけてみましょう」「最初のひとことを送ってみませんか」「どんな会話になるか楽しみですね」）。PWAInstallBanner.tsx の「追加しよう」→「追加しましょう」も対応。CLAUDE.md §7 トーン・ボイス表を「です/ます ベース」に更新し `pickRandom` 実装済みファイル一覧を追記。tsc -b エラー0確認済み。⚠️ 実機確認はオーナー Preview。
- 2026-06-06 **パスB2 チャンク3（#364〜492）文言書き換え完了。全スイープ完了。** ProfileDetail / SetupRequired / SetupOptional / SetupComplete / SetupThanks / SetupInstall / SetupNotify / ResetPassword / LoadingScreen / ErrorBoundary / MatchModal / PWAUpdateBanner の12ファイル。★最重要: SetupThanksPage の「審査は通常1〜2営業日・メールでお知らせ」を削除し「アプリ内ステータスでご確認」に差し替え（Q-9 提出完了画面の虚偽約束を完全除去）。LoadingScreen を「探してます」→「読み込んでいます。少しお待ちください。」に統一（#41/#484 訂正）。「送ってます...」を全ファイルで「送信中…」に統一。⚠️ 実機確認はオーナー Preview。
- 2026-06-06 **パスB2 チャンク2（#169〜363）文言書き換え完了。** ProfileEdit / Settings / Chat / LikesReceived / Footprints / Notifications / Contact / Pending / Rejected / Safety の10ファイルに「です/ます」トーン統一。ChatPage に `pickRandom` + `emptyChatTitle` state を追加し空状態3バリアント実装。削除モーダル「やっぱりやめる」→「やめておく」「消してる...」→「削除中…」等も整理。⚠️ 実機確認はオーナー Preview。
- 2026-06-06 **パスB2 チャンク1（#1〜134）文言書き換え完了。** ログイン・登録・ホーム・Browse の4画面に対し「です/ます」トーンへ統一。変更ファイル: LoginPage / SignupPage / HomePage / Layout / BrowsePage の5ファイル（計14箇所）＋グローバル★トースト「うまくいかなかった。もう一度試してみて。」→「うまくいきませんでした。もう一度お試しください。」を9ファイル全置換。BrowsePage に `pickRandom` ヘルパーと `emptyStateTitle` state を追加し空状態見出し3種ランダム表示・いいね在庫切れトースト3種・いいね送信トースト3種を実装。チャンク2以降（#135〜）は別セッションで継続。⚠️ 実機確認はオーナー Preview。
- 2026-06-05 **パスA（P-1 PP追記 ＋ Q-4/Q-5/Q-6 管理バッチ）完了。** (P-1) PP §4(2) に「削除実行前の期間（最大3日間）は本名・学籍番号・生年月日の平文データはご本人のみが閲覧できる状態で保持される」旨を一文追記。`privacy_purge.py` 実コード確認: `purge_user_pii` は real_name・student_number・birth_date・student_id_image_path の全4項目を None に、age は birth_date から事前計算し保持。API 経由でユーザーが閲覧できるのは ProfileResponse に含まれる前3項目のみ（student_id_image_path はレスポンス外）。(Q-4) `admin.py` stats エンドポイントの `total_reports = _count("reports")` を `eq_status="pending"` 付きに変更——Overview タブ「未対応通報」KPI が全件でなく pending 件数を表示するように。(Q-5) 通報タブの検索: status フィルタは既実装済み・`reason`/`detail` テキスト検索入力をフロントに追加（クライアントサイドフィルタ）。空文字時は全件表示・該当なし時は「該当する通報なし」。(Q-6) OverviewTab 累計折れ線の `stroke="#DFFF1F"（ライム）` を `"#0A0A0A"（ink）strokeWidth=2` に変更——白背景で視認不能だった線を修正。tsc -b 0エラー・vite build exit 0・py_compile OK 確認済み。⚠️ 実機（/privacy に追記文表示・未対応通報カウント正常・通報検索・グラフ視認性）はオーナー Preview 確認。
- 2026-06-05 **アプリアイコン Croco マーク差し替え完了。** favicon / PWA / ホーム追加アイコンを新 Croco マーク（mint `#A8F0D1` 背景 + 黒シルエット・角丸タイル）に統一。`index.html` の favicon link を PNG/ICO ベース3本（32x32・16x16・favicon.ico）＋ apple-touch-icon に差し替え。`vite.config.ts` の VitePWA manifest icons を `pwa-192.png`(any) / `pwa-512.png`(any) / `maskable-512.png`(maskable) に更新し `background_color` を `#A8F0D1`（mint）に変更。旧 vite デフォルト資産（`favicon.svg` / `icon-192.png` / `icon-512.png` / `icons.svg` / `icon-source.svg`）を削除。`vite build` exit 0・dist/ の manifest.webmanifest に新アイコン3本・background_color `#A8F0D1` を確認。⚠️ 実機目視（ブラウザタブ favicon・PWA インストール・スプラッシュ背景色）はオーナー確認。
- 2026-06-05 **最終手直しバッチ ①②③ 完了。コード凍結前最終修正。** (①) HomePage の `COMPLETION_ITEMS` から `interests`（趣味・興味）を除外——廃止項目（R-4）が達成度 % を下げていた。おすすめセクションのガード条件を `recommended.length > 0` → `recommended.some(r => r.score > 0)` に変更し、スコール全0（趣味データ空）時の「プロフィールに趣味を追加するとおすすめが表示されます」文言ごとセクション非表示化。interests の DB/backend は温存（D-1）。(②) SafetyListPage ブロックタブ注記の「誤ブロックの場合はサポートまでご連絡ください。」を削除——ブロック解除不可・運営経由解除導線なしの方針（§9）と矛盾していた。「※ ブロックは取り消せません。」のみ残存。横断 grep（サポートまで・ブロック解除文言）= 0件。(③) SettingsPage のブロック/非表示入口カードの赤バッジ（件数表示・通知風）を削除——実体はブロック中人数カウントであり通知ではないため確認後も消えず紛らわしかった。`blocksCount`/`hidesCount` の `useQuery` ごと削除。SafetyListPage 自身の同キャッシュは独立 `useQuery` で維持。tsc -b 0エラー・vite build ✓ 確認済み。⚠️ 実機目視はオーナー Preview 確認。
- 2026-06-05 **Q-2b/Q-9/Q-10 完了。** (Q-2b) HomePage ヒーロー PC 表示の `md:max-h-[220px]` を `md:max-h-none` に変更。コンテンツ（ロゴ/名前/プロフィールバー/ボタン）が PC 幅でも見切れなくなった。モバイル側（min-h-[60vw] max-h-[380px]）は不変。(Q-9) PendingPage.tsx の「1〜2日以内に連絡する」「通常1〜2日以内に連絡する」を削除——承認完了を知らせるメールは実装されていないため（core/email.py に承認通知関数なし）。代替文言「アプリ内のステータスで確認できるよ」に置換。(Q-10) admin PendingTab の学生証照合ダイアログを大改善: 幅を max-w-2xl→max-w-4xl に拡大、画像を max-h-96→max-h-[580px]（クリックで原寸表示リンク維持）、申告内容パネルを bg-acid/20→bg-acid（濃色・card-bold スタイル）+ sm:w-48→sm:w-64 + text-[10px]→text-xs/text-base に拡大。カードリストの本人確認グリッドも bg-acid/20→bg-acid + 各ラベルを uppercase font-bold + 値を text-base に統一。tsc -b 0エラー・vite build ✓ 確認済み。⚠️ 実機目視はオーナー Preview 確認。
- 2026-06-05 **Q-7 やり直し + Q-1/P-7 ラベル訂正完了。** [ラベル訂正] 前コミット b89a85d のエントリは Q-1/P-7 が逆表記だった（作業内容自体は正しい）。正: Q-1＝いいね在庫ピルを拡大（text-sm px-3 py-1 border-2）・フォーマット `♡×n` に変更、P-7＝BrowsePage の「TODAY'S LIKES: n」表示を削除・`/api/likes/today-count` クエリ除去。[Q-7 やり直し] 前コミットは「ブロック前の確認ダイアログ」を削除したが、本来は「操作後に出て消えない通知ポップ」の除去が目的だった。今回: ProfileDetailPage・ChatPage に R-2 様式（不透明 card-bold・font-display・取消せません hot 文言）のブロック確認モーダルを復活。「消えないポップ」の正体は ProfileDetailPage の `alert()` 呼び出し（ブロック・非表示エラー時）と ChatPage の `actionError` インラインバナー（自動消去なし）と特定し除去（前者は showToast／モーダル内エラー表示に置換、後者に 3 秒タイマー追加）。非表示は可逆のため確認ダイアログ不要・現状維持。件数バッジ invalidate・SafetyListPage 解除トーストは維持。tsc -b 0エラー・vite build ✓ 確認済み。⚠️ 実機目視はオーナー Preview 確認。
- 2026-06-05 **ユーザー画面クイック修正 Q-1/Q-2/P-2/P-7 完了（Q-7 は上記やり直し）。** (Q-1) いいね在庫ピルを拡大（text-sm px-3 py-1 border-2）・フォーマットを `♡×n` に変更。(P-7) BrowsePage の「TODAY'S LIKES: n」表示を削除・`/api/likes/today-count` クエリも除去。(Q-2) HomePage ヒーロー黒帯の PC 表示を縮小（md:min-h-0 md:max-h-[220px]）・minHeight/maxHeight を Tailwind クラスに移動。(P-2) ProfileEditPage のアカウント情報（学籍情報）欄の「必須」バッジ・「変更不可」バッジを削除。tsc -b 0エラー・vite build ✓ 確認済み。⚠️ 実機目視はオーナー Preview 確認。
- 2026-06-05 **βブロッカー R-2〜R-5 完了。** (R-2) アカウント削除確認を shadcn AlertDialog → カスタム不透明モーダル（card-bold・font-display・hot ボタン）に作り替え。(R-3) GA 同意トグルを設定画面に追加（プライバシー設定カード内）・OFF 時に `ga-disable-<ID>` フラグで即時停止。analytics.ts の setConsent 経路に一本化。(R-4) ProfileEditPage + SetupOptionalPage の趣味タグ自由入力 UI を非表示化（DB/backend/既存データは温存・D-1 で最終形決定予定）。(R-5) /privacy・/terms の施行日プレースホルダーを 2026年6月5日 に確定。tsc -b・vite build exit 0。§5 ファイル変更ゼロ。⚠️ 実機はオーナー目視。
- 2026-06-05 **パスワードリセット race condition 修正 + アンマッチ機能完全廃止。** `ResetPasswordPage.tsx` useEffect に `getSession()` フォールバックを追加（メールリンクから遷移時に PASSWORD_RECOVERY がマウント前に発火する race condition 対策）。`backend/app/routers/match.py` の `DELETE /{match_id}`（アンマッチ）ハンドラを削除・`Response` import 除去。フロント/バック unmatch/アンマッチ残骸 grep 0件確認。py_compile OK・tsc -b exit 0。§5 ファイル変更ゼロ確認。⚠️ リセット実機はオーナー確認。
- 2026-06-05 **登録ページ 規約/PP 同意を2チェックボックスに分割。** 「利用規約およびPPに同意（必須）」1チェック→「利用規約に同意（必須）」「プライバシーポリシーに同意（必須）」2チェックに分割。両方 ON のときのみボタン活性。GA トグルは任意・独立を維持。tsc -b + vite build exit 0。§5 無変更。⚠️ 実機目視はオーナー Preview 確認。
- 2026-06-05 **ランディング18禁 HERO 表示修正 + 登録ページ declutter。** HERO の18禁が初回追加時に text-xs 12px のプレーンテキストで視覚的に埋もれていた原因を特定。β告知ピルと同型の `inline-flex border-2 border-ink rounded-[10px] bg-paper boxShadow` pill（text-sm）に変更し「主たる明示」として HERO で明確に表示。登録ページは border-2 箱3連続を解消: 18禁を compact `<p>` に、GA トグルの border 箱を除去・説明文を1行に圧縮（Google 明記・PP リンク維持）。規約同意（必須）の border は維持。tsc -b + vite build exit 0。§5 ファイル変更ゼロ確認。⚠️ 実機目視はオーナー Preview 確認。
- 2026-06-05 **フェーズ4 ✅完了（コア fail-close 全 OK・4-15b axios 正形式確認済み・4-15 全クローズ）+ フェーズ5 完了（GA・18禁・PP）。** seed 再構築: cleanup=39件・create=40件 errors=0 matches=16 blocks=12（ff6/ff3/mm2↔mm6 変化を解消）。4-15b: BrowsePage.tsx:222 `params.append('hometowns',h)` → `hometowns=` 形式（[] なし）確認で 4-15 全クローズ。5-1: GA OFF で PROD=false+consent=false → gtag.js 注入経路ゼロ（コード確認）✅。5-2/5-3: dev は PROD=false のため GA 実トラフィック確認不可 → フェーズ7（prod）に繰り延べ。5-4: setConsent→initGA（同期 initialized=true）→ trackEvent('sign_up') で dataLayer push → 取りこぼしなし（コード経路確認）✅。5-5: LandingPage 2箇所・SignupPage 1箇所に「18歳未満は利用できません」確認 ✅（⚠️ ブラウザ目視はオーナー）。5-6: /privacy §10(2) 外部送信規律型あり・§2/§12 ログイン履歴なし・トグル文言 Google Analytics 明記（コード確認）✅（⚠️ docx 目視はオーナー）。次: フェーズ6（CSRF・IDOR・レースコンディション）またはβリリース手順へ。
- 2026-06-04 **Step4 実機テスト フェーズ4完了（コア機能 E2E 全確認）。** ブロック 403・身バレ 404（直リンク/like/推薦全経路）・pending 写真非表示・set-main 422・upload-avatar 404・detect_match 発火・block+report+withdrawal+BAN シナリオ完走・BAN 即時 403・EXIF GPS 消去・privacy-purge admin_logs・browse hometown フィルタ（正形式で機能）を全実機確認。fail-close 系全件 OK。重大インシデントなし。次: フェーズ5（CSRF 等）またはβリリース手順へ。
- 2026-06-04 **Step4 実機テスト フェーズ3完了（[15.7] 実機確認済み）。** rate limit 発火: push/test 5/min→req6=429 ✅ / report 10/min→req11=429 ✅。ユーザー単位独立カウント確認（同一IP・別JWT で mf2=200）✅。body サイズ: 300KB JSON→413 / multipart 除外（201）✅。観察: Pydantic 422 はカウンター非加算・chunked 転送は middleware スルー（既知）。重大インシデントなし。[15.7]✅。
- 2026-06-04 **Step4 実機テスト フェーズ2完了（[15.3][15.4] 実機確認済み）。** SQLi 全入力: PATCH/bio_keyword/hometowns の全経路でリテラル保存 or 0件・injection 不成立。XSS: backend リテラル保存確認（ブラウザ目視は繰り延べ）。Mass assignment: Pydantic allowlist が特権フィールドを全て透過させない（status/id/email 不変）。入力制約: year=999/101char name/21interests/symbol student_number → 全 422。観察: Pydantic 422 エラーに `"input"` echo-back・β受容。`hometowns[]` 構文でフィルタ無効化（SQLi ではなく UX バグ）。重大インシデントなし。[15.3]✅/[15.4]✅（backend のみ）。次: CSRF/IDOR/レースコンディション等。
- 2026-06-04 **Step4 実機テスト フェーズ0+1 完了。** セキュリティ修正（カテゴリ2〜11）38ファイルが未コミット・未デプロイだったため push（8c34597）→ Render dev 即時配信確認。seed v2 re-apply 完了（created=40 errors=0 matches=16 blocks=12）。Phase 1 全 15 ケースを dev 実機確認: fail-close（改竄JWT→401, pending→403, banned/deleted→403）全件 OK。差異 2 件（実害なし）: @gmail signup→500（期待400・DB trigger 発火確認）/ WS が HTTP 403（期待 close 4003）。[15.1] ✅ 実機確認済み（詳細: ROADMAP コメント + Cro-co_実機テスト計画_Step4.md）。次: フェーズ2〜（IDOR・SQLi・XSS 等）。
- 2026-06-04 **通報時メッセージ閲覧同意の建付けは β 後着手で保留。** 法的論点（通信の秘密・両当事者への適用）を HANDOFF §6 に記録。コード変更なし。
- 2026-06-04 **PP アプリ反映（P-1/P-3）。** ログイン履歴を §2(4) と §12(1) から削除（取得実態なし）。§10(2) を外部送信規律の型（送信情報・送信先・目的・オプトアウトURL）に差し替え。GA 同意トグル補足文を具体化（/privacy へ内部リンク付き）。`tsc -b` + `vite build` exit 0。⚠️ 実機目視・docx との文面一致確認はオーナー TODO。
- 2026-06-04 **法第10条対応・18歳未満利用禁止をランディング/登録画面に明示。** LandingPage の HERO（β告知直下・ShieldAlert アイコン付き）とフッター（copyright 行下）、SignupPage のフォーム内（terms チェックボックス直上）に「18歳未満は利用できません。」を配置。`tsc -b` + `vite build` exit 0。⚠️ 実機目視確認はオーナー側（[15.x]）。
- 2026-06-04 **GA4 アクセス解析（オプトイン）導入。** 登録画面に任意トグル（デフォルト OFF）を追加。同意 ON かつ本番 PROD のときのみ `gtag.js` を動的注入。ファネル4点（sign_up / student_id_submitted / first_like_sent / match_established）を仕込み。`tsc -b` + `vite build` exit 0 確認。§5 ファイル変更ゼロ・測定 ID 直書きゼロを grep 確認。⚠️ 未検証（[15.x]繰り延べ）: トグル OFF で GA リクエスト不送信・ON で page_view 経路ごと発火・ファネル4イベント発火の実機 E2E。
- 2026-06-04 **予防インフラの結晶化。** 新機能チェックリスト（追補）を CLAUDE.md §4 に、known-good baseline と番人ツール（§10）を ARCHITECTURE.md に畳み込み。新規 md なし（§3）。
- 2026-06-04 **[11.6] RLS/GRANT ドリフト検知スクリプト完成・クローズ。** dev/prod 実走 CLEAN・合成テスト（__drift_test__・authenticated・SELECT・PERMISSIVE）追加で1件 DRIFT 検知→DROP で CLEAN 復帰・接続失敗 ERROR 停止（exit 2）をオーナー実機確認。scripts/check_rls_drift.ps1 + scripts/_rls_query.py（pg8000 直結）+ scripts/rls_allowlist.json（dev introspection 実値ベース許可リスト・全26ポリシー網羅）。カテゴリ11 は 11.1/11.2/11.3/11.6 完了＝主要分終了。残 11.4 OWASP ZAP / 11.5 GitGuardian は終盤集約。次は予防インフラの結晶化（新機能チェックリスト＋スナップショット集約を既存 md へ）。
- 2026-06-03 **法務方針転換。** 外部弁護士との連絡が途絶（関係悪化）。PP・利用規約を弁護士確認前提から自前起草に変更。Cro-co の実態（阪大限定・PII 3日削除・CASCADE 全消し等）を文面に反映する方針。必要に応じ後日専門家レビュー受領は排除しない。法的妥当性の最終担保はオーナー責任（ROADMAP §4・カテゴリ12 更新済み）。
- 2026-06-03 **[11.3] semgrep クローズ。** backend（5パック 325ルール）＋ frontend（7パック 215ルール）とも CE findings 0件。canary 実機でエンジン健全性確認（設定不良でなく該当パターン不在）。semgrep 自動結果が [5.4] 手動 grep と完全一致（XSS 系 0件を相互裏取り）。CE 盲点3パターン（コマンド注入・PostgREST フィルタ注入・AWS 汎用キー形式）は手動精査で対応済み。次: [11.4] OWASP ZAP DAST または [11.5] GitGuardian または [11.6] GRANT ドリフト検知。
- 2026-06-03 **[11.1] 全クローズ。** frontend npm audit 両件（qs/ws moderate）受容確定。backend(PyJWT/starlette 修正・idna/pip 受容)＋frontend(moderate 2件受容) で [11.1] 完了。再評価トリガー: shadcn/supabase-js 更新時または本番リリース前に npm audit 再実行。次: [11.3]〜[11.6] または [12.x]。
- 2026-06-03 **[11.1] frontend npm audit スキャン完了。moderate 2件（critical/high ゼロ）・両方受容推奨。** ① qs@6.15.1（GHSA-q8mj-m7cp-5q26）: shadcn CLI→MCP SDK→express→qs のチェーン。shadcn はアプリコードで import されず Vite バンドルに含まれない。② ws@8.20.0（GHSA-58qx-3vcg-4xpx）: supabase-js→realtime-js→ws。realtime-js は websocket-factory.js で `typeof WebSocket !== 'undefined'` 確認後にネイティブ WebSocket を使用・ws は require されない・CVE もサーバー側実装の問題。どちらも本番バンドルへの到達経路なし・オーナー判断待ち。
- 2026-06-03 **[11.1] backend pip-audit A/B/C/D 全クローズ。** B: `starlette==1.2.1`（本番実値）を requirements.txt に追加・ローカル 1.0.0→1.2.1 更新（PYSEC-2026-161 Host header injection 対応）。requirements ベース pip-audit クリーン確認。A(PyJWT==2.13.0)/B(starlette==1.2.1) 修正・C(idna)/D(pip) 受容で完了。frontend npm audit は未実施。
- 2026-06-03 **[11.1] pip-audit A/B 対応進行中。** A: `PyJWT==2.13.0` を requirements.txt に明示追加・ローカル 2.12.1→2.13.0 更新・requirements ベース pip-audit 再スキャンでクリーン確認。B: starlette 本番 1.2.1 vs 監査推奨 1.0.1 の調査完了。両バージョンで CVE 修正コード（`_HOST_RE.fullmatch`）が完全一致・fastapi==0.136.1 は starlette>=0.46.0 上限なしのため 1.2.1 互換。`starlette==1.2.1`（本番実値）固定を推奨・オーナー判断待ち。C/D（idna/pip）は受容・据え置き。
- 2026-06-03 **[11.1] backend pip-audit スキャン完了（pip-audit 2.10.0 使用）。** requirements.txt ベース: クリーン（0件）。.venv 全体（推移的依存含む）: 9件/4パッケージ検出。仕分け→ ①β前修正推奨: starlette 1.0.0（PYSEC-2026-161・Host header injection・fix=1.0.1 既存・fastapi==0.136.1 が `starlette>=0.46.0` を要求し 1.0.1 可）・PyJWT 2.12.1（4件 CVE・fix=2.13.0・本番は既に 2.13.0・直接 import なし） ②移行待ち許容: idna 3.13（DoS・メール入力制限で到達不能・supabase 移行時連動） ③受容: pip 25.3×3件（ランタイム不使用）。今回は修正なし・オーナー判断待ち。frontend スキャン（npm audit）は未実施。
- 2026-06-03 **[11.2] backend 直接依存 6 個を本番実値で == 固定。** 本番 Render の pip freeze（オーナー取得）に基づき `Pillow==12.2.0` / `pydantic-settings==2.14.1` / `python-multipart==0.0.30` / `resend==2.30.1` / `slowapi==0.1.9` / `pywebpush==2.3.0` を requirements.txt に固定。ローカル .venv も本番実値に同期（pydantic-settings 2.14.0→2.14.1・python-multipart 0.0.27→0.0.30）。supabase 行は gotrue 移行とセットのため今回は温存。py_compile OK。ローカル pip freeze スナップショットを HANDOFF §9 に記録（本番前 lockfile 化の参照データ）。別件: 本番に `PyJWT==2.13.0` が存在を確認・requirements.txt に明示なし（gotrue 推移的依存）→ §5 既知負債に登録。次: [11.1]🔴（Snyk/Trivy スキャン）または [11.3]〜[11.6]。
- 2026-06-03 **[11.2] gotrue→supabase_auth 移行を本番リリース前タスクに確定。** 従来「supabase>=2.12 で DeprecationWarning 解消」と記載していたが誤り。wheel 解析で判明した実際の切替点は supabase>=2.20（2.12〜2.18 は gotrue 依存のまま）。移行内容は requirements.txt を `supabase==2.22.4` に変更＋ `from gotrue.types import User` → `from supabase_auth.types import User` を13ファイルで書き換え（うち §5 の `dependencies.py` / `active_user.py` を含む→§5 限定解除のオーナー承認が必要）。β は警告出るに任せる（黙殺しない）。ROADMAP [11.2] 訂正・CLAUDE.md §10 / HANDOFF §5 §6 に負債として記録。APScheduler .venv ドリフトも本セッションで解消（本番 Render=3.10.4 を Shell で確認・ローカルを 3.10.4 に戻して三者一致）。次: [11.2] 残（範囲指定 `==` 固定・lockfile 整備）または [11.1]🔴（Snyk/Trivy スキャン）。
- 2026-06-03 **カテゴリ10（エラーハンドリング・情報漏洩）全7項目 完了。** 10.1🔴/10.3🟢 調査クローズ（500 trace ゼロ・フロントエラー技術詳細なし）。10.4/10.5🟡 hides・マッチ済み除外の `except: pass` を `logger.warning` に変更（アプリは止めない・`browse.py:131,304,317`）。10.6🟡 `should_count_quota` RPC 失敗に `logger.warning` 追加・フォールバック維持（`like.py:161`）・本番 quota 再ON時の再設計を IDEAS に束ね。10.7🟡 identity_hide 副作用は意図的設計・監視メモのみ。10.2🟡 本番送り（404/403 統一はオーナー判断）。py_compile OK・grep 確認済み。⚠️ 実機（DB 瞬断時の挙動・quota 再ON時）は [15.x] 繰り延べ。次: カテゴリ11（依存関係・サプライチェーン）🔴 から。
- 2026-06-03 **[9.3 積み残し] privacy-purge 重複EP 統合・カテゴリ9 完全クローズ。** `POST /privacy-purge/run` を削除し `POST /privacy-purge` 1本に統合（フロント呼び出し元ゼロ・APScheduler は直接関数呼び出し確認）。残 EP の details から endpoint キーを除去。py_compile OK・grep で1本残存/run 消滅確認。⚠️ 実機（/privacy-purge/run が 404）は [15.x] 繰り延べ。次: カテゴリ10（エラーハンドリング・情報漏洩）🔴 から。
- 2026-06-03 **カテゴリ9 完全クローズ（ログ・監査・観測性）全5項目 完了。** [9.1]🔴 Python logger 全件 grep で PII ゼロ確認。[9.2]🟡 [17.9] と同一案件を確認・ROADMAP 紐づけ。[9.3]🟡 管理者操作23EP棚卸し完了・3EP（`POST /privacy-purge`・`POST /privacy-purge/run`・`GET /student-id/{user_id}`）に log_admin_action を追加（admin.py:117/372/397）・details に PII 非含有確認。privacy-purge 二重EP（/privacy-purge と /privacy-purge/run）は実装同一・7.5 コピペ型の可能性あり・整理はオーナー判断待ち。[9.4]🟡 現状クローズ・append-only 運用ルールを HANDOFF §6 + IDEAS limited_admin に明記。[9.5]🟢 β受容。⚠️ 実機（admin で manual_privacy_purge → admin_logs 記録確認）は [15.x] 繰り延べ。次: カテゴリ10（エラーハンドリング・情報漏洩）🔴 から。
- 2026-06-03 **カテゴリ8 修正完了（Cro-co アプリ固有）。** [8.3]🔴 Option B（profile_image_path=approved 不変条件）実装: W1（初回アップ自動セット削除）・W2（削除時後継を approved 限定）・W3（set-main に 422 チェック追加）・W4（審査スキップ経路 `POST /upload-avatar` を削除・フロント呼び出し元 grep ゼロ確認）・R4（`GET /profiles/{id}` avatar_url に二重防御）。本人向け pending 表示は維持（`_fetch_photos` 全ステータス返す）。[8.11]🟢 `inventory.py:refund_like_stock` の `except: pass` を `logger.warning` に変更。[8.5]🟡 重複通報抑止は β 受容・IDEAS 登録済み。8.1/8.2/8.4/8.6/8.7/8.8/8.10 は修正不要でクローズ。⚠️ 実機（pending 写真が他人ビューに出ない/承認後表示/自分は見える/set-main 直叩き 422/upload-avatar 404）は [15.x] 繰り延べ。次: カテゴリ9（ログ・監査）🔴 から。
- 2026-06-03 **カテゴリ7 修正完了（AI 生成コード固有）。** [7.4] `safety.py:89` ブロック後 match 削除失敗の `except Exception: pass` を `logger.error` に変更。[7.13] `POST /api/push/test` に `5/min` rate limit 追加（正規 UI からの呼び出し確認済み・命名変更は不要）。[7.14] `browse.py` の `Response` 未使用 import 削除・`limiter.py` の `except Exception: pass` を `logger.debug` に変更（logger 未使用解消）。7.1〜7.3/7.5〜7.12 は調査クローズ（7.1〜7.12 は事後追認済み）。既知 dead code（`config.py:18` §5・`match.py:108`・`privacy_purge.py:81`）は据え置き。次: カテゴリ8（Cro-co 固有）🔴 から。
- 2026-06-03 **カテゴリ6 完全クローズ（レート制限・DoS・大量データ）全6項目 完了。** rate limit キーを IP → JWT sub（ユーザー単位）に変更（`limiter.py`）。画像アップロード2本に `20/min;100/hour` 二段制限追加。推薦・プロフィール詳細・unread-count 等6本に rate limit 追加（合計16本）。`hometowns` Query 件数/長さバリデーション追加（`browse.py`）。`BodySizeLimitMiddleware`（256KB・multipart 除外）を `main.py` に追加。XFF 偽装は意図的に非信頼継続。6.4（レース条件）/ 6.5（ファイル爆弾）は既存コードで保護済み確認・クローズ。6.6（WS）β 受容。⚠️ 実機（429 確認・ユーザー別カウント）は [15.x] E2E 繰り延べ。次: カテゴリ7（AI 固有・コードパターン）🔴 から。
- 2026-06-03 **カテゴリ5 完全クローズ（migration 048 dev/prod 適用済み）。** prod の規格外 student_number COUNT=0 を確認後に migration 048（student_number CHECK 制約）を適用成功。dev/prod 構造一致。カテゴリ5 全9項目完了: 🔴4 + 🟡3 + 🟢2。次: カテゴリ6（レート制限・DoS）🔴 から。
- 2026-06-03 **[5.5〜5.9]✅ + カテゴリ5（入力検証・インジェクション）全9項目 完了。** [5.5] Mass assignment: Pydantic allowlist + exclude_unset で特権フィールド注入不可。[5.6] `upload_student_id` の `year` Form に `ge=1,le=11` 追加・`browse` の `years` 要素範囲チェック追加（PATCH 側と統一）。[5.7] `real_name` max_length=100 / `student_number` max_length=20+英数字 pattern / list 系各要素 50 文字・件数上限を `ProfileUpdateRequest` に追加。Form 側も統一。migration 048（student_number DB CHECK・NULL 許容）作成。⚠️ 実機（student_number 記号混入・year=999 等の 422 確認）は [15.5] 繰り延べ。次: カテゴリ6（レート制限）🔴 から。
- 2026-06-03 **[5.4]✅ XSS 耐性 + カテゴリ5（入力検証・インジェクション）🔴4本 完了。** XSS 穴ゼロ確認: `dangerouslySetInnerHTML` / `innerHTML` grep ゼロ・全 `href` が固定 or `https://` URL・全テキストフィールドが JSX 自動エスケープ・メールは `html.escape()` 全適用・プッシュ通知は OS テキスト表示。CSP（Content-Security-Policy）は未設定（直接脅威なし）→ β後の独立タスクへ（IDEAS 登録済み）。コード変更なし。⚠️ 実機 `<script>` 投入は [15.4] 繰り延べ。次: [5.5]🟡（Mass assignment）。
- 2026-06-03 **[5.3]✅ SQLインジェクション耐性・構造的対策で堅牢化。** 古典的 SQLi（生SQL文字列連結）はコードベースに存在しない（supabase-py ビルダー全件確認）。唯一の指摘 `admin.py:406` PostgREST フィルタ注入（admin 専用）を構造的に修正: `.or_(f"name.ilike.{search_term}...")` を廃し、`_sanitize_admin_search` + カラム別 `.ilike()` 2クエリ + アプリ側 ID 和集合 + `max_length=100` に置換。py_compile OK・`.or_()` 生文字列ゼロを grep 確認。⚠️ 実機ペイロード直叩きは [15.3] 繰り延べ。次: [5.4]🔴（XSS）。
- 2026-06-03 **[5.2]🟡クローズ（🔴→格下げ）: prod は「Confirm email=ON」がエイリアス量産の蓋として機能・根本対処はβ後。** 阪大メール（Outlook 系）は `+` エイリアスを配送しない（オーナー実機確認）。prod は確認メールが届かないため `+alias` 登録の有効化は不可。email 正規化（`+` 除去・canonical_email UNIQUE）の根本対処は β後（IDEAS 登録済み）。⚠️ ★優先: prod の Resend で確認メールが実際に届くかが未検証 → [15.1] E2E の最初に確認必須（登録フロー死活問題）。次: [5.3]🔴（SQL injection）。
- 2026-06-03 **[5.1]✅ メアドドメイン制限 introspection で砦を実証。** DB トリガー `enforce_university_email_domain` が dev/prod 両環境に実在（`pg_trigger`: `tgenabled=O`）・SECURITY DEFINER+search_path=public ✅・照合条件 `ILIKE '%@ecs.osaka-u.ac.jp'` ロジック dev/prod 完全一致。フロントをバイパスした Supabase 直叩きにも BEFORE INSERT で確実に弾く。⚠️ 実機 signUp 直叩き（@gmail.com が HTTP 400 で弾かれるか curl で確認）は [15.1] 繰り延べ。次: [5.2]🔴（メアドエイリアス `+alias@` 抜け確認）。
- 2026-06-03 **[4.4〜4.9]✅ カテゴリ4（PII・プライバシー）全9項目 完了。** [4.4] `_strip_exif`（`profile.py:43`）fail-close 修正: `except Exception: return data`（EXIF付き元データ返却）→ `raise HTTPException(422)`（拒否）。フロント全経路が canvas→JPEG 再エンコードするため通常経路での GPS 残存なし。実機 EXIF 確認は [15.1]。[4.5] match.py:108 is_deleted / purge_deleted_user_messages が dead code であることを再確認（CASCADE 全消しが正式仕様・去就は IDEAS 実装時）。[4.6] PRIVACY_HASH_SALT はコード設計上安全（env読み・ハードコードなし・未設定時は hash=NULL の fail-safe）。**オーナー TODO: Render dev/prod で別値設定を目視確認**。[4.7] login_history 書き込み未実装を「意図的β後見送り」として確定。[4.8] データエクスポートはβ不要・APPI 義務なし。[4.9] 漏洩通報手順は本番前に法務書類と整備。次: カテゴリ5（入力検証・インジェクション）🔴 から。
- 2026-06-03 **[3.5〜3.8]✅ カテゴリ3（RLS・テーブル権限）全8項目 完了。migration 047 dev/prod 適用。** (A) prod のみ存在した手動 DDL 残骸 `create_profile_for_user`（未使用・SECURITY DEFINER・search_path 未固定）を DROP し dev/prod 構造を揃えた。(B) `detect_match`（SECURITY DEFINER トリガー関数）に `search_path=public` を固定（best practice 準拠）。(C) `like_quota` の service_role ポリシー重複（prod のみ2本）を1本化。[3.5] migration 044 prod 適用を pg_policies で確認（手動ポリシー4本消滅）。[3.6] user_inventory は service_role 1本パターンに完全準拠確認。[3.8] Storage dev/prod 設定一致・RLS ゼロは設計意図通り確認。⚠️ detect_match 機能実機確認は [15.1] 繰り延べ。次: カテゴリ4（PII・プライバシー）の残り🟡（4.4〜4.7）。
- 2026-06-03 **[2.10]✅ 同時セッション・異常検知・レート制限・コード対応なし。カテゴリ2（認証・認可）全10項目 完了。** ログイン系は Supabase Auth 直結（backend にエンドポイントなし）。Rate Limits をオーナーがダッシュボードで dev/prod 両方確認: Sign-ins 30/5min・Token verifications 30/5min・Token refreshes 150/5min・メール送信 prod=30/h, dev=2/h。緩すぎる設定なし・変更不要。同時セッション上限/異常検知/CAPTCHA はβ規模（50〜100人）では過剰。副次: dev メール rate limit 2/h → [15.1] E2E テスト時は一時引き上げが必要（ROADMAP [15.1] にコメント追記）。次: カテゴリ3〜の残り🟡（3.5〜3.7）。
- 2026-06-03 **[2.9]✅ セッション固定攻撃対策・修正不要**。未ログイン時トークンなし／`signInWithPassword` 毎回新規発行／Cookie 不使用 localStorage 保存／Refresh Token Rotation 実装済み（`main.tsx:52-55`）／backend 独自セッション機構なし（grep ゼロ件）の5点で固定攻撃の前提が構造的に不成立。Supabase 標準委譲で十分。カテゴリ2 🟢 2.9 クローズ。残: 2.10🟢。次: カテゴリ3〜 の残り🟡（3.5〜3.7）。
- 2026-06-03 **[2.8]✅ パスワードリセット/メアド変更の認証確認・修正不要**。パス変更/メアド変更は β 非実装（攻撃面なし）。リセットは Supabase 使い捨てリカバリトークンで保護。カテゴリ2 🟡 3本（2.6〜2.8）全完遂。次: カテゴリ3〜 の残り🟡 から（3.5〜3.7）。
- 2026-06-03 **[2.7]✅ JWT 検証は Supabase Auth 委譲・修正不要**。ローカルデコードゼロ・alg:none は GoTrue が拒否。次: [2.8]🟡。
- 2026-06-03 **[2.6]✅ 承認済み（approved）ガードをサーバー側に統一**。`auth/approved_user.py` に `get_approved_user` を新設し、browse/like/match 5エンドポイントに適用。WS も approved 以外を close 4003 に変更。pending/rejected ユーザーが API を直叩きして社交機能にアクセスする経路を閉鎖。⚠️ 実機確認は [15.1] E2E で。次: [2.7]🟡。
- 2026-06-03 **[4.3]✅ 本名・学籍番号の purge バッチ後状態を確認**。処理順序は安全（hash先生成→Storage削除→DB原子的UPDATE）。dev=正常purge 12件・事故行ゼロ。prod=正常purge 11件・hash NULL 1件（PII未入力テストユーザー・SALT問題なし・Step5クリーンアップで解消）・平文残存ゼロ。SALT推定設定済み（11件の有意hashが証拠・正式確認は[4.6]）。次: [4.4]🟡（写真EXIF削除確認）。
- 2026-06-02 **[4.2]✅クローズ（オーナー方針確定）: 退会時の CASCADE 全消しを「プライバシー優先の正式仕様」として確定**。dead code 2件（match.py:108 is_deleted / purge_deleted_user_messages）は IDEAS「ブロック時のデータ物理削除」実装時に去就を決める。HANDOFF dead code リスト・ARCHITECTURE・ROADMAP・IDEAS を全更新。次: [4.3]🔴。
- 2026-06-02 **[4.2]✅ 退会時の全データ削除を FK CASCADE 全件調査で確認**。Storage（profile-images/student-ids）は handler で明示物理削除。DB は auth.users 削除の CASCADE で全テーブル即時物理削除（matches/messages/likes/blocks/reports/hides/push_subscriptions/inquiries 等 全テーブル）。PII 漏洩ゼロを確認。設計乖離2件発見: ①`purge_deleted_user_messages()` が dead code（messages は CASCADE 即時削除）②match.py の is_deleted 表示が実退会では動作しない（→ [4.5] 申し送り）。migration 042 が dev/prod 両方で適用済みを確認（ARCHITECTURE.md の stale 記録を修正）。次: [4.3]🔴（本名・学籍番号の purge バッチ後状態）。
- 2026-06-02 **[4.1]✅ 学生証3日削除ロジック確認＋3問題修正・prod/dev 掃除完了**。dev/prod とも student-ids バケット空・reviewed_at=NULL=0件を確認。発見3件を全修正: ①reapply 孤立（profile.py:659）②upload 再アップ孤立（profile.py:329）③reviewed_at=NULL バッチ永久スキップ（migration 046 dev/prod 適用済み + privacy_purge.py フォールバック追加）。⚠️ 繰り延べ → [17.11]: reapply/再アップの HTTP 実機（JWT で実際に再アップして旧ファイルが消えることを確認）は β 実ユーザー受付前までに実施。現時点 dev/prod に実在学生証なし（テスト用フリー素材のみ・本番受付前）。次: [4.2]🔴・[4.3]🔴。
- 2026-06-02 **[3.4]✅ authenticated 直叩き静的＋実機実証 + カテゴリ3 🔴 4本 完遂**。dev: authenticated JWT（ユーザーX）で代表テーブル 6本 SELECT → 全て 403 / 他人（ユーザーY UUID）の profiles を直指定 SELECT/PATCH/DELETE → 全て 403（`42501 permission denied`・GRANT 層で拒否・RLS 未到達を本文で明示）。prod: DML GRANT ゼロ + ポリシー qual auth.uid() 縛り 9本を静的確認。anon(3.3) + authenticated(3.4) で両ロール実証済み。カテゴリ3 二層防衛（GRANT + RLS）が両環境で完成。次フェーズ: 3.5🟡〜3.8🟢。
- 2026-06-02 **[3.3]✅ anon 直叩き全テーブル拒否を実証 + dev GRANT ドリフトを migration 045 で是正**。prod: 全 16 テーブル × 4操作 = 401✅。dev: SELECT=200[] / UPDATE/DELETE=204 だったが RLS が実データを守っていた（実害なし）。根本原因は Supabase デフォルト GRANT による anon DML 全付与 → migration 045 で revoke し prod と二層防衛を統一。revoke 後 dev も全操作 401✅。カテゴリ3 致命🔴 第3項 完了。
- 2026-06-02 **[3.2]✅ 非 service_role RLS ポリシー4本 DROP（migration 044・案A・dev/prod 両方適用済み）**。`hide_messages_with_deleted_user`/`match participants can view messages`/`blocks_delete_own`/`reports_self` を DROP。GRANT 層調査で実際には dead code（anon/authenticated に DML なし・即時インシデントではなく latent 脆弱性）と判明。ラッチン構成解消のため DROP は正しい判断。ARCHITECTURE §4/§7/§8 + ROADMAP [3.2]✅/[3.5] 更新。カテゴリ3 致命🔴 第2項 完了。
- 2026-06-01 **[3.1]✅ 全テーブル RLS 有効確認（dev 17テーブル・prod 16テーブル・RLS 無効ゼロ・修正不要）**。Supabase MCP で両環境同時確認。副次: user_inventory が dev に存在（migration 043 適用済み・ARCHITECTURE.md §8 訂正）、prod の like_quota ポリシー重複・messages 手動ポリシー検出 → 3.2 スコープへ。カテゴリ3 致命🔴 第1項 完了。
→ 2026-05-25 〜 2026-05-31 の作業ログは `docs/archive/status_log_2026-05.md` に移設（2026-06-08）

---

## 次にやること（βリリースまでのフロー）

詳細・完了条件は docs/ROADMAP.md セクション8。

1. **機能・UI 完成（進行中）**
   - ✅ 身バレ防止を全経路サーバー側で適用（2026-05-27 完了。⚠️ dev 実機 curl 検証は未実施）
   - ✅ 探索タブ UI 改善（2026-05-27 完了・検索バー + 詳細検索 + 文理検索。⚠️ 実 HTTP 通し確認は未実施）
   - ✅ 非表示一覧ページ新設・ブロック一覧を別ページへ（2026-05-28 完了・`/settings/safety` タブ切替。⚠️ 実機ハードリロード確認は別途）
   - ✅ プロフィール見え方改善（2026-05-27 完了・さがすカード固定サイズ化＋詳細ページ3段構成＋学部学科の文理表示化＋メイン写真先頭。⚠️ 実 HTTP 未検証）
   - ✅ アプリ内お問い合わせ受け口（2026-05-28 完了・フェーズ1・テキスト版・`/settings/contact`・管理者メール通知 ON。⚠️ 実機ハードリロード確認は別途。画像添付はフェーズ2残）
   - ✅ アプリアイコン（2026-06-05 完了）
2. ✅ **β明記**: 2026-05-28 完了
3. **セキュリティチェック**: カテゴリ1〜11・13 完了（11.4/11.5 未着手・16.1 見送り確定）。カテゴリ15（手動ペネトレ）は 15.1/15.3/15.4/15.7 完了・15.2/15.5/15.6 未着手
4. **実機テスト + メール確認**: 進行中
   - ✅ Resend 確認メール（サインアップ・パスワードリセット）実受信（2026-06-10）
   - ✅ PWA インストール・Web Push 通知 実機確認（iOS・Android・PC）（2026-06-10）
   - 対象外: 通報受理通知メール（意図的に未実装・app内通報＋管理ダッシュボードで十分と確定）
   - ⬜ ブロック・通報・退会・BAN シナリオ E2E（記録付き）
   - ⬜ 各端末（iOS/Android/PC）主要動線確認
5. **法務最終 + テストデータ除去 + リリース**: PP 施行日 2026-06-05 確定済み。詳細は ROADMAP §4・§8 参照

→ 残タスクの詳細・完了条件は `docs/ROADMAP.md §8` を正とする。

---

## 既知の問題（ユーザーの判断が要りそうなもの）

- ✅ **migration 042 は dev/prod 両方で適用済み**（2026-06-02 Supabase MCP で確認）: 退会フロー `DELETE /api/profile/me` の CHECK 制約エラーは解消済み。seed v2 No.10 (deleted) の 400 も同様。実機退会テストは Step 4 で実施予定。
- ⚠️ **E2E テスト証跡が未整備**: ブロック・通報・退会・BAN は 2026-05-26 にオーナーが目視で動作確認済みだが記録がなく、自動テストも無い（回帰検知・再現性の担保が無い）
- ✅ **PP・利用規約の施行日 2026年6月5日 確定済み**（2026-06-05・R-5 完了・自前起草・法的妥当性の最終担保はオーナー責任）

### Step 3 完了時の一括ローテート対象（2026-05-29 時点）

> ✅ 2026-06-10 全件ローテート完了（下表2件＋D-2 prod anon key＋棚卸し枠の prod キー）。

| secret | 露出経路 | ローテート手順 |
|---|---|---|
| prod Supabase DB password | チャット履歴（2026-05-29 [1.4] 調査時に Claude Code が平文出力。git/公開成果物への混入なし） | Supabase prod → Settings → Database → Reset database password → 新値で Render prod の `DATABASE_URL` を更新（ローカル `backend/.env` は dev 切替予定のため prod 値は破棄） → ✅ 2026-06-10 実施済み |
| dev Supabase service_role key | チャット履歴（2026-05-31 [1.8] 調査時に grep が `backend/.env` をヒットし値を出力。git/公開成果物への混入なし） | Supabase dev → Settings → API → service_role キーを Reset → 新値で Render dev の `SUPABASE_SERVICE_ROLE_KEY` とローカル `backend/.env` を更新 → ✅ 2026-06-10 実施済み |

棚卸し枠（露出ではないが Step 3 総点検時に確認推奨）:
- ローカル `backend/.env` が prod 直結だった期間に扱われた prod service_role / anon キー（プロアクティブにローテートしてもよい） → ✅ 2026-06-10 ローテート済み
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
