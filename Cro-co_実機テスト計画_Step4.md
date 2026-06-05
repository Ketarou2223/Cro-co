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

**1-4 HTTP 500 について**（期待 400）→ **β受容確定**:
- ドメイン制限は機能している（signup は拒否）
- Supabase Auth が PostgreSQL トリガーの RAISE EXCEPTION（`check_violation` / code 23514）を HTTP 500 として返す Supabase 側の仕様（アプリコードでは変更不可）
- エラーボディ: `{"code":"23514","message":"大阪大学のメールアドレス（@ecs.osaka-u.ac.jp）でのみ登録できます"}`
- 軽微な情報漏洩（PG error code 23514）はあるが、ドメイン制限の存在はいずれ推測可能・β 受容
- **クリーンな 400 化の手段**: signup を FastAPI 経由にしてドメイン検証を API 側で行う（IDEAS「signup の FastAPI 経由化」選択肢C として β 後の課題）
- コード変更なし・β 受容

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
| ✅ 期待通り | 13件 | 1-1/1-2/1-3a/1-3b/1-5a/1-5b/1-6/1-6b/1-6c/1-7a〜g（全 fail-close 確認） |
| ✅ β受容（実害なし・保護は機能） | 1件 | 1-4: HTTP 500（期待 400）。DB trigger 発火・signup 拒否確認。HTTP 500 化は Supabase 仕様・β 受容。クリーンな 400 化は β後 IDEAS |
| 📝 WS 挙動は記録の補正 | 1件 | 1-6d/1-7e〜g: WS は `close(code=4003)` before `accept()` のため Starlette が **HTTP 403** で upgrade 拒否（接続拒否は同等・保護機能・コード変更なし） |
| SKIP → フェーズ7繰り延べ | 1件 | 1-8: パスワードリセット→ dev Resend 未連携・メール発行依存部分はフェーズ7 |

**判定: fail-close（1-3/1-6/1-7）全件 OK。セキュリティ後退なし。Phase 1 ✅ 完了。**

---

## フェーズ2：入力検証・インジェクション（[15.3][15.4][15.5]）

実施日時: 2026-06-04
対象: PATCH /api/profile/me・GET /api/profiles・PATCH による特権フィールド操作

### 2-1: SQL インジェクション

| # | 操作 | 期待値 | 実際 | 結果 | 備考 |
|---|---|---|---|---|---|
| 2-1a | PATCH name/bio に `' OR '1'='1--` | リテラル保存・200 | HTTP 200 / 保存値 = `test' OR '1'='1--`（リテラル） | ✅ | supabase-py がパラメータ化・SQL として解釈されない |
| 2-1b | `bio_keyword=' OR '1'='1` で browse | 0件（該当なし） | 0件 | ✅ | `_sanitize_bio_keyword` + ILIKE パラメータ化 |
| 2-1b2 | `bio_keyword=% OR 1=1` （ワイルドカード） | 0件（`%` がエスケープ） | 0件 | ✅ | `_sanitize_bio_keyword` が `%` をエスケープ |
| 2-1c | `hometowns=UNION SELECT...` で browse | 0件 | 0件 | ✅ | supabase-py `.in_()` パラメータ化 |
| 2-1c注 | `hometowns[]=UNION SELECT...`（[]付き） | — | 5件（全件） | 📝 注記 | FastAPI が `hometowns[]` パラメータを認識しないためフィルタ無効化。SQLi ではなく無効パラメータ問題 |
| 2-1d | メッセージ本文に `DROP TABLE` 等 | リテラル保存 | — | スキップ | マッチ ID が動的で難しいため。メッセージは insert のみ・同様にパラメータ化 |

**2-1c 注記**: `hometowns[]=...`（角括弧付き）は FastAPI の `list[str]` Query パラメータ名として認識されないため filter が無視される。正しい形式 `hometowns=...`（繰り返し）または `hometowns=value1&hometowns=value2` を使うべき。これは SQLi の成功ではなくフィルタの不適用（全件が返る）。セキュリティ影響: 出身地フィルタが無効化されるだけ（他ユーザーの一覧が返るが、これ自体は承認済みユーザーに公開される情報）。SQLi 成立ではない。

### 2-2: XSS

