# Cro-co ロードマップ

最終更新日: 2026-06-22（Step 10/12 ✅・.env.local 分離 [x]・looking_for/login_history [x]・通報メール β後取り消し）

---

## 1. スケジュール

| マイルストーン | 時期 | 状態 |
|---|---|---|
| β版リリース | 2026年7月中 | 準備中（リリースフロー進行中） |
| 本番リリース・課金開始 | 2026年10月初旬 ※1 | 未着手 |
| 課金導入（フリーミアム） | 登録200人到達後 | 未着手 |
| 他大学展開検討開始 | 登録100人到達後 | 未着手 |

> ※1 LandingPage のフッターは「2026年10月1日」と明記、本ロードマップは「初旬」表記。β 完了後、LandingPage か本表のどちらかに統一すること。

---

## 2. 完了済みフェーズ（機能開発）

| フェーズ | 内容 | 状態 |
|---|---|---|
| Phase 1 | 認証（サインアップ・ログイン・メール確認） | ✅ 完了 |
| Phase 3b〜3d | 学生証アップロード・管理者ダッシュボード・承認/却下/BAN | ✅ 完了 |
| Phase 4a〜4c | プロフィール写真（写真審査）・ユーザー一覧・プロフィール詳細 | ✅ 完了 |
| Phase 5 | いいね・マッチ・チャット（WebSocket） | ✅ 完了 |
| Phase 6 | 足跡・通知タブ・いいね受信一覧 | ✅ 完了 |
| Phase 7 | 安全機能（ブロック・通報・非表示） | ✅ 完了 |
| Phase 8 | PWA + Web Push 通知（VAPID） | ✅ 完了 |
| Phase 9 | BeReal型いいね受信枠システム（バックエンド） | ✅ 完了 |
| Phase 10 | 問い合わせ機能（inquiries） | ✅ 完了 |
| Phase 11 | 管理者拡張（写真審査・ユーザー一覧・統計・ログ） | ✅ 完了 |
| Phase 12 | Stripe 課金 | 🔜 本番リリース前 |

---

## 3. セキュリティ修正ロードマップ（β前必須）

| Step | 内容 | 状態 |
|---|---|---|
| 0 | 現状把握（RLS 全テーブル確認・バック/フロント監査） | ✅ 完了 2026-05-24 |
| 1 | privacy_purge バッチ起動確認（毎日 03:00 JST・手動トリガー実装） | ✅ 完了 2026-05-25 |
| 2 | 本番/開発環境の分離（dev ブランチ・Supabase/Render/Vercel/VAPID 分離） | ✅ 完了 2026-05-25 |
| 3 | ProfileResponse の機密フィールド整理（student_id_image_path 削除） | ✅ 完了 2026-05-25 |
| 4 | ログアウト・退会時のクリーンアップ統一（clearSensitiveStorage） | ✅ 完了 2026-05-25 |
| 5 | blocks RLS ポリシー修正（038・blocker_id のみに制限） | ✅ 完了 2026-05-26（prod schema introspection で適用確認） |
| 6 | ブロック相手に 403（双方向チェック） | ✅ 完了 2026-05-25 |
| 7-a | EXIF 削除・署名付き URL ヘルパー | ✅ 完了 2026-05-25 |
| 7-b | profile-images の署名付き URL 全ルーター切替 | ✅ 完了 2026-05-25 |
| 7 | profile-images バケットの Public → Private 化 | ✅ 完了 2026-05-27（Supabase `storage.buckets` で `profile-images public=false` を確認） |
| 8 | その他細かい修正（/push/debug/all 削除・SUPPORT_EMAIL 修正 ほか） | ✅ 完了（WebSocket token ログ露出も 2026-06-06 B-11 で解消） |
| 9 | Resend メール認証 | ✅ 完了 2026-05-25 |
| 10 | 通報・安全機能の E2E 動作確認 | ✅ オーナー実機検証 2026-06-22 |
| 11 | 法務書類アプリ内実装（PP・利用規約） | ✅ 完了（施行日プレースホルダー） |
| 12 | βリリース前最終チェック | ✅ オーナー実機検証 2026-06-22 |

### Step 10（✅ オーナー実機検証 2026-06-22）
- [x] テストアカウント2つでブロック・通報・退会シナリオを完走（オーナー実機検証 2026-06-22）
- [x] 管理者ダッシュボードから BAN 操作が機能することを確認（オーナー実機検証 2026-06-22）

### Step 12（✅ オーナー実機検証 2026-06-22）
- [x] 下記「リリース前セキュリティチェックリスト」の全項目を照合（オーナー実機検証 2026-06-22）
- [x] デプロイ・ロールバック手順確認 / `ADMIN_EMAILS` 本番設定確認（オーナー実機検証 2026-06-22）

---

## 4. 法務対応（並行トラック）

### 完了
- [x] 弁護士相談用事前資料・PP/利用規約ドラフト v1（`docs/legal/`）
- [x] PP・利用規約の Markdown 化・アプリ内実装（Step 11）

### 未着手
- [ ] ~~弁護士面談・フィードバック反映~~ → 2026-06-03 方針転換により削除（下記参照）
- [x] PP・利用規約の施行日 2026年6月5日 確定（2026-06-05・自前起草）
- [x] `support@crocoweb.jp` の実メール設定確認（2026-06-07・ImprovMX 受信開通・MX: mx1/mx2.improvmx.com → オーナー Gmail 転送）
- [x] 電気通信事業届出 提出済み（2026-06-07・近畿総合通信局・電子申請・受理待ち）
- [ ] インターネット異性紹介事業届出（大阪府公安委員会）
- [ ] 特商法に基づく表記（課金開始時）

### 方針転換（2026-06-03）

外部弁護士との連絡が途絶（関係悪化）。以下の方針に変更する。旧記述（弁護士確認前提）は上記に取り消し線で残す。

- **PP/利用規約を自前起草に変更**。既存サービスを参考にする場合は構成・論点の参照に留め、条文のコピーは行わない（著作権リスク・自社実態との不整合回避）。
- **Cro-co の実態を必ず文面に反映する**: 阪大学部生限定（`@ecs.osaka-u.ac.jp`）・PII（学生証/本名/学籍番号）の取得と3日削除・退会時 CASCADE 全消し・ブロック解除不可・β版であること等、既存 md に確定済みの事実を起草の基礎とする。
- **必要に応じ後日専門家レビューを受けることは排除しない**。ただし現時点では外部依存なしで進める。
- **法的妥当性の最終担保はオーナー責任**。
- **カテゴリ12 への波及**:
  - 12.2（PP 最新法令準拠・利用規約必要条項）= 弁護士確認前提から自前起草に変更
  - 12.5（施行日プレースホルダー）= 起草確定時に埋める
  - 12.1（インターネット異性紹介事業届出）・12.3（18歳未満排除）= 文面起草とは独立した別対応事項のため残置

---

## 5. 中期タスク

### β前必須（Step 1 機能・UI 完成で消化）
- [x] 身バレ防止（学部・サークル除外）を全経路サーバー側で適用（2026-05-27 完了・`identity_hide.py` で6経路に反映・直リンク/いいね送信は 404。⚠️ dev 実機 curl 検証は未実施）
- [x] 非表示一覧ページ新設（2026-05-28 完了・`/settings/safety` 非表示タブ・各行に解除ボタン。`GET /api/safety/hides` 新設。⚠️ 実機ハードリロード確認は別途）
- [x] ブロック一覧を別ページへ分離（2026-05-28 完了・`/settings/safety` ブロックタブ・閲覧専用。設定画面は入口リンク2カード化。⚠️ 実機ハードリロード確認は別途）
- [x] プロフィール見え方改善（2026-05-27 完了・さがすカード固定サイズ化＋詳細ページ3段構成刷新＋学部学科の文理表示化＋メイン写真先頭並べ替え。文理化スコープはカード+詳細のみ＝オーナー決定。⚠️ 実 HTTP curl 未実施＝ローカル `.env` が prod を指すため。`tsc -b`+`vite build`+`py_compile` 成功・主要ロジックはオフライン検証済み）
- [x] アプリ内お問い合わせ受け口（2026-05-28 完了・フェーズ1・テキスト版・専用ページ `/settings/contact` + 履歴表示 + 管理者メール通知 ON・受付確認メール OFF・バッジなし。⚠️ 実機ハードリロード確認は別途・Vercel Preview SHA `67721f4`。画像添付はフェーズ2残）
- [x] 探索タブ UI 改善（2026-05-27 完了・検索バー + 詳細検索（学年複数/文理/出身地複数/並び替え）+ 文理検索。検索条件は全てサーバー側適用・履歴は localStorage のみ。⚠️ FastAPI の実 HTTP curl は未実施＝ローカルに dev service_role 鍵がなくバックエンドをローカル起動できず、dev Render は変更前コードを配信中。dev シードでの SQL レベル検証 + PostgREST クエリ実送信（HTTP 200）は完了）
- [x] GitHub Branch Protection 設定（2026-05-27 完了・新形式 Repository Rulesets。Require PR / approvals=0 / bypass 不可 / deletion 禁止 / force push 禁止。詳細 docs/DEPLOY.md）
- [x] ローカル `.env` が prod Supabase を指している問題の解消（ローカル開発で雑に検証すると本番に `profile_views` 等が書き込まれる）。`.env.local` を dev Supabase 向けに分離・`.env` は本番デプロイ専用にする・`.gitignore` 確認 ※2026-05-27 認識（Step 4 の実機テストを dev で行う前提として優先度高）（.env.local を dev 分離済み・2026-06-22 オーナー確認）

#### 探索タブ刷新から派生した別タスク（2026-05-27 追記・本タスクには未実装）
> 探索タブ刷新時に「条件としては文理化したが、本体実装が別途必要」な項目。β前にやるかオーナー判断。
- [x] **プロフィール表示の文理化**（2026-05-27 完了・オーナー判断でβ前実施）: プロフィール詳細を文理表示に変更（`science_humanities` 新設）。さがすカードは学部学科・文理とも非表示。**スコープはカード+詳細のみ**（マッチ一覧/足跡/いいね受信は学部学科表示のまま＝オーナー決定）。⚠️ 実 HTTP curl 未実施
- [ ] **自己紹介（bio）変更時の再審査フロー**: 写真と同様に pending/approved/rejected 管理にする（現状 bio はノーチェックで即反映）。**β後送りで確定（2026-06-10）**（β は身内規模＋通報ベースで対応）
- [ ] **interests カラムの廃止**: 自由入力でリスクがあるため自己紹介に集約する。**β温存確定（2026-06-10）**（UI 非表示・DB 温存の現状維持。最終形はβ後に決定）
- [x] **looking_for カラムの DB 削除**: **2026-06-22 migration 055 で DROP 済み**（コード参照除去後・dev 適用済み・prod はオーナー手動）

### β前必須（別 step で消化）
- [x] アプリアイコン作成（2026-06-05 完了・Croco マーク mint `#A8F0D1` 背景 + 黒シルエット・favicon/PWA/ホーム追加アイコン統一）

### 完了済み
- [x] dev に storage バケット作成（profile-images / student-ids を migration 041 で dev/prod 両方に作成・prod 同設定 Private/5MB/jpeg+png・✅ 完了 2026-05-27。dev での service_role 疎通 HTTP を `scripts/storage_smoke_dev.ps1` で検証済み・upload=200 download=200 delete=200）
- [x] `profile-images` バケット Private 化（✅ 完了 2026-05-27）
- [x] BeReal型受信枠のフロントエンド UI 実装（✅ 完了 2026-05-27）
- [x] ランディングページ全面改修（✅ 完了 2026-05-27 確認）
- [x] PC 版タブカクつき修正（✅ 完了 2026-05-27 確認）

### β後送り（本番リリースまでに対応）
- [ ] Phase 12: Stripe 課金機能実装
- [ ] 最終オンライン時刻表示
- [x] `login_history` の書き込み実装 or テーブル削除の判断（2026-06-22 migration 054 で DROP・コード参照ゼロ確認済み・dev 適用済み・prod はオーナー手動）
- [x] WebSocket token のログ露出対策（2026-06-06・B-11 で Sec-WebSocket-Protocol へ移行・[17.9] 解消）
- [ ] 入力サニタイズ徹底（XSS・SQLi 網羅確認）※β前のセキュリティチェックでも触る
- [ ] 管理者ダッシュボード機能拡張 / 余分なコードのリファクタ
- ~~通報受理通知メール拡張（Resend 経由）~~（2026-06-10 不実装確定・app 内通報＋管理ダッシュボードで十分）
- [ ] 軽い占い表示（生年月日からの星座のみ・`docs/IDEAS.md` 参照）

---

## 6. 課金・他大学展開戦略

### 課金導入タイミング
- β中・本番初期は完全無料を維持
- **β中の課金は炎上リスクが高いため絶対にやらない**
- 登録200人到達でフリーミアム導入を検討。完全有料化はしない

### 課金候補（フリーミアム導入時）
| 機能 | モデル | 優先度 |
|---|---|---|
| 男性のメッセージ送信無制限化 | Pairs モデル | 高 |
| いいね枠拡張（無料5件/日 → 課金20件/日） | Freemium | 中 |
| 足跡全件表示（無料は最新5件） | Freemium | 中 |
| プロフィール上位表示 | 法的要件確認後 | 低 |

### 他大学展開タイミング
- 阪大で**登録100人到達後**に検討開始（候補: 神戸大・関西大）
- 技術準備: ドメインバリデーション汎用化、大学別 namespace 設計

### 運営コスト削減方針
- Supabase Free（500MB 以下）/ Render Free（GAS ping）/ Resend 無料枠（月3,000通）
- **月コスト目標: 1,000円以下**

---

## 7. リリース前セキュリティチェックリスト

> UTopia 事案（2026年4月）を教訓とし、本番リリース前にあらゆる手段でセキュリティを検証する。

### 実施時期
- βリリース 2週間前 / 本番リリース 1ヶ月前

### 進め方の運用ルール
1. **1項目ずつ消化**。複数並行しない（証跡が混ざる）
2. 各項目で「**調査結果報告 → オーナー承認 → 修正があれば実装 → 再調査 → ✅**」のサイクル
3. ✅ 後は該当行に **完了日 + 対応内容 + 確認方法** を追記（消さず追記）
4. 致命🔴 を全消化するまで重大🟡 に進まない（順序逆転禁止）
5. 各カテゴリ完了で HANDOFF.md にカテゴリ単位の総括を追記

### 凡例
- 🔴 致命: 漏れると個人情報流出・サービス停止級の即時インシデント
- 🟡 重大: 漏れると β を止める必要がある
- 🟢 重要: β中は許容しうるが本番までに必須
- 🔵 推奨: β後の改善余地

---

> カテゴリ 1〜10 の詳細テーブルは `docs/archive/security_checklist_closed_2026-06.md` に移設（2026-06-08）。

### カテゴリ 1〜10 完了サマリー（2026-06-04 全項目完了）

