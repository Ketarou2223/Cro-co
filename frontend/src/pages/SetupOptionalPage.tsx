// 解説: このファイルは任意プロフィール設定（オプションオンボーディング）ページを定義する。
// 解説: 18画面シーケンス: よ(HypeScreen)／S(入力) 交互。STEP 3-6-8-10-12-14-16、hype それ以外
// 解説: react-easy-crop でアバタートリミング → compressImage で JPEG 圧縮 → POST /api/profile/photos
// 解説: 各 STEP の「次へ」は API 保存後に advance()。遷移は yo7(idx17) の onNext が /setup/notify を担う
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import ClubSelector from '@/components/ClubSelector'
import HypeScreen from '@/components/HypeScreen'
import LoadingScreen from '@/components/LoadingScreen'
import { useProfile } from '@/hooks/useProfile'
import { getCroppedImg } from '@/lib/cropImage'
import { getYearLabel } from '@/lib/utils'
import api from '@/lib/api'
import {
  ONBOARDING_HYPE,
  YO5_REST,
  YO5_BUTTON,
  BIO_RECOMMENDED_LEN,
  BIO_PLACEHOLDER,
  PHOTO_LEAD,
  PHOTO_NG_HEADING,
  PHOTO_NG_EXAMPLES,
  pickYo5FirstLine,
} from '@/constants/onboardingCopy'

const MAX_SUB_PHOTOS = 15

type FacultyHideLevel = 'none' | 'faculty' | 'department'

// STEP idx → 表示番号(1〜7)。写真=1, サブ写真=2, 表示名=3, 学年=4, 自己紹介=5, 今日のひとこと=6, 身バレ=7
const STEP_NO: Record<number, number> = { 3: 1, 6: 2, 8: 3, 10: 4, 12: 5, 14: 6, 16: 7 }
// STEP idx → 戻り先 STEP idx
const BACK_IDX: Record<number, number> = { 6: 3, 8: 6, 10: 8, 12: 10, 14: 12, 16: 14 }
// スキップ可能な STEP idx
const SKIP_SCREENS = new Set([14, 16])

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