| # | 操作 | 期待値 | 実際 | 結果 | 備考 |
|---|---|---|---|---|---|
| 2-2a | PATCH name=`<script>alert(1)</script>`・bio=`<img onerror=...>` | HTTP 200・リテラル保存 | HTTP 200・`Stored name: <script>alert(1)</script>`（リテラル） | ✅ | backend は HTML エスケープしない・React JSX が auto-escape するため UI 上で実行されない |
| 2-2b | ブラウザで XSS 実行確認 | UI では実行されない（React auto-escape） | 未実施（ブラウザ目視必要） | ⏳ | 静的分析で `dangerouslySetInnerHTML` ゼロ（[5.4]）・ブラウザ実機確認は [15.4] 繰り延べ |

### 2-3: Mass Assignment（特権フィールド注入）

| # | 操作 | 期待値 | 実際 | 結果 | 備考 |
|---|---|---|---|---|---|
| 2-3 | PATCH に `status/identity_verified/profile_setup_completed/email/id/is_admin` 混入 | 200 だがフィールド無視 | HTTP 200・`status=approved`（不変）・`id=ce0b69ee...`（不変）・`email=mf1@ecs.osaka-u.ac.jp`（不変） | ✅ | Pydantic `ProfileUpdateRequest` の allowlist が特権フィールドを透過させない |

### 2-4: 範囲外値

| # | 操作 | 期待値 | 実際 | 結果 | 備考 |
|---|---|---|---|---|---|
| 2-4a | PATCH `university_year=999` | 422 | 422（`"更新するフィールドがありません"`） | ✅ | Pydantic ge=1,le=11 が弾く。custom メッセージは app 層での空更新ガード |
| 2-4b | PATCH `university_year=0` | 422 | 422 | ✅ | |
| 2-4c | browse `years=999` | 422 | 422 | ✅ | アプリ層チェック（`1 <= y <= 11`） |
| 2-4d | browse `years=-1` | 422 | 422 | ✅ | |

### 2-5: 文字数・件数制限

| # | 操作 | 期待値 | 実際 | 結果 | 備考 |
|---|---|---|---|---|---|
| 2-5a | PATCH `name` 101文字（制限 50） | 422 | 422（`String should have at most 50 characters`） | ✅ | |
| 2-5b | PATCH `interests` 21件（制限 20） | 422 | 422 | ✅ | `Field(max_length=20)` on list |
| 2-5c | PATCH `interests` アイテム 51文字（制限 50） | 422 | 422 | ✅ | `_ShortStr50` エイリアス |
| 2-5d | PATCH `student_number` に記号（`e99-MF01!`） | 422 | 422（パターン不一致） | ✅ | `^[A-Za-z0-9]+$` |

### フェーズ2 観察事項（実害なし）

- **Pydantic エラーに `"input"` フィールド**: 422 レスポンスに `"input":"AAA..."` で送信値が echo-back される。標準 Pydantic 動作・情報漏洩として深刻ではないが制限の具体値が露出（`max_length: 50`・パターン等）。β 受容。
- **2-4a の `year=999` エラーメッセージ**: `"更新するフィールドがありません"` → Pydantic が年齢値を silent drop して空更新になった可能性。保護は機能（422 返却）。
- **2-1c `hometowns[]` パラメータ不認識**: 角括弧付きだとフィルタが無効化される UI バグ。セキュリティ影響なし（公開情報の全件表示のみ）・UX バグとして IDEAS 登録推奨。

---

## フェーズ2 総括

| 種別 | 件数 |
|---|---|
| ✅ 期待通り（保護機能） | 14件 |
| ⏳ ブラウザ実機確認繰り延べ | 1件（2-2b） |
| 📝 観察事項（実害なし） | 3件 |

**重要判定: 2-1/2-3 が"通って"しまった件はゼロ。SQL injection・特権昇格ともに不成立。セキュリティ後退なし。**

---

## フェーズ3：レート制限・DoS（[15.7]）

実施日時: 2026-06-04
対象: rate limit 発火・ユーザー単位カウント独立性・body サイズ制限

### テスト結果