| カテゴリ | 対象 | 状態 |
|---|---|---|
| 1 | インフラ・シークレット検証 | ✅ 全10項目完了（2026-05-29〜06-01）。[1.9][1.10] は本番前対応としてカテゴリ17 に登録 |
| 2 | 認証・認可 | ✅ 全10項目完了（2026-05-31〜06-03）。[2.10] WS dev rate limit はカテゴリ15 繰り延べ |
| 3 | RLS・DB 直叩き防止 | ✅ 全8項目完了（2026-06-01〜06-03）。migration 044 で非 service_role ポリシー4本 DROP。migration 045 で dev GRANT ドリフト是正 |
| 4 | 退会・PII 削除 | ✅ 全7項目完了（2026-06-02〜06-03）。[4.5] dead code は IDEAS 束ね。[4.6][4.7] β後見送り確定 |
| 5 | 入力バリデーション | ✅ 全10項目完了（2026-06-03）。interests DB CHECK + Pydantic 二層（migration 048）・LIKE 検索エスケープ。[5.2] prod Resend 実機確認は Step 4 繰り延べ |
| 6 | レート制限・DoS | ✅ 全5項目完了（2026-06-03）。Slowapi 全 POST・upload 二段（20/min;100/hour）。CSP/HTTPS は本番 Step 5 対応 |
| 7 | AI 生成コード固有 | ✅ 全3項目完了（2026-06-03）。危険関数・型アノテーション確認 |
| 8 | Cro-co 固有セキュリティ | ✅ 全5項目完了（2026-06-03〜06-04）。ブロック4層・身バレ全6経路・service_role 混入ゼロ確認 |
| 9 | 通知・WebSocket | ✅ 全5項目完了（2026-06-03〜06-04）。VAPID・WS ブロック close(1008)・重複通知防止 |
| 10 | エラーハンドリング・情報漏洩 | ✅ 全7項目完了（2026-06-03）。[10.2] 404/403 統一はβ後/本番送り。fail-close（セキュリティ制御）/ fail-open（UX フィルタ）設計原則確立 |


### カテゴリ 11: 依存関係・サプライチェーン

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 11.1 | 🔴 | Snyk / Trivy で backend / frontend の依存関係を脆弱性スキャン | 🟡 backend: pip-audit 2.10.0 で実施済み（2026-06-03）。requirements.txt ベース: **クリーン（0件）**。.venv 全体（推移的依存含む）: **9件/4パッケージ検出**。✅ A: `PyJWT==2.13.0` を requirements.txt に明示追加（2026-06-03）・ローカル 2.12.1→2.13.0 更新・requirements ベース再スキャンでクリーン確認。✅ B: `starlette==1.2.1` を requirements.txt に明示追加（2026-06-03）。本番実値と一致・PYSEC-2026-161 修正済み（1.0.1 と同一 `_HOST_RE.fullmatch` コードを wheel 直接比較で確認）・ローカル 1.0.0→1.2.1 更新・requirements ベース再スキャンでクリーン確認。✅ C: idna 3.13（CVE-2026-45409）は到達経路なし・supabase 移行時連動で受容。✅ D: pip 25.3 ×3件はランタイム無影響・受容。**[11.1] backend A/B/C/D 全クローズ**。✅ frontend: npm audit 実施済み（2026-06-03）。**moderate 2件**（critical/high ゼロ）。① `qs@6.15.1`（GHSA-q8mj-m7cp-5q26・DoS）: `shadcn`→`@modelcontextprotocol/sdk`→`express`→`qs` の CLI ツール専用チェーン。shadcn は package.json の dependencies に記載されているが CLI コードジェネレーターでありアプリコードは import しない。Vite バンドルに入らない。② `ws@8.20.0`（GHSA-58qx-3vcg-4xpx・メモリ露出）: `@supabase/supabase-js`→`@supabase/realtime-js`→`ws`。`websocket-factory.js` ソース確認で「`typeof WebSocket !== 'undefined'`（ブラウザ）なら native WebSocket を使用・ws は require されない」ことを確認。CVE はサーバー側の実装にのみ適用されブラウザ用途では到達不能。**✅ 両件受容確定（2026-06-03）**: qs は本番バンドル外・ws はブラウザで ws 未使用かつ CVE がサーバー専用。**[11.1] backend(A/B 修正・C/D 受容)＋frontend(moderate 2件受容) で全クローズ。** ⚠️ 再評価トリガー（本番リリース前）: `shadcn` または `@supabase/supabase-js` を更新した際、および本番リリース前に `npm audit` を再実行し、qs@6.15.1 / ws@8.20.0 が依存ツリーから外れたか修正版に上がったかを確認すること |
| 11.2 | 🟡 | 依存パッケージのバージョン固定（requirements.txt の `==` / lockfile commit） | 🟡 調査完了・移行は本番リリース前に実施（β は警告許容・黙殺しない）。✅ APScheduler ローカル .venv ドリフト解消（本番 Render=3.10.4 を Shell で確認・ローカルを 3.10.4 に戻して三者一致・2026-06-03）。**【訂正 2026-06-03】** 旧記述「`supabase>=2.12` への移行検討」は誤り。supabase 2.12〜2.18 は依然 gotrue に依存しており警告は消えない。実際の切替点は supabase==2.20.0（`supabase_auth` を初採用）。推奨移行先: `supabase==2.22.4`（monorepo バージョン統一済み・2.30.1 は yarl 等の新依存が増えるため段階的に）。移行内容: `from gotrue.types import User` → `from supabase_auth.types import User` を13ファイルで書き換え（うち §5 の `auth/dependencies.py` / `auth/active_user.py` を含む＝§5 限定解除のオーナー承認が必要）。連鎖で postgrest/storage3/realtime もメジャーバンプ（postgrest 0.19→2.22）するため移行後に dev で起動・認証・主要 API の動作確認が必須。User の使用フィールドは `.id` / `.email` のみで `supabase_auth.types.User` と完全一致しており、移行自体は低リスク。✅ 直接依存 6 個を本番実値で == 固定（2026-06-03）: `Pillow==12.2.0` / `pydantic-settings==2.14.1` / `python-multipart==0.0.30` / `resend==2.30.1` / `slowapi==0.1.9` / `pywebpush==2.3.0`。ローカル .venv も本番実値に同期（pydantic-settings 2.14.0→2.14.1・python-multipart 0.0.27→0.0.30）。✅ **supabase SDK 移行完了（2026-06-07・dev/prod 両方）**: `supabase==2.22.4` に更新・`gotrue` 消滅・13 ファイル置換完了（HANDOFF §5 参照）。残: 推移的依存まで含めた完全 lockfile 化（pip-compile 等）は本番前 |
| 11.3 | 🟡 | semgrep で SAST | ✅ 2026-06-03。semgrep CE 1.164.0（uv tool・ログイン不要）で backend（backend/app・p/default＋python＋security-audit＋owasp-top-ten＋secrets の5パック 325ルール）＋ frontend（frontend/src・上記5パック＋javascript＋typescript＋react の7パック 215ルール）をスキャン。両者とも **findings 0件**。--metrics off・--no-git-ignore（git 未追跡ファイルも対象化）・PYTHONUTF8=1 で実施。エンジン健全性は canary 6パターンで実機検証（eval/subprocess shell=True/Stripe key/MD5/pickle の5/5検出・os.system 文字列結合と AWS 汎用キー形式の2パターンは CE 未カバーと判明）＝0件は設定不良でなく該当パターン不在を確認。semgrep 自動結果が [5.4] 手動 grep と完全一致（dangerouslySetInnerHTML / href javascript: / innerHTML すべて 0）。**CE 既知の網の目と対応状況**: (a) os.system＋文字列結合のコマンド注入＝[5.8] で subprocess/eval 等 grep ゼロ確認済み (b) supabase-py PostgREST フィルタ注入＝[5.3] で .or_() 生文字列を構造的に廃止済み (c) AWS 汎用キー形式の直書き＝カテゴリ1・[5.4] で env 読み徹底済み＋[1.10] gitleaks・[11.5] GitGuardian でカバー予定。CE の盲点はいずれも別手段で対応済み。**既知の部分未解析 1件**: frontend/src/pages/LandingPage.tsx:561 で JSX 内 & を含む静的日本語テキストが PartialParsing（warn）。コード実行・入力経路なし・実害なし（0件とは別事象として記録）。 |
| 11.4 | 🟡 | OWASP ZAP で DAST | ☐ |
| 11.5 | 🟡 | GitGuardian で commit 履歴の secret 漏洩スキャン | ☐ |
| 11.6 | 🟡 | RLS/GRANT ドリフト検知の自動化（service_role 以外のポリシー・anon 向け DML GRANT の逸脱を CI で検出し再発防止。3.3 で発見した dev の GRANT ドリフトが監視対象の典型例） | ✅ 2026-06-04（Option A: オンデマンド・スクリプトで実装。scripts/check_rls_drift.ps1 + scripts/_rls_query.py（pg8000 直結）+ scripts/rls_allowlist.json（dev introspection 実値ベース許可リスト・全26ポリシー網羅）。検査7項目: (i) anon/authenticated/public への DML GRANT、(ii) 許可リスト外の非 service_role ポリシー、(iii) 許可リスト外 PERMISSIVE 非 service_role ポリシー、(iv) SECURITY DEFINER の search_path 未固定、(v) RLS 無効テーブル、＋消失検知（service_role ALL 欠如・SECURITY DEFINER 関数欠如）。確認結果（2026-06-04・オーナー実機・テザリング回線で 5432 疎通）: dev 実走 CLEAN・prod 実走 CLEAN（prod は読み取りのみ）・合成テスト（__drift_test__ ポリシー: profile_views・authenticated・SELECT・PERMISSIVE）追加で1件 DRIFT 検知→DROP で CLEAN 復帰・接続失敗時 ERROR（exit 2）停止。接続要件申し送り: Direct(5432)/Transaction pooler(6543) は IPv6 経路。IPv4 のみ回線（特定 Wi-Fi 等）からは到達不可。実行は IPv4 で 5432 が通る回線（テザリング等）から Session pooler URI（`postgres.<project_ref>@...pooler.supabase.com:5432`）を使う。将来 CI 化（Option B）申し送り: .github/workflows/ は現状なし。CI 整備時に本スクリプトを workflow へ移植・DB 接続文字列は GitHub Secrets 管理（接続情報を CI に置く＝セキュリティ変更につき単独 PR・レビュー必須）） |

> **[11.6] 詳細（着手前メモ・歴史的記録）**
> - 背景: [3.2] で非 service_role ポリシー4本が GRANT 層のみで守られる latent 脆弱性になっていたことを人手棚卸しで発見。CLAUDE.md §4「DB ポリシー（RLS）の鉄則」をルール化したが、未来の AI・人が守るとは限らないため機械的検知が要る。
> - ゴール: 「各 public テーブルが service_role 全許可 1本のみ / anon・authenticated への DML GRANT（SELECT/INSERT/UPDATE/DELETE）なし」からの逸脱を自動検知して CI を失敗させる。
> - 検討事項（着手時に詰める）: (1) 期待状態スナップショット（許可リスト）を repo に置き diff を取る (2) 実行場所: CI の Supabase MCP introspection / pg dump 相当 / migration との比較 (3) dev・prod 両方を対象にするか (4) 例外（blocks_select_own 等、残置理由あり）を許可リストに追記したら通す仕組み (5) PERMISSIVE ポリシーを自動検出して警告
> - 判断トリガー: カテゴリ3 全項目完了後・本番リリース前。コスト中。独立 PR で設計。

### カテゴリ 12: 法的チェック

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 12.1 | 🔴 | インターネット異性紹介事業届出（大阪府公安委員会） | ☐ |
| 12.2 | 🔴 | PP が最新法令に準拠・利用規約に必要条項（~~弁護士確認~~ → 2026-06-03 自前起草に変更。§4「方針転換」参照） | ☐（オーナー作業中・2026-06-10） |
| 12.3 | 🟡 | 18歳未満排除が frontend + 自己申告で実装 | 🔵 対応済み（⚠️ 実機未検証）: 法第10条の「明示」義務 → LandingPage（HERO + フッター）と SignupPage（フォーム内）に「18歳未満は利用できません」を明示済み。自己申告チェックボックス「18歳以上であることを確認しました（必須）」を登録フォームに追加（2026-06-10 実装・`SignupPage.tsx`）。未チェック時はボタン無効化＋送信バリデーション2重ガード。文言はオーナー確認待ち（TODO コメントあり）。backend 生年月日ガードは本番前の任意強化に降格（birth_date 収集済みのため後付け可能）。多層防御の根拠: 学籍メール＋学生証審査の組み合わせで実質的な排除は担保。届出・閲覧防止措置は 12.1 の管轄 |
| 12.4 | 🟡 | 個人情報保護委員会への漏洩時通報手順を文書化 | ☐ |
| 12.5 | 🟡 | PP・利用規約の施行日プレースホルダーを埋める | ✅ 2026-06-05 確定（2026年6月5日・自前起草） |

### カテゴリ 13: AI レビュー

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 13.1 | 🟡 | Claude Opus / Gemini Pro / GPT-5 による全コードレビュー | ✅ 2026-06-10 完了 |
| 13.2 | 🟡 | 3つの AI で指摘が一致した箇所を優先対応 | ✅ 2026-06-10 完了 |

### カテゴリ 14: Deep Research

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 14.1 | 🟡 | 「マッチングアプリ 脆弱性」「Supabase 落とし穴」で Web 調査 | ☐ |
| 14.2 | 🟡 | OWASP Mobile Top 10 / OWASP API Security Top 10 全項目チェック | ☐ |

### カテゴリ 15: 手動ペネトレ E2E シナリオ

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 15.1 | 🔴 | 認証バイパス全エンドポイント直叩き（2.2 の E2E 再実施） | ✅ 2026-06-04 実機確認済み（下記注記） |
<!-- ✅ [15.1] 2026-06-04 dev 実機確認結果（Cro-co_実機テスト計画_Step4.md 参照）:
  1-1: JWT なしで /api/profile/me → 401 ✅
  1-2: 有効 approved JWT → 200 ✅
  1-3a: 署名改竄 JWT → 401 ✅
  1-3b: alg:none JWT → 401 ✅
  1-4: @gmail.com signup → 500（DB trigger 23514・signup 拒否確認）⚠️ HTTP 500（期待 400）は Supabase trigger exception 挙動・実質保護あり
  1-5: 大文字メール → 小文字に正規化（200 + lowercase email）・重複は rate limit 429 ✅
  1-6: pending JWT で /api/profiles・/api/likes/・/api/matches/ → 403 ✅（get_approved_user ガード動作）
  1-6d: pending JWT で WS → HTTP 403（upgrade 段階拒否）⚠️ close(4003) before accept() → Starlette が HTTP 403 を返す実装差異（保護は同等）
  1-7: banned JWT で 4EP → 403 ✅ / deleted JWT で 4EP → 403 ✅
  1-7c/d: banned/deleted WS → HTTP 403 ✅（同上）
  1-8: パスワードリセット → スキップ（dev Resend 未連携）→ フェーズ7繰り延べ
  fail-close（1-3/1-6/1-7）は全件 OK。セキュリティ後退なし。
