# Cro-co ロードマップ

最終更新日: 2026-05-25

---

## スケジュール

| マイルストーン | 時期 | 状態 |
|---|---|---|
| クローズドテスト | 2026年6月末 | — |
| β版リリース | 2026年7月中 | — |
| 本番リリース・課金開始 | 2026年10月初旬 | — |
| 課金導入（フリーミアム） | 登録200人到達後 | 未着手 |
| 他大学展開検討開始 | 登録100人到達後 | 未着手 |

---

## 完了済みフェーズ（機能開発）

| フェーズ | 内容 | 状態 |
|---|---|---|
| Phase 1 | 認証（サインアップ・ログイン・メール確認） | ✅ 完了 |
| Phase 3b | 学生証アップロード機能 | ✅ 完了 |
| Phase 3c | 管理者ダッシュボード（基本） | ✅ 完了 |
| Phase 3d | 管理者承認・却下・BAN | ✅ 完了 |
| Phase 4a | プロフィール写真（最大6枚・写真審査フロー） | ✅ 完了 |
| Phase 4b | ユーザー一覧（/browse・フィルター） | ✅ 完了 |
| Phase 4c | プロフィール詳細（/profile/:id） | ✅ 完了 |
| Phase 5 | いいね・マッチ・チャット（WebSocket） | ✅ 完了 |
| Phase 6 | 足跡・通知タブ・いいね受信一覧 | ✅ 完了 |
| Phase 7 | 安全機能（ブロック・通報・非表示） | ✅ 完了 |
| Phase 8 | PWA + Web Push 通知（VAPID） | ✅ 完了 |
| Phase 9 | BeReal型いいね受信枠システム（バックエンド） | ✅ 完了 |
| Phase 10 | 問い合わせ機能（inquiries） | ✅ 完了 |
| Phase 11 | 管理者拡張（写真審査・ユーザー一覧・統計・ログ） | ✅ 完了 |
| Phase 12 | Stripe 課金 | 🔜 本番リリース前 |

---

## セキュリティ修正ロードマップ（β前必須）

### ✅ Step 0: 現状把握（完了 2026-05-24）
- Supabase RLS 全16テーブル確認済み
- バックエンド全エンドポイント監査済み → `docs/archive/SECURITY_AUDIT_BACKEND.md`
- フロント監査済み → `docs/archive/SECURITY_AUDIT_PHASE2.md`

### ✅ Step 1: privacy_purge バッチ起動確認（完了 2026-05-25）
- `run_purge_batch()` が毎日 03:00 JST に APScheduler で登録済み
- 手動トリガー `POST /api/admin/privacy-purge/run` を実装・動作確認済み
- 本番実行ログ確認: 2026-05-25T04:07:51 JST、status=completed、failed=0

### ✅ Step 2: 本番/開発環境の分離（完了 2026-05-25）
- GitHub `dev` ブランチ作成済み
- Supabase dev プロジェクト作成済み（project_id: `hpkpndjqtzycnytymdkk`）
- dev Supabase に全マイグレーション 001〜038 適用済み
- Render dev サービス作成済み（https://cro-co-api-dev.onrender.com）
- Vercel 環境変数を Production / Preview(dev) に分離済み
- VAPID キーを dev/prod 別々に生成済み

完了条件: dev 環境で全機能が動作確認済み ✅

### ✅ Step 3: ProfileResponse の機密フィールド整理（完了 2026-05-25）
- `student_id_image_path` を `ProfileResponse` から削除済み（`schemas/profile.py`）
- `GET /api/profile-detail/{user_id}`（browse.py）は元から機密フィールドを SELECT していなかったことを確認
- `real_name` / `student_number` / `birth_date` は `ProfileResponse` に含まれておらず、自分のプロフィール取得でのみ返す仕様を確認済み

完了条件: 実機でフィールド非露出を確認済み ✅

