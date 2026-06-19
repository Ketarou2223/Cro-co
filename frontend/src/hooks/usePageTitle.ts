// 解説: このファイルはブラウザのタブタイトルを動的に変更するカスタムフックを提供する。
// 解説: 呼ばれる場所: 各ページコンポーネント（例: BrowsePage.tsx, ChatPage.tsx 等）の冒頭で呼ぶ
// 解説: useEffect = React のサイドエフェクト実行フック（DOM 操作など React の描画外の処理）

import { useEffect } from 'react'

// 解説: usePageTitle(title) = title が変わると document.title を「{title} | Cro-co」に変更する
export function usePageTitle(title: string) {
  useEffect(() => {
    // 解説: title が空文字のときは「Cro-co」だけにする
    document.title = title ? `${title} | Cro-co` : 'Cro-co'
    // 解説: クリーンアップ関数 = コンポーネントがアンマウント（画面から外れる）したときに元のタイトルに戻す
    return () => { document.title = 'Cro-co' }
  }, [title])
}