-->
<!-- ⚠️ [2.10] 調査時判明: dev の Supabase メール送信 rate limit は 2/h（prod は 30/h）。パスワードリセット・確認メールの E2E 実機テストを dev で連続実施する場合は Supabase ダッシュボードで一時的に上限を引き上げてから実施すること。テスト完了後は 2/h に戻す。 -->
<!-- ⚠️ [5.2] ★最優先: prod の Resend 経由確認メールが実際にユーザーへ届くかが未検証。届かない場合は正規ユーザーも登録完了できない登録フロー死活問題。E2E の最初に実際に signup を実施して確認メールが受信箱に届くことを確認すること。 -->
<!-- ⚠️ [15.1 オーナー決定 2026-06-03] Resend prod の確認メール実機確認は Step 5 クリーンアップ時にまとめて実施する（理由: 現管理者アカウントの削除・再作成が必要で、テストデータ全削除のタイミングと同時にやるのが効率的）。それまでは [5.2] の Confirm email=ON を prod の蓋として運用。 -->
| 15.2 | 🔴 | IDOR 全テーブル（2.3 の E2E 再実施）※ authenticated 直叩き IDOR は [3.4] で dev 実機実証済み・本項では prod 含む全操作再確認 | ☐ |
| 15.3 | 🟡 | SQL injection 全入力（5.3 の E2E 再実施） | ✅ 2026-06-04 実機確認済み（下記注記） |
| 15.4 | 🟡 | XSS 全入力（5.4 の E2E 再実施） | ✅ 2026-06-04 backend 実機確認済み（⚠️ ブラウザ目視は繰り延べ） |
<!-- ✅ [15.3] 2026-06-04 SQLi 実機確認（Cro-co_実機テスト計画_Step4.md フェーズ2-1）:
  PATCH name/bio に ' OR '1'='1-- → リテラル保存（HTTP 200・SQL実行なし）
  bio_keyword=' OR '1'='1 → 0件（_sanitize_bio_keyword + ILIKE パラメータ化）
  bio_keyword=% OR 1=1 → 0件（% エスケープ確認）
  hometowns=UNION SELECT... → 0件（.in_() パラメータ化）
  ※ hometowns[]= （[]付き） は FastAPI が認識しない構文でフィルタ無効化（SQLi ではなく UX バグ）
  ※ admin 検索 SQLi ([5.3] で構造的修正済み) の実機テストは admin 資格情報未取得のためスキップ→繰り延べ
-->
<!-- ✅ [15.4] 2026-06-04 XSS 実機確認（backend）:
  PATCH name/bio に <script>alert(1)</script>/<img onerror=...> → HTTP 200・リテラル保存
  ブラウザで実行されないことの目視確認（dangerouslySetInnerHTML ゼロ・React auto-escape）は繰り延べ [15.4b]
-->
| 15.5 | 🟡 | CSRF: 別オリジンからの POST/PATCH/DELETE | ☐ |
| 15.6 | 🟡 | レースコンディション攻撃（6.4 の E2E 再実施） | ☐ |
| 15.7 | 🟡 | 大量データ攻撃（6.3 の E2E 再実施） | ✅ 2026-06-04 実機確認済み（下記注記） |
<!-- ✅ [15.7] 2026-06-04 rate limit・DoS 実機確認（Cro-co_実機テスト計画_Step4.md フェーズ3）:
  push/test 5/min: req1-5→200, req6→429 ✅
  同一IP・別JWT (mf1 limit 到達後 mf2) → mf2=200（JWT sub 単位カウント独立）✅
  300KB JSON body (Content-Length付き) → 413 ✅ / 255KB → 422 (Pydantic, not 413) ✅
  multipart/form-data → 201 (middleware 除外) ✅
  report 10/min: req1-10→400, req11→429 ✅
  観察: Pydantic 422 (invalid body) はカウンター非加算（実害なし・β受容）
  観察: chunked 転送は Content-Length なしで middleware スルー（ROADMAP [6.3] 本番前対応として既知）
-->
<!-- ✅ [フェーズ4 E2E] 2026-06-04 コア機能（Cro-co_実機テスト計画_Step4.md フェーズ4）:
  4-1: ブロック相手の /api/profiles/{id} 直叩き → 403（中立文言）✅
  4-2: 身バレON相手の /api/profiles/{id} 直叩き → 404 ✅ / like 送信 → 404 ✅ / recommended 除外 ✅
  4-3: pending 写真が他ユーザー向け GET /api/profiles/{id} の photos に出ない ✅
  4-4: pending 写真の set-main 直叩き → 422 ✅
  4-5: POST /api/profile/upload-avatar → 404 ✅（エンドポイント削除確認）
  4-6: mm2↔mm6 相互いいね → detect_match トリガー発火・matches 行生成 ✅
  4-7: ff6→ff3 ブロック / ff3→(report) / ff6→(withdrawal) / ff3→(BAN) シナリオ完走 ✅
  4-8: admin_logs に ban_user・manual_privacy_purge が記録 ✅
  4-9: DB 障害時 hides/match 除外 fail-open（logger.warning 追加・browse.py:131/304/317）→ コード確認で記録（障害注入は dev 環境で困難・本番前繰り延べ）
  4-10: inventory refund 失敗シナリオ → コード確認で記録（障害注入困難・本番前繰り延べ）
  4-11: 退会後 JWT → 401（auth.users 完全削除で JWT 無効化・get_active_user 403 には到達しない）✅ docs/ARCHITECTURE.md §認証の2層 訂正済み（2026-06-05）
  4-12: BAN 即時 403（get_active_user で status='banned' をブロック）✅
  4-13: EXIF GPS 消去（_strip_exif が exif=b"" を Pillow JPEG 保存時に渡す・実機 EXIF Viewer で GPS なし確認）✅
  4-14: privacy-purge admin_logs → manual_privacy_purge と ban_user が admin_logs に記録 ✅
  4-15a: browse hometown フィルタ: hometowns=東京 形式で正常フィルタ ✅
  4-15b: フロント axios 送信形式（2026-06-05 grep 確認）: BrowsePage.tsx:222 params.append('hometowns',h) → hometowns=東京&hometowns=大阪 形式（[] なし）→ FastAPI list[str] Query と一致 ✅ → 4-15 全クローズ
-->
<!-- ✅ [フェーズ5] 2026-06-05 GA・18禁・PP（Cro-co_実機テスト計画_Step4.md フェーズ5）:
  5-1: GA OFF（dev は PROD=false + consent 未設定=false で initGA() がガード済み）→ gtag.js スクリプト注入ゼロ・googletagmanager へのリクエスト発生経路なし ✅ コード確認（analytics.ts:39-41）
  5-2: prod 相当環境で トグル ON → page_view 経路確認: dev は PROD=false のため実送信不可 → フェーズ7（prod 本番デプロイ後）に明示繰り延べ
  5-3: ファネル4イベント発火確認: 同上 → フェーズ7 繰り延べ
  5-4: 同意ON直後の sign_up 取りこぼし: setConsent() が initGA() を同期呼び出し → initialized=true・window.dataLayer 設定 → 直後 trackEvent('sign_up') が window.dataLayer.push → GA スクリプトロード後に処理 → 取りこぼしなし ✅ コード経路確認（SignupPage.tsx:54-55）
  5-5: 18歳未満利用禁止表示: LandingPage.tsx HERO 直下（ShieldAlert アイコン付き）+ フッター行・SignupPage.tsx フォーム内 terms 直上に明示 ✅ コード確認（LandingPage.tsx:335,735 / SignupPage.tsx:126）⚠️ ブラウザ目視はオーナー確認
  5-6: /privacy（PrivacyPolicyPage.tsx）確認: §10(2) 外部送信規律型（送信情報・送信先・目的・オプトアウトURL）あり ✅ / §2(4) ログイン履歴なし ✅ / §12(1) ログイン履歴なし ✅ / SignupPage トグル文言「閲覧ページ・IP・端末情報などが Google（Google Analytics）に送信」明記 ✅ ⚠️ docx 目視一致確認はオーナー TODO
-->

### カテゴリ 16: 第三者監査

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 16.1 | 🟢 | 信頼できるエンジニアに有償でコードレビュー依頼 | ❌ 見送り（2026-06-10 オーナー判断・実施しない） |
| 16.2 | 🟢 | 大学のセキュリティ研究室への監査依頼を検討 | ☐ |

### カテゴリ 17: 本番デプロイ前の最終確認

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 17.1 | 🔴 | β明記が本番でも表示される（ランディング + ようこそ） | ☐ |
| 17.2 | 🔴 | prod の `LIKE_QUOTA_ENABLED` が未設定（OFF が前提） | ☐（方針確定: β=OFF・2026-06-10。prod env 未設定の最終目視は本番デプロイ時） |
| 17.3 | 🔴 | prod に migration 042 / 043 が適用済み | ✅ 042=2026-06-02・043=2026-06-06 適用済み |
| 17.4 | 🟡 | prod に Supabase テストデータが残っていない | ✅ 2026-06-10 prod テストデータ全削除済み（ユーザー・学生証・テスト行） |
| 17.5 | 🟡 | prod の Custom SMTP（Resend）が機能している | ✅ 2026-06-10 Resend サインアップ確認メール・パスワードリセットメール実受信済み |
| 17.6 | 🟡 | DNS 伝播確認・HTTPS 証明書発行確認 | ✅ 2026-06-10 DNS 伝播確認・HTTPS 証明書発行確認済み |
| 17.7 | 🟡 | CSP / セキュリティヘッダーが prod レスポンスに付いている | ✅ 2026-06-10 APP_ENV=production 反映後の prod レスポンス実確認済み（HSTS 付与・/docs 404）。フル CSP（script-src 等）は post-β 据え置き |
| 17.8 | 🟢 | バックアップ取得手順を明文化 | ☐ |
| 17.9 | 🟡 | WebSocket 認証トークンを URL クエリから外す（アクセスログ JWT 露出対策・案④接続後メッセージ / 案⑤Sec-WebSocket-Protocol / 案⑥短命 ticket） | ✅ 2026-06-06・B-11・案⑤ Sec-WebSocket-Protocol 採用・dev 検証 CLEAN |
| 17.10 | 🟢 | AuthContext.tsx の console.log メアド出力を本番ビルドで抑制 or 削除（§5 触らないファイルのため要解除判断） | ✅ 2026-06-06・B-9・2行削除 |
| 17.11 | 🟡 | [4.1] 繰り延べ: reapply / 再アップ時の旧学生証削除（`profile.py:659/329`）を HTTP 実機確認（JWT でログイン→再アップ→旧ファイルが Storage から消えることを service_role で確認）。β 実ユーザーが学生証を再アップする前までに実施 | ☐ |
| 17.12 | 🟡 | prod に migration 051 適用済み + backfill 完了（BAN 後再登録ブロック · identity_block_hashes） | ✅ 2026-06-19 dev 2026-06-18 / prod 2026-06-19 適用・Python backfill 完了。dev: approved 29/29・banned 4/4 permanent・prod: approved 3/3 を identity_block_hashes で確認。profiles.*_hash 列の DROP は後続クリーンアップとして IDEAS.md に残置（HANDOFF §6 2026-06-19 参照） |

---

### 統計
- 合計 94 項目（致命🔴 24 / 重大🟡 44 / 重要🟢 24 / 推奨🔵 0）
- カテゴリ 7（AI 固有）と 8（Cro-co 固有）が新規の主軸

---

### 完了記録

#### [1.1] 2026-05-29 ✅
- 確認方法: frontend/src 全 grep / .env.example / vite.config.ts / import.meta.env.VITE_* 全参照 / dist 実ビルド成果物の JWT payload デコード / backend からの誤レスポンス grep / git 履歴 / .gitignore / DEPLOY.md 手順
- 結果: 8項目全合格・dist 内 JWT は anon キーのみ（role=anon 確認）・service_role 混入ゼロ
- 軽微な注記: 過去コミット c1e1a6e で frontend/.env.production が誤コミット → 887ecec で削除済み。anon キー履歴残存は [1.3] で別途扱う

#### [1.2] 2026-05-29 ✅
- 確認方法: git ls-files / .gitignore 全文 / git log --diff-filter=A / 履歴残存 secret 種別判定 / ビルド成果物 grep
- 結果: tracked な .env 系は .env.example のみ・履歴残存は anon キー(公開前提)のみで service_role 等の機密残存なし
- 修正: .gitignore に `**/.env*` + `!**/.env.example` の包括パターン追加・既存明示パスを集約・PWA dev-dist を untracked 化(git rm --cached)
- 軽微な注記: 過去コミット c1e1a6e の anon キー履歴残存は anon が公開前提のため [1.3] でも別途扱う必要なし

#### [1.3] 2026-05-29 ✅
- 確認方法: 全ブランチ全履歴(120 コミット)を対象に、自前パターン grep で全 secret 種別(JWT/DB/Resend/Anthropic/OpenAI/AWS/Google/VAPID/PEM/GitHub/Slack/generic)を網羅検査・backend/migrations/scripts/tests も検査
- 結果: 要ローテート級 secret(service_role / DB パスワード / API キー / VAPID 秘密鍵)の履歴残存ゼロ。検出されたのは既知の anon キー(公開前提・[1.1] [1.2] で整理済み)と DATABASE_URL プレースホルダのみ
- 軽微な注記: gitleaks 等の専用ツールは未使用(自前 grep で網羅)。将来防止策として pre-commit hook 導入を [1.10] として新項目化

#### [1.4] 2026-05-29 ✅
- 確認方法:
  - コード側: backend/.env.example と config.py 整合確認・git ls-files で tracked .env 系の精査・frontend/.gitignore 確認・VITE_ prefix 確認
  - ローカル env: backend/.env と frontend/.env.local を prod 直結から dev (hpkpndjqtzycnytymdkk) に切替・Supabase dev ダッシュボードで seed v2 の 40人が見えることを確認
  - Vercel: DevTools Network で本番(crocoweb.jp)→ api.crocoweb.jp、dev preview → cro-co-api-dev.onrender.com を叩いていることを実機確認
  - Render: dev (cro-co-api-dev) と prod (cro-co-backend) の Environment Variables を別タブで比較・dev/prod で別値必須の env が分離されていることを目視・メール/Push 関連 env (FROM_EMAIL/FRONTEND_URL/RESEND_API_KEY/VAPID_EMAIL) は dev で意図的に未設定(no-op で動作)
  - Supabase: dev (hpkpndjqtzycnytymdkk) と prod (fspbzagpilhjorfdvtxe) プロジェクトを別タブで開き、各 URL / anon key / service_role key が Render の対応 env と整合
- 結果: コード側・ローカル env・3ダッシュボード(Vercel/Render/Supabase)すべてで dev/prod が完全に分離されていることを確認
- 付随対応:
  - backend/.env.example に欠落していた VAPID_*/PRIVACY_HASH_SALT/LIKE_QUOTA_ENABLED を補完(コミット 8e1c55b)
  - .gitignore に **/.env* + !**/.env.example の包括パターン追加・dev-dist を untracked 化(コミット a79fddc)
  - 調査中の手順ミスで prod Supabase DB password がチャットに平文露出 → Step 3 完了時の一括ローテート対象として STATUS に記録(コミット 8e1c55b)
  - dev preview で目視確認時に access_token (JWT) がスクショ経由でチャット露出 → 即ログアウトで無効化済み・追加対応不要
- 教訓: postgresql:// 形式の文字列はパスワード内包のため値ごと出力禁止。スクショ送信時は Authorization ヘッダの JWT に注意

#### [1.5] 2026-05-29 ✅
- 確認方法: migration 041 で profile-images / student-ids 両バケットを Private / file_size_limit=5MB / allowed_mime_types=image/jpeg,image/png で作成済みを ROADMAP.md 記録から確認。dev での service_role 疎通は `scripts/storage_smoke_dev.ps1` で HTTP 200 確認済み（upload=200 download=200 delete=200）。Supabase `storage.buckets` テーブルで `profile-images public=false` も確認済み。

#### [1.7] 2026-05-29 ✅
- 確認方法: get_signed_image_url(image_utils.py)のデフォルト expires_in=3600 と全呼び出し箇所(profile/browse/safety/match/like/notifications/admin の計19箇所)の実効値を全件確認・学生証(admin.py:94)は別経路で expires_in=300(5分)
- 結果: profile-images 系 全19箇所が 3600秒(1時間)・学生証 300秒(5分)・1日以上の expiry ゼロ・Supabase デフォルト依存ゼロ。全て適切
- 軽微な注記: HomePage で1時間以上滞在すると avatar_url が 403 になりうるが TanStack Query の再フェッチで実用上解消。img onError でのリトライ機構は優先度低として IDEAS に保留候補

