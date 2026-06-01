# Cro-co ロードマップ

最終更新日: 2026-05-31（[1.10] ✅・カテゴリ1 完全制覇）

---

## 1. スケジュール

| マイルストーン | 時期 | 状態 |
|---|---|---|
| β版リリース | 2026年7月中 | 準備中（リリースフロー進行中） |
| 本番リリース・課金開始 | 2026年10月初旬 | 未着手 |
| 課金導入（フリーミアム） | 登録200人到達後 | 未着手 |
| 他大学展開検討開始 | 登録100人到達後 | 未着手 |

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
| 8 | その他細かい修正（/push/debug/all 削除・SUPPORT_EMAIL 修正 ほか） | ✅ 完了（WebSocket token ログ露出は残り） |
| 9 | Resend メール認証 | ✅ 完了 2026-05-25 |
| 10 | 通報・安全機能の E2E 動作確認 | ⚠️ 2026-05-26 オーナー目視確認・記録なし（自動テスト・実機ログ無し・テスト証跡未整備） |
| 11 | 法務書類アプリ内実装（PP・利用規約） | ✅ 完了（施行日プレースホルダー） |
| 12 | βリリース前最終チェック | ⬜ 未着手 |

### Step 10（⚠️ 2026-05-26 オーナー目視確認・記録なし）
- [x] テストアカウント2つでブロック・通報・退会シナリオを完走 ※2026-05-26 オーナー目視確認・記録なし
- [x] 管理者ダッシュボードから BAN 操作が機能することを確認 ※2026-05-26 オーナー目視確認・記録なし

### Step 12（未着手）
- [ ] 下記「リリース前セキュリティチェックリスト」の全項目を照合
- [ ] デプロイ・ロールバック手順確認 / `ADMIN_EMAILS` 本番設定確認

---

## 4. 法務対応（並行トラック）

### 完了
- [x] 弁護士相談用事前資料・PP/利用規約ドラフト v1（`docs/legal/`）
- [x] PP・利用規約の Markdown 化・アプリ内実装（Step 11）

### 未着手
- [ ] 弁護士面談・フィードバック反映
- [ ] PP・利用規約の施行日プレースホルダー「2026年●月●日」確定
- [ ] `support@crocoweb.jp` の実メール設定確認
- [ ] インターネット異性紹介事業届出（大阪府公安委員会）
- [ ] 特商法に基づく表記（課金開始時）

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
- [ ] ローカル `.env` が prod Supabase を指している問題の解消（ローカル開発で雑に検証すると本番に `profile_views` 等が書き込まれる）。`.env.local` を dev Supabase 向けに分離・`.env` は本番デプロイ専用にする・`.gitignore` 確認 ※2026-05-27 認識（Step 4 の実機テストを dev で行う前提として優先度高）

#### 探索タブ刷新から派生した別タスク（2026-05-27 追記・本タスクには未実装）
> 探索タブ刷新時に「条件としては文理化したが、本体実装が別途必要」な項目。β前にやるかオーナー判断。
- [x] **プロフィール表示の文理化**（2026-05-27 完了・オーナー判断でβ前実施）: プロフィール詳細を文理表示に変更（`science_humanities` 新設）。さがすカードは学部学科・文理とも非表示。**スコープはカード+詳細のみ**（マッチ一覧/足跡/いいね受信は学部学科表示のまま＝オーナー決定）。⚠️ 実 HTTP curl 未実施
- [ ] **自己紹介（bio）変更時の再審査フロー**: 写真と同様に pending/approved/rejected 管理にする（現状 bio はノーチェックで即反映）。**β前必須? β後送り? → オーナー判断待ち**（不適切文面の混入リスク vs 運用負荷）
- [ ] **interests カラムの廃止**: 自由入力でリスクがあるため自己紹介に集約する。**β前必須? β後送り? → オーナー判断待ち**
- [ ] **looking_for カラムの DB 削除**: 現状フロント未使用。**β後送りで OK**（マイグレーション必要）

