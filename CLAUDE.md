# Cro-co 開発ガイド（Claude Code 用）

最終更新日: 2026-06-02（用語方針追加）

このファイルの指示は、デフォルト挙動より優先される。例外なく従うこと。

---

## 1. プロジェクト概要

大阪大学（`@ecs.osaka-u.ac.jp`）限定マッチングアプリ（Web 版）。個人開発。
リポジトリ: `C:\01_WorkSpace\Cro-co`

### サービス対象（重要・誤認しやすい）

> **AI への注意**: `@ecs.osaka-u.ac.jp` は阪大「工学系」専用ではなく、**学部生全員**の共通メールアドレス。
> 「工学系限定」「数千人規模」と書いたり説明したりしないこと。

- `@ecs.osaka-u.ac.jp` は大阪大学**学部生全員**の共通メールアドレス
- 対象母数: **約12,000人**（1学年 約3,000人 × 4学年）
- 院生は対象外（大学院入学でメールアドレスが変わるため。将来的な対象拡大は検討中）

---

## 2. コアビジョン

- キャッチコピー: 「普通の日常を、カラフルに。」
- サブコピー: 「思ったより、近くに。」
- アプリ名: Cro-co（Crocodile の Croco + 一緒に の co）
- ブランドキャラクター: Croco ワニ（薄緑・デフォルメ・SVG 実装）
- β中は**完全無料**（ユーザー獲得優先・課金は登録200人到達後に検討）
- β中に課金を導入しない（炎上リスクが高いため絶対にやらない）
- 月の運営コスト目標: **1,000円以下**

---

## 3. md 管理ルール（最重要・絶対）

### 作業開始時に必ず読むもの

1. README.md
2. CLAUDE.md（このファイル）
3. STATUS.md
4. HANDOFF.md
5. 該当作業に関連する docs/ 配下のファイル

これらを読まずに作業を開始しないこと。

### 作業終了時の更新ルール

変更内容ごとに、以下の対応で md を更新する:

| 変更内容 | 必ず更新する md |
|---|---|
| 新規 API 実装・既存 API 変更 | docs/ARCHITECTURE.md + HANDOFF.md |
| 新規機能実装・機能仕様変更 | HANDOFF.md + STATUS.md |
| 設計判断（なぜこの実装か） | HANDOFF.md の「設計判断ログ」 |
| セキュリティ修正 | HANDOFF.md + docs/ROADMAP.md（チェックリスト項目を更新） |
| マイグレーション追加 | HANDOFF.md + docs/ARCHITECTURE.md（DB スキーマ更新） |
| デプロイ手順変更・環境変数追加 | docs/DEPLOY.md + docs/ARCHITECTURE.md（環境変数一覧） |
| マイルストーン進捗・直近の動き | STATUS.md |
| 技術的負債発見 | HANDOFF.md の「既知の技術的負債」 |
| フロント・バックの「どこで弾くか」変更 | docs/ARCHITECTURE.md のマトリックス |

### 書き方ルール

1. **客観的事実のみ書く**: コードを直接読んで確認した内容、実機テストで確認した挙動のみ
2. **憶測禁止**: 「動くはず」「効いているはず」「たぶん」を書かない
3. **未検証は明示**: 実機テストしていない実装は ⚠️ 未検証 マークを付けて分離する
4. **上書き禁止**: 既存の記述を削除しない、追記のみ。「設計判断ログ」は時系列で残す
5. **報告前に書く**: 「実装しました」「直しました」とユーザーに報告する前に該当 md を更新する
6. **ファイル増やさない**: 確定構成（ルート4 + docs/4 + archive）以外の md ファイルを新規作成しない

### 確定ファイル構成（これ以外の md を勝手に作らない）

```
README.md / CLAUDE.md / STATUS.md / HANDOFF.md
docs/ARCHITECTURE.md / docs/DEPLOY.md / docs/ROADMAP.md / docs/IDEAS.md
docs/archive/   ← 参照のみ・変更不可
```

### 「直した」報告のテンプレート

人間に対して「直しました」「実装しました」と報告する時は必ず以下の項目を含めること:

- 何が問題だったか（または何を実装したか）
- どこを変えたか（ファイル名:行番号）
- なぜその修正で直るか / その実装で要求を満たすか
- 検証したか（YES/NO + 検証方法。実機未確認なら「⚠️ 未検証」と明示）
- 関連 md を更新したか（YES/NO + ファイル名）