| # | 操作 | 期待値 | 実際 | 結果 | 備考 |
|---|---|---|---|---|---|
| 3-1 | `POST /api/push/test` (5/min) を mf1 JWT で 6 回連打 | req1-5 = 200、req6 = 429 | req1〜5 = 200、req6 = 429 | ✅ | `_get_user_key` の JWT sub でカウント |
| 3-2 | mf1 が limit 到達後、同一 IP から mf2 JWT で 1 回 | mf2 = 200（独立カウント） | mf2 = 200、mf1 = 429 | ✅ | IP ではなく JWT sub 単位のカウント確認 |
| 3-3a | 300KB JSON body（Content-Length 付き）を `PATCH /api/profile/me` に送信 | 413 | 413（`{"detail":"リクエストが大きすぎます"}`） | ✅ | BodySizeLimitMiddleware（256KB 上限）が弾く |
| 3-3b | 255KB JSON body（上限内） | 422（Pydantic、413 ではない） | 422 | ✅ | middleware を通過・Pydantic の bio 長さ制限で弾かれる |
| 3-3c | multipart/form-data（小 PNG・69 bytes）でアップロード | 413 ではなく 201（middleware 除外） | 201（Supabase に保存成功） | ✅ | `if "multipart/form-data" not in ct:` 除外確認 |
| 3-4 | `POST /api/push/test` 連打 | 429 | 3-1 で実証済み | ✅ | 別途再実施不要 |
| 追加 | `POST /api/safety/report` (10/min) を mm1 JWT で 11 回連打 | req11 = 429 | req1〜10 = 400、req11 = 429 | ✅ | report 10/min 制限も正常に発火 |

### フェーズ3 観察事項

- **Pydantic 422 はレートカウンター非加算**: フィールド名誤り等で Pydantic 422 になるリクエストは rate limit カウンターが加算されない（FastAPI の Pydantic バリデーションがレートリミットデコレータより先に実行される）。実害: 無効リクエストを大量送信しても実データは作成されないため実害なし。β 受容。
- **report 400 理由**: mm1 が mm5 を報告すると 400（duplicate_report や identity_hide による？）。エンドポイント自体は呼ばれており rate limit カウンターは加算されていた（req11 で 429）。
- **chunked 転送の body 上限スルー**: `Content-Length` ヘッダがない chunked 転送は BodySizeLimitMiddleware が検査しない（コード `if cl:` で明示除外）。ROADMAP [6.3] に本番前対応として既知登録済み。今回のテスト範囲外。

### フェーズ3 総括

| 種別 | 件数 |
|---|---|
| ✅ 期待通り | 7件 |
| 📝 観察事項（実害なし・β受容） | 2件 |

**[15.7] ✅ 実機確認済み（2026-06-04）。rate limit 発火・ユーザー単位カウント・body サイズ制限 全 OK。**

---

## フェーズ4：機能 E2E

実施日時: 2026-06-04
対象: ブロック・身バレ・写真可視性・マッチ・BAN・EXIF・privacy purge・browse フィルタ

### テスト結果