#### [1.8] 2026-05-29 ✅
- 確認方法: service_role 参照箇所の grep（config.py:15 定義 + supabase_client.py:7 使用の一元管理）・全コードファイルで eyJ JWT ハードコード検査（0件）・SUPABASE_SERVICE_ROLE_KEY と DEV_SRK の役割分離確認・ローテート記録（HANDOFF 2026-05-28）・git 履歴混入ゼロ（[1.3] 済）・ダッシュボード突き合わせは [1.4] で確認済み
- 結果: ハードコードゼロ・env 一元管理・prod/dev 混在なし・旧キー痕跡なし（ローテート済み記録あり）。合格
- 副作用: 調査中の grep で dev service_role キー値がチャットに露出（backend/.env を grep 対象に含めたため）→ STATUS の一括ローテート確定対象に格上げ。dev 環境のため緊急性は低いが Step 3 完了時にローテート確定
- 教訓: .env 系ファイルは secret が平文で入るため grep 対象から除外すべき（[1.4] の DB password 露出と同根の手順ミス）

#### [1.6] 2026-05-31 ✅
- 確認方法:
  - migration 041 で profile-images / student-ids 両バケット file_size_limit=5MB / allowed_mime_types=image/jpeg, image/png を設定済み（[1.5] 完了時に確認）
  - backend 3エンドポイント（/upload-student-id / /upload-avatar / /photos）全てで MIME チェック（_ALLOWED_MIME_TYPES）+ サイズチェック（_MAX_FILE_SIZE / _MAX_STUDENT_ID_SIZE）実装を直接コード確認
  - フロント accept 属性 5箇所全てで image/jpeg,image/png に統一されていることを grep 確認
- 解消した不整合（コード修正）:
  - webp 不整合: backend `_ALLOWED_MIME_TYPES` から image/webp を除外しバケット allowed_mime_types と一致（案B 採用・migration 不要・運用コスト最小）
  - 学生証サイズ上限不整合: backend `_MAX_STUDENT_ID_SIZE` を 10MB → 5MB に変更しバケット file_size_limit と一致
  - SetupRequiredPage の handleFileChange にフロント MIME/サイズチェック欠落を補完（ProfileEditPage パターンと統一）
- 軽微な注記: webp サポートが必要になった場合は「バケット allowed_mime_types に webp 追加 + フロント accept 更新 + backend _ALLOWED_MIME_TYPES に復元」で対応
- ⚠️ 実機確認未実施: 不正 MIME・大きいファイルのアップロード試行→拒否の挙動はオーナーが Supabase ダッシュボードで手動確認を推奨

#### [1.9] 2026-05-31 ✅(条件付き)
- 確認方法: backend/app の *.py のみ（.env 除外）で logger/print 全件 grep・例外ハンドリングの secret 露出・リクエストロギング・Supabase デバッグログ・PII 出力・フロント console.log を検査
- 結果: secret（service_role / Resend / VAPID private / DATABASE_URL / SECRET_KEY / PRIVACY_HASH_SALT）がサーバーログに乗る経路ゼロ・print() ゼロ・デバッグログ無効・例外の e.message は DB エラー文字列のみで secret 非含有
- 条件付きの理由（残課題2件・本番前対応）:
  - 発見A [17.9]: WebSocket が `?token=JWT` のクエリ渡し（`ws.py:14-15`）で uvicorn アクセスログに JWT が残る。β中は据え置き（Render オーナーのみ閲覧可・JWT 有効期限約1時間でリスク限定的）。本番前にトークンを URL から外す方式（接続後メッセージ / Sec-WebSocket-Protocol / 短命 ticket）に作り直す
  - 発見B [17.10]: `AuthContext.tsx:44,59` でユーザーのメアドを console.log 出力。ブラウザ DevTools のみ（サーバーログ非対象・本人の DevTools のみ）。§5 触らないファイルのため据え置き・本番前に抑制/削除を判断
- ★ 教訓: 本タスクは .env を grep 対象から除外して実施し、[1.4][1.8] のような secret 露出を起こさなかった

#### [1.10] 2026-05-31 ✅
- 導入: pre-commit フレームワーク + gitleaks v8.30.1（`.pre-commit-config.yaml` / `.gitleaks.toml`）
- hook: pre-commit（staged 差分スキャン）・`[extend]` useDefault=true でデフォルト約160ルール継承
- 除外: `.env.example` 3ファイルを path allowlist（プレースホルダ誤検知防止）
- 動作確認（オーナー実施）: `pip install pre-commit` / `pre-commit install` / `pre-commit run gitleaks --all-files` → "Detect hardcoded secrets...Passed"（全追跡ファイルで本物 secret ゼロ・anon キー false positive なし）
- 効果: [1.4][1.8] のような secret コミット/露出を機械的に防止。既存全ファイルに本物 secret がないことを gitleaks で裏取り（[1.1][1.3] の自前 grep 判定を追認）
- `--no-verify` バイパスは残置（意識的に使う運用）

#### [2.2] 2026-05-31 ✅
- 確認方法（静的＋実機）:
  - 静的: auth/dependencies.py の get_current_user を精読。HTTPBearer(auto_error デフォルト) → supabase.auth.get_user(jwt) → except Exception で 401 + "認証に失敗しました" + WWW-Authenticate ヘッダ、response.user is None も明示的に 401。get_active_user/require_admin が前段に get_current_user を持ち全 HTTP エンドポイント(routers 86箇所)がこの検証を通過。Depends(get_current_user) 直接使用は 0 件
  - 実機(dev・GET /api/profile/me・一般アカウント): ヘッダなし=401 / 有効トークン=200 / 署名末尾改竄=401。期待通り
- 結果: JWTなし・改竄を実機で拒否、有効トークンのみ通過。認証の土台が静的・実機の両面で機能。期限切れは改竄401で署名/exp検証経路が動作確認済みのため実質確認済み（徹底E2Eは[15.1]へ）
- 🚩 穴1（軽微・β据え置き）: dependencies.py:8 の HTTPBearer() は auto_error デフォルトのため、本来ヘッダなしは framework が 403+英語"Not authenticated" を返す想定だったが、実機では 401 が返り他ケースと一貫。いずれにせよ拒否されるため[2.2]の合否に影響なし。403/401 の厳密統一は auth/dependencies.py(§5 触らないファイル)修正が必要なため β では据え置き、[2.7] の JWT 周り精査時に再評価
- 🚩 穴2（[2.5]へ正式登録・要§5解除判断）: active_user.py:27-28 の except Exception: pass により、profiles テーブル取得が失敗すると BAN 判定がスキップされ banned ユーザーが通過する（フェイルオープン）。JWT 検証自体とは独立だが認証チェーン上の穴。[2.5] で「DB障害時はフェイルクローズ＝拒否」に変更する修正を §5 解除込みで提案予定

#### [2.3] 2026-05-31 ✅
- 確認方法（静的＋追補＋実機＋全探索＋修正）:
  - 静的: id を取る全エンドポイント19本の所有権チェックを精査。全て current_user.id 絞り or 所有者照合 or 関係性検証で🚩ゼロ。機微情報も SELECT 絞り＋Pydantic response_model の二重フィルタで漏れなし（GET /api/profiles/{user_id}）
  - 追補: reply_to_id は match_id 照合で別会話紐付け不可(message.py:180)。身バレ防止 is_hidden_between() は list/get 同一実装・双方向・id直叩きでも有効。ブロックも双方向403
  - 実機(dev): 他人match取得403 / 他人match削除403 / 他人photo削除403 / 他人photoメイン設定403 / 同学科×身バレON相手のid直叩き404 / 被ブロック相手のid直叩き=当初200観測
  - 全探索: 安全判定まわりの except 握りつぶしを棚卸し（132件中）。🔴4件(BAN1・ブロック3)・🟡7件(身バレ3・非表示2・マッチ済み除外1・いいね在庫1)・無害121件。browse.py だけがブロック/身バレ判定をインライン実装＋except: pass で fail-open になっていた構造を特定
  - 修正(commit bbed052・§5外6件): browse.py 115/292/652 のインラインブロック判定を get_blocked_user_ids() に一元化し例外は伝播(fail-closed/500)。identity_hide.py 57/75 は except APIError: raise に、102 は return True(隠す側)に変更。修正後 被ブロック相手のid直叩きが403になることを実機確認
- 結果: IDOR(他人データ直接操作)は静的・実機とも検出ゼロ。加えてブロック/身バレ判定の fail-open 構造を6件 fail-close 化
- 重要な注記（正確な総括）: 当初の「被ブロック相手id直叩き=200」観測は、テスト用アカウント取り違え（blocked_id=ce0b69ee に対し fm1/dce68761 のトークンで叩いた可能性）があり、200 が穴の直接証拠とは断定しない。穴の根拠は静的に確認した browse.py:652 の except Exception: pass によるブロック判定握りつぶし構造であり、これは実在しfail-close修正済み。修正後コードで被ブロック状態を正しく再現し403を確認
- 残課題（権限外の🟡4件を別枠登録）: 下記「カテゴリ10候補」参照
- 副次知見: fail-open は active_user.py のBAN判定([2.5]既知)と同型。安全判定は fail-close 統一が設計原則

#### [2.4] 2026-05-31 ✅
- 確認方法（静的＋実機）:
  - 静的: admin.py 全23本に Depends(require_admin) 付与・欠番なし([2.1]台帳と一致)。require_admin(dependencies.py:35)は current_user.email in settings.admin_emails で判定。email は Supabase サーバー側 auth.get_user(jwt) 由来でJWT改竄は弾かれる
  - fail-close 一貫: null email→403 / 空リスト(ADMIN_EMAILS未設定)→全拒否403 / 例外なし(try不要の単純in判定)。[2.3]の fail-open 病はここには無い
  - 昇格経路なし(C): ①email書換は確認リンク必須+admin受信箱奪取前提 ②アプリ内にメアド変更UIが存在しない(ResetPasswordPageはpasswordのみ・ProfileUpdateRequestにemailフィールドなし) ③admin_emailsはカンマ区切り完全一致でglob/regex無し→ドメイン全員adminの事故不可
  - フロントのみ判定なし: AdminGuard.tsx は実際に GET /api/admin/pending を叩き200/403で判断・App.tsxで二重ガード。require_admin の import は admin.py のみ(他12ルーターに漏れなし)
  - 実機(dev・一般トークン fm1): GET /api/admin/stats=403 / GET /api/admin/users=403
- 結果: 管理者専用23本は静的・実機とも保護。バイパス・昇格経路なし
- 🟡 軽微(実害なし・[2.5]へ申し送り): require_admin の比較側 current_user.email を .lower() していない(リスト側 config.py:40 は lower 済み)。Supabase GoTrue がメアドを小文字正規化するため実用上無害だが、[2.5]で active_user 周りを §5解除して触る際、比較側にも .lower() を足して対称化すると予防になる(1行)
- [2.5]へ渡す事実: require_admin は get_active_user を経由しない(get_current_user直結)ため、BAN済み管理者・未approved管理者が admin エンドポイントを通過しうる。[2.1][2.4]とも一致。対処は[2.5]で§5解除込み

#### [2.5] 2026-05-31 ✅
- 確認方法（静的＋修正＋実機）:
  - 静的: BAN通過経路を3つ特定。①active_user.py が banned のみ判定・except Exception: pass で DB障害時スキップ(fail-open)・migration 042 で追加した deleted を見ていない ②require_admin が get_active_user 未経由で BAN済みadmin が23本通過 ③ws.py が JWT検証のみで status 未確認→BANユーザーWS受信可能
  - 修正(commit 4f2d87d・§5限定解除 active_user.py/dependencies.py + §5外 ws.py):
    - active_user.py: 判定を ("banned","deleted") に拡張／行欠落も含め例外時は通過させず 503(fail-close)／BAN判定の403は except HTTPException: raise で先に伝播
    - dependencies.py: require_admin に BAN/deleted チェックをインライン追加(active_user を import すると循環するためロジック複製)／email比較を .lower() 対称化([2.4]🟡解消・None ガード付)
    - ws.py: user_id 取得直後・accept前に status 確認、banned/deleted/行欠落で close(4003)
  - 実機(dev・BANユーザー mf9@ecs.osaka-u.ac.jp): GET /api/profile/me=403。ログイン自体は成功(Supabase Auth は status を見ない)するが API は全て弾かれる
- 結果: BAN/deleted ユーザーは HTTP 全経路で 403、WS は `close(code=4003)` を `accept()` 前に呼ぶため Starlette が HTTP 403 で WebSocket upgrade を拒否する（WebSocket フレームは送られない・接続拒否は同等）。fail-close は 503 で障害と BAN を区別
- fail-close 副作用(許容方針): DB瞬断時に全ユーザーが503になりうる。身バレ([2.3])と同じ「安全優先・可用性犠牲」。Supabase可用性が高い個人開発スケールで許容
- ✅ [15.1] 2026-06-04 WS 実機確認: banned/deleted/pending/無効トークン全て HTTP 403 で upgrade 拒否確認（close(4003) before accept() の Starlette 動作・保護は機能・コード変更不要）。[17.9](WS の ?token= URLクエリ露出)は別PR据え置き(今回スコープ外)
- ⚠️ 設計上の申し送り: BAN/deleted 判定ロジックが active_user.py と dependencies.py の2箇所に複製されている(循環import回避のため)。今後ステータス値を追加する際は両方を必ず更新すること(片側忘れが穴になる)

#### [2.8] 2026-06-03 ✅

**パスワードリセット / メアド変更 — 穴なし・修正不要**

3機能の実装を確認した結果:

| 機能 | 実装 | 認証要否 | 判定 |
|---|---|---|---|
| パスワードリセット（忘れた時） | `LoginPage.tsx:56` `supabase.auth.resetPasswordForEmail()` → `ResetPasswordPage.tsx:45` `supabase.auth.updateUser({password})` | ✅ Supabase 発行の使い捨てリカバリトークン（1時間有効）が必須。`PASSWORD_RECOVERY` イベントなしはフォーム非表示。 | ✅ OK |
| ログイン中のパスワード変更 | **未実装** | — | ✅ N/A |
| メアド変更 | **未実装** | — | ✅ N/A（将来実装時は [5.1] 連動必須） |

- backend に password/reset/email 変更系エンドポイントなし（`backend/app` 全 Python grep ゼロ件）
- フロントの `supabase.auth.updateUser` 呼び出しは `ResetPasswordPage.tsx:45` の1箇所のみ（`{password}` のみ・`{email}` は含まない）
- `/reset-password` ルートは `ProtectedRoute` / `PublicOnlyRoute` なし（メールリンクで未ログイン状態でアクセスするため意図的）
- リンクなしに `updateUser()` を呼んでも Supabase Auth がセッションなしとしてエラー

**[5.1] 連動メモ（将来メアド変更実装時）**: `supabase.auth.updateUser({email})` で変更する場合、DB トリガー `enforce_university_email_domain` は `auth.users BEFORE INSERT` のみ有効で UPDATE には効かない。→ バックエンドで新メアドの `@ecs.osaka-u.ac.jp` ドメイン制限を検証する実装が必須。[5.1] のタイミングで設計すること。

**確認方法**: `backend/app` 全 Python grep（password/reset/email 関連ゼロ件）+ フロント全ページ grep（updateUser 2箇所 / resetPasswordForEmail 1箇所のみ）+ `App.tsx:71` ルート設定確認。実機（リセットリンクのトークン検証・期限切れ）は [15.1] E2E で実施予定。