「直りました」「実装しました」だけの報告は禁止。

---

## 4. 絶対ルール（セキュリティ・コーディング規約）

### セキュリティ（最重要）

- シークレット・API キーをコードに直接書かない。必ず `.env` から読む
- `.env` は `.gitignore` に含めること
- 認証が必要な API には必ず `Depends(get_active_user)`（または `get_current_user`）を付ける
- 管理者専用 API には `Depends(require_admin)` を付ける
- CORS の `allow_origins` は本番では特定オリジンに限定する
- ファイルアップロードは MIME タイプとサイズを必ず検証する
- フロントエンドに管理者リストを置かない
- Supabase の service_role を使うため RLS はバイパスされる。**ブロック防御はアプリ層（`get_blocked_user_ids`）が唯一の砦**
- 新規エンドポイントで他ユーザー情報を返すなら必ず `block_utils` を呼ぶこと
- リリース前には必ず `docs/ROADMAP.md` のリリース前セキュリティチェックリストの全項目をチェックすること

### コーディング規約

- Python: 型ヒント必須、Pydantic でバリデーション必須
- TypeScript: `any` 型の使用禁止
- ORM なし: DB 操作は Supabase クライアントを直接使用
- 日本語のエラーメッセージで返す
- `SELECT *` を使わない（必要カラムを明示。例外: `/api/profile/me` と admin の自分/単一取得）
- ループ内で DB クエリを発行しない（N+1 厳禁）
- 新機能はフロント・バックを同時に実装する
- アイコン: lucide-react または SVG（絵文字禁止）

### コメントのルール

- コメントは「なぜ」を書くときのみ。「何をするか」は書かない
- 1行以内に収める

### SQL マイグレーション規約

- 冪等性必須: `IF NOT EXISTS` / `IF EXISTS` を使い、再実行してもエラーにならないように
- 新しいマイグレーション: `041_*.sql` から採番（040 まで使用済み・036 が重複番号）
- RLS を有効化したテーブルには必ず service_role 用ポリシーを追加:
  ```sql
  GRANT ALL ON public.テーブル名 TO service_role;
  CREATE POLICY "service_role full access" ON public.テーブル名
    FOR ALL TO service_role USING (true) WITH CHECK (true);
  ```

### DB ポリシー（RLS）の鉄則

1. **service_role 一本化が原則**: このアプリは全データアクセスを FastAPI（service_role）経由で行う。フロントは `supabase.from` / `.rpc` を直接呼ばない（grep で担保）。よって各テーブルの RLS ポリシーは `service_role 全許可` 1本のみが原則。authenticated / anon / public 向けポリシーは原則ゼロ。

2. **非 service_role ポリシーを追加するには理由が必要**: 追加する場合は migration コメントと HANDOFF に (a) なぜ FastAPI 経由では不可能か、(b) どのロールに何の操作を許可するか、(c) 想定される攻撃面 を明記する。理由なき追加は禁止。

3. **PERMISSIVE で「隠す・除外する」を書かない**: PERMISSIVE は許可の OR 合成のため、「X を除外する」と書くと「X 以外を全許可」に意図が反転する。除外・制限は RESTRICTIVE かアプリ層（FastAPI）で行う。
   - 実例: migration 037 の `hide_messages_with_deleted_user` が PERMISSIVE で書かれ、退会者を隠すどころか messages 全行への SELECT を開く構成になっていた（044 で DROP）

4. **RLS と GRANT は両輪で確認する**: RLS ポリシーが存在しても GRANT がなければ PostgreSQL 層で弾ける。両層の整合を保ち、片方の事故で即漏洩しない状態を維持する。`GRANT ... TO authenticated/anon` の追加はセキュリティ変更として扱い、独立 PR + レビュー必須。

5. **ポリシーの分割・改変後は pg_policies で全操作を棚卸しする**: 分割後に不要な操作権限を惰性で残さない。新テーブル追加時も既存ポリシー設計（service_role 一本）に倣う。
   - 実例: migration 040 の blocks ポリシー分割時に `blocks_delete_own` を不要に残し、Supabase REST API 直叩きによるブロック解除不可仕様のバイパスが可能な構成になっていた（044 で DROP）

### パフォーマンス方針

