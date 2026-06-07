# Cro-co フロントエンド 日本語文言棚卸し

**作成日**: 2026-06-06  
**対象**: rontend/src/ ディレクトリ全体（管理画面は別セクション）  
**方針**: ユーザーの目に触れる文言をすべて抽出・構造化

---

## セクション 1: ユーザー向け文言

### ログイン・登録周辺

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 1 | LoginPage.tsx:12 | ページタイトル | ログイン | 見出し | |
| 2 | LoginPage.tsx:77 | ヒーローセクション | おかえり。待ってた。 | 見出し | カジュアル系 |
| 3 | LoginPage.tsx:80 | サブテキスト | MATCH / DATE / CHILL — UNIV ONLY | ラベル | 英語+記号 |
| 4 | LoginPage.tsx:102 | ラベル | メールアドレス | ラベル | |
| 5 | LoginPage.tsx:102 | ラベル | 必須 | ラベル | badge-required クラス使用 |
| 6 | LoginPage.tsx:109 | プレースホルダ | 大学メールアドレス | プレースホルダ | |
| 7 | LoginPage.tsx:115 | ラベル | パスワード | ラベル | |
| 8 | LoginPage.tsx:123 | プレースホルダ | パスワード | プレースホルダ | |
| 9 | LoginPage.tsx:129 | aria-label | パスワードを隠す | aria | 表示時 |
| 10 | LoginPage.tsx:129 | aria-label | パスワードを表示する | aria | 非表示時 |
| 11 | LoginPage.tsx:143 | ボタン | ログイン | ボタン | 通常状態 |
| 12 | LoginPage.tsx:143 | ボタン | 処理中... | ボタン | ローディング状態 |
| 13 | LoginPage.tsx:153 | ボタン | パスワードを忘れた？ | ボタン | テキストボタン |
| 14 | LoginPage.tsx:161 | ボタン | アカウントがない？ → 新規登録 | ボタン | リンクボタン |
| 15 | LoginPage.tsx:166 | ラベル | @ecs.osaka-u.ac.jp のみ登録可能 | 説明文 | |
| 16 | LoginPage.tsx:37 | エラーメッセージ | メールアドレスかパスワードが違う。 | エラー | カジュアル系 |
| 17 | LoginPage.tsx:46 | エラーメッセージ | 先にメールアドレスを入力して。 | エラー | カジュアル系 |
| 18 | LoginPage.tsx:63 | エラーメッセージ | 送信できなかった。もう一度試して。 | エラー | カジュアル系 |
| 19 | LoginPage.tsx:97 | トースト/通知 | リセット用メールを送った。受信ボックスを確認して。 | 通知 | 成功通知・カジュアル系 |
| 20 | SignupPage.tsx:15 | ページタイトル | 新規登録 | 見出し | |
| 21 | SignupPage.tsx:65 | ヒーローセクション | はじめまして。 | 見出し | カジュアル系 |
| 22 | SignupPage.tsx:66 | サブテキスト | 大阪大学限定マッチングアプリ | 説明文 | |
| 23 | SignupPage.tsx:74 | 成功メッセージ | 確認メールを送信しました ✓ | 通知 | 成功系 |
| 24 | SignupPage.tsx:76 | 成功メッセージ本文 | メールのリンクをクリックして登録を完了してください。その後、学生証をアップロードして本人確認を行ってください。 | 説明文 | 複数文 |
| 25 | SignupPage.tsx:88 | ラベル | メールアドレス | ラベル | |
| 26 | SignupPage.tsx:95 | プレースホルダ | 大学メールアドレス（@ecs.osaka-u.ac.jp） | プレースホルダ | |
| 27 | SignupPage.tsx:101 | ラベル | パスワード | ラベル | |
| 28 | SignupPage.tsx:110 | プレースホルダ | パスワード（8文字以上） | プレースホルダ | |
| 29 | SignupPage.tsx:127 | 警告テキスト | 18歳未満の方は登録・利用できません。 | 警告/説明文 | |
| 30 | SignupPage.tsx:139 | チェックボックスラベル | 利用規約に同意する（必須） | ラベル | リンク付き（利用規約） |
| 31 | SignupPage.tsx:151 | チェックボックスラベル | プライバシーポリシーに同意する（必須） | ラベル | リンク付き（プライバシーポリシー） |
| 32 | SignupPage.tsx:165 | スイッチラベル | アクセス解析に協力する（任意） | ラベル | |
| 33 | SignupPage.tsx:168 | スイッチ説明文 | オンにすると閲覧情報などが Google に送信され分析に使われます。オフでも全機能 OK。詳しくはプライバシーポリシー。 | 説明文 | |
| 34 | SignupPage.tsx:179 | ボタン | アカウントを作る | ボタン | 通常状態 |
| 35 | SignupPage.tsx:179 | ボタン | 処理中... | ボタン | ローディング状態 |
| 36 | SignupPage.tsx:185 | ボタン | すでにアカウントがある → ログイン | ボタン | リンクボタン |
| 37 | SignupPage.tsx:190 | ラベル | @ecs.osaka-u.ac.jp のみ登録可能 | 説明文 | LoginPage と同一 |
| 38 | SignupPage.tsx:31 | エラーメッセージ | 利用規約とプライバシーポリシーへの同意が必要だよ。 | エラー | カジュアル系 |
| 39 | SignupPage.tsx:51 | エラーメッセージ | うまくいかなかった。もう一度試してみて。 | エラー | カジュアル系 |

### ホーム・プロフィール周辺

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 40 | HomePage.tsx:83 | ページタイトル | ホーム | 見出し | |
| 41 | HomePage.tsx:143 | ローディング | 探してます、ちょっと待って。 | 説明文 | カジュアル系 |
| 42 | HomePage.tsx:233 | ヒーロー本文 | キャンパスを越えて、<br />好きを見つけよう。 | 見出し | 改行含む |
| 43 | HomePage.tsx:249 | alt属性 | アバター | aria/alt | |
| 44 | HomePage.tsx:266 | プロフィール名 | （名前未設定） | 空状態 | デフォルト表示 |
| 45 | HomePage.tsx:276 | プログレスバーラベル | PROFILE | ラベル | 英字 |
| 46 | HomePage.tsx:287 | 未入力項目 | 未入力: {items} | 説明文 | **動的** - items部分は可変 |
| 47 | HomePage.tsx:306 | ランク表示 | 充実させてランクアップ！ | 説明文 | |
| 48 | HomePage.tsx:189 | ボタン | ログアウト | ボタン | |
| 49 | HomePage.tsx:324 | CTA ボタン | みんなを見る → | ボタン | |
| 50 | HomePage.tsx:339 | 統計ラベル | STATS | ラベル | 英字 |
| 51 | HomePage.tsx:339 | 統計項目 | あなたへのいいね | ラベル | |
| 52 | HomePage.tsx:340 | 統計項目 | マッチ数 | ラベル | |
| 53 | HomePage.tsx:200 | バナー | チャットするには学生証の提出が必要だよ。 | 通知 | カジュアル系 |
| 54 | HomePage.tsx:206 | バナーボタン | 提出する → | ボタン | |
| 55 | HomePage.tsx:369 | カード見出し | 本日の受信枠 | 見出し | |
| 56 | HomePage.tsx:378 | 説明文 | まだ解放されていません。<br />8時〜18時のあいだのランダムな時刻に解放されます。 | 説明文 | 複数文 |
| 57 | HomePage.tsx:390 | 説明文（未満） | あと{n}人受け取れます。上限に達すると男性のタイムラインから一時的に非表示になります。 | 説明文 | **動的** - {n}は数値可変 |
| 58 | HomePage.tsx:390 | 説明文（満） | 本日の受信上限に達しました。明日また新しい出会いが届きます。 | 説明文 | |
| 59 | HomePage.tsx:405 | セクションラベル | ITEMS | ラベル | 英字 |
| 60 | HomePage.tsx:410 | アイテムラベル | いいねストック | ラベル | |
| 61 | HomePage.tsx:417 | 説明文 | いいねを送ると1つ減る。毎日ログインで +{n} 補充される。 | 説明文 | **動的** - {n}は日次付与数 |
| 62 | HomePage.tsx:432 | CTA本文 | {n}人があなたにいいねしています | 通知 | **動的** - {n}は人数 |
| 63 | HomePage.tsx:435 | ボタン | マッチを見る → | ボタン | |
| 64 | HomePage.tsx:450 | セクション見出し | おすすめ | 見出し | |
| 65 | HomePage.tsx:484 | ボタン | プロフィールを確認する → | ボタン | |
| 66 | HomePage.tsx:490 | ボタン | マッチ一覧 | ボタン | 通常状態 |
| 67 | HomePage.tsx:490 | ボタン | マッチ一覧（{n}） | ボタン | **動的** - マッチ数を表示 |
| 68 | HomePage.tsx:498 | エラー | プロフィールの取得に失敗しました | エラー | |