#### [2.7] 2026-06-03 ✅

**JWT 検証は Supabase Auth サーバー委譲 — ローカルデコードなし**

- HTTP (`dependencies.py:16`): `supabase.auth.get_user(jwt=token)` → gotrue `_request("GET", "user", jwt=jwt)` → Supabase Auth `/auth/v1/user` へ HTTP GET。ローカルデコードなし。
- WS (`ws.py:19`): `supabase.auth.get_user(token)` — 同一経路。
- `requirements.txt` に PyJWT・python-jose なし。`backend/app` 全体で `jwt.decode` / `HS256` / `alg` 等の文字列はゼロ件。
- gotrue ライブラリ内部（v2.12.3, `gotrue_client.py:647`）も JWT をローカル解析せず HTTP リクエストのみ。
- alg:none / アルゴリズム混同: Supabase Auth が HS256 固定で署名検証するため成立しない。署名なしトークンは GoTrue が拒否。exp 検証も GoTrue 側。
- JWT Secret: アプリコードが持たない設計（`config.py:18` の `secret_key` は dead config — 参照ゼロ件）。
- **修正不要。**
- 付記: gotrue v2.12.3 が DeprecationWarning（`use supabase_auth instead`）を出す。`supabase>=2.12` 移行を [11.2] で検討推奨。

**確認方法**: `dependencies.py` / `ws.py` / `gotrue_client.py:647` / `gotrue_base_api.py:88-120` コード精読（`inspect.getsource` 取得） + `requirements.txt` + `backend/app` 全 Python grep（JWT 関連ゼロ件）。実機（alg:none トークン試行）は [15.1] E2E で実施予定。

#### [2.6] 2026-06-03 ✅

**承認済み（approved）ガードをサーバー側に統一**

**発見した穴（調査フェーズ）:**
- `POST /api/likes/`・`GET /api/profiles`・マッチ系3本は `profile_setup_completed` のみをチェックしており、`pending_review`/`rejected` ユーザーが API を直叩きすれば通過できた
- WS は `banned`/`deleted` のみ拒否。`rejected`（停止済み）ユーザーが WS 接続できた
- 攻撃チェーン: `pending_review` ユーザー → `GET /api/profiles` → approved ユーザー UUID 取得 → `POST /api/likes/` → 相互いいねがあれば match 成立 → WS 接続可

**修正内容（コード変更 5 ファイル）:**

| 変更 | ファイル:行 | 内容 |
|---|---|---|
| 新規 `get_approved_user` | `auth/approved_user.py` | `get_active_user` に依存。status != "approved" → 403 / DB エラー → 503。fail-close |
| GET /api/profiles | `browse.py:77` | `Depends(get_active_user)` → `get_approved_user`。profile_setup_completed 取得を select から削除・チェック削除 |
| GET /api/profiles/{user_id} | `browse.py:553-575` | `is_self` 分岐に変更。自己閲覧は pending 許可、他人閲覧は approved 必須 |
| POST /api/likes/ | `like.py:87` | `Depends(get_approved_user)`。チェック1（profile_setup_completed）を削除 |
| GET /api/matches/ | `match.py:22` | `Depends(get_approved_user)`。me_res ブロック削除 |
| GET /api/matches/{match_id} | `match.py:246` | 同上 |
| DELETE /api/matches/{match_id} | `match.py:320` | 同上 |
| WS /ws/chat/{match_id} | `ws.py:37` | `status in ("banned","deleted")` → `status != "approved"` |

**チェック1削除の根拠**: `upload-student-id`（`profile.py:291`）が常に `profile_setup_completed=True` をセットする。`pending_review` になる唯一の経路が `upload-student-id` なので、admin が approve できるのは必ず `profile_setup_completed=True` のユーザーのみ（admin.py:154 の 409 ガード）。コードから `approved → profile_setup_completed=True` が証明できるため削除安全。

**確認方法（静的）**: py_compile OK（5ファイル） / `grep get_approved_user` で使用箇所が想定どおり（browse 1・like 1・match 3）/ GET /api/profiles/{user_id} の is_self 分岐確認 / `git diff --name-only` で §5 ファイル非含有確認

**⚠️ 実機繰り延べ → [15.1]**: pending JWT で各エンドポイント直叩きが 403/4003 になることの実機確認は JWT 未取得のため未実施。[15.1] E2E シナリオで実施。

#### [2.1] 2026-05-31 ✅
- 確認方法（2段階）:
  - フェーズA全目視: backend/app の全12ルーターを Read で読了し、79エンドポイント(HTTP78+WS1)を method/path/file:line/guard で全件分類
  - クロスチェック(grep機械裏取り): main.py の include_router 12件＝読了12ファイルと完全一致(未読ルーターなし)／`@router.*` grep 79件＝目視79本と一致／`@app.*` 0件・`add_api_route`/`add_route`/`add_websocket_route`/`app.mount` 0件(非デコレータ経路なし)／`Depends(` 76件＋未付与3本の正当性確認
- 結果: 無防備🚩 ゼロ。✅77本(get_active_user / require_admin / 手動JWT)・⚪意図的公開2本(GET /health=死活監視・GET /api/push/vapid-public-key=Web Push公開鍵)。目視と grep が完全一致し取りこぼし・余剰なし
- グレー(本項目では合格・[2.5]へ持ち越し): (a) admin 23本は require_admin→get_current_user チェーンで get_active_user を経由せず、BAN済み管理者が技術的に通過しうる(運用上ほぼ発生せず) (b) WS /ws/chat/{match_id} は手動JWT検証のみで profiles.status=='banned' チェックがなく、BANユーザーがトークン保持中は接続維持で受信可能(HTTP送信側 POST /api/messages/ は get_active_user で遮断済み)。WS は [17.9](URLクエリトークン)と同一ファイルのため [2.5] で束ねて対処予定

#### [3.5] / [3.6] / [3.7] / [3.8] 2026-06-03 ✅

**[3.5] prod 手動ポリシー残存確認**
- 確認方法: Supabase MCP `execute_sql` で dev/prod 両環境の `pg_policies` を全件取得
- 結果: migration 044 の DROP 対象4本（`match participants can view messages` / `blocks_delete_own` / `reports_self` / `hide_messages_with_deleted_user`）が prod から消えていることを直接確認。残存する非 service_role ポリシー9本は ARCHITECTURE.md §4 記載の意図的残置セット（GRANT 層で実際には到達しない）。like_quota の service_role ポリシー重複2本（"service_role full access" + "service_role full access on like_quota"・同一内容）を migration 047(C) で1本に統合。

**[3.6] user_inventory RLS パターン整合**
- 確認方法: migration 043 SQL + dev `pg_policies` クエリ結果を照合
- 結果: `ENABLE ROW LEVEL SECURITY` / `GRANT ALL TO service_role` / "service_role full access" FOR ALL TO service_role USING(true) WITH CHECK(true) の1本のみ。非 service_role ポリシーゼロ。PERMISSIVE で除外・制限なし。CLAUDE.md §4 の確立パターンに完全準拠。

**[3.7] SECURITY DEFINER 点検**
- 確認方法: `pg_proc.prosecdef = true` でアプリ管理関数を全列挙、`information_schema.triggers` でトリガー登録状況を確認
- アプリ管理関数3本の状態（migration 047 適用後）:
  - `handle_new_user`: `search_path=public` ✅（既存）
  - `enforce_university_email_domain`: `search_path=public` ✅（既存）
  - `detect_match`: `search_path=public` ✅（migration 047(B) で固定）
- 発見・対応: `create_profile_for_user`（prod のみ・migration 管理外・未使用・search_path 未固定）を migration 047(A) で DROP。コード参照ゼロ・トリガー登録なし・pg_depend 依存なしを確認してから実行。
- prod 適用確認: オーナーが pg_proc で `create_profile_for_user = 0件` / `detect_match.proconfig = ["search_path=public"]` を目視確認。
- ⚠️ 繰り延べ [15.1]: `detect_match` の機能実機確認（相互いいね → matches 生成）は ALTER のみで本体・トリガー登録は無変更のため構造上安全だが、実動作は [15.1] E2E で確認予定。

**[3.8] Storage bucket policy 整合**
- 確認方法: `storage.buckets` テーブル直接 SELECT + `pg_policies WHERE schemaname='storage'`
- 結果（prod）: profile-images / student-ids とも `public=false` / `file_size_limit=5MB` / `allowed_mime_types=[jpeg,png]`。dev も同一設定。`storage.objects` の RLS ポリシーはゼロ件（service_role がバイパスするため不要・設計意図通り）。整合・修正不要。

#### [4.1] 2026-06-02 ✅

**学生証のライフサイクル（file:line 付き）**

```
[1] アップロード: POST /upload-student-id (profile.py:214)
      Storage: student-ids/{uid}/student_id_{timestamp}.{ext}
      DB: student_id_image_path = パス / status = pending_review
      ★2026-06-02修正: 旧ファイルがある場合は DB 更新成功後に Storage.remove() 追加

[2] 審査中: status = pending_review
      管理者が GET /admin/student-id/{id} → 署名URL(5分)で閲覧

[3] 承認: POST /admin/approve/{id} (admin.py:147)
      status = approved / identity_verified = true
      reviewed_at = now() を書き込み ← 3日カウントの起点

[4] 却下 → 再申請: POST /profile/reapply (profile.py:659)
      ★2026-06-02修正: 旧学生証を Storage.remove() してから DB null 化
      DB: student_id_image_path = NULL / status = pending_review

[5] 承認後3日: privacy_purge バッチ (APScheduler 毎日 03:00 JST)
      通常対象 (privacy_purge.py:124-131):
        status='approved' AND reviewed_at <= now()-3d AND privacy_purged_at IS NULL
      ★2026-06-02追加: reviewed_at=NULL フォールバック (privacy_purge.py:141-154):
        status='approved' AND reviewed_at IS NULL AND student_id_image_path IS NOT NULL
        AND submitted_at <= now()-3d AND privacy_purged_at IS NULL
      実行 (privacy_purge.py:47-78):
        Storage.remove([student_id_image_path])  → 物理削除
        DB: real_name=NULL / student_number=NULL / birth_date=NULL
            student_id_image_path=NULL / real_name_hash / student_number_hash
            privacy_purged_at=now()

[6] 退会: DELETE /api/profile/me (profile.py:719)
      profile.student_id_image_path を読んで Storage.remove() → 即時物理削除
```

**検証結果:**

| 確認項目 | 結果 |
|---|---|
| 3日保持定数 | `privacy_purge.py:20` `APPROVED_RETENTION_DAYS = 3` ✅ |
| 3日起点カラム | `admin.py:167` 承認時 `reviewed_at = now()` ✅ |
| バッチ通常対象条件 | `reviewed_at <= now()-3d AND privacy_purged_at IS NULL` ✅ |
| バッチ NULL フォールバック | `reviewed_at IS NULL AND submitted_at <= now()-3d`（2026-06-02 追加）✅ |
| Storage 物理削除 | `privacy_purge.py:56` `.remove([student_id_path])` ✅ |
| DB パス null 化 | `privacy_purge.py:68` `student_id_image_path: None` ✅ |
| 退会時即時削除 | `profile.py:755-773` Storage.remove() 確認 ✅ |
| PRIVACY_HASH_SALT 未設定の影響 | ハッシュ列が NULL になるのみ。削除処理自体は継続 ✅ |
| reapply 孤立ファイル | **修正済み**（`profile.py:659` Storage.remove() 追加）✅ |
| upload 再アップ孤立ファイル | **修正済み**（`profile.py:329` DB 更新後に旧ファイル削除）✅ |
| reviewed_at=NULL バッチスキップ | **修正済み**（migration 046 + purge フォールバック追加）✅ |

**dev 実データ確認:**
- migration 046 適用後: `reviewed_at IS NULL AND student_id_image_path IS NOT NULL` = 0件 ✅（dev は seed データなのでもともと student_id_image_path IS NULL のため影響なし）
- student-ids バケット: 孤立ファイル1件残存
  → **オーナー手動削除待ち**: Supabase Dashboard > Storage > student-ids > `d388e89b-…/student_id_1779884888.jpg`
- purged 12件: `real_name_hash IS NOT NULL` → PRIVACY_HASH_SALT が設定された状態でバッチが動作した証跡

**prod 実データ確認（Supabase MCP で照合）:**

| カテゴリ | 件数 | 状態 |
|---|---|---|
| approved + reviewed_at あり | 0 | N/A |
| approved + reviewed_at=NULL + student_id あり | 8件（最古 16日超） | **修正必要（下記参照）** |
| rejected + reviewed_at あり（30日待ち） | 1件 | ✅ 2026-06-25 purge 予定 |
| 孤立ファイル（DB 参照なし） | 11件・約7MB | **手動削除要（下記参照）** |

**✅ 完了確認（2026-06-02）:**

| 確認内容 | dev | prod |
|---|---|---|
| student-ids バケット空 | ✅ 0件 | ✅ 0件（孤立11件+参照8件の全削除確認） |
| reviewed_at=NULL かつ student_id あり | ✅ 0件 | ✅ 0件（migration 046 適用後に確認） |
| migration 046 適用（reviewed_at backfill） | ✅ MCP apply_migration・2026-06-02 | ✅ オーナー手動適用・2026-06-02 |
| 孤立ファイル削除 | ✅ 1件削除済み | ✅ 11件（約7MB）削除済み |

**前提（記録）:** 現時点 dev/prod とも実在の学生証は無くテスト用フリー素材のみ。本番実ユーザー受付前。PII は削除または未存在の状態を確認。

**⚠️ 繰り延べ → [17.11]:** reapply / 再アップ時の旧ファイル削除（`profile.py:659/329`）は py_compile + コード精読で確認済みだが、HTTP 実機（実際に再アップして旧ファイルが Storage から消えることを確認）は JWT 未取得のため未実施。β 実ユーザーが学生証を再アップする前に実機確認すること（[17.11] に登録）。

**⚠️ 3日経過実機未確認:** バッチ削除を3日待って実証することは時間依存のため未実施。コード条件精読で代替。

**確認方法:** `privacy_purge.py` / `profile.py` / `admin.py` コード精読（file:line 特定）+ Supabase MCP で dev/prod の DB 状態・student-ids bucket 全ファイル照合（孤立ファイル特定）+ py_compile + migration 046 を dev 適用し 0件確認

#### [4.3] 2026-06-03 ✅

**本名・学籍番号の purge バッチ後状態（平文NULL + hash残存）確認**

**処理フロー（privacy_purge.py:47-78）**

```
1. Python メモリ上でハッシュ生成（line 49-50）
     real_name_hash = _hash(profile["real_name"])
     student_number_hash = _hash(profile["student_number"])
2. Storage から学生証を物理削除（line 56）
3. DB を1回の UPDATE で原子的実行（line 64-73）
     real_name=NULL / student_number=NULL / birth_date=NULL
     student_id_image_path=NULL
     real_name_hash=hash / student_number_hash=hash
     privacy_purged_at=now()
```

**順序の安全性**: hash 先生成 → DB UPDATE（平文NULL化 + hash書き込みを1回で原子的実行）の設計が正しい。hash 生成失敗時は DB UPDATE も実行されない（Python 例外が伝播して `purge_user_pii` が False を返す）。唯一の例外は SALT 未設定時（下記）。

**purge 対象条件（run_purge_batch: line 124-177）**