- 新しい `useQuery` には必ず `staleTime` を設定する
- メール送信・外部 API 呼び出しは必ず `BackgroundTasks` で非同期化
- 新エンドポイントで `SELECT *` は使わない

### ナビゲーション原則

新しくページを作る際、必ず以下2つを実装する:
1. 「新しいページに飛べるボタン」を、関連する既存ページに配置する
2. 「直前のページに戻るボタン」を新ページの上部に必ず配置する（`navigate(-1)` または明示的な遷移先）

### 既知の落とし穴

- **pydantic-settings の list 型**: `.env` から `list[str]` を読むと JSON 解釈エラーになる。`admin_emails_csv: str` で受けて property で split する（`config.py` 参照）。`SettingsConfigDict(populate_by_name=True)` も必要
- **SQL トリガーの DROP**: `DROP TRIGGER ... ON テーブル名` はテーブルが存在しない時エラー。`DROP TABLE IF EXISTS ... CASCADE` で一括削除してから CREATE する

---

## 5. 触らないファイル一覧（変更禁止）

以下は認証・API・設定の中核であり、変更すると動作が壊れる。

```
frontend/src/lib/api.ts                     # axios + Bearer インターセプター
frontend/src/lib/supabase.ts                # Supabase クライアント
frontend/src/contexts/AuthContext.tsx       # 認証状態管理
frontend/src/components/ProtectedRoute.tsx  # 要認証ルート
frontend/src/components/PublicOnlyRoute.tsx # 非認証専用ルート
frontend/src/components/OnboardingGuard.tsx # オンボーディング未完了リダイレクト
frontend/src/components/ChatGuard.tsx       # チャット制限（審査中 / 却下）
frontend/src/components/AdminGuard.tsx      # 管理者 API 試行で判定
backend/app/core/config.py                  # pydantic-settings 設定
backend/app/core/supabase_client.py         # Supabase Python クライアント
backend/app/auth/dependencies.py            # get_current_user / require_admin
backend/app/auth/active_user.py             # get_active_user（BAN ブロック）
**/.env  **/.env.local                      # 環境変数ファイル
```

---

## 6. 技術スタック

### フロントエンド（`frontend/`）
- React 19 + Vite + TypeScript
- Tailwind CSS v4 + shadcn/ui（Radix preset, Nova theme）
- ルーティング: react-router-dom v7（26ルート・`App.tsx`）
- HTTP: axios（`lib/api.ts` に Bearer インターセプター）
- データ取得: TanStack Query（React Query）
- チャット仮想化: react-virtuoso
- アイコン: lucide-react（絵文字禁止）
- フォント: Noto Sans JP + Space Mono
- パスエイリアス: `@/` → `./src/`
- 起動: `cd frontend && npm run dev` → http://localhost:5173

### バックエンド（`backend/`）
- FastAPI + Python 3.14
- 仮想環境: `backend/.venv`
- DB アクセス: Supabase Python クライアント（service_role）
- ORM なし。SQLAlchemy / Alembic は削除済み。マイグレーションは Supabase SQL Editor で直接実行
- レート制限: slowapi、定期実行: APScheduler（privacy_purge）、Push: pywebpush
- 起動: `cd backend && .venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload --port 8000`

### データ層
- Supabase（PostgreSQL + Auth + Storage）
- Stripe（本番リリース前に実装予定・未統合）

### 環境
- OS: Windows / シェル: PowerShell / パス区切り: `\` / コマンド連結: `&&` または `;`

> 詳細な API 一覧・DB スキーマ・ディレクトリ構造は `docs/ARCHITECTURE.md` を正とする。

---

## 7. デザインシステム: ネオブルータリズム × Y2K

### カラーパレット

| 変数名 | 値 | 用途 |
|---|---|---|
| `--color-ink` | `#0A0A0A` | 黒・枠線・テキスト |
| `--color-paper` | `#ffffff` | 白・背景 |
| `--color-acid` | `#DFFF1F` | 蛍光イエロー・アクティブ・ボタン |
| `--color-mint` | `#A8F0D1` | ミントグリーン |
| `--color-hot` | `#FF3B6B` | ピンク・いいね・マッチ・削除 |

カードカラー（ユーザーカードの背景）:
```ts
const colors = ['#FFE94D','#FF7DA8','#FF7A3D','#6BB5FF','#8AE8B5','#C9A8FF'];
const color = colors[userId.charCodeAt(0) % colors.length];
```

