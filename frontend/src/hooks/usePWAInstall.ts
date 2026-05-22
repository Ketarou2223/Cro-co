import { useRegisterSW } from 'virtual:pwa-register/react'
import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => ((window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null) || null
  )
  const [isInstalled, setIsInstalled] = useState<boolean>(
    () => Boolean((window as any).__pwaInstalled)
  )

  const { needRefresh: needRefreshState, updateServiceWorker } = useRegisterSW({
    onRegistered(registration) { console.log('SW registered:', registration) },
    onRegisterError(error) { console.error('SW registration error:', error) },
  })
  const [needRefresh] = needRefreshState

  useEffect(() => {
    const onReady = () => {
      setInstallPrompt(((window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null) || null)
    }
    const onInstalled = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
    }
    window.addEventListener('pwa-prompt-ready', onReady)
    window.addEventListener('pwa-installed', onInstalled)
    return () => {
      window.removeEventListener('pwa-prompt-ready', onReady)
      window.removeEventListener('pwa-installed', onInstalled)
    }
  }, [])

  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const prompt = ((window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null) || null
    if (!prompt) return 'unavailable'
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    ;(window as any).__pwaInstallPrompt = null
    setInstallPrompt(null)
    return outcome
  }

  return {
    canInstall: !!installPrompt && !isInstalled,
    install,
    needRefresh,
    updateServiceWorker,
  }
}
