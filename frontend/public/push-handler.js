// Cro-co Push Notification Handler
// IMPORTANT: userVisibleOnly: true 設定下では
// 全 push イベントで必ず showNotification を呼ぶ必要がある

self.addEventListener('push', (event) => {
  let payload = {
    // @copy CRO-push-sw-default-title-01 Lv0
    title: 'Cro-co',
    // @copy CRO-push-sw-default-body-01 Lv1
    body: '新しい通知があります',
    url: '/',
  }

  if (event.data) {
    try {
      const parsed = event.data.json()
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || payload.body,
        url: parsed.url || payload.url,
      }
    } catch (e) {
      payload.body = event.data.text() || payload.body
    }
  }

  // 必ず通知を表示する（フォアグラウンド判定はしない）
  // タグは毎回ユニークにして通知が消えないようにする
  const notificationPromise = self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    tag: `croco-${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    data: { url: payload.url },
    vibrate: [200, 100, 200],
  })

  event.waitUntil(notificationPromise)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 既存のウィンドウがあればフォーカス
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            if ('focus' in client) {
              client.focus()
              if ('navigate' in client) {
                client.navigate(targetUrl).catch(() => {})
              }
              return
            }
          }
        }
        // なければ新しいウィンドウで開く
        if (clients.openWindow) {
          return clients.openWindow(targetUrl)
        }
      })
  )
})

// SW がインストールされたら即座にアクティブ化
self.addEventListener('install', () => {
  self.skipWaiting()
})

// アクティブ化されたら即座に全クライアントを制御
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