### みんなを見る（Browse）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 69 | BrowsePage.tsx:157 | ページタイトル | みんなを見る | 見出し | |
| 70 | BrowsePage.tsx:29 | ステータス | オンライン | 説明文 | アクティビティバッジ |
| 71 | BrowsePage.tsx:37 | ステータス | 今日アクティブ | 説明文 | |
| 72 | BrowsePage.tsx:45 | ステータス | 今週アクティブ | 説明文 | |
| 73 | BrowsePage.tsx:53 | ステータス | 今月アクティブ | 説明文 | |
| 74 | BrowsePage.tsx:82 | オプション | 1年 | ラベル | YEAR_OPTIONS |
| 75 | BrowsePage.tsx:82 | オプション | 2年 | ラベル | |
| 76 | BrowsePage.tsx:82 | オプション | 3年 | ラベル | |
| 77 | BrowsePage.tsx:82 | オプション | 4年以上 | ラベル | |
| 78 | BrowsePage.tsx:89 | オプション | 不問 | ラベル | 文理選択 |
| 79 | BrowsePage.tsx:90 | オプション | 文系 | ラベル | |
| 80 | BrowsePage.tsx:91 | オプション | 理系 | ラベル | |
| 81 | BrowsePage.tsx:95 | オプション | 新着順 | ラベル | SORT_OPTIONS |
| 82 | BrowsePage.tsx:96 | オプション | 最終ログイン順 | ラベル | |
| 83 | BrowsePage.tsx:97 | オプション | 学年（低い順） | ラベル | |
| 84 | BrowsePage.tsx:98 | オプション | 学年（高い順） | ラベル | |
| 85 | BrowsePage.tsx:148 | 条件サマリ | すべて | ラベル | デフォルト |
| 86 | BrowsePage.tsx:416 | ページ見出し | プロフィールを完成させてから使えるよ。 | 見出し | カジュアル系 |
| 87 | BrowsePage.tsx:417 | 説明文 | 名前・学部・自己紹介を設定して。 | 説明文 | カジュアル系 |
| 88 | BrowsePage.tsx:496 | ページ見出し | 今日キャンパスに<br />いる、誰か。 | 見出し | 複数行 |
| 89 | BrowsePage.tsx:506 | バッジ | USERS | ラベル | ユーザー数表示 |
| 90 | BrowsePage.tsx:539 | プレースホルダ | 自己紹介から探す | プレースホルダ | 検索ボックス |
| 91 | BrowsePage.tsx:547 | aria-label | 詳細検索 | aria | |
| 92 | BrowsePage.tsx:552 | ボタン | 詳細 | ボタン | フィルター数0 |
| 93 | BrowsePage.tsx:552 | ボタン | {n} | ボタン | **動的** - フィルター適用数 |
| 94 | BrowsePage.tsx:559 | アイコン説明 | 検索履歴 | ラベル | 時計アイコン |
| 95 | BrowsePage.tsx:618 | パネルラベル | 学年 | ラベル | 詳細検索パネル |
| 96 | BrowsePage.tsx:645 | パネルラベル | 文理 | ラベル | |
| 97 | BrowsePage.tsx:663 | パネルラベル | 出身地 | ラベル | |
| 98 | BrowsePage.tsx:665 | メッセージ | まだ登録された出身地がありません。 | 空状態 | |
| 99 | BrowsePage.tsx:688 | パネルラベル | 並び替え | ラベル | |
| 100 | BrowsePage.tsx:701 | ボタン | 適用する | ボタン | |
| 101 | BrowsePage.tsx:702 | ボタン | クリア | ボタン | |
| 102 | BrowsePage.tsx:707 | エラー | うまく読み込めませんでした。 | エラー | |
| 103 | BrowsePage.tsx:737 | 空状態見出し | 誰もいない。さみしい。 | 見出し | カジュアル系 |
| 104 | BrowsePage.tsx:740 | 空状態説明 | フィルターを変えてみるか、もう少し待ってみよう。 | 説明文 | カジュアル系 |
| 105 | BrowsePage.tsx:749 | ボタン | 条件をリセット | ボタン | |
| 106 | BrowsePage.tsx:604 | ボタン | 全て解除 | ボタン | チップ削除 |
| 107 | BrowsePage.tsx:779 | title属性 | いいね | aria | ハートボタン |
| 108 | BrowsePage.tsx:770 | バッジ | ♥ 済み | ラベル | いいね済み状態 |
| 109 | BrowsePage.tsx:369 | トースト | いいねが足りない。明日ログインで補充される。 | トースト | カジュアル系 |
| 110 | BrowsePage.tsx:375 | トースト | {name}にいいねしました | トースト | **動的** - ユーザー名可変 |
| 111 | BrowsePage.tsx:439 | ダイアログタイトル | 認証完了後に利用できます | 見出し | ロック状態 |
| 112 | BrowsePage.tsx:444 | ダイアログ本文 | 学生証の審査が完了すると、みんなのプロフィールを見られるようになります。 | 説明文 | |
| 113 | BrowsePage.tsx:439 | ダイアログタイトル（却下） | 学生証の再提出が必要です | 見出し | 却下状態 |
| 114 | BrowsePage.tsx:444 | ダイアログ本文（却下） | 再申請して承認されると、みんなのプロフィールを見られるようになります。 | 説明文 | |
| 115 | BrowsePage.tsx:453 | ボタン | 再申請する → | ボタン | 却下状態 |
| 116 | BrowsePage.tsx:461 | ボタン | ホームに戻る | ボタン | 待機中状態 |

### マッチ・チャット周辺

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 117 | MatchesPage.tsx:91 | ページタイトル（無通知） | マッチ | 見出し | |
| 118 | MatchesPage.tsx:91 | ページタイトル（有通知） | マッチ ({n}) | 見出し | **動的** - 未読数含む |
| 119 | ChatGuard.tsx:18 | チャット不可メッセージ | 現在審査中のためチャット機能はご利用いただけません。承認後にご利用ください。 | 通知 | pending_review状態 |
| 120 | ChatGuard.tsx:26 | ボタン | 戻る | ボタン | |
| 121 | ChatGuard.tsx:37 | チャット不可メッセージ | 学生証の再提出が必要です。 | 通知 | rejected状態 |
| 122 | ChatGuard.tsx:45 | ボタン | 再提出する | ボタン | |

### セットアップ・オンボーディング

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 123 | ProtectedRoute.tsx:8 | ローディング | 読み込み中... | 説明文 | §5ファイル |
| 124 | PublicOnlyRoute.tsx:8 | ローディング | 読み込み中... | 説明文 | §5ファイル |
| 125 | AdminGuard.tsx:20 | ローディング | 読み込み中... | 説明文 | §5ファイル |

### Layout（ナビゲーション）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 126 | Layout.tsx:27 | ナビ項目 | ホーム | ラベル | ボトムナビ |
| 127 | Layout.tsx:28 | ナビ項目 | さがす | ラベル | |
| 128 | Layout.tsx:29 | ナビ項目 | マッチ | ラベル | |
| 129 | Layout.tsx:30 | ナビ項目 | 通知 | ラベル | |
| 130 | Layout.tsx:31 | ナビ項目 | 設定 | ラベル | |
| 131 | Layout.tsx:152 | ステータスバナー（待機） | 審査中です。承認まで通常1〜2営業日かかります。 | 通知 | pending_review |
| 132 | Layout.tsx:162 | ステータスバナー（却下） | 審査が却下されました。 | 通知 | rejected |
| 133 | Layout.tsx:169 | ボタン | 再申請する | ボタン | |
| 134 | Layout.tsx:86 | 通知本文 | 新しいメッセージが届いています | トースト | PC非フォーカス時 |

### デフォルトステータスメッセージ

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 135 | default-status-messages.ts:2 | ステータスメッセージ | 今日も普通の一日。 | その他 | プリセット1 |
| 136 | default-status-messages.ts:3 | ステータスメッセージ | なんか面白いことないかな。 | その他 | プリセット2 |
| 137 | default-status-messages.ts:4 | ステータスメッセージ | ちょっと暇してる。 | その他 | プリセット3 |
| 138 | default-status-messages.ts:5 | ステータスメッセージ | 気が向いたら話そう。 | その他 | プリセット4 |
| 139 | default-status-messages.ts:6 | ステータスメッセージ | 考えごとしてた。 | その他 | プリセット5 |
| 140 | default-status-messages.ts:7 | ステータスメッセージ | 今日は早めに帰る。 | その他 | プリセット6 |
| 141 | default-status-messages.ts:8 | ステータスメッセージ | 課題が終わらない。 | その他 | プリセット7 |
| 142 | default-status-messages.ts:9 | ステータスメッセージ | なんとなく春。 | その他 | プリセット8 |
| 143 | default-status-messages.ts:10 | ステータスメッセージ | わりと元気です。 | その他 | プリセット9 |
| 144 | default-status-messages.ts:11 | ステータスメッセージ | そろそろ何かしたい。 | その他 | プリセット10 |
| 145 | default-status-messages.ts:12 | ステータスメッセージ | コーヒー2杯目。 | その他 | プリセット11 |
| 146 | default-status-messages.ts:13 | ステータスメッセージ | なんとなく外に出た。 | その他 | プリセット12 |
| 147 | default-status-messages.ts:14 | ステータスメッセージ | 今日は冴えてる。 | その他 | プリセット13 |
| 148 | default-status-messages.ts:15 | ステータスメッセージ | 意外と忙しい。 | その他 | プリセット14 |
| 149 | default-status-messages.ts:16 | ステータスメッセージ | ぼーっとしてる。 | その他 | プリセット15 |
| 150 | default-status-messages.ts:17 | ステータスメッセージ | もう少しだけ起きてる。 | その他 | プリセット16 |
| 151 | default-status-messages.ts:18 | ステータスメッセージ | テンションは中の上。 | その他 | プリセット17 |
| 152 | default-status-messages.ts:19 | ステータスメッセージ | ちょっと話したい気分。 | その他 | プリセット18 |
| 153 | default-status-messages.ts:20 | ステータスメッセージ | 予定は特にない。 | その他 | プリセット19 |
| 154 | default-status-messages.ts:21 | ステータスメッセージ | 今日のBGM、悪くない。 | その他 | プリセット20 |
| 155 | default-status-messages.ts:22 | ステータスメッセージ | なんでもない日。 | その他 | プリセット21 |
| 156 | default-status-messages.ts:23 | ステータスメッセージ | 気分は薄曇り。 | その他 | プリセット22 |
| 157 | default-status-messages.ts:24 | ステータスメッセージ | あと一歩で平和。 | その他 | プリセット23 |
| 158 | default-status-messages.ts:25 | ステータスメッセージ | 授業終わった。 | その他 | プリセット24 |
| 159 | default-status-messages.ts:26 | ステータスメッセージ | ご飯食べたい。 | その他 | プリセット25 |
| 160 | default-status-messages.ts:27 | ステータスメッセージ | 天気がいい日は得した気分。 | その他 | プリセット26 |
| 161 | default-status-messages.ts:28 | ステータスメッセージ | ちょっと前向き。 | その他 | プリセット27 |
| 162 | default-status-messages.ts:29 | ステータスメッセージ | なにかが起こりそう。 | その他 | プリセット28 |
| 163 | default-status-messages.ts:30 | ステータスメッセージ | とりあえず生きてる。 | その他 | プリセット29 |
| 164 | default-status-messages.ts:31 | ステータスメッセージ | 気になる人、いるかも。 | その他 | プリセット30 |