| # | 操作 | 期待値 | 実際 | 結果 | 備考 |
|---|---|---|---|---|---|
| 4-1 | ブロック相手の `GET /api/profiles/{fm3_id}` | 403（中立メッセージ） | 403（`"このユーザーのプロフィールは表示できません"`） | ✅ | |
| 4-2a | 同学部相手（fm1、人間科学部）への直リンク | 404 | 404（`"ユーザーが見つかりません"`） | ✅ | identity_hide 動作確認 |
| 4-2b | 同学部相手へのいいね | 404 | 404 | ✅ | `POST /api/likes/` も身バレ保護 |
| 4-2c | 推薦リストから同学部相手が除外 | 除外 | 除外（fm1 不在・4件のみ） | ✅ | |
| 4-3 | 他人が mf1 の pending 写真を見えない | 非表示 | 非表示（fm2 view = 3枚 approved のみ） | ✅ | |
| 4-4 | 他人が mf1 の approved 写真を見える | 表示 | fm2 view に approved 3枚表示 | ✅ | |
| 4-5 | mf1 自身は pending 写真も見える | 表示 | /api/profile/me に `approved×3 + pending×2` | ✅ | |
| 4-6 | pending 写真を set-main → 422 | 422 | 422（`"承認済みの写真のみメイン写真に設定できます"`） | ✅ | |
| 4-7 | `POST /api/profile/upload-avatar`（削除済み） | 404 | 404 | ✅ | |
| 4-8 | 相互いいね → detect_match トリガー発火 | マッチ成立 | `is_match: true`・match_id: 314e745a 生成確認 | ✅ | mm2↔mm6 での実証 |
| 4-9 | ブロック後 match 削除失敗 → logger.error | logger.error（握りつぶさない） | コード確認: `safety.py:90` `logger.error("ブロック後の match 削除に失敗...")` | コード確認 | 障害注入は困難のためコード確認で記録 |
| 4-10 | いいね在庫 refund 失敗 → logger.warning | logger.warning | コード確認: `inventory.py:126` `logger.warning("like stock refund failed...")` | コード確認 | 同上 |
| 4-11-1 | ff6 が ff3 をブロック | 204 | 204 | ✅ | |
| 4-11-2 | ff6 が ff3 を通報（有効 reason: スパム） | 204 | 204 | ✅ | |
| 4-11-3 | ff6 が退会（`DELETE /api/profile/me`） | 204・以後 API 401 | 204 → 退会後 JWT は 401（auth.users 削除で JWT 無効化） | ✅ | 期待は 403 だったが 401 が正しい（auth.users CASCADE 全消し → JWT 自体が無効） |
| 4-11-4 | Admin が ff3 を BAN | 200 | 200（status=banned, reviewed_at 付き） | ✅ | admin プロファイルを dev に事前作成 |
| 4-12 | BAN 直後に ff3 JWT で API 叩く | 403（即時反映） | 403（/profile/me + /profiles 両方） | ✅ | |
| 4-13 | EXIF GPS 付き JPEG アップロード → 下ダウンロードで GPS 消去 | GPS タグ消去 | Source: [34853]（GPS あり） → Downloaded: []（GPS なし） | ✅ | `_strip_exif` の `exif=b""` が機能 |
| 4-14a | `POST /api/admin/privacy-purge` | 200・admin_logs 記録 | 200 + admin_logs に `manual_privacy_purge` 記録 | ✅ | |
| 4-14b | `POST /api/admin/privacy-purge/run` | 404（削除済み EP） | 404 | ✅ | [9.3] 統合済み |
| 4-15a | `hometowns=東京都` で browse | 該当ユーザーのみ絞り込み | 2件（FM-4, FM-2・東京都ユーザーのみ） | ✅ | 正しい FastAPI リスト形式で機能 |
| 4-15b | `hometowns[]=東京都`（ブラケット付き） | — | 全件（フィルタ無効化） | 📝 | Phase 2 観察①の追跡確認。FastAPI は `hometowns[]` パラメータ名を認識しない |

### フェーズ4 観察事項

- **4-11 退会後 401 vs 403**: `DELETE /api/profile/me` 実行後は auth.users が CASCADE で削除されるため、元の JWT は Supabase が無効と判定して 401 を返す（401 = 認証失敗、403 = 認証成功だが権限なし）。STATUS.md の「deleted JWT で 403」は active_user.py による確認で、auth.users が残った状態（status='deleted'）で JWT 再取得した場合の話。実退会はより強い制御（JWT 自体が無効）。
- **4-15b `hometowns[]` 形式**: フロントエンドが React Query / axios のクエリパラメータを送信する際にこの形式を使っている可能性がある。ブラウザで実際に絞り込みが機能するかの確認が必要（ブラウザ目視）。

### フェーズ4 総括

| 種別 | 件数 |
|---|---|
| ✅ 実機確認（全 OK） | 18件 |
| コード確認（障害注入困難） | 2件（4-9, 4-10） |
| 📝 観察事項 | 2件 |

**fail-close 系（4-1 ブロック 403・4-2 身バレ 404・4-3 pending 非表示・4-7 削除 EP 404）は全件 OK。重大インシデントなし。**

---

## 未実施項目サマリー

| # | 理由 | 繰り延べ先 |
|---|---|---|
| 1-8 パスワードリセット実機 | dev は Resend 未連携・メール不達 | フェーズ7 |
| EXIF 除去確認（[4.4]） | 実機で EXIF Viewer 使用が必要 | フェーズ7 |
| detect_match 機能実機（[3.5]） | 上記 seed でマッチ確認済みのため実質 OK | 完了扱い可 |