### β前必須（別 step で消化）
- [ ] アプリアイコン作成（ワニが C の形・SVG）※画像ファイル作成待ちで保留中

### 完了済み
- [x] dev に storage バケット作成（profile-images / student-ids を migration 041 で dev/prod 両方に作成・prod 同設定 Private/5MB/jpeg+png・✅ 完了 2026-05-27。dev での service_role 疎通 HTTP を `scripts/storage_smoke_dev.ps1` で検証済み・upload=200 download=200 delete=200）
- [x] `profile-images` バケット Private 化（✅ 完了 2026-05-27）
- [x] BeReal型受信枠のフロントエンド UI 実装（✅ 完了 2026-05-27）
- [x] ランディングページ全面改修（✅ 完了 2026-05-27 確認）
- [x] PC 版タブカクつき修正（✅ 完了 2026-05-27 確認）

### β後送り（本番リリースまでに対応）
- [ ] Phase 12: Stripe 課金機能実装
- [ ] 最終オンライン時刻表示
- [ ] `login_history` の書き込み実装 or テーブル削除の判断
- [ ] WebSocket token のログ露出対策
- [ ] 入力サニタイズ徹底（XSS・SQLi 網羅確認）※β前のセキュリティチェックでも触る
- [ ] 管理者ダッシュボード機能拡張 / 余分なコードのリファクタ
- [ ] 通報受理通知メール拡張（Resend 経由）
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
| 2.6 | 🟡 | `_require_approved` ガードが必要な箇所に付いている | ☐ |
| 2.7 | 🟡 | JWT 検証アルゴリズムが `HS256` 固定で `none` を受理しない | ☐ |
| 2.8 | 🟡 | パスワードリセット / メアド変更に認証が要る | ☐ |
| 2.9 | 🟢 | セッション固定攻撃対策（ログイン後トークン再発行） | ☐ |
| 2.10 | 🟢 | 同時セッション数の上限・異常検知 | ☐ |

> **カテゴリ2（認証・認可）致命🔴 5本(2.1〜2.5) 2026-05-31 完遂。**
> 主成果: 全79エンドポイント認証棚卸し／JWT検証実機確認／IDOR検出ゼロ＋ブロック・身バレの fail-open 6件を fail-close 化(commit bbed052)／admin保護＋昇格経路なし確認／BAN/deleted を全経路で遮断(commit 4f2d87d)。
> 横断知見: 安全判定の fail-open(except握りつぶし)が複数箇所に存在→「セキュリティ制御は fail-close 統一」を設計原則化(HANDOFF §6)。
> 残り🟡: 2.6〜2.8。🟢: 2.9〜2.10。

### カテゴリ 3: RLS・テーブル権限

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 3.1 | 🔴 | 全テーブルで RLS が有効化されている | ☐ |
| 3.2 | 🔴 | 各テーブルに `service_role` 全許可ポリシー + authenticated/anon は適切制限 | ☐ |
| 3.3 | 🔴 | anon ロールで直接 Supabase 叩いて全テーブル拒否 | ☐ |
| 3.4 | 🔴 | authenticated ロールで他人の行が SELECT できない | ☐ |
| 3.5 | 🟡 | prod の手動 RLS ポリシー残存（HANDOFF.md:152 の blocks_*）を解消 | ☐ |
| 3.6 | 🟡 | 新規テーブル（user_inventory・042/043）の RLS が既存パターンに揃う | ☐ |
| 3.7 | 🟡 | view / function に SECURITY DEFINER が付いていないか | ☐ |
| 3.8 | 🟢 | Storage の bucket policy がテーブル RLS と整合 | ☐ |