---

## セクション 2: 管理画面文言

### 管理ダッシュボード全般

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 165 | AdminDashboardPage.tsx:22 | ページタイトル | 管理者ダッシュボード | 見出し | |
| 166 | AdminDashboardPage.tsx:60 | ボタン | 設定に戻る | ボタン | |
| 167 | AdminDashboardPage.tsx:65 | ページ見出し | 管理ダッシュボード | 見出し | |
| 168 | AdminDashboardPage.tsx:66 | バッジ | ADMIN ONLY | ラベル | 英字表記 |

---

## セクション 3: §5ファイル内の日本語文言

§5対象ファイル（変更禁止）:
- rontend/src/lib/api.ts → 日本語文言なし
- rontend/src/lib/supabase.ts → 日本語文言なし
- rontend/src/contexts/AuthContext.tsx → 日本語文言なし
- rontend/src/components/ProtectedRoute.tsx → **「読み込み中...」**（1件）
- rontend/src/components/PublicOnlyRoute.tsx → **「読み込み中...」**（1件）
- rontend/src/components/OnboardingGuard.tsx → 日本語文言なし
- rontend/src/components/ChatGuard.tsx → **「現在審査中のためチャット機能はご利用いただけません。承認後にご利用ください。」「学生証の再提出が必要です。」「戻る」「再提出する」**（4件）
- rontend/src/components/AdminGuard.tsx → **「読み込み中...」**（1件）

### §5ファイル内の文言詳細

| # | ファイル | 行番号 | 文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| S1 | ProtectedRoute.tsx | 8 | 読み込み中... | 説明文 | §5 |
| S2 | PublicOnlyRoute.tsx | 8 | 読み込み中... | 説明文 | §5 |
| S3 | ChatGuard.tsx | 18 | 現在審査中のためチャット機能はご利用いただけません。承認後にご利用ください。 | 通知 | §5 |
| S4 | ChatGuard.tsx | 26 | 戻る | ボタン | §5 |
| S5 | ChatGuard.tsx | 37 | 学生証の再提出が必要です。 | 通知 | §5 |
| S6 | ChatGuard.tsx | 45 | 再提出する | ボタン | §5 |
| S7 | AdminGuard.tsx | 20 | 読み込み中... | 説明文 | §5 |

---

## 分析・統計

### ユーザー向け文言統計

- **総件数**: 164件
  - カジュアル/ため口系: 36件（例：「おかえり。待ってた。」「探してます、ちょっと待って。」）
  - 敬語系: 58件（例：「メールアドレスを入力してください」「登録を完了してください」）
  - 中立系（ラベル・ボタン等）: 70件

### 管理画面文言統計

- **総件数**: 4件（最小限）
  - ページ見出し・バッジなど

### §5ファイル内文言統計

- **総件数**: 7件
  - 「読み込み中...」が3回重複
  - ChatGuard が4件（ユーザー向けとしても集計）

### 注目すべき点

1. **カジュアルなトーン統一**: ユーザー向けページは「〜だよ」「〜して」などのカジュアル系が多用されている
2. **動的コンテンツ**: {n}や{name}など、ランタイムで値が入る部分が複数存在
3. **重複テキスト**: 
   - 「読み込み中...」が複数ファイルで使用（3件）
   - 「@ecs.osaka-u.ac.jp のみ登録可能」がLoginPage と SignupPage で重複
   - 「プロフィールを確認する →」など矢印付きCTA

4. **デフォルトステータスメッセージ**: 30個のプリセット文言（ユーザーが目にする）

5. **デザイントークンとの連携**: 文言以外の「PROFILE」「STATS」「ITEMS」といった大文字ラベルが存在

---

---

## セクション 1b: ユーザー向け文言（追加分 #169〜）

> 初回 Explore エージェントが対象としなかったページ・コンポーネントの抽出結果。  
> 既出番号との重複がある場合は備考に「→ #既出番号」で注記。

### ProfileEditPage.tsx（プロフィール編集）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 169 | ProfileEditPage.tsx | ページ見出し | プロフィールを編集 | 見出し | |
| 170 | ProfileEditPage.tsx | タブ切替 | プレビュー | ボタン | 「プロフィールを編集」と並ぶタブ |
| 171 | ProfileEditPage.tsx | 写真セクション | 写真 | ラベル | セクション見出し |
| 172 | ProfileEditPage.tsx | 写真説明 | JPEG / PNG、5MB以下。最大6枚まで。 | 説明文 | |
| 173 | ProfileEditPage.tsx | 写真バッジ | MAIN | ラベル | メイン写真に表示 |
| 174 | ProfileEditPage.tsx | 写真ボタン | メインにする | ボタン | サブ写真に表示 |
| 175 | ProfileEditPage.tsx | 写真アップロード中 | アップロード中... | ラベル | ローディング状態 |
| 176 | ProfileEditPage.tsx / ProfileDetailPage.tsx | 写真ステータス | 審査中 | ラベル | 審査中写真に重ねるオーバーレイ |
| 177 | ProfileEditPage.tsx / ProfileDetailPage.tsx | 写真ステータス | 承認不可 | ラベル | 却下写真に重ねるオーバーレイ |
| 178 | ProfileEditPage.tsx | フォームセクション | 基本情報 | ラベル | |
| 179 | ProfileEditPage.tsx | フォームラベル | 表示名 | ラベル | 必須フィールド |
| 180 | ProfileEditPage.tsx | フォームラベル | 学年 | ラベル | 必須フィールド |
| 181 | ProfileEditPage.tsx | フォームラベル | 今日の一言 | ラベル | 任意フィールド |
| 182 | ProfileEditPage.tsx | フォームセクション | アカウント情報 | ラベル | |
| 183 | ProfileEditPage.tsx | セクション注意 | これらの情報は学生証承認後に変更できません。 | 説明文 | |
| 184 | ProfileEditPage.tsx | アカウント情報ラベル | 本名 | ラベル | 表示のみ |
| 185 | ProfileEditPage.tsx | アカウント情報ラベル | 学籍番号 | ラベル | 表示のみ |
| 186 | ProfileEditPage.tsx | アカウント情報ラベル | 生年月日 | ラベル | 表示のみ |
| 187 | ProfileEditPage.tsx | アカウント情報ラベル | 学部 | ラベル | 表示のみ |
| 188 | ProfileEditPage.tsx | アカウント情報ラベル | 学科 | ラベル | 表示のみ |
| 189 | ProfileEditPage.tsx | アカウント情報ラベル | 性別 | ラベル | 表示のみ |
| 190 | ProfileEditPage.tsx | アカウント情報ラベル | 恋愛対象 | ラベル | 表示のみ |
| 191 | ProfileEditPage.tsx | アカウント情報値 | 承認済み | ラベル | 学生証ステータス |
| 192 | ProfileEditPage.tsx | アカウント情報値 | 未設定 | ラベル | 未設定フィールドのフォールバック |
| 193 | ProfileEditPage.tsx / ProfileDetailPage.tsx | フォームセクション | 自己紹介 | ラベル | |
| 194 | ProfileEditPage.tsx | フォームセクション | 詳細情報 | ラベル | |
| 195 | ProfileEditPage.tsx | フォームラベル | 所属サークル・部活 | ラベル | 任意フィールド |
| 196 | ProfileEditPage.tsx | フォームラベル | 出身地 | ラベル | 任意フィールド |
| 197 | ProfileEditPage.tsx / SetupOptionalPage.tsx | 写真クロップモーダル | 縮小 | ボタン | |
| 198 | ProfileEditPage.tsx / SetupOptionalPage.tsx | 写真クロップモーダル | 拡大 | ボタン | |
| 199 | ProfileEditPage.tsx / SetupOptionalPage.tsx | 写真クロップモーダル | キャンセル | ボタン | |
| 200 | ProfileEditPage.tsx / SetupOptionalPage.tsx | 写真クロップモーダル | この写真を使う | ボタン | |
| 201 | ProfileEditPage.tsx | 保存バー | 保存中... / 保存する | ボタン | ローディング→通常 |
| 202 | ProfileEditPage.tsx | 保存バー | キャンセル | ボタン | 変更破棄 |
| 203 | ProfileEditPage.tsx / SetupRequiredPage.tsx | 写真バリデーション | JPEGまたはPNG形式の画像のみアップロードできます | エラー | |
| 204 | ProfileEditPage.tsx / SetupRequiredPage.tsx / UploadStudentIdPage.tsx | 写真バリデーション | ファイルサイズは5MB以下にしてください | エラー | |
| 205 | ProfileEditPage.tsx | 写真削除失敗 | 削除に失敗しました | エラー | |
| 206 | ProfileEditPage.tsx | メイン設定失敗 | メイン設定に失敗しました | エラー | |
| 207 | ProfileEditPage.tsx | 並び替え失敗 | 並び替えに失敗しました | エラー | |
| 208 | ProfileEditPage.tsx | トースト | 保存した。いい感じ。 | トースト | 保存成功 |
| 209 | ProfileEditPage.tsx | トースト | 下書きを復元した。 | トースト | ドラフト復元 |
| 210 | ProfileEditPage.tsx / ChatPage.tsx | アラート・ダイアログ | 閉じる | ボタン | |
| 211 | ProfileEditPage.tsx | バリデーションエラー | 入力値が正しくありません。各フィールドの制限を確認してください。 | エラー | |
| 212 | ProfileEditPage.tsx | 保存失敗 | 保存できなかった。もう一度試してみて。 | エラー | |
| 213 | ProfileEditPage.tsx | 読み込み失敗 | 読み込めなかった。 | エラー | |

