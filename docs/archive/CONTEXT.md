# Cro-co 開発コンテキスト（チャット引き継ぎ用）
最終更新: 2026-05-22

## プロジェクト概要
- アプリ名: Cro-co（大阪大学 @ecs.osaka-u.ac.jp 限定マッチングアプリ）
- 開発形態: 個人開発・バイブコーディング
- リポジトリ: C:\01_WorkSpace\Cro-co
- フロント: https://crocoweb.jp（Vercel）
- バックエンド: https://api.crocoweb.jp（Render・Free tier）
- DB/Auth/Storage: Supabase

## 技術スタック
- フロント: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui
- バックエンド: FastAPI + Python 3.14 + Supabase Python client
- 認証: Supabase Auth（JWT）
- リアルタイム: WebSocket（チャット）
- 通知: Web Push（VAPID）+ Resend（メール）
- PWA: vite-plugin-pwa（Service Worker・オフラインキャッシュ）
- キャッシュ: IndexedDB（idb）

## 現在のステータス（2026-05-22時点）
### 完了済み
- 認証・オンボーディング・学生証審査フロー
- プロフィール・ブラウズ・いいね・マッチ・チャット（WebSocket）
- 足跡・通知・安全機能（ブロック・通報・非表示）
- 管理者ダッシュボード
- BeReal型いいね受信枠（バックエンドのみ）
- PWA化（インストール可能・オフラインキャッシュ）
- プッシュ通知（Web Push・VAPID）
- IndexedDBキャッシュによる高速化
- UIリファクタリング（コントラスト・フォーム・タップ領域・Safe area）

### 直近で完了したバグ修正
- clubs カラムバグ修正（browse.py）
- PATCH /api/profile/me のレスポンスに photos を含めるよう修正
- notifications.py を main.py に include

## スケジュール
- 6月末: クローズドテスト開始
- 7月中: β版リリース
- 10月初旬: 本番リリース・課金開始

## 次にやること（Milestone 1: クローズドテスト準備）
優先順：
1. ✅ オンボーディング分割（SetupRequired 5ステップ化・SetupOptional 4ステップ化）
2. ✅ 学部学科データ修正（osaka-u-data.ts・11学部47学科の完全データに置換）
3. ランディングページの作り直し
3. PWAインストール誘導（初回アクセス時）
4. プッシュ通知許可誘導（マッチした瞬間）
5. PC版タブのカクつき修正
6. 管理者ダッシュボード整備

## デザインシステム
- スタイル: ネオブルータリズム × Y2K
- カラー: ink(#0A0A0A) / acid(#DFFF1F) / mint(#A8F0D1) / hot(#FF3B6B) / paper(#FFFFFF)
- フォント: Noto Sans JP（本文）+ Space Mono（英数字アクセント）
- コンポーネント: card-bold（border-2 + 4px solid shadow）
- 禁止: 絵文字・グラデーション・ローディングスピナー

## 重要な設計決定
- ORM なし（Supabase PostgREST 直接）
- マッチ正規化: user_a_id < user_b_id（LEAST/GREATEST）
- 管理者判定: backend .env の ADMIN_EMAILS
- 写真バケット: profile-images（Public）/ student-ids（Private）
- いいね受信枠: 男女マッチ志向の女性のみ・5件/日・JST8〜18時ランダム開放

## 触らないファイル
- frontend/src/lib/api.ts
- frontend/src/lib/supabase.ts
- frontend/src/contexts/AuthContext.tsx
- frontend/src/components/ProtectedRoute.tsx
- backend/app/core/config.py
- backend/app/auth/dependencies.py

## 既知の残課題
- RejectedPage.tsx の SUPPORT_EMAIL が example.com のまま
- profile-images バケットが Public（Ph13前に Private化予定）
- StatusGuard.tsx が App.tsx で未使用のまま残存
- BeReal型受信枠のフロントエンドUI未実装（本番機能）
- Stripe課金未実装（Phase 12）

## 参照ドキュメント
- CLAUDE.md: Claude Code用コーディング規約・設計ガイド
- HANDOFF.md: 詳細な開発引き継ぎドキュメント
- DEPLOY.md: デプロイ手順
- Production_Checklist.md: 本番チェックリスト
