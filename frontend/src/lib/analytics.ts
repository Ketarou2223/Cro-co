declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) || undefined
const CONSENT_KEY = 'croco_analytics_consent'

let initialized = false

export function getConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'true'
}

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
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=.${location.hostname};path=/`
      }
    })
  }
}

function gaGtag(...args: unknown[]): void {
  window.dataLayer.push(args)
}

export function initGA(): void {
  if (initialized) return
  if (!GA_ID) return
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

export function trackPageview(path: string): void {
  if (!initialized || !GA_ID) return
  window.gtag('config', GA_ID, { page_path: path })
}

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!initialized) return
  window.gtag('event', name, params)
}

// 起動時: 既に同意済みなら自動初期化
initGA()
