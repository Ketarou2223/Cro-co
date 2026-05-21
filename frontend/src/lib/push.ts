import api from '@/lib/api'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export async function subscribePush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  try {
    const registration = await navigator.serviceWorker.ready

    const { data } = await api.get<{ public_key: string }>('/api/push/vapid-public-key')
    const applicationServerKey = urlBase64ToUint8Array(data.public_key)

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      })
    }

    const json = subscription.toJSON()
    await api.post('/api/push/subscribe', {
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    })

    return true
  } catch (e) {
    console.error('Push購読失敗:', e)
    return false
  }
}

export async function unsubscribePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  try {
    await api.delete(`/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`)
    await subscription.unsubscribe()
  } catch (e) {
    console.error('Push購読解除失敗:', e)
  }
}

export async function unsubscribeAllPush(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) await subscription.unsubscribe()
  }
  await api.delete('/api/push/subscribe/all')
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}