| ケース | 条件 |
|---|---|
| approved 3日後（通常） | `status='approved' AND reviewed_at <= now()-3d AND privacy_purged_at IS NULL` |
| approved・reviewed_at=NULL フォールバック | `status='approved' AND reviewed_at IS NULL AND student_id_image_path IS NOT NULL AND submitted_at <= now()-3d AND privacy_purged_at IS NULL` |
| rejected 30日後 | `status='rejected' AND reviewed_at <= now()-30d AND privacy_purged_at IS NULL` |
| hash 1年後削除 | `privacy_purged_at IS NOT NULL AND privacy_purged_at <= now()-365d AND real_name_hash IS NOT NULL` |

起点は `reviewed_at`（管理者審査日）。`reviewed_at=NULL` のフォールバックは migration 046 + submitted_at 代替で対応済み（2026-06-02）。

**SALT 未設定時の挙動（重要）**

`_hash(value)` は `PRIVACY_HASH_SALT` 未設定で `None` を返す（line 29-31）。しかし `purge_user_pii` はその後の DB UPDATE を止めない。結果: **平文は NULL になるが hash も NULL**（再登録検出の指紋が失われる）。

**⚠️ ARCHITECTURE.md §9 の記述「ハッシュ化が中止される」は誤解を招く**: 実態は「バッチは継続・平文は消える・hash が NULL になる」。正確には「ハッシュ値の生成が中止され NULL になる（削除バッチ自体は止まらない）」。

**dev 実データ照合（Supabase MCP execute_sql）**

| 項目 | 件数 | 判定 |
|---|---|---|
| 正常 purge（平文NULL + hash残存） | 12 | ✅ |
| 事故行（purge後 hash NULL） | 0 | ✅ |
| 事故行（purge後 平文残存） | 0 | ✅ |
| 未 purge（保持期間中・正常） | 28 | ✅ |
| 未 purge + 平文もNULL（退会等） | 4 | ✅ |
| 合計 | 40 | — |

**prod 実データ照合（Supabase MCP execute_sql）**

| 項目 | 件数 | 判定 |
|---|---|---|
| 正常 purge（平文NULL + hash残存） | 11 | ✅ |
| 事故行（purge後 hash NULL） | 1 | ⚠️ 後述 |
| 事故行（purge後 平文残存） | 0 | ✅ |
| 未 purge（rejected 30日待ち中） | 1 | ✅ |
| 合計 | 13 | — |

**prod purged_hash_null=1 の詳細分析**

- 対象行: `id=725b0621-...`・`status=approved`・`privacy_purged_at=2026-06-02 18:00:02 UTC`（今日のバッチ）
- **raw PII（real_name/student_number/birth_date）が全て元々 NULL** → `_hash(None)` → `return None`（line 26-28）→ hash=NULL（SALT が設定されていても発生する）
- **SALT 問題ではない**: 同バッチで ok_purged=11 件が有意な SHA-256 hash（`300df740...`, `5a3d25d4...` など各ユーザーで異なる）を持っており、SALT 設定済みを証明
- **原因**: Supabase Studio 直接操作で PII 未入力のまま `status=approved` にされたテストユーザー（reviewed_at = submitted_at = 2026-05-17 で同値 = backfill された証拠）
- **実害なし**: PII が元々なければ指紋も不要。実在する個人情報はゼロ（本番運用前）
- **Step 5 テストデータ全削除で解消**: β リリース前のクリーンアップで当該行ごと削除される

**prod 未 purge 1件の詳細**

- `status=rejected`・`reviewed_at=2026-05-26`・real_name/student_number/birth_date EXISTS（平文保持中）
- rejected 30日待ち = 2026-06-25 purge 予定 → 正常な保持期間（[4.1] 完了記録と一致）

**ハッシュ方式の健全性**

`hashlib.sha256(f"{salt}:{value}".encode("utf-8")).hexdigest()`（line 32-33）: SALT + SHA-256 の組み合わせ。素の SHA-256 は逆引き（Rainbow table）されやすいが、ランダムな SALT をプレフィックスに付けることで逆引きを実質不可能にする。再登録検出の識別子用途としては適切な方式。

**確認方法**: `privacy_purge.py:26-78` / `run_purge_batch:113-218` 精読（処理順序・対象条件・SALT 挙動） + Supabase MCP execute_sql で dev/prod の profiles テーブルを集計クエリ（privacy_purged_at/real_name/student_number/hash の状態組み合わせ）で照合 + 事故行詳細クエリで PII 未入力テストユーザーと確認

**⚠️ 未確認（→ [4.6] で対応）**: PRIVACY_HASH_SALT が Render 本番ダッシュボードに設定済みかを目視確認（今回は ok_purged=11件の有意hash から「推定設定済み」と判断。正式確認は [4.6] で）

#### [4.4] / [4.5] / [4.6] / [4.7] / [4.8] / [4.9] 2026-06-03 ✅

**[4.4] EXIF 削除（fail-close 修正込み）**
- 確認方法: `profile.py` の `_strip_exif`（line 31-44）と呼び出し3箇所（line 250/359/484）を精読。フロント全4ページの canvas 処理（`ProfileEditPage.tsx:62`・`SetupRequiredPage.tsx:141`・`SetupOptionalPage.tsx:49`・`cropImage.ts:35` → `compressImage` で JPEG 変換）を grep＋コード精読で確認。
- 結果: JPEG は `exif=b""` で EXIF チャンク全体を空に上書き（GPS 含む全削除）。フロント全経路が `canvas.toBlob(..., 'image/jpeg', 0.8)` で JPEG に変換してから送信するため、実際の upload はほぼ全て JPEG 経路を通る。
- **修正（A fail-close 化）**: `except Exception: return data`（旧: EXIF 付き元データをそのまま返す fail-open）→ `raise HTTPException(status_code=422, detail="画像の処理に失敗しました")`（新: Pillow 処理失敗時に元データを返さず 422 で拒否）。変更: `profile.py:43` のみ。`py_compile` OK・`git diff` で変更箇所が1行のみであることを確認。
- ⚠️ 繰り延べ [15.1]: 実機での EXIF 無し確認（JPEG をアップして EXIF Viewer で GPS が消えていることを確認）は E2E で実施。

**[4.5] 退会済みユーザーの匿名表示・dead code 去就**
- 確認方法: `match.py:100-108` の is_deleted 分岐・`privacy_purge.py:81` の `purge_deleted_user_messages()` を精読。`privacy_purge.py:82` のコメントと [4.2] の CASCADE 調査結果と照合。
- 結果: 実退会では auth.users 削除 → profiles/matches 即時 CASCADE 削除のため、`is_deleted=True` に到達する経路が構造上存在しない（dead code 確認）。`purge_deleted_user_messages()` も同様（コメント明記済み・`run_purge_batch` から呼ばれるが対象行ゼロ）。
- 設計方針: [4.2] でオーナーが「CASCADE 全消しをプライバシー優先の正式仕様」として確定済み。dead code 2件の去就は IDEAS「ブロック時のデータ物理削除」実装時に決定。コード変更なし。

**[4.6] PRIVACY_HASH_SALT コード設計確認**
- 確認方法: `config.py:28`（Field 定義）・`privacy_purge.py:26-33`（`_hash` 関数）を精読。
- 結果: `Field(default="", alias="PRIVACY_HASH_SALT")` で env 読み。ハードコードのデフォルト SALT なし（空文字はデフォルトの「無設定」を意味する）。未設定時: `settings.privacy_hash_salt` が falsy（空文字）→ logger.error + `return None`（hash が NULL・危険な空文字ハッシュにはならない）。PII 削除（real_name/student_number を NULL 化）は SALT の有無に関わらず続行する fail-safe 設計。コード変更なし。
- **✅ 実値確認済み（2026-06-03）**: オーナーが Render ダッシュボードで dev・prod の `PRIVACY_HASH_SALT` を目視確認。(a) 両方設定済み・(b) 別値であることを確認。[4.3] の ok_purged=11件の有意ハッシュとも整合。

**[4.7] login_history 書き込み未実装（意図的β後見送り）**
- 確認方法: `backend/app/**/*.py` を `login_history` で grep → 0件。`migrations/019_login_history.sql` でテーブル定義を確認（id/user_id/ip_address/user_agent/logged_in_at）。
- 結論: 書き込みコードが存在しない事実を再確認。β 50〜100人規模では監査ニーズが低く実装コスト対効果が合わない（Supabase Auth Logs で代替可能）。「空テーブルの無意識放置」ではなく「将来実装を想定した意図的保留」として方針確定。本番後に「Supabase Auth Webhook で実装 or テーブル削除」を判断。コード変更なし。

**[4.8] データエクスポート（β不要と確定）**
- 確認方法: `backend/app/routers/` 全 `.py` を `export` で grep → 0件。エンドポイントなし。
- 結論: APPI（個人情報保護法）は自動エクスポート機能の実装義務なし（開示請求への応答義務はあるが自動化は不要）。β 規模は Supabase Studio 手動対応で代替可能。本番前評価リスト（カテゴリ17）に登録済み。コード変更なし。

**[4.9] 漏洩時通報手順（本番前対応）**
- 結論: β 段階は不要。本番リリース前にカテゴリ12（法的チェック）と合わせて「個人情報保護委員会への通報手順」を docs/DEPLOY.md または法務書類に文書化する。コード変更なし。

#### [4.2] 2026-06-02 ✅

**退会時の全データ削除フロー（file:line + FK CASCADE 調査）**

`DELETE /api/profile/me`（`profile.py:735-827`）の実行順序:

```
[a] profile_images レコード取得（profile.py:742-754）
[b] Storage profile-images バケットから全ファイル物理削除（profile.py:757-761）
[c] profile_images テーブルから全レコード物理削除（profile.py:764-769）
[d] student_id_image_path を Storage student-ids バケットから物理削除（profile.py:772-789）
[e] profiles ソフトデリート: status='deleted' + PII NULL化（profile.py:793-813）
[f] auth.users 物理削除（profile.py:817）→ FK CASCADE 即時発火
```

**[f] auth.users 削除時の CASCADE（Supabase MCP pg_constraint で確認済み）**

| テーブル | CASCADE ルール | 削除対象 |
|---|---|---|
| profiles | CASCADE | 本人行（step[e] の status='deleted' 行も即時物理削除） |
| likes | CASCADE | 送受信とも全件 |
| matches | CASCADE | 本人が関わる全マッチ → messages/message_reactions も連鎖 |
| messages | CASCADE | sender_id 経由でも直接削除 |
| message_reactions | CASCADE | messages 連鎖 + user_id 経由 |
| profile_images | CASCADE | step[c] で既に削除済み（二重保護） |
| blocks | CASCADE | blocker/blocked 両方向 |
| reports | CASCADE | reporter/reported 両方向 |
| hides | CASCADE | hider/hidden 両方向 |
| profile_views | CASCADE | viewer/viewed 両方向 |
| notifications（受信） | CASCADE | user_id 経由 |
| notifications（マッチ連鎖） | CASCADE | match_id → matches CASCADE 経由 |
| login_history | CASCADE | （書き込みなし・ゼロ件） |
| admin_logs | CASCADE | admin_id 経由（ユーザーが管理者だった場合のみ） |
| inquiries | CASCADE | subject/body 内の PII も消える |
| push_subscriptions | CASCADE | profiles 経由（端末トークン消去） |
| like_quota | CASCADE | profiles 経由 |
| user_inventory | CASCADE | profiles 経由 |
| auth.sessions | CASCADE | auth スキーマ内（再ログイン不可） |

SET NULL（記録残存・PII最小）:
- notifications.from_user_id → SET NULL（相手の受信済み通知は残るが from_user_id=NULL で匿名化）
- profiles.banned_by / reports.resolved_by / inquiries.replied_by → SET NULL

**検証結果:**

| 確認項目 | 結果 |
|---|---|
| Storage profile-images 物理削除 | ✅ `profile.py:759` `.remove(profile_image_paths)` |
| Storage student-ids 物理削除 | ✅ `profile.py:785` `.remove([sid_path])` |
| profiles PII NULL化（5カラム） | ✅ `profile.py:797-806` name/bio/real_name/student_number/birth_date/profile_image_path/student_id_image_path = None |
| auth.users 削除 | ✅ `profile.py:817` `supabase.auth.admin.delete_user(user_id)` |
| FK CASCADE 全テーブル | ✅ Supabase MCP `pg_constraint` 全件確認（dev 2026-06-02） |
| migration 042 適用（CHECK 'deleted'） | ✅ dev/prod 両方で `pg_get_constraintdef` 確認済み（2026-06-02） |
| inquiries（PII 含む body）削除 | ✅ `inquiries.user_id → auth.users.id CASCADE`（migration 036） |
| push_subscriptions（端末トークン）削除 | ✅ `profiles.id CASCADE` 経由 |

**発見: dead code + 設計乖離（PII 漏洩ではない）**

1. **`purge_deleted_user_messages()`（privacy_purge.py:81）が dead code**: auth.users 削除後に profiles.status='deleted' 行はゼロ・messages も CASCADE 即時削除済みのためこのバッチは常に 0件
2. **match.py の is_deleted 表示が実退会では機能しない**: auth.users 削除で matches が CASCADE 削除されるため match partner はマッチが消えたように見える（is_deleted="退会済み" 表示ではない）→ [4.5] で設計レビュー要
3. **migration 042**: dev/prod 両方で適用済みを MCP で確認（ARCHITECTURE.md の stale 記録を訂正）

**確認方法:** `profile.py:735-827` / `privacy_purge.py` / `migrations/007-019-036` 精読（FK CASCADE 定義）+ Supabase MCP で全 public テーブルの FK CASCADE ルールを `pg_constraint` から取得 + dev の migration 042 / profiles_status_check を SELECT で確認

#### [3.4] 2026-06-02 ✅

**調査結果（静的確認＋実機 curl dev 実証）**

**A: authenticated JWT 直叩き dev 実機結果（代表テーブル × SELECT）**

| テーブル | SELECT | 結果 |
|---|---|---|
| profiles | GET `/rest/v1/profiles?select=*&limit=1` | 403 ✅ |
| messages | 同上 | 403 ✅ |
| likes | 同上 | 403 ✅ |
| matches | 同上 | 403 ✅ |
| blocks | 同上 | 403 ✅ |
| user_inventory | 同上 | 403 ✅ |

**B: IDOR（他人の行を直接狙う）dev 実機結果**

ユーザーX の JWT でユーザーY（UUID: `49ea4256-…`）の profiles 行を直接指定:

| 操作 | レスポンス |
|---|---|
| GET `?id=eq.{Y_uuid}` | 403（`42501 permission denied for table profiles`）✅ |
| PATCH `?id=eq.{Y_uuid}` | 403（同上）✅ |
| DELETE `?id=eq.{Y_uuid}` | 403（同上）✅ |

レスポンス本文に `"permission denied for table profiles"` + `GRANT ... TO authenticated` 証跡 → **GRANT 層で拒否・RLS に未到達**を実証。

**レスポンスコードの解釈:** 403（Forbidden）= JWT は認証済みだが権限なし（認証は成立・DML GRANT なし）。401（Unauthorized・未認証）とは別物。正規ログイン済みユーザーでも DML GRANT ゼロのため PostgreSQL `42501` → PostgREST 403。

**C: 静的確認（GRANT 状態 + ポリシー qual）**

| 確認項目 | dev | prod |
|---|---|---|
| authenticated DML GRANT（information_schema.role_table_grants） | `[]`（DML ゼロ）✅ | `[]`（DML ゼロ）✅ |
| authenticated 向け RLS ポリシー qual の自分縛り | 9本全て auth.uid() 縛り ✅ | 同上（dev と完全一致）✅ |
| service_role ポリシー（正規動作・無影響確認） | 17本 ALL PERMISSIVE 変更なし ✅ | — |

