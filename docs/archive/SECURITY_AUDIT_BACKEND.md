# バックエンド セキュリティ監査レポート

**調査日**: 2026-05-24  
**対象**: `backend/app/routers/` 全ファイル、`backend/app/auth/dependencies.py`、`backend/app/main.py`、`backend/app/routers/ws.py`（WebSocket）  
**総エンドポイント数**: 73（HTTP: 72、WebSocket: 1）

---

## 1. エンドポイント一覧

### health.py

| # | ファイル | メソッド | パス | 認証 | 認可方法 | 入力検証 | 想定リスク |
|---|---------|---------|-----|-----|---------|---------|----------|
| 1 | health.py | GET | /health | 公開 | なし | なし | ユーザーデータ非公開・問題なし |

---

### profile.py（prefix: /api/profile）

| # | ファイル | メソッド | パス | 認証 | 認可方法 | 入力検証 | 想定リスク |
|---|---------|---------|-----|-----|---------|---------|----------|
| 2 | profile.py | GET | /api/profile/me | JWT必須 | current_user.idでフィルタ | なし | なし |
| 3 | profile.py | PATCH | /api/profile/me | JWT必須 | current_user.idでフィルタ | Pydantic: ProfileUpdateRequest | なし（レートリミット60/min付き） |
| 4 | profile.py | POST | /api/profile/upload-student-id | JWT必須 | current_user.idでフィルタ | MIMEタイプ・サイズ検証あり・フォーム値の手動検証あり | EXIFデータが削除されない（位置情報漏洩リスク） |
| 5 | profile.py | POST | /api/profile/upload-avatar | JWT必須 | current_user.idでフィルタ | MIMEタイプ・サイズ検証あり | EXIFデータが削除されない |
| 6 | profile.py | GET | /api/profile/avatar-url | JWT必須 | current_user.idでフィルタ | なし | なし |
| 7 | profile.py | PATCH | /api/profile/photos/reorder | JWT必須 | 全IDが自分のものか確認（DB照合） | Pydantic: PhotoReorderRequest | なし（所有確認済み） |
| 8 | profile.py | POST | /api/profile/photos | JWT必須 | current_user.idでフィルタ | MIMEタイプ・サイズ検証あり | EXIFデータが削除されない |
| 9 | profile.py | DELETE | /api/profile/photos/{photo_id} | JWT必須 | photo.user_id == current_user.id 確認 | UUID型強制 | なし |
| 10 | profile.py | POST | /api/profile/reapply | JWT必須 | current_user.idでフィルタ | status=="rejected"チェックあり | **レートリミットなし**（再申請スパム可能） |
| 11 | profile.py | POST | /api/profile/ping | JWT必須 | current_user.idでフィルタ | なし | なし（レートリミット20/min付き） |
| 12 | profile.py | DELETE | /api/profile/me | JWT必須 | current_user.idでフィルタ | なし | 本人のみ削除可・問題なし |
| 13 | profile.py | POST | /api/profile/complete-onboarding | JWT必須 | current_user.idでフィルタ | 必須項目の有無確認あり | なし |
| 14 | profile.py | POST | /api/profile/photos/{photo_id}/set-main | JWT必須 | photo.user_id == current_user.id 確認 | UUID型強制 | なし |

---

### browse.py（prefix: /api）

| # | ファイル | メソッド | パス | 認証 | 認可方法 | 入力検証 | 想定リスク |
|---|---------|---------|-----|-----|---------|---------|----------|
| 15 | browse.py | GET | /api/profiles | JWT必須 | profile_setup_completed確認・ブロック/非表示除外・BeReal枠フィルタ | Query params: ge/le/max_length制約 | なし（レートリミット30/min付き） |
| 16 | browse.py | GET | /api/profiles/recommended | JWT必須 | status==approved確認・ブロック/非表示/マッチ済み除外 | なし | なし |
| 17 | browse.py | GET | /api/profiles/views | JWT必須 | status==approved確認・viewed_id==current_user.idでフィルタ | なし | なし |
| 18 | browse.py | POST | /api/profiles/views/confirm | JWT必須 | status==approved確認・viewed_id==current_user.idでフィルタ | なし | なし |
| 19 | browse.py | GET | /api/profiles/completeness-rank | JWT必須 | status==approved確認 | なし | 全ユーザーの集計スコアを取得（個人特定不可・問題なし） |
| 20 | browse.py | GET | /api/profiles/{user_id} | JWT必須 | profile_setup_completed確認・自分以外はstatus==approved強制 | UUID型強制 | **ブロック/非表示チェックなし**（ブロックした相手でも直接UUIDで閲覧可能・足跡も記録される） |

