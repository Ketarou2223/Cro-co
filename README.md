# Cro-co

最終更新日: 2026-05-27

`@ecs.osaka-u.ac.jp` 限定の阪大学部生・院生向けマッチングアプリ（Web版）。個人開発。

- 対象: 大阪大学**学部生・院生全員**の共通メール `@ecs.osaka-u.ac.jp`（終生有効・工学系限定ではない）
- 対象母数: 学部生・院生（数値未確定のため記載省略）

---

## ドキュメント目次

### ルート

| ファイル | 役割 | いつ読む |
|---|---|---|
| README.md | 全ファイル目次・ローカル起動（このファイル） | 最初に |
| CLAUDE.md | Claude 向け絶対ルール・md 管理ルール・技術スタック・デザインシステム | 作業開始時 |
| STATUS.md | ユーザー向け俯瞰ボード（今どこ・直近の動き・次やること・コスト） | 状況確認したいとき |
| HANDOFF.md | Claude 向け技術引き継ぎ（実装済み機能・既知の問題・設計判断ログ） | 新しいセッション開始時 |

### docs/

| ファイル | 役割 | いつ読む |
|---|---|---|
| docs/ARCHITECTURE.md | API 全エンドポイント一覧・DB スキーマ・RLS・フロー・「どこで何を弾いているか」マトリックス・マイグレーション・環境変数 | API 追加・変更時 |
| docs/DEPLOY.md | デプロイ手順・環境構成（Vercel / Render / Supabase / Resend / DNS） | デプロイ時・環境設定変更時 |
| docs/ROADMAP.md | 残タスク管理・リリース前セキュリティチェックリスト | タスク完了時・リリース前 |
| docs/IDEAS.md | 機能アイデア保留リスト（判断トリガー・コスト・効果・リスク） | 機能判断時 |
| docs/archive/ | 過去の監査ログ・廃止ドキュメント（参照のみ・変更不可） | 歴史を確認したいとき |

---

## 開発を始める

1. CLAUDE.md を読む（絶対ルール・触らないファイル・md 管理ルール）
2. STATUS.md で現状把握
3. HANDOFF.md で実装済み機能と既知の問題を確認
4. 該当作業に関連する docs/ 配下のファイルを読む

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
