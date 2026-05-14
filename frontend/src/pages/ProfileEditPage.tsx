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
const INTERESTS_MAX = 10

interface PhotoItem {
  id: string
  image_path: string
  display_order: number
  signed_url: string | null
}

interface ProfileData {
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  profile_image_path: string | null
  photos: PhotoItem[]
  interests: string[]
  club: string | null
  hometown: string | null
  looking_for: string | null
}

export default function ProfileEditPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [faculty, setFaculty] = useState('')
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [interestInput, setInterestInput] = useState('')
  const [club, setClub] = useState('')
  const [hometown, setHometown] = useState('')
  const [lookingFor, setLookingFor] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [mainImagePath, setMainImagePath] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const interestInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api
      .get<ProfileData>('/api/profile/me')
      .then((res) => {
        const p = res.data
        setName(p.name ?? '')
        setYear(p.year != null ? String(p.year) : '')
        setFaculty(p.faculty ?? '')
        setBio(p.bio ?? '')
        setPhotos(p.photos ?? [])
        setMainImagePath(p.profile_image_path)
        setInterests(p.interests ?? [])
        setClub(p.club ?? '')
        setHometown(p.hometown ?? '')
        setLookingFor(p.looking_for ?? '')
      })
      .catch(() => setError('プロフィールの読み込みに失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  const handleAddInterest = () => {
    const tag = interestInput.trim()
    if (!tag) return
    if (interests.length >= INTERESTS_MAX) return
    if (interests.includes(tag)) {
      setInterestInput('')
      return
    }
    setInterests((prev) => [...prev, tag])
    setInterestInput('')
    interestInputRef.current?.focus()
  }

  const handleInterestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddInterest()
    }
  }

  const handleRemoveInterest = (tag: string) => {
    setInterests((prev) => prev.filter((t) => t !== tag))
  }

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null)
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!ALLOWED_MIME.includes(file.type)) {
      setPhotoError('JPEGまたはPNG形式の画像のみアップロードできます')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setPhotoError('ファイルサイズは5MB以下にしてください')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post<PhotoItem>('/api/profile/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPhotos((prev) => [...prev, res.data])
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: unknown } } }
        const detail = axiosErr.response?.data?.detail
        setPhotoError(typeof detail === 'string' ? detail : 'アップロードに失敗しました')
      } else {
        setPhotoError('アップロードに失敗しました')
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('この写真を削除しますか？')) return
    try {
      await api.delete(`/api/profile/photos/${photoId}`)
      const deleted = photos.find((p) => p.id === photoId)
      const remaining = photos.filter((p) => p.id !== photoId)
      setPhotos(remaining)
      if (deleted && deleted.image_path === mainImagePath) {
        setMainImagePath(remaining[0]?.image_path ?? null)
      }
    } catch {
      setPhotoError('削除に失敗しました')
    }
  }

  const handleSetMain = async (photoId: string) => {
    try {
      await api.post(`/api/profile/photos/${photoId}/set-main`)
      const photo = photos.find((p) => p.id === photoId)
      if (photo) setMainImagePath(photo.image_path)
    } catch {
      setPhotoError('メイン設定に失敗しました')
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
      interests,
      club: club.trim() === '' ? null : club.trim(),
      hometown: hometown.trim() === '' ? null : hometown.trim(),
      looking_for: lookingFor === '' ? null : lookingFor,
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

        {/* 写真管理 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              写真管理
            </h2>
            <span className="text-xs text-muted-foreground">{photos.length} / 6</span>
          </div>

          {photoError && (
            <Alert variant="destructive">
              <AlertDescription>{photoError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => {
              const photo = photos[i]
              if (photo) {
                const isMain = photo.image_path === mainImagePath
                return (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-muted"
                  >
                    <img
                      src={photo.signed_url ?? ''}
                      alt={`写真${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {isMain && (
                      <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-none">
                        メイン
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80 leading-none"
                    >
                      ×
                    </button>
                    {!isMain && (
                      <button
                        type="button"
                        onClick={() => handleSetMain(photo.id)}
                        className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] py-1 text-center hover:bg-black/70"
                      >
                        メイン設定
                      </button>
                    )}
                  </div>
                )
              }
              return (
                <label
                  key={`empty-${i}`}
                  className={`aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center transition-colors ${
                    uploading || photos.length >= 6
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <span className="text-2xl text-muted-foreground select-none">+</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                    disabled={uploading || photos.length >= 6}
                  />
                </label>
              )
            })}
          </div>

          {uploading && (
            <p className="text-xs text-muted-foreground text-center">アップロード中...</p>
          )}
          <p className="text-xs text-muted-foreground">
            JPEG / PNG、5MB以下。最大6枚まで。
          </p>
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

            {/* 趣味タグ */}
            <div className="space-y-1.5">
              <Label htmlFor="interest-input">
                趣味・好きなこと
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  ({interests.length}/{INTERESTS_MAX})
                </span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="interest-input"
                  ref={interestInputRef}
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={handleInterestKeyDown}
                  maxLength={20}
                  placeholder="例: 映画、料理、バスケ"
                  disabled={interests.length >= INTERESTS_MAX}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddInterest}
                  disabled={!interestInput.trim() || interests.length >= INTERESTS_MAX}
                  className="shrink-0 h-10"
                >
                  追加
                </Button>
              </div>
              {interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {interests.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveInterest(tag)}
                        className="text-primary/60 hover:text-primary leading-none"
                        aria-label={`${tag}を削除`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Enterまたは「追加」ボタンで追加。最大10個。</p>
            </div>

            {/* サークル */}
            <div className="space-y-1.5">
              <Label htmlFor="club">サークル・部活</Label>
              <Input
                id="club"
                value={club}
                onChange={(e) => setClub(e.target.value)}
                maxLength={50}
                placeholder="例: テニスサークル、軽音楽部"
              />
            </div>

            {/* 出身地 */}
            <div className="space-y-1.5">
              <Label htmlFor="hometown">出身地</Label>
              <Input
                id="hometown"
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
                maxLength={50}
                placeholder="例: 東京都、大阪府"
              />
            </div>

            {/* 目的 */}
            <div className="space-y-1.5">
              <Label htmlFor="looking-for">目的</Label>
              <select
                id="looking-for"
                value={lookingFor}
                onChange={(e) => setLookingFor(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">選択してください</option>
                <option value="恋愛">恋愛</option>
                <option value="友達">友達</option>
                <option value="なんでも">なんでも</option>
              </select>
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
