import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import FacultySelector from '@/components/FacultySelector'
import ClubSelector from '@/components/ClubSelector'
import api from '@/lib/api'

const NAME_MAX = 20
const BIO_MAX = 200
const STATUS_MESSAGE_MAX = 30
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png']
const INTERESTS_MAX = 10
const HOMETOWN_MAX = 30
const CURRENT_YEAR = new Date().getFullYear()
const ADMISSION_YEARS = Array.from({ length: CURRENT_YEAR - 2017 }, (_, i) => CURRENT_YEAR - i)

function normalizeTag(s: string): string {
  return s.normalize('NFKC').toLowerCase().trim()
}

interface PhotoItem {
  id: string
  image_path: string
  display_order: number
  signed_url: string | null
}

const DRAFT_KEY = 'cro-co-profile-draft'

interface ProfileData {
  name: string | null
  year: number | null
  faculty: string | null
  department: string | null
  bio: string | null
  profile_image_path: string | null
  photos: PhotoItem[]
  interests: string[]
  club: string | null
  clubs: string[]
  hometown: string | null
  looking_for: string | null
  status_message: string | null
  admission_year: number | null
  identity_verified: boolean
  updated_at: string
}

export default function ProfileEditPage() {
  usePageTitle('プロフィール編集')
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [faculty, setFaculty] = useState('')
  const [department, setDepartment] = useState('')
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [interestInput, setInterestInput] = useState('')
  const [clubs, setClubs] = useState<string[]>([])
  const [hometown, setHometown] = useState('')
  const [lookingFor, setLookingFor] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [admissionYear, setAdmissionYear] = useState('')
  const [identityVerified, setIdentityVerified] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [mainImagePath, setMainImagePath] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [draftRestored, setDraftRestored] = useState(false)

  const interestInputRef = useRef<HTMLInputElement>(null)

  const { data: profileData, isLoading: loading, error: loadError } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () => api.get<ProfileData>('/api/profile/me').then(r => r.data),
  })

  useEffect(() => {
    if (!profileData || initialized) return
    setInitialized(true)

    const p = profileData
    setPhotos(p.photos ?? [])
    setMainImagePath(p.profile_image_path)
    setIdentityVerified(p.identity_verified ?? false)

    try {
      const savedStr = localStorage.getItem(DRAFT_KEY)
      if (savedStr) {
        const draft = JSON.parse(savedStr)
        if (draft.timestamp && new Date(draft.timestamp) > new Date(p.updated_at)) {
          setName(draft.name ?? '')
          setYear(draft.year ?? '')
          setBio(draft.bio ?? '')
          setInterests(draft.interests ?? [])
          setClubs(draft.clubs ?? [])
          setHometown(draft.hometown ?? '')
          setLookingFor(draft.looking_for ?? '')
          setStatusMessage(draft.status_message ?? '')
          // identity_verified フィールドは常にサーバー値を使う
          setFaculty(p.identity_verified ? (p.faculty ?? '') : (draft.faculty ?? ''))
          setDepartment(p.identity_verified ? (p.department ?? '') : (draft.department ?? ''))
          setAdmissionYear(p.identity_verified ? (p.admission_year != null ? String(p.admission_year) : '') : (draft.admission_year ?? ''))
          setDraftRestored(true)
          return
        }
      }
    } catch { /* ignore */ }

    setName(p.name ?? '')
    setYear(p.year != null ? String(p.year) : '')
    setFaculty(p.faculty ?? '')
    setDepartment(p.department ?? '')
    setBio(p.bio ?? '')
    setInterests(p.interests ?? [])
    setClubs(p.clubs ?? [])
    setHometown(p.hometown ?? '')
    setLookingFor(p.looking_for ?? '')
    setStatusMessage(p.status_message ?? '')
    setAdmissionYear(p.admission_year != null ? String(p.admission_year) : '')
  }, [profileData, initialized])

  useEffect(() => {
    if (loadError) setError('読み込めなかった。')
  }, [loadError])

  useEffect(() => {
    if (loading) return
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          name, bio, year, faculty, department, clubs, hometown,
          looking_for: lookingFor, interests,
          status_message: statusMessage,
          admission_year: admissionYear,
          timestamp: Date.now(),
        }))
      } catch { /* ignore */ }
    }, 1000)
    return () => clearTimeout(timer)
  }, [name, bio, year, faculty, department, clubs, hometown, lookingFor, interests, statusMessage, admissionYear, loading])

  const handleAddInterest = () => {
    const tag = interestInput.trim()
    if (!tag) return
    if (interests.length >= INTERESTS_MAX) return
    const normalizedNew = normalizeTag(tag)
    if (interests.some((t) => normalizeTag(t) === normalizedNew)) {
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
    if (!confirm('この写真を削除する？')) return
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

  const handleSwapPhoto = async (fromIndex: number, toIndex: number) => {
    const newPhotos = [...photos]
    ;[newPhotos[fromIndex], newPhotos[toIndex]] = [newPhotos[toIndex], newPhotos[fromIndex]]
    setPhotos(newPhotos)
    try {
      await api.patch('/api/profile/photos/reorder', {
        order: newPhotos.map((p) => p.id),
      })
    } catch {
      setPhotoError('並び替えに失敗しました')
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
    const payload: Record<string, unknown> = {
      name: name.trim() === '' ? null : name.trim(),
      year: yearNum,
      bio: bio.trim() === '' ? null : bio,
      interests,
      clubs,
      hometown: hometown.trim() === '' ? null : hometown.trim(),
      looking_for: lookingFor === '' ? null : lookingFor,
      status_message: statusMessage.trim() === '' ? null : statusMessage.trim(),
    }

    // identity_verified でないときのみ学籍情報を送る
    if (!identityVerified) {
      payload.faculty = faculty.trim() === '' ? null : faculty.trim()
      payload.department = department.trim() === '' ? null : department.trim()
      payload.admission_year = admissionYear === '' ? null : parseInt(admissionYear, 10)
    }

    try {
      await api.patch('/api/profile/me', payload)
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      queryClient.invalidateQueries({ queryKey: ['profile-me'] })
      setSavedOk(true)
      setTimeout(() => navigate('/home'), 900)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: unknown } } }
        const detail = axiosErr.response?.data?.detail
        if (typeof detail === 'string') {
          setError(detail)
        } else if (Array.isArray(detail)) {
          setError('入力値が正しくありません。各フィールドの制限を確認してください。')
        } else {
          setError('保存できなかった。もう一度試してみて。')
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
      <header className="sticky top-0 z-40 bg-white border-b-2 border-ink">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="w-8 h-8 rounded-full border-2 border-ink bg-white flex items-center justify-center text-sm font-bold shadow-[2px_2px_0_0_#0A0A0A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#0A0A0A] transition-all shrink-0"
          >
            ←
          </button>
          <span className="font-display text-xl text-ink">プロフィールを編集</span>
          {user && (
            <Button
              type="button"
              variant="outline-bold"
              size="sm"
              onClick={() => navigate(`/profile/${user.id}`)}
              className="ml-auto shrink-0 text-xs h-7 gap-1"
            >
              <Eye className="w-3 h-3" />
              プレビュー
            </Button>
          )}
        </div>
      </header>

      {/* コンテンツ */}
      <div className="max-w-[480px] mx-auto px-4 py-6 space-y-5 pb-32">

        {/* 写真管理 */}
        <div className="card-bold bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 uppercase tracking-wide">
              写真
            </h2>
            <span className="font-mono text-xs font-bold text-ink/50">{photos.length} / 6</span>
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
                    className="relative aspect-square overflow-hidden bg-muted border-2 border-ink"
                  >
                    <img
                      src={photo.signed_url ?? ''}
                      alt={`写真${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {isMain && (
                      <span className="absolute top-1 left-1 bg-acid border border-ink text-ink text-[10px] px-1.5 py-0.5 font-mono font-bold leading-none">
                        MAIN
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
                        メインにする
                      </button>
                    )}
                    <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-0.5 pointer-events-none">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSwapPhoto(i, i - 1)}
                          className="pointer-events-auto w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70 leading-none"
                        >
                          ←
                        </button>
                      )}
                      {i < photos.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleSwapPhoto(i, i + 1)}
                          className="pointer-events-auto w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70 leading-none ml-auto"
                        >
                          →
                        </button>
                      )}
                    </div>
                  </div>
                )
              }
              return (
                <label
                  key={`empty-${i}`}
                  className={`aspect-square border-2 border-dashed border-ink flex items-center justify-center transition-colors ${
                    uploading || photos.length >= 6
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer hover:bg-acid/10'
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
            <p className="font-mono text-xs text-ink/50 text-center">アップロード中...</p>
          )}
          <p className="font-mono text-xs text-ink/40">
            JPEG / PNG、5MB以下。最大6枚まで。
          </p>
        </div>

        <form id="profile-form" onSubmit={handleSubmit} noValidate className="space-y-5">

          {savedOk && (
            <Alert>
              <AlertDescription>保存した。いい感じ。</AlertDescription>
            </Alert>
          )}
          {draftRestored && !savedOk && (
            <Alert>
              <AlertDescription className="flex items-center justify-between gap-2">
                <span>下書きを復元した。</span>
                <button
                  type="button"
                  onClick={() => setDraftRestored(false)}
                  className="font-mono text-xs text-ink/50 underline shrink-0"
                >
                  閉じる
                </button>
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 基本情報 */}
          <div className="card-bold bg-white p-5 space-y-4">
            <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-block uppercase tracking-wide">
              基本情報
            </h2>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="font-mono text-xs font-bold text-ink/60 uppercase">表示名</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                maxLength={NAME_MAX}
                placeholder={`みんなに表示される名前（最大${NAME_MAX}文字）`}
                className="border-2 border-ink focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#0A0A0A]"
              />
              <p className={`font-mono text-xs text-right ${name.length >= NAME_MAX - 10 ? 'text-destructive' : 'text-ink/40'}`}>
                {name.length} / {NAME_MAX}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="year" className="font-mono text-xs font-bold text-ink/60 uppercase">学年</Label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full h-10 border-2 border-ink bg-background px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
              >
                <option value="">選択してください</option>
                {[1, 2, 3, 4, 5, 6].map((y) => (
                  <option key={y} value={String(y)}>
                    {y}年
                  </option>
                ))}
              </select>
            </div>

            {/* 学部・学科（identity_verified で制御） */}
            <div className="space-y-1.5">
              <FacultySelector
                faculty={faculty}
                department={department}
                onFacultyChange={setFaculty}
                onDepartmentChange={setDepartment}
                disabled={identityVerified}
              />
            </div>

            {/* 入学年度（identity_verified で制御） */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="font-mono text-xs font-bold text-ink/60 uppercase">入学年度</Label>
                {identityVerified && (
                  <span className="font-mono text-[10px] font-bold bg-acid border border-ink text-ink px-1.5 py-0.5 leading-none">
                    承認済み
                  </span>
                )}
              </div>
              <select
                value={admissionYear}
                onChange={(e) => setAdmissionYear(e.target.value)}
                disabled={identityVerified}
                className="w-full h-10 border-2 border-ink bg-background px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">選択してください</option>
                {ADMISSION_YEARS.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}年
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status-message" className="font-mono text-xs font-bold text-ink/60 uppercase">今日の一言</Label>
              <Input
                id="status-message"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value.slice(0, STATUS_MESSAGE_MAX))}
                maxLength={STATUS_MESSAGE_MAX}
                placeholder="今日の気分を一言で（30文字以内）"
                className="border-2 border-ink focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#0A0A0A]"
              />
              <p className={`font-mono text-xs text-right ${statusMessage.length >= STATUS_MESSAGE_MAX - 5 ? 'text-destructive' : 'text-ink/40'}`}>
                {statusMessage.length} / {STATUS_MESSAGE_MAX}
              </p>
            </div>
          </div>

          {/* 自己紹介 */}
          <div className="card-bold bg-white p-5 space-y-4">
            <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-block uppercase tracking-wide">
              自己紹介
            </h2>

            <div className="space-y-1.5">
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                placeholder="あなたのこと、もっと知りたい。"
                rows={5}
                className="resize-none border-2 border-ink focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#0A0A0A]"
              />
              <p className={`font-mono text-xs text-right ${bio.length >= BIO_MAX - 10 ? 'text-destructive' : 'text-ink/40'}`}>
                {bio.length} / {BIO_MAX}
              </p>
            </div>
          </div>

          {/* 詳細情報 */}
          <div className="card-bold bg-white p-5 space-y-4">
            <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-block uppercase tracking-wide">
              詳細情報
            </h2>

            {/* 趣味タグ */}
            <div className="space-y-1.5">
              <Label htmlFor="interest-input" className="font-mono text-xs font-bold text-ink/60 uppercase">
                趣味・好きなこと
                <span className="ml-1.5 font-mono text-xs font-normal text-ink/40">
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
                  className="border-2 border-ink focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#0A0A0A]"
                />
                <Button
                  type="button"
                  variant="outline-bold"
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
                    <span key={tag} className="tag-pill">
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveInterest(tag)}
                        className="ml-1 text-ink/60 hover:text-ink leading-none"
                        aria-label={`${tag}を削除`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="font-mono text-xs text-ink/40">Enterまたは「追加」ボタンで追加。最大10個。</p>
            </div>

            {/* 所属サークル */}
            <div className="space-y-1.5">
              <Label className="font-mono text-xs font-bold text-ink/60 uppercase">
                所属サークル・部活
                <span className="ml-1.5 font-mono text-xs font-normal text-ink/40">
                  ({clubs.length}/5)
                </span>
              </Label>
              <ClubSelector
                selected={clubs}
                onChange={setClubs}
                maxCount={5}
              />
            </div>

            {/* 出身地 */}
            <div className="space-y-1.5">
              <Label htmlFor="hometown" className="font-mono text-xs font-bold text-ink/60 uppercase">出身地</Label>
              <Input
                id="hometown"
                value={hometown}
                onChange={(e) => setHometown(e.target.value.slice(0, HOMETOWN_MAX))}
                maxLength={HOMETOWN_MAX}
                placeholder="例: 東京都、大阪府"
                className="border-2 border-ink focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#0A0A0A]"
              />
            </div>

            {/* 目的 */}
            <div className="space-y-1.5">
              <Label htmlFor="looking-for" className="font-mono text-xs font-bold text-ink/60 uppercase">目的</Label>
              <select
                id="looking-for"
                value={lookingFor}
                onChange={(e) => setLookingFor(e.target.value)}
                className="w-full h-10 border-2 border-ink bg-background px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
              >
                <option value="">選択してください（任意）</option>
                <option value="恋愛">恋愛</option>
                <option value="友達">友達</option>
                <option value="なんでも">なんでも</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* 固定保存バー */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-ink">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex gap-3">
          <Button
            type="submit"
            form="profile-form"
            variant="bold"
            disabled={saving}
            className="flex-1 h-11 text-base"
          >
            {saving ? '保存中...' : '保存する'}
          </Button>
          <Button
            type="button"
            variant="outline-bold"
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