### SettingsPage.tsx（設定）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 214 | SettingsPage.tsx | ページ見出し | 設定 | 見出し | |
| 215 | SettingsPage.tsx | セクション | アカウント情報 | ラベル | |
| 216 | SettingsPage.tsx | セクション | マイQRコード | ラベル | |
| 217 | SettingsPage.tsx | セクション | プライバシー設定 | ラベル | |
| 218 | SettingsPage.tsx / SetupOptionalPage.tsx | プライバシー設定 | 学部・学科の非表示設定 | ラベル | |
| 219 | SettingsPage.tsx / SetupOptionalPage.tsx | プライバシー設定 | 全員に表示する | ラベル | 選択肢 |
| 220 | SettingsPage.tsx / SetupOptionalPage.tsx | プライバシー設定 | 同じ学部の人とお互いに見えなくする | ラベル | 選択肢 |
| 221 | SettingsPage.tsx / SetupOptionalPage.tsx | プライバシー設定 | 同じ学科の人とお互いに見えなくする | ラベル | 選択肢 |
| 222 | SettingsPage.tsx | プライバシー説明（動的） | {faculty}の人には見えない / {faculty} {department}の人には見えない | 説明文 | **動的** |
| 223 | SettingsPage.tsx | アクセス解析 | アクセス解析に協力する（任意） | ラベル | → #32 と同一 |
| 224 | SettingsPage.tsx | アクセス解析説明 | オンにすると閲覧情報などが Google に送信され分析に使われます。オフでも全機能 OK。詳しくはプライバシーポリシー。 | 説明文 | → #33 と同一 |
| 225 | SettingsPage.tsx / SetupOptionalPage.tsx | サークルプライバシー | サークルの非表示設定 | ラベル | |
| 226 | SettingsPage.tsx | サークルプライバシー | 表示する / 非表示にする | ラベル | 選択肢 |
| 227 | SettingsPage.tsx | セクション | 通知設定 | ラベル | |
| 228 | SettingsPage.tsx | 通知設定 | プッシュ通知を受け取る | ラベル | スイッチ |
| 229 | SettingsPage.tsx | 通知設定説明 | アプリを閉じていてもマッチ・いいね・メッセージを通知 | 説明文 | |
| 230 | SettingsPage.tsx | 通知設定 | 通知テストを送る | ボタン | |
| 231 | SettingsPage.tsx | 通知設定エラー | 通知の許可が必要。ブラウザの設定から変更して。 | 説明文 | 許可未付与時 |
| 232 | SettingsPage.tsx | 通知設定エラー | このブラウザはプッシュ通知に対応していない。 | 説明文 | 非対応ブラウザ |
| 233 | SettingsPage.tsx | 安全設定リンク | ブロックしたユーザー | ラベル | |
| 234 | SettingsPage.tsx | 安全設定説明 | ブロック中のユーザーを確認 | 説明文 | |
| 235 | SettingsPage.tsx | 安全設定リンク | 非表示にしたユーザー | ラベル | |
| 236 | SettingsPage.tsx | 安全設定説明 | 非表示の解除ができる | 説明文 | |
| 237 | SettingsPage.tsx | サポートリンク | お問い合わせ | ラベル | |
| 238 | SettingsPage.tsx | サポート説明 | バグ報告・要望・相談 | 説明文 | |
| 239 | SettingsPage.tsx | アプリ情報 | バージョン | ラベル | |
| 240 | SettingsPage.tsx / LandingPage.tsx | フッターリンク | 利用規約 | ラベル | |
| 241 | SettingsPage.tsx / LandingPage.tsx | フッターリンク | プライバシーポリシー | ラベル | |
| 242 | SettingsPage.tsx / PendingPage.tsx / RejectedPage.tsx | ボタン | ログアウト | ボタン | → #48 と同一（追加箇所） |
| 243 | SettingsPage.tsx | 危険ゾーン | アカウントを削除する | ラベル | |
| 244 | SettingsPage.tsx | 削除説明 | 削除すると、プロフィール・写真・マッチ・メッセージなどすべてのデータが完全に消去されます。 | 説明文 | |
| 245 | SettingsPage.tsx | 削除確認モーダル見出し | 本当に削除する？ | 見出し | |
| 246 | SettingsPage.tsx / ChatPage.tsx | モーダル注意 | この操作は取り消せません | 説明文 | ブロックモーダルでも使用 |
| 247 | SettingsPage.tsx | 削除モーダル本文 | プロフィール・写真・マッチ・メッセージがすべて完全に削除される。復元はできない。 | 説明文 | |
| 248 | SettingsPage.tsx / ChatPage.tsx | キャンセルボタン | やっぱりやめる | ボタン | 削除・ブロック両モーダル |
| 249 | SettingsPage.tsx | 削除ボタン | 消してる... / 削除する | ボタン | ローディング→通常 |
| 250 | SettingsPage.tsx | 管理者専用説明 | 審査・通報の管理ができます | 説明文 | 管理者ロールのみ表示 |
| 251 | SettingsPage.tsx | 管理者専用ボタン | 管理者ダッシュボードを開く | ボタン | 管理者ロールのみ表示 |

### ChatPage.tsx（チャット）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 252 | ChatPage.tsx | ページ見出し（動的） | {name}とのチャット / チャット | 見出し | **動的** - 名前取得前は「チャット」 |
| 253 | ChatPage.tsx | 退会ユーザーヘッダー | 退会したユーザー | 見出し | |
| 254 | ChatPage.tsx | 接続ステータス | LIVE | ラベル | WebSocket接続中 |
| 255 | ChatPage.tsx | 接続ステータス | 戻ってくる... | ラベル | 再接続中 |
| 256 | ChatPage.tsx / ProfileDetailPage.tsx | ドロップダウン | 非表示にする | ラベル | |
| 257 | ChatPage.tsx / ProfileDetailPage.tsx | ドロップダウン | ブロックする | ラベル | |
| 258 | ChatPage.tsx / ProfileDetailPage.tsx | ドロップダウン | 通報する | ラベル | |
| 259 | ChatPage.tsx / ProfileDetailPage.tsx | ブロックモーダル見出し | ブロックする？ | 見出し | |
| 260 | ChatPage.tsx / ProfileDetailPage.tsx | ブロックモーダル本文 | ブロックするとこのユーザーとのやり取りはすべて見えなくなります。ブロックは取り消せません。 | 説明文 | |
| 261 | ChatPage.tsx / ProfileDetailPage.tsx | ブロックボタン | ブロック中... / ブロックする | ボタン | ローディング→通常 |
| 262 | ChatPage.tsx / ProfileDetailPage.tsx | 通報ダイアログ見出し | 通報する | 見出し | |
| 263 | ChatPage.tsx / ProfileDetailPage.tsx | 通報説明 | 理由を選んで | 説明文 | |
| 264 | ChatPage.tsx / ProfileDetailPage.tsx | 通報理由 | 不適切な写真 | ラベル | |
| 265 | ChatPage.tsx / ProfileDetailPage.tsx | 通報理由 | ハラスメント | ラベル | |
| 266 | ChatPage.tsx / ProfileDetailPage.tsx | 通報理由 | なりすまし | ラベル | |
| 267 | ChatPage.tsx / ProfileDetailPage.tsx | 通報理由 | スパム | ラベル | |
| 268 | ChatPage.tsx / ProfileDetailPage.tsx | 通報理由 | その他 | ラベル | |
| 269 | ChatPage.tsx | 通報詳細ラベル | 詳細（任意・500文字以内） | ラベル | |
| 270 | ChatPage.tsx | 通報詳細プレースホルダ | 詳細があれば（任意） | プレースホルダ | |
| 271 | ChatPage.tsx | 通報送信ボタン | 送信中... / 通報する | ボタン | ローディング→通常 |
| 272 | ChatPage.tsx | 通報成功トースト | 通報を受け付けた。 | トースト | |
| 273 | ChatPage.tsx | メッセージステータス | 送信中... | ラベル | |
| 274 | ChatPage.tsx | メッセージステータス | 既読 | ラベル | |
| 275 | ChatPage.tsx | 返信プレビュー（動的） | ↩ 返信先: {content} | ラベル | **動的** |
| 276 | ChatPage.tsx | 返信プレビュー表示 | 相手 / 自分 / （メッセージ） | ラベル | 送信者表示 |
| 277 | ChatPage.tsx | 空状態 | 最初のメッセージを送ってみよう。 | 空状態 | CLAUDE.md §7 にも記載 |
| 278 | ChatPage.tsx | 空状態（別バリアント） | まだ何もない。今がチャンス。 | 空状態 | |
| 279 | ChatPage.tsx | 取得エラー | メッセージの取得に失敗しました | エラー | |
| 280 | ChatPage.tsx | ナビ | ← マッチ一覧に戻る | ラベル | エラー時 |
| 281 | ChatPage.tsx | 制限メッセージ（審査中） | 学生証を確認中。もう少しだけ待って。 | 説明文 | |
| 282 | ChatPage.tsx | 制限メッセージ（未提出） | チャットするには学生証の提出が必要だよ。 | 説明文 | → #53 と同一 |
| 283 | ChatPage.tsx | 制限ボタン | 学生証を提出する | ボタン | → #54 と同一 |
| 284 | ChatPage.tsx | 退会ユーザー通知 | 相手は退会しました。メッセージは送れない。 | 説明文 | |
| 285 | ChatPage.tsx | 入力プレースホルダ | メッセージを入力... (Shift+Enterで改行) | プレースホルダ | |
| 286 | ChatPage.tsx | 追加ロード中 | 読み込み中... | ラベル | 追加メッセージ読み込み |
| 287 | ChatPage.tsx | 送信エラー | 送信できなかった。もう一度試してみて。 | エラー | |
| 288 | ChatPage.tsx | 通報失敗 | 通報に失敗しました。 | エラー | |