---

### like.py（prefix: /api/likes）

| # | ファイル | メソッド | パス | 認証 | 認可方法 | 入力検証 | 想定リスク |
|---|---------|---------|-----|-----|---------|---------|----------|
| 21 | like.py | POST | /api/likes/ | JWT必須 | profile_setup_completed確認・自分へのいいね禁止・相手のapproved確認・BeReal枠チェック | Pydantic: LikeCreateRequest | なし（レートリミット60/min付き） |
| 22 | like.py | GET | /api/likes/quota | JWT必須 | current_user.idでフィルタ | なし | なし |
| 23 | like.py | GET | /api/likes/today-count | JWT必須 | current_user.idでフィルタ | なし | なし |
| 24 | like.py | GET | /api/likes/received | JWT必須 | status==approved確認・liked_id==current_user.idでフィルタ | Query: bool型 | なし |
| 25 | like.py | POST | /api/likes/dismiss/{liker_id} | JWT必須 | liked_id==current_user.idでフィルタ（自分が受け取ったいいねのみ） | liker_idはstr型（UUID未強制） | liker_idに任意文字列を渡しても被害なし（liked_id=current_userで絞込済み）、実質問題なし |
| 26 | like.py | POST | /api/likes/received/confirm | JWT必須 | status==approved確認・liked_id==current_user.idでフィルタ | なし | なし |

---

### match.py（prefix: /api/matches）

| # | ファイル | メソッド | パス | 認証 | 認可方法 | 入力検証 | 想定リスク |
|---|---------|---------|-----|-----|---------|---------|----------|
| 27 | match.py | GET | /api/matches/ | JWT必須 | profile_setup_completed確認・OR(user_a_id,user_b_id)でフィルタ | なし | なし |
| 28 | match.py | GET | /api/matches/unread-count | JWT必須 | status==approved確認・current_user.idでフィルタ | なし | なし |
| 29 | match.py | GET | /api/matches/{match_id} | JWT必須 | profile_setup_completed確認・マッチ参加者確認（user_a/b_id） | UUID型強制 | なし |
| 30 | match.py | DELETE | /api/matches/{match_id} | JWT必須 | profile_setup_completed確認・マッチ参加者確認（user_a/b_id） | UUID型強制 | なし |

---

### message.py（prefix: /api/messages）

| # | ファイル | メソッド | パス | 認証 | 認可方法 | 入力検証 | 想定リスク |
|---|---------|---------|-----|-----|---------|---------|----------|
| 31 | message.py | POST | /api/messages/ | JWT必須 | status==approved確認・マッチ参加者確認 | Pydantic: MessageCreateRequest | なし（レートリミット30/min付き） |
| 32 | message.py | GET | /api/messages/{match_id} | JWT必須 | status==approved確認・マッチ参加者確認 | UUID型強制・limit≤100 | なし |
| 33 | message.py | POST | /api/messages/{message_id}/react | JWT必須 | status==approved確認・メッセージのmatch_idからマッチ参加者確認 | UUID型強制 | なし |
| 34 | message.py | POST | /api/messages/{match_id}/read | JWT必須 | status==approved確認・マッチ参加者確認 | UUID型強制 | なし |

---

### safety.py（prefix: /api/safety）

