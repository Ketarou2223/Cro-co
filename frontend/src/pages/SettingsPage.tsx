import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ban, Bell, Info, LogOut, Shield, Trash2, User } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { supabase } from '@/lib/supabase'

interface ProfileMe {
  email: string
  show_online_status: boolean
}

interface BlockedUser {
  id: string
  name: string | null
  avatar_url: string | null
}

export default function SettingsPage() {
  usePageTitle('設定')
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileMe | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [onlineToggling, setOnlineToggling] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [loadingBlocks, setLoadingBlocks] = useState(true)
  const [unblocking, setUnblocking] = useState<string | null>(null)
  const [notifEnabled, setNotifEnabled] = useState(
    localStorage.getItem('notification-enabled') === 'true'
  )
  const [notifDenied, setNotifDenied] = useState(false)

  useEffect(() => {
    api.get<ProfileMe>('/api/profile/me').then((res) => {
      setProfile({ email: res.data.email, show_online_status: res.data.show_online_status })
    }).catch(() => {})

    api.get<BlockedUser[]>('/api/safety/blocks')
      .then((res) => setBlockedUsers(res.data))
      .catch(() => {})
      .finally(() => setLoadingBlocks(false))
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const handleOnlineToggle = async (checked: boolean) => {
    if (!profile) return
    setOnlineToggling(true)
    try {
      await api.patch('/api/profile/me', { show_online_status: checked })
      setProfile((p) => p ? { ...p, show_online_status: checked } : p)
    } catch {
      // サイレントに無視
    } finally {
      setOnlineToggling(false)
    }
  }

  const handleNotifToggle = async (checked: boolean) => {
    if (checked) {
      if (!('Notification' in window)) return
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        localStorage.setItem('notification-enabled', 'true')
        setNotifEnabled(true)
        setNotifDenied(false)
      } else {
        setNotifDenied(true)
        setNotifEnabled(false)
      }
    } else {
      localStorage.removeItem('notification-enabled')
      setNotifEnabled(false)
      setNotifDenied(false)
    }
  }

  const handleUnblock = async (userId: string) => {
    setUnblocking(userId)
    try {
      await api.delete(`/api/safety/block/${userId}`)
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch {
      // silently ignore
    } finally {
      setUnblocking(null)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete('/api/profile/me')
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    } catch {
      setDeleteError('削除に失敗しました。再度お試しください。')
      setDeleting(false)
    }
  }

  return (
    <Layout>
      <div className="px-4 py-6 space-y-4 pb-24">
        <h1 className="font-display text-4xl text-ink">設定</h1>

        {/* アカウント情報 */}
        <div className="card-bold bg-white p-4 space-y-3">
          <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-flex items-center gap-1.5 uppercase tracking-wide">
            <User className="w-3 h-3" />
            アカウント情報
          </h2>
          <div className="space-y-0.5">
            <p className="font-mono text-xs text-ink/50">メールアドレス</p>
            <p className="text-sm font-medium text-ink">{profile?.email ?? '読み込み中...'}</p>
          </div>
          <Button variant="outline-bold" size="sm" asChild>
            <Link to="/profile/edit">プロフィールを編集する</Link>
          </Button>
        </div>

        {/* プライバシー設定 */}
        <div className="card-bold bg-white p-4 space-y-3">
          <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-flex items-center gap-1.5 uppercase tracking-wide">
            <Shield className="w-3 h-3" />
            プライバシー設定
          </h2>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5 flex-1">
              <p className="text-sm font-medium text-ink">オンライン状態を表示する</p>
              <p className="font-mono text-xs text-ink/50 leading-relaxed">
                オフにすると、他のユーザーにあなたの最終ログイン時刻が表示されなくなります
              </p>
            </div>
            <Switch
              checked={profile?.show_online_status ?? true}
              onCheckedChange={handleOnlineToggle}
              disabled={onlineToggling || profile === null}
            />
          </div>
        </div>

        {/* 通知設定 */}
        <div className="card-bold bg-white p-4 space-y-3">
          <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-flex items-center gap-1.5 uppercase tracking-wide">
            <Bell className="w-3 h-3" />
            通知設定
          </h2>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5 flex-1">
              <p className="text-sm font-medium text-ink">ブラウザ通知を受け取る</p>
              <p className="font-mono text-xs text-ink/50 leading-relaxed">
                新しいメッセージが届いたときに通知します
              </p>
            </div>
            <Switch
              checked={notifEnabled}
              onCheckedChange={handleNotifToggle}
            />
          </div>
          {notifDenied && (
            <p className="font-mono text-xs text-destructive leading-relaxed">
              通知が拒否されています。ブラウザの設定から通知を許可してください。
            </p>
          )}
        </div>

        {/* ブロックリスト */}
        <div className="card-bold bg-white p-4 space-y-3">
          <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-flex items-center gap-1.5 uppercase tracking-wide">
            <Ban className="w-3 h-3" />
            ブロックリスト
          </h2>
          {loadingBlocks ? (
            <p className="font-mono text-sm text-ink/50">読み込み中...</p>
          ) : blockedUsers.length === 0 ? (
            <p className="font-mono text-sm text-ink/50">ブロックしているユーザーはいません</p>
          ) : (
            blockedUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted overflow-hidden border-2 border-ink shrink-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.name ?? ''} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-ink">{u.name ?? '（名前未設定）'}</span>
                </div>
                <Button
                  variant="outline-bold"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handleUnblock(u.id)}
                  disabled={unblocking === u.id}
                >
                  {unblocking === u.id ? '処理中...' : '解除'}
                </Button>
              </div>
            ))
          )}
        </div>

        {/* アプリ情報 */}
        <div className="card-bold bg-white p-4 space-y-3">
          <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-flex items-center gap-1.5 uppercase tracking-wide">
            <Info className="w-3 h-3" />
            アプリ情報
          </h2>
          <div className="flex justify-between text-sm">
            <span className="font-mono text-ink/50">バージョン</span>
            <span className="font-mono font-bold text-ink">v1.0.0</span>
          </div>
          <div className="flex gap-4 text-sm">
            <Link to="/terms" className="text-ink underline underline-offset-2 hover:text-ink/70">利用規約</Link>
            <Link to="/privacy" className="text-ink underline underline-offset-2 hover:text-ink/70">プライバシーポリシー</Link>
          </div>
          <div className="space-y-0.5">
            <p className="font-mono text-xs text-ink/50">お問い合わせ</p>
            <p className="font-mono text-sm text-ink">cro-co.support@ecs.osaka-u.ac.jp</p>
          </div>
        </div>

        {/* ログアウト */}
        <div className="card-bold bg-white p-4">
          <Button
            variant="outline-bold"
            className="w-full gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            ログアウト
          </Button>
        </div>

        {/* アカウント削除 */}
        <div className="card-bold bg-white p-4 space-y-3" style={{ borderColor: '#ef4444', boxShadow: '4px 4px 0 0 #ef4444' }}>
          <h2 className="font-mono text-xs font-bold bg-red-500 text-white px-3 py-1 inline-flex items-center gap-1.5 uppercase tracking-wide">
            <Trash2 className="w-3 h-3" />
            アカウントを削除する
          </h2>
          <p className="font-mono text-xs text-ink/50 leading-relaxed">
            削除すると、プロフィール・写真・マッチ・メッセージなどすべてのデータが完全に消去され、元に戻すことができません。
          </p>

          {deleteError && (
            <p className="font-mono text-sm text-destructive">{deleteError}</p>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="border-2 border-red-500 text-red-500 bg-white hover:bg-red-50 shadow-[4px_4px_0_0_#ef4444] gap-2"
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4" />
                アカウントを削除する
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  この操作は取り消せません。あなたのプロフィール、写真、マッチ、メッセージがすべて削除されます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? '削除中...' : '削除する'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Layout>
  )
}