### カテゴリ 4: PII・プライバシー検証

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 4.1 | 🔴 | 学生証画像が承認後3日で完全削除されている | ☐ |
| 4.2 | 🔴 | 退会時に全データが論理削除 + Storage 物理削除される（migration 042 後） | ☐ |
| 4.3 | 🔴 | 本名・学籍番号が purge バッチ後に平文 NULL + hash 残存 | ☐ |
| 4.4 | 🟡 | プロフィール写真の EXIF が削除されている | ☐ |
| 4.5 | 🟡 | 退会済みユーザーが他人のフロントから匿名表示される | ☐ |
| 4.6 | 🟡 | `PRIVACY_HASH_SALT` が本番設定済み + dev/prod で別値 | ☐ |
| 4.7 | 🟡 | login_history の書き込み未実装問題を β前に判断 | ☐ |
| 4.8 | 🟢 | 本人がエクスポート機能で自分のデータを取得できる | ☐ |
| 4.9 | 🟢 | 個人情報保護委員会への漏洩時通報手順を文書化 | ☐ |

### カテゴリ 5: 入力検証・インジェクション

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 5.1 | 🔴 | メアドドメイン制限が backend 側にも実装されている | ☐ |
| 5.2 | 🔴 | メアドのエイリアス（`+alias@`）で抜けられない | ☐ |
| 5.3 | 🔴 | SQL injection: 全入力に `' OR '1'='1` 等を試す | ☐ |
| 5.4 | 🔴 | XSS: 全テキスト入力に `<script>alert(1)</script>` | ☐ |
| 5.5 | 🟡 | Mass assignment: status / identity_verified 等を送って弾かれる | ☐ |
| 5.6 | 🟡 | 数値の型・範囲チェック（year=999 等を弾く） | ☐ |
| 5.7 | 🟡 | 文字長の上限が backend で強制されている | ☐ |
| 5.8 | 🟢 | NoSQL/コマンドインジェクション系 | ☐ |
| 5.9 | 🟢 | ファイルアップロードでパストラバーサル試行 | ☐ |

### カテゴリ 6: レート制限・DoS・大量データ

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 6.1 | 🔴 | 全エンドポイントに rate limit が付いている | ☐ |
| 6.2 | 🟡 | rate limit を X-Forwarded-For 偽装で bypass できない | ☐ |
| 6.3 | 🟡 | 大量データ攻撃: 配列1000要素・文字列100KB で弾かれる | ☐ |
| 6.4 | 🟡 | レースコンディション: 並列リクエストで二重マッチ・在庫負数化なし | ☐ |
| 6.5 | 🟢 | 大量ファイルアップロード対策 | ☐ |
| 6.6 | 🟢 | WebSocket の接続数上限・メッセージレート | ☐ |

### カテゴリ 7: AI 生成コード固有の落とし穴

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 7.1 | 🔴 | 存在しないライブラリ/関数の呼び出しが無い | ☐ |
| 7.2 | 🔴 | 新規エンドポイントで認証ガード付け忘れが無い | ☐ |
| 7.3 | 🔴 | 新規テーブルで RLS 有効化忘れが無い | ☐ |
| 7.4 | 🟡 | try-except で例外を握り潰す箇所が許容範囲のみ | ☐ |
| 7.5 | 🟡 | コピペ汚染で権限チェックが抜けた箇所が無い | ☐ |
| 7.6 | 🟡 | 全 migration が冪等（IF NOT EXISTS 等）で再実行可能 | ☐ |
| 7.7 | 🟡 | N+1 クエリがバックエンドに残っていない | ☐ |
| 7.8 | 🟡 | エラーメッセージで内部情報漏洩なし | ☐ |
| 7.9 | 🟡 | service_role 結果をフィルタせずフロント返却なし | ☐ |
| 7.10 | 🟢 | タイミング攻撃: ログイン応答時間に差が出ない | ☐ |
| 7.11 | 🟢 | CORS が厳格（ALLOWED_ORIGINS で絞る・`*` なし） | ☐ |
| 7.12 | 🟢 | CLAUDE.md §5 触らないファイルが誤編集されていない | ☐ |
| 7.13 | 🟢 | テスト・デバッグ用エンドポイントが残っていない | ☐ |
| 7.14 | 🟢 | 未使用 import / dead code が残っていない | ☐ |