| # | ファイル | メソッド | パス | 認証 | 認可方法 | 入力検証 | 想定リスク |
|---|---------|---------|-----|-----|---------|---------|----------|
| 35 | safety.py | POST | /api/safety/block | JWT必須 | status==approved確認・自分へのブロック禁止 | Pydantic: BlockRequest | なし |
| 36 | safety.py | DELETE | /api/safety/block/{blocked_id} | JWT必須 | status==approved確認・blocker_id==current_user.idでフィルタ | UUID型強制 | なし |
| 37 | safety.py | POST | /api/safety/report | JWT必須 | status==approved確認・自分への通報禁止・reason検証 | Pydantic: ReportRequest | なし（レートリミット10/min付き） |
| 38 | safety.py | POST | /api/safety/hide | JWT必須 | status==approved確認・自分への非表示禁止 | Pydantic: HideRequest | なし |
| 39 | safety.py | DELETE | /api/safety/hide/{hidden_id} | JWT必須 | status==approved確認・hider_id==current_user.idでフィルタ | UUID型強制 | なし |
| 40 | safety.py | GET | /api/safety/blocks | JWT必須 | status==approved確認・blocker_id==current_user.idでフィルタ | なし | なし |
| 41 | safety.py | GET | /api/safety/blocked-ids | JWT必須 | status==approved確認・blocker_id==current_user.idでフィルタ | なし | なし |
| 42 | safety.py | GET | /api/safety/hidden-ids | JWT必須 | status==approved確認・hider_id==current_user.idでフィルタ | なし | なし |

---

### admin.py（prefix: /api/admin）

| # | ファイル | メソッド | パス | 認証 | 認可方法 | 入力検証 | 想定リスク |
|---|---------|---------|-----|-----|---------|---------|----------|
| 43 | admin.py | GET | /api/admin/pending | 管理者のみ | require_admin（ADMIN_EMAILS照合） | なし | なし |
| 44 | admin.py | GET | /api/admin/student-id/{user_id} | 管理者のみ | require_admin | UUID型強制 | なし（署名付きURL 5分有効） |
| 45 | admin.py | POST | /api/admin/approve/{user_id} | 管理者のみ | require_admin・ステータス二重確認 | UUID型強制 | なし（adminログ記録あり） |
| 46 | admin.py | POST | /api/admin/reject/{user_id} | 管理者のみ | require_admin・ステータス二重確認 | **UUID型強制なし（str型）** | なし（実害なし・一貫性の問題） |
| 47 | admin.py | POST | /api/admin/suspend/{user_id} | 管理者のみ | require_admin | UUID型強制 | なし（adminログ記録あり） |
| 48 | admin.py | GET | /api/admin/stats | 管理者のみ | require_admin | なし | なし |
| 49 | admin.py | POST | /api/admin/privacy-purge | 管理者のみ | require_admin | なし | 強力な操作・管理者に限定済み |
| 50 | admin.py | GET | /api/admin/users | 管理者のみ | require_admin | Query params: patternバリデーション | なし |
| 51 | admin.py | GET | /api/admin/users/{user_id} | 管理者のみ | require_admin | UUID型強制 | なし（adminログ記録あり） |
| 52 | admin.py | POST | /api/admin/users/{user_id}/ban | 管理者のみ | require_admin・ステータス確認 | UUID型強制・Pydantic: BanRequest | なし（adminログ記録あり） |
| 53 | admin.py | POST | /api/admin/users/{user_id}/unban | 管理者のみ | require_admin・ステータス確認 | UUID型強制・Pydantic: UnbanRequest | なし（adminログ記録あり） |
| 54 | admin.py | GET | /api/admin/reports | 管理者のみ | require_admin | Query: patternバリデーション | なし |
| 55 | admin.py | PATCH | /api/admin/reports/{report_id} | 管理者のみ | require_admin | UUID型強制・Pydantic: ReportUpdateRequest | なし（adminログ記録あり） |
| 56 | admin.py | GET | /api/admin/stats/timeseries | 管理者のみ | require_admin | Query: ge=1,le=365 | なし |
| 57 | admin.py | GET | /api/admin/stats/breakdown | 管理者のみ | require_admin | なし | なし |
| 58 | admin.py | GET | /api/admin/logs | 管理者のみ | require_admin | Query: ge/le制約 | なし |
| 59 | admin.py | GET | /api/admin/inquiries | 管理者のみ | require_admin | Query: patternバリデーション | なし |
| 60 | admin.py | POST | /api/admin/inquiries/{inquiry_id}/reply | 管理者のみ | require_admin | UUID型強制・Pydantic: InquiryReplyRequest | なし（adminログ記録あり） |
| 61 | admin.py | PATCH | /api/admin/inquiries/{inquiry_id} | 管理者のみ | require_admin | UUID型強制・Pydantic: InquiryStatusUpdateRequest | なし（adminログ記録あり） |

