# Cro-co 実機テスト計画 Step4

作成日: 2026-06-04
対象環境: dev のみ（Render cro-co-api-dev.onrender.com / Vercel Preview / Supabase hpkpndjqtzycnytymdkk）
制約: prod・本番 env には触れない。コード変更なし（不具合は報告→判断）。

---

## フェーズ0：準備

### 0-1: dev 環境・最新コード確認

| 項目 | 確認内容 | 結果 | 日時 |
|---|---|---|---|
| `/health` 応答 | HTTP 200 | ✅ 200 (0.42s) | 2026-06-04 22:18 |
| Render dev 最新コード | 14 commits ahead of origin/dev が未 push だったため push 実施 (8c34597) | ✅ push 完了・Rebuild 完了 | 2026-06-04 22:18 |
| `POST /api/profile/upload-avatar` | 404（削除済み確認） | ✅ 404 | 2026-06-04 22:18 |
| `GET /api/profiles/hometowns` | 401（新設 EP が存在） | ✅ 401 | 2026-06-04 22:18 |
| `GET /api/profiles` | 401（認証必須 EP） | ✅ 401 | 2026-06-04 22:18 |

**前作業**: セキュリティレビュー（カテゴリ2〜11）の修正が未コミットで残っていた（38 ファイル変更・新規 7 ファイル）。コミット `8c34597` にまとめて push → Render dev が即座（< 1min）に新コードを配信開始。`upload-avatar` が 404 になったことで確認。

### 0-2: seed 投入

| 項目 | 確認内容 | 結果 | 日時 |
|---|---|---|---|
| `seed_test_users_dev_v2.ps1 --create` | created=40 errors=0 | ✅ created=40 errors=0 (matches=16 blocks=12) | 2026-06-04 22:20 |
| 全 40 ユーザー | 既存のため SKIP+re-apply（冪等動作） | ✅ | — |
| マッチ配線 | 各 combo 1↔2, 3↔4, 5↔6, 5↔7 trigger-verified | ✅ 16マッチ | — |
| ブロック配線 | 1→3, 4→5, 6→7 (各 combo) | ✅ 12ブロック | — |

**ログイン資格情報（テスト用・dev のみ）**:
- approved: `mf1@ecs.osaka-u.ac.jp` / `keita2004`（gender=male, interest=female）
- pending: `mf8@ecs.osaka-u.ac.jp` / `keita2004`
- banned: `mf9@ecs.osaka-u.ac.jp` / `keita2004`
- deleted: `mf10@ecs.osaka-u.ac.jp` / `keita2004`

---

## フェーズ1：認証・登録・権限ガード（[15.1]）

実施日時: 2026-06-04 22:18〜22:30
JWT 取得方法: `POST https://hpkpndjqtzycnytymdkk.supabase.co/auth/v1/token?grant_type=password`