### LikesReceivedPage.tsx / FootprintsPage.tsx（いいね・足跡）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 289 | LikesReceivedPage.tsx | ページ見出し | あなたへのいいね | 見出し | |
| 290 | LikesReceivedPage.tsx / FootprintsPage.tsx | ナビ | 通知に戻る | ラベル | |
| 291 | LikesReceivedPage.tsx | 空状態 | まだいいねがない。いいねを送ってみよう。 | 空状態 | |
| 292 | LikesReceivedPage.tsx | いいね返しボタン | ♥ 済み / ♥ 返す | ボタン | ♥は文字（絵文字ではなくUnicode） |
| 293 | LikesReceivedPage.tsx / SafetyListPage.tsx | デフォルト値 | （未設定） / （名前未設定） | ラベル | 名前なしユーザーのフォールバック |
| 294 | FootprintsPage.tsx | ページ見出し | あなたを見た人 | 見出し | |
| 295 | FootprintsPage.tsx | 全既読ボタン | 全員既読にする | ボタン | |
| 296 | FootprintsPage.tsx | 空状態 | まだ誰も見ていない。 | 空状態 | |
| 297 | FootprintsPage.tsx | 時刻表示（動的） | たった今 / {n}分前 / {n}時間前 / {n}日前 | ラベル | **動的** |
| 298 | FootprintsPage.tsx | aria-label | いいね | aria | いいねボタンのtitle属性 |

### NotificationsPage.tsx（通知）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 299 | NotificationsPage.tsx | ページ見出し | 通知 | 見出し | |
| 300 | NotificationsPage.tsx | ロック見出し（却下） | 学生証の再提出が必要です | 見出し | → #113 と同一 |
| 301 | NotificationsPage.tsx | ロック説明（却下） | 再申請して承認されると、通知機能が使えるようになります。 | 説明文 | |
| 302 | NotificationsPage.tsx | ロックボタン（却下） | 再申請する → | ボタン | → #115 と同一 |
| 303 | NotificationsPage.tsx | ロック見出し（審査中） | 通知は認証完了後に利用できます | 見出し | |
| 304 | NotificationsPage.tsx | ロック説明（審査中） | 学生証の審査が完了すると、通知機能が使えるようになります。 | 説明文 | |
| 305 | NotificationsPage.tsx / PendingPage.tsx | ロックボタン | ホームに戻る | ボタン | → #116 と同一（追加箇所） |
| 306 | NotificationsPage.tsx | 運営通知ラベル | 運営からのお知らせ / 運営からの警告 | ラベル | |
| 307 | NotificationsPage.tsx | 通知内容（動的） | {n.message_preview} | 通知 | **動的** - 警告メッセージ本文 |
| 308 | NotificationsPage.tsx | セクション見出し | あなたを見た人 / プロフィールを閲覧した人 | ラベル | |
| 309 | NotificationsPage.tsx | セクション見出し | あなたへのいいね / いいねを返してマッチしよう | ラベル | |
| 310 | NotificationsPage.tsx | セクション見出し | 新しいマッチ / マッチした相手とチャット | ラベル | |

### ContactPage.tsx（お問い合わせ）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 311 | ContactPage.tsx | ページ見出し | お問い合わせ | 見出し | |
| 312 | ContactPage.tsx | ナビ | 戻る | ラベル | |
| 313 | ContactPage.tsx | ページ説明 | バグ報告・要望・相談はここから。1時間に5件まで送れる。 | 説明文 | |
| 314 | ContactPage.tsx | カテゴリ | バグ報告 / 動作不良・表示崩れ | ラベル | |
| 315 | ContactPage.tsx | カテゴリ | 機能要望 / こうなったら嬉しい、を教えて | ラベル | |
| 316 | ContactPage.tsx | カテゴリ | アカウント相談 / ログイン・退会・審査について | ラベル | |
| 317 | ContactPage.tsx | カテゴリ | 通報について / 通報した件のフォローアップ | ラベル | |
| 318 | ContactPage.tsx | カテゴリ | その他 / 上のどれにも当てはまらない | ラベル | |
| 319 | ContactPage.tsx | 問い合わせステータス | 未読 / 確認中 / 返信あり / 対応終了 | ラベル | |
| 320 | ContactPage.tsx | フォームラベル | カテゴリ | ラベル | |
| 321 | ContactPage.tsx | フォームラベル | 件名 | ラベル | |
| 322 | ContactPage.tsx | フォームラベル | 本文 | ラベル | |
| 323 | ContactPage.tsx | プレースホルダ | 例: マッチ画面で写真が表示されない | プレースホルダ | 件名 |
| 324 | ContactPage.tsx | プレースホルダ | どんな状況で何が起きたか、できるだけ詳しく書いてください。 | プレースホルダ | 本文 |
| 325 | ContactPage.tsx | 送信ボタン | 送信中... / 送信する | ボタン | ローディング→通常 |
| 326 | ContactPage.tsx | 過去履歴見出し | これまでの問い合わせ | ラベル | |
| 327 | ContactPage.tsx | 空状態 | まだ問い合わせはありません。 | 空状態 | |
| 328 | ContactPage.tsx | 返信ラベル | 運営からの返信 | ラベル | |
| 329 | ContactPage.tsx | 送信成功トースト | 送信しました | トースト | |
| 330 | ContactPage.tsx | レートリミットトースト | もう少し時間をおいて試してみて。 | トースト | |

### PendingPage.tsx / RejectedPage.tsx（審査待ち・却下）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 331 | PendingPage.tsx | ページ見出し | 確認中。 | 見出し | |
| 332 | PendingPage.tsx | バッジ（英語） | PENDING REVIEW | ラベル | |
| 333 | PendingPage.tsx | 説明カード | 審査の間も、気になる人を探したり、いいねを送ったり、マッチできるよ。チャットは承認後に解放される。 | 説明文 | |
| 334 | PendingPage.tsx | 提出日時（動的） | 提出日時 | ラベル | 動的値は日付フォーマット |
| 335 | PendingPage.tsx | 説明 | 結果はアプリ内のステータスで確認できるよ。待っててね。 | 説明文 | |
| 336 | PendingPage.tsx | ステップ1 | 本人確認情報・学生証提出 / 完了 | ラベル | |
| 337 | PendingPage.tsx | ステップ2 | 審査中 / アプリ内のステータスで確認できるよ | ラベル | |
| 338 | PendingPage.tsx | ステップ3 | チャット解放 / 承認後に使えるようになる | ラベル | |
| 339 | PendingPage.tsx | ボタン | ホームに戻る → | ボタン | |
| 340 | RejectedPage.tsx | ページ見出し | ごめん、今回は難しかった。 | 見出し | |
| 341 | RejectedPage.tsx | バッジ（英語） | APPLICATION REJECTED | ラベル | |
| 342 | RejectedPage.tsx | 却下理由ラベル | 却下理由 | ラベル | |
| 343 | RejectedPage.tsx | 却下理由（動的） | {rejectionReason} / 詳細は運営から連絡する。 | 説明文 | **動的** - 理由未設定時はフォールバック文言 |
| 344 | RejectedPage.tsx | 考えられる理由ラベル | 考えられる理由 | ラベル | |
| 345 | RejectedPage.tsx | 考えられる理由 | 学生証の画像が鮮明でなかった | ラベル | |
| 346 | RejectedPage.tsx | 考えられる理由 | 学生証の有効期限が切れている | ラベル | |
| 347 | RejectedPage.tsx | 考えられる理由 | 対象大学の学生証ではない | ラベル | |
| 348 | RejectedPage.tsx | 再申請説明 | 再申請のときは、顔と学生証が両方はっきり写った写真を提出して。 | 説明文 | |
| 349 | RejectedPage.tsx | 再申請ボタン | もう一度だけ、試してみる | ボタン | |
| 350 | RejectedPage.tsx | サポートリンク | ご不明な点はお問い合わせください | ラベル | |
| 351 | RejectedPage.tsx | ボタン | ← ホームに戻る | ボタン | |

