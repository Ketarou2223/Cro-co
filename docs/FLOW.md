# Cro-co フロー図

最終更新日: 2026-05-25
（実コードを直接確認した事実のみ記載）

---

## 1. 認証・オンボーディングフロー

```
[ 未認証 ]
    |
    ├─ /signup → メール送信
    |      └─ メールリンクをクリック（Supabase Auth メール確認）
    |              └─ /setup/required（必須項目入力）
    |
    └─ /login → 認証済みへ

[ 認証済み・オンボーディング未完了 ]
    |
    OnboardingGuard の判定:
    ├─ student_id_submitted === false
    |      → /setup/required
    |
    └─ student_id_submitted === true && onboarding_completed === false
           → /setup/optional

[ オンボーディングステップ ]
    /setup/required
        → 学生証アップロード + 必須項目（本名・学籍番号・性別・恋愛対象・生年月日・学年）
        → POST /api/profile/upload-student-id
        → profiles.status = 'pending_review'、student_id_submitted = true
        |
    /setup/thanks
        → 提出完了メッセージ表示
        |
    /setup/optional
        → 任意項目入力（学部・クラブ・自己紹介など）
        → PATCH /api/profile/me
        |
    /setup/install
        → PWA インストール誘導（スキップ可）
        |
    /setup/notify
        → Web Push 通知許可要求（スキップ可）
        |
    /setup/complete
        → POST /api/profile/complete-onboarding（onboarding_completed = true）
        → /home へ遷移

[ 認証済み・オンボーディング完了 ]
    → /home（通常利用フロー）
```

---

## 2. 学生証審査フロー

```
ユーザー
    |
    POST /api/profile/upload-student-id
    → profiles.status = 'pending_review'
    → /pending ページへ
    |
管理者
    |
    GET /api/admin/pending（審査待ちリスト）
    GET /api/admin/student-id/{user_id}（学生証画像の署名付き URL・5分有効）
    |
    ├─ 承認: POST /api/admin/approve/{user_id}
    |      → status = 'approved'、identity_verified = true
    |      → ユーザーは /home へアクセス可能に
    |
    └─ 却下: POST /api/admin/reject/{user_id}
           → status = 'rejected'、rejection_reason を設定
           → ユーザーは /rejected ページへ
                   |
                   POST /api/profile/reapply（再申請）
                   → status = 'pending_review' に戻る
                   → /setup/required?mode=reapply へ
```

---

## 3. 写真審査フロー

```
ユーザー
    |
    POST /api/profile/photos（写真アップロード）
    → profile_images.status = 'pending'（デフォルト値）
    → Storage: profile-images バケット（現在 Public）
    |
管理者
    |
    GET /api/admin/photos/pending（審査待ち写真一覧・署名付き URL 付き）
    |
    ├─ 承認: POST /api/admin/photos/{photo_id}/approve
    |      → status = 'pending' → 'approved'
    |      → 承認済み写真がない場合は profile_image_path を設定
    |
    └─ 却下: POST /api/admin/photos/{photo_id}/reject
           → status = 'pending' → 'rejected'
```

> **現在の写真バケット**: `profile-images` は Public。
> Step 7（ROADMAP.md）で Private 化 + 署名付き URL 切り替えを実施予定。

---

## 4. Guard コンポーネントの動作

### OnboardingGuard（`frontend/src/components/OnboardingGuard.tsx`）

適用ルート: `/home`, `/browse`, `/profile/:id`, `/profile/edit`, `/matches`,
            `/notifications`, `/footprints`, `/likes/received`, `/settings`, `/chat/:matchId`

```
リクエスト
    |
    /setup/ で始まるパス → スキップ（OnboardingGuard は何もしない）
    |
    profiles.student_id_submitted === false
    → /setup/required にリダイレクト
    |
    profiles.student_id_submitted === true && profiles.onboarding_completed === false
    → /setup/optional にリダイレクト
    |
    上記以外 → そのまま通過
```

### ChatGuard（`frontend/src/components/ChatGuard.tsx`）

適用ルート: `/chat/:matchId` のみ

```
リクエスト
    |
    profiles.status === 'pending_review'
    → チャット機能ブロック画面（審査中メッセージ + 戻るボタン）
    |
    profiles.status === 'rejected'
    → 再提出案内画面（/setup/required?mode=reapply へのボタン）
    |
    上記以外 → そのまま通過
```

### AdminGuard（`frontend/src/components/AdminGuard.tsx`）

適用ルート: `/admin` のみ

```
リクエスト
    |
    GET /api/admin/pending を試行
    |
    200 OK → 管理者 → /admin へ通過
    |
    エラー（403 等）→ 非管理者 → /home にリダイレクト
```

> **注意**: AdminGuard は API 試行で管理者を判定する。
> 管理者メールは `backend/.env` の `ADMIN_EMAILS`（カンマ区切り）で管理。
> フロントに管理者リストを持たない設計。

### StatusGuard

**存在しない**。`frontend/src/components/` に StatusGuard.tsx は存在せず、
`App.tsx` でも使用されていない。旧ドキュメントの記載は誤り。

---

## 5. いいね・マッチフロー

```
ユーザー A が ユーザー B にいいねを送る
    |
    POST /api/likes/
    → BeReal型受信枠チェック（B が対象の女性の場合）
    |
    ├─ B がすでに A にいいねしていた場合
    |      → matches テーブルに自動挿入（detect_match トリガー）
    |      → A・B 両方にマッチ通知メール + Web Push
    |
    └─ B がいいねしていない場合
           → likes テーブルに記録のみ
           → B に「いいねが来た」通知（メール + Web Push）
```

### BeReal型いいね受信枠（バックエンド実装済み・フロント UI 未実装）

- 対象: 男女マッチ志向の女性のみ（5件/日）
- 対象外（無制限）: 同性ペア（男男・女女）の双方、足跡経由いいね（`via_footprint=true`）
- 受信枠が上限でも、足跡ページ・いいね受信一覧・通知経由のプロフィールからはいいね可能

---

## 6. チャットフロー

```
マッチ成立後
    |
    /chat/:matchId
    |
    WebSocket 接続: /ws/chat/{match_id}?token=JWT
    |
    ├─ 接続成功 → リアルタイムメッセージ送受信
    |
    └─ 接続失敗 → ポーリング fallback（POST /api/messages/ + GET /api/messages/{match_id}）
```

---

## 7. 退会・データ削除フロー

```
ユーザーが退会を申請
    |
    DELETE /api/profile/me
    → ソフトデリート（status を変更）+ PII の即時削除
    → Storage の写真・学生証ファイルを削除
    → 本名・学籍番号のハッシュ値のみ保持（重複登録防止）
    |
privacy_purge バッチ（毎日 03:00 JST）
    → 退会後3日経過した PII を削除
    → 退会後30日経過したメッセージを削除
    → 退会後365日経過したハッシュを削除
```
