# Cro-co デプロイ手順

## ドメイン構成
- フロント: https://crocoweb.jp（apex）
- フロント www: https://www.crocoweb.jp → crocoweb.jp へリダイレクト
- API: https://api.crocoweb.jp
- DB/Auth/Storage: Supabase（*.supabase.co）

## Vercel（フロントエンド）
1. プロジェクトをインポート（GitHub連携）
2. Root Directory: `frontend`
3. Framework Preset: Vite
4. 環境変数を設定:
   - VITE_API_URL=https://api.crocoweb.jp
   - VITE_SUPABASE_URL=（Supabase ダッシュボードから取得）
   - VITE_SUPABASE_ANON_KEY=（同上）
5. カスタムドメイン追加:
   - crocoweb.jp（Primary）
   - www.crocoweb.jp（crocoweb.jp へリダイレクト設定）
6. DNS 設定（ドメインレジストラ側）:
   - A レコード: @ → 76.76.21.21（Vercel）
   - CNAME: www → cname.vercel-dns.com

## Render（バックエンド）
1. Web Service を新規作成（GitHub連携）
2. Root Directory: `backend`
3. Runtime: Python 3.14
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. 環境変数:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - DATABASE_URL
   - SECRET_KEY
   - ALLOWED_ORIGINS=https://crocoweb.jp,https://www.crocoweb.jp
   - ADMIN_EMAILS
   - RESEND_API_KEY
   - FROM_EMAIL=noreply@crocoweb.jp
   - FRONTEND_URL=https://crocoweb.jp
7. カスタムドメイン追加: api.crocoweb.jp
8. DNS 設定:
   - CNAME: api → <Render が指定するホスト名>

## Supabase
1. ダッシュボード → Authentication → URL Configuration
2. Site URL: https://crocoweb.jp
3. Redirect URLs に追加:
   - https://crocoweb.jp/**
   - https://www.crocoweb.jp/**
4. メールテンプレートの確認メール内リンクが正しく crocoweb.jp になっているか確認

## Resend
1. Domains で crocoweb.jp を追加
2. DNS に表示された SPF / DKIM レコードを追加
3. 検証完了後、FROM_EMAIL を noreply@crocoweb.jp に設定可能

## デプロイ前チェックリスト
- [ ] Supabase の Redirect URLs に本番URL追加済み
- [ ] Vercel の環境変数設定済み
- [ ] Render の環境変数設定済み
- [ ] DNS の伝播確認（A レコード・CNAME）
- [ ] HTTPS 証明書の発行確認（Vercel/Render 自動）
- [ ] 本番でのサインアップ・ログイン動作確認
- [ ] CORS エラーが出ないか確認