### カテゴリ 8: Cro-co アプリ固有の懸念

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 8.1 | 🔴 | 身バレ防止が全6経路で効いている（identity_hide.py） | ☐ |
| 8.2 | 🔴 | ブロック解除不可が DB レベルで担保されている | ☐ |
| 8.3 | 🔴 | 写真審査バイパス不可（pending 写真が他人に見えない） | ☐ |
| 8.4 | 🟡 | マッチ自動解除の整合性（messages dangling なし） | ☐ |
| 8.5 | 🟡 | 通報の悪用防止（連続通報の rate limit + 重複抑止） | ☐ |
| 8.6 | 🟡 | 通報警告通知で通報者の身元が漏れない | ☐ |
| 8.7 | 🟡 | マッチ前のメッセージ送信不可 | ☐ |
| 8.8 | 🟡 | 直リンク経由のプロフィール閲覧が身バレ判定を通過する | ☐ |
| 8.9 | 🟡 | `LIKE_QUOTA_ENABLED` の prod 設定確認（β は OFF） | ☐ |
| 8.10 | 🟢 | 足跡経由いいね（無料）の悪用防止 | ☐ |
| 8.11 | 🟢 | 送信在庫の補償処理が正しく動く | ☐ |

### カテゴリ 9: ログ・監査・観測性

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 9.1 | 🔴 | ログに PII（本名/メアド/学籍番号/JWT）が乗っていない | ☐ |
| 9.2 | 🟡 | WebSocket トークンが URL クエリ経由でログに残らない | ☐ |
| 9.3 | 🟡 | 管理者操作の監査ログが全アクションで漏れていない | ☐ |
| 9.4 | 🟡 | 監査ログ改竄耐性（管理者自身が消せない） | ☐ |
| 9.5 | 🟢 | 異常な API 呼び出しの検知ログレベル | ☐ |

### カテゴリ 10: エラーハンドリング・情報漏洩

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 10.1 | 🔴 | 500 エラーに stack trace / SQL 詳細 / 内部パスが含まれない | ☐ |
| 10.2 | 🟡 | 404 と 403 の使い分けが情報漏洩していない | ☐ |
| 10.3 | 🟢 | フロント側エラー画面で技術詳細を出さない | ☐ |
| 10.4 | 🟡 | browse.py:121,298 非表示(hides)除外が except: pass で fail-open（DB障害時に非表示ユーザーが一覧/推薦に出現）→ fail-close 化検討 | ☐ |
| 10.5 | 🟡 | browse.py:311 マッチ済み除外が except: pass（マッチ済みが推薦に再出現・UX問題・権限影響なし） | ☐ |
| 10.6 | 🟡 | like.py:180 should_count_quota RPC 失敗時 should_count=False（在庫消費なし/受信quota未カウントでいいね成立・課金/整合問題） | ☐ |
| 10.7 | 🟡 | identity_hide の fail-close 化に伴う副作用: DB瞬断時に一覧API全体が500になりうる（身バレ露出より安全側の意図的設計・本番監視メモ） | ☐ |

### カテゴリ 11: 依存関係・サプライチェーン

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 11.1 | 🔴 | Snyk / Trivy で backend / frontend の依存関係を脆弱性スキャン | ☐ |
| 11.2 | 🟡 | 依存パッケージのバージョン固定（requirements.txt の `==` / lockfile commit） | ☐ |
| 11.3 | 🟡 | semgrep で SAST | ☐ |
| 11.4 | 🟡 | OWASP ZAP で DAST | ☐ |
| 11.5 | 🟡 | GitGuardian で commit 履歴の secret 漏洩スキャン | ☐ |