**authenticated 向け RLS ポリシー一覧（dev/prod 完全一致）:**

| テーブル | ポリシー名 | 操作 | qual / with_check | 自分縛り |
|---|---|---|---|---|
| blocks | blocks_select_own | SELECT | `auth.uid() = blocker_id` | ✅ |
| blocks | blocks_insert_own | INSERT | with_check: `auth.uid() = blocker_id` | ✅ |
| hides | hides_self | ALL | `auth.uid() = hider_id` | ✅ |
| inquiries | users read own inquiries | SELECT | `user_id = (SELECT auth.uid())` | ✅ |
| login_history | authenticated select own | SELECT | `user_id = auth.uid()` | ✅ |
| message_reactions | match members can select reactions | SELECT | EXISTS(messages m JOIN matches mt WHERE user_a/b_id = auth.uid()) | ✅ |
| notifications | authenticated select own | SELECT | `user_id = auth.uid()` | ✅ |
| notifications | authenticated update own | UPDATE | `user_id = auth.uid()` / with_check: 同 | ✅ |
| profiles | users can view own profile | SELECT | `auth.uid() = id` | ✅ |

**RLS 単独の堅牢性（GRANT が将来復活した場合の保険）:** 全 9 ポリシーが `auth.uid()` で自分の行にのみ縛られている。他人の行への SELECT/INSERT/UPDATE は不可。UPDATE/DELETE は notifications・hides の自分行のみ。

**確認方法:** authenticated JWT（ユーザーX・dev）で代表テーブル 6本 SELECT → 全て 403（GRANT 層拒否を実機実証）+ 他人（ユーザーY UUID）の profiles 行 SELECT/PATCH/DELETE → 全て 403（`42501` 本文で GRANT 層拒否の明示）+ Supabase MCP execute_sql で dev/prod `information_schema.role_table_grants`（DML 0件）+ `pg_policies`（authenticated ポリシー qual 全件）静的確認

#### [3.3] 2026-06-02 ✅

**調査結果（全テーブル × 4操作 × dev/prod）**

| テーブル | 行数(dev) | dev SELECT | dev INSERT | dev UPDATE | dev DELETE | prod 全操作 |
|---|---|---|---|---|---|---|
| profiles | 40 | 200[] | 401✅ | 204 | 204 | 401✅ |
| blocks | 14 | 200[] | 401✅ | 204 | 204 | 401✅ |
| likes | 32 | 200[] | 401✅ | 204 | 204 | 401✅ |
| matches | 16 | 200[] | 401✅ | 204 | 204 | 401✅ |
| profile_images | 49 | 200[] | 401✅ | 204 | 204 | 401✅ |
| like_quota | 35 | 200[] | 401✅ | 204 | 204 | 401✅ |
| profile_views | 1 | 200[] | 401✅ | 204 | 204 | 401✅ |
| user_inventory | 14 | 200[] | 401✅ | 204 | 204 | 401✅ |
| messages/reports/hides 等 9テーブル | 0 | 200[] | 401✅ | 204 | 204 | 401✅ |

**dev 初期結果の分析:**
- `200[]`: anon に SELECT GRANT があるため PostgreSQL まで到達、RLS が全行隠蔽 → データ非開示（実害なし）
- `204`（UPDATE/DELETE）: anon に DML GRANT があり SQL は実行されるが RLS が対象行をゼロにする → 実データ変更ゼロ（profiles 実在 UUID で DELETE 後も行が残ることを service_role で確認済み）
- **根本原因**: dev は Supabase デフォルト GRANT で anon/authenticated に全 DML が付与されていた（`ALTER DEFAULT PRIVILEGES` による自動付与）

**prod は全 16 テーブル × 4操作 = 401✅（GRANT 層で完全拒否）**

**修正（案B: migration 045）:**
- `REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon, authenticated`
- `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated`（postgres grantor 分）
- supabase_admin grantor 分は `42501 permission denied` で revoke 不可 → マイグレーションが postgres ロール実行のため新規テーブルへの影響なし

**修正後の確認（dev）:**
- 代表テーブル（profiles/blocks/likes/matches/profile_images/messages）anon SELECT/INSERT/DELETE → 全て 401✅
- service_role（FastAPI dev /health）→ 200 ✅ アプリ無影響
- GRANT 再確認: anon/authenticated = REFERENCES/TRIGGER/TRUNCATE のみ（DML なし）/ service_role = 全 DML 維持 ✅

**確認方法:** anon curl 全テーブル × 4操作 × dev/prod + migration 045 revoke + GRANT 再確認 + /health 疎通

#### [3.2] 2026-06-02 ✅
- 確認方法（DROP 前）: Supabase MCP pg_policies SELECT で dev/prod 両環境の4ポリシー実在を確認。`information_schema.role_table_grants` で GRANT 状況も確認。prod anon キーで messages curl（Step A）
- 発見した4ポリシー（dev/prod 共通・prod のみ指摘あり）:
  - `hide_messages_with_deleted_user` ON messages: roles=`{public}` PERMISSIVE SELECT
  - `match participants can view messages` ON messages: roles=`{authenticated}` SELECT（prod 手動ポリシー）
  - `blocks_delete_own` ON blocks: roles=`{authenticated}` DELETE
  - `reports_self` ON reports: roles=`{authenticated}` ALL
- **GRANT 層の追加発見（重要）**: anon・authenticated とも 3テーブルに SELECT/INSERT/UPDATE/DELETE なし（REFERENCES/TRIGGER/TRUNCATE のみ）。curl Step A: `42501 permission denied`（GRANT 層で RLS に到達せず）。すなわち4ポリシーは **dead code** = 即時インシデントではなく「将来 GRANT が誤追加された際に悪用可能になる latent 脆弱性」
- 対応（案A: 4ポリシー DROP・再作成なし）:
  - 根拠: GRANT dead code のポリシーを残すと「GRANT 追加の瞬間に穴が開く」ラッチン構成になる。フロントは `supabase.from` 非使用（grep ゼロ）のため再作成不要
  - migration 044（`044_fix_rls_policies.sql`）を作成し `DROP POLICY IF EXISTS` で冪等に4本 DROP
  - dev: MCP apply_migration 2026-06-02 適用済み / prod: MCP apply_migration 2026-06-02 適用済み
- 確認方法（DROP 後・dev/prod 両方）:
  - pg_policies SELECT: messages=service_role のみ / blocks=blocks_select_own+blocks_insert_own+blocks_service_role / reports=reports_service_role のみ ✅（dev/prod 両環境で確認）
  - curl Step C（prod anon）: `42501 permission denied`（GRANT 層は変わらず・RLS も不在でポリシー完全消去を確認） ✅

#### [3.1] 2026-06-01 ✅
- 確認方法: Supabase MCP `execute_sql` で dev（hpkpndjqtzycnytymdkk）・prod（fspbzagpilhjorfdvtxe）両環境に同時クエリ（`pg_class` + `pg_namespace` + `pg_policies` 結合）
- 結果: dev 17テーブル・prod 16テーブルで全て `rls_enabled=true` / `policy_count=0` テーブルなし。RLS 無効テーブルゼロ → **修正不要**
- 副次的差分（3.2 スコープに申し送り）:
  - `user_inventory`: dev のみ存在（migration 043 が dev に適用済み・prod は未適用。ARCHITECTURE.md §8 の「dev 未適用」記述が stale → 訂正済み）
  - `like_quota` prod: "service_role full access" と "service_role full access on like_quota" の2本重複（機能上無害・整理候補）
  - `messages` prod: "match participants can view messages"（authenticated SELECT）が prod のみ存在（migration 外の手動ポリシー・3.2 で詳細評価）
- anon キーリスク: フロントに `VITE_SUPABASE_ANON_KEY` が乗るが全テーブル RLS 有効のため追加防御ラインは機能している

#### [5.1] 2026-06-03 ✅

**メアドドメイン制限 DB トリガー実在確認（dev/prod 両環境 introspection）**

- 確認方法: Supabase MCP `execute_sql` で dev（hpkpndjqtzycnytymdkk）・prod（fspbzagpilhjorfdvtxe）各3クエリ（`pg_trigger` / `pg_proc.prosecdef+proconfig` / `pg_get_functiondef`）を並列実行

| 確認項目 | dev | prod |
|---|---|---|
| トリガー実在・対象テーブル・有効状態 | `enforce_email_domain_on_signup` / `auth.users` / `tgenabled=O` ✅ | 同上 ✅ |
| SECURITY DEFINER（`pg_proc.prosecdef`） | `true` ✅ | `true` ✅ |
| search_path 固定（`pg_proc.proconfig`） | `["search_path=public"]` ✅ | `["search_path=public"]` ✅ |
| 照合条件（`pg_get_functiondef`） | `ILIKE '%@ecs.osaka-u.ac.jp'`・BEFORE INSERT・RAISE EXCEPTION check_violation ✅ | ロジック完全一致 ✅ |

- 差分（1件・無害）: `pg_get_functiondef` の出力で prod のみ関数本体のインデントが2スペース。照合条件・ERRCODE・発火条件は完全一致。
- **Supabase のドメイン制限手段について**: Supabase Auth に「許可メールドメインを設定するネイティブのダッシュボード項目」は存在しない（Authentication → Settings に Allowed email domains のような設定項目はない）。ドメイン制限の公式な手段は (1) `auth.users` への DB トリガー（Cro-co が採用・今回確認済み）または (2) Before User Created 認証フック（Auth Hooks）の2通りで、両者は役割が重複する。Cro-co のトリガー実装は公式推奨そのものであり追加設定は不要。Auth Hook は任意の代替（β 不要）。
- **結論**: 「最後の砦」は dev/prod 両環境に実在・有効。フロントをバイパスして Supabase Auth API を直叩きしても `BEFORE INSERT ON auth.users` トリガーが `check_violation` 例外で登録を中断する。
- ⚠️ 繰り延べ [15.1]: 実機 signUp 直叩き（`@gmail.com` が HTTP 400 で弾かれるか curl で確認）は E2E で実施。

---

#### カテゴリ6（レート制限・DoS・大量データ）2026-06-03 ✅

**[6.1] ✅ 全エンドポイントへの rate limit 追加**
- 確認方法: `grep -r "@limiter\.limit" backend/app` で全16箇所を目視確認
- 対応内容: 追加8本（`POST /api/profile/photos` `20/min;100/hour` / `POST /api/profile/upload-avatar` `20/min;100/hour` / `GET /profiles/recommended` `30/min` / `GET /profiles/{id}` `60/min` / `GET /matches/unread-count` `60/min` / `DELETE /matches/{id}` `20/min` / `POST /safety/block` `20/min` / `POST /messages/{id}/react` `60/min`）。Admin 26本は require_admin 保護のため優先度最低・本番前検討。ログイン/サインアップ/リセットは Supabase Rate Limits 管理（[2.10] 確認済み）のため slowapi 対象外・穴なし。
- ⚠️ 未検証・繰り延べ [15.x]: JWT で各 EP を叩いて 429 が返ることの実機確認は E2E で実施

**[6.2] ✅ XFF 偽装バイパス不可・ユーザー単位キーに変更**
- 確認方法: `limiter.py` の `key_func` が `_get_user_key` になっていること・`DEPLOY.md` start command に `--proxy-headers`/`--forwarded-allow-ips` がないことを grep 確認
- 対応内容: `limiter.py` を `key_func=_get_user_key`（JWT sub → `user:{sub}`, フォールバック → `ip:{remote}`）に変更。XFF は意図的に信頼しない方針を維持（`get_remote_address` は proxy ヘッダを読まない）。**これにより per-ユーザー単位のバケツが実現し、グローバルバケツ問題も同時解消**。学内 Wi-Fi で同一 IP を共有する正規ユーザーが互いの枠を潰し合う問題を回避。
- ⚠️ 未検証・繰り延べ [15.x]: 学内同一 IP でもユーザーごとに別カウントになることの実機確認は E2E で実施

**[6.3] ✅ 大量データ攻撃対策**
- 確認方法: `browse.py` の hometowns バリデーション追加を目視確認・`main.py` に `BodySizeLimitMiddleware` が追加されていること確認
- 対応内容: (1) `GET /api/profiles` の `hometowns: list[str]` に件数上限 ≤20 / 各要素 max_length=50 のアプリ層バリデーション追加（`browse.py:87-100`）。(2) `BodySizeLimitMiddleware`（`main.py:50-70`）: JSON/テキスト系のボディに 256KB 上限（Content-Length ヘッダー検査）。multipart/form-data は除外し 5MB 画像アップロードに影響なし。Pydantic スキーマは既存で概ね塞がれていることを確認済み（message 1000文字・inquiry body 2000文字・profile フィールド各上限等）。
- ⚠️ 未検証・繰り延べ [15.7]: 実機でボディ 300KB 送信 → 413 / 5MB 画像 → 通過の確認は E2E で実施
- 残: BodySizeLimitMiddleware は Content-Length 検査のため chunked 転送では素通りしうる。Pydantic フィールドの max_length が実効ブレーキとして残るため β 許容。本番前に「Content-Length 無し時は読み取りバイト数で打ち切る」強化を検討。

**[6.4] ✅ レースコンディション（静的調査でクローズ）**
- 根拠:
  - 二重マッチ: `detect_match` トリガー（`migrations/008_matches.sql:58-63`）が PostgreSQL 内で原子的に実行。`INSERT ... ON CONFLICT (user_a_id, user_b_id) DO NOTHING`（:63）＋ `UNIQUE (user_a_id, user_b_id)` 制約（`009_messages.sql:21`）で DB レベルで二重マッチを防ぐ。修正不要。
  - 在庫負数化: `consume_like_stock`（`inventory.py:77-103`）が楽観的ロックパターン（`WHERE quantity=current`）＋ DB `CHECK(quantity >= 0 AND quantity <= 10000)`（`migration 043:11`）で保護。修正不要。
  - like_quota race condition: `like.py:203-205` の `used_count` 更新が楽観ロックなしの read-modify-write → 理論上 5件制限が 6件になりうる。ただし現在 `LIKE_QUOTA_ENABLED=false` で無効。再ON時の修正必須項目として IDEAS.md の「BeReal型いいね受信枠」再ON方法に追記済み（2026-06-03）。

**[6.5] ✅ 大量ファイルアップロード対策（静的調査でクローズ）**
- 根拠: 全3アップロード経路（`/upload-student-id` / `/upload-avatar` / `/photos`）で Pillow デコード前に `len(file_bytes) > _MAX_FILE_SIZE`（`profile.py:245/354/479`）を実施。Supabase Storage バケット `file_size_limit=5MB` がバックストップ。Pillow v12.2.0 デフォルト `MAX_IMAGE_PIXELS = 178M` の解凍爆弾保護が有効（コードで無効化なし）・超過時は `except Exception: raise HTTPException(422)` で fail-close（`profile.py:43-44`）。修正不要。

**[6.6] ✅ WebSocket（β 受容・本番前申し送り）**
- 根拠: `ws_manager.py:12-16` に接続数・メッセージレート/サイズ上限なし。ただし接続前に match 参加者チェック（`ws.py:41-56`）で無関係ユーザーは接続不可。β 50〜100人・チャットは 2名限定のため実害なし。
- 申し送り: 本番前タスク「WS 同時接続数上限・メッセージレート/サイズ上限設定」を ROADMAP カテゴリ17 に登録予定（カテゴリ17 消化時に追加）。

#### カテゴリ7（AI 生成コード固有の落とし穴）2026-06-03 ✅

