// 解説: このファイルは React アプリのエントリポイント（一番最初に実行されるファイル）。
// 解説: 呼ばれる場所: Vite がビルド時に index.html から <script type="module"> として読み込む
// 解説: 処理の流れ:
//   1. PWA インストールプロンプトをグローバルにキャプチャ（React より前に実行）
//   2. TanStack Query クライアントを設定する
//   3. Supabase の認証状態変化を監視してキャッシュを管理する
//   4. React ツリーをルート DOM ノードにレンダリングする
// 解説: QueryClient = TanStack Query のキャッシュ管理の中心（全クエリのキャッシュを一元管理）
// 解説: ToastProvider = トースト通知を全ページで使えるようにするコンテキストプロバイダー
// 解説: ErrorBoundary = React ツリー内で例外が発生したときキャッチして代替 UI を表示するクラスコンポーネント

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { defaultRetry } from './lib/queryRetry'
import { ToastProvider } from './contexts/ToastContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import './index.css'
import App from './App.tsx'

// PWA install prompt はライフサイクル中に1回しか発火しないため
// React より前にグローバルキャプチャする
// 解説: window.__pwaInstallPrompt = BeforeInstallPromptEvent を保持するグローバル変数
;(window as any).__pwaInstallPrompt = null
;(window as any).__pwaInstalled = false

// 解説: beforeinstallprompt = Chrome/Edge がインストールバナーを表示しようとしたときに発火するイベント
//   e.preventDefault() でデフォルト表示を抑制し、タイミングを自分で制御する
window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault()
  ;(window as any).__pwaInstallPrompt = e
  // 解説: pwa-prompt-ready カスタムイベントで usePWAInstall フックに通知する
  window.dispatchEvent(new CustomEvent('pwa-prompt-ready'))
})

// 解説: appinstalled = ユーザーがホーム画面に追加した後に発火するイベント
window.addEventListener('appinstalled', () => {
  ;(window as any).__pwaInstallPrompt = null
  ;(window as any).__pwaInstalled = true
  window.dispatchEvent(new CustomEvent('pwa-installed'))
})

// 解説: display-mode: standalone = PWA としてインストール済みで起動した場合も installed として扱う
if (window.matchMedia('(display-mode: standalone)').matches) {
  ;(window as any).__pwaInstalled = true
}

// 解説: QueryClient の設定（全クエリのデフォルト挙動を定義する）
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 解説: staleTime = 30秒間はデータを「新鮮」とみなす（再フェッチしない）
      staleTime: 30 * 1000,
      // 解説: gcTime = 5分間キャッシュを保持する（使われなくなってから 5 分後に削除）
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: defaultRetry,
    },
    mutations: {
      // 解説: mutations（データ変更）は失敗してもリトライしない（冪等性が保証できないため）
      retry: 0,
    },
  },
})

// 解説: ユーザーの切り替えを検出してキャッシュをクリアするための前ユーザー ID 保持変数
let previousUserId: string | null = null

// 解説: onAuthStateChange = Supabase の認証状態変化を監視するリスナー（ログイン・ログアウト・トークン更新）
supabase.auth.onAuthStateChange((event, session) => {
  const currentUserId = session?.user?.id ?? null

  if (event === 'TOKEN_REFRESHED') {
    // トークンリフレッシュ時はキャッシュを保持しつつ再フェッチ
    queryClient.invalidateQueries()
    return
  }

  if (previousUserId && currentUserId !== previousUserId) {
    // ユーザーが切り替わった時のみ全キャッシュをクリア
    // 解説: clear() = 全キャッシュを削除する（別ユーザーのデータが見えないようにする）
    queryClient.clear()
  }

  previousUserId = currentUserId
})

// 解説: createRoot = React 18 のルート作成 API（React ツリーを DOM に接続する）
createRoot(document.getElementById('root')!).render(
  {/* 解説: ErrorBoundary = 最外殻で未処理の例外をキャッチして白画面を防ぐ */}
  <ErrorBoundary>
    {/* 解説: StrictMode = 開発時に副作用の二重実行等で潜在的バグを検出するモード */}
    <StrictMode>
      {/* 解説: QueryClientProvider = 全コンポーネントから queryClient を参照できるようにする */}
      <QueryClientProvider client={queryClient}>
        {/* 解説: ToastProvider = useToast() フックで全ページからトースト通知を表示できるようにする */}
        <ToastProvider>
          <App />
        </ToastProvider>
      </QueryClientProvider>
    </StrictMode>
  </ErrorBoundary>,
)
