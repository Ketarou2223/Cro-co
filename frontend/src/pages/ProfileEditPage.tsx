import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Lock } from 'lucide-react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ClubSelector from '@/components/ClubSelector'
import { getCroppedImg } from '@/lib/cropImage'
import api from '@/lib/api'

const NAME_MAX = 20
const BIO_MAX = 200
const STATUS_MESSAGE_MAX = 30
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png']
const HOMETOWNS = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
  '海外',
]

async function compressImage(blob: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        const maxDim = 1920
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim
            width = maxDim
          } else {
            width = (width / height) * maxDim
            height = maxDim
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((b) => { resolve(b!) }, 'image/jpeg', 0.8)
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(blob)
  })
}

interface PhotoItem {
  id: string
  image_path: string
  display_order: number
  signed_url: string | null
  status?: string
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
  status_message: string | null
  identity_verified: boolean
  updated_at: string
  real_name: string | null
  student_number: string | null
  birth_date: string | null
  gender: string | null
  interest_in: string | null
  hidden_clubs: string[]
}

export default function ProfileEditPage() {
  usePageTitle('プロフィール編集')
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [clubs, setClubs] = useState<string[]>([])
  const [hiddenClubs, setHiddenClubs] = useState<string[]>([])
  const [hometown, setHometown] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
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

  // Crop modal state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 })
  const [cropZoom, setCropZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

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
    setHiddenClubs(p.hidden_clubs ?? [])

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
          setStatusMessage(draft.status_message ?? '')
          setDraftRestored(true)
          return
        }
      }
    } catch { /* ignore */ }

    setName(p.name ?? '')
    setYear(p.year != null ? String(p.year) : '')
    setBio(p.bio ?? '')
    setInterests(p.interests ?? [])
    setClubs(p.clubs ?? [])
    setHometown(p.hometown ?? '')
    setStatusMessage(p.status_message ?? '')
  }, [profileData, initialized])

  useEffect(() => {
    if (loadError) setError('読み込めませんでした。')
  }, [loadError])

  useEffect(() => {
    if (loading) return
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          name, bio, year, clubs, hometown,
          interests,
          status_message: statusMessage,
          timestamp: Date.now(),
        }))
      } catch { /* ignore */ }
    }, 1000)
    return () => clearTimeout(timer)
  }, [name, bio, year, clubs, hometown, interests, statusMessage, loading])

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const url = URL.createObjectURL(file)
    setCropImageSrc(url)
    setCropPos({ x: 0, y: 0 })
    setCropZoom(1)
  }

  const cancelCrop = () => setCropImageSrc(null)

  const confirmCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return
    setCropImageSrc(null)
    setUploading(true)
    setPhotoError(null)
    try {
      const blob = await getCroppedImg(cropImageSrc, croppedAreaPixels)
      const compressed = await compressImage(blob)
      const formData = new FormData()
      formData.append('file', compressed, 'photo.jpg')
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
      hometown: hometown === '' ? null : hometown,
      status_message: statusMessage.trim() === '' ? null : statusMessage.trim(),
      hidden_clubs: hiddenClubs,
    }

    try {
      await api.patch('/api/profile/me', payload)
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      queryClient.invalidateQueries({ queryKey: ['profile-me'] })
      setSavedOk(true)
      setTimeout(() => navigate('/settings'), 900)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: unknown } } }
        const detail = axiosErr.response?.data?.detail
        if (typeof detail === 'string') {
          setError(detail)
        } else if (Array.isArray(detail)) {
          setError('入力値が正しくありません。各フィールドの制限を確認してください。')
        } else {
          setError('保存できませんでした。もう一度お試しください。')
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
      {/* Crop modal */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0A' }}>
          <div className="relative flex-1">
            <Cropper
              image={cropImageSrc}
              crop={cropPos}
              zoom={cropZoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCropPos}
              onZoomChange={setCropZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="px-5 py-5 space-y-3" style={{ background: '#0A0A0A' }}>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-white/50">縮小</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={cropZoom}
                onChange={(e) => setCropZoom(Number(e.target.value))}
                className="flex-1 accent-[#DFFF1F]"
              />
              <span className="font-mono text-xs text-white/50">拡大</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelCrop}
                className="flex-1 h-12 font-bold border-2 border-white/30 text-white rounded-xl"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmCrop}
                className="flex-1 h-12 font-bold border-2 border-ink text-ink rounded-xl"
                style={{ background: '#DFFF1F' }}
              >
                この写真を使う
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-ink">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/settings')}
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
            <span className="font-mono text-xs font-bold text-muted">{photos.length} / 6</span>
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
                const photoStatus = photo.status ?? 'approved'
                const isPending = photoStatus === 'pending'
                const isRejected = photoStatus === 'rejected'
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

                    {/* pending オーバーレイ */}
                    {isPending && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                        <span className="font-mono text-[10px] font-bold text-white uppercase tracking-widest">審査中</span>
                      </div>
                    )}

                    {/* rejected オーバーレイ */}
                    {isRejected && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(220,38,38,0.7)' }}>
                        <span className="font-mono text-[10px] font-bold text-white uppercase tracking-widest">承認不可</span>
                      </div>
                    )}

                    {isMain && !isPending && !isRejected && (
                      <span className="absolute top-1 left-1 bg-acid border border-ink text-ink text-[10px] px-1.5 py-0.5 font-mono font-bold leading-none">
                        MAIN
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="group absolute top-0 right-0 w-11 h-11 flex items-center justify-center"
                    >
                      <span className="w-5 h-5 rounded-full bg-black/60 group-hover:bg-black/80 text-white text-xs flex items-center justify-center leading-none">
                        ×
                      </span>
                    </button>
                    {!isMain && !isPending && !isRejected && (
                      <button
                        type="button"
                        onClick={() => handleSetMain(photo.id)}
                        className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] py-1 text-center hover:bg-black/70"
                      >
                        メインにする
                      </button>
                    )}
                    {!isPending && !isRejected && (
                      <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between pointer-events-none">
                        {i > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSwapPhoto(i, i - 1)}
                            className="group pointer-events-auto w-11 h-11 flex items-center justify-center"
                          >
                            <span className="w-5 h-5 rounded-full bg-black/50 group-hover:bg-black/70 text-white text-xs flex items-center justify-center leading-none">←</span>
                          </button>
                        )}
                        {i < photos.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleSwapPhoto(i, i + 1)}
                            className="group pointer-events-auto w-11 h-11 flex items-center justify-center ml-auto"
                          >
                            <span className="w-5 h-5 rounded-full bg-black/50 group-hover:bg-black/70 text-white text-xs flex items-center justify-center leading-none">→</span>
                          </button>
                        )}
                      </div>
                    )}
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
            <p className="font-mono text-xs text-muted text-center">アップロード中...</p>
          )}
          <p className="font-mono text-xs text-subtle">
            JPEG / PNG、5MB以下。最大6枚まで。
          </p>
        </div>

        <form id="profile-form" onSubmit={handleSubmit} noValidate className="space-y-5">

          {savedOk && (
            <Alert>
              <AlertDescription>保存しました。いい感じです。</AlertDescription>
            </Alert>
          )}
          {draftRestored && !savedOk && (
            <Alert>
              <AlertDescription className="flex items-center justify-between gap-2">
                <span>下書きを復元しました。</span>
                <button
                  type="button"
                  onClick={() => setDraftRestored(false)}
                  className="font-mono text-xs text-muted underline shrink-0"
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
              <Label htmlFor="name" className="font-mono text-xs font-bold text-muted uppercase">表示名<span className="badge-required">必須</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                maxLength={NAME_MAX}
                placeholder={`みんなに表示される名前（最大${NAME_MAX}文字）`}
                className="border-2 border-ink focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#0A0A0A]"
              />
              <p className={`font-mono text-xs text-right ${name.length >= NAME_MAX - 10 ? 'text-destructive' : 'text-subtle'}`}>
                {name.length} / {NAME_MAX}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="year" className="font-mono text-xs font-bold text-muted uppercase">学年<span className="badge-required">必須</span></Label>
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

            <div className="space-y-1.5">
              <Label htmlFor="status-message" className="font-mono text-xs font-bold text-muted uppercase">今日の一言<span className="badge-optional">任意</span></Label>
              <Input
                id="status-message"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value.slice(0, STATUS_MESSAGE_MAX))}
                maxLength={STATUS_MESSAGE_MAX}
                placeholder="今日の気分を一言で（30文字以内）"
                className="border-2 border-ink focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#0A0A0A]"
              />
              <p className={`font-mono text-xs text-right ${statusMessage.length >= STATUS_MESSAGE_MAX - 5 ? 'text-destructive' : 'text-subtle'}`}>
                {statusMessage.length} / {STATUS_MESSAGE_MAX}
              </p>
            </div>
          </div>

          {/* アカウント情報（学籍情報・変更不可） */}
          <div className="card-bold bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-block uppercase tracking-wide">
                アカウント情報
              </h2>
              {identityVerified && (
                <span className="font-mono text-[10px] font-bold bg-acid border border-ink text-ink px-1.5 py-0.5 leading-none flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  承認済み
                </span>
              )}
            </div>
            {!identityVerified && (
              <p className="font-mono text-xs text-muted">学生証を提出すると設定されます。</p>
            )}
            <div className="space-y-3">
              {([
                { label: '本名', value: profileData?.real_name },
                { label: '学籍番号', value: profileData?.student_number },
                { label: '生年月日', value: profileData?.birth_date ? new Date(profileData.birth_date + 'T00:00:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : null },
                { label: '学部', value: profileData?.faculty },
                { label: '学科', value: profileData?.department },
                { label: '性別', value: profileData?.gender === 'male' ? '男性' : profileData?.gender === 'female' ? '女性' : null, locked: true },
                { label: '恋愛対象', value: profileData?.interest_in === 'male' ? '男性' : profileData?.interest_in === 'female' ? '女性' : null, locked: true },
              ] as { label: string; value: string | null | undefined; locked?: boolean }[]).map(({ label, value, locked }) => (
                <div key={label} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Label className="font-mono text-xs font-bold text-muted uppercase">{label}</Label>
                    {identityVerified && !locked && <Lock className="w-3 h-3 text-ink/30" />}
                  </div>
                  <div className="h-10 border-2 border-ink/20 bg-ink/5 px-3 text-sm flex items-center">
                    {value
                      ? <span className="text-ink/70">{value}</span>
                      : <span className="text-ink/30 font-mono text-xs">未設定</span>
                    }
                  </div>
                </div>
              ))}
            </div>
            {identityVerified && (
              <p className="font-mono text-xs text-subtle">
                これらの情報は学生証承認後に変更できません。
              </p>
            )}
          </div>

          {/* 自己紹介 */}
          <div className="card-bold bg-white p-5 space-y-4">
            <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-block uppercase tracking-wide">
              自己紹介
            </h2>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="font-mono text-xs font-bold text-muted uppercase">自己紹介<span className="badge-optional">任意</span></Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                placeholder="あなたのこと、もっと知りたい。"
                rows={5}
                className="resize-none border-2 border-ink focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#0A0A0A]"
              />
              <p className={`font-mono text-xs text-right ${bio.length >= BIO_MAX - 10 ? 'text-destructive' : 'text-subtle'}`}>
                {bio.length} / {BIO_MAX}
              </p>
            </div>
          </div>

          {/* 詳細情報 */}
          <div className="card-bold bg-white p-5 space-y-4">
            <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-block uppercase tracking-wide">
              詳細情報
            </h2>

            {/* 所属サークル */}
            <div className="space-y-1.5">
              <Label className="font-mono text-xs font-bold text-muted uppercase">
                所属サークル・部活<span className="badge-optional">任意</span>
                <span className="ml-1.5 font-mono text-xs font-normal text-subtle">
                  ({clubs.length}/5)
                </span>
              </Label>
              <ClubSelector
                selected={clubs}
                onChange={(newClubs) => {
                  setClubs(newClubs)
                  setHiddenClubs((prev) => prev.filter((hc) => newClubs.includes(hc)))
                }}
                maxCount={5}
              />
            </div>

            {/* 出身地 */}
            <div className="space-y-1.5">
              <Label htmlFor="hometown" className="font-mono text-xs font-bold text-muted uppercase">出身地<span className="badge-optional">任意</span></Label>
              <select
                id="hometown"
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
                className="w-full h-10 border-2 border-ink bg-background px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
              >
                <option value="">選択してください</option>
                {HOMETOWNS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
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
            disabled={saving || !name.trim() || !year || !profileData?.faculty || !profileData?.department}
            className="flex-1 h-11 text-base"
          >
            {saving ? '保存中...' : '保存する'}
          </Button>
          <Button
            type="button"
            variant="outline-bold"
            onClick={() => navigate('/settings')}
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
