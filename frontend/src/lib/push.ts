// 解説: このファイルはブラウザの Web Push 通知の購読・解除を管理するユーティリティを提供する。
// 解説: 呼ばれる場所: SetupNotifyPage.tsx / SettingsPage.tsx でプッシュ通知の ON/OFF を切り替えるときに呼ぶ
// 解説: Web Push の全体の流れ:
//   1. ブラウザが VAPID 公開鍵を取得（/api/push/vapid-public-key）
//   2. ブラウザが PushManager.subscribe() で購読を作成する
//   3. 購読情報（endpoint, p256dh, auth）をバックエンドに送って保存する
//   4. バックエンドがプッシュを送りたいとき VAPID 秘密鍵を使って暗号化・送信する
// 解説: VAPID = Web Push に使う公開鍵・秘密鍵ペア（バックエンドの push.py で設定）

import api from '@/lib/api'

// 解説: urlBase64ToUint8Array = VAPID 公開鍵（URL-safe Base64 文字列）を Uint8Array に変換する
//   PushManager.subscribe() の applicationServerKey に Uint8Array が必要なため
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // 解説: Base64 は 4 文字ごとのブロックなので、不足分をパディング（=）で補う
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  // 解説: URL-safe Base64（- と _）を通常 Base64（+ と /）に変換してから atob でデコード
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

// 解説: subscribePush() = プッシュ通知を購読する（通知許可 → VAPID 取得 → 購読登録の流れ）
export async function subscribePush(): Promise<boolean> {
  // 解説: ServiceWorker と PushManager が使えないブラウザ（Safari 旧版等）は即 false を返す
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  // 解説: requestPermission() = ブラウザの通知許可ダイアログを表示して結果を待つ
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  try {
    // 解説: serviceWorker.ready = Service Worker が登録・起動完了するまで待つ（Promise）
    const registration = await navigator.serviceWorker.ready

    // 解説: VAPID 公開鍵をバックエンドから取得する
    const { data } = await api.get<{ public_key: string }>('/api/push/vapid-public-key')
    const applicationServerKey = urlBase64ToUint8Array(data.public_key)

    // 既存購読を一度解除して新規購読する（VAPIDキー不一致対策）
    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      await existing.unsubscribe()
    }

    // 解説: pushManager.subscribe() = ブラウザが Push サービス（Firebase 等）に購読を登録する
    //   userVisibleOnly: true = 通知なしの「サイレントプッシュ」を禁止する（必須）
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    })

    // 解説: subscription.toJSON() = 購読情報を plain object に変換する（endpoint + keys を含む）
    const json = subscription.toJSON()
    // 解説: 購読情報をバックエンドに送って push_subscriptions テーブルに保存する
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

// 解説: unsubscribePush() = このデバイスのプッシュ通知購読を解除する
export async function unsubscribePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  try {
    // 解説: バックエンドの購読レコードを削除してから、ブラウザ側の購読も解除する（順番が重要）
    await api.delete(`/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`)
    await subscription.unsubscribe()
  } catch (e) {
    console.error('Push購読解除失敗:', e)
  }
}

// 解説: unsubscribeAllPush() = このユーザーの全デバイスの購読を一括解除する（ログアウト時に使う）
export async function unsubscribeAllPush(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    // 解説: まずブラウザ側の購読を解除する
    if (subscription) await subscription.unsubscribe()
  }
  // 解説: バックエンドに DELETE /api/push/subscribe/all を送り、DB の全購読レコードを削除する
  await api.delete('/api/push/subscribe/all')
}

// 解説: isPushSubscribed() = 現在このデバイスが購読済みかどうかを返す
export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.getSubscription()
    // 解説: !! = null/undefined を false に、オブジェクトを true に変換する
    return !!sub
  } catch {
    return false
  }
}
