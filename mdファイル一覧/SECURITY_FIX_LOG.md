# Cro-co セキュリティ修正ログ

このドキュメントは β リリース前のセキュリティ修正・法務対応の作業記録です。
各セクションに「実施日」「変更内容」「検証方法」「結果」を記載していきます。

---

## Step 0: 事実確認（2026-05-24）

弁護士相談用文書の作成にあたり、以下の事実を調査しました。

### 確認項目と結果

---

#### 1. メールドメイン制限の実装範囲

**結論: `@ecs.osaka-u.ac.jp` のみ許可。`@osaka-u.ac.jp` 等の他ドメインは一切拒否される。**

制限は 2 層で実装されている:

- **フロントエンド（クライアントバリデーション）**
  - `frontend/src/lib/validation.ts:1`
    ```ts
    const ALLOWED_DOMAIN = '@ecs.osaka-u.ac.jp'
    ```
  - `isAllowedDomain()` が `email.toLowerCase().endsWith('@ecs.osaka-u.ac.jp')` で判定
  - SignupPage (`frontend/src/pages/SignupPage.tsx`) がこの関数でフォーム送信をブロック

- **バックエンド（DB レベルトリガー）**
  - `backend/migrations/034_email_domain_check.sql:11`
    ```sql
    IF NEW.email IS NULL OR NOT (NEW.email ILIKE '%@ecs.osaka-u.ac.jp') THEN
      RAISE EXCEPTION '大阪大学のメールアドレス（@ecs.osaka-u.ac.jp）でのみ登録できます'
    ```
  - Supabase Auth の `auth.users` テーブルへの INSERT 前トリガーとして動作するため、フロントを迂回したリクエストも拒否される

---

#### 2. 対象学部の範囲

**結論: コード・ドキュメント内に学部の明示的な記述なし。`@ecs.osaka-u.ac.jp` のドメイン解釈は「要確認」。**

- 利用規約 (`frontend/src/pages/TermsOfServicePage.tsx:47`) は「大阪大学の現役学生」と記載しており、学部の限定はない
- `@ecs.osaka-u.ac.jp` ドメインが実際に阪大のどの学部・研究科に割り当てられているかは、コード内のコメント・ドキュメントいずれにも記述なし
- **要確認: 阪大 IT ポリシーまたは情報推進部に確認し、`@ecs.osaka-u.ac.jp` の付与対象学部を明記する必要あり**
  （一般的に `ecs` は工学系（Engineering / Computer Science 系）を指すことが多いが、確認が必要）

---

#### 3. 18歳未満排除の実装

**結論: フロントエンドにバリデーションあり。管理者審査 UI でも生年月日を目視確認できる。バックエンド単体でのバリデーションは未確認。**

- **フロントエンドのクライアントバリデーション**
  - `frontend/src/pages/SetupRequiredPage.tsx:95`
    ```ts
    if (age < 18) return '18歳以上の方のみご利用いただけます'
    ```
  - オンボーディング時に生年月日を入力させ、18歳未満は先に進めない

- **管理者の審査 UI**
  - `frontend/src/pages/admin/tabs/PendingTab.tsx:213`
    ```tsx
    <p className="font-bold text-ink">{profile.birth_date ?? '未設定'}</p>
    ```
  - 「【本人確認情報 ← 学生証と照合】」という注釈付きで生年月日が表示される（`PendingTab.tsx:200`）
  - 管理者が学生証審査時に生年月日を目視確認する UI フローが存在する

- **バックエンドのバリデーション**
  - バックエンド（`backend/app/`）の Python コードに age < 18 チェックの実装は確認できなかった（Grep 結果に該当なし）
  - **要確認: `backend/app/routers/profile.py` 等でサーバー側の年齢バリデーションを実装しているか確認・追加が必要**

---

#### 4. 利用規約・プライバシーポリシーへの同意取得フロー

**結論: サインアップページにチェックボックスが実装済み。規約本文は既存ドラフトあり（2026-01-01 付け）。**

- **同意チェックボックス**
  - `frontend/src/pages/SignupPage.tsx:17-27` で `agreed` state を管理
  - `frontend/src/pages/SignupPage.tsx:120-129` に「利用規約」「プライバシーポリシー」の両方を読んで同意するチェックボックスを実装
  - `agreed === false` の場合は登録ボタンが `disabled`（`SignupPage.tsx:137`）かつエラーメッセージ表示

- **規約ページの現状**
  - 利用規約: `/terms` (`frontend/src/pages/TermsOfServicePage.tsx`) — LAST UPDATED: 2026.01.01
  - プライバシーポリシー: `/privacy` (`frontend/src/pages/PrivacyPolicyPage.tsx`) — LAST UPDATED: 2026.01.01
  - PrivacyPolicyPage のお問い合わせ先: `support@cro-co.example.com`（**プレースホルダーのまま。リリース前に実際のアドレスへ変更が必須**）

- **規約内の記載内容（抜粋）**
  - 利用資格として「満18歳以上」「@ecs.osaka-u.ac.jp ドメイン所持」「学生証による本人確認完了」を明記
  - 準拠法は日本法、専属合意管轄は大阪地方裁判所

