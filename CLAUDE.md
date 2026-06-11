# Cro-co 開発ガイド（Claude Code 用）

最終更新日: 2026-06-11（カラー SSoT 確定・acid→brand 全置換・mint 廃止＝緑は brand 単一・hex ハードコード禁止を明文化）

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
- ブランドキャラクター: Croco ワニ（ブランド緑 `#3DDC97`・デフォルメ・SVG 実装）
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
- 新しいマイグレーション: `051_*.sql` から採番（050 まで使用済み・036 が重複番号）
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

### 新機能追加チェックリスト（追補）

既存 §4 ルールと重複する項目は「→ §X」で示し再掲しない。本当に抜けていた前向きルールのみ列挙。

**A. 新エンドポイント追加時**
- 認証 `Depends(get_active_user)` 必須 → §4。社交機能（browse/like/match/WS/safety）は `get_approved_user`（[2.6]）
- rate limit 必須（`limiter.limit("X/min")`・画像アップロードは二段 `"20/min;100/hour"`）（[6.1]）
- 他ユーザー情報を返すなら `get_blocked_user_ids()` を呼ぶ → §4 ＋ ARCHITECTURE.md §7 マトリックス更新
- 身バレ経路なら identity_hide（is_hidden_between / is_hidden_from_viewer）で弾き ARCHITECTURE.md §7 に記録（[8.1]）
- Pydantic `response_model` を定義（`SELECT *` 禁止 → §4。例外は `/api/profile/me` と admin 単一取得のみ）
- エラー `detail` は日本語固定文言のみ（`str(e)`/traceback 混入禁止）（[10.1]）

**B. 新テーブル＋migration 追加時**
- RLS 有効化 ＋ service_role 全許可ポリシー1本 → §4 Rule1/4
- 非 service_role ポリシーを足すなら HANDOFF §6 に (a)FastAPI経由不可の理由 (b)許可操作 (c)攻撃面 を記録 → §4 Rule2
- 冪等性（`IF NOT EXISTS`/`IF EXISTS`）→ §4
- 適用後に番人を回す: `.\scripts\check_rls_drift.ps1 -Target dev`（prod 適用後も）で CLEAN 確認
- `scripts/rls_allowlist.json` を更新（新ポリシー追記・note に HANDOFF §6 の理由リンク）
- ARCHITECTURE.md §3/§8（スキーマ・migration 一覧・適用状況）を更新 → §3

**C. 新たに他ユーザー情報を返す時**
- `GET /api/profiles/{user_id}` に倣う: ブロック→403（中立文言）・身バレ→404（block より前）の順
- fail-close: セキュリティ制御（ブロック/身バレ/BAN/approved）の例外は必ず `raise`（`except: pass` 禁止）。UX フィルタのみ fail-open 許容（[2.3]/[10.4][10.5]）
- ARCHITECTURE.md §7「バック側フィルタ」列を更新

**D. 新フォーム入力を足す時**
- Pydantic `Field(max_length=N)` / FastAPI `Form(..., max_length=N)` で上限 → §4
- 数値は `ge`/`le` 範囲制約（[5.6]）
- list は要素数上限＋要素1件あたり文字数上限（[5.7] interests=20件×50字）
- Pydantic 制約と DB CHECK の乖離を確認（[5.7] migration 048 ＋ Pydantic の二層）
- LIKE 検索を足すなら `_sanitize_*`（`%_\*` エスケープ）を適用（[5.3]）

**E. 新機能追加後の共通**
- semgrep を1回（backend/frontend・0件確認）（[11.3]）
- gitleaks pre-commit 通過（[1.10]）
- §8 の md 更新表（ARCHITECTURE/HANDOFF/STATUS/IDEAS）を照合 → §8

