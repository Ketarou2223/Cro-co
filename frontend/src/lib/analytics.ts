// 解説: このファイルは Google Analytics 4（GA4）の初期化・イベント送信を管理するユーティリティを提供する。
// 解説: 呼ばれる場所: main.tsx（起動時・自動初期化）/ SettingsPage.tsx（同意 ON/OFF 切り替え）
//   / App.tsx（ページビュー送信）/ 各ページ（イベント送信）
// 解説: 設計: ユーザーの明示的な同意（getConsent() = true）がある場合のみ初期化・送信する（GDPR 対応）
// 解説: GA_ID = VITE_GA_MEASUREMENT_ID 環境変数から読む（未設定なら GA を無効化）

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) || undefined
// 解説: CONSENT_KEY = localStorage に同意フラグを保存するためのキー
const CONSENT_KEY = 'croco_analytics_consent'

// 解説: initialized = GA がすでに初期化済みかどうかを保持するモジュールスコープ変数
let initialized = false

// 解説: getConsent() = localStorage の同意フラグを読む（'true' の文字列と比較）
export function getConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'true'
}

// 解説: setConsent(value) = 同意フラグを localStorage に保存し、ON なら GA を初期化する
export function setConsent(value: boolean): void {
  localStorage.setItem(CONSENT_KEY, value ? 'true' : 'false')
  if (value) {
    initGA()
  } else {
    initialized = false
    // 公式手段: 現在のセッションで即時 GA 無効化
    if (GA_ID) {
      (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = true
    }
    // best-effort: GA セッション Cookie を削除
    document.cookie.split(';').forEach((c) => {
      const name = c.trim().split('=')[0]
      if (name.startsWith('_ga')) {
        // 解説: expires を過去日にすることで Cookie を即時削除する
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=.${location.hostname};path=/`
      }
    })
  }
}

// 解説: gaGtag = window.dataLayer に gtag コマンドをプッシュするラッパー
function gaGtag(...args: unknown[]): void {
  window.dataLayer.push(args)
}

// 解説: initGA() = Google Tag Manager スクリプトを動的に追加して GA4 を初期化する
//   条件: 初期化済み / GA_ID 未設定 / 本番環境以外 / 同意なし → いずれかで早期リターン
export function initGA(): void {
  if (initialized) return
  if (!GA_ID) return
  // 解説: import.meta.env.PROD = Vite の本番フラグ（dev サーバーでは false）
  if (!import.meta.env.PROD) return
  if (!getConsent()) return

  const script = document.createElement('script')
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  script.async = true
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  window.gtag = gaGtag
  window.gtag('js', new Date())
  window.gtag('config', GA_ID)

  initialized = true
}

// 解説: trackPageview(path) = GA4 にページビューを送信する（ルーター切り替え時に呼ぶ）
export function trackPageview(path: string): void {
  if (!initialized || !GA_ID) return
  window.gtag('config', GA_ID, { page_path: path })
}

// 解説: trackEvent(name, params) = GA4 にカスタムイベントを送信する
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!initialized) return
  window.gtag('event', name, params)
}

// 起動時: 既に同意済みなら自動初期化
initGA()