---

### notifications.py（prefix: /api/notifications）

| # | ファイル | メソッド | パス | 認証 | 認可方法 | 入力検証 | 想定リスク |
|---|---------|---------|-----|-----|---------|---------|----------|
| 62 | notifications.py | GET | /api/notifications/ | JWT必須 | user_id==current_user.idでフィルタ | なし | なし |
| 63 | notifications.py | POST | /api/notifications/read-all | JWT必須 | user_id==current_user.idでフィルタ | なし | なし |
| 64 | notifications.py | POST | /api/notifications/{notification_id}/read | JWT必須 | id==notification_id AND user_id==current_user.idの二重フィルタ | UUID型強制 | なし（IDORなし） |

---

### push.py（prefix: /api/push）

| # | ファイル | メソッド | パス | 認証 | 認可方法 | 入力検証 | 想定リスク |
|---|---------|---------|-----|-----|---------|---------|----------|
| 65 | push.py | GET | /api/push/vapid-public-key | **公開** | なし | なし | VAPID公開鍵は公開前提・問題なし |
| 66 | push.py | POST | /api/push/subscribe | JWT必須 | user_id==current_user.idでフィルタ | Pydantic: PushSubscribeRequest | なし |
| 67 | push.py | DELETE | /api/push/subscribe | JWT必須 | user_id==current_user.idでフィルタ | Query: endpoint string | なし |
| 68 | push.py | DELETE | /api/push/subscribe/all | JWT必須 | user_id==current_user.idでフィルタ | なし | なし |
| 69 | push.py | POST | /api/push/test | JWT必須 | user_id==current_user.idでフィルタ | なし | **レートリミットなし**（自分への通知スパム可能） |
| 70 | push.py | GET | /api/push/debug/all | JWT必須 | user_id==current_user.idでフィルタ | なし | **デバッグ用エンドポイントが本番に残存**（自分の購読情報のみ・中リスク） |

---

### ws.py（WebSocket）

| # | ファイル | メソッド | パス | 認証 | 認可方法 | 入力検証 | 想定リスク |
|---|---------|---------|-----|-----|---------|---------|----------|
| 71 | ws.py | WS | /ws/chat/{match_id} | JWT必須（クエリパラメータ） | マッチ参加者確認（user_a/b_id） | なし | **JWTがURLクエリパラメータに露出**（サーバーログへの記録リスク） |

---

### inquiries.py（prefix: /api/inquiries）

| # | ファイル | メソッド | パス | 認証 | 認可方法 | 入力検証 | 想定リスク |
|---|---------|---------|-----|-----|---------|---------|----------|
| 72 | inquiries.py | POST | /api/inquiries/ | JWT必須 | user_id=current_user.idで固定INSERT | Pydantic: InquiryCreateRequest | なし（レートリミット5/hour付き） |
| 73 | inquiries.py | GET | /api/inquiries/me | JWT必須 | user_id==current_user.idでフィルタ | なし | なし |

---

## 2. 認証・認可ヘルパー関数の確認

### `get_current_user`（`backend/app/auth/dependencies.py:11`）

```python
async def get_current_user(credentials = Depends(_security)) -> User:
    token = credentials.credentials
    response = supabase.auth.get_user(jwt=token)
    if response.user is None:
        raise HTTP_401_UNAUTHORIZED
    return response.user
```