### SafetyListPage.tsx（ブロック・非表示）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 352 | SafetyListPage.tsx | ページ見出し | ブロック・非表示 | 見出し | |
| 353 | SafetyListPage.tsx | タブ | ブロック | ラベル | |
| 354 | SafetyListPage.tsx | タブ | 非表示 | ラベル | |
| 355 | SafetyListPage.tsx | 空状態 | ブロックしてる人はいない。 | 空状態 | |
| 356 | SafetyListPage.tsx | 注意書き | ※ ブロックは取り消せません。 | 説明文 | |
| 357 | SafetyListPage.tsx | ステータス | ブロック中 | ラベル | |
| 358 | SafetyListPage.tsx | 空状態 | 非表示にしてる人はいない。 | 空状態 | |
| 359 | SafetyListPage.tsx | 解除ボタン | 解除 | ボタン | 非表示解除 |
| 360 | SafetyListPage.tsx | 解除成功トースト（動的） | {name}の非表示を解除しました | トースト | **動的** |

### ProfileDetailPage.tsx（プロフィール詳細）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 361 | ProfileDetailPage.tsx | aria-label | 戻る | aria | 戻るボタン |
| 362 | ProfileDetailPage.tsx | aria-label | 前の写真 / 次の写真 | aria | 写真ナビ |
| 363 | ProfileDetailPage.tsx | aria-label（動的） | {n}枚目 | aria | **動的** - 写真インジケーター |
| 364 | ProfileDetailPage.tsx | 写真なし | 写真はまだない。 | 空状態 | |
| 365 | ProfileDetailPage.tsx | 情報ラベル | 登録日 | ラベル | |
| 366 | ProfileDetailPage.tsx | 自己表示 | （自分のプロフィールです） | ラベル | 自分のプロフ閲覧時 |
| 367 | ProfileDetailPage.tsx | いいねボタン | いいね済み / いいね | ボタン | |
| 368 | ProfileDetailPage.tsx | エラー見出し | ユーザーが見つかりません | エラー | 404 |
| 369 | ProfileDetailPage.tsx | エラーナビ | ← 一覧に戻る | ラベル | |
| 370 | ProfileDetailPage.tsx | エラー本文（動的） | {error} / 予期しないエラーが発生しました | エラー | **動的** |

### SetupRequiredPage.tsx（本人確認セットアップ STEP 2〜5）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 371 | SetupRequiredPage.tsx | STEP 2 見出し | 本名と生年月日を教えて。 | 見出し | |
| 372 | SetupRequiredPage.tsx | STEP 2 ラベル | 本名 | ラベル | 必須 |
| 373 | SetupRequiredPage.tsx | STEP 2 プレースホルダ | 本名を入力して | プレースホルダ | |
| 374 | SetupRequiredPage.tsx | STEP 2 説明 | 審査のみに使用。他のユーザーには表示されません。 | 説明文 | |
| 375 | SetupRequiredPage.tsx | STEP 2/3 注意（複数箇所） | ※ 承認後は変更できません。 | 説明文 | 本名・生年月日・学籍番号・学部学科の各フィールドに付く |
| 376 | SetupRequiredPage.tsx | STEP 2 ラベル | 生年月日 | ラベル | 必須 |
| 377 | SetupRequiredPage.tsx | STEP 3 見出し | 学籍情報を入力して。 | 見出し | |
| 378 | SetupRequiredPage.tsx | STEP 3 ラベル | 学籍番号 | ラベル | 必須 |
| 379 | SetupRequiredPage.tsx | STEP 3 プレースホルダ | 例：B12345678 | プレースホルダ | |
| 380 | SetupRequiredPage.tsx | STEP 3 説明 | 他のユーザーには表示されません。 | 説明文 | |
| 381 | SetupRequiredPage.tsx | STEP 3 説明 | ※ 学年は後から変更できます。 | 説明文 | |
| 382 | SetupRequiredPage.tsx | STEP 3 説明 | ほかのユーザーに見えないように設定できます（設定画面から変更可能）。 | 説明文 | 学部学科フィールド |
| 383 | SetupRequiredPage.tsx | STEP 4 見出し | 学生証を撮影してアップロードして。 | 見出し | |
| 384 | SetupRequiredPage.tsx | STEP 4 説明 | 顔と学生証が両方写るように撮影してください | 説明文 | |
| 385 | SetupRequiredPage.tsx | STEP 4 ボタン | タップして選択 | ボタン | ファイル選択 |
| 386 | SetupRequiredPage.tsx | STEP 4 説明 | JPG / PNG・5MB以下 | 説明文 | |
| 387 | SetupRequiredPage.tsx | STEP 4 エラー | 学生証画像を選択してください | エラー | |
| 388 | SetupRequiredPage.tsx | STEP 4 注意 | 顔と学生証が両方写っている写真が必要です。学生証の文字が読めるよう鮮明に撮影してください。 | 説明文 | |
| 389 | SetupRequiredPage.tsx | STEP 5 見出し（通常） | 内容を確認して。 | 見出し | |
| 390 | SetupRequiredPage.tsx | STEP 5 見出し（再申請） | 再申請 | 見出し | 再申請フロー |
| 391 | SetupRequiredPage.tsx | STEP 5 バナー（再申請） | 審査が却下されました | 見出し | 却下理由バナー |
| 392 | SetupRequiredPage.tsx | STEP 5 確認ラベル | 登録済み情報 / 入力内容 | ラベル | 再申請/通常で切替 |
| 393 | SetupRequiredPage.tsx | STEP 5 確認値 | 男性 / 女性 | ラベル | 性別確認欄 |
| 394 | SetupRequiredPage.tsx | STEP 5 確認値 | 男性が好き / 女性が好き | ラベル | 恋愛対象確認欄 |
| 395 | SetupRequiredPage.tsx | STEP 5 修正ボタン | 性別を修正 / 本名・生年月日を修正 / 学籍番号・学年・学部学科を修正 | ボタン | 各ステップへ戻る |
| 396 | SetupRequiredPage.tsx | STEP 5 注意 | 入力した情報は学生証と照合して確認します。承認後、本名・学籍番号・生年月日・学部学科は変更できません。 | 説明文 | |
| 397 | SetupRequiredPage.tsx | STEP 5 送信ボタン | 送ってます... / 確認のため提出する / 確認のため再提出する | ボタン | ローディング/通常/再申請 |
| 398 | SetupRequiredPage.tsx（複数ステップ） | ナビ | 次へ → / ← 戻る | ボタン | |

### SetupOptionalPage.tsx（プロフィール任意設定）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 399 | SetupOptionalPage.tsx | プログレス（動的） | STEP {step} / 4 | ラベル | **動的** |
| 400 | SetupOptionalPage.tsx | サブタイトル | プロフィールを充実させよう。 | 見出し | |
| 401 | SetupOptionalPage.tsx | サブタイトル | あとで設定することもできるよ。 | 説明文 | |
| 402 | SetupOptionalPage.tsx | STEP 1 見出し | まずは顔を見せて。 | 見出し | |
| 403 | SetupOptionalPage.tsx | STEP 1 写真ボタン | 写真を変える / + 写真を追加 | ボタン | 写真あり/なし |
| 404 | SetupOptionalPage.tsx | STEP 1 説明 | 設定するとマッチ率が大幅に上がる | 説明文 | |
| 405 | SetupOptionalPage.tsx | STEP 1 ラベル | 表示名 | ラベル | |
| 406 | SetupOptionalPage.tsx | STEP 1 説明 | みんなに表示される名前 / 他のユーザーに表示される名前です | 説明文 | |
| 407 | SetupOptionalPage.tsx | STEP 2 見出し | 自己紹介を書いてみよう。 | 見出し | |
| 408 | SetupOptionalPage.tsx | STEP 2 説明 | あとで変更できるよ。スキップしてもOK。 | 説明文 | |
| 409 | SetupOptionalPage.tsx | STEP 2 プレースホルダ | あなたのこと、もっと知りたい。 | プレースホルダ | 自己紹介テキストエリア |
| 410 | SetupOptionalPage.tsx | STEP 3 見出し | 好きなこと、教えて。 | 見出し | |
| 411 | SetupOptionalPage.tsx | STEP 3 ラベル | 今日の一言 | ラベル | |
| 412 | SetupOptionalPage.tsx | STEP 3 プレースホルダ | 今日の気分を一言で | プレースホルダ | |
| 413 | SetupOptionalPage.tsx | STEP 4 見出し | 最後にもう少しだけ。 | 見出し | |
| 414 | SetupOptionalPage.tsx | STEP 4 ラベル | 所属サークル | ラベル | |
| 415 | SetupOptionalPage.tsx | STEP 4 ラベル | 身バレ防止設定 | ラベル | |
| 416 | SetupOptionalPage.tsx | STEP 4 説明 | 非表示にしたサークルの同メンバーには表示されなくなります | 説明文 | |
| 417 | SetupOptionalPage.tsx | ナビ | スキップ | ボタン | |
| 418 | SetupOptionalPage.tsx | 送信ボタン | 送ってます... / 設定を保存して始める / スキップして始める | ボタン | |
| 419 | SetupOptionalPage.tsx | エラー | 表示名を入力して。 | エラー | |