export default function SetupOptionalPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bioRef = useRef<HTMLTextAreaElement>(null)
  const { profile, isLoading } = useProfile()

  const [screenIdx, setScreenIdx] = useState(0)
  const advance = () => setScreenIdx((i) => i + 1)

  // 写真
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  // 表示名 / 学年 / 自己紹介 / 今日の一言
  const [displayName, setDisplayName] = useState('')
  const [year, setYear] = useState('')
  const [bio, setBio] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  // 身バレ防止
  const [clubs, setClubs] = useState<string[]>([])
  const [facultyHideLevel, setFacultyHideLevel] = useState<FacultyHideLevel>('none')
  const [hiddenClubs, setHiddenClubs] = useState<string[]>([])

  // サブ写真
  const [subPhotosLocal, setSubPhotosLocal] = useState<string[]>([])
  const [uploadingSubPhoto, setUploadingSubPhoto] = useState(false)

  // UI 状態
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoAttempted, setPhotoAttempted] = useState(false)
  const [subPhotoAttempted, setSubPhotoAttempted] = useState(false)
  const [nameAttempted, setNameAttempted] = useState(false)
  const [yearAttempted, setYearAttempted] = useState(false)
  const [bioAttempted, setBioAttempted] = useState(false)

  // プロフィールから name / year をプリフィル
  useEffect(() => {
    if (profile?.name) setDisplayName(profile.name)
  }, [profile?.name])
  useEffect(() => {
    if (profile?.year) setYear(String(profile.year))
  }, [profile?.year])

  // clubs 変更時に hiddenClubs を同期
  useEffect(() => {
    setHiddenClubs((prev) => prev.filter((c) => clubs.includes(c)))
  }, [clubs])

  // 自己紹介テキストエリア: screenIdx=12 に遷移した際、既存 bio があれば高さを初期化
  useEffect(() => {
    if (screenIdx !== 12 || !bioRef.current) return
    const el = bioRef.current
    el.style.height = 'auto'
    el.style.height = Math.max(el.scrollHeight, 380) + 'px'
  }, [screenIdx])

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ''
    const url = URL.createObjectURL(f)
    setCropImageSrc(url)
    setCropPos({ x: 0, y: 0 })
    setZoom(1)
  }

  const cancelCrop = () => setCropImageSrc(null)

  const confirmCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return
    try {
      const blob = await getCroppedImg(cropImageSrc, croppedAreaPixels)
      const compressed = await compressImage(blob)
      const previewUrl = URL.createObjectURL(compressed)
      if (screenIdx === 6) {
        // サブ写真モード: 即アップロードしてローカル一覧に追加
        setCropImageSrc(null)
        setUploadingSubPhoto(true)
        try {
          const fd = new FormData()
          fd.append('file', compressed, 'photo.jpg')
          await api.post('/api/profile/photos', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          setSubPhotosLocal(prev => [...prev, previewUrl])
        } catch {
          // アップロード失敗は無視
        } finally {
          setUploadingSubPhoto(false)
        }
      } else {
        // メイン写真モード
        setCroppedBlob(compressed)
        setPhotoPreview(previewUrl)
        setCropImageSrc(null)
      }
    } catch {
      setCropImageSrc(null)
    }
  }

  // サブ写真の判定: rejected を除外したサブ枚数（既存）+ 今セッション分の合計 >= 1
  // profile.photos はメイン込み（profile_images 全行）なのでメインを除いてカウントする
  const existingSubPhotoCount = (() => {
    const allPhotos = profile?.photos ?? []
    const valid = allPhotos.filter(p => (p.status ?? 'pending') !== 'rejected')
    const mainPath = profile?.profile_image_path ?? null
    if (mainPath) {
      // admin がメインを承認済み: そのパスを除外してサブ数を数える
      return valid.filter(p => p.image_path !== mainPath).length
    }
    // メイン未設定（オンボ中・未承認）: display_order 最小の先頭 1 枚がメイン候補 → 残りがサブ
    return Math.max(0, valid.length - 1)
  })()
  const hasSubPhoto = existingSubPhotoCount + subPhotosLocal.length >= 1

  const uploadPhoto = async () => {
    if (!croppedBlob) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('file', croppedBlob, 'photo.jpg')
      await api.post('/api/profile/photos', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    } catch {
      // 写真アップロード失敗は無視して進む
    } finally {
      setUploadingPhoto(false)
    }
  }

  const hasPhoto = photoPreview !== null || (profile?.photos?.length ?? 0) > 0

  const studentType = profile?.student_type
  const yearOptions: number[] =
    studentType === 'undergrad'
      ? [1, 2, 3, 4, 5, 6]
      : studentType === 'grad'
        ? [7, 8, 9, 10, 11]
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

  const handleNext = async () => {
    setError(null)
    if (screenIdx === 3) {
      setPhotoAttempted(true)
      if (!hasPhoto) return
      if (croppedBlob) await uploadPhoto()
      advance()
    } else if (screenIdx === 6) {
      setSubPhotoAttempted(true)
      if (!hasSubPhoto) return
      advance()
    } else if (screenIdx === 8) {
      setNameAttempted(true)
      if (!displayName.trim()) return
      try { await api.patch('/api/profile/me', { name: displayName.trim() }) } catch { /* ignore */ }
      advance()
    } else if (screenIdx === 10) {
      setYearAttempted(true)
      if (!year) return
      try { await api.patch('/api/profile/me', { year: parseInt(year) }) } catch { /* ignore */ }
      advance()
    } else if (screenIdx === 12) {
      setBioAttempted(true)
      if (!bio.trim()) return
      try { await api.patch('/api/profile/me', { bio: bio.trim() }) } catch { /* ignore */ }
      advance()
    } else if (screenIdx === 14) {
      if (statusMessage.trim()) {
        try { await api.patch('/api/profile/me', { status_message: statusMessage.trim() }) } catch { /* ignore */ }
      }
      advance()
    } else if (screenIdx === 16) {
      setSaving(true)
      try {
        const updates: Record<string, unknown> = {}
        if (clubs.length > 0) updates.clubs = clubs
        updates.faculty_hide_level = facultyHideLevel
        if (hiddenClubs.length > 0) updates.hidden_clubs = hiddenClubs
        if (Object.keys(updates).length > 0) {
          await api.patch('/api/profile/me', updates)
        }
        await queryClient.invalidateQueries({ queryKey: ['profile-me'] })
        advance()
      } catch {
        setError('うまくいきませんでした。もう一度お試しください。')
      } finally {
        setSaving(false)
      }
    }
  }

  const handleBack = () => {
    if (screenIdx === 3) {
      navigate('/setup/install', { replace: true })
    } else {
      setScreenIdx(BACK_IDX[screenIdx])
    }
  }

  // 今日のひとこと(idx=14)・身バレ(idx=16) のみスキップ可
  const handleSkip = () => advance()

  // STEP 画面の進捗計算
  const stepNo = STEP_NO[screenIdx] ?? 1
  const progress = (stepNo / 7) * 100

  const stepCanProceed: Record<number, boolean> = {
    3: hasPhoto,
    6: hasSubPhoto,
    8: displayName.trim().length > 0,
    10: year !== '',
    12: bio.trim().length > 0,
    14: true,
    16: true,
  }
  const canProceed = stepCanProceed[screenIdx] ?? true
  const isSubmitting = uploadingPhoto || uploadingSubPhoto || saving

  let nextLabel = '次へ →'
  if (uploadingPhoto || uploadingSubPhoto) nextLabel = '送信中…'
  else if (saving) nextLabel = '保存中…'

  // ─── アーリーリターン ───────────────────────────────────

  if (isLoading) return <LoadingScreen />

  if (profile && !profile.student_id_submitted) {
    return <Navigate to="/setup/required" replace />
  }
  if (profile?.onboarding_completed) {
    return <Navigate to="/browse" replace />
  }

  // クロップモーダル（全画面・z-50）
  if (cropImageSrc) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-ink">
        <div className="relative flex-1">
          <Cropper
            image={cropImageSrc}
            crop={cropPos}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCropPos}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="px-5 py-5 space-y-3 bg-ink">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-white/50">縮小</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-brand"
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
              className="flex-1 h-12 font-bold border-2 border-ink text-ink bg-brand rounded-xl"
            >
              この写真を使う
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── HypeScreen ディスパッチ ─────────────────────────────

  if (screenIdx === 0) {
    return <HypeScreen lines={[...ONBOARDING_HYPE.yo0a.lines]} buttonLabel={ONBOARDING_HYPE.yo0a.button} onNext={advance} />
  }
  if (screenIdx === 1) {
    return <HypeScreen lines={[...ONBOARDING_HYPE.yo0b.lines]} buttonLabel={ONBOARDING_HYPE.yo0b.button} onNext={advance} />
  }
  if (screenIdx === 2) {
    return <HypeScreen lines={[...ONBOARDING_HYPE.yo1.lines]} buttonLabel={ONBOARDING_HYPE.yo1.button} onNext={advance} showCroco />
  }
  // idx 4, 5: メイン写真直後のサブ写真誘導 hype
  if (screenIdx === 4) {
    return <HypeScreen lines={[...ONBOARDING_HYPE.yoSubA.lines]} buttonLabel={ONBOARDING_HYPE.yoSubA.button} onNext={advance} />
  }
  if (screenIdx === 5) {
    return <HypeScreen lines={[...ONBOARDING_HYPE.yoSubB.lines]} buttonLabel={ONBOARDING_HYPE.yoSubB.button} onNext={advance} />
  }
  // idx 7: サブ写真 STEP 直後 → 表示名へ
  if (screenIdx === 7) {
    return <HypeScreen lines={[...ONBOARDING_HYPE.yo2.lines]} buttonLabel={ONBOARDING_HYPE.yo2.button} onNext={advance} />
  }
  if (screenIdx === 9) {
    return <HypeScreen lines={[...ONBOARDING_HYPE.yo3.lines]} buttonLabel={ONBOARDING_HYPE.yo3.button} onNext={advance} />
  }
  if (screenIdx === 11) {
    return <HypeScreen lines={[...ONBOARDING_HYPE.yo4.lines]} buttonLabel={ONBOARDING_HYPE.yo4.button} onNext={advance} />
  }
  if (screenIdx === 13) {
    return (
      <HypeScreen
        lines={[pickYo5FirstLine(bio.length), YO5_REST]}
        buttonLabel={YO5_BUTTON}
        onNext={advance}
      />
    )
  }
  if (screenIdx === 15) {
    return <HypeScreen lines={[...ONBOARDING_HYPE.yo6.lines]} buttonLabel={ONBOARDING_HYPE.yo6.button} onNext={advance} />
  }
  if (screenIdx === 17) {
    return (
      <HypeScreen
        lines={[...ONBOARDING_HYPE.yo7.lines]}
        buttonLabel={ONBOARDING_HYPE.yo7.button}
        onNext={() => navigate('/setup/notify', { replace: true })}
        showCroco
      />
    )
  }

  // ─── STEP 画面（screenIdx: 3 / 5 / 7 / 9 / 11 / 13）────────

  return (
    <div className="h-dvh flex flex-col max-w-[480px] mx-auto">

      {/* プログレスバー */}
      <div className="sticky top-0 z-10 px-5 pt-4 pb-4 bg-ink">
        <p className="font-mono text-white/60 text-xs mb-1.5 uppercase tracking-widest">STEP {stepNo} / 7</p>
        <div className="h-1.5 rounded-full overflow-hidden mb-3 bg-white/15">
          <div
            className="h-full rounded-full transition-all duration-500 bg-brand"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-white font-bold text-base">プロフィールを充実させましょう。</p>
        <p className="text-white/40 text-xs mt-0.5">あとで設定することもできます。</p>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 min-h-0 bg-paper px-5 pt-6 pb-6 overflow-y-auto">

        {/* 常時レンダリング: 写真選択 input（メイン写真・サブ写真両方で使用） */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* ── STEP 1 (idx=3): メイン写真 ── */}
        {screenIdx === 3 && (
          <div className="space-y-6">
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              まずは顔写真を登録しましょう。
            </h2>

            <div className="space-y-3">
              <p className="font-bold text-sm text-ink">プロフィール写真<span className="badge-required">必須</span></p>
              <p className="text-xs text-ink/60">{PHOTO_LEAD}</p>

              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center border-2 border-ink bg-bone">
                  {photoPreview ? (
                    <img src={photoPreview} alt="プレビュー" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl text-ink/20 font-bold">?</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-bold px-4 py-2 border-2 border-ink bg-brand rounded-lg shadow-[3px_3px_0_0_var(--color-ink)]"
                >
                  {photoPreview ? '写真を変える' : '+ 写真を追加'}
                </button>
                <p className="text-sm text-ink/60 text-center">写真を設定すると、マッチしやすくなります。</p>
              </div>

              {photoAttempted && !hasPhoto && (
                <p className="text-sm font-bold text-center text-danger">写真を設定してください。</p>
              )}
            </div>

            {/* NG 例 */}
            <div className="space-y-2">
              <p className="font-mono text-xs font-bold uppercase tracking-wide text-ink/40">{PHOTO_NG_HEADING}</p>
              <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                {PHOTO_NG_EXAMPLES.map((label) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="text-xs font-bold text-danger">✕</span>
                    <span className="text-xs text-ink">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2 (idx=6): サブ写真 ── */}
        {screenIdx === 6 && (
          <div className="space-y-6">
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              サブの写真を選びましょう。
            </h2>

            {/* ガイドカード */}
            <div className="p-4 space-y-3 rounded-xl border-2 border-ink bg-bone">
              <p className="font-mono text-xs font-bold text-ink uppercase tracking-wider">PHOTO GUIDE</p>
              <p className="text-sm font-bold text-ink">3枚以上登録すると、マッチの確率が上がります</p>
              <div className="space-y-1">
                <p className="text-xs font-bold text-ink">こんな写真を選ぶといいです</p>
                <ul className="text-xs text-ink/60 space-y-0.5">
                  <li>· 顔がわかる一枚（角度を変えて）</li>
                  <li>· 趣味や好きなものがわかる写真</li>
                  <li>· 自然な表情のスナップ</li>
                </ul>
              </div>
            </div>

            {/* 写真グリッド */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-sm text-ink">
                  サブ写真<span className="badge-required">必須（1枚以上）</span>
                </p>
                <span className="font-mono text-xs text-ink/40">
                  {subPhotosLocal.length} / {MAX_SUB_PHOTOS - 1}枚
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {subPhotosLocal.map((url, i) => (
                  <div key={i} className="aspect-square overflow-hidden border-2 border-ink bg-bone">
                    <img src={url} alt={`サブ写真${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                {uploadingSubPhoto && (
                  <div className="aspect-square border-2 border-ink bg-bone flex items-center justify-center">
                    <span className="font-mono text-xs text-ink/60">送信中…</span>
                  </div>
                )}
                {!uploadingSubPhoto && subPhotosLocal.length < MAX_SUB_PHOTOS - 1 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-ink flex items-center justify-center text-2xl text-ink/30 hover:bg-brand/10 transition-colors"
                  >
                    +
                  </button>
                )}
              </div>

              {subPhotoAttempted && !hasSubPhoto && (
                <p className="text-sm font-bold mt-2 text-center text-danger">写真を1枚以上追加してください。</p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3 (idx=8): 表示名 ── */}
        {screenIdx === 8 && (
          <div className="space-y-6">
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              表示名を決めましょう。
            </h2>
            <div>
              <label className="block font-bold text-sm text-ink mb-1.5">
                表示名<span className="badge-required">必須</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 20))}
                placeholder="みんなに表示される名前です。"
                className="w-full h-11 border-2 border-ink px-3 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_var(--color-ink)] rounded-lg"
                maxLength={20}
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-ink/40">他のユーザーに表示される名前です</p>
                <p className="text-xs text-ink/40">{displayName.length} / 20</p>
              </div>
              {nameAttempted && !displayName.trim() && (
                <p className="text-sm font-bold mt-1 text-danger">表示名を入力してください。</p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 4 (idx=10): 学年 ── */}
        {screenIdx === 10 && (
          <div className="space-y-6">
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              学年を教えてください。
            </h2>
            <div>
              <label className="block font-bold text-sm text-ink mb-1.5">
                学年<span className="badge-required">必須</span>
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full h-11 border-2 border-ink bg-paper px-3 text-sm focus:outline-none rounded-lg"
              >
                <option value="">選択してください</option>
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>{getYearLabel(y)}</option>
                ))}
              </select>
              {yearAttempted && !year && (
                <p className="text-sm font-bold mt-1 text-danger">学年を選択してください。</p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 5 (idx=12): 自己紹介 ── */}
        {screenIdx === 12 && (
          <div className="space-y-5">
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              自己紹介を書いてみましょう。
            </h2>
            <p className="text-sm text-ink/60">自己紹介を書くと、あなたと相性がいい人と出会いやすくなります。</p>

            {/* WRITING GUIDE */}
            <div className="p-4 space-y-3 rounded-xl border-2 border-ink bg-bone">
              <p className="font-mono text-xs font-bold text-ink uppercase tracking-wider">WRITING GUIDE</p>
              <div className="space-y-1">
                <p className="text-xs font-bold text-ink">書くと盛り上がる話題</p>
                <ul className="text-xs text-ink/60 space-y-0.5">
                  <li>· 趣味や最近ハマってること</li>
                  <li>· よく行く場所・お気に入りのお店</li>
                  <li>· 休日の過ごし方や好きなこと</li>
                  <li>· 大学でやっていること</li>
                </ul>
              </div>
              <div className="h-px bg-ink/10" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-hot">書かないでほしいこと</p>
                <ul className="text-xs text-ink/60 space-y-0.5">
                  <li>· SNSのIDや連絡先（マッチ後に交換しましょう）</li>
                  <li>· 本名・住所などの個人情報</li>
                  <li>· 他のユーザーへの批判・悪口</li>
                </ul>
              </div>
            </div>

            {/* 自己紹介 textarea */}
            <div>
              <label className="block font-bold text-sm text-ink mb-1.5">
                自己紹介<span className="badge-required">必須</span>
              </label>
              <textarea
                ref={bioRef}
                value={bio}
                onChange={(e) => {
                  const el = e.target
                  el.style.height = 'auto'
                  el.style.height = el.scrollHeight + 'px'
                  setBio(el.value.slice(0, 700))
                }}
                placeholder={BIO_PLACEHOLDER}
                className="w-full border-2 border-ink px-3 py-2.5 text-sm resize-none focus:outline-none focus:shadow-[2px_2px_0_0_var(--color-ink)] rounded-lg overflow-hidden"
                style={{ minHeight: '380px' }}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-ink/40">350字くらい書くと、ぐっと伝わります</p>
                <p className={`text-xs font-mono ${bio.length >= BIO_RECOMMENDED_LEN ? 'text-success' : 'text-ink/40'}`}>
                  {bio.length}字
                </p>
              </div>
              {bioAttempted && !bio.trim() && (
                <p className="text-sm font-bold mt-1 text-danger">自己紹介を入力してください。</p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 6 (idx=14): 今日のひとこと ── */}
        {screenIdx === 14 && (
          <div className="space-y-6">
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              今日のひとことを教えてください。
            </h2>
            <div>
              <label className="block font-bold text-sm text-ink mb-1.5">今日の一言</label>
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value.slice(0, 30))}
                placeholder="今日の気分を一言で"
                className="w-full h-11 border-2 border-ink px-3 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_var(--color-ink)] rounded-lg"
              />
              <p className="text-xs text-ink/40 text-right mt-1">{statusMessage.length} / 30</p>
            </div>
          </div>
        )}

        {/* ── STEP 7 (idx=16): 身バレ防止 ── */}
        {screenIdx === 16 && (
          <div className="space-y-6">
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              身バレ防止の設定をしましょう。
            </h2>

            {/* サークル */}
            <div>
              <label className="block font-bold text-sm text-ink mb-2">所属サークル</label>
              <ClubSelector selected={clubs} onChange={setClubs} maxCount={5} />
            </div>

            {/* 身バレ防止設定 */}
            <div
              className="p-4 rounded-xl border-2 border-ink shadow-[4px_4px_0_0_var(--color-ink)]"
            >
              <span className="font-mono text-xs font-bold bg-ink text-white px-2 py-1 uppercase">身バレ防止設定</span>

              <div className="space-y-2 mt-8">
                <p className="font-bold text-sm text-ink">
                  {studentType === 'grad' ? '研究科の非表示設定' : '学部・学科の非表示設定'}
                </p>
                <p className="text-xs text-ink/60 leading-relaxed">
                  {studentType === 'grad'
                    ? '同じ研究科の人にあなたのプロフィールは表示されず、あなたにも相手のプロフィールは表示されません。お互いに見えなくすることで、身バレを防ぎます。'
                    : '同じ学部・学科の人にあなたのプロフィールは表示されず、あなたにも相手のプロフィールは表示されません。お互いに見えなくすることで、身バレを防ぎます。'}
                </p>
                {(studentType === 'grad'
                  ? [
                      { value: 'none' as FacultyHideLevel, label: '全員に表示する' },
                      { value: 'faculty' as FacultyHideLevel, label: '同じ研究科の人とお互いに見えなくする' },
                    ]
                  : [
                      { value: 'none' as FacultyHideLevel, label: '全員に表示する' },
                      { value: 'faculty' as FacultyHideLevel, label: '同じ学部の人とお互いに見えなくする' },
                      { value: 'department' as FacultyHideLevel, label: '同じ学科の人とお互いに見えなくする' },
                    ]
                ).map((opt) => {
                  const subtitle =
                    opt.value === 'faculty' ? (profile?.faculty ? `${profile.faculty}の人とお互いに非表示にする` : null)
                    : opt.value === 'department' ? (profile?.department ? `${profile.department}の人とお互いに非表示にする` : null)
                    : null
                  return (
                    <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
                      <div
                        className="w-5 h-5 mt-0.5 rounded-full border-2 border-ink flex items-center justify-center shrink-0"
                        style={{ background: facultyHideLevel === opt.value ? 'var(--color-ink)' : 'var(--color-paper)' }}
                        onClick={() => setFacultyHideLevel(opt.value)}
                      >
                        {facultyHideLevel === opt.value && (
                          <div className="w-2 h-2 rounded-full bg-brand" />
                        )}
                      </div>
                      <div className="flex flex-col" onClick={() => setFacultyHideLevel(opt.value)}>
                        <span className="text-sm font-medium text-ink leading-snug">{opt.label}</span>
                        {subtitle && (
                          <span className="text-xs text-ink/40 mt-0.5">{subtitle}</span>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>

              {clubs.length > 0 && (
                <>
                  <div className="border-t border-ink/10 mt-6" />
                  <div className="space-y-2 mt-4">
                    <p className="font-bold text-sm text-ink">所属サークルの非表示</p>
                    <p className="text-xs text-ink/40">非表示にしたサークルの同メンバーには表示されなくなります</p>
                    <div className="space-y-1.5">
                      {clubs.map((club) => {
                        const isHidden = hiddenClubs.includes(club)
                        return (
                          <label key={club} className="flex items-center gap-2 cursor-pointer">
                            <div
                              className="w-5 h-5 rounded border-2 border-ink flex items-center justify-center shrink-0"
                              style={{ background: isHidden ? 'var(--color-ink)' : 'var(--color-paper)' }}
                              onClick={() =>
                                setHiddenClubs((prev) =>
                                  isHidden ? prev.filter((c) => c !== club) : [...prev, club]
                                )
                              }
                            >
                              {isHidden && <span className="text-white text-xs font-bold leading-none">✓</span>}
                            </div>
                            <span
                              className="text-sm font-medium text-ink"
                              onClick={() =>
                                setHiddenClubs((prev) =>
                                  isHidden ? prev.filter((c) => c !== club) : [...prev, club]
                                )
                              }
                            >
                              {club}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ボトムボタン */}
      <div
        className="shrink-0 px-5 pt-4 space-y-2 bg-paper border-t-2 border-ink"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {error && <p className="text-sm text-danger font-medium text-center">{error}</p>}
        <button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting}
          className="w-full h-14 font-bold text-base text-white border-2 border-ink rounded-xl bg-ink shadow-[4px_4px_0_0_var(--color-ink)] transition-opacity"
          style={{ opacity: isSubmitting || !canProceed ? 0.4 : 1 }}
        >
          {nextLabel}
        </button>
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="text-ink/60 text-sm font-bold py-1"
          >
            ← 戻る
          </button>
          {SKIP_SCREENS.has(screenIdx) && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-ink/40 text-sm font-medium py-1"
            >
              スキップ
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