**実装内容**:
- FastAPI の `HTTPBearer` で `Authorization: Bearer <JWT>` ヘッダーを受け取る
- `supabase.auth.get_user(jwt=token)` を呼び出し、Supabase Auth がJWTを検証する（署名・有効期限のチェックはSupabase側で実施）
- user が None なら 401 を raise
- **BANチェックは行わない**（これは意図的で、`get_active_user` で追加チェックする設計）

### `get_active_user`（`backend/app/auth/active_user.py:8`）

```python
async def get_active_user(current_user = Depends(get_current_user)) -> User:
    res = supabase.table("profiles").select("status").eq("id", ...).single().execute()
    if res.data and res.data.get("status") == "banned":
        raise HTTP_403_FORBIDDEN
    # except Exception: pass  ← ここが問題
    return current_user
```

**実装内容**:
- `get_current_user` を拡張し、追加でprofilesテーブルのstatusを確認
- `status == "banned"` なら 403
- **問題**: `except Exception: pass` でDB呼び出しが失敗した場合、BANチェックが無効化される

### `require_admin`（`backend/app/auth/dependencies.py:32`）

```python
async def require_admin(current_user = Depends(get_current_user)) -> User:
    if current_user.email not in settings.admin_emails:
        raise HTTP_403_FORBIDDEN
    return current_user
```

**実装内容**:
- `get_current_user` を拡張（`get_active_user` ではない点に注意）
- `settings.admin_emails` は `config.py` の `ADMIN_EMAILS` 環境変数からカンマ区切りで読み込み、**小文字化**して保持
- `current_user.email`（SupabaseのJWT由来）は小文字化していない → Supabase が内部で小文字管理しているため実害はないが、コード上は明示的に `.lower()` すべき

### `ADMIN_EMAILS` の参照方法（`backend/app/core/config.py:37`）

```python
@property
def admin_emails(self) -> list[str]:
    return [e.strip().lower() for e in self.admin_emails_csv.split(",") if e.strip()]
```

- `ADMIN_EMAILS` が未設定（空）の場合、`admin_emails` は空リスト → 誰も管理者になれない（deny-by-default で安全）
- `model_config = SettingsConfigDict(populate_by_name=True)` で alias 読み込みに対応

---

## 3. 危険度別の問題エンドポイント抽出

### 🔴 Critical: 認証なしで機密データにアクセス可能なエンドポイント

**該当なし。**

公開エンドポイントは以下の2件のみで、いずれも機密情報を返さない：
- `GET /health` → `{"status": "ok"}` のみ
- `GET /api/push/vapid-public-key` → VAPID公開鍵（公開前提の情報）

---

### 🟠 High: IDORの可能性、または重大なセキュリティリスク

#### H-1: WebSocket JWT がクエリパラメータに露出（`ws.py:15`）

```python
@router.websocket("/ws/chat/{match_id}")
async def websocket_chat(match_id: str, websocket: WebSocket, token: str = Query(...)):
```

**問題**: JWTがURLの一部（`/ws/chat/{id}?token=xxx`）として送信される。  
**リスク**:
- サーバーアクセスログにJWTが記録される可能性
- ブラウザ/プロキシの履歴に残る可能性
- ただし、ブラウザのWebSocket APIはカスタムヘッダーを送れないため、クエリパラメータは業界標準の回避策であり完全に排除は困難

**推奨対策**:
1. アクセスログでクエリパラメータを除外するよう設定する（Render/デプロイ環境側の対応）
2. または接続前に短命なトークン（OTP）をHTTP経由で発行し、それをWSのtokenとして使用する

---

### 🟡 Medium: 認可ロジックが弱い・曖昧

#### M-1: `get_active_user` のBANチェックがDB障害時にサイレントスルー（`active_user.py:26`）

```python
except Exception:
    pass  # ← DB呼び出し失敗時、BANされたユーザーもスルーされる
return current_user
```

**リスク**: Supabase接続の一時障害時に、BANされたユーザーが全エンドポイントにアクセスできる。  
**推奨対策**: 例外発生時はフェイルセーフとして 503 を返すか、少なくともエラーログを出力する。

---

