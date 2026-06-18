// 解説: このファイルは PWA インストール・更新の状態を管理するカスタムフックを提供する。
// 解説: 呼ばれる場所: PWAInstallBanner.tsx / PWAUpdateBanner.tsx でインストール促進 UI の表示制御に使う
// 解説: PWA = Progressive Web App。ホーム画面に追加してネイティブアプリ風に使える
// 解説: BeforeInstallPromptEvent = Chrome/Edge のみのインストールプロンプトイベント
//   public/pwa-handler.js で window.__pwaInstallPrompt に保存してからこのフックで参照する
// 解説: useRegisterSW = vite-plugin-pwa が提供するフック。Service Worker の登録・更新検知を行う

import { useRegisterSW } from 'virtual:pwa-register/react'
import { useState, useEffect } from 'react'

// 解説: BeforeInstallPromptEvent = Web 標準仕様外の Chrome 拡張イベント（@types に含まれないため自前定義）
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// 解説: usePWAInstall() = インストール可否・更新有無・インストール実行関数を返すカスタムフック
export function usePWAInstall() {
  // 解説: installPrompt = BeforeInstallPromptEvent を保持する（null = インストール不可）
  //   () => ... の形（lazy initializer）= 初回レンダリング時のみ実行する初期値関数
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => ((window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null) || null
  )
  // 解説: isInstalled = ホーム画面に追加済みかどうか（window.__pwaInstalled で判定）
  const [isInstalled, setIsInstalled] = useState<boolean>(
    () => Boolean((window as any).__pwaInstalled)
  )

  // 解説: useRegisterSW = Service Worker を登録し、新バージョンがあるかを監視する
  const { needRefresh: needRefreshState, updateServiceWorker } = useRegisterSW({
    onRegistered(registration) { console.log('SW registered:', registration) },
    onRegisterError(error) { console.error('SW registration error:', error) },
  })
  // 解説: needRefresh = true のとき新バージョンの Service Worker が待機中（ページリロードで適用）
  const [needRefresh] = needRefreshState

  // 解説: pwa-prompt-ready / pwa-installed イベントを監視してインストール状態を更新する
  useEffect(() => {
    // 解説: pwa-prompt-ready = public/pwa-handler.js が BeforeInstallPromptEvent を受け取ったとき発火
    const onReady = () => {
      setInstallPrompt(((window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null) || null)
    }
    // 解説: pwa-installed = ユーザーがホーム画面に追加した後に発火
    const onInstalled = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
    }
    window.addEventListener('pwa-prompt-ready', onReady)
    window.addEventListener('pwa-installed', onInstalled)
    // 解説: クリーンアップでイベントリスナーを削除（メモリリーク防止）
    return () => {
      window.removeEventListener('pwa-prompt-ready', onReady)
      window.removeEventListener('pwa-installed', onInstalled)
    }
  }, [])

  // 解説: install() = インストールプロンプトを表示してユーザーの応答を返す
  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const prompt = ((window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null) || null
    if (!prompt) return 'unavailable'
    // 解説: prompt.prompt() = Chrome が表示するインストール確認ダイアログを開く
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    // 解説: 一度使ったプロンプトは再利用できないため null に破棄する
    ;(window as any).__pwaInstallPrompt = null
    setInstallPrompt(null)
    return outcome
  }

  return {
    // 解説: canInstall = インストールバナーを表示するかどうかの判定値
    canInstall: !!installPrompt && !isInstalled,
    install,
    needRefresh,
    updateServiceWorker,
  }
}