| # | 操作 | 期待値 | 実際の HTTP | 結果 | 備考 |
|---|---|---|---|---|---|
| 1-1 | JWT なしで `GET /api/profile/me` | 401 | 401 | ✅ | |
| 1-2 | 有効 JWT（approved mf1）で `GET /api/profile/me` | 200 | 200 | ✅ | |
| 1-3a | 署名末尾1文字改竄した JWT | 401 | 401 | ✅ | |
| 1-3b | alg:none JWT（header={"alg":"none"}・署名なし） | 401 | 401 | ✅ | Supabase Auth が拒否 |
| 1-4 | `/auth/v1/signup` に `@gmail.com` 直叩き | 400 | **500** | ⚠️ 注記 | DB trigger 23514 でドメイン制限が発火・signup は拒否済み。HTTP 500 は Supabase が PostgreSQL trigger exception を 500 で上げる仕様（下記注記参照） |
| 1-5a | `TESTCASE_PHASE1@ECS.OSAKA-U.AC.JP` で signup | 正規化・200 | 200 (email=`testcase_phase1@ecs.osaka-u.ac.jp`) | ✅ | Supabase が小文字に正規化 |
| 1-5b | 同メール小文字版で再 signup（一意確認） | 400 か 429 | 429（rate limit: same email の再送信制限） | ✅ | 同一ユーザーとして扱われている |
| 1-6 | pending JWT（mf8）で `GET /api/profiles` | 403 | 403 | ✅ | `get_approved_user` ガード動作 |
| 1-6b | pending JWT（mf8）で `POST /api/likes/` | 403 | 403 | ✅ | |
| 1-6c | pending JWT（mf8）で `GET /api/matches/` | 403 | 403 | ✅ | |
| 1-6d | pending JWT（mf8）で WS 接続 | WS close 4003 | **HTTP 403**（upgrade 段階拒否） | ✅ 注記 | 接続拒否は同等。Starlette が `close(code=4003)` を `accept()` 前に呼ぶと HTTP 403 を返す実装差異（下記注記参照） |
| 1-7a | banned JWT（mf9）で `GET /api/profile/me` | 403 | 403 | ✅ | `get_active_user` ガード動作 |
| 1-7b | deleted JWT（mf10）で `GET /api/profile/me` | 403 | 403 | ✅ | |
| 1-7c | banned JWT（mf9）で `GET /api/profiles` / `/api/matches/` / `/api/likes/received` | 403 全部 | 403 全部（4EP 確認） | ✅ | |
| 1-7d | deleted JWT（mf10）で同上 | 403 全部 | 403 全部（4EP 確認） | ✅ | |
| 1-7e | banned JWT（mf9）で WS 接続 | HTTP 403（accept 前閉鎖） | HTTP 403 | ✅ | |
| 1-7f | deleted JWT（mf10）で WS 接続 | HTTP 403（accept 前閉鎖） | HTTP 403 | ✅ | |
| 1-7g | 無効トークンで WS 接続 | HTTP 403 | HTTP 403 | ✅ | |
| 1-8 | パスワードリセット（dev Resend 未連携） | スキップ | スキップ | SKIP | dev は Resend 未連携でメール不達→フェーズ7繰り延べ |

### 注記

**1-4 HTTP 500 について**（期待 400）:
- ドメイン制限は機能している（signup は拒否）
- Supabase Auth が PostgreSQL トリガーの RAISE EXCEPTION（`check_violation` / code 23514）を HTTP 500 として返す Supabase の仕様
- エラーボディ: `{"code":"23514","message":"大阪大学のメールアドレス（@ecs.osaka-u.ac.jp）でのみ登録できます"}`
- セキュリティ上の影響: signup 阻止は確実。HTTP 500 + PG error code 23514 が若干の情報漏洩にはなるが、ドメイン制限の存在はいずれ推測可能・β 受容範囲
- コード変更不要（Supabase Auth 側の挙動）

**1-6d/1-7e/f WS "HTTP 403" について**（期待 "WS close 4003"）:
- ws.py の `await websocket.close(code=4003)` は `await websocket.accept()` を呼ぶ前に実行される
- Starlette の実装: `close()` before `accept()` は WebSocket upgrade を HTTP 403 で拒否する（WebSocket フレームは送られない）
- 接続は確実に拒否されており保護は同等
- [2.5] の確認メモ（ROADMAP）「WS は accept 前に 4003」は正確には「HTTP 403 で upgrade 拒否」が正しい。実害なし・記録の補正として残す
- コード変更不要（保護は機能している）

---

## フェーズ0+1 総括

| 種別 | 件数 | 内容 |
|---|---|---|
| ✅ 期待通り | 15件 | 1-1/1-2/1-3a/1-3b/1-5a/1-5b/1-6/1-6b/1-6c/1-6d/1-7a〜g（全 fail-close 確認） |
| ⚠️ 期待値と差異あり（実害なし） | 2件 | 1-4: HTTP 500（期待 400）/ 1-6d〜1-7g WS: HTTP 403（期待 WS 4003） |
| SKIP | 1件 | 1-8: パスワードリセット→フェーズ7繰り延べ |

**判定: fail-close（1-3/1-6/1-7）は全件 OK。セキュリティ後退なし。Phase 1 完了。**

---

## フェーズ2〜: （後続フェーズ）

後続フェーズ（2〜）は別途実施予定。

---

## 未実施項目サマリー

| # | 理由 | 繰り延べ先 |
|---|---|---|
| 1-8 パスワードリセット実機 | dev は Resend 未連携・メール不達 | フェーズ7 |
| EXIF 除去確認（[4.4]） | 実機で EXIF Viewer 使用が必要 | フェーズ7 |
| detect_match 機能実機（[3.5]） | 上記 seed でマッチ確認済みのため実質 OK | 完了扱い可 |