#### M-2: `GET /api/profiles/{user_id}` でブロック/非表示チェックなし（`browse.py:498`）

**問題**: 一覧（`GET /api/profiles`）ではブロック/非表示が除外されるが、個別取得ではチェックなし。  
**リスク**:
- ユーザーAがユーザーBをブロックしても、BはAのUUIDを直接指定してプロフィールを閲覧できる
- さらに**足跡（profile_views）も記録される**（browse.py:553）

**推奨対策**: 個別プロフィール取得時も、閲覧者が相手にブロックされていないか・非表示にされていないかを確認する。

---

#### M-3: `require_admin` が `get_active_user` ではなく `get_current_user` を使用（`dependencies.py:32`）

```python
async def require_admin(current_user = Depends(get_current_user)):  # get_active_user ではない
```

**リスク**: 管理者アカウントをBANしても、その管理者は引き続き `/api/admin/` 全エンドポイントにアクセスできる。  
（管理者をBANするユースケースはほぼないが、設計として一貫性を欠く）  
**推奨対策**: `require_admin` の依存を `get_active_user` に変更する。

---

#### M-4: `POST /api/profile/reapply` にレートリミットなし（`profile.py:620`）

**リスク**: 1分間に何度でも再申請状態に変更できる。管理者側のpendingキューが攻撃的に汚染される可能性は低いが、  
レートリミットを追加すべき（例: 1/hour）。

---

#### M-5: `POST /api/push/test` にレートリミットなし（`push.py:59`）

**リスク**: 認証済みユーザーが自分自身に大量のテスト通知を送信できる。自分のデバイスへの影響のみ。  
**推奨対策**: `@limiter.limit("5/minute")` を追加。

---

#### M-6: デバッグ用エンドポイント `GET /api/push/debug/all` が本番に残存（`push.py:76`）

```python
@router.get("/debug/all")
def debug_all_subscriptions(user: User = Depends(get_active_user)) -> dict:
    """デバッグ用: 全購読を返す（本人のものだけ）"""
```

**リスク**: ユーザーのWebPush購読情報（endpoint URL、p256dhキー、authキー）が漏洩する。  
endpointは一般に推測困難だが、本番環境でデバッグエンドポイントを公開することは不適切。  
**推奨対策**: エンドポイントを削除するか、`settings.debug` フラグで無効化する。

---

#### M-7: `require_admin` でのメールアドレス大文字小文字不一致リスク（`dependencies.py:35`）

```python
if current_user.email not in settings.admin_emails:  # admin_emails は lowercase、email はそのまま
```

`settings.admin_emails` は `.lower()` 処理済みだが、`current_user.email` は Supabase JWT のまま（大文字/小文字が保持される）。  
Supabase が内部でメールアドレスを小文字化して管理しているため実害は出ていないが、明示的に `.lower()` すべき。

**推奨対策**:
```python
if (current_user.email or "").lower() not in settings.admin_emails:
```

---

#### M-8: 写真アップロード時にEXIFデータが削除されない（`profile.py:222, 326, 441`）

**対象**: `POST /upload-student-id`、`POST /upload-avatar`、`POST /photos`  
**リスク**: スマートフォンで撮影した画像にはGPS座標が埋め込まれていることがある。  
これが他ユーザーに公開されると、撮影場所（自宅等）が特定される可能性がある。  
**推奨対策**: `Pillow` の `image.save()` を使って再エンコードすることでEXIFを除去する。

---

### 🟢 Info: 管理者専用エンドポイントの管理者チェック状況

| チェック項目 | 状況 |
|------------|------|
| /api/admin/ 配下全エンドポイントに require_admin があるか | **✅ 全19エンドポイント確認済み** |
| ADMIN_EMAILS が空の場合の動作 | **✅ deny-by-default（誰もアクセスできない）** |
| ADMIN_EMAILS は .env から読む（コードへの直書きなし） | **✅ 問題なし** |
| メールアドレスの大文字小文字 | **⚠️ M-7参照（コード上の改善余地あり）** |
| JWTの改ざん（admin claim の偽装など） | **✅ 問題なし**（JWTはSupabaseが検証・メールはJWT由来なのでJWT改ざんは不可能） |
| POST /api/admin/reject/{user_id} の user_id 型 | **⚠️ str型（UUID未強制・他エンドポイントと非一貫）** |