### タイポグラフィ
- メインフォント: Noto Sans JP（見出し: 900weight・letter-spacing -0.02em）
- 英字アクセント: Space Mono（uppercase・letter-spacing 0.05em・数字・英語ラベル・タグ）
- `font-display`: Noto Sans JP 900weight / `font-mono`: Space Mono

### コンポーネントルール

#### card-bold（基本カード）
```css
border: 2px solid #0A0A0A; border-radius: 18px; box-shadow: 4px 4px 0 0 #0A0A0A;
/* ホバー */ transform: translate(-2px, -2px); box-shadow: 6px 6px 0 0 #0A0A0A; transition: 0.15s ease;
```

#### ボタン種別
- `bold`: `bg-ink text-white border-2 border-ink shadow(4px 4px 0 0 ink) font-bold`
- `acid`: `bg-acid text-ink border-2 border-ink shadow(4px 4px 0 0 ink) font-bold`
- `outline-bold`: `bg-white text-ink border-2 border-ink shadow(4px 4px 0 0 ink) font-bold`
- 全ボタン: font-weight 700・押下時 translate(2px 2px) shadow 縮小

#### 入力フィールド
- `border: 2px solid #0A0A0A; border-radius: 8px;` / focus 時: `box-shadow: 2px 2px 0 0 #0A0A0A`

#### タグ・バッジ（tag-pill）
- `border: 1.5px solid #0A0A0A; border-radius: 9999px; font-weight: 700; font-size: 12px; padding: 4px 10px`

### ボトムナビ（Layout.tsx）
- 背景 `bg-ink`・4タブ: ホーム / さがす / マッチ / 設定
- 非アクティブ: 白アイコン + 白テキスト / アクティブ: `bg-acid` 丸 + 黒テキスト
- アイコン: `Home / Search / Heart / Settings`（lucide-react）・`border-top: 2px solid #0A0A0A`

### マーキーバー（MarqueeBar.tsx）
- 黒背景・白文字・Space Mono・uppercase・font-bold・高さ 36px・区切り `◆`・無限横スクロール

### ページ共通ルール
- `max-width: 480px`（モバイルファースト）・`mx-auto`
- ヘッダー: `sticky top-0 border-b-2 border-ink` 高さ 56px（左「Cro-co.」font-display text-2xl / 右 通知ベル + ボタン）
- ヘッダー直下: MarqueeBar / コンテンツ: `pb-24`

### Croco キャラクター
- 使用場面: 写真未設定・ローディング・空状態・エラー画面
- 必ずインライン SVG で実装（`<img>` 禁止）・`CrocoIllust.tsx` として切り出す
- props: `size`（デフォルト 80）・`className` / カラー `#A8F0D1`

### 絶対に使わないもの（禁止事項）
- 絵文字（lucide-react または SVG で代替）
- グラデーション背景
- 装飾目的の box-shadow（card-bold の影のみ許可）
- shadcn の `Card` コンポーネントをそのまま使う
- 全要素の中央揃え（左揃えベース）
- ローディングスピナー（文字アニメで代替）
- 赤いアラートボックス（インラインテキストでさりげなく）

### トーン・ボイス（マイクロコピー）
人格: ちょっとユーモアのある知的な先輩（ため口寄り）

| 場面 | テキスト |
|---|---|
| ローディング | 「探してます、ちょっと待って。」 |
| 審査中 | 「確認中。もう少しだけ。」 |
| マッチ | 「いい感じじゃないですか。」 |
| エラー | 「うまくいかなかった。もう一度試してみて。」 |
| 空状態（マッチ0件） | 「まだマッチがいない。いいねを送ってみよう。」 |
| 空状態（メッセージ0件） | 「最初のメッセージを送ってみよう。」 |

禁止テキスト: 「〜できます」「エラーが発生しました」「操作が完了しました」「ご確認ください」

---

## 8. 機能追加時のルール

機能を追加したら、以下を必ず更新する（セクション3の表に従う）:
1. **docs/ARCHITECTURE.md**: API 一覧・DB テーブル・「どこで弾くか」マトリックスに変更があれば更新
2. **HANDOFF.md**: 完了済み機能リスト・設計判断ログ・既知の問題を更新
3. **STATUS.md**: 直近の動き・次やることを更新
4. **docs/IDEAS.md**: 新機能を追加するときはリストを確認し、該当機能の「判断トリガー」が満たされているかチェック

