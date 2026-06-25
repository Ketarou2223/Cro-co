// 解説: このファイルはプロフィール編集ページを定義する。
// 解説: 写真: react-easy-crop でトリミング → canvas で JPEG 圧縮 → multipart/form-data で POST /api/profile/photos
// 解説: DRAFT_KEY = localStorage に1秒デバウンスで下書き自動保存。サーバー updated_at より新しければ復元する
// 解説: アカウント情報（学部・性別・恋愛対象等）は学生証承認後ロック済みのため UI は表示のみで入力不可
// 解説: 保存フォームは id="profile-form" + <Button form="profile-form"> の分離構造（固定フッターから submit する）
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ChevronRight, Eye, Lock } from 'lucide-react'
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
import FreeSlotGrid, { EMPTY_FREE_SLOTS, isValidFreeSlots } from '@/components/FreeSlotGrid'
import SelectModal from '@/components/SelectModal'
import { getCroppedImg } from '@/lib/cropImage'
import api from '@/lib/api'
import { getYearLabel } from '@/lib/utils'
import { computeCompleteness, sendRegime, SAME_SEX_UNLOCK } from '@/lib/completeness'
import ProfileCompletenessBar from '@/components/ProfileCompletenessBar'
import { DETAIL_FIELDS, ZODIAC_LABELS, HEIGHT_MIN, HEIGHT_MAX } from '@/constants/profileDetailFields'

const HEIGHT_OPTIONS = Array.from({ length: HEIGHT_MAX - HEIGHT_MIN + 1 }, (_, i) => {
  const n = HEIGHT_MIN + i
  return {
    value: String(n),
    label: n === HEIGHT_MIN ? `〜${n}cm` : n === HEIGHT_MAX ? `${n}cm〜` : `${n}cm`,
  }
})

const SIX_YEAR_FACULTIES = ['医学部', '歯学部', '薬学部'] as const
const NAME_MAX = 20
const BIO_MAX = 1000
const STATUS_MESSAGE_MAX = 30
const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_SUB_PHOTOS = 15
const ALLOWED_MIME = ['image/jpeg', 'image/png']

interface DetailFieldState {
  height_cm: number | null
  body_type: string | null
  blood_type: string | null
  sibling_rank: string | null
  languages: string[] | null
  campus: string | null
  housing: string | null
  commute_time: string | null
  commute_means: string[] | null
  second_lang: string | null
  marriage_intent: string | null
  preferred_age_band: string | null
  drinking: string | null
  smoking: string | null
  mbti: string | null
  hometown: string | null
}

const DETAIL_DEFAULTS: DetailFieldState = {
  height_cm: null, body_type: null, blood_type: null, sibling_rank: null,
  languages: null, campus: null, housing: null, commute_time: null,
  commute_means: null, second_lang: null,
  marriage_intent: null, preferred_age_band: null, drinking: null,
  smoking: null, mbti: null, hometown: null,
}