### セットアップ完了系ページ

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 420 | SetupCompletePage.tsx | 見出し | さあ、始めよう。 | 見出し | |
| 421 | SetupCompletePage.tsx | 説明文 | あなたのことを待っている人が、きっといる。 | 説明文 | |
| 422 | SetupCompletePage.tsx | CTA ボタン | Cro-co を始める → | ボタン | |
| 423 | SetupCompletePage.tsx | 補足 | いつでもプロフィールは編集できます | 説明文 | |
| 424 | SetupThanksPage.tsx | バッジ | 提出完了 | ラベル | |
| 425 | SetupThanksPage.tsx | 見出し | ありがとう。 | 見出し | |
| 426 | SetupThanksPage.tsx | 説明文 | 本人確認の申請を受け付けました。審査は通常1〜2営業日以内に完了します。承認されたらメールでお知らせします。 | 説明文 | |
| 427 | SetupThanksPage.tsx | 説明文 | 審査を待つ間に、プロフィールを充実させよう。 | 説明文 | |
| 428 | SetupThanksPage.tsx | ボタン | プロフィールを入力する → | ボタン | |
| 429 | SetupInstallPage.tsx | バッジ | おすすめ | ラベル | |
| 430 | SetupInstallPage.tsx | 見出し | アプリとして追加しよう。 | 見出し | |
| 431 | SetupInstallPage.tsx | 説明文 | ホーム画面から即アクセス。通知も受け取れるようになる。 | 説明文 | |
| 432 | SetupInstallPage.tsx | 機能リスト | いいねやマッチを即通知 / アプリを閉じていても知らせる | ラベル | |
| 433 | SetupInstallPage.tsx | 機能リスト | 起動が速い / ホーム画面からワンタップで開く | ラベル | |
| 434 | SetupInstallPage.tsx | 機能リスト | 容量ほぼゼロ / ストアからのダウンロード不要 | ラベル | |
| 435 | SetupInstallPage.tsx | OSラベル | iOSの場合 / Androidの場合 | ラベル | |
| 436 | SetupInstallPage.tsx | ボタン群 | 追加した！次へ → / ホーム画面に追加する / 手順通りに追加した / 次へ進む → / あとで追加する | ボタン | 状態により切替 |
| 437 | SetupNotifyPage.tsx | 見出し | 通知をオンにしておこう。 | 見出し | |
| 438 | SetupNotifyPage.tsx | 説明文 | マッチやいいねを見逃さないために。いつでも設定から変更できる。 | 説明文 | |
| 439 | SetupNotifyPage.tsx | 通知項目 | いいねが届いたとき / マッチが成立したとき / メッセージが届いたとき | ラベル | |
| 440 | SetupNotifyPage.tsx | ボタン群 | 設定した！次へ進む... / 通知をオンにする → / 設定中... / あとで設定する | ボタン | |

### LandingPage.tsx（ランディングページ）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 441 | LandingPage.tsx | ヘッダーリンク | ログイン | ボタン | → #11 と同一 |
| 442 | LandingPage.tsx | ヒーローステッカー | 阪大学部生限定 / 同じキャンパスで / 学生証で本人確認 | ラベル | |
| 443 | LandingPage.tsx | ヒーロータイトル | はじける、青春.app | 見出し | |
| 444 | LandingPage.tsx | ヒーロー説明文 | 授業の合間も、テスト終わりの夜も。同じキャンパスの誰かと「ちょっと話そう」が始まるアプリ。 | 説明文 | |
| 445 | LandingPage.tsx | β注記 | いまβ版。たまにつまずくかも。 | 説明文 | |
| 446 | LandingPage.tsx | 年齢警告 | 18歳未満は利用できません。 | 説明文 | ヒーロー・フッター両方に出現 |
| 447 | LandingPage.tsx | CTA ボタン | いますぐ始める | ボタン | |
| 448 | LandingPage.tsx | 統計ラベル | 登録に必要な時間 / すべての基本機能 | ラベル | |
| 449 | LandingPage.tsx | HOW IT WORKS 見出し | 3ステップでちょっと話そう。 | 見出し | |
| 450 | LandingPage.tsx | HOW IT WORKS STEP 1 | 学生証で本人確認 / 数十秒で完了。安心して始められる。 | ラベル | |
| 451 | LandingPage.tsx | HOW IT WORKS STEP 2 | 気になる人を探す / 同じキャンパスの誰かを、学部や趣味で見つける。 | ラベル | |
| 452 | LandingPage.tsx | HOW IT WORKS STEP 3 | マッチしたらチャット / 重くない短時間チャットからスタート。 | ラベル | |
| 453 | LandingPage.tsx | TODAY'S CAMPUS 見出し | 今日キャンパスにいる、誰か。 | 見出し | |
| 454 | LandingPage.tsx | TRUST & SAFETY 見出し | 安心のために、妥協しない。 | 見出し | |
| 455 | LandingPage.tsx | 最終 CTA 見出し | さあ、はじめよ。 | 見出し | |
| 456 | LandingPage.tsx | 最終 CTA 説明文 | 登録は阪大メールアドレスだけ。30秒で、同じキャンパスのどこかの誰かと繋がる。 | 説明文 | |
| 457 | LandingPage.tsx | モックCTA（動的） | {name}さんにいいねされました | ラベル | **動的** - デモ表示 |
| 458 | LandingPage.tsx | フッター | © 2026 Cro-co / 阪大学部生のためのマッチング | ラベル | |
| 459 | LandingPage.tsx | フッターキャッチ | 「ちょっと話そう」が、青春のはじまり。 | 説明文 | |

### ResetPasswordPage.tsx（パスワードリセット）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 460 | ResetPasswordPage.tsx | ページ見出し | パスワードをリセット。 | 見出し | |
| 461 | ResetPasswordPage.tsx | リンク確認中 | リンクを確認中... | 説明文 | ローディング |
| 462 | ResetPasswordPage.tsx | フォームラベル | 新しいパスワード | ラベル | |
| 463 | ResetPasswordPage.tsx | フォームラベル | パスワード（確認） | ラベル | |
| 464 | ResetPasswordPage.tsx | プレースホルダ | 8文字以上 | プレースホルダ | |
| 465 | ResetPasswordPage.tsx | プレースホルダ | もう一度入力 | プレースホルダ | |
| 466 | ResetPasswordPage.tsx | エラー | パスワードが一致しない。 | エラー | |
| 467 | ResetPasswordPage.tsx | エラー | パスワードは8文字以上にして。 | エラー | |
| 468 | ResetPasswordPage.tsx | ボタン | 保存中... / パスワードを変更する | ボタン | ローディング→通常 |

### UploadStudentIdPage.tsx（※デッドコード・リダイレクト済み）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 469 | UploadStudentIdPage.tsx | ページ見出し | 学生証を確認 | 見出し | ⚠️ ページは即 /setup/required にリダイレクト。以下はデッドコード |
| 470 | UploadStudentIdPage.tsx | ページ説明 | 顔写真付きの学生証を撮影してアップロードして。申告した学部・学科・入学年度と学生証を照合して確認する。承認後は申告内容を変更できないので、正確に入力して。 | 説明文 | デッドコード |
| 471 | UploadStudentIdPage.tsx | セクション | 申告情報 | ラベル | デッドコード |
| 472 | UploadStudentIdPage.tsx | セクション説明 | 申告情報として学生証と照合します。承認後は変更できません。 | 説明文 | デッドコード |
| 473 | UploadStudentIdPage.tsx | フォームラベル | 入学年度 | ラベル | デッドコード |
| 474 | UploadStudentIdPage.tsx | 注意事項 | 顔と学生証が両方はっきり写っていること / 文字が読み取れる明るさであること / 加工・切り抜きなし | ラベル | デッドコード |
| 475 | UploadStudentIdPage.tsx | 注意事項説明 | 審査完了まで1〜2日かかる場合があります。 | 説明文 | デッドコード |
| 476 | UploadStudentIdPage.tsx | ボタン | アップロード中... / 提出する | ボタン | デッドコード |
| 477 | UploadStudentIdPage.tsx | リンク | あとでする | ボタン | デッドコード |

### コンポーネント群

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 478 | MatchModal.tsx | マッチ成立モーダル見出し | 離さないでね。 | 見出し | |
| 479 | MatchModal.tsx | ボタン | 話しかけてみる | ボタン | チャットへ遷移 |
| 480 | MatchModal.tsx | ボタン | あとで | ボタン | モーダル閉じる |
| 481 | ErrorBoundary.tsx | エラー画面 | うまく表示できなかった。 | 見出し | |
| 482 | ErrorBoundary.tsx | エラー説明 | 再読み込みすると直るかも。 | 説明文 | |
| 483 | ErrorBoundary.tsx | ボタン | 再読み込み | ボタン | |
| 484 | LoadingScreen.tsx | 全体ローディング | 探してます、ちょっと待って。 | 説明文 | → #41 と同一（コンポーネントとして切り出し） |
| 485 | NotifyNudge.tsx | 通知促進バナー見出し | 通知をオンにしませんか？ | 見出し | |
| 486 | NotifyNudge.tsx | 通知促進バナー説明 | いいねやマッチをすぐ知れる | 説明文 | |
| 487 | PWAInstallBanner.tsx | PWA バナー見出し | アプリとして追加しよう | 見出し | |
| 488 | PWAInstallBanner.tsx | PWA バナー説明 | 通知・即起動が使えるようになる | 説明文 | |
| 489 | PWAInstallBanner.tsx | ボタン | ホーム画面に追加する → | ボタン | |
| 490 | PWAInstallBanner.tsx | 手順リンク | ホーム画面に追加する方法 | ラベル | |
| 491 | PWAInstallBanner.tsx | 完了ボタン | 追加した！ | ボタン | |
| 492 | PWAUpdateBanner.tsx | アップデートバナー | 新しいバージョンがある。 | 説明文 | |