---

## 9. ブロック機能の仕様（バックエンド多層防御済み）

- ブロックは**一度行うと解除不可**（個人開発フェーズの判断）
- フロントエンドにブロック解除 UI は存在しない
- `DELETE /api/safety/block/{id}` は常に 403 を返す（エンドポイント自体は残す）
- 設定画面の「ブロックリスト」は閲覧のみ可能
- 誤ブロック時は管理者が Supabase Studio で `blocks` テーブルを直接操作して対応
- 双方向で完全に見えなくなる（検索・おすすめ・足跡・いいね受信・マッチ・通知・チャット・プロフィール直リンク）
- ブロック実行時: match 状態を解除（messages は CASCADE 連動削除）。過去の likes レコードは DB 上に残りリスト表示時にフィルタ除外
- ブロック相手をリスト表示する場合は、必ず `get_blocked_user_ids()`（`backend/app/core/block_utils.py`）で除外すること

### バックエンド多層防御（実装済みエンドポイント）

`get_blocked_user_ids()` によるフィルタを以下に実装済み（詳細は docs/ARCHITECTURE.md の「どこで弾くか」マトリックス）:

- `GET /api/profiles`、`/recommended`、`/views`、`/{user_id}` (browse.py)
- `POST /api/likes/`、`GET /api/likes/received` (like.py)
- `GET /api/matches/`、`/{match_id}`、`/unread-count` (match.py)
- `POST/GET /api/messages/*`（message.py: `_assert_match_member` ヘルパーで一括）
- `WS /ws/chat/{match_id}`（ws.py: 接続時に判定、close code 1008）
- `GET /api/notifications/`（notifications.py: from_user_id でフィルタ）

### エラーメッセージのルール
- ブロック関係で 403 を返す際は「このユーザーは利用できません」など中立的な表現
- 「ブロックされています」とは書かない（相手にブロックを伝えない）

---

## 10. 既知の技術的負債

最新の詳細は HANDOFF.md と docs/ROADMAP.md を正とする。

- dev / 本番の SQL マイグレーション適用が手動運用（適用状況は docs/ARCHITECTURE.md のマイグレーション表で追跡）。dev storage バケットは migration 041 で作成済み・HTTP 疎通も `scripts/storage_smoke_dev.ps1` で検証済み（2026-05-27・upload=200 download=200 delete=200）
- ~~身バレ防止（同じ学部・サークル除外）が `GET /api/profiles` のみで実装~~ → ✅ 解消（2026-05-27・全6経路に適用・`backend/app/core/identity_hide.py` に判定一本化）
- `login_history` テーブルは作成済みだが書き込みコードが存在しない
- PP / 利用規約の施行日がプレースホルダー「2026年●月●日」（弁護士確認後に埋める）

---

## 11. 作業フロー（全自動モード）

- ファイル変更の事前承認は不要。即座に実装する
- エラーが出たら自分でデバッグして修正まで完結させる
- 動作確認も自分で実施し、結果をレポートする
- 詰まっても質問せず、最善策で進める
- 完了したら何をしたかのサマリーだけ出す（報告は md 更新後・セクション3のテンプレに従う）

### Git / デプロイの流れ
- 開発は `dev` ブランチで行う → push → Vercel Preview で確認 → GitHub で PR 作成 → 自分でレビューしてマージ → `main` で本番デプロイ
- migration は dev / 本番の両 Supabase に手動適用が必要（適用状況を docs/ARCHITECTURE.md で追跡）

---

## 12. コミュニケーション原則

- 日本語で応答する
- 「直した」報告はセクション3のテンプレートに従う（憶測で「直った」と言わない）
- 未検証の実装は ⚠️ 未検証 と明示する
- 報告はユーザーの判断が必要な点（仕様の選択・コスト・リスク）を先に出す

### 専門用語の扱い

- 専門用語を含む報告・説明では、まず平易な言葉（例え話可）で要点を伝え、その後に正式用語を併記する。「噛み砕き → これを正式には○○と呼ぶ」の順で使う。「用語 → 意味」の逆順は使わない
- オーナーは用語を省略・回避したいのではなく、理解したうえで正式用語を使えるようになりたい意向。初出時に橋渡しし、2回目以降は正式用語をそのまま使ってよい状態にする
- セキュリティ/DB 用語の平易な説明は HANDOFF.md §8「用語ミニ辞書」を参照