**F. 本番前に新機能を先行実装する場合（フラグ運用）**
- コメントアウト・dead code で放置しない。必ず環境変数 or DB フラグで OFF にし、本番では経路が一切走らない状態にする（既定 OFF）。
- フラグ名・既定値・ON 条件を docs/DEPLOY.md の環境変数表と IDEAS.md に記録する。
- IDEAS.md に「休止中（フラグで再 ON 可能）」として、状態・再 ON 方法・★再 ON 前の必須修正・判断トリガーを記載する（BeReal 型いいね受信枠の項を雛形とする）。
- 既知のバグを抱えたまま寝かせない。再 ON 前提条件を IDEAS に明記し、未修正項目は ROADMAP の該当 step か IDEAS の★必須項目に必ず積む。
- フラグで切る新機能も A〜E の各チェック（認証・rate limit・身バレ・サニタイズ・semgrep 等）を OFF 経路前提で満たすこと。OFF だからと検証を省かない。
- §5 保護ファイル（config.py 等）へフラグ定義の追加が必要な場合は、勝手に触らず停止してオーナーに §5 限定解除を確認する（LIKE_QUOTA で実際に停止条件化した前例あり）。

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

### カラーパレット — カラー SSoT（2026-06-11 確定）

定義場所: `frontend/src/index.css` の `@theme`（CSS 変数 + Tailwind theme）。
**以後、色のハードコード hex は禁止。必ずトークン参照（Tailwind クラス例 `bg-brand` / inline style は `var(--color-brand)`）を使うこと。**

**基盤**

| トークン | 値 | 用途 |
|---|---|---|
| `ink` | `#0A0A0A` | 黒・枠線・テキスト |
| `paper` | `#FFFFFF` | 白・背景 |
| `bone` | `#F4F4F0` | 紙・面（旧クリーム背景 `#FFFBEB` 等の置換先） |

**ブランド（アクセントは緑のみ）**

| `brand` | `#3DDC97` | メイン緑（ビビッドミント）。旧 `acid`（`#DFFF1F`）を全置換済み・`acid` は廃止 |
|---|---|---|

**セマンティック（値が同じでも意味を混ぜない・別トークン）**

| トークン | 値 | 用途 |
|---|---|---|
| `like` | `#FF3B6B` | いいね・ハート・恋愛アクション**専用**（ブランドアクセントに使わない） |
| `success` | `#3DDC97` | 成功・承認済み・オンライン表示（brand と同値・別トークン） |
| `warning` | `#F59E0B` | 注意・審査中バナー・在庫切れ（hash-amber を warning 用途に流用しない） |
| `danger` | `#FF3B6B` | 削除・BAN・却下・未対応（like と同値・別トークン） |
| `hot` | `#FF3B6B` | **旧名エイリアス（廃止予定）**。既存クラス `bg-hot`/`text-hot` 互換のため残置。新規は `like`/`danger` を使う |

> **緑は `brand` 単一**（2026-06-11 mint 廃止で確定）: 旧 `mint #A8F0D1` トークンは削除済み。装飾の緑も brand に統一（面で使う場合は `brand/10`〜`brand/15` 等の低不透明度でベタ塗りを避ける）。状態の緑は `success`（brand と同値・別トークン）を使う。

**ハッシュ（個人識別・5色固定）** — 実装 SSoT は `ColorfulCard.tsx` の `getUserColor()`（緑は brand 専有のため hash に含めない）

| トークン | 値 |
|---|---|
| `hash-rose` | `#FF4D8D` |
| `hash-violet` | `#9D6BFF` |
| `hash-azure` | `#3D9EFF` |
| `hash-amber` | `#FFC02E` |
| `hash-coral` | `#FF7A45` |

**ニュートラル** — 場当たりの `gray-300〜600` / `#999`/`#666` は廃止し ink の不透明度に統一: 本文muted=`ink/60`・補助=`ink/40`・極薄罫線=`ink/12`・面=`bone` または `ink/5`（`.text-muted`/`.text-subtle` は ink 不透明度で再定義済み）。例外: 暗背景上（HomePage ヒーロー・MatchModal・LP）の明るいグレーは可読性のため温存。

