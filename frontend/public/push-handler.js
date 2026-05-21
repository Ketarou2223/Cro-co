self.addEventListener('push', (event) => {
  let payload = { title: 'Cro-co', body: '新しい通知があります', url: '/' }

  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'croco-notification',
      renotify: true,
      data: { url: payload.url || '/' },
      vibrate: [100, 50, 100],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus()
            return client.navigate(url)
          }
        }
        if (clients.openWindow) return clients.openWindow(url)
      })
  )
})