### カテゴリ 12: 法的チェック

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 12.1 | 🔴 | インターネット異性紹介事業届出（大阪府公安委員会） | ☐ |
| 12.2 | 🔴 | PP が最新法令に準拠・利用規約に必要条項（弁護士確認） | ☐ |
| 12.3 | 🔴 | 18歳未満排除が backend + frontend で実装 | ☐ |
| 12.4 | 🟡 | 個人情報保護委員会への漏洩時通報手順を文書化 | ☐ |
| 12.5 | 🟡 | PP・利用規約の施行日プレースホルダーを埋める | ☐ |

### カテゴリ 13: AI レビュー

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 13.1 | 🟡 | Claude Opus / Gemini Pro / GPT-5 による全コードレビュー | ☐ |
| 13.2 | 🟡 | 3つの AI で指摘が一致した箇所を優先対応 | ☐ |

### カテゴリ 14: Deep Research

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 14.1 | 🟡 | 「マッチングアプリ 脆弱性」「Supabase 落とし穴」で Web 調査 | ☐ |
| 14.2 | 🟡 | OWASP Mobile Top 10 / OWASP API Security Top 10 全項目チェック | ☐ |

### カテゴリ 15: 手動ペネトレ E2E シナリオ

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 15.1 | 🔴 | 認証バイパス全エンドポイント直叩き（2.2 の E2E 再実施） | ☐ |
| 15.2 | 🔴 | IDOR 全テーブル（2.3 の E2E 再実施） | ☐ |
| 15.3 | 🟡 | SQL injection 全入力（5.3 の E2E 再実施） | ☐ |
| 15.4 | 🟡 | XSS 全入力（5.4 の E2E 再実施） | ☐ |
| 15.5 | 🟡 | CSRF: 別オリジンからの POST/PATCH/DELETE | ☐ |
| 15.6 | 🟡 | レースコンディション攻撃（6.4 の E2E 再実施） | ☐ |
| 15.7 | 🟡 | 大量データ攻撃（6.3 の E2E 再実施） | ☐ |

### カテゴリ 16: 第三者監査

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 16.1 | 🟢 | 信頼できるエンジニアに有償でコードレビュー依頼 | ☐ |
| 16.2 | 🟢 | 大学のセキュリティ研究室への監査依頼を検討 | ☐ |

### カテゴリ 17: 本番デプロイ前の最終確認

| ID | 重大度 | 項目 | 状態 |
|---|---|---|---|
| 17.1 | 🔴 | β明記が本番でも表示される（ランディング + ようこそ） | ☐ |
| 17.2 | 🔴 | prod の `LIKE_QUOTA_ENABLED` が未設定（OFF が前提） | ☐ |
| 17.3 | 🔴 | prod に migration 042 / 043 が適用済み | ☐ |
| 17.4 | 🟡 | prod に Supabase テストデータが残っていない | ☐ |
| 17.5 | 🟡 | prod の Custom SMTP（Resend）が機能している | ☐ |
| 17.6 | 🟡 | DNS 伝播確認・HTTPS 証明書発行確認 | ☐ |
| 17.7 | 🟡 | CSP / セキュリティヘッダーが prod レスポンスに付いている | ☐ |
| 17.8 | 🟢 | バックアップ取得手順を明文化 | ☐ |
| 17.9 | 🟡 | WebSocket 認証トークンを URL クエリから外す（アクセスログ JWT 露出対策・案④接続後メッセージ / 案⑤Sec-WebSocket-Protocol / 案⑥短命 ticket） | ☐ |
| 17.10 | 🟢 | AuthContext.tsx の console.log メアド出力を本番ビルドで抑制 or 削除（§5 触らないファイルのため要解除判断） | ☐ |

---