カードカラー（ユーザーカードの背景）:
```ts
// ColorfulCard.tsx — getUserColor(id) が SSoT（hashId(id) % 5）
const CARD_COLORS = ['#FF4D8D','#9D6BFF','#3D9EFF','#FFC02E','#FF7A45'];
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
- `brand`（旧 `acid`）: `bg-brand text-ink border-2 border-ink shadow(4px 4px 0 0 ink) font-bold`
- `outline-bold`: `bg-white text-ink border-2 border-ink shadow(4px 4px 0 0 ink) font-bold`
- 全ボタン: font-weight 700・押下時 translate(2px 2px) shadow 縮小

#### 入力フィールド
- `border: 2px solid #0A0A0A; border-radius: 8px;` / focus 時: `box-shadow: 2px 2px 0 0 #0A0A0A`

#### タグ・バッジ（tag-pill）
- `border: 1.5px solid #0A0A0A; border-radius: 9999px; font-weight: 700; font-size: 12px; padding: 4px 10px`

### ボトムナビ（Layout.tsx）
- 背景 `bg-ink`・4タブ: ホーム / さがす / マッチ / 設定
- 非アクティブ: 白アイコン + 白テキスト / アクティブ: `bg-brand` 丸 + 黒テキスト
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
- props: `size`（デフォルト 80）・`className` / カラー `#3DDC97`（brand。旧 mint `#A8F0D1` から 2026-06-11 変更）

### 絶対に使わないもの（禁止事項）
- 絵文字（lucide-react または SVG で代替）
- グラデーション背景
- 装飾目的の box-shadow（card-bold の影のみ許可）
- shadcn の `Card` コンポーネントをそのまま使う
- 全要素の中央揃え（左揃えベース）
- ローディングスピナー（文字アニメで代替）
- 赤いアラートボックス（インラインテキストでさりげなく）

### トーン・ボイス（マイクロコピー）
人格: ちょっとユーモアのある知的な先輩（**です/ます ベース**・Q-3 パスB 2026-06-06 適用）

| 場面 | テキスト |
|---|---|
| ローディング | 「読み込んでいます。少しお待ちください。」 |
| 審査中 | 「確認しています。もう少しお待ちください。」 |
| マッチ | ランダム3パターン（`MatchModal.tsx` 参照） |
| エラー | 「うまくいきませんでした。もう一度お試しください。」 |
| 空状態（マッチ0件） | 「まだマッチはいません。いいねを送ってみましょう。」 |
| 空状態（メッセージ0件） | ランダム3パターン（`ChatPage.tsx` 参照） |
| 空状態（おすすめ0件） | ランダム3パターン（`BrowsePage.tsx` 参照） |

禁止テキスト: 「〜できます」「エラーが発生しました」「操作が完了しました」「ご確認ください」「〜だよ」「〜しよう」「〜してね」「〜して。」

#### ランダム多パターン実装ルール
- ヘルパー: `function pickRandom<T>(items: readonly T[]): T { return items[Math.floor(Math.random() * items.length)] }`
- 空状態テキスト: `useState(() => pickRandom([...]))` でマウント時1回固定
- トーストテキスト: イベント発火時に `pickRandom(...)` を直接呼ぶ
- 実装済みファイル: `BrowsePage.tsx`（空状態・いいね送信・いいね切れトースト）、`ChatPage.tsx`（空状態）、`MatchModal.tsx`（マッチ成立）

---

## 8. 機能追加時のルール

機能を追加したら §3 の更新表と §4 の新機能追加チェックリスト（A〜F）に従って md を更新すること。

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
- ~~PP / 利用規約の施行日がプレースホルダー（弁護士確認後に埋める）~~ → ✅ 解消（2026-06-05）: 施行日 2026年6月5日 確定済み（自前起草・法的妥当性の最終担保はオーナー責任）
- ~~gotrue→supabase_auth 移行（本番リリース前）~~ → ✅ 解消（2026-06-07・dev/prod 両方反映済み）: `supabase==2.22.4`・`gotrue` 消滅・13 ファイル置換完了。詳細は HANDOFF.md §5 参照

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