---

## 4. CORS・レート制限・共通ミドルウェアの確認

### CORS（`main.py:50`）

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),  # 環境変数 ALLOWED_ORIGINS から読む
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

- `ALLOWED_ORIGINS` 環境変数でドメインを制限 ✅
- **本番環境での設定確認が必須**: `https://cro-co.vercel.app` 等、本番ドメインのみを指定すること
- `allow_credentials=True` のため、`allow_origins=["*"]` は不可能（FastAPIが自動でエラー）→ 安全側の設計 ✅

### レート制限（`core/limiter.py`）

```python
limiter = Limiter(key_func=get_remote_address)
```

- slowapi を使用し、**クライアントIPアドレス**を識別キーとする
- **潜在的な問題**: RenderなどのPaaS経由の場合、`FORWARDED_ALLOW_IPS` の設定によっては `X-Forwarded-For` が正しく解釈されず、全リクエストが同一IPと判定される可能性がある
- 適用済みのエンドポイント:
  - `GET /api/profiles`: 30/minute
  - `POST /api/likes/`: 60/minute
  - `PATCH /api/profile/me`: 60/minute
  - `POST /api/profile/upload-student-id`: 5/hour
  - `POST /api/safety/report`: 10/minute
  - `POST /api/messages/`: 30/minute
  - `POST /api/profile/ping`: 20/minute
  - `POST /api/inquiries/`: 5/hour
- **レートリミットが未適用の高リスクエンドポイント**:
  - `POST /api/profile/reapply`（M-4）
  - `POST /api/push/test`（M-5）

### セキュリティヘッダー（`main.py:38`）

```python
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    response.headers["X-Content-Type-Options"] = "nosniff"       ✅
    response.headers["X-Frame-Options"] = "DENY"                 ✅
    response.headers["X-XSS-Protection"] = "1; mode=block"       ✅
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"  ✅
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"  ✅
```

- **HSTS（Strict-Transport-Security）は未設定**: Renderがプラットフォームレベルで付与しているか確認が必要。なければ追加すること。
- **Content-Security-Policy は未設定**: APIサーバーのためCSPの優先度は低いが、将来的な検討課題。

---

## 5. WebSocket エンドポイント（チャット）の認可

対象: `ws.py` → `WS /ws/chat/{match_id}`

### JWT検証（`ws.py:17`）

```python
user_resp = supabase.auth.get_user(token)
user_id = str(user_resp.user.id)
# 失敗時: websocket.close(code=4001)
```

- JWTをSupabaseで検証 ✅
- 検証失敗時に `close(code=4001)` で即座に切断 ✅

### マッチ参加者確認（`ws.py:24`）

```python
m = match.data
if m["user_a_id"] != user_id and m["user_b_id"] != user_id:
    await websocket.close(code=4003, reason="Forbidden")
```

- 接続前にDBでマッチ参加者であることを確認 ✅
- マッチが存在しない場合も `close(code=4004)` で切断 ✅

### BANユーザーのチェック

**⚠️ 要確認**: WebSocket接続時に `get_active_user` に相当するBANチェックが行われていない。  
BANされたユーザーは有効なJWTを保持している間、WebSocket接続が可能。  
JWTの有効期限（Supabase デフォルト: 1時間）内は接続できてしまう。

### Origin ヘッダーの検証

WebSocket接続時に `Origin` ヘッダーの検証は行われていない。  
ブラウザはWebSocket接続でも `Origin` を自動付与するが、サーバー側では検証していないため、  
任意のOriginからの接続が可能。ただし有効なJWTが必要なため、実害リスクは低い。

### タイピングインジケーターの送信者検証（`ws.py:47`）

```python
elif data.startswith("typing:start:"):
    mid = data[len("typing:start:"):]
    if mid == match_id:
        await manager.broadcast(match_id, {"type": "typing", "sender_id": user_id, ...})
```