### ✅ Step 4: ログアウト・退会時のクリーンアップ統一（完了 2026-05-25）
- `frontend/src/lib/db.ts` に `clearSensitiveStorage()` を追加
- `SettingsPage.tsx` / `HomePage.tsx` / `PendingPage.tsx` / `RejectedPage.tsx` の全ログアウト経路で `clearSensitiveStorage()` + `clearAllDB()` を実行

完了条件: 全経路でブラウザストレージが空になることを確認済み ✅

### ✅ Step 5: blocks RLS ポリシー修正（完了）
- `038_fix_blocks_rls.sql` で `blocks_self` ポリシーを修正済み（dev 適用済み）
- ブロックされた側が自分のブロックレコードを削除できないことを確認
- ⚠️ 本番 Supabase への手動適用が残っている

### ✅ Step 6: ブロック/非表示チェックの追加（完了 2026-05-25）
- `browse.py` の `get_profile` に b1/b2 ブロックチェックを追加
- `is_self=False` のときのみチェックを実行（`HTTPException` 403 付き）
- ブロックした相手にアクセスすると 403 が返ることを確認済み

### ⬜ Step 7: 写真関連の安全化（一部完了）

#### ✅ Step 7-a: EXIF 削除と署名付き URL ヘルパー（完了 2026-05-25）
- `requirements.txt` に `Pillow>=10.0` 追加
- `profile.py` に `_strip_exif` / `_signed_image_url` を追加
- `upload_student_id` / `upload_avatar` / `upload_photo` の3箇所で EXIF 削除を実装

#### ✅ Step 7-b: profile-images の署名付き URL 切り替え（完了 2026-05-25）
- `backend/app/core/image_utils.py` を新規作成
- `get_signed_image_url(path, expires_in=3600)` を共通ヘルパー化
- `profile.py` / `browse.py` / `like.py` / `match.py` / `safety.py` / `notifications.py` / `admin.py` の全ルーターで切り替え済み
- `_public_image_url()` は削除済み

#### ⬜ 残り: profile-images バケットの Public → Private 切り替え
- Supabase ダッシュボードでバケット設定を手動で変更する必要がある
- 切り替え後は署名付き URL（コード側実装済み）が正常に機能することを確認

完了条件: バケット Private 化後、アップロード→ダウンロード→EXIF なし確認済み

### ✅ Step 8: その他の細かい修正（完了 2026-05-25、一部残り）
- `/api/push/debug/all` エンドポイントを削除済み（`push.py`）
- `vite.config.ts` で本番ビルド時に `console.log` を drop するよう設定済み
- `RejectedPage.tsx` の `SUPPORT_EMAIL` を `support@crocoweb.jp` に修正済み
- ⬜ Render アクセスログでクエリパラメータ除外（WebSocket `token` の露出防止）は未対応

### ✅ Step 9: Resend メール認証の実装（完了 2026-05-25）
- Resend で `crocoweb.jp` ドメイン認証済み（DKIM / SPF / DMARC DNS 設定済み）
- Supabase Authentication > SMTP Settings に Resend を設定済み:
  - Host: `smtp.resend.com` / Port: 465 / Username: `resend`
  - Sender: `noreply@crocoweb.jp` / Sender name: `Cro-co`
- Confirm email を ON に設定（テスト中は OFF に戻している場合あり）

### ⬜ Step 10: 通報・安全機能のエンドツーエンド動作確認
- [ ] テストアカウント2つでブロック・通報・退会シナリオを完走
- [ ] 管理者ダッシュボードから BAN 操作が機能することを確認

### ✅ Step 11: 法務書類アプリ内実装（完了 2026-05-25）
- `PrivacyPolicyPage.tsx` と `TermsOfServicePage.tsx` を全文書き換え済み
- 施行日は「2026年●月●日」プレースホルダーのまま（弁護士確認後に埋める）
- `RejectedPage.tsx` の `SUPPORT_EMAIL` を `support@crocoweb.jp` に修正済み（Step 8 で対応）

