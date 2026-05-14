import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { supabase } from '@/lib/supabase'

interface ProfileMe {
  email: string
  show_online_status: boolean
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileMe | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [onlineToggling, setOnlineToggling] = useState(false)

  useEffect(() => {
    api.get<ProfileMe>('/api/profile/me').then((res) => {
      setProfile({ email: res.data.email, show_online_status: res.data.show_online_status })
    }).catch(() => {})
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
      <div className="px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold">設定</h1>

        {/* アカウント情報 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              アカウント情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">メールアドレス</p>
              <p className="text-sm font-medium">{profile?.email ?? '読み込み中...'}</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/profile/edit">プロフィールを編集する</Link>
            </Button>
          </CardContent>
        </Card>

        {/* プライバシー設定 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              プライバシー設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 flex-1">
                <p className="text-sm font-medium">オンライン状態を表示する</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  オフにすると、他のユーザーにあなたの最終ログイン時刻が表示されなくなります
                </p>
              </div>
              <Switch
                checked={profile?.show_online_status ?? true}
                onCheckedChange={handleOnlineToggle}
                disabled={onlineToggling || profile === null}
              />
            </div>
          </CardContent>
        </Card>

        {/* アプリ情報 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              アプリ情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">バージョン</span>
              <span className="font-medium">v1.0.0</span>
            </div>
            <div className="flex gap-4 text-sm">
              <a href="#" className="text-primary hover:underline">利用規約</a>
              <a href="#" className="text-primary hover:underline">プライバシーポリシー</a>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">お問い合わせ</p>
              <p className="text-sm">cro-co.support@ecs.osaka-u.ac.jp</p>
            </div>
          </CardContent>
        </Card>

        {/* ログアウト */}
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogout}
            >
              ログアウト
            </Button>
          </CardContent>
        </Card>

        {/* アカウント削除 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              アカウントを削除する
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              削除すると、プロフィール・写真・マッチ・メッセージなどすべてのデータが完全に消去され、元に戻すことができません。
            </p>

            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={deleting}
                >
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
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
