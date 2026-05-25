# Cro-co βリリース前ロードマップ
最終更新: 2026-05-25

---

## 法務対応（並行トラック）

### 完了
- [x] 弁護士相談用事前資料 (A4 1枚) → `docs/legal/Cro-co_法務相談_事前資料.docx`
- [x] プライバシーポリシー ドラフト v1 → `docs/legal/Cro-co_プライバシーポリシー_ドラフト.docx`
- [x] 利用規約 ドラフト v1 → `docs/legal/Cro-co_利用規約_ドラフト.docx`
- [x] PPドラフト v1 → Markdown化してイテレーション中
- [x] 利用規約ドラフト v1 → PP完了後にイテレーション開始

### 未着手
- [ ] 弁護士面談（田中先生）→ 事前資料を はまだ様経由で送付後
- [ ] 弁護士フィードバックの反映
- [ ] PP・利用規約のアプリ内実装（`TermsOfServicePage.tsx` / `PrivacyPolicyPage.tsx` 書き換え）
- [ ] `support@crocoweb.jp` の実際のメールアドレス設定確認
- [ ] 特商法に基づく表記（課金開始時に必要、β版は不要）

---

## セキュリティ修正（ロードマップ Step 1〜12）

### Step 0: 現状把握 ✅ 完了（2026-05-24）
- Supabase RLS 全テーブル確認済み（全16テーブル有効）
- バックエンド全エンドポイント監査済み → `docs/SECURITY_AUDIT_BACKEND.md`
- フロント Supabase 直叩き・退会完全性・学生証保管 監査済み → `docs/SECURITY_AUDIT_PHASE2.md`

---

### Step 1: privacy_purge バッチ起動状況確認 ← 次にやること
- [ ] `main.py` で APScheduler / Render Cron の起動コードを確認
- [ ] 本番環境で実際に動作していることをログで確認

**完了の定義:** 実際の動作ログを1回確認済み

#### 実装確認 ✅
- `run_purge_batch()` が `main.py` の lifespan で毎日 03:00 JST に登録済み
- 全削除処理（PII 3日/30日、ハッシュ 365日、メッセージ 30日）の実装を確認
- `misfire_grace_time=3600` を設定済み（スリープ明け1時間以内に実行保証）
- 手動トリガー `POST /api/admin/privacy-purge/run` を追加済み

#### 本番動作ログ確認手順
1. Render ダッシュボード → cro-co-backend サービス → Logs タブを開く
2. `=== 個人情報削除バッチ開始 ===` または `=== 個人情報削除バッチ完了 ===` で検索
3. 見つかった場合: `ran_at` の時刻を記録して下記に記入
4. 見つからない場合: `POST /api/admin/privacy-purge/run` を叩いて動作確認

#### 本番動作ログ確認
- 確認日時: （Render ログで確認後に記入）
- バッチ実行時刻 (ran_at): （確認後に記入）
- 結果サマリー: （確認後に記入）

---

### Step 2: 本番/開発環境の分離
- [ ] Supabase: dev プロジェクト作成
- [ ] Vercel: preview / production 環境変数分離
- [ ] Render: dev サービス作成
- [ ] VAPIDキー・Resend ドメインの dev/prod 分離

**完了の定義:** dev 環境で全機能が動作確認済み

---

### Step 3: ProfileResponse の機密フィールド整理
- [ ] `student_id_image_path` をレスポンスから除外（H-P2-1）
- [ ] `real_name` / `student_number` / `birth_date` を他人取得時のレスポンスから除外（M-P2-1）

**完了の定義:** 実機でフィールド非露出を確認済み

---

### Step 4: ログアウト・退会時のクリーンアップ統一
- [ ] localStorage に保存されている本名・学籍番号・生年月日のクリア（H-P2-3）
- [ ] 全ログアウト経路で `clearAllDB()` 実行（M-P2-2）

**完了の定義:** 全経路でブラウザストレージが空になることを確認済み

---

### Step 5: blocks RLS ポリシー修正
- [ ] `blocks_self` ポリシーを SELECT/INSERT/DELETE に分離
- [ ] ブロックされた側が自分のブロックを削除できないことを実機で検証

**完了の定義:** Supabase SQL Editor で動作検証済み

---

### Step 6: ブロック/非表示チェックの追加（M-2）
- [ ] `GET /api/profiles/{user_id}` でブロック・非表示チェックを追加
- [ ] ブロックした相手から 403/404 が返ることを実機で確認

**完了の定義:** 実機検証済み

---

### Step 7: 写真関連の安全化
- [ ] アップロード時の EXIF 削除実装（M-8）
- [ ] `profile-images` バケットの Private 化
- [ ] フロントエンドの画像表示を署名付き URL に切り替え
- [ ] reapply 時の旧学生証 Storage 削除（H-P2-2）

**完了の定義:** 実機でアップロード→ダウンロード→EXIF なし確認済み

---

### Step 8: その他の細かい修正
- [ ] `/api/push/debug/all` の削除（M-6）
- [ ] 本番ビルドで `console.log` を無効化（I-P2-4）
- [ ] Render アクセスログでクエリパラメータ除外（H-1）
- [ ] M-1, M-3, M-4, M-5, M-7（Should Fix 5項目）

---

### Step 9: Resend メール認証の実装
- [ ] Supabase Custom SMTP に Resend を設定
- [ ] SPF/DKIM/DMARC の設定
- [ ] テストアカウントで実際のメール受信・認証を確認

---

### Step 10: 通報・安全機能のエンドツーエンド動作確認
- [ ] テストアカウント2つでブロック・通報・退会シナリオを完走
- [ ] 管理者ダッシュボードから BAN 操作が機能することを確認

---

### Step 11: 法務書類アプリ内実装
- [ ] 弁護士フィードバック反映済みの PP を `PrivacyPolicyPage.tsx` に実装
- [ ] 利用規約を `TermsOfServicePage.tsx` に実装
- [ ] `RejectedPage.tsx` の `SUPPORT_EMAIL` を実アドレスに変更

---

### Step 12: βリリース前最終チェック
- [ ] `Production_Checklist.md` の全項目を照合
- [ ] デプロイ手順確認・ロールバック手順確認
- [ ] `ADMIN_EMAILS` 環境変数が本番に正しく設定されていることを確認
