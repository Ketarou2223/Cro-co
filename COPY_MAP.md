# COPY_MAP.md

> **これは一時棚卸しファイルです。** 作業完了後に削除予定。CLAUDE.md §3 確定構成ルールの例外（オーナー承認済み）。

## 概要

- 生成日時: 2026-06-21 17:09
- 総 @copy 件数: 580
- 対象ファイル数: 150（うち @copy あり: 44 ファイル）
- 対象: `frontend/src/**/*.{ts,tsx}` + `backend/app/**/*.py` + `frontend/public/push-handler.js`
- 文言空欄数: 0（スクリプトが取れなかったもの）

---

| ファイル | 行 | @copyタグ | 実際の文言 |
|---|---|---|---|
| `backend/app/core/email.py` | 53 | CRO-email-match-subject-01 Lv1 | マッチしました！ |
| `backend/app/core/email.py` | 58 | CRO-email-match-body-01 Lv1 | <p>{safe_name}さんとマッチしました！</p> |
| `backend/app/core/email.py` | 60 | CRO-email-match-body-02 Lv1 | <p>ぜひメッセージを送ってみてください。</p> |
| `backend/app/core/email.py` | 62 | CRO-email-match-cta-01 Lv1 | Cro-coを開く |
| `backend/app/core/email.py` | 89 | CRO-email-message-subject-01 Lv1 | 新しいメッセージが届いています |
| `backend/app/core/email.py` | 92 | CRO-email-message-body-01 Lv1 | <p>{safe_sender}さんからメッセージが届きました。</p> |
| `backend/app/core/email.py` | 94 | CRO-email-message-cta-01 Lv1 | Cro-coを開く |
| `backend/app/routers/like.py` | 61 | CRO-push-like-title-01 Lv1 | いいねが届いた【いいねが届きました】 |
| `backend/app/routers/like.py` | 61 | CRO-push-like-body-01 Lv1 | {liker_name}さんからいいねが届きました |
| `backend/app/routers/like.py` | 77 | CRO-push-match-title-01 Lv1 | マッチした！【マッチしました！】 |
| `backend/app/routers/like.py` | 77 | CRO-push-match-body-01 Lv1 | {liker_name}さんとマッチしました。メッセージを送ってみてください。 |
| `backend/app/routers/like.py` | 268 | CRO-error-api-like-stock-01 Lv1 | いいねが足りません。翌日ログインで補充されます。 |
| `backend/app/routers/like.py` | 552 | CRO-error-api-like-approval-01 Lv1 | 承認済みのアカウントが必要です |
| `backend/app/routers/message.py` | 63 | CRO-push-message-title-01 Lv1 | メッセージが届いた【メッセージが届きました！】 |
| `backend/app/routers/message.py` | 63 | CRO-push-message-body-01 Lv1 | {sender_name}: {preview} |
| `frontend/public/push-handler.js` | 7 | CRO-push-sw-default-title-01 Lv0 | Cro-co |
| `frontend/public/push-handler.js` | 9 | CRO-push-sw-default-body-01 Lv1 | 新しい通知があります |
| `frontend/src/components/ClubSelector.tsx` | 21 | CRO-placeholder-club-selector-01 Lv1 | サークルを検索...（最大${maxCount}個） |
| `frontend/src/components/ClubSelector.tsx` | 90 | CRO-label-club-selector-01 Lv1 | ))} |
| `frontend/src/components/ClubSelector.tsx` | 101 | CRO-label-club-selector-02 Lv1 | )} |
| `frontend/src/components/ColorfulCard.tsx` | 52 | CRO-label-card-01 Lv1 | ${user.year}年 |
| `frontend/src/components/ColorfulCard.tsx` | 71 | CRO-label-card-02 Lv1 | ユーザー |
| `frontend/src/components/ColorfulCard.tsx` | 112 | CRO-label-card-03 Lv1 | 共通 {scoreBadge}個 |
| `frontend/src/components/ColorfulCard.tsx` | 120 | CRO-label-card-04 Lv1 | （未設定） |
| `frontend/src/components/ErrorBoundary.tsx` | 44 | CRO-error-boundary-01 Lv0 | うまく表示できませんでした。 |
| `frontend/src/components/ErrorBoundary.tsx` | 48 | CRO-error-boundary-02 Lv0 | 再読み込みすると直るかもしれません。 |
| `frontend/src/components/ErrorBoundary.tsx` | 56 | CRO-button-boundary-01 Lv0 | 再読み込み |
| `frontend/src/components/ErrorState.tsx` | 23 | CRO-button-error-state-01 Lv1 | 再試行 |
| `frontend/src/components/FacultySelector.tsx` | 36 | CRO-label-faculty-selector-01 Lv1 | 学部 |
| `frontend/src/components/FacultySelector.tsx` | 40 | CRO-label-faculty-selector-02 Lv0 | 承認済み |
| `frontend/src/components/FacultySelector.tsx` | 51 | CRO-placeholder-faculty-selector-01 Lv1 | 選択してください |
| `frontend/src/components/FacultySelector.tsx` | 62 | CRO-label-faculty-selector-03 Lv1 | 学科 |
| `frontend/src/components/FacultySelector.tsx` | 70 | CRO-placeholder-faculty-selector-02 Lv1 | 選択してください |
| `frontend/src/components/Layout.tsx` | 33 | CRO-label-layout-01 Lv1 | ホーム |
| `frontend/src/components/Layout.tsx` | 35 | CRO-label-layout-02 Lv1 | さがす |
| `frontend/src/components/Layout.tsx` | 37 | CRO-label-layout-03 Lv1 | マッチ |
| `frontend/src/components/Layout.tsx` | 39 | CRO-label-layout-04 Lv1 | 通知 |
| `frontend/src/components/Layout.tsx` | 41 | CRO-label-layout-05 Lv1 | 設定 |
| `frontend/src/components/Layout.tsx` | 109 | CRO-push-layout-01 Lv1 | Cro-co / 新しいメッセージが届いています |
| `frontend/src/components/Layout.tsx` | 179 | CRO-banner-layout-01 Lv0 | 現在審査中です。順番に確認していますので、もうしばらくお待ちください。 |
| `frontend/src/components/Layout.tsx` | 191 | CRO-banner-layout-02 Lv0 | 審査の結果、承認されませんでした。 |
| `frontend/src/components/Layout.tsx` | 199 | CRO-button-layout-01 Lv0 | 再申請する |
| `frontend/src/components/LoadingScreen.tsx` | 8 | CRO-banner-loading-01 Lv1 | 読み込んでいます。少しお待ちください。 |
| `frontend/src/components/MarqueeBar.tsx` | 10 | CRO-label-marquee-01 Lv2 | 同じ大学だから近い |
| `frontend/src/components/MarqueeBar.tsx` | 13 | CRO-label-marquee-02 Lv2 | まず会ってみよう |
| `frontend/src/components/MarqueeBar.tsx` | 15 | CRO-label-marquee-03 Lv1 | 身元確認済み |
| `frontend/src/components/MarqueeBar.tsx` | 18 | CRO-label-marquee-04 Lv2 | 普通の日常をカラフルに |
| `frontend/src/components/MarqueeBar.tsx` | 21 | CRO-label-marquee-05 Lv2 | 気になる人、いるかも |
| `frontend/src/components/MatchModal.tsx` | 34 | CRO-banner-match-modal-01 Lv2 | マッチしました！さっそく話しかけてみましょう。 |
| `frontend/src/components/MatchModal.tsx` | 36 | CRO-banner-match-modal-02 Lv2 | マッチが成立しました。最初のひとことを送ってみませんか。 |
| `frontend/src/components/MatchModal.tsx` | 38 | CRO-banner-match-modal-03 Lv2 | マッチしました！どんな会話になるか楽しみですね。 |
| `frontend/src/components/MatchModal.tsx` | 133 | CRO-label-match-modal-01 Lv1 | 自分 |
| `frontend/src/components/MatchModal.tsx` | 152 | CRO-label-match-modal-02 Lv1 | 相手 |
| `frontend/src/components/MatchModal.tsx` | 168 | CRO-button-match-modal-01 Lv2 | 話しかけてみる |
| `frontend/src/components/MatchModal.tsx` | 176 | CRO-button-match-modal-02 Lv1 | あとで |
| `frontend/src/components/NotifyNudge.tsx` | 48 | CRO-banner-notify-nudge-01 Lv1 | 通知をオンにしませんか？ |
| `frontend/src/components/NotifyNudge.tsx` | 50 | CRO-banner-notify-nudge-02 Lv1 | いいねやマッチをすぐ知れる【いいねやマッチをすぐ知ることができます】 |
| `frontend/src/components/PWAInstallBanner.tsx` | 64 | CRO-onboarding-pwa-install-01 Lv1 | 下の共有ボタン（四角に矢印）をタップ |
| `frontend/src/components/PWAInstallBanner.tsx` | 66 | CRO-onboarding-pwa-install-02 Lv1 | 「ホーム画面に追加」を選択 |
| `frontend/src/components/PWAInstallBanner.tsx` | 68 | CRO-onboarding-pwa-install-03 Lv1 | 右上の「追加」をタップ |
| `frontend/src/components/PWAInstallBanner.tsx` | 73 | CRO-onboarding-pwa-install-04 Lv1 | Chrome 右上の「⋮」メニューをタップ |
| `frontend/src/components/PWAInstallBanner.tsx` | 75 | CRO-onboarding-pwa-install-05 Lv1 | 「アプリをインストール」または「ホーム画面に追加」を選択 |【疑問：この文言は、ダウンロードボタンを設置した今、いらないよね？】
| `frontend/src/components/PWAInstallBanner.tsx` | 77 | CRO-onboarding-pwa-install-06 Lv1 | 「インストール」をタップ |
| `frontend/src/components/PWAInstallBanner.tsx` | 96 | CRO-banner-pwa-install-01 Lv1 | アプリとして追加しましょう |
| `frontend/src/components/PWAInstallBanner.tsx` | 98 | CRO-banner-pwa-install-02 Lv1 | 通知・即起動が使えるようになります |
| `frontend/src/components/PWAInstallBanner.tsx` | 115 | CRO-button-pwa-install-01 Lv1 | ホーム画面に追加する → |
| `frontend/src/components/PWAInstallBanner.tsx` | 128 | CRO-heading-pwa-install-01 Lv1 | ホーム画面に追加する方法 |
| `frontend/src/components/PWAInstallBanner.tsx` | 154 | CRO-button-pwa-install-02 Lv1 | 追加した！ |
| `frontend/src/components/PWAUpdateBanner.tsx` | 17 | CRO-banner-pwa-update-01 Lv1 | 新しいバージョンがあります。 |
| `frontend/src/lib/validation.ts` | 14 | CRO-error-validation-01 Lv0 | @ecs.osaka-u.ac.jp の大阪大学メールアドレスのみご利用いただけます |
| `frontend/src/pages/AuthConfirmedPage.tsx` | 30 | CRO-banner-auth-confirmed-01 Lv0 | 読み込んでいます。少しお待ちください。 |
| `frontend/src/pages/AuthConfirmedPage.tsx` | 46 | CRO-heading-auth-confirmed-01 Lv0 | このリンクは使用済みか、期限切れです |
| `frontend/src/pages/AuthConfirmedPage.tsx` | 48 | CRO-error-auth-confirmed-01 Lv0 | すでに認証が完了している可能性があります。まずはログインをお試しください。ログインできない場合は、新規登録からやり直して確認メールを受け取り直してください。 |
| `frontend/src/pages/AuthConfirmedPage.tsx` | 54 | CRO-button-auth-confirmed-01 Lv0 | ログインページへ |
| `frontend/src/pages/AuthConfirmedPage.tsx` | 75 | CRO-heading-auth-confirmed-02 Lv0 | メールアドレスを確認しました |
| `frontend/src/pages/AuthConfirmedPage.tsx` | 77 | CRO-onboarding-auth-confirmed-01 Lv1 | このまま登録を続けましょう。 |
| `frontend/src/pages/AuthConfirmedPage.tsx` | 83 | CRO-button-auth-confirmed-02 Lv1 | 登録をつづける → |
| `frontend/src/pages/AuthConfirmedPage.tsx` | 103 | CRO-heading-auth-confirmed-03 Lv0 | メールアドレスの確認は完了しています |
| `frontend/src/pages/AuthConfirmedPage.tsx` | 105 | CRO-onboarding-auth-confirmed-02 Lv0 | ログインして登録の続きにお進みください。 |
| `frontend/src/pages/AuthConfirmedPage.tsx` | 111 | CRO-button-auth-confirmed-03 Lv0 | ログインページへ |
| `frontend/src/pages/BrowsePage.tsx` | 213 | CRO-empty-browse-01〜03 Lv1 | 今はおすすめできる人がいないようです。 / 今日はご紹介できる人がいませんでした。 / いまはお相手が見つかりませんでした。 |
| `frontend/src/pages/BrowsePage.tsx` | 297 | CRO-label-browse-loading-01 Lv1 | 読み込んでいます。少しお待ちください。 |
| `frontend/src/pages/BrowsePage.tsx` | 392 | CRO-toast-browse-01〜03 Lv1 | 今日のいいねは使い切りました。また明日、補充されます。 / 今日のいいねはおしまいです。明日また増えるので楽しみにしていてください。 / 今日のいいねを使い切りました。続きはまた明日になりますね。 |
| `frontend/src/pages/BrowsePage.tsx` | 404 | CRO-toast-browse-04〜06 Lv1 — 保留: 「待ってみましょう」は「〜しよう」禁止類似・オーナー確認待ち | ${_likedName}さんにいいねを送りました。届くといいですね。 / ${_likedName}さんにいいねを送りました。よいお返事があるといいですね。 / ${_likedName}さんにいいねを送りました。あとはのんびり待ってみましょう。 |
| `frontend/src/pages/BrowsePage.tsx` | 450 | CRO-heading-browse-profile-incomplete-01 Lv1 | プロフィールを完成させると、おすすめが届きます。 |
| `frontend/src/pages/BrowsePage.tsx` | 452 | CRO-label-browse-profile-incomplete-01 Lv0 | 表示名・アイコン・自己紹介を設定してください。 |
| `frontend/src/pages/BrowsePage.tsx` | 455 | CRO-button-browse-01 Lv1 | プロフィールを設定する |
| `frontend/src/pages/BrowsePage.tsx` | 474 | CRO-heading-browse-locked-01 Lv0 — 保留: 「利用できます」は禁止「〜できます」・オーナー確認待ち | ? '学生証の再提出が必要です' |
| `frontend/src/pages/BrowsePage.tsx` | 480 | CRO-onboarding-browse-locked-01 Lv0 | ? '再申請して承認されると、みんなのプロフィールを見られるようになります。' |
| `frontend/src/pages/BrowsePage.tsx` | 492 | CRO-button-browse-02 Lv0 | 再申請する → |
| `frontend/src/pages/BrowsePage.tsx` | 501 | CRO-button-browse-03 Lv1 | ホームに戻る |
| `frontend/src/pages/BrowsePage.tsx` | 537 | CRO-heading-browse-01 Lv1 | 今日キャンパスに<br />いる、誰か。 |
| `frontend/src/pages/BrowsePage.tsx` | 581 | CRO-placeholder-browse-01 Lv1 | 自己紹介から探す |
| `frontend/src/pages/BrowsePage.tsx` | 590 | CRO-label-browse-aria-01 Lv1 | 詳細検索 |
| `frontend/src/pages/BrowsePage.tsx` | 596 | CRO-button-browse-04 Lv1 | 詳細 |
| `frontend/src/pages/BrowsePage.tsx` | 649 | CRO-button-browse-05 Lv1 | 全て解除 |
| `frontend/src/pages/BrowsePage.tsx` | 664 | CRO-label-browse-filter-01 Lv1 | 学年 |
| `frontend/src/pages/BrowsePage.tsx` | 692 | CRO-label-browse-filter-02 Lv1 | 文理 |
| `frontend/src/pages/BrowsePage.tsx` | 711 | CRO-label-browse-filter-03 Lv1 | 出身地 |
| `frontend/src/pages/BrowsePage.tsx` | 714 | CRO-empty-browse-hometown-01 Lv1 | まだ登録された出身地がありません。 |
| `frontend/src/pages/BrowsePage.tsx` | 738 | CRO-label-browse-filter-04 Lv1 | 並び替え |
| `frontend/src/pages/BrowsePage.tsx` | 752 | CRO-button-browse-06〜07 Lv1 | 適用する |
| `frontend/src/pages/BrowsePage.tsx` | 759 | CRO-error-browse-01 Lv1 | うまく読み込めませんでした。もう一度お試しください。 |
| `frontend/src/pages/BrowsePage.tsx` | 792 | CRO-empty-browse-sub-01 Lv1 | フィルターを変えるか、少し時間をおいてのぞいてみてください。 |
| `frontend/src/pages/BrowsePage.tsx` | 803 | CRO-button-browse-08 Lv1 | 条件をリセット |
| `frontend/src/pages/BrowsePage.tsx` | 834 | CRO-label-browse-like-01 Lv1 | いいね |
| `frontend/src/pages/ChatPage.tsx` | 49 | CRO-label-chat-report-reasons-01〜05 Lv0 | 不適切な写真 / ハラスメント / なりすまし / スパム / その他 |
| `frontend/src/pages/ChatPage.tsx` | 193 | CRO-label-chat-msg-status-01〜03 Lv1 | ✓ |
| `frontend/src/pages/ChatPage.tsx` | 245 | CRO-empty-chat-01〜03 Lv1 — 保留: 「送ってみましょう」は「〜しよう」禁止類似・オーナー確認待ち | まだメッセージはありません。最初のひとことは案外なんでも大丈夫です。 / まだ会話は始まっていません。気軽にひとこと送ってみましょう。 / メッセージはまだありません。あいさつから始めてみませんか。 |
| `frontend/src/pages/ChatPage.tsx` | 359 | CRO-error-chat-send-01 Lv1 | 送信できませんでした。もう一度お試しください。 |
| `frontend/src/pages/ChatPage.tsx` | 407 | CRO-error-chat-hide-01 Lv1 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/ChatPage.tsx` | 426 | CRO-error-chat-block-01 Lv1 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/ChatPage.tsx` | 443 | CRO-error-chat-report-01 Lv1 | 通報に失敗しました。 |
| `frontend/src/pages/ChatPage.tsx` | 510 | CRO-confirm-chat-block-01 Lv0 | ブロックしますか？ |
| `frontend/src/pages/ChatPage.tsx` | 513 | CRO-confirm-chat-block-02 Lv0 | この操作は取り消せません |
| `frontend/src/pages/ChatPage.tsx` | 517 | CRO-confirm-chat-block-03 Lv0 | ブロックすると、このユーザーとのやり取りはすべて見えなくなります。【また、】ブロックは取り消せません。 |
| `frontend/src/pages/ChatPage.tsx` | 531 | CRO-button-chat-block-cancel-01 Lv1 | やっぱりやめる |
| `frontend/src/pages/ChatPage.tsx` | 540 | CRO-button-chat-block-01 Lv0 | ブロックする / ブロック中… |
| `frontend/src/pages/ChatPage.tsx` | 552 | CRO-heading-chat-report-01 Lv0 | 通報する |
| `frontend/src/pages/ChatPage.tsx` | 554 | CRO-label-chat-report-01〜02 Lv0 | 通報を受け付けました。 / 理由を選んでください。 |
| `frontend/src/pages/ChatPage.tsx` | 569 | CRO-label-chat-report-03 Lv1 | 詳細（任意・500文字以内） |
| `frontend/src/pages/ChatPage.tsx` | 574 | CRO-placeholder-chat-report-01 Lv1 | 詳細があれば（任意） |
| `frontend/src/pages/ChatPage.tsx` | 581 | CRO-button-chat-report-01 Lv0 | 通報する / 送信中… |
| `frontend/src/pages/ChatPage.tsx` | 587 | CRO-button-chat-report-close-01 Lv1 | 閉じる |
| `frontend/src/pages/ChatPage.tsx` | 616 | CRO-label-chat-header-name-01〜02 Lv1 | text-ink/40 italic / text-ink |
| `frontend/src/pages/ChatPage.tsx` | 623 | CRO-label-chat-status-01〜02 Lv1 | LIVE / 再接続中… |
| `frontend/src/pages/ChatPage.tsx` | 640 | CRO-button-chat-menu-01〜03 Lv1 | 非表示にする |
| `frontend/src/pages/ChatPage.tsx` | 710 | CRO-label-chat-loading-01 Lv1 | 読み込み中… |
| `frontend/src/pages/ChatPage.tsx` | 763 | CRO-label-chat-pending-01 Lv0 | 学生証を確認中です。もうしばらくお待ちください。 |
| `frontend/src/pages/ChatPage.tsx` | 769 | CRO-label-chat-no-id-01 Lv0 | チャットするには学生証の提出が必要です。 |
| `frontend/src/pages/ChatPage.tsx` | 779 | CRO-button-chat-submit-id-01 Lv0 | 学生証を提出する |
| `frontend/src/pages/ChatPage.tsx` | 790 | CRO-label-chat-deleted-01 Lv1 | 相手は退会しました。メッセージは送れません。 |
| `frontend/src/pages/ChatPage.tsx` | 805 | CRO-placeholder-chat-01 Lv1 | メッセージを入力… (Shift+Enterで改行)【メッセージを入力...】 |
| `frontend/src/pages/ContactPage.tsx` | 32 | CRO-label-contact-category-01〜05 Lv1 | bug: 'バグ報告' |
| `frontend/src/pages/ContactPage.tsx` | 101 | CRO-toast-contact-01 Lv1 | 送信しました |
| `frontend/src/pages/ContactPage.tsx` | 107 | CRO-toast-contact-02 Lv1 | もう少し時間をおいてからお試しください。 |
| `frontend/src/pages/ContactPage.tsx` | 111 | CRO-toast-contact-03 Lv1 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/ContactPage.tsx` | 139 | CRO-button-contact-01 Lv1 | 戻る |
| `frontend/src/pages/ContactPage.tsx` | 144 | CRO-heading-contact-01 Lv1 | お問い合わせ |
| `frontend/src/pages/ContactPage.tsx` | 151 | CRO-label-contact-01 Lv1 | バグ報告・要望・相談はこちらから。1時間に5件まで送信できます。 |
| `frontend/src/pages/ContactPage.tsx` | 199 | CRO-placeholder-contact-01 Lv1 | 例: マッチ画面で写真が表示されない |
| `frontend/src/pages/ContactPage.tsx` | 221 | CRO-placeholder-contact-02 Lv1 | どんな状況で何が起きたか、できるだけ詳しく書いてください。 |
| `frontend/src/pages/ContactPage.tsx` | 234 | CRO-button-contact-02 Lv1 | 送信する / 送信中… |
| `frontend/src/pages/ContactPage.tsx` | 240 | CRO-heading-contact-02 Lv1 | これまでの問い合わせ |
| `frontend/src/pages/ContactPage.tsx` | 246 | CRO-label-contact-loading-01 Lv1 | 読み込んでいます。少しお待ちください。 |
| `frontend/src/pages/ContactPage.tsx` | 249 | CRO-error-contact-01 Lv1 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/ContactPage.tsx` | 254 | CRO-empty-contact-01 Lv1 | まだ問い合わせはありません。 |
| `frontend/src/pages/ContactPage.tsx` | 291 | CRO-label-contact-02 Lv1 | 運営からの返信 |
| `frontend/src/pages/FootprintsPage.tsx` | 107 | CRO-button-footprints-01 Lv1 | 通知に戻る |
| `frontend/src/pages/FootprintsPage.tsx` | 112 | CRO-heading-footprints-01 Lv1 | あなたを見た人 |
| `frontend/src/pages/FootprintsPage.tsx` | 121 | CRO-button-footprints-02 Lv1 | 全員既読にする |
| `frontend/src/pages/FootprintsPage.tsx` | 136 | CRO-empty-footprints-01 Lv1 | まだ誰も見ていないようです。 |
| `frontend/src/pages/FootprintsPage.tsx` | 190 | CRO-label-footprints-02 Lv1 | いいね |
| `frontend/src/pages/HomePage.tsx` | 87 | CRO-heading-home-hero-01 Lv2 | キャンパスを越えて、好きを見つけよう。 |
| `frontend/src/pages/HomePage.tsx` | 89 | CRO-heading-home-hero-02 Lv2 | 同じキャンパスに、まだ知らない人。 |
| `frontend/src/pages/HomePage.tsx` | 91 | CRO-heading-home-hero-03 Lv2 | すれ違ってたかもしれない人へ。 |
| `frontend/src/pages/HomePage.tsx` | 93 | CRO-heading-home-hero-04 Lv2 | 隣の学部に、気になる人がいるかも。 |
| `frontend/src/pages/HomePage.tsx` | 95 | CRO-heading-home-hero-05 Lv2 | 講義の合間に、出会いを。 |
| `frontend/src/pages/HomePage.tsx` | 97 | CRO-heading-home-hero-06 Lv2 | 好きになる準備、できてますか。 |
| `frontend/src/pages/HomePage.tsx` | 99 | CRO-heading-home-hero-07 Lv2 | 気になるあの人、たぶんここにいます。 |
| `frontend/src/pages/HomePage.tsx` | 101 | CRO-heading-home-hero-08 Lv3 | 出会いは運。でも、母数なら増やせます。 |
| `frontend/src/pages/HomePage.tsx` | 103 | CRO-heading-home-hero-09 Lv3 | どうせ、もう気になってるんでしょう。 |
| `frontend/src/pages/HomePage.tsx` | 105 | CRO-heading-home-hero-10 Lv2 | 今日の一週目で、見つかるかもです。【今日で、見つかるかもです。】 |
| `frontend/src/pages/HomePage.tsx` | 177 | CRO-label-home-loading-01 Lv1 | おすすめを探しています。少しお待ちください。 |
| `frontend/src/pages/HomePage.tsx` | 235 | CRO-banner-home-student-id-01 Lv0 | チャットをするには、学生証の提出が必要です。 |
| `frontend/src/pages/HomePage.tsx` | 242 | CRO-button-home-01 Lv0 | 提出する → |
| `frontend/src/pages/HomePage.tsx` | 266 | CRO-heading-home-hero-01〜10 Lv2/Lv3 — 日替わりローテ（JST日付ベース・全員共通） | （動的・日付で選択）キャンパスを越えて、好きを見つけよう。 / 同じキャンパスに、まだ知らない人。 / すれ違ってたかもしれない人へ。 / 隣の学部に、気になる人がいるかも。 / 講義の合間に、出会いを。 / 好きになる準備、できてますか。 / 気になるあの人、たぶんここにいます。 / 出会いは運。でも、母数なら増やせます。 / どうせ、もう気になってるんでしょう。 / 今日の一周目で、見つかるかもです。 【今日で、見つかるかもです。】|
| `frontend/src/pages/HomePage.tsx` | 341 | CRO-button-home-02 Lv1 | みんなを見る → |
| `frontend/src/pages/HomePage.tsx` | 368 | CRO-label-home-announcement-01 Lv1 | 運営からのお知らせ |
| `frontend/src/pages/HomePage.tsx` | 388 | CRO-label-home-stats-01〜02 Lv1 | ].map(({ label, value, Icon }) => ( |
| `frontend/src/pages/HomePage.tsx` | 420 | CRO-heading-home-quota-01 Lv1 | 本日の受信枠 |
| `frontend/src/pages/HomePage.tsx` | 429 | CRO-label-home-quota-01 Lv1 | まだ解放されていません。<br /> |
| `frontend/src/pages/HomePage.tsx` | 441 | CRO-label-home-quota-02〜03 Lv1 — 保留: 「受け取れます」は禁止「〜できます」類似・オーナー確認待ち | ? '本日の受信上限に達しました。明日また新しい出会いが届きます。' |
| `frontend/src/pages/HomePage.tsx` | 464 | CRO-heading-home-stock-01 Lv1 | いいねストック |
| `frontend/src/pages/HomePage.tsx` | 471 | CRO-label-home-stock-01 Lv1 | いいねを送ると1つ減ります。毎日ログインで +{likeStock.daily_grant} 補充されます。 |
| `frontend/src/pages/HomePage.tsx` | 486 | CRO-label-home-like-cta-01 Lv1 | マッチを見る → |
| `frontend/src/pages/HomePage.tsx` | 492 | CRO-button-home-03 Lv1 | マッチを見る → |
| `frontend/src/pages/HomePage.tsx` | 504 | CRO-heading-home-recommend-01 Lv1 | おすすめ |
| `frontend/src/pages/HomePage.tsx` | 543 | CRO-button-home-04 Lv1 | プロフィールを確認する → |
| `frontend/src/pages/HomePage.tsx` | 549 | CRO-button-home-05 Lv1 | マッチ一覧{matches.length > 0 ? `（${matches.length}）` : ''} |
| `frontend/src/pages/HomePage.tsx` | 559 | CRO-error-home-01 Lv1 | プロフィールの取得に失敗しました |
| `frontend/src/pages/LandingPage.tsx` | 15 | CRO-hitokoto-landing-array Lv3-4 一括保留: LP 専用タメ口リスト・意図的毒・オーナー承認待ち | 眠い。永遠に。 / カフェ、おごられたい。 / 単位が、ない。 / 誰か、たこ焼き行こ。 / レポートから逃げてる。 / 朝起きれたら天才。 / 一限は都市伝説。 / 図書館で寝るプロ。 / 傘、また大学に忘れた。 / バイト代が消えた。なぜ。 / 再履バスで会いましょう。 / 豊中と吹田は遠距離です。 / 箕面は…どこ？ / 待ち合わせは銀杏並木で。 / 過去問は文化遺産。 / 教務課に怯えて生きてる。 / 5限の存在を許してない。 / 第二外国語とは他人です。 / 必修と相性が悪い。 / GPAは聞かないで。 / 自販機の前で3分悩む。 / 推しが尊くて学業が無理。 / ラーメンに救われて… |
| `frontend/src/pages/LandingPage.tsx` | 223 | CRO-cta-landing-hover-01 Lv3 保留: LP意図的タメ口 | ほんとに押す？ |
| `frontend/src/pages/LandingPage.tsx` | 535 | CRO-loader-landing-01 Lv2 保留: LP専用毒トーン | Cro-co |
| `frontend/src/pages/LandingPage.tsx` | 574 | CRO-heading-landing-hero-01 Lv2 保留: LP専用毒トーン | 阪大生の、<br /> |
| `frontend/src/pages/LandingPage.tsx` | 590 | CRO-banner-landing-beta-01 Lv2 保留: LP専用毒トーン | rotate(-2deg) |
| `frontend/src/pages/LandingPage.tsx` | 594 | CRO-banner-landing-age-01 Lv2 保留: LP専用毒トーン | rotate(1.5deg) |
| `frontend/src/pages/LandingPage.tsx` | 605 | CRO-stamp-landing-gatekeeper-01 Lv2 保留: LP専用毒トーン | 学外、お断り。 |
| `frontend/src/pages/LandingPage.tsx` | 668 | CRO-button-landing-cta-01 Lv1 | translateY(2.5rem) |
| `frontend/src/pages/LandingPage.tsx` | 678 | CRO-easter-landing-01 Lv4 保留: LP専用イースターエッグ | 押さないで |
| `frontend/src/pages/LandingPage.tsx` | 854 | CRO-label-landing-register-01 Lv3 保留: LP専用タメ口 | &gt; 阪大メール、教えて。(Email) |
| `frontend/src/pages/LandingPage.tsx` | 861 | CRO-placeholder-landing-register-01 Lv0 | you@ecs.osaka-u.ac.jp |
| `frontend/src/pages/LandingPage.tsx` | 868 | CRO-error-landing-register-01 Lv0 | 有効なメールアドレスを入力してください。ドメイン確認は登録ページで行います。 |
| `frontend/src/pages/LandingPage.tsx` | 874 | CRO-button-landing-register-01 Lv1 | Enter Cro-co |
| `frontend/src/pages/LandingPage.tsx` | 882 | CRO-label-landing-register-02 Lv3 保留: LP専用毒トーン | 押した時点で、もう普通じゃない。 |
| `frontend/src/pages/LandingPage.tsx` | 912 | CRO-link-landing-footer-01 Lv0 | 利用規約 |
| `frontend/src/pages/LandingPage.tsx` | 914 | CRO-link-landing-footer-02 Lv0 | プライバシーポリシー |
| `frontend/src/pages/LandingPage.tsx` | 916 | CRO-link-landing-footer-03 Lv0 | お問い合わせ |
| `frontend/src/pages/LandingPage.tsx` | 924 | CRO-legal-landing-copyright-01 Lv2 保留: LP専用毒トーン | © 2026 Cro-co. All rights destroyed. |
| `frontend/src/pages/LandingPage.tsx` | 926 | CRO-legal-landing-beta-01 Lv0 | いまβ版【です】。正式リリースは2026年10月【を予定しています】。18歳未満は利用できません。 |
| `frontend/src/pages/LandingPage.tsx` | 928 | CRO-label-landing-footer-scroll-01 Lv2 保留: LP専用毒トーン | You scrolled this far. Respect. |
| `frontend/src/pages/LikesReceivedPage.tsx` | 78 | CRO-button-likes-received-01 Lv1 | 通知に戻る |
| `frontend/src/pages/LikesReceivedPage.tsx` | 82 | CRO-heading-likes-received-01 Lv1 | あなたへのいいね |
| `frontend/src/pages/LikesReceivedPage.tsx` | 99 | CRO-empty-likes-received-01 Lv1 | まだいいねは届いていません。気になる人に送ってみましょう。 |
| `frontend/src/pages/LikesReceivedPage.tsx` | 159 | CRO-label-likes-received-01 Lv1 | ♥ 済み |
| `frontend/src/pages/LikesReceivedPage.tsx` | 169 | CRO-button-likes-received-02 Lv1 | ♥ 返す |
| `frontend/src/pages/LoginPage.tsx` | 16 | CRO-heading-login-01 Lv1 | ログイン |
| `frontend/src/pages/LoginPage.tsx` | 42 | CRO-error-login-01 Lv0 | メールアドレスまたはパスワードが正しくありません。 |
| `frontend/src/pages/LoginPage.tsx` | 52 | CRO-error-login-02 Lv1 | 先にメールアドレスを入力してください。 |
| `frontend/src/pages/LoginPage.tsx` | 70 | CRO-error-login-03 Lv0 | 送信できませんでした。もう一度お試しください。 |
| `frontend/src/pages/LoginPage.tsx` | 85 | CRO-heading-login-02 Lv2 | おかえりなさい。お待ちしていました。 |
| `frontend/src/pages/LoginPage.tsx` | 106 | CRO-banner-login-01 Lv1 | リセット用のメールを送りました。受信ボックスを確認してください。 |
| `frontend/src/pages/LoginPage.tsx` | 112 | CRO-label-login-01 Lv1 | 必須 |
| `frontend/src/pages/LoginPage.tsx` | 114 | CRO-placeholder-login-01 Lv1 | /> |
| `frontend/src/pages/LoginPage.tsx` | 127 | CRO-label-login-02 Lv1 | 必須 |
| `frontend/src/pages/LoginPage.tsx` | 130 | CRO-placeholder-login-02 Lv1 | text / password |
| `frontend/src/pages/LoginPage.tsx` | 143 | CRO-label-login-03 Lv1 | パスワードを隠す / パスワードを表示する |
| `frontend/src/pages/LoginPage.tsx` | 158 | CRO-button-login-01 Lv1 | ログイン / 処理中… |
| `frontend/src/pages/LoginPage.tsx` | 169 | CRO-button-login-02 Lv2 | パスワードを忘れた？ |
| `frontend/src/pages/LoginPage.tsx` | 178 | CRO-button-login-03 Lv2 | アカウントがない？ → 新規登録 |
| `frontend/src/pages/LoginPage.tsx` | 183 | CRO-label-login-04 Lv1 | @ecs.osaka-u.ac.jp のみ登録可能 |
| `frontend/src/pages/MatchesPage.tsx` | 157 | CRO-heading-matches-locked-01 Lv0 | ? '学生証の再提出が必要です' |
| `frontend/src/pages/MatchesPage.tsx` | 163 | CRO-onboarding-matches-locked-01 Lv0 | ? '再申請して承認されると、マッチ機能が使えるようになります。' |
| `frontend/src/pages/MatchesPage.tsx` | 175 | CRO-button-matches-01 Lv0 | 再申請する → |
| `frontend/src/pages/MatchesPage.tsx` | 184 | CRO-button-matches-02 Lv1 | ホームに戻る |
| `frontend/src/pages/MatchesPage.tsx` | 201 | CRO-heading-matches-incomplete-01 Lv1 | プロフィールを完成させてからご利用いただけます。 |
| `frontend/src/pages/MatchesPage.tsx` | 203 | CRO-label-matches-incomplete-01 Lv1 | 名前・学部・自己紹介を設定してください。 |
| `frontend/src/pages/MatchesPage.tsx` | 206 | CRO-button-matches-03 Lv1 | プロフィールを設定する |
| `frontend/src/pages/MatchesPage.tsx` | 218 | CRO-label-matches-loading-01 Lv1 | 読み込んでいます。少しお待ちください。 |
| `frontend/src/pages/MatchesPage.tsx` | 238 | CRO-heading-matches-01 Lv1 | マッチ |
| `frontend/src/pages/MatchesPage.tsx` | 251 | CRO-heading-matches-02 Lv1 | あなたへのいいね |
| `frontend/src/pages/MatchesPage.tsx` | 289 | CRO-button-matches-04 Lv1 | 送信中… |
| `frontend/src/pages/MatchesPage.tsx` | 297 | CRO-button-matches-05 Lv1 | 今はいい |
| `frontend/src/pages/MatchesPage.tsx` | 310 | CRO-empty-matches-01 Lv1 | まだ誰からもいいねが届いていません |
| `frontend/src/pages/MatchesPage.tsx` | 315 | CRO-error-matches-01 Lv1 | 読み込めませんでした。 |
| `frontend/src/pages/MatchesPage.tsx` | 336 | CRO-heading-matches-03 Lv1 | マッチ |
| `frontend/src/pages/MatchesPage.tsx` | 345 | CRO-empty-matches-02 Lv1 (title/description/actionLabel) | /> |
| `frontend/src/pages/MatchesPage.tsx` | 380 | CRO-label-matches-deleted-01 Lv1 | （名前未設定） |
| `frontend/src/pages/MatchesPage.tsx` | 391 | CRO-button-matches-06 Lv1 | チャット → |
| `frontend/src/pages/MatchesPage.tsx` | 402 | CRO-button-matches-07 Lv1 | 非表示 |
| `frontend/src/pages/NotificationsPage.tsx` | 124 | CRO-heading-notifications-locked-01 Lv0 | ? '学生証の再提出が必要です' |
| `frontend/src/pages/NotificationsPage.tsx` | 130 | CRO-onboarding-notifications-locked-01 Lv0 | ? '再申請して承認されると、通知機能が使えるようになります。' |
| `frontend/src/pages/NotificationsPage.tsx` | 142 | CRO-button-notifications-01 Lv0 | 再申請する → |
| `frontend/src/pages/NotificationsPage.tsx` | 151 | CRO-button-notifications-02 Lv1 | ホームに戻る |
| `frontend/src/pages/NotificationsPage.tsx` | 161 | CRO-label-notifications-section-01〜03 Lv1 (label), CRO-label-notifications-section-04〜06 Lv1 (sublabel) | あなたを見た人 / プロフィールを閲覧した人 / あなたへのいいね / いいねを返して、マッチしてみましょう。 / 新しいマッチ / マッチした相手とチャットできます。 |
| `frontend/src/pages/NotificationsPage.tsx` | 202 | CRO-heading-notifications-01 Lv1 | 通知 |
| `frontend/src/pages/NotificationsPage.tsx` | 256 | CRO-label-notifications-warning-01 Lv0 | 運営からの警告 |
| `frontend/src/pages/PendingPage.tsx` | 54 | CRO-label-pending-01 Lv0 | 本人確認情報・学生証提出 |
| `frontend/src/pages/PendingPage.tsx` | 56 | CRO-label-pending-02 Lv0 | sub: '完了' |
| `frontend/src/pages/PendingPage.tsx` | 63 | CRO-label-pending-03 Lv0 | 審査中 |
| `frontend/src/pages/PendingPage.tsx` | 65 | CRO-label-pending-04 Lv0 | sub: 'アプリ内のステータスでご確認いただけます。' |
| `frontend/src/pages/PendingPage.tsx` | 72 | CRO-label-pending-05 Lv0 | チャット解放 |
| `frontend/src/pages/PendingPage.tsx` | 74 | CRO-label-pending-06 Lv0 | sub: '承認後にご利用いただけます。' |
| `frontend/src/pages/PendingPage.tsx` | 113 | CRO-heading-pending-01 Lv0 | 確認しています。 |
| `frontend/src/pages/PendingPage.tsx` | 122 | CRO-onboarding-pending-01 Lv0 | 審査の間も、気になる人を探したり、いいねを送ったり、マッチしたりできます。チャットは承認後にご利用いただけます。 |
| `frontend/src/pages/PendingPage.tsx` | 128 | CRO-label-pending-07 Lv0 | 提出日時 |
| `frontend/src/pages/PendingPage.tsx` | 133 | CRO-onboarding-pending-02 Lv0 | 結果はアプリ内のステータスでご確認いただけます。もうしばらくお待ちください。 |
| `frontend/src/pages/PendingPage.tsx` | 183 | CRO-button-pending-01 Lv1 | ホームに戻る → |
| `frontend/src/pages/PendingPage.tsx` | 192 | CRO-button-pending-02 Lv1 | ログアウト |
| `frontend/src/pages/PrivacyPolicyPage.tsx` | 61 | CRO-button-privacy-back-01 Lv0 | 戻る |
| `frontend/src/pages/PrivacyPolicyPage.tsx` | 69 | CRO-heading-privacy-01 Lv0 | プライバシーポリシー |
| `frontend/src/pages/PrivacyPolicyPage.tsx` | 76 | CRO-label-privacy-effective-01 Lv0 | 施行日: 2026年6月18日 |
| `frontend/src/pages/PrivacyPolicyPage.tsx` | 81 | CRO-legal-privacy-body-all Lv0 法的条文・文言変更禁止 | 本プライバシーポリシー（以下「本ポリシー」といいます）は、マッチングサービス「Cro-co」（以下「本サービス」といいます）における利用者の個人情報の取扱いについて定めるものです。 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 70 | CRO-label-profile-report-reasons-01〜05 Lv0 | 不適切な写真 / ハラスメント / なりすまし / スパム / その他 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 160 | CRO-error-profile-like-01 Lv1 | いいねを送れませんでした。もう一度お試しください。 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 174 | CRO-error-profile-hide-01 Lv1 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 193 | CRO-error-profile-block-01 Lv1 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 217 | CRO-error-profile-report-01 Lv1 | } finally { |
| `frontend/src/pages/ProfileDetailPage.tsx` | 241 | CRO-error-profile-notfound-01 Lv1 | ユーザーが見つかりません |
| `frontend/src/pages/ProfileDetailPage.tsx` | 244 | CRO-button-profile-back-01 Lv1 | ← 一覧に戻る |
| `frontend/src/pages/ProfileDetailPage.tsx` | 257 | CRO-error-profile-generic-01 Lv1 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 305 | CRO-confirm-profile-block-01 Lv0 | ブロックしますか？ |
| `frontend/src/pages/ProfileDetailPage.tsx` | 308 | CRO-confirm-profile-block-02 Lv0 | この操作は取り消せません |
| `frontend/src/pages/ProfileDetailPage.tsx` | 312 | CRO-confirm-profile-block-03 Lv0 | ブロックすると、このユーザーとのやり取りはすべて見えなくなります。ブロックは取り消せません。 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 326 | CRO-button-profile-block-cancel-01 Lv1 | やっぱりやめる |
| `frontend/src/pages/ProfileDetailPage.tsx` | 335 | CRO-button-profile-block-01 Lv0 | ブロックする / ブロック中… |
| `frontend/src/pages/ProfileDetailPage.tsx` | 347 | CRO-heading-profile-report-01 Lv0 | 通報する |
| `frontend/src/pages/ProfileDetailPage.tsx` | 349 | CRO-label-profile-report-01〜02 Lv0 | 通報を受け付けました。 / 理由を選んでください。 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 372 | CRO-label-profile-report-03 Lv1 | 詳細（任意・500文字以内） |
| `frontend/src/pages/ProfileDetailPage.tsx` | 378 | CRO-placeholder-profile-report-01 Lv1 | 詳細があれば（任意） |
| `frontend/src/pages/ProfileDetailPage.tsx` | 386 | CRO-button-profile-report-01 Lv0 | 通報する / 送信中… |
| `frontend/src/pages/ProfileDetailPage.tsx` | 392 | CRO-button-profile-report-close-01 Lv1 | 閉じる |
| `frontend/src/pages/ProfileDetailPage.tsx` | 412 | CRO-label-profile-back-01 Lv1 | 戻る |
| `frontend/src/pages/ProfileDetailPage.tsx` | 431 | CRO-button-profile-menu-01〜03 Lv1 | 非表示にする |
| `frontend/src/pages/ProfileDetailPage.tsx` | 471 | CRO-label-profile-photo-pending-01 Lv0 | 審査中 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 477 | CRO-label-profile-photo-rejected-01 Lv0 | 承認不可 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 490 | CRO-empty-profile-photos-01 Lv1 | 写真はまだありません。 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 504 | CRO-label-profile-photo-prev-01 Lv1 | 前の写真 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 515 | CRO-label-profile-photo-next-01 Lv1 | 次の写真 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 571 | CRO-heading-profile-bio-01 Lv1 | 自己紹介 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 577 | CRO-label-profile-registered-01 Lv1 | 登録日 |
| `frontend/src/pages/ProfileDetailPage.tsx` | 591 | CRO-label-profile-self-01 Lv1 | （自分のプロフィールです） |
| `frontend/src/pages/ProfileDetailPage.tsx` | 605 | CRO-button-profile-liked-01 Lv1 | いいね済み |
| `frontend/src/pages/ProfileDetailPage.tsx` | 621 | CRO-button-profile-like-01 Lv1 | いいね |
| `frontend/src/pages/ProfileEditPage.tsx` | 179 | CRO-error-profile-edit-01 Lv1 | 読み込めませんでした。 |
| `frontend/src/pages/ProfileEditPage.tsx` | 209 | CRO-error-profile-edit-photo-01 Lv1 — 保留: 「アップロードできます」は禁止「〜できます」・オーナー確認待ち | JPEGまたはPNG形式の画像のみアップロードできます |
| `frontend/src/pages/ProfileEditPage.tsx` | 214 | CRO-error-profile-edit-photo-02 Lv0 | ファイルサイズは5MB以下にしてください |
| `frontend/src/pages/ProfileEditPage.tsx` | 245 | CRO-error-profile-edit-photo-03 Lv1 | string |
| `frontend/src/pages/ProfileEditPage.tsx` | 260 | CRO-confirm-profile-edit-photo-01 Lv1 | await api.delete(`/api/profile/photos/${photoId}`) |
| `frontend/src/pages/ProfileEditPage.tsx` | 271 | CRO-error-profile-edit-photo-04 Lv1 | 削除に失敗しました |
| `frontend/src/pages/ProfileEditPage.tsx` | 282 | CRO-error-profile-edit-photo-05 Lv1 | メイン設定に失敗しました |
| `frontend/src/pages/ProfileEditPage.tsx` | 296 | CRO-error-profile-edit-photo-06 Lv1 | 並び替えに失敗しました |
| `frontend/src/pages/ProfileEditPage.tsx` | 317 | CRO-error-profile-edit-02 Lv0 | 学年は1〜6の整数で入力してください |
| `frontend/src/pages/ProfileEditPage.tsx` | 347 | CRO-error-profile-edit-03 Lv1 | 入力値が正しくありません。各フィールドの制限を確認してください。 |
| `frontend/src/pages/ProfileEditPage.tsx` | 350 | CRO-error-profile-edit-04 Lv1 | 保存できませんでした。もう一度お試しください。 |
| `frontend/src/pages/ProfileEditPage.tsx` | 354 | CRO-error-profile-edit-05 Lv1 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/ProfileEditPage.tsx` | 406 | CRO-button-profile-edit-crop-01 Lv1 | キャンセル |
| `frontend/src/pages/ProfileEditPage.tsx` | 414 | CRO-button-profile-edit-crop-02 Lv1 | この写真を使う |
| `frontend/src/pages/ProfileEditPage.tsx` | 438 | CRO-heading-profile-edit-01 Lv1 | プロフィールを編集 |
| `frontend/src/pages/ProfileEditPage.tsx` | 440 | CRO-button-profile-edit-01 Lv1 | プレビュー |
| `frontend/src/pages/ProfileEditPage.tsx` | 496 | CRO-label-profile-edit-photo-01 Lv0 | 審査中 |
| `frontend/src/pages/ProfileEditPage.tsx` | 504 | CRO-label-profile-edit-photo-02 Lv0 | 承認不可 |
| `frontend/src/pages/ProfileEditPage.tsx` | 529 | CRO-button-profile-edit-02 Lv1 | メインにする |
| `frontend/src/pages/ProfileEditPage.tsx` | 581 | CRO-label-profile-edit-photo-03 Lv1 | アップロード中… |
| `frontend/src/pages/ProfileEditPage.tsx` | 584 | CRO-label-profile-edit-photo-04 Lv0 | JPEG / PNG、5MB以下。最大6枚まで。 |
| `frontend/src/pages/ProfileEditPage.tsx` | 595 | CRO-toast-profile-edit-01 Lv1 | 保存しました。いい感じです。 |
| `frontend/src/pages/ProfileEditPage.tsx` | 603 | CRO-label-profile-edit-draft-01 Lv1 | 下書きを復元しました。 |
| `frontend/src/pages/ProfileEditPage.tsx` | 605 | CRO-button-profile-edit-03 Lv1 | 閉じる |
| `frontend/src/pages/ProfileEditPage.tsx` | 635 | CRO-placeholder-profile-edit-01 Lv1 | /> |
| `frontend/src/pages/ProfileEditPage.tsx` | 652 | CRO-label-profile-edit-01 Lv1 | 選択してください |
| `frontend/src/pages/ProfileEditPage.tsx` | 669 | CRO-placeholder-profile-edit-02 Lv1 | 今日の気分を一言で（30文字以内） |
| `frontend/src/pages/ProfileEditPage.tsx` | 693 | CRO-label-profile-edit-02 Lv1 | 学生証を提出すると設定されます。 |
| `frontend/src/pages/ProfileEditPage.tsx` | 715 | CRO-label-profile-edit-03 Lv1 | 未設定 |
| `frontend/src/pages/ProfileEditPage.tsx` | 724 | CRO-label-profile-edit-04 Lv1 | これらの情報は学生証承認後に変更できません。 |
| `frontend/src/pages/ProfileEditPage.tsx` | 743 | CRO-placeholder-profile-edit-03 Lv1 | あなたのこと、もっと知りたい。 |
| `frontend/src/pages/ProfileEditPage.tsx` | 787 | CRO-label-profile-edit-05 Lv1 | 選択してください |
| `frontend/src/pages/ProfileEditPage.tsx` | 808 | CRO-button-profile-edit-04 Lv1 (保存中) / CRO-button-profile-edit-05 Lv1 (保存する) | 保存する / 保存中… |
| `frontend/src/pages/ProfileEditPage.tsx` | 811 | CRO-button-profile-edit-06 Lv1 | キャンセル |
| `frontend/src/pages/RejectedPage.tsx` | 68 | CRO-heading-rejected-01 Lv0 | 今回は、承認できませんでした。 |
| `frontend/src/pages/RejectedPage.tsx` | 78 | CRO-label-rejected-01 Lv0 | 却下理由 |
| `frontend/src/pages/RejectedPage.tsx` | 81 | CRO-label-rejected-02 Lv0 | 詳細は運営からご連絡します。 |
| `frontend/src/pages/RejectedPage.tsx` | 89 | CRO-heading-rejected-02 Lv0 | 考えられる理由 |
| `frontend/src/pages/RejectedPage.tsx` | 93 | CRO-label-rejected-03 Lv0 | 学生証の画像が鮮明でなかった |
| `frontend/src/pages/RejectedPage.tsx` | 97 | CRO-label-rejected-04 Lv0 | 学生証の有効期限が切れている |
| `frontend/src/pages/RejectedPage.tsx` | 101 | CRO-label-rejected-05 Lv0 | 対象大学の学生証ではない |
| `frontend/src/pages/RejectedPage.tsx` | 109 | CRO-onboarding-rejected-01 Lv0 | 再申請のときは、顔と学生証が両方はっきり写った写真を提出してください。 |
| `frontend/src/pages/RejectedPage.tsx` | 118 | CRO-button-rejected-01 Lv0 | もう一度試してみる |
| `frontend/src/pages/RejectedPage.tsx` | 125 | CRO-label-rejected-06 Lv0 | ご不明な点はお問い合わせください |
| `frontend/src/pages/RejectedPage.tsx` | 140 | CRO-button-rejected-02 Lv1 | ← ホームに戻る |
| `frontend/src/pages/RejectedPage.tsx` | 148 | CRO-button-rejected-03 Lv1 | ログアウト |
| `frontend/src/pages/ResetPasswordPage.tsx` | 15 | CRO-heading-reset-password-01 Lv0 | パスワードリセット |
| `frontend/src/pages/ResetPasswordPage.tsx` | 47 | CRO-error-reset-password-01 Lv0 | パスワードが一致しません。 |
| `frontend/src/pages/ResetPasswordPage.tsx` | 52 | CRO-error-reset-password-02 Lv0 | パスワードは8文字以上で入力してください。 |
| `frontend/src/pages/ResetPasswordPage.tsx` | 64 | CRO-error-reset-password-03 Lv0 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/ResetPasswordPage.tsx` | 78 | CRO-heading-reset-password-02 Lv0 | パスワードを再設定します。 |
| `frontend/src/pages/ResetPasswordPage.tsx` | 90 | CRO-banner-reset-password-01 Lv0 | リンクを確認しています… |
| `frontend/src/pages/ResetPasswordPage.tsx` | 101 | CRO-label-reset-password-01 Lv0 | 新しいパスワード |
| `frontend/src/pages/ResetPasswordPage.tsx` | 104 | CRO-placeholder-reset-password-01 Lv0 | text / password |
| `frontend/src/pages/ResetPasswordPage.tsx` | 118 | CRO-label-reset-password-02 Lv0 | パスワードを隠す / パスワードを表示する |
| `frontend/src/pages/ResetPasswordPage.tsx` | 128 | CRO-label-reset-password-03 Lv0 | パスワード（確認） |
| `frontend/src/pages/ResetPasswordPage.tsx` | 131 | CRO-placeholder-reset-password-02 Lv0 | text / password |
| `frontend/src/pages/ResetPasswordPage.tsx` | 145 | CRO-label-reset-password-04 Lv0 | パスワードを隠す / パスワードを表示する |
| `frontend/src/pages/ResetPasswordPage.tsx` | 160 | CRO-button-reset-password-01 Lv0 | パスワードを変更する / 保存中… |
| `frontend/src/pages/SafetyListPage.tsx` | 75 | CRO-toast-safety-01 Lv1 | ${name}の非表示を解除しました |
| `frontend/src/pages/SafetyListPage.tsx` | 79 | CRO-toast-safety-02 Lv1 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/SafetyListPage.tsx` | 96 | CRO-heading-safety-01 Lv1 | ブロック・非表示 |
| `frontend/src/pages/SafetyListPage.tsx` | 113 | CRO-label-safety-01 Lv1 | ブロック |
| `frontend/src/pages/SafetyListPage.tsx` | 124 | CRO-label-safety-02 Lv1 | 非表示 |
| `frontend/src/pages/SafetyListPage.tsx` | 132 | CRO-label-safety-loading-01 Lv1 | 読み込んでいます。少しお待ちください。 |
| `frontend/src/pages/SafetyListPage.tsx` | 135 | CRO-error-safety-01 Lv1 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/SafetyListPage.tsx` | 140 | CRO-empty-safety-01 Lv1 | ブロックしている人はいません。 |
| `frontend/src/pages/SafetyListPage.tsx` | 151 | CRO-label-safety-03 Lv1 | ブロック中 |
| `frontend/src/pages/SafetyListPage.tsx` | 155 | CRO-confirm-safety-01 Lv0 | ※ ブロックは取り消せません。 |
| `frontend/src/pages/SafetyListPage.tsx` | 167 | CRO-label-safety-loading-01 Lv1 | 読み込んでいます。少しお待ちください。 |
| `frontend/src/pages/SafetyListPage.tsx` | 170 | CRO-error-safety-01 Lv1 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/SafetyListPage.tsx` | 175 | CRO-empty-safety-02 Lv1 | 非表示にしている人はいません。 |
| `frontend/src/pages/SafetyListPage.tsx` | 192 | CRO-button-safety-01 Lv1 | 解除 |
| `frontend/src/pages/SettingsPage.tsx` | 170 | CRO-error-settings-delete-01 Lv0 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/SettingsPage.tsx` | 179 | CRO-heading-settings-01 Lv1 | 設定 |
| `frontend/src/pages/SettingsPage.tsx` | 186 | CRO-heading-settings-02 Lv1 | アカウント情報 |
| `frontend/src/pages/SettingsPage.tsx` | 190 | CRO-label-settings-01 Lv1 | メールアドレス |
| `frontend/src/pages/SettingsPage.tsx` | 197 | CRO-button-settings-01 Lv1 | プロフィールを編集する |
| `frontend/src/pages/SettingsPage.tsx` | 204 | CRO-button-settings-02 Lv1 | 自分のプロフィールを見る |
| `frontend/src/pages/SettingsPage.tsx` | 217 | CRO-heading-settings-03 Lv1 | マイQRコード |
| `frontend/src/pages/SettingsPage.tsx` | 220 | CRO-label-settings-02 Lv1 | このQRコードを見せると、あなたのプロフィールに直接アクセスできます |
| `frontend/src/pages/SettingsPage.tsx` | 233 | CRO-button-settings-03 Lv1 | 保存する |
| `frontend/src/pages/SettingsPage.tsx` | 243 | CRO-heading-settings-04 Lv1 | プライバシー設定 |
| `frontend/src/pages/SettingsPage.tsx` | 250 | CRO-heading-settings-05 Lv1 | 学部・学科の非表示設定 |
| `frontend/src/pages/SettingsPage.tsx` | 252 | CRO-label-settings-03 Lv1 | 同じ学部・学科の人にあなたのプロフィールは表示されず、あなたにも相手のプロフィールは表示されません。お互いに見えなくすることで、身バレを防ぎます。 |
| `frontend/src/pages/SettingsPage.tsx` | 260 | CRO-label-settings-04〜06 Lv1 (radio labels: none/faculty/department) | value: 'none' as FacultyHideLevel |
| `frontend/src/pages/SettingsPage.tsx` | 314 | CRO-label-settings-07 Lv1 | アクセス解析に協力する（任意） |
| `frontend/src/pages/SettingsPage.tsx` | 317 | CRO-label-settings-08 Lv1 — 保留: 「ご利用いただけます」は禁止「〜できます」類似・オーナー確認待ち | プライバシーポリシー |
| `frontend/src/pages/SettingsPage.tsx` | 328 | CRO-heading-settings-06 Lv1 | サークルの非表示設定 |
| `frontend/src/pages/SettingsPage.tsx` | 330 | CRO-label-settings-09 Lv1 — 保留: 「設定できます」は禁止「〜できます」・オーナー確認待ち | 各サークルの同メンバーとは、お互いのプロフィールが表示されなくなります。身バレが心配なサークルだけ非表示に設定できます。 |
| `frontend/src/pages/SettingsPage.tsx` | 337 | CRO-label-settings-10 Lv1 | 読み込み中… |
| `frontend/src/pages/SettingsPage.tsx` | 341 | CRO-empty-settings-01 Lv1 — 保留: 「追加できます」は禁止「〜できます」・オーナー確認待ち | サークルが登録されていません。プロフィール編集からサークルを追加できます。 |
| `frontend/src/pages/SettingsPage.tsx` | 366 | CRO-label-settings-11 Lv1 | 表示する |
| `frontend/src/pages/SettingsPage.tsx` | 378 | CRO-label-settings-12 Lv1 | 非表示にする |
| `frontend/src/pages/SettingsPage.tsx` | 397 | CRO-heading-settings-07 Lv1 | 通知設定 |
| `frontend/src/pages/SettingsPage.tsx` | 404 | CRO-label-settings-13 Lv1 | プッシュ通知を受け取る |
| `frontend/src/pages/SettingsPage.tsx` | 406 | CRO-label-settings-14 Lv1 | アプリを閉じていてもマッチ・いいね・メッセージを通知 |
| `frontend/src/pages/SettingsPage.tsx` | 428 | CRO-button-settings-04 Lv1 | 通知テストを送る |
| `frontend/src/pages/SettingsPage.tsx` | 434 | CRO-error-settings-notify-01 Lv0 | 通知の許可が必要です。ブラウザの設定から変更してください。 |
| `frontend/src/pages/SettingsPage.tsx` | 441 | CRO-label-settings-15 Lv1 | このブラウザはプッシュ通知に対応していません。 |
| `frontend/src/pages/SettingsPage.tsx` | 459 | CRO-button-settings-05 Lv1 | ブロックしたユーザー |
| `frontend/src/pages/SettingsPage.tsx` | 461 | CRO-label-settings-16 Lv1 — 保留: 「確認できます」は禁止「〜できます」・オーナー確認待ち | ブロック中のユーザーを確認できます。 |
| `frontend/src/pages/SettingsPage.tsx` | 479 | CRO-button-settings-06 Lv1 | 非表示にしたユーザー |
| `frontend/src/pages/SettingsPage.tsx` | 481 | CRO-label-settings-17 Lv1 — 保留: 「解除できます」は禁止「〜できます」・オーナー確認待ち | 非表示を解除できます。 |
| `frontend/src/pages/SettingsPage.tsx` | 499 | CRO-button-settings-07 Lv1 | お問い合わせ |
| `frontend/src/pages/SettingsPage.tsx` | 501 | CRO-label-settings-18 Lv1 | バグ報告・要望・相談 |
| `frontend/src/pages/SettingsPage.tsx` | 514 | CRO-heading-settings-08 Lv1 | アプリ情報 |
| `frontend/src/pages/SettingsPage.tsx` | 518 | CRO-label-settings-19 Lv1 | バージョン |
| `frontend/src/pages/SettingsPage.tsx` | 522 | CRO-legal-settings-01〜02 Lv0 | 利用規約 |
| `frontend/src/pages/SettingsPage.tsx` | 536 | CRO-label-settings-20 Lv0 | 審査・通報の管理 |
| `frontend/src/pages/SettingsPage.tsx` | 543 | CRO-button-settings-08 Lv0 | 管理者ダッシュボードを開く |
| `frontend/src/pages/SettingsPage.tsx` | 557 | CRO-button-settings-09 Lv1 | ログアウト |
| `frontend/src/pages/SettingsPage.tsx` | 566 | CRO-heading-settings-09 Lv0 | アカウントを削除する |
| `frontend/src/pages/SettingsPage.tsx` | 569 | CRO-label-settings-21 Lv0 | 削除すると、プロフィール・写真・マッチ・メッセージなどすべてのデータが完全に消去されます。 |
| `frontend/src/pages/SettingsPage.tsx` | 580 | CRO-button-settings-10 Lv0 | アカウントを削除する |
| `frontend/src/pages/SettingsPage.tsx` | 598 | CRO-confirm-settings-delete-01 Lv0 | 本当に削除しますか？ |
| `frontend/src/pages/SettingsPage.tsx` | 601 | CRO-confirm-settings-delete-02 Lv0 | この操作は取り消せません |
| `frontend/src/pages/SettingsPage.tsx` | 605 | CRO-confirm-settings-delete-03 Lv0 | プロフィール・写真・マッチ・メッセージがすべて完全に削除されます。復元はできません。 |
| `frontend/src/pages/SettingsPage.tsx` | 619 | CRO-button-settings-11 Lv1 | やめておく |
| `frontend/src/pages/SettingsPage.tsx` | 628 | CRO-button-settings-12 Lv0 | 削除する / 削除中… |
| `frontend/src/pages/SetupCompletePage.tsx` | 46 | CRO-heading-setup-complete-01 Lv2 | さあ、始めましょう。 |
| `frontend/src/pages/SetupCompletePage.tsx` | 53 | CRO-onboarding-setup-complete-01 Lv2 | あなたを待っている人が、きっといます。 |
| `frontend/src/pages/SetupCompletePage.tsx` | 68 | CRO-button-setup-complete-01 Lv1 | Cro-co を始める → |
| `frontend/src/pages/SetupCompletePage.tsx` | 71 | CRO-label-setup-complete-01 Lv1 | いつでもプロフィールは編集できます |
| `frontend/src/pages/SetupInstallPage.tsx` | 46 | CRO-label-setup-install-01 Lv1 | おすすめ |
| `frontend/src/pages/SetupInstallPage.tsx` | 49 | CRO-heading-setup-install-01 Lv1 | アプリとして<br />追加しましょう。 |
| `frontend/src/pages/SetupInstallPage.tsx` | 53 | CRO-onboarding-setup-install-01 Lv1 | ホーム画面からすぐにアクセスできます。<br /> |
| `frontend/src/pages/SetupInstallPage.tsx` | 62 | CRO-label-setup-install-02 Lv1 | アプリを閉じていても届きます |
| `frontend/src/pages/SetupInstallPage.tsx` | 64 | CRO-label-setup-install-03 Lv1 | ホーム画面からワンタップで開けます |
| `frontend/src/pages/SetupInstallPage.tsx` | 66 | CRO-label-setup-install-04 Lv1 | ストアからのダウンロード不要 |
| `frontend/src/pages/SetupInstallPage.tsx` | 94 | CRO-heading-setup-install-02 Lv1 | iOSの場合 |
| `frontend/src/pages/SetupInstallPage.tsx` | 96 | CRO-onboarding-setup-install-02 Lv1 | Safari の下部にある共有ボタンをタップ |
| `frontend/src/pages/SetupInstallPage.tsx` | 111 | CRO-heading-setup-install-03 Lv1 | Androidの場合 |
| `frontend/src/pages/SetupInstallPage.tsx` | 113 | CRO-onboarding-setup-install-03 Lv1 | Chrome 右上の「⋮」メニューをタップ |
| `frontend/src/pages/SetupInstallPage.tsx` | 131 | CRO-button-setup-install-01 Lv1 | 追加しました。次へ → |
| `frontend/src/pages/SetupInstallPage.tsx` | 142 | CRO-button-setup-install-04 Lv1 | 次へ進む → |
| `frontend/src/pages/SetupInstallPage.tsx` | 152 | CRO-button-setup-install-02 Lv1 | アプリをインストール |
| `frontend/src/pages/SetupInstallPage.tsx` | 162 | CRO-button-setup-install-03 Lv1 | 手順通りに追加しました |
| `frontend/src/pages/SetupInstallPage.tsx` | 172 | CRO-button-setup-install-04 Lv1 | 次へ進む → |
| `frontend/src/pages/SetupInstallPage.tsx` | 182 | CRO-button-setup-install-05 Lv1 | あとで追加する |
| `frontend/src/pages/SetupNotifyPage.tsx` | 61 | CRO-heading-setup-notify-01 Lv1 | 通知をオンに<br />しておきましょう。 |
| `frontend/src/pages/SetupNotifyPage.tsx` | 65 | CRO-onboarding-setup-notify-01 Lv1 | マッチやいいねを見逃さないように。<br /> |
| `frontend/src/pages/SetupNotifyPage.tsx` | 75 | CRO-label-setup-notify-01 Lv1 | いいねが届いたとき |
| `frontend/src/pages/SetupNotifyPage.tsx` | 77 | CRO-label-setup-notify-02 Lv1 | マッチが成立したとき |
| `frontend/src/pages/SetupNotifyPage.tsx` | 79 | CRO-label-setup-notify-03 Lv1 | メッセージが届いたとき |
| `frontend/src/pages/SetupNotifyPage.tsx` | 102 | CRO-banner-setup-notify-01 Lv1 | 設定しました。次へ進む… |
| `frontend/src/pages/SetupNotifyPage.tsx` | 119 | CRO-button-setup-notify-01 Lv1 | 通知をオンにする → / 設定中… |
| `frontend/src/pages/SetupNotifyPage.tsx` | 129 | CRO-button-setup-notify-02 Lv1 | あとで設定する |
| `frontend/src/pages/SetupOptionalPage.tsx` | 198 | CRO-error-setup-optional-02 Lv1 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 243 | CRO-label-setup-optional-01 Lv1 | 縮小 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 254 | CRO-label-setup-optional-02 Lv1 | 拡大 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 263 | CRO-button-setup-optional-01 Lv1 | キャンセル |
| `frontend/src/pages/SetupOptionalPage.tsx` | 272 | CRO-button-setup-optional-02 Lv1 | この写真を使う |
| `frontend/src/pages/SetupOptionalPage.tsx` | 289 | CRO-heading-setup-optional-01 Lv1 | プロフィールを充実させましょう。 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 291 | CRO-label-setup-optional-03 Lv1 | あとで設定することもできます。 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 301 | CRO-heading-setup-optional-02 Lv1 | まずは顔写真を登録しましょう。 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 315 | CRO-label-setup-optional-04 Lv1 | プレビュー |
| `frontend/src/pages/SetupOptionalPage.tsx` | 327 | CRO-button-setup-optional-03 Lv1 | 写真を変える / + 写真を追加 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 330 | CRO-label-setup-optional-05 Lv1 | 写真を設定すると、マッチしやすくなります。 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 347 | CRO-label-setup-optional-06 Lv1 | 必須 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 351 | CRO-placeholder-setup-optional-01 Lv1 | /> |
| `frontend/src/pages/SetupOptionalPage.tsx` | 362 | CRO-label-setup-optional-07 Lv1 | 他のユーザーに表示される名前です |
| `frontend/src/pages/SetupOptionalPage.tsx` | 376 | CRO-heading-setup-optional-03 Lv1 | 自己紹介を書いてみましょう。 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 387 | CRO-heading-setup-optional-04 Lv2 | 書くと盛り上がる話題 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 389 | CRO-onboarding-setup-optional-01 Lv1 | · 趣味や最近ハマってること |
| `frontend/src/pages/SetupOptionalPage.tsx` | 399 | CRO-heading-setup-optional-05 Lv0 | 書かないでほしいこと |
| `frontend/src/pages/SetupOptionalPage.tsx` | 401 | CRO-onboarding-setup-optional-02 Lv0 | · SNSのIDや連絡先（マッチ後に交換しましょう） |
| `frontend/src/pages/SetupOptionalPage.tsx` | 415 | CRO-placeholder-setup-optional-02 Lv1 | /> |
| `frontend/src/pages/SetupOptionalPage.tsx` | 435 | CRO-heading-setup-optional-06 Lv1 | 好きなことを教えてください。 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 442 | CRO-label-setup-optional-09 Lv1 | 今日の一言 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 444 | CRO-placeholder-setup-optional-03 Lv1 | /> |
| `frontend/src/pages/SetupOptionalPage.tsx` | 461 | CRO-heading-setup-optional-07 Lv1 | 最後に、もう少しだけ入力しましょう。 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 468 | CRO-label-setup-optional-10 Lv1 | 所属サークル |
| `frontend/src/pages/SetupOptionalPage.tsx` | 475 | CRO-label-setup-optional-11 Lv1 | 出身地 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 483 | CRO-placeholder-setup-optional-04 Lv1 | 選択してください |
| `frontend/src/pages/SetupOptionalPage.tsx` | 496 | CRO-heading-setup-optional-08 Lv0 | 身バレ防止設定 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 501 | CRO-label-setup-optional-12 Lv0 | 学部・学科の非表示設定 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 503 | CRO-label-setup-optional-13 Lv0 | 同じ学部・学科の人にあなたのプロフィールは表示されず、あなたにも相手のプロフィールは表示されません。お互いに見えなくすることで、身バレを防ぎます。 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 508 | CRO-label-setup-optional-14 Lv0 | 全員に表示する |
| `frontend/src/pages/SetupOptionalPage.tsx` | 510 | CRO-label-setup-optional-15 Lv0 | 同じ学部の人とお互いに見えなくする |
| `frontend/src/pages/SetupOptionalPage.tsx` | 512 | CRO-label-setup-optional-16 Lv0 | 同じ学科の人とお互いに見えなくする |
| `frontend/src/pages/SetupOptionalPage.tsx` | 538 | CRO-label-setup-optional-17 Lv0 | 所属サークルの非表示 |
| `frontend/src/pages/SetupOptionalPage.tsx` | 540 | CRO-label-setup-optional-18 Lv0 | 非表示にしたサークルの同メンバーには表示されなくなります |
| `frontend/src/pages/SetupOptionalPage.tsx` | 600 | CRO-button-setup-optional-04 Lv1 | 次へ → / 送信中… |
| `frontend/src/pages/SetupOptionalPage.tsx` | 609 | CRO-button-setup-optional-05 Lv1 | ← 戻る |
| `frontend/src/pages/SetupOptionalPage.tsx` | 618 | CRO-button-setup-optional-06 Lv1 | スキップ |
| `frontend/src/pages/SetupOptionalPage.tsx` | 639 | CRO-button-setup-optional-07 Lv1 | 設定を保存して始める / 保存中… |
| `frontend/src/pages/SetupOptionalPage.tsx` | 649 | CRO-button-setup-optional-08 Lv1 | ← 戻る |
| `frontend/src/pages/SetupOptionalPage.tsx` | 658 | CRO-button-setup-optional-09 Lv1 | スキップして始める |
| `frontend/src/pages/SetupRequiredPage.tsx` | 78 | CRO-error-setup-required-01 Lv0 | 本名を入力してください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 84 | CRO-error-setup-required-02 Lv0 | 学籍番号を入力してください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 86 | CRO-error-setup-required-03 Lv0 | 英数字のみ有効です |
| `frontend/src/pages/SetupRequiredPage.tsx` | 92 | CRO-error-setup-required-04 Lv0 | 生年月日を入力してください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 95 | CRO-error-setup-required-05 Lv0 | 不正な日付です |
| `frontend/src/pages/SetupRequiredPage.tsx` | 99 | CRO-error-setup-required-06 Lv0 | 存在しない日付です（例: 4月31日など） |
| `frontend/src/pages/SetupRequiredPage.tsx` | 106 | CRO-error-setup-required-07 Lv0 | 18歳以上の方のみご利用いただけます |
| `frontend/src/pages/SetupRequiredPage.tsx` | 108 | CRO-error-setup-required-08 Lv0 | 正しい生年月日を入力してください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 114 | CRO-error-setup-required-09 Lv0 | 学年を選択してください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 120 | CRO-error-setup-required-10 Lv0 | 学部を選択してください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 126 | CRO-error-setup-required-11 Lv0 | 学科を選択してください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 306 | CRO-error-setup-required-12 Lv0 | JPEGまたはPNG形式の画像を選択してください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 311 | CRO-error-setup-required-13 Lv0 | ファイルサイズは5MB以下にしてください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 361 | CRO-error-setup-required-14 Lv0 | この内容では登録できません。お心当たりがない場合はお問い合わせください。 / うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 399 | CRO-heading-setup-required-01 Lv1 | ようこそ、<br />Cro-co へ。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 406 | CRO-onboarding-setup-required-01 Lv1 | 阪大生だけの、本気のマッチングアプリ。<br /> |
| `frontend/src/pages/SetupRequiredPage.tsx` | 411 | CRO-onboarding-setup-required-02 Lv0 | まず本人確認をお願いします。審査には数日いただくことがあります。結果はアプリ内のステータスでご確認いただけます。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 419 | CRO-legal-setup-required-01 Lv0 | ※ Cro-coは現在β版です。正式リリースは2026年10月を予定しています。β版は完全無料です。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 431 | CRO-button-setup-required-01 Lv1 | はじめる → |
| `frontend/src/pages/SetupRequiredPage.tsx` | 445 | CRO-heading-setup-required-02 Lv1 | あなたについて教えてください。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 453 | CRO-label-setup-required-01 Lv1 | 必須 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 475 | CRO-error-setup-required-15 Lv0 | 性別を選択してください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 481 | CRO-label-setup-required-02 Lv1 | 必須 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 501 | CRO-error-setup-required-16 Lv0 | 好みを選択してください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 506 | CRO-confirm-setup-required-01 Lv0 | ※ 一度設定すると変更できません。慎重に選んでください。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 528 | CRO-button-setup-required-02 Lv1 | 次へ → |
| `frontend/src/pages/SetupRequiredPage.tsx` | 536 | CRO-button-setup-required-03 Lv1 | ← 戻る |
| `frontend/src/pages/SetupRequiredPage.tsx` | 550 | CRO-heading-setup-required-03 Lv0 | 本名と生年月日を教えてください。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 566 | CRO-placeholder-setup-required-01 Lv0 | 本名を入力してください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 574 | CRO-label-setup-required-03 Lv0 | 審査にのみ使用します。他のユーザーには表示されません。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 576 | CRO-confirm-setup-required-02 Lv0 | ※ 承認後は変更できません。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 581 | CRO-label-setup-required-04 Lv0 | 必須 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 598 | CRO-confirm-setup-required-03 Lv0 | ※ 承認後は変更できません。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 619 | CRO-button-setup-required-04 Lv1 | 次へ → |
| `frontend/src/pages/SetupRequiredPage.tsx` | 627 | CRO-button-setup-required-05 Lv1 | ← 戻る |
| `frontend/src/pages/SetupRequiredPage.tsx` | 641 | CRO-heading-setup-required-04 Lv0 | 学籍情報を入力してください。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 660 | CRO-placeholder-setup-required-02 Lv0 | 例：B12345678 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 669 | CRO-label-setup-required-05 Lv0 | 他のユーザーには表示されません。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 671 | CRO-confirm-setup-required-04 Lv0 | ※ 承認後は変更できません。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 676 | CRO-label-setup-required-06 Lv1 | 必須 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 695 | CRO-label-setup-required-07 Lv1 | ※ 学年は後から変更できます。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 719 | CRO-label-setup-required-08 Lv1 | ほかのユーザーに見えないように設定できます（設定画面から変更可能）。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 721 | CRO-confirm-setup-required-05 Lv0 | ※ 承認後は変更できません。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 742 | CRO-button-setup-required-06 Lv1 | 次へ → |
| `frontend/src/pages/SetupRequiredPage.tsx` | 750 | CRO-button-setup-required-07 Lv1 | ← 戻る |
| `frontend/src/pages/SetupRequiredPage.tsx` | 764 | CRO-heading-setup-required-05 Lv0 | 学生証を撮影して<br />アップロードしてください。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 768 | CRO-onboarding-setup-required-03 Lv0 | 顔と学生証が両方写るように撮影してください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 795 | CRO-label-setup-required-09 Lv1 | タップして選択 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 797 | CRO-label-setup-required-10 Lv0 | JPG / PNG・5MB以下 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 802 | CRO-error-setup-required-17 Lv0 | 学生証画像を選択してください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 822 | CRO-onboarding-setup-required-04 Lv0 | 顔と学生証が両方写っている写真が必要です。学生証の文字が読めるよう鮮明に撮影してください。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 847 | CRO-button-setup-required-08 Lv1 | 次へ → |
| `frontend/src/pages/SetupRequiredPage.tsx` | 855 | CRO-button-setup-required-09 Lv1 | ← 戻る |
| `frontend/src/pages/SetupRequiredPage.tsx` | 870 | CRO-heading-setup-required-06 Lv0 | 再申請 / 内容を確認してください。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 886 | CRO-banner-setup-required-01 Lv0 | 審査が却下されました |
| `frontend/src/pages/SetupRequiredPage.tsx` | 956 | CRO-button-setup-required-10a Lv1 | 性別を修正 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 965 | CRO-button-setup-required-10b Lv1 | 本名・生年月日を修正 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 974 | CRO-button-setup-required-10c Lv1 | 学籍番号・学年・学部学科を修正 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 1012 | CRO-button-setup-required-10d Lv1 | 学生証を変更 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 1051 | CRO-label-setup-required-09 Lv1 | タップして選択 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 1053 | CRO-label-setup-required-10 Lv0 | JPG / PNG・5MB以下 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 1058 | CRO-error-setup-required-17 Lv0 | 学生証画像を選択してください |
| `frontend/src/pages/SetupRequiredPage.tsx` | 1071 | CRO-onboarding-setup-required-05 Lv0 | 顔と学生証が両方写っていること |
| `frontend/src/pages/SetupRequiredPage.tsx` | 1083 | CRO-confirm-setup-required-06 Lv0 | 入力した情報は学生証と照合して確認します。承認後、本名・学籍番号・生年月日・学部学科は変更できません。 |
| `frontend/src/pages/SetupRequiredPage.tsx` | 1110 | CRO-button-setup-required-11 Lv0 | 確認のため提出する |
| `frontend/src/pages/SetupRequiredPage.tsx` | 1119 | CRO-button-setup-required-12 Lv1 | ← 戻る |
| `frontend/src/pages/SetupThanksPage.tsx` | 18 | CRO-label-setup-thanks-01 Lv0 | 提出完了 |
| `frontend/src/pages/SetupThanksPage.tsx` | 21 | CRO-heading-setup-thanks-01 Lv0 | ありがとうございます。 |
| `frontend/src/pages/SetupThanksPage.tsx` | 30 | CRO-onboarding-setup-thanks-01 Lv0 | 本人確認の申請を受け付けました。審査には数日いただくことがあります。結果はアプリ内のステータスでご確認いただけます。 |
| `frontend/src/pages/SetupThanksPage.tsx` | 38 | CRO-onboarding-setup-thanks-02 Lv1 | 審査を待つ間に、プロフィールを充実させましょう。 |
| `frontend/src/pages/SetupThanksPage.tsx` | 54 | CRO-button-setup-thanks-01 Lv1 | プロフィールを入力する → |
| `frontend/src/pages/SignupPage.tsx` | 20 | CRO-heading-signup-01 Lv1 | 新規登録 |
| `frontend/src/pages/SignupPage.tsx` | 39 | CRO-error-signup-01 Lv0 | 18歳以上であることの確認が必要です。 |
| `frontend/src/pages/SignupPage.tsx` | 45 | CRO-error-signup-02 Lv0 | 利用規約とプライバシーポリシーへの同意が必要です。 |
| `frontend/src/pages/SignupPage.tsx` | 66 | CRO-error-signup-03 Lv0 | うまくいきませんでした。もう一度お試しください。 |
| `frontend/src/pages/SignupPage.tsx` | 81 | CRO-heading-signup-02 Lv2 | はじめまして。 |
| `frontend/src/pages/SignupPage.tsx` | 83 | CRO-label-signup-01 Lv1 | 大阪大学限定マッチングアプリ |
| `frontend/src/pages/SignupPage.tsx` | 92 | CRO-banner-signup-01 Lv0 | 確認メールを送信しました。 |
| `frontend/src/pages/SignupPage.tsx` | 94 | CRO-banner-signup-02 Lv0 | メールのリンクをクリックして登録を完了してください。その後、学生証をアップロードして本人確認を行ってください。 |
| `frontend/src/pages/SignupPage.tsx` | 108 | CRO-label-signup-02 Lv1 | 必須 |
| `frontend/src/pages/SignupPage.tsx` | 110 | CRO-placeholder-signup-01 Lv1 | /> |
| `frontend/src/pages/SignupPage.tsx` | 123 | CRO-label-signup-03 Lv1 | 必須 |
| `frontend/src/pages/SignupPage.tsx` | 126 | CRO-placeholder-signup-02 Lv1 | text / password |
| `frontend/src/pages/SignupPage.tsx` | 140 | CRO-label-signup-04 Lv1 | パスワードを隠す / パスワードを表示する |
| `frontend/src/pages/SignupPage.tsx` | 150 | CRO-banner-signup-03 Lv0 | 18歳未満の方は登録・利用できません。 |
| `frontend/src/pages/SignupPage.tsx` | 166 | CRO-confirm-signup-01 Lv0 | 18歳以上であることを確認しました（必須） |
| `frontend/src/pages/SignupPage.tsx` | 179 | CRO-confirm-signup-02 Lv0 | 利用規約 |
| `frontend/src/pages/SignupPage.tsx` | 192 | CRO-confirm-signup-03 Lv0 | プライバシーポリシー |
| `frontend/src/pages/SignupPage.tsx` | 207 | CRO-confirm-signup-04 Lv0 | アクセス解析に協力する（任意） |
| `frontend/src/pages/SignupPage.tsx` | 210 | CRO-confirm-signup-05 Lv0 | プライバシーポリシー |
| `frontend/src/pages/SignupPage.tsx` | 223 | CRO-button-signup-01 Lv1 | アカウントを作る / 処理中… |
| `frontend/src/pages/SignupPage.tsx` | 230 | CRO-button-signup-02 Lv1 | すでにアカウントがある → ログイン |
| `frontend/src/pages/SignupPage.tsx` | 235 | CRO-label-signup-05 Lv1 | @ecs.osaka-u.ac.jp のみ登録可能 |
| `frontend/src/pages/TermsOfServicePage.tsx` | 61 | CRO-button-terms-back-01 Lv0 | 戻る |
| `frontend/src/pages/TermsOfServicePage.tsx` | 68 | CRO-heading-terms-01 Lv0 | 利用規約 |
| `frontend/src/pages/TermsOfServicePage.tsx` | 74 | CRO-label-terms-effective-01 Lv0 | 施行日: 2026年6月18日 |
| `frontend/src/pages/TermsOfServicePage.tsx` | 79 | CRO-legal-terms-body-all Lv0 法的条文・文言変更禁止 | 本利用規約（以下「本規約」といいます）は、マッチングサービス「Cro-co」（以下「本サービス」といいます）の提供条件および本サービスの運営者（以下「運営者」といいます）と利用者との間の権利義務関係を定めるものです。 |
