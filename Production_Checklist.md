# 本番デプロイ前チェックリスト

## 🚨 セキュリティ（必須）

### Supabase 認証
- [ ] **Confirm Email を ON に戻す**
  - 場所: Authentication > Sign In / Providers > Email > "Confirm email"
  - 理由: 開発高速化のためOFFにしている。本番では必須。
  
- [ ] **Custom SMTP（Resend）を設定**
  - Resend.com でアカウント作成
  - API キー発行
  - Supabase Authentication > SMTP Settings に設定
  - 理由: 組み込みSMTPは2通/時間しか送れない

- [ ] **Site URL と Redirect URLs を本番ドメインに変更**
  - 場所: Authentication > URL Configuration
  - localhost:5173 ではなく本番URLに

### 環境変数とシークレット
- [ ] **SECRET_KEY を本番用に再生成**
  - `python -c "import secrets; print(secrets.token_hex(32))"`
  - 開発用と本番用で別の値を使う

- [ ] **DATABASE_URL のパスワードを再生成**（任意）
  - 開発中に万が一漏れていないか不安なら念のため

### CORS設定
- [ ] **CORS の allow_origins を本番ドメインに限定**
  - 場所: backend/.env の ALLOWED_ORIGINS
  - 開発時は localhost:5173、本番はデプロイ先のドメインに

## 📋 機能チェック

- [ ] 大学メールドメイン制限が効いているか確認（@ecs.osaka-u.ac.jp）
- [ ] 学生証アップロードのMIMEタイプ・サイズ制限が効いているか
- [ ] 管理者用エンドポイントに ADMIN_EMAILS チェックが入っているか
- [ ] Stripe Webhook の署名検証が実装されているか

## 🧪 テスト

- [ ] 自分以外のテストユーザー2〜3人で一通り操作してみる
- [ ] 友人に大学メールでサインアップしてもらえるか確認
- [ ] スマホからアクセスしてレイアウトが崩れないか確認