### 統計
- 合計 92 項目（致命🔴 24 / 重大🟡 42 / 重要🟢 24 / 推奨🔵 0）
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
- 結果: BAN/deleted ユーザーは HTTP 全経路で403、WS は accept前に4003。fail-close は 503 で障害とBANを区別
- fail-close 副作用(許容方針): DB瞬断時に全ユーザーが503になりうる。身バレ([2.3])と同じ「安全優先・可用性犠牲」。Supabase可用性が高い個人開発スケールで許容
- ⚠️ 残課題: WS実機(wscat 4003)はオーナー環境都合で未確認→[15.1]E2Eで実施。[17.9](WS の ?token= URLクエリ露出)は別PR据え置き(今回スコープ外)
- ⚠️ 設計上の申し送り: BAN/deleted 判定ロジックが active_user.py と dependencies.py の2箇所に複製されている(循環import回避のため)。今後ステータス値を追加する際は両方を必ず更新すること(片側忘れが穴になる)

#### [2.1] 2026-05-31 ✅
- 確認方法（2段階）:
  - フェーズA全目視: backend/app の全12ルーターを Read で読了し、79エンドポイント(HTTP78+WS1)を method/path/file:line/guard で全件分類
  - クロスチェック(grep機械裏取り): main.py の include_router 12件＝読了12ファイルと完全一致(未読ルーターなし)／`@router.*` grep 79件＝目視79本と一致／`@app.*` 0件・`add_api_route`/`add_route`/`add_websocket_route`/`app.mount` 0件(非デコレータ経路なし)／`Depends(` 76件＋未付与3本の正当性確認
- 結果: 無防備🚩 ゼロ。✅77本(get_active_user / require_admin / 手動JWT)・⚪意図的公開2本(GET /health=死活監視・GET /api/push/vapid-public-key=Web Push公開鍵)。目視と grep が完全一致し取りこぼし・余剰なし
- グレー(本項目では合格・[2.5]へ持ち越し): (a) admin 23本は require_admin→get_current_user チェーンで get_active_user を経由せず、BAN済み管理者が技術的に通過しうる(運用上ほぼ発生せず) (b) WS /ws/chat/{match_id} は手動JWT検証のみで profiles.status=='banned' チェックがなく、BANユーザーがトークン保持中は接続維持で受信可能(HTTP送信側 POST /api/messages/ は get_active_user で遮断済み)。WS は [17.9](URLクエリトークン)と同一ファイルのため [2.5] で束ねて対処予定

---

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
- アプリアイコン（画像ファイル提供後に組み込み）
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
- Resend 経由のメール（サインアップ確認・パスワードリセット・通報受理通知）を実機で受信確認
- PWA インストール・Web Push 通知の実機確認
- iOS / Android / PC 各環境で主要動線を一通り確認

**完了条件:**
- E2E シナリオの実施記録（日時・操作内容・結果）がリポジトリ or 別ドキュメントに残っている
- 全メール種別の到達確認スクショあり
- 既知の問題は GitHub Issue として記録

### Step 5: PP・利用規約最終化 + テストデータ除去 → βリリース
**目的**: 法務を確定し、本番 DB をクリーンにしてリリースする。

**作業項目:**
- PP・利用規約の施行日プレースホルダー「2026年●月●日」を弁護士確認後に確定
- `support@crocoweb.jp` の実メール設定確認
- インターネット異性紹介事業届出（大阪府公安委員会）
- Supabase 本番プロジェクトのお試し用テストデータを全削除（profiles / likes / matches / messages / reports / inquiries / 学生証画像 / プロフィール画像）
- デプロイ前チェックリスト（docs/DEPLOY.md）全項目確認
- main へ最終マージ → 本番デプロイ
- リリース後 1 時間は監視継続

**完了条件:**
- PP・利用規約の施行日が確定文字列に置換済み
- Supabase 本番に運用ユーザー以外のデータが残っていない（SQL で件数確認）
- 本番環境で新規サインアップ → ログイン → プロフィール作成 → マッチまで一気通貫で動く
- ロールバック手順が即実行可能な状態

---
