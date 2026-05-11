import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import api from '@/lib/api'

const BIO_MAX = 500
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png']

interface ProfileData {
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
}

export default function ProfileEditPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [faculty, setFaculty] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarSuccess, setAvatarSuccess] = useState(false)

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

    api
      .get<{ signed_url: string | null }>('/api/profile/avatar-url')
      .then((res) => setCurrentAvatarUrl(res.data.signed_url))
      .catch(() => {})
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null)
    setAvatarSuccess(false)
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_MIME.includes(file.type)) {
      setAvatarError('JPEGまたはPNG形式の画像のみアップロードできます')
      e.target.value = ''
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setAvatarError('ファイルサイズは5MB以下にしてください')
      e.target.value = ''
      return
    }

    setAvatarFile(file)
    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile) return
    setAvatarError(null)
    setAvatarSuccess(false)
    setAvatarUploading(true)

    const formData = new FormData()
    formData.append('file', avatarFile)

    try {
      await api.post('/api/profile/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const urlRes = await api.get<{ signed_url: string | null }>('/api/profile/avatar-url')
      setCurrentAvatarUrl(urlRes.data.signed_url)
      setAvatarFile(null)
      setAvatarPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setAvatarSuccess(true)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: unknown } } }
        const detail = axiosErr.response?.data?.detail
        setAvatarError(typeof detail === 'string' ? detail : 'アップロードに失敗しました')
      } else {
        setAvatarError('アップロードに失敗しました')
      }
    } finally {
      setAvatarUploading(false)
    }
  }

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
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="space-y-3 w-full max-w-[480px] px-4">
          <div className="h-2 bg-muted rounded-full animate-pulse" />
          <div className="h-2 bg-muted rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    )
  }

  const displayAvatar = avatarPreview ?? currentAvatarUrl ?? null

  return (
    <div className="min-h-dvh bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg font-medium w-8 flex items-center justify-center"
          >
            ←
          </button>
          <span className="font-semibold">プロフィール編集</span>
        </div>
      </header>

      {/* コンテンツ */}
      <div className="max-w-[480px] mx-auto px-4 py-6 space-y-5 pb-32">

        {/* アバターアップロード */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            プロフィール写真
          </h2>

          <label
            htmlFor="avatar-input"
            className="block cursor-pointer group"
          >
            <div className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center gap-3 transition-colors group-hover:border-primary/50 group-hover:bg-primary/5">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="プレビュー"
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/20"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-4xl">
                  📷
                </div>
              )}
              <div className="text-center">
                <p className="text-sm font-medium text-primary">
                  {displayAvatar ? '写真を変更' : '写真を選択'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  JPEG / PNG、5MB以下
                </p>
              </div>
            </div>
            <input
              id="avatar-input"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {avatarError && (
            <Alert variant="destructive">
              <AlertDescription>{avatarError}</AlertDescription>
            </Alert>
          )}
          {avatarSuccess && (
            <Alert>
              <AlertDescription>アバターを更新しました ✓</AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            onClick={handleAvatarUpload}
            disabled={!avatarFile || avatarUploading}
            className="w-full"
          >
            {avatarUploading ? 'アップロード中...' : 'アップロード'}
          </Button>
        </div>

        {/* プロフィール情報フォーム */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            プロフィール情報
          </h2>
          <form id="profile-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">表示名</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                placeholder="みんなに表示される名前（最大50文字）"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="year">学年</Label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">選択してください</option>
                {[1, 2, 3, 4, 5, 6].map((y) => (
                  <option key={y} value={String(y)}>
                    {y}年
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="faculty">学部・学科</Label>
              <Input
                id="faculty"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                maxLength={50}
                placeholder="例: 工学部 情報工学科"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">自己紹介</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                placeholder="趣味・サークル・好きなこと など、自由に書いてください"
                rows={5}
                className="resize-none"
              />
              <p
                className={`text-xs text-right ${
                  bio.length >= BIO_MAX ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {bio.length} / {BIO_MAX}
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* 固定保存バー */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex gap-3">
          <Button
            type="submit"
            form="profile-form"
            disabled={saving}
            className="flex-1 h-11 text-base"
          >
            {saving ? '保存中...' : '保存する'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/home')}
            disabled={saving}
            className="h-11"
          >
            キャンセル
          </Button>
        </div>
      </div>
    </div>
  )
}