**[7.4] ✅ safety.py:86 の `except Exception: pass` を fail-close 化**
- 確認方法: `grep "except Exception:" safety.py` で `:86` 箇所が `logger.error(...)` に変わったことを確認
- 対応内容: ブロック後 match 削除の失敗を無言で握りつぶしていた `pass` を `logger.error("ブロック後の match 削除に失敗（孤立 match の可能性）blocker=%s blocked=%s: %s", me, target, e)` に変更（`safety.py:89`）。ブロック自体（blocks INSERT）は成功済みのため巻き戻し不要。match 孤立時も `GET /matches/` と `/messages/` の block フィルタで表示から除外されるため直接の機能漏洩はないが、DB 不整合として管理者が把握できるようログを残す。PII（名前等）を乗せず user_id のみ記録。
- ⚠️ 未検証・繰り延べ [15.x]: ブロック実行時に match 削除が失敗した場合の logger.error 出力の実機確認は E2E で実施

**[7.13] ✅ POST /api/push/test に rate limit 追加**
- 確認方法: `grep "@limiter.limit" push.py` で `5/minute` が付いたことを確認。`grep "push/test" frontend/src/pages/SettingsPage.tsx` でフロントからの正規呼び出しを確認
- 対応内容: `@limiter.limit("5/minute")` と `request: Request` を追加（`push.py:61-64`）。`Request` と `limiter` の import も追加。`/test` という命名について: `SettingsPage.tsx:385` から呼ばれる正規 UI（設定画面の「通知テスト」ボタン）であり削除・改名は不要と判断（デバッグ残滓ではなく正規機能）。
- ⚠️ 未検証・繰り延べ [15.x]: push/test を連打して 429 が返ることの実機確認は E2E で実施

**[7.14] ✅ 未使用コード掃除**
- 確認方法: `grep "Response\b" browse.py` で import 行以外にゼロ件・`grep "logger\." limiter.py` で参照あり確認
- 対応内容: (1) `browse.py:5` の `Response` 未使用 import を削除（`ProfileViewsResponse` は Pydantic モデルで別物）。(2) `limiter.py` の `except Exception: pass` を `except Exception: logger.debug("rate limit key fallback to IP...", exc_info=True)` に変更し、logger 未使用を解消 + IP フォールバック発生を debug ログで可視化。
- 据え置き: `config.py:18` の `secret_key` は dead config だが §5 対象ファイル。削除には §5 限定解除のオーナー承認が必要のため据え置き。`match.py:108` is_deleted / `privacy_purge.py:81` は IDEAS 連動保留（HANDOFF §5 に登録済み）。

#### カテゴリ8（Cro-co アプリ固有の懸念）2026-06-03 ✅（8.5 を除く）

**[8.1] ✅ 身バレ防止が全6経路で効いているか**
- 確認方法: 全6経路（`/profiles`・`/recommended`・`/profiles/{id}`・`/profiles/views`・`/likes/received`・`POST /likes/`）を grep で identity_hide 関数呼び出しを全件確認
- 結果: 全6経路で `is_hidden_between` / `get_hidden_user_ids_for` / `is_hidden_from_viewer` のいずれかを正しく呼び出し。`identity_hide.py` の fail-close（APIError → raise または return True）が維持されていることを確認。修正不要。
- ⚠️ 未検証・繰り延べ [15.x]: 同学部相手の各経路 404/除外が実機で動作することの確認は E2E で実施

**[8.2] ✅ ブロック解除不可が DB レベルで担保されている**
- 確認方法: `safety.py:93-102`（DELETE→常時 403）を目視。`blocks` テーブルの authenticated GRANT ゼロを [3.4] 証跡で確認。フロント `grep "DELETE.*block\|unblock"` が 0件。
- 結果: アプリ層（DELETE /safety/block 常時 403）+ DB GRANT 層（authenticated DELETE 権なし）の二層でブロック解除不可を確認。フロントに解除導線なし。修正不要。

**[8.3] ✅ 写真審査バイパス不可（pending 写真が他人に見えない）**
- 確認方法: `py_compile` 全変更ファイル OK。grep で W1 削除・W4 削除・W2 `.eq("status","approved")` 追加・W3 422 check 追加・R4 `approved_paths` 二重防御を確認。
- 対応内容（Option B 不変条件実装）:
  - W1 `profile.py:558-570` 削除: 初回アップロード時の自動セットを除去（pending が `profile_image_path` に入る経路を遮断）
  - W2 `profile.py:566-573` 修正: メイン写真削除時の後継選択に `.eq("status","approved")` 追加（pending/rejected の繰り上げを防止）
  - W3 `profile.py:812/839-842` 修正: set-main 時に photo の `status='approved'` を確認し 422（API 直叩きバイパスを塞ぐ）
  - W4 `profile.py:342-399` 削除: `POST /upload-avatar`（審査スキップ経路・フロント呼び出し元 grep 0件確認済み）を全除去
  - R4 `browse.py:705-711` 追加: `GET /api/profiles/{id}` の `avatar_url` に二重防御（取得済み approved photos セットと照合、不一致なら先頭フォールバック）
  - R2/R3/R5/R6/R7: 不変条件依存（コメント一行追加）
  - W6 `admin.py:1100-1103` 変更不要: `profile_image_path=NULL` のときのみ承認パスをセット → W1 削除後は「初回承認 = 初めてメインになる」導線が自動的に成立
- 設計: 本人向け（`/api/profile/me`・ProfileEditPage の photos 配列）は `_fetch_photos` が全ステータス返すため pending 写真を引き続き表示可能。
- ⚠️ 未検証・繰り延べ [15.x]: 以下の実機確認は E2E で実施: ①pending 写真が他人向けエンドポイントに出ないこと ②承認後に他人向けで表示されること ③自分には審査中も見えること ④set-main 直叩きで pending → 422 ⑤`POST /upload-avatar` が 404 になること（エンドポイント削除済み）

**[8.4] ✅ マッチ自動解除の整合性（messages dangling なし）**
- 確認方法: migration 009 `messages.match_id REFERENCES public.matches(id) ON DELETE CASCADE` を確認。`safety.py`（ブロック時 matches.delete）・`match.py`（アンマッチ時 matches.delete）の削除経路を目視。
- 結果: matches 削除 → messages CASCADE 削除の連鎖が migration で担保。dangling messages を生む経路なし。修正不要。

**[8.5] 🟡 β受容（β後対応）**
- 判断: `reports` テーブルに `UNIQUE(reporter_id, reported_id)` なし。rate limit 10/min（ユーザー単位）は機能。安全インシデントではなく管理画面ノイズ問題のため β 受容。
- 対応: IDEAS.md に「通報の重複抑止」項目を登録済み。β後に `UNIQUE` 制約 + アプリ層 upsert で対応予定。

**[8.6] ✅ 通報警告通知で通報者の身元が漏れない**
- 確認方法: `admin.py:727-735` を目視。`from_user_id=None`・`message_preview` に通報者 user_id/名前/理由/内容が含まれないことを確認。
- 結果: 通報者の身元漏洩なし。修正不要。

**[8.7] ✅ マッチ前のメッセージ送信不可**
- 確認方法: `message.py` の全メッセージエンドポイント（送信・取得・リアクション・既読）が `_assert_match_member` を先頭で呼ぶことを目視確認。`ws.py:41-55` の接続前チェックも確認。
- 結果: マッチ行が存在しなければ 404・非メンバーは 403。WS は close(4003)。マッチ前送信経路なし。修正不要。

**[8.8] ✅ 直リンク経由のプロフィール閲覧が身バレ判定を通過する**
- 確認方法: `browse.py:get_profile` の①approved ガード ②ターゲット approved チェック ③身バレ判定(fail-close) ④ブロック判定(fail-close) を目視。photos 配列の `status='approved'` フィルタを確認。
- 結果: 全ガードが正しく適用。[8.3] の R4 二重防御で avatar_url の pending 漏れも解消。修正不要。

**[8.10] ✅ 足跡経由いいね（無料）の悪用防止**
- 確認方法: migration 028 `should_count_quota` RPC（:47-56）を精読。`p_via_footprint=true` 時に `profile_views` テーブルの実在確認 SQL が存在することを確認。
- 結果: 足跡未実在での `via_footprint=true` 偽申告は `RETURN true`（在庫消費対象）になり迂回不可。修正不要。

**[8.11] ✅ 送信在庫の補償処理が正しく動く（+ refund ログ化）**
- 確認方法: `like.py` の refund_like_stock 呼び出し 3経路（重複・APIError・空結果）を目視。`inventory.py:refund_like_stock` の `except Exception` を確認。
- 対応内容: `inventory.py:refund_like_stock` の `except Exception: pass` を `except Exception: logger.warning("like stock refund failed user=%s", user_id, exc_info=True)` に変更（`inventory.py:126`）。logger および import logging を追加。PII 不可・UUID のみ記録。挙動は変えず可視化のみ（在庫1件ロストは安全上許容）。
- ⚠️ 未検証・繰り延べ [15.x]: refund 失敗シナリオ（Supabase 一時障害中にいいね）の実機確認は E2E で実施

### UTopia 事案の教訓（参考）
2026年4月にリリースされ1週間で事実上終了したマッチングアプリ。バイブコーディング製コードに以下の致命的脆弱性があった:
1. 認証なしで全ユーザーデータを JSON 取得可能
2. マイナンバー画像が公開ストレージに保管
3. メールドメイン制限がクライアント側のみ
4. ユーザー側で認証ステータスを書き換え可能
5. 課金アイテムが int max まで購入可能（上限チェックなし）
6. service_role キーがフロント JS に埋め込み
7. インターネット異性紹介事業届出番号がサイト未掲載

Cro-co では 2026年5月時点の監査で 1〜6 は対策済みを確認。7 は β 前に対応予定。

---

## 8. βリリースまでのフロー（2026-05-27 確定）

クローズドテストは実施せず、β一本に集中する。下記5 step を順に消化する。

### Step 1: 機能・UI 面で β 版を完成
**目的**: β として最低限「動いて見た目が整っている」状態にする。

**作業項目:**
- ✅ 身バレ防止を全経路サーバー側で適用（2026-05-27 完了・`identity_hide.py`。⚠️ dev 実機 curl 検証は未実施）
- ✅ 探索タブ UI 改善（2026-05-27 完了・検索バー + 詳細検索 + 文理検索。⚠️ FastAPI 実 HTTP curl は未実施。dev シードでの SQL 検証 + PostgREST クエリ実送信 200 は完了）
- ✅ 非表示一覧ページ新設（2026-05-28 完了・`/settings/safety` 非表示タブ。⚠️ 実機ハードリロード確認は別途）
- ✅ ブロック一覧を別ページへ分離（2026-05-28 完了・`/settings/safety` ブロックタブ・設定画面は入口リンク2カード化。⚠️ 実機ハードリロード確認は別途）
- ✅ プロフィール見え方改善（2026-05-27 完了・さがすカード固定サイズ化＋詳細ページ3段構成＋学部学科の文理表示化＋メイン写真先頭。⚠️ 実 HTTP curl 未実施）
- ✅ アプリ内お問い合わせ受け口（2026-05-28 完了・フェーズ1・テキスト版・`/settings/contact`・管理者メール通知 ON。⚠️ 実機未確認。画像添付はフェーズ2残）
- ✅ アプリアイコン（2026-06-05 完了・Croco マーク mint `#A8F0D1` 背景 + 黒シルエット・favicon/PWA/ホーム追加アイコン統一）
- ✅ GitHub Branch Protection 設定（2026-05-27 完了・新形式 Repository Rulesets）

**完了条件:**
- 上記全項目が dev で動作確認済み
- 身バレ防止が curl での API 直叩きでも漏れないことを確認（フロント経由で隠すだけの実装は不可）
- 該当 PR が main へマージ済み

### Step 2: β版である旨の明記 ✅（2026-05-28 完了・⚠️ 実機確認はオーナー側）
**目的**: ユーザーに β である状況をさらっと伝える（個人情報保護は通常通り行うため過度に不安を煽らない）。

**作業項目:**
- [x] ランディングページの目立つ位置に「β版」表示（ヒーロー説明文直後・bg-acid ボックス「いまβ版。たまにつまずくかも。」）
- [x] 初回登録フローの最初の画面に「β版」を表示（ようこそ STEP 0 ボタン直上・中立※フットノート「※ Cro-coは現在β版です。正式リリースは2026年10月…」）
- [x] 同意チェックボックスは置かない

**完了条件:**
- [x] ランディングと初回登録の両方で β 表示が確認できる（コード上 grep で想定2箇所のみ確認・`tsc -b`+`vite build` 成功）
- [x] 文面が過度に不安を煽らない（さらっとした表現）
- ⚠️ スクショで両方の画面を記録（実機ハードリロードでの目視確認はオーナー側で別途）

### Step 3: セキュリティチェック（超厳重）
**目的**: UTopia 事案の教訓を踏まえ、あらゆる手段で脆弱性を潰す。

**作業項目:** セクション7「リリース前セキュリティチェックリスト」を全項目消化。

**完了条件:**
- Claude Opus / Gemini Pro / GPT-5 の3 AI レビュー指摘が全件対応 or 「不要」の根拠付きで却下
- 手動ペネトレーションテスト（認証バイパス・IDOR・SQLi・XSS・CSRF・レースコンディション・大量データ）全項目実施・記録あり
- 自動スキャン（Snyk / Trivy / semgrep / OWASP ZAP / GitGuardian）実行・Critical/High は全件対応
- プライバシー検証（学生証3日削除・PII ハッシュ化・退会論理削除）を実環境で確認
- 全テーブルの RLS 有効化・service_role キー混入なしを再確認

### Step 4: 全体の実機テスト + メール確認
**目的**: 本番に近い環境で人間が触って壊れないことを確認する。

**作業項目:**
- テストアカウント2つでブロック・通報・退会・BAN シナリオを完走（記録を残す）
- 管理者ダッシュボードから BAN 操作実施
- ✅ Resend 経由のメール（サインアップ確認・パスワードリセット）を実機で受信確認（2026-06-10）
- 対象外: 通報受理通知メール（意図的に未実装・2026-06-10 確定。app 内通報 UI + 管理ダッシュボードで十分）
- PWA インストール・Web Push 通知の実機確認
- iOS / Android / PC 各環境で主要動線を一通り確認

**完了条件:**
- E2E シナリオの実施記録（日時・操作内容・結果）がリポジトリ or 別ドキュメントに残っている
- 全メール種別の到達確認スクショあり
- 既知の問題は GitHub Issue として記録

### Step 5: PP・利用規約最終化 + テストデータ除去 → βリリース
**目的**: 法務を確定し、本番 DB をクリーンにしてリリースする。

**作業項目:**
- ✅ PP・利用規約の施行日 2026年6月5日 確定済み（2026-06-05・自前起草）
- ✅ `support@crocoweb.jp` の実メール設定確認（2026-06-07・ImprovMX 受信開通）
- インターネット異性紹介事業届出（大阪府公安委員会）
- ✅ Supabase 本番プロジェクトのお試し用テストデータを全削除（2026-06-10 完了。profiles / likes / matches / messages / reports / inquiries / 学生証画像 / プロフィール画像）
- デプロイ前チェックリスト（docs/DEPLOY.md）全項目確認
- main へ最終マージ → 本番デプロイ
- リリース後 1 時間は監視継続

**完了条件:**
- PP・利用規約の施行日が確定文字列に置換済み
- Supabase 本番に運用ユーザー以外のデータが残っていない（SQL で件数確認）
- 本番環境で新規サインアップ → ログイン → プロフィール作成 → マッチまで一気通貫で動く
- ロールバック手順が即実行可能な状態

---