- `sender_id` はサーバー側で `user_id`（検証済み）を使用 ✅（クライアントが偽の sender_id を送っても無視）

---

## 6. 写真・学生証アップロード関連エンドポイント

### プロフィール写真（`POST /api/profile/photos`、`POST /api/profile/upload-avatar`）

| チェック項目 | 状況 |
|------------|------|
| ファイルサイズ制限 | ✅ 5MB上限（`_MAX_FILE_SIZE`） |
| MIMEタイプ検証 | ✅ `image/jpeg` / `image/png` のみ許可（`_ALLOWED_MIME_TYPES`） |
| 枚数制限 | ✅ 6枚上限（`_MAX_PHOTOS`） |
| EXIFデータ削除 | ❌ **未実装**（M-8参照） |
| アクセス制御 | ⚠️ profile-images バケットが現在Public CDN（Phase 13でPrivate化予定） |
| ファイル名の予測困難性 | ✅ `{user_id}/photo_{timestamp}_{secrets.token_hex(2)}.{ext}` |

### 学生証（`POST /api/profile/upload-student-id`）

| チェック項目 | 状況 |
|------------|------|
| ファイルサイズ制限 | ✅ 10MB上限（`_MAX_STUDENT_ID_SIZE`） |
| MIMEタイプ検証 | ✅ `image/jpeg` / `image/png` のみ許可 |
| EXIFデータ削除 | ❌ **未実装**（M-8参照） |
| アクセス制御 | ✅ student-ids バケットはPrivate・署名付きURL（5分）でのみアクセス可 |
| ファイル名の予測困難性 | ✅ `{user_id}/student_id_{timestamp}.{ext}` |
| レートリミット | ✅ 5/hour |
| フォーム値バリデーション | ✅ gender/interest_in の列挙値チェックあり |
| 再申請時の古い学生証 | ✅ `rejection_reason` をクリア・ただし旧ファイルは残存（Storage容量消費のみ） |

---

## 7. 優先対応リスト（推奨順）

| 優先度 | ID | 対象 | 対応内容 |
|--------|----|----|---------|
| 🟠 High | H-1 | ws.py | アクセスログからクエリパラメータを除外する設定を追加（またはOTPトークン方式に変更） |
| 🟡 Medium | M-2 | browse.py:498 | `GET /api/profiles/{user_id}` でブロック/非表示チェックを追加 |
| 🟡 Medium | M-8 | profile.py | 写真・学生証アップロード時にPillowでEXIFを除去 |
| 🟡 Medium | M-6 | push.py:76 | `GET /api/push/debug/all` を削除または環境フラグで無効化 |
| 🟡 Medium | M-1 | active_user.py:26 | DB障害時のフェイルクローズ（503を返す）またはログ出力 |
| 🟡 Medium | M-3 | dependencies.py:32 | `require_admin` の依存を `get_active_user` に変更 |
| 🟡 Medium | M-4 | profile.py:620 | `POST /api/profile/reapply` にレートリミット追加（例: 1/hour） |
| 🟡 Medium | M-5 | push.py:59 | `POST /api/push/test` にレートリミット追加（例: 5/minute） |
| 🟡 Medium | M-7 | dependencies.py:35 | `require_admin` で `current_user.email.lower()` と比較 |
| ℹ️ Info | - | admin.py:203 | `POST /api/admin/reject/{user_id}` の user_id を UUID 型に統一 |
| ℹ️ Info | - | main.py | HSTS ヘッダーの追加（Renderが未対応の場合） |
| ℹ️ Info | - | main.py | ALLOWED_ORIGINS 本番設定の確認（`https://cro-co.vercel.app` 等） |
| ℹ️ Info | - | core/limiter.py | Render経由での X-Forwarded-For 解釈の確認（`FORWARDED_ALLOW_IPS` 設定） |

---

*調査方法: backend/app/ 配下のPythonソースコードを直接読み込み、推測ではなくコードの実装に基づいて判断。*