---

#### 5. 退会機能の現状

**結論: フロントエンドに「アカウントを削除する」UI 実装済み。ログアウトと明確に区別されている。**

- **退会（アカウント削除）UI**
  - `frontend/src/pages/SettingsPage.tsx:487-529` に「アカウントを削除する」セクション実装済み
  - `DELETE /api/profile/me` を呼び出す（`SettingsPage.tsx:178`）
  - AlertDialog（二段確認ダイアログ）を経由して削除実行（誤操作防止あり）
  - 削除後は `supabase.auth.signOut()` + `/login` へリダイレクト

- **ログアウト vs アカウント削除の区別**
  - ログアウトボタン（`SettingsPage.tsx:480`）と削除ボタン（`SettingsPage.tsx:487-529`）は UI 上で別セクションに配置され、視覚的に明確に区別されている

- **PrivacyPolicyPage.tsx:82 の記述との整合性**
  - PP には「退会後 30 日以内にすべての個人情報を削除」と記載されているが、実装上は即時削除（`DELETE /api/profile/me`）
  - **要確認: 即時削除か 30 日猶予かを実装と PP で統一する必要あり**

---

#### 6. お問い合わせ機能の現状

**結論: ユーザー向けの「お問い合わせフォーム」ページは未実装。メールアドレスの掲示のみ。管理者側の受信・返信 UI は実装済み。**

- **ユーザー向け送信フォーム**
  - `frontend/src/pages/InquiryPage.tsx` は存在しない（Glob 結果: No files found）
  - `frontend/src/pages/SettingsPage.tsx:452-453` でお問い合わせメールアドレスを掲示するのみ（`cro-co.support@ecs.osaka-u.ac.jp`）
  - フロントからの `POST /api/inquiries` 等のフォーム送信は現時点で未実装

- **管理者向け受信・返信 UI**
  - `frontend/src/pages/admin/tabs/InquiriesTab.tsx` に問い合わせ一覧・ステータス管理・返信機能を実装済み
  - ステータス: `unread` / `read` / `replied` / `closed`
  - 管理者からの返信: `POST /api/admin/inquiries/{id}/reply`

- **要確認: ユーザーが問い合わせを DB に送信するためのフォームページの実装が必要か、メールのみで運用するかを決定する**

---

#### 7. 写真投稿の権利関係

**結論: 利用規約にもコードにも著作権・利用許諾に関する記述は一切存在しない。**

- `frontend/src/pages/TermsOfServicePage.tsx` の全条文を確認したが、投稿コンテンツの著作権・利用許諾条項はなし
- `frontend/src/pages/PrivacyPolicyPage.tsx` にも権利関係の記述なし
- コード内のコメント・ドキュメントにも該当なし
- **要対応（弁護士相談必須）: 「ユーザーが投稿した写真の著作権はユーザーに帰属する」「運営者はサービス提供に必要な範囲で使用できる」等の条項を利用規約に追記する必要がある**

---

#### 8. 管理者の構成

**結論: 複数管理者を許容する設計。現時点での具体的な管理者構成はコードからは判断不能。**

- **設計**
  - `backend/app/core/config.py:31`: `admin_emails_csv: str` でカンマ区切りの複数メールを受け取る設計
  - `backend/app/core/config.py:35`: `admin_emails` property でリスト化
  - 複数管理者を技術的にはサポート済み

- **.env.example の記述**
  - `backend/.env.example:29`: `ADMIN_EMAILS=admin@ecs.osaka-u.ac.jp`（サンプルは 1 件）

- **運営者の記載**
  - `frontend/src/pages/PrivacyPolicyPage.tsx:35`: 「大阪大学に在籍する個人が開発・運営する」と記載（個人名の記載なし）
  - コード内に共同運営者への言及なし
  - **要確認: 実運用時の ADMIN_EMAILS に設定するアドレスと、PP の「運営者情報」への個人名または屋号の記載要否を確認する**

---

### Step 0 まとめ：弁護士相談前に解決が必要な事項

| 優先度 | 項目 | 詳細 |
|--------|------|------|
| 🔴 高 | 写真著作権条項の追加 | 利用規約に投稿コンテンツの権利規定がない |
| 🔴 高 | PP のお問い合わせ先をプレースホルダーから実アドレスへ変更 | `support@cro-co.example.com` のまま |
| 🟡 中 | PP の退会後データ削除期間と実装の統一 | PP は「30日以内」、実装は即時削除 |
| 🟡 中 | `@ecs.osaka-u.ac.jp` の対象学部確認 | 「大阪大学の現役学生」と規約に書いているが実際は特定学部限定の可能性 |
| 🟡 中 | バックエンドの年齢バリデーション追加 | フロント・管理者 UI にはあるが Python コード側に明示的なチェックなし |
| 🟢 低 | ユーザー向けお問い合わせフォームの実装方針決定 | メールのみ運用か、フォーム実装するかの意思決定 |
| 🟢 低 | PP の運営者情報への個人名・屋号記載 | 現在「個人が運営」と記載のみ |