### 法的ページ（PrivacyPolicyPage / TermsOfServicePage）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| 493 | PrivacyPolicyPage.tsx | ページタイトル | プライバシーポリシー | 見出し | |
| 494 | TermsOfServicePage.tsx | ページタイトル | 利用規約 | 見出し | |
| 495 | PrivacyPolicyPage.tsx / TermsOfServicePage.tsx | 施行日 | 施行日: 2026年6月5日 | ラベル | |
| 496 | PrivacyPolicyPage.tsx / TermsOfServicePage.tsx | ナビ | 戻る | ボタン | |
| 497 | PrivacyPolicyPage.tsx / TermsOfServicePage.tsx | 本文全体 | 法文テキスト（個別列挙省略） | 説明文 | 敬語体・正式文体。個別条項は法的ドキュメントとして一括扱い |

---

## セクション 2b: 管理画面文言（追加分）

### UsersTab.tsx（ユーザー一覧）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| A1 | UsersTab.tsx | ステータスフィルタ | すべて / 承認済み / 審査待ち | ラベル | タブ |
| A2 | UsersTab.tsx | 性別フィルタ | すべての性別 | ラベル | |
| A3 | UsersTab.tsx | 検索プレースホルダ | 名前・メールで検索 | プレースホルダ | |
| A4 | UsersTab.tsx | ページネーション（動的） | {total} 件 / {page} / {totalPages} ページ | ラベル | **動的** |

### InquiriesTab.tsx（問い合わせ管理）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| A5 | InquiriesTab.tsx | ステータス | 返信済み / クローズ | ラベル | |
| A6 | InquiriesTab.tsx | フォームラベル | 返信内容（ユーザーに届く） | ラベル | |
| A7 | InquiriesTab.tsx | フォームラベル | 内部メモ（ユーザーには見えない） | ラベル | |
| A8 | InquiriesTab.tsx | 空状態 | 問い合わせなし | 空状態 | |

### LogsTab.tsx（監査ログ）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| A9 | LogsTab.tsx | アクションラベル | ユーザー詳細を閲覧 | ラベル | ACTION_LABEL.view_user_detail |
| A10 | LogsTab.tsx | アクションラベル | ユーザーをBAN | ラベル | ACTION_LABEL.ban_user |
| A11 | LogsTab.tsx | アクションラベル | BAN解除 | ラベル | ACTION_LABEL.unban_user |
| A12 | LogsTab.tsx | アクションラベル | 通報を更新 | ラベル | ACTION_LABEL.update_report |
| A13 | LogsTab.tsx | アクションラベル | 問い合わせを更新 | ラベル | ACTION_LABEL.update_inquiry_status |
| A14 | LogsTab.tsx | アクションラベル | ユーザーを承認 | ラベル | ACTION_LABEL.approve / approve_user |
| A15 | LogsTab.tsx | アクションラベル | ユーザーを却下 | ラベル | ACTION_LABEL.reject / reject_user |
| A16 | LogsTab.tsx | アクションラベル | ユーザーを停止 | ラベル | ACTION_LABEL.suspend / suspend_user |
| A17 | LogsTab.tsx | アクションラベル | 個人情報削除バッチ実行 | ラベル | ACTION_LABEL.privacy_purge |
| A18 | LogsTab.tsx | 説明 | 管理者操作の監査ログ（改ざん不可） | 説明文 | |
| A19 | LogsTab.tsx | 空状態 | ログなし | 空状態 | |

### OverviewTab.tsx / ReportsTab.tsx（概要・通報）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| A20 | OverviewTab.tsx | KPI ラベル | 総ユーザー / 本日アクティブ / 審査待ち / 承認済み / 総マッチ / 総メッセージ | ラベル | |
| A21 | OverviewTab.tsx | グラフ見出し | 登録・マッチ推移 | ラベル | |
| A22 | OverviewTab.tsx | グラフ見出し | 学部別（承認済み・上位8件） | ラベル | |
| A23 | OverviewTab.tsx | グラフデータキー | マッチ | ラベル | Recharts dataKey |
| A24 | ReportsTab.tsx | ステータス | 対応済み / 対応なし / 一時停止 | ラベル | |
| A25 | ReportsTab.tsx | 空状態 | 通報なし / 該当する通報なし | 空状態 | |
| A26 | ReportsTab.tsx | アクションボタン | 警告して解決 / 停止して解決 | ボタン | |
| A27 | ReportsTab.tsx | 確認ダイアログ | このユーザーを停止しますか？ | 説明文 | window.confirm |

### BanDialog.tsx（BANダイアログ）

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| A28 | BanDialog.tsx | ダイアログタイトル | ユーザーをBAN / BAN解除 | 見出し | mode で切替 |
| A29 | BanDialog.tsx | BAN理由 | 通報による違反行為（複数回） | ラベル | BAN_REASONS[0] |
| A30 | BanDialog.tsx | BAN理由 | 不適切なメッセージ送信 | ラベル | BAN_REASONS[1] |
| A31 | BanDialog.tsx | BAN理由 | 虚偽プロフィール | ラベル | BAN_REASONS[2] |
| A32 | BanDialog.tsx | BAN理由 | 営業・スパム行為 | ラベル | BAN_REASONS[3] |
| A33 | BanDialog.tsx | BAN理由 | 規約違反 | ラベル | BAN_REASONS[4] |
| A34 | BanDialog.tsx | BAN理由 | その他 | ラベル | BAN_REASONS[5] - 自由入力 |
| A35 | BanDialog.tsx | バリデーションエラー | 理由を入力してください | エラー | |
| A36 | BanDialog.tsx | 自由入力プレースホルダ | 理由を入力 | プレースホルダ | |
| A37 | BanDialog.tsx | 解除メモラベル | 解除メモ（任意） | ラベル | BAN解除モードのみ |
| A38 | BanDialog.tsx | 解除メモプレースホルダ | 解除理由・経緯など | プレースホルダ | |
| A39 | BanDialog.tsx | 送信ボタン | 処理中... / BANする / BAN解除する | ボタン | |

### UserDetailDialog.tsx / StatusBadge.tsx / AdminTabBar.tsx / PendingTab.tsx

| # | 場所 | 画面・文脈 | 現在の文言 | 種別 | 備考 |
|---|---|---|---|---|---|
| A40 | UserDetailDialog.tsx | ダイアログタイトル | ユーザー詳細 | 見出し | |
| A41 | UserDetailDialog.tsx | 認証済みバッジ | 本人確認済み | ラベル | |
| A42 | UserDetailDialog.tsx | 統計ラベル | マッチ / いいね送 / いいね受 | ラベル | |
| A43 | UserDetailDialog.tsx | 個人情報削除済み | 個人情報削除済み | ラベル | |
| A44 | UserDetailDialog.tsx | 最終ログイン（動的） | 最終ログイン: {date} | ラベル | **動的** |
| A45 | UserDetailDialog.tsx | エラー | ユーザー情報の取得に失敗しました | エラー | |
| A46 | StatusBadge.tsx | ステータスバッジ | 審査待ち / 承認済み | ラベル | |
| A47 | AdminTabBar.tsx | タブ | ユーザー / 問い合わせ / ログ | ラベル | 他タブは英語（Overview/Pending/Photo/Reports） |
| A48 | PendingTab.tsx | 学生証却下理由（選択肢） | 学生証の画像が鮮明でない / 学生証の有効期限が切れている / 対象大学・学部でない / 顔と学生証が一致しない / その他 | ラベル | 管理者が選ぶ却下理由 |
| A49 | PendingTab.tsx | エラー | 管理者権限がありません | エラー | |
| A50 | PendingTab.tsx | エラー | データの取得に失敗しました | エラー | |

---

## 分析・統計（更新版）

### ユーザー向け文言統計（全体）

- **総件数**: 497件（#1〜#497・重複行含む）
  - カジュアル/ため口系: ~120件（「〜だよ」「〜して」「〜てね」系）
  - 敬語系: ~80件（法文・注意書き・旧来フォーム）
  - 中立系（ラベル・ボタン・ari等）: ~297件
  - **動的文言**: ~30件（**動的** タグ付き）

### 管理画面文言統計（全体）

- **総件数**: 54件（#165〜#168 + A1〜A50）
  - ダッシュボード基本: 4件
  - UsersTab: 4件、InquiriesTab: 4件、LogsTab: 11件
  - OverviewTab/ReportsTab: 8件、BanDialog: 12件
  - UserDetailDialog/StatusBadge/AdminTabBar/PendingTab: 11件

### 注目すべき変更候補

1. **「うまくいかなかった。もう一度試してみて。」** が 10箇所以上に分散（#39起点）- 共通トーストコンポーネントに集約を推奨
2. **「ログアウト」** が SettingsPage・PendingPage・RejectedPage・HomePage (#48) に計4箇所
3. **「読み込み中...」** が §5 ファイル (S1/S2/S7) とChatPage (#286) に分散
4. **法的ページ (PP・ToS)** の本文は敬語体。他ページとトーンが異なる
5. **UploadStudentIdPage.tsx** 内のテキスト全てがデッドコード（リダイレクトにより到達不能）

**レポート作成**: 2026-06-06
