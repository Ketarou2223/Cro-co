# Cro-co

最終更新日: 2026-05-25

大阪大学（@ecs.osaka-u.ac.jp）限定マッチングアプリ（Web版）。個人開発。

---

## ドキュメント一覧

| ファイル | 役割 | 更新タイミング |
|---|---|---|
| `CLAUDE.md` | Claude Code用コーディング規約・触らないファイル・技術スタック・デザインシステム | 規約・スタック・設計決定を変えたとき |
| `HANDOFF.md` | 現状の開発スナップショット（完了済み機能・API一覧・既知の問題） | 機能追加・大きな変更のたびに |
| `DEPLOY.md` | デプロイ手順（Vercel / Render / Supabase / DNS） | デプロイ手順変更時 |
| `ROADMAP.md` | 残タスク管理（βリリース前セキュリティ修正・法務対応） | タスク完了時にチェック |
| `docs/FLOW.md` | 認証・オンボーディング・写真審査のフロー図 | フロー変更時 |
| `docs/PRE_RELEASE_SECURITY_CHECKLIST.md` | リリース前セキュリティチェックリスト | β・本番リリース前に実施 |
| `docs/archive/` | 過去の監査ログ・旧ドキュメント（参照のみ、変更不可） | 追記のみ |
| `docs/IDEAS.md` | 機能アイデア保留リスト（判断トリガー・コスト・効果・リスク） | 機能判断トリガー到達時にチェック |
| `docs/LANDING_PAGE_PLAN.md` | ランディングページ改修方針メモ | LP 改修時に参照 |

---

## 開発を始めるには

1. **CLAUDE.md** を読む（コーディング規約・触らないファイル・デザインシステム）
2. **HANDOFF.md** を読む（現在の機能・進行中タスク・API一覧）
3. **DEPLOY.md** を読む（環境構成・デプロイ手順）

---

## ローカル起動

```powershell
# フロントエンド（http://localhost:5173）
cd frontend
npm run dev

# バックエンド（http://localhost:8000）
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

---

## 本番環境

| 役割 | サービス | URL |
|---|---|---|
| フロントエンド | Vercel | https://crocoweb.jp |
| バックエンド | Render | https://api.crocoweb.jp |
| DB / Auth / Storage | Supabase | — |
| トランザクションメール | Resend | noreply@crocoweb.jp |
