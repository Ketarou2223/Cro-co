import { useRegisterSW } from 'virtual:pwa-register/react'
import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  const { needRefresh: needRefreshState, updateServiceWorker } = useRegisterSW({
    onRegistered(registration) {
      console.log('SW registered:', registration)
    },
    onRegisterError(error) {
      console.error('SW registration error:', error)
    },
  })
  const [needRefresh] = needRefreshState

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const installed = () => setIsInstalled(true)
    window.addEventListener('appinstalled', installed)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setInstallPrompt(null)
  }

  return {
    canInstall: !!installPrompt && !isInstalled,
    install,
    needRefresh,
    updateServiceWorker,
  }
}
