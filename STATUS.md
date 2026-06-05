# Cro-co — 進捗ボード

最終更新日: 2026-06-05（最終手直しバッチ ①②③ 完了）

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
3. **セキュリティチェック**: 複数 AI レビュー + 手動ペネトレ + 自動スキャン（ROADMAP セクション7 を全項目消化）。カテゴリ1〜10 完了（8.5/10.2 はβ後/本番送り）。次: カテゴリ11（依存関係・サプライチェーン）🔴 から
4. **実機テスト + メール確認**: ブロック・通報・退会・BAN シナリオを記録付きで実施。Resend 経由のメール到達も実機確認
5. **法務最終 + テストデータ除去 + リリース**: PP・利用規約の施行日確定・Supabase 内のお試しデータを全削除 → βリリース

### 後送り（β後）
- migration 040 post-apply 検証（blocks ポリシーが3本に収束したか schema で確認）
- 最終オンライン時刻表示
- `login_history` の書き込み実装 or テーブル削除判断
- WebSocket token のログ露出対策（Render アクセスログ）→ ROADMAP [17.9] として本番前対応に正式登録（2026-05-31）

---

## 既知の問題（ユーザーの判断が要りそうなもの）

- ✅ **migration 042 は dev/prod 両方で適用済み**（2026-06-02 Supabase MCP で確認）: 退会フロー `DELETE /api/profile/me` の CHECK 制約エラーは解消済み。seed v2 No.10 (deleted) の 400 も同様。実機退会テストは Step 4 で実施予定。
- ⚠️ **E2E テスト証跡が未整備**: ブロック・通報・退会・BAN は 2026-05-26 にオーナーが目視で動作確認済みだが記録がなく、自動テストも無い（回帰検知・再現性の担保が無い）
- 📝 ~~PP・利用規約の施行日プレースホルダー「2026年●月●日」を弁護士確認後に埋める必要あり~~ → 2026-06-03 方針変更: 弁護士ルート途絶・自前起草に変更。施行日は起草確定時に確定。法的妥当性の最終担保はオーナー責任（ROADMAP §4 参照）。

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