// 解説: compressImage = canvas で最大 1920px に縮小 → JPEG quality=0.8 で再エンコードしてファイルサイズを削減する
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
  free_slots: string | null
  identity_verified: boolean
  updated_at: string
  birth_date: string | null
  gender: string | null
  interest_in: string | null
  hidden_clubs: string[]
  student_type: string | null
  admission_year: number | null
  height_cm: number | null
  body_type: string | null
  blood_type: string | null
  sibling_rank: string | null
  languages: string[] | null
  campus: string | null
  housing: string | null
  commute_time: string | null
  commute_means: string[] | null
  second_lang: string | null
  relationship_goal: string | null
  marriage_intent: string | null
  preferred_age_band: string | null
  drinking: string | null
  smoking: string | null
  mbti: string | null
  love_type: string | null
  zodiac: string | null
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
  const [statusMessage, setStatusMessage] = useState('')
  const [freeSlots, setFreeSlots] = useState<string>(EMPTY_FREE_SLOTS)
  const [detailFields, setDetailFields] = useState<DetailFieldState>(DETAIL_DEFAULTS)
  const [identityVerified, setIdentityVerified] = useState(false)
  const [studentType, setStudentType] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  const bioRef = useRef<HTMLTextAreaElement>(null)
  const initialValuesRef = useRef<{
    name: string; year: string; bio: string; interests: string[]
    clubs: string[]; statusMessage: string
    freeSlots: string; detailFields: DetailFieldState
  } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState(false)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [yearModalOpen, setYearModalOpen] = useState(false)

  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [mainImagePath, setMainImagePath] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photosExpanded, setPhotosExpanded] = useState(false)
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
    setStudentType(p.student_type ?? null)

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
          setStatusMessage(draft.status_message ?? '')
          setFreeSlots(isValidFreeSlots(draft.free_slots) ? draft.free_slots : EMPTY_FREE_SLOTS)
          setDetailFields(draft.detail_fields ?? DETAIL_DEFAULTS)
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
    setStatusMessage(p.status_message ?? '')
    setFreeSlots(isValidFreeSlots(p.free_slots) ? p.free_slots : EMPTY_FREE_SLOTS)
    setDetailFields({
      height_cm: p.height_cm ?? null,
      body_type: p.body_type ?? null,
      blood_type: p.blood_type ?? null,
      sibling_rank: p.sibling_rank ?? null,
      languages: p.languages ?? null,
      campus: p.campus ?? null,
      housing: p.housing ?? null,
      commute_time: p.commute_time ?? null,
      commute_means: p.commute_means ?? null,
      second_lang: p.second_lang ?? null,
      marriage_intent: p.marriage_intent ?? null,
      preferred_age_band: p.preferred_age_band ?? null,
      drinking: p.drinking ?? null,
      smoking: p.smoking ?? null,
      mbti: p.mbti ?? null,
      hometown: p.hometown ?? null,
    })
  }, [profileData, initialized])

  useEffect(() => {
    // @copy CRO-error-profile-edit-01 Lv1
    if (loadError) setError('読み込めませんでした。')
  }, [loadError])

  // bio auto-grow
  useEffect(() => {
    const el = bioRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [bio])

  // dirty 判定用の初期値スナップショット（initialized 直後に1回だけ保存）
  useEffect(() => {
    if (!initialized || initialValuesRef.current !== null) return
    initialValuesRef.current = { name, year, bio, interests, clubs, statusMessage, freeSlots, detailFields }
  }, [initialized, name, year, bio, interests, clubs, statusMessage, freeSlots, detailFields])

  useEffect(() => {
    if (loading) return
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          name, bio, year, clubs,
          interests,
          status_message: statusMessage,
          detail_fields: detailFields,
          timestamp: Date.now(),
        }))
      } catch { /* ignore */ }
    }, 1000)
    return () => clearTimeout(timer)
  }, [name, bio, year, clubs, interests, statusMessage, detailFields, loading])

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null)
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!ALLOWED_MIME.includes(file.type)) {
      // @copy CRO-error-profile-edit-photo-01 Lv1 — 保留: 「アップロードできます」は禁止「〜できます」・オーナー確認待ち
      setPhotoError('JPEGまたはPNG形式の画像のみアップロードできます')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      // @copy CRO-error-profile-edit-photo-02 Lv0
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
        // @copy CRO-error-profile-edit-photo-03 Lv1
        setPhotoError(typeof detail === 'string' ? detail : 'アップロードに失敗しました')
      } else {
        setPhotoError('アップロードに失敗しました')
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (photos.length <= 1) {
      setPhotoError('写真は最低1枚必要です。')
      return
    }
    // @copy CRO-confirm-profile-edit-photo-01 Lv1
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
      // @copy CRO-error-profile-edit-photo-04 Lv1
      setPhotoError('削除に失敗しました')
    }
  }

  const handleSetMain = async (photoId: string) => {
    try {
      await api.post(`/api/profile/photos/${photoId}/set-main`)
      const photo = photos.find((p) => p.id === photoId)
      if (photo) setMainImagePath(photo.image_path)
    } catch {
      // @copy CRO-error-profile-edit-photo-05 Lv1
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
      // @copy CRO-error-profile-edit-photo-06 Lv1
      setPhotoError('並び替えに失敗しました')
    }
  }

  const isDirty = (() => {
    if (!initialValuesRef.current) return false
    const init = initialValuesRef.current
    return (
      name !== init.name ||
      year !== init.year ||
      bio !== init.bio ||
      JSON.stringify(interests) !== JSON.stringify(init.interests) ||
      JSON.stringify(clubs) !== JSON.stringify(init.clubs) ||
      statusMessage !== init.statusMessage ||
      freeSlots !== init.freeSlots ||
      JSON.stringify(detailFields) !== JSON.stringify(init.detailFields)
    )
  })()

  const guardedNavigate = (to: string) => {
    if (isDirty) {
      setConfirmDialog(true)
    } else {
      navigate(to)
    }
  }

  const doSave = async () => {
    setError(null)

    if (!name.trim()) {
      setError('表示名を入力してください。')
      return
    }

    if (!bio.trim()) {
      setError('自己紹介を入力してください。')
      return
    }

    if (!year) {
      setError('学年を選択してください')
      return
    }
    const yearNum = parseInt(year, 10)

    setSaving(true)
    const payload: Record<string, unknown> = {
      name: name.trim() || null,
      year: yearNum,
      bio: bio.trim() === '' ? null : bio,
      interests,
      clubs,
      hometown: detailFields.hometown,
      status_message: statusMessage.trim() === '' ? null : statusMessage.trim(),
      hidden_clubs: hiddenClubs,
      free_slots: freeSlots === EMPTY_FREE_SLOTS ? null : freeSlots,
      // 詳細17列（zodiac は生成列のため除外）
      height_cm: detailFields.height_cm,
      body_type: detailFields.body_type,
      blood_type: detailFields.blood_type,
      sibling_rank: detailFields.sibling_rank,
      languages: detailFields.languages,
      campus: detailFields.campus,
      housing: detailFields.housing,
      commute_time: detailFields.commute_time,
      commute_means: detailFields.commute_means,
      second_lang: detailFields.second_lang,
      marriage_intent: detailFields.marriage_intent,
      preferred_age_band: detailFields.preferred_age_band,
      drinking: detailFields.drinking,
      smoking: detailFields.smoking,
      mbti: detailFields.mbti,
    }

    try {
      const res = await api.patch<ProfileData>('/api/profile/me', payload)
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      queryClient.setQueryData(['profile-me'], res.data)
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
          // @copy CRO-error-profile-edit-03 Lv1
          setError('入力値が正しくありません。各フィールドの制限を確認してください。')
        } else {
          // @copy CRO-error-profile-edit-04 Lv1
          setError('保存できませんでした。もう一度お試しください。')
        }
      } else {
        // @copy CRO-error-profile-edit-05 Lv1
        setError('うまくいきませんでした。もう一度お試しください。')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    doSave()
  }

  const handleConfirmSave = () => {
    setConfirmDialog(false)
    doSave()
  }

  const handleConfirmDiscard = () => {
    setConfirmDialog(false)
    navigate('/settings')
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

  // ライブ充実度計算（フォーム状態をリアルタイム反映）
  const _approvedPhotoCount = photos.filter(p => (p.status ?? 'approved') !== 'rejected').length
  const _liveProfile: Record<string, unknown> = profileData
    ? {
        ...(profileData as unknown as Record<string, unknown>),
        ...(initialized ? {
          bio: bio || null,
          free_slots: freeSlots || null,
          ...detailFields,
        } : {}),
      }
    : {}
  const _editCompleteness = Object.keys(_liveProfile).length > 0
    ? computeCompleteness(_liveProfile, _approvedPhotoCount)
    : { score: 100, unfilledMisc: [] as string[] }
  const _editScore = _editCompleteness.score
  const _unfilledMiscSet = new Set(_editCompleteness.unfilledMisc)
  const _editRegime = sendRegime(profileData?.gender, profileData?.interest_in)
  const showBlurNoticeEdit = profileData?.gender === 'female' && _editScore < 80
  const showMaleNoticeEdit = _editRegime === 'male_hetero' && _editScore < 100
  const showSameSexNoticeEdit = _editRegime === 'same_sex' && _editScore < SAME_SEX_UNLOCK

  const registered = photos.length
  const cellCount = registered <= 5 ? 6
    : registered === 6 ? 7
    : photosExpanded
      ? registered + (registered < MAX_SUB_PHOTOS ? 1 : 0)
      : 6

  const yearOptions = (studentType === 'undergrad'
    ? Array.from({ length: SIX_YEAR_FACULTIES.includes(profileData?.faculty as typeof SIX_YEAR_FACULTIES[number]) ? 6 : 4 }, (_, i) => i + 1)
    : studentType === 'grad'
      ? [7, 8, 9, 10, 11]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  ).map((y) => ({ value: String(y), label: getYearLabel(y) ?? String(y) }))

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
                className="flex-1 accent-brand"
              />
              <span className="font-mono text-xs text-white/50">拡大</span>
            </div>
            <div className="flex gap-3">
              {/* @copy CRO-button-profile-edit-crop-01 Lv1 */}
              <button
                type="button"
                onClick={cancelCrop}
                className="flex-1 h-12 font-bold border-2 border-white/30 text-white rounded-xl"
              >
                キャンセル
              </button>
              {/* @copy CRO-button-profile-edit-crop-02 Lv1 */}
              <button
                type="button"
                onClick={confirmCrop}
                className="flex-1 h-12 font-bold border-2 border-ink text-ink rounded-xl"
                style={{ background: 'var(--color-brand)' }}
              >
                この写真を使う
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 未保存警告ダイアログ */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(10,10,10,0.55)' }}>
          <div className="card-bold bg-white p-6 w-full max-w-sm space-y-4">
            <p className="font-bold text-ink">保存していない変更があります。どうしますか？</p>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="bold" onClick={handleConfirmSave} disabled={saving} className="w-full h-11">
                {saving ? '保存中…' : '保存する'}
              </Button>
              <Button type="button" variant="outline-bold" onClick={handleConfirmDiscard} className="w-full h-11">
                保存せずに戻る
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-ink">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => guardedNavigate('/settings')}
            className="w-8 h-8 rounded-full border-2 border-ink bg-white flex items-center justify-center text-sm font-bold shadow-[2px_2px_0_0_#0A0A0A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#0A0A0A] transition-all shrink-0"
          >
            ←
          </button>
          {/* @copy CRO-heading-profile-edit-01 Lv1 */}
          <span className="font-display text-xl text-ink">プロフィールを編集</span>
          {/* @copy CRO-button-profile-edit-01 Lv1 */}
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

      {/* 充実度バー（ヘッダー直下 sticky） */}
      <ProfileCompletenessBar
        profile={_liveProfile}
        photoCount={_approvedPhotoCount}
        gender={profileData?.gender}
        interestIn={profileData?.interest_in}
      />

      {/* コンテンツ */}
      <div className="max-w-[480px] mx-auto px-4 py-6 space-y-5 pb-32">

        {/* ボカし告知（女性・充実度80%未満のとき表示） */}
        {showBlurNoticeEdit && (
          <div
            className="p-3 rounded-[18px] flex items-start gap-2"
            style={{ border: '2px solid var(--color-danger)', background: 'var(--color-paper)' }}
          >
            <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            {/* @copy CRO-label-profile-edit-blur-notice-01 Lv1 */}
            <p className="text-sm font-bold text-ink leading-snug">
              プロフィールを80%まで埋めると、いいねをくれた人の写真を見ることができます。
            </p>
          </div>
        )}

        {/* 男性向け告知（充実度 < 100 のとき表示） */}
        {showMaleNoticeEdit && (
          <div
            className="p-3 rounded-[18px] flex items-start gap-2"
            style={{ border: '2px solid var(--color-ink)', background: 'var(--color-paper)' }}
          >
            <AlertCircle className="w-4 h-4 text-ink/60 shrink-0 mt-0.5" />
            {/* @copy CRO-label-profile-edit-male-notice-01 Lv1 */}
            <p className="text-sm font-bold text-ink leading-snug">
              プロフィールを埋めると、送れるいいねが増えます。80%でログイン回復、100%で回復が2倍に。
            </p>
          </div>
        )}

        {/* 同性向け告知（充実度 < 70 のとき表示） */}
        {showSameSexNoticeEdit && (
          <div
            className="p-3 rounded-[18px] flex items-start gap-2"
            style={{ border: '2px solid var(--color-ink)', background: 'var(--color-paper)' }}
          >
            <AlertCircle className="w-4 h-4 text-ink/60 shrink-0 mt-0.5" />
            {/* @copy CRO-label-profile-edit-samesex-notice-01 Lv1 */}
            <p className="text-sm font-bold text-ink leading-snug">
              プロフィールを{SAME_SEX_UNLOCK}%まで埋めると、いいねが送り放題になります。
            </p>
          </div>
        )}

        {/* 写真管理 */}
        <div className="card-bold bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 uppercase tracking-wide">
              写真
            </h2>
            <span className="font-mono text-xs font-bold text-muted">{photos.length} / {MAX_SUB_PHOTOS}</span>
          </div>

          {photoError && (
            <Alert variant="destructive">
              <AlertDescription>{photoError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: cellCount }).map((_, i) => {
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
                        {/* @copy CRO-label-profile-edit-photo-01 Lv0 */}
                        <span className="font-mono text-[10px] font-bold text-white uppercase tracking-widest">審査中</span>
                      </div>
                    )}

                    {/* rejected オーバーレイ */}
                    {isRejected && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(220,38,38,0.7)' }}>
                        {/* @copy CRO-label-profile-edit-photo-02 Lv0 */}
                        <span className="font-mono text-[10px] font-bold text-white uppercase tracking-widest">承認不可</span>
                      </div>
                    )}

                    {isMain && !isPending && !isRejected && (
                      <span className="absolute top-1 left-1 bg-brand border border-ink text-ink text-[10px] px-1.5 py-0.5 font-mono font-bold leading-none">
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
                        {/* @copy CRO-button-profile-edit-02 Lv1 */}
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
                    uploading || photos.length >= MAX_SUB_PHOTOS
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer hover:bg-brand/10'
                  }`}
                >
                  <span className="text-2xl text-muted-foreground select-none">+</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                    disabled={uploading || photos.length >= MAX_SUB_PHOTOS}
                  />
                </label>
              )
            })}
          </div>

          {registered >= 7 && (
            <button
              type="button"
              onClick={() => setPhotosExpanded(e => !e)}
              className="w-full font-mono text-xs font-bold border-2 border-ink py-2 hover:bg-ink/5 transition-colors"
            >
              {photosExpanded ? '折りたたむ ▲' : `あと ${registered - 6} 枚を表示 ▼`}
            </button>
          )}

          {uploading && (
            // @copy CRO-label-profile-edit-photo-03 Lv1
            <p className="font-mono text-xs text-muted text-center">アップロード中…</p>
          )}
          {/* @copy CRO-label-profile-edit-photo-04 Lv0 */}
          <p className="font-mono text-xs text-subtle">
            JPEG / PNG、5MB以下。最大{MAX_SUB_PHOTOS}枚まで。
          </p>
        </div>

        <form id="profile-form" onSubmit={handleSubmit} noValidate className="space-y-5">

          {savedOk && (
            <Alert>
              <AlertDescription>
                {/* @copy CRO-toast-profile-edit-01 Lv1 */}
                保存しました。いい感じです。
              </AlertDescription>
            </Alert>
          )}
          {draftRestored && !savedOk && (
            <Alert>
              <AlertDescription className="flex items-center justify-between gap-2">
                {/* @copy CRO-label-profile-edit-draft-01 Lv1 */}
                <span>下書きを復元しました。</span>
                {/* @copy CRO-button-profile-edit-03 Lv1 */}
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
                // @copy CRO-placeholder-profile-edit-01 Lv1
                placeholder={`みんなに表示される名前（最大${NAME_MAX}文字）`}
                className="border-2 border-ink focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#0A0A0A]"
              />
              <p className={`font-mono text-xs text-right ${name.length >= NAME_MAX - 10 ? 'text-destructive' : 'text-subtle'}`}>
                {name.length} / {NAME_MAX}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setYearModalOpen(true)}
              className="w-full flex items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-ink/5 active:bg-ink/10"
            >
              <p className="font-mono text-xs font-bold shrink-0 uppercase" style={{ color: 'rgba(10,10,10,0.6)' }}>
                学年<span className="badge-required">必須</span>
              </p>
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-sm truncate" style={{ fontWeight: year ? 700 : 400, color: year ? '#0A0A0A' : 'rgba(10,10,10,0.4)' }}>
                  {year ? getYearLabel(parseInt(year, 10)) : '選択してください'}
                </p>
                <ChevronRight className="w-4 h-4 text-ink/30 shrink-0" />
              </div>
            </button>

            <div className="space-y-1.5">
              <Label htmlFor="status-message" className="font-mono text-xs font-bold text-muted uppercase">今日の一言</Label>
              <Input
                id="status-message"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value.slice(0, STATUS_MESSAGE_MAX))}
                maxLength={STATUS_MESSAGE_MAX}
                // @copy CRO-placeholder-profile-edit-02 Lv1
                placeholder="今日の気分を一言で（30文字以内）"
                className="border-2 border-ink focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#0A0A0A]"
              />
              <p className={`font-mono text-xs text-right ${statusMessage.length >= STATUS_MESSAGE_MAX - 5 ? 'text-destructive' : 'text-subtle'}`}>
                {statusMessage.length} / {STATUS_MESSAGE_MAX}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="font-mono text-xs font-bold text-muted uppercase">自己紹介<span className="badge-required">必須</span></Label>
              <Textarea
                ref={bioRef}
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                maxLength={BIO_MAX}
                // @copy CRO-placeholder-profile-edit-03 Lv1
                placeholder="あなたのこと、もっと知りたい。"
                className="resize-none border-2 border-ink focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#0A0A0A] overflow-hidden"
                style={{ minHeight: '5.5rem' }}
              />
              <p className={`font-mono text-xs text-right ${bio.length >= 900 ? 'text-destructive' : 'text-subtle'}`}>
                {bio.length} / {BIO_MAX}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="font-mono text-xs font-bold text-muted uppercase">
                所属サークル・部活
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

          </div>

          {/* 詳細プロフィール */}
          <div className="card-bold bg-white p-5">
            <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-block uppercase tracking-wide mb-4">
              詳細プロフィール
            </h2>
            <div>
              {/* 星座（read専用・生年月日から自動生成） */}
              {profileData?.zodiac && (
                <div
                  className="flex items-center justify-between gap-3 py-3"
                  style={{ borderBottom: '1px solid rgba(10,10,10,0.12)' }}
                >
                  <span className="font-mono text-xs font-bold text-ink/60 uppercase shrink-0">星座</span>
                  <span className="text-sm font-bold text-ink">{ZODIAC_LABELS[profileData.zodiac] ?? profileData.zodiac}</span>
                </div>
              )}
              {DETAIL_FIELDS.map((field, idx) => {
                const getDisplayText = (): { text: string; hasValue: boolean } => {
                  if (field.control === 'height') {
                    return detailFields.height_cm !== null
                      ? { text: HEIGHT_OPTIONS.find(o => o.value === String(detailFields.height_cm))?.label ?? `${detailFields.height_cm}cm`, hasValue: true }
                      : { text: '未選択', hasValue: false }
                  }
                  if (field.control === 'single') {
                    const v = detailFields[field.key as keyof DetailFieldState] as string | null
                    const label = v ? field.options?.find(o => o.value === v)?.label ?? v : null
                    return label ? { text: label, hasValue: true } : { text: '未選択', hasValue: false }
                  }
                  const arr = (detailFields[field.key as keyof DetailFieldState] as string[] | null) ?? []
                  const labels = arr.map(v => field.options?.find(o => o.value === v)?.label ?? v)
                  return labels.length > 0 ? { text: labels.join('・'), hasValue: true } : { text: '未選択', hasValue: false }
                }
                const { text, hasValue } = getDisplayText()
                const unfilled = _unfilledMiscSet.has(field.key)
                return (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => setActiveModal(field.key)}
                    className="w-full flex items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-ink/5 active:bg-ink/10"
                    style={{ borderBottom: idx < DETAIL_FIELDS.length - 1 ? '1px solid rgba(10,10,10,0.12)' : 'none' }}
                  >
                    <p className="font-mono text-xs font-bold shrink-0" style={{ color: unfilled ? 'var(--color-danger)' : 'rgba(10,10,10,0.6)' }}>
                      {field.label}
                    </p>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p
                        className="text-sm truncate"
                        style={{ fontWeight: hasValue ? 700 : 400, color: hasValue ? '#0A0A0A' : 'rgba(10,10,10,0.4)' }}
                      >
                        {text}
                      </p>
                      <ChevronRight className="w-4 h-4 text-ink/30 shrink-0" />
                    </div>
                  </button>
                )
              })}
            </div>
            {/* 空きコマ（詳細プロフィール末尾）*/}
            <div className="pt-3" style={{ borderTop: '1px solid rgba(10,10,10,0.12)' }}>
              <p
                className="font-mono text-xs font-bold uppercase mb-2"
                style={{ color: _unfilledMiscSet.has('free_slots') ? 'var(--color-danger)' : 'rgba(10,10,10,0.6)' }}
              >
                空きコマ
              </p>
              <p className="font-mono text-xs text-subtle mb-3">授業がある時間を緑にしてください。</p>
              <FreeSlotGrid value={freeSlots} editable onChange={setFreeSlots} />
            </div>
          </div>

          {/* アカウント情報（学籍情報・変更不可） */}
          <div className="card-bold bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-block uppercase tracking-wide">
                アカウント情報
              </h2>
              {identityVerified && (
                <span className="font-mono text-[10px] font-bold bg-brand border border-ink text-ink px-1.5 py-0.5 leading-none flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  承認済み
                </span>
              )}
            </div>
            {!identityVerified && (
              // @copy CRO-label-profile-edit-02 Lv1
              <p className="font-mono text-xs text-muted">学生証を提出すると設定されます。</p>
            )}
            <div>
              {([
                { label: '生年月日', value: profileData?.birth_date ? new Date(profileData.birth_date + 'T00:00:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : null, isKyc: true },
                { label: '学部 / 研究科', value: profileData?.faculty },
                { label: '学科 / 専攻', value: profileData?.department },
                { label: '入学年度', value: profileData?.admission_year ? `${profileData.admission_year}年度入学` : null },
                { label: '性別', value: profileData?.gender === 'male' ? '男性' : profileData?.gender === 'female' ? '女性' : null, locked: true },
                { label: '恋愛対象', value: profileData?.interest_in === 'male' ? '男性' : profileData?.interest_in === 'female' ? '女性' : null, locked: true },
              ] as { label: string; value: string | null | undefined; locked?: boolean; isKyc?: boolean }[]).map(({ label, value, locked, isKyc }, idx, arr) => {
                const isPurged = isKyc && !value && identityVerified
                return (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 py-3"
                    style={{ borderBottom: idx < arr.length - 1 ? '1px solid rgba(10,10,10,0.12)' : 'none' }}
                  >
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Label className="font-mono text-xs font-bold text-muted uppercase">{label}</Label>
                      {(identityVerified || locked) && <Lock className="w-3 h-3 text-ink/40" />}
                    </div>
                    <div className="text-sm text-right min-w-0">
                      {value
                        ? <span className="text-ink/70">{value}</span>
                        : isPurged
                          ? <span className="text-ink/30 font-mono text-xs">削除済み</span>
                          : (
                            // @copy CRO-label-profile-edit-03 Lv1
                            <span className="text-ink/30 font-mono text-xs">未設定</span>
                          )
                      }
                    </div>
                  </div>
                )
              })}
            </div>
            {identityVerified && (
              // @copy CRO-label-profile-edit-04 Lv1
              <p className="font-mono text-xs text-subtle">
                これらの情報は学生証承認後に変更できません。
              </p>
            )}
          </div>

        </form>
      </div>

      {/* 学年選択モーダル */}
      {yearModalOpen && (
        <SelectModal
          open
          mode="single"
          title="学年を選ぶ"
          options={yearOptions}
          value={year || null}
          onConfirm={(next) => {
            setYear(next !== null ? String(next) : '')
            setYearModalOpen(false)
          }}
          onClose={() => setYearModalOpen(false)}
        />
      )}

      {/* 選択モーダル（single / multi 共通） */}
      {(() => {
        const fieldDef = DETAIL_FIELDS.find(f => f.key === activeModal)
        if (!fieldDef) return null
        const isMulti = fieldDef.control === 'multi'
        const isHeight = fieldDef.control === 'height'
        const rawValue = detailFields[fieldDef.key as keyof DetailFieldState]
        const modalOptions = isHeight ? HEIGHT_OPTIONS : (fieldDef.options ?? [])
        const modalValue = isMulti
          ? ((rawValue as string[] | null) ?? [])
          : isHeight
            ? (rawValue !== null ? String(rawValue) : null)
            : (rawValue as string | null)
        return (
          <SelectModal
            open
            mode={isMulti ? 'multi' : 'single'}
            title={`${fieldDef.label}を選ぶ`}
            options={modalOptions}
            value={modalValue}
            maxItems={fieldDef.maxItems}
            onConfirm={(next) => {
              setDetailFields(prev => ({
                ...prev,
                [fieldDef.key]: isMulti
                  ? ((next as string[]).length === 0 ? null : next)
                  : isHeight
                    ? (next !== null ? parseInt(next as string, 10) : null)
                    : (next as string | null),
              } as DetailFieldState))
              setActiveModal(null)
            }}
            onClose={() => setActiveModal(null)}
          />
        )
      })()}

      {/* 固定保存バー */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-ink">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex gap-3">
          <Button
            type="submit"
            form="profile-form"
            variant="bold"
            disabled={saving || !name.trim() || !bio.trim() || !year}
            className="flex-1 h-11 text-base"
          >
            {/* @copy CRO-button-profile-edit-04 Lv1 (保存中) / CRO-button-profile-edit-05 Lv1 (保存する) */}
            {saving ? '保存中…' : '保存する'}
          </Button>
          {/* @copy CRO-button-profile-edit-06 Lv1 */}
          <Button
            type="button"
            variant="outline-bold"
            onClick={() => guardedNavigate('/settings')}
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
