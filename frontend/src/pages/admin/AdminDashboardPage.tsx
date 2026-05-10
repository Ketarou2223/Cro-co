import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PendingProfile {
  id: string
  email: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  submitted_at: string
  student_id_image_path: string
}

export default function AdminDashboardPage() {
  const [profiles, setProfiles] = useState<PendingProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)

  useEffect(() => {
    api
      .get<PendingProfile[]>('/api/admin/pending')
      .then((res) => setProfiles(res.data))
      .catch((err) => {
        if (err.response?.status === 403) {
          setError('管理者権限がありません')
        } else {
          setError('データの取得に失敗しました')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleViewStudentId = async (userId: string) => {
    setSelectedImageUrl(null)
    setImageLoading(true)
    setDialogOpen(true)
    try {
      const res = await api.get<{ signed_url: string }>(`/api/admin/student-id/${userId}`)
      setSelectedImageUrl(res.data.signed_url)
    } catch {
      setSelectedImageUrl(null)
    } finally {
      setImageLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">管理者ダッシュボード</h1>
      <p className="text-muted-foreground">審査待ち: {profiles.length} 件</p>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">審査待ちのユーザーはいません</p>
          </CardContent>
        </Card>
      ) : (
        profiles.map((profile) => (
          <Card key={profile.id}>
            <CardHeader>
              <CardTitle className="text-base">{profile.email}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">名前: </span>
                  {profile.name ?? '未設定'}
                </div>
                <div>
                  <span className="text-muted-foreground">学年: </span>
                  {profile.year != null ? `${profile.year}年` : '未設定'}
                </div>
                <div>
                  <span className="text-muted-foreground">学部: </span>
                  {profile.faculty ?? '未設定'}
                </div>
                <div>
                  <span className="text-muted-foreground">提出日時: </span>
                  {new Date(profile.submitted_at).toLocaleString('ja-JP')}
                </div>
              </div>
              {profile.bio && (
                <div className="text-sm">
                  <span className="text-muted-foreground">自己紹介: </span>
                  {profile.bio}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewStudentId(profile.id)}
                >
                  学生証を見る
                </Button>
                <Button size="sm" disabled>
                  承認
                </Button>
                <Button variant="destructive" size="sm" disabled>
                  却下
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>学生証</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-40">
            {imageLoading && (
              <p className="text-muted-foreground">読み込み中...</p>
            )}
            {!imageLoading && selectedImageUrl && (
              <img
                src={selectedImageUrl}
                alt="学生証"
                className="max-w-full max-h-96 object-contain rounded"
              />
            )}
            {!imageLoading && !selectedImageUrl && (
              <p className="text-destructive">画像の取得に失敗しました</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
