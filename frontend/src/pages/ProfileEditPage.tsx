import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import api from '@/lib/api'

const BIO_MAX = 500

interface ProfileData {
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
}

export default function ProfileEditPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [faculty, setFaculty] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<ProfileData>('/api/profile/me')
      .then((res) => {
        const p = res.data
        setName(p.name ?? '')
        setYear(p.year != null ? String(p.year) : '')
        setFaculty(p.faculty ?? '')
        setBio(p.bio ?? '')
      })
      .catch(() => setError('プロフィールの読み込みに失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const yearNum = year.trim() === '' ? null : parseInt(year, 10)
    if (yearNum !== null && (isNaN(yearNum) || yearNum < 1 || yearNum > 6)) {
      setError('学年は1〜6の整数で入力してください')
      return
    }

    setSaving(true)
    const payload = {
      name: name.trim() === '' ? null : name.trim(),
      year: yearNum,
      faculty: faculty.trim() === '' ? null : faculty.trim(),
      bio: bio.trim() === '' ? null : bio,
    }

    try {
      await api.patch('/api/profile/me', payload)
      navigate('/home')
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: unknown } } }
        const detail = axiosErr.response?.data?.detail
        if (typeof detail === 'string') {
          setError(detail)
        } else if (Array.isArray(detail)) {
          setError('入力値が正しくありません。各フィールドの制限を確認してください。')
        } else {
          setError('プロフィールの保存に失敗しました')
        }
      } else {
        setError('プロフィールの保存に失敗しました')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-3xl font-bold">プロフィール編集</h1>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">プロフィール情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <Label htmlFor="name">表示名</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                placeholder="表示名（最大50文字）"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="year">学年</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="1〜6"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="faculty">学部</Label>
              <Input
                id="faculty"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                maxLength={50}
                placeholder="学部名（最大50文字）"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bio">自己紹介</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                placeholder="自己紹介（最大500文字）"
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length} / {BIO_MAX}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? '保存中...' : '保存'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/home')}
                disabled={saving}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