### ⬜ Step 12: βリリース前最終チェック
- [ ] `docs/PRE_RELEASE_SECURITY_CHECKLIST.md` の全項目を照合
- [ ] デプロイ手順確認・ロールバック手順確認
- [ ] `ADMIN_EMAILS` 環境変数が本番に正しく設定されていることを確認

---

## 法務対応（並行トラック）

### 完了
- [x] 弁護士相談用事前資料 A4 1枚 → `docs/legal/Cro-co_法務相談_事前資料.docx`
- [x] プライバシーポリシー ドラフト v1 → `docs/legal/Cro-co_プライバシーポリシー_ドラフト.docx`
- [x] 利用規約 ドラフト v1 → `docs/legal/Cro-co_利用規約_ドラフト.docx`
- [x] PP・利用規約の Markdown 化（イテレーション中）

### 未着手
- [ ] 弁護士面談（田中先生）→ はまだ様経由で事前資料送付後
- [ ] 弁護士フィードバックの反映
- [x] PP・利用規約のアプリ内実装（Step 11 完了。施行日プレースホルダーは弁護士確認後に埋める）
- [ ] `support@crocoweb.jp` の実際のメールアドレス設定確認
- [ ] 特商法に基づく表記（課金開始時に必要、β版は不要）

---

## 中期タスク（本番リリース前）

- [ ] Phase 12: Stripe 課金機能実装
- [ ] `profile-images` バケット Private 化（Step 7 で実施）
- [ ] BeReal型受信枠のフロントエンド UI 実装（バックエンドは完了済み）
- [ ] GitHub Branch Protection 設定（main への直接 push 禁止、PR 経由のみ）
- [ ] ランディングページ全面改修（信頼性メッセージング重視）→ `docs/LANDING_PAGE_PLAN.md` 参照
- [ ] アプリアイコン作成（ワニが C の形・SVG）
- [ ] 入力サニタイズ徹底（XSS・SQLi 対策の網羅確認）
- [ ] 管理者ダッシュボード機能拡張
- [ ] 余分なコードのリファクタリング・削除
- [ ] PC 版タブカクつき修正
- [ ] プロフィール見え方改善（写真位置・カードレイアウト）
- [ ] 探索タブ UI 改善
- [ ] 最終オンライン時刻表示
- [ ] 非表示一覧ページ新設
- [ ] ブロック一覧を Settings から別ページへ移動
- [ ] 通報受理通知メール拡張（Resend 経由）
- [ ] 軽い占い表示（生年月日からの星座のみ・新規データ取得なし）→ `docs/IDEAS.md` 参照

---

## 課金・他大学展開戦略

### 課金導入タイミング

- β中・本番初期は完全無料を維持
- **β中の課金は炎上リスクが高いため絶対にやらない**
- 登録200人到達でフリーミアム導入を検討
- 完全有料化はしない（成長を止めるため）

### 課金候補（フリーミアム導入時）

| 機能 | モデル | 優先度 |
|---|---|---|
| 男性のメッセージ送信無制限化 | Pairs モデル | 高 |
| いいね枠拡張（無料5件/日 → 課金20件/日） | Freemium | 中 |
| 足跡全件表示（無料は最新5件、課金で全件） | Freemium | 中 |
| プロフィール上位表示 | 法的要件確認後 | 低 |

### 他大学展開タイミング

- 阪大で**登録100人到達後**に検討開始
- 展開候補: 神戸大・関西大（関西圏国公立から）
- 技術準備: ドメインバリデーション汎用化、大学別 namespace 設計

### 運営コスト削減方針

- Supabase Free Tier 継続努力（500MB 以下維持）
- Render Free Tier 継続（GAS ping でスリープ回避済み）
- Resend 無料枠（月3,000通）内で運用
- **月コスト目標: 1,000円以下**
