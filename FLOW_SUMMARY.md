# Cro-co 認証・承認フロー サマリー

## 現在のフロー図

```
[メール登録] SignupPage (/signup)
     │  supabase.auth.signUp() + emailRedirectTo=/setup/gender
     │  → 確認メール送信（ページ遷移なし）
     ▼
[メールリンクをクリック]
     │
     ▼
[性別設定] GenderSetupPage (/setup/gender)  ← ProtectedRoute のみ（StatusGuard なし）
     │  PATCH /api/profile/me { gender, interest_in }
     │  ※ gender + interest_in が設定済みなら /setup/profile へスキップ
     ▼
[プロフィール設定] ProfileSetupPage (/setup/profile)  ← ProtectedRoute のみ
     │  PATCH /api/profile/me { name, year, faculty, profile_completed:true, ... }
     │  ※ identity_verified=true なら → /home へスキップ
     │  ※ profile_completed=true なら → /upload-student-id へスキップ
     ▼
[学生証提出] UploadStudentIdPage (/upload-student-id)  ← ProtectedRoute のみ
     │  POST /api/profile/upload-student-id (multipart: file, faculty, department, admission_year)
     │  → student_id_image_path + submitted_at を profiles に保存
     ▼
[審査待ち] PendingPage (/pending)  ← ProtectedRoute のみ
     │  GET /api/profile/me → submitted_at で提出済み判定
     │  submitted_at が null なら → /upload-student-id へ誘導
     │  「みんなを見てみる」→ /browse（StatusGuard なし）
     │
     ├─[管理者が承認] POST /api/admin/approve/{id}
     │       ↓ status=approved, identity_verified=true
     │  [ホーム] /home  ← StatusGuard により approved のみアクセス可
     │
     └─[管理者が却下] POST /api/admin/reject/{id}
             ↓ status=rejected, rejection_reason=<理由>
     [却下] RejectedPage (/rejected)  ← StatusGuard によりリダイレクト
             │  「もう一度だけ試してみる」
             │  POST /api/profile/reapply → status=pending_review にリセット
             └─→ /upload-student-id へ（再申請フロー）
```

---

## 各ページの詳細

| ページ | パス | 前提条件 | 主な操作 | 遷移先 |
|---|---|---|---|---|
| SignupPage | /signup | 未ログイン（PublicOnlyRoute） | メール・パスワード登録（@ecs.osaka-u.ac.jp のみ） | 確認メール送信後、メールリンクで /setup/gender |
| GenderSetupPage | /setup/gender | ProtectedRoute（StatusGuard なし） | 性別・恋愛対象を選択して PATCH | /setup/profile |
| ProfileSetupPage | /setup/profile | ProtectedRoute（StatusGuard なし） | 名前・学年・学部（必須）、bio・趣味等（任意）を PATCH | /upload-student-id |
| UploadStudentIdPage | /upload-student-id | ProtectedRoute（StatusGuard なし） | 学部・入学年度・学生証画像を POST | /pending |
| PendingPage | /pending | ProtectedRoute | 審査ステータス確認。提出前なら再アップロードへ誘導 | /upload-student-id（未提出時）、/browse（「みんなを見てみる」） |
| RejectedPage | /rejected | ProtectedRoute（StatusGuard が rejected を検知してリダイレクト） | 却下理由確認・再申請ボタン | /upload-student-id（再申請後） |
| AdminDashboardPage | /admin | ProtectedRoute + AdminGuard | 審査待ちユーザー一覧・学生証確認・承認/却下・通報対応 | — |

---

## StatusGuard の動作

`StatusGuard` は `/home`, `/profile/edit`, `/matches`, `/notifications` に適用。

```
GET /api/profile/me → status を確認
  pending_review → /pending にリダイレクト
  rejected       → /rejected にリダイレクト
  approved       → 子コンポーネントを描画
  取得失敗       → /login にリダイレクト
```

`/browse`, `/profile/:id`, `/chat/:matchId` は StatusGuard なし（pending 状態でもアクセス可能）。

---

## バックエンド API 詳細

| エンドポイント | 認証 | 処理内容 | 問題点 |
|---|---|---|---|
| GET /api/profile/me | get_current_user | profiles 全フィールド + photos + liked_count を返す | なし |
| PATCH /api/profile/me | get_current_user | 任意フィールドを更新。identity_verified=true なら faculty/department/admission_year の変更を無視。gender/interest_in は一度設定したら変更不可 | **レスポンスに photos が含まれない**（空リスト固定） |
| POST /api/profile/upload-student-id | get_current_user | student-ids バケットにアップロード。student_id_image_path + submitted_at + faculty + department + admission_year を profiles に更新 | **status を明示的に pending_review に設定しない**（デフォルト値前提） |
| POST /api/profile/reapply | get_current_user | status=rejected のみ許可。status → pending_review, rejection_reason → null, reviewed_at → null にリセット | submitted_at・student_id_image_path はリセットされない（旧値が残る） |
| GET /api/admin/pending | require_admin | status=pending_review かつ submitted_at IS NOT NULL のユーザー一覧。SELECT: id, email, name, year, faculty, department, bio, submitted_at, student_id_image_path, admission_year, identity_verified | **profile_completed・gender・interest_in が SELECT に含まれない** |
| GET /api/admin/student-id/{id} | require_admin | student_id_image_path から student-ids バケットの署名付き URL（5分有効）を生成。faculty・department・admission_year も返す | 署名付き URL 生成失敗時の fallback なし |
| POST /api/admin/approve/{id} | require_admin | status → approved, identity_verified → true, reviewed_at → now, rejection_reason → null | 既に approved/rejected なら 409 |
| POST /api/admin/reject/{id} | require_admin | status → rejected, reviewed_at → now, rejection_reason → body.reason | 既に approved/rejected なら 409 |
| POST /api/admin/suspend/{id} | require_admin | status → rejected, rejection_reason → "通報による停止"。既に rejected でも上書き可 | なし |

---

## 管理者の学生証確認フロー（AdminDashboardPage）

1. **一覧取得**: `GET /api/admin/pending` → 審査待ちユーザーカードを一覧表示
   - 表示項目: email, name, year, faculty, department, admission_year, bio, submitted_at

2. **学生証確認**: 「学生証を見る」ボタン → `GET /api/admin/student-id/{userId}`
   - Dialog に学生証画像（署名付き URL）+ 申告内容（学部・学科・入学年度）を並べて表示
   - 署名付き URL は 5 分で失効

3. **承認**: 「✓ 承認」ボタン → `window.confirm` → `POST /api/admin/approve/{id}`
   - 承認後、該当ユーザーを一覧から除去してトースト表示

4. **却下**: 「✕ 却下」ボタン → AlertDialog で却下理由入力（最大500文字、**1文字以上必須**）→ `POST /api/admin/reject/{id}`
   - 却下後、該当ユーザーを一覧から除去してトースト表示

---

## 発見した問題点

### 1. [高] RejectedPage の SUPPORT_EMAIL が example.com のまま
- **ファイル**: `frontend/src/pages/RejectedPage.tsx:8`
- `const SUPPORT_EMAIL = 'support@example.com'`
- 本番環境では実際のサポートメールに変更が必要

### 2. [中] PATCH /api/profile/me のレスポンスに photos が含まれない
- **ファイル**: `backend/app/routers/profile.py:180`
- `return ProfileResponse(**response.data[0])` で photos を渡していない（空リスト固定）
- ProfileSetupPage での写真アップロード後の再表示が GET を別途呼ばないと正確でない

### 3. [中] upload-student-id で status を明示的に設定しない
- **ファイル**: `backend/app/routers/profile.py:221-231`
- `update_fields` に `"status": "pending_review"` が含まれていない
- 初回申請では profiles のデフォルト status が pending_review なので問題ないが、
  DB 側のデフォルト値に依存した暗黙の設計になっている
- 再申請フロー（reapply → upload-student-id）では reapply が status をリセットするため問題は出ない

### 4. [低] admin/pending の SELECT に profile_completed・gender・interest_in が欠落
- **ファイル**: `backend/app/routers/admin.py:34`
- 管理者ダッシュボードのプロフィールカードで、プロフィール設定が完了しているかどうかが確認できない
- submitted_at の有無でフィルタリングしているため審査ロジック自体には影響しない

### 5. [低] reapply 後も旧 submitted_at が残る
- **ファイル**: `backend/app/routers/profile.py:571-584`
- reapply では `submitted_at` をリセットしないため、新しい学生証をアップロードする前は
  admin/pending の一覧に前回の submitted_at で表示され続ける
- 新しい学生証をアップロードすると submitted_at が更新されるので実害は限定的

### 6. [既知 TODO] profile-images バケットが Public
- **ファイル**: `backend/app/routers/profile.py:26-27`
- `_public_image_url` が Public CDN URL を生成している
- CLAUDE.md の「[Ph13前]」TODO として記録済み

---

## 修正が必要な箇所

| 優先度 | ファイル | 行番号 | 内容 |
|---|---|---|---|
| 高 | frontend/src/pages/RejectedPage.tsx | 8 | SUPPORT_EMAIL を実際のサポートアドレスに変更 |
| 中 | backend/app/routers/profile.py | 180 | update_my_profile で photos を fetch して ProfileResponse に含める |
| 中 | backend/app/routers/profile.py | 221-231 | upload_student_id の update_fields に `"status": "pending_review"` を追加 |
| 低 | backend/app/routers/admin.py | 34 | SELECT に profile_completed, gender, interest_in を追加（管理者 UX 改善） |
