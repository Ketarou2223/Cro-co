// 解説: このファイルは任意プロフィール設定（オプションオンボーディング）ページを定義する。
// 解説: STEP 1〜5: 写真のみ → 表示名＋学年 → 自己紹介 → 今日の一言 → サークル＋身バレ防止設定
// 解説: react-easy-crop でアバタートリミング → compressImage で JPEG 圧縮 → POST /api/profile/photos
// 解説: goNext/skip = 各ステップは次へ（保存）またはスキップできる。STEP5 の finish() で onboarding_completed=true にする
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import ClubSelector from '@/components/ClubSelector'
import LoadingScreen from '@/components/LoadingScreen'
import { useProfile } from '@/hooks/useProfile'
import { getCroppedImg } from '@/lib/cropImage'
import { getYearLabel } from '@/lib/utils'
import api from '@/lib/api'

type FacultyHideLevel = 'none' | 'faculty' | 'department'


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
  const { profile, isLoading } = useProfile()

  const [step, setStep] = useState(1)

  // Step 1: 写真のみ / Step 2: 表示名 + 学年
  const [displayName, setDisplayName] = useState('')
  const [year, setYear] = useState('')
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Crop modal state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  // Step 3: 自己紹介
  const [bio, setBio] = useState('')

  // Step 4: 今日の一言
  const [statusMessage, setStatusMessage] = useState('')

  // Step 5: サークル + 身バレ防止
  const [clubs, setClubs] = useState<string[]>([])
  const [facultyHideLevel, setFacultyHideLevel] = useState<FacultyHideLevel>('none')
  const [hiddenClubs, setHiddenClubs] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step1Attempted, setStep1Attempted] = useState(false)
  const [step2Attempted, setStep2Attempted] = useState(false)
  const [step3Attempted, setStep3Attempted] = useState(false)

  const progress = (step / 5) * 100

  // Prefill name / year from profile
  useEffect(() => {
    if (profile?.name) setDisplayName(profile.name)
  }, [profile?.name])

  useEffect(() => {
    if (profile?.year) setYear(String(profile.year))
  }, [profile?.year])

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

  const cancelCrop = () => {
    setCropImageSrc(null)
  }

  const confirmCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return
    try {
      const blob = await getCroppedImg(cropImageSrc, croppedAreaPixels)
      const compressed = await compressImage(blob)
      setCroppedBlob(compressed)
      setPhotoPreview(URL.createObjectURL(compressed))
      setCropImageSrc(null)
    } catch {
      setCropImageSrc(null)
    }
  }

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

  const goNext = async () => {
    setError(null)
    if (step === 1) {
      setStep1Attempted(true)
      const hasPhoto = photoPreview !== null || (profile?.photos?.length ?? 0) > 0
      if (!hasPhoto) return
      if (croppedBlob) await uploadPhoto()
      setStep(2)
    } else if (step === 2) {
      setStep2Attempted(true)
      if (!displayName.trim() || !year) return
      try {
        await api.patch('/api/profile/me', { name: displayName.trim(), year: parseInt(year) })
      } catch { /* ignore */ }
      setStep(3)
    } else if (step === 3) {
      setStep3Attempted(true)
      if (!bio.trim()) return
      try { await api.patch('/api/profile/me', { bio: bio.trim() }) } catch { /* ignore */ }
      setStep(4)
    } else if (step === 4) {
      if (statusMessage.trim()) {
        try { await api.patch('/api/profile/me', { status_message: statusMessage.trim() }) } catch { /* ignore */ }
      }
      setStep(5)
    }
  }

  const skip = () => {
    if (step < 5) setStep(step + 1)
  }

  const finish = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const updates: Record<string, unknown> = {}
      if (clubs.length > 0) updates.clubs = clubs
      updates.faculty_hide_level = facultyHideLevel
      if (hiddenClubs.length > 0) updates.hidden_clubs = hiddenClubs
      if (Object.keys(updates).length > 0) {
        await api.patch('/api/profile/me', updates)
      }
      await queryClient.invalidateQueries({ queryKey: ['profile-me'] })
      navigate('/setup/notify', { replace: true })
    } catch {
      // @copy CRO-error-setup-optional-02 Lv1
      setError('うまくいきませんでした。もう一度お試しください。')
      setSaving(false)
    }
  }

  // clubs 変更時に非表示サークルを同期
  useEffect(() => {
    setHiddenClubs(prev => prev.filter(c => clubs.includes(c)))
  }, [clubs])

  const hasPhoto = photoPreview !== null || (profile?.photos?.length ?? 0) > 0
  const step1PhotoError = step1Attempted && !hasPhoto
  const step2NameError = step2Attempted && !displayName.trim()
  const step2YearError = step2Attempted && !year
  const step3BioError = step3Attempted && !bio.trim()

  // student_type に応じて表示する学年の選択肢を絞り込む
  const studentType = profile?.student_type
  const yearOptions: number[] = studentType === 'undergrad'
    ? [1, 2, 3, 4, 5, 6]
    : studentType === 'grad'
      ? [7, 8, 9, 10, 11]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

  // 次へボタンの視覚的 disabled 判定（実際のガードは goNext 内）
  const canProceedStep1 = hasPhoto
  const canProceedStep2 = displayName.trim().length > 0 && year !== ''
  const canProceedStep3 = bio.trim().length > 0

  if (isLoading) return <LoadingScreen />

  if (profile && !profile.student_id_submitted) {
    return <Navigate to="/setup/required" replace />
  }
  if (profile?.onboarding_completed) {
    return <Navigate to="/browse" replace />
  }

  return (
    <div className="h-dvh flex flex-col max-w-[480px] mx-auto">
      {/* クロップモーダル */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0A' }}>
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
          <div className="px-5 py-5 space-y-3" style={{ background: '#0A0A0A' }}>
            <div className="flex items-center gap-3">
              {/* @copy CRO-label-setup-optional-01 Lv1 */}
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
              {/* @copy CRO-label-setup-optional-02 Lv1 */}
              <span className="font-mono text-xs text-white/50">拡大</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelCrop}
                className="flex-1 h-12 font-bold border-2 border-white/30 text-white rounded-xl"
              >
                {/* @copy CRO-button-setup-optional-01 Lv1 */}
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmCrop}
                className="flex-1 h-12 font-bold border-2 border-ink text-ink rounded-xl"
                style={{ background: 'var(--color-brand)' }}
              >
                {/* @copy CRO-button-setup-optional-02 Lv1 */}
                この写真を使う
              </button>
            </div>
          </div>
        </div>
      )}

      {/* プログレスバー */}
      <div className="sticky top-0 z-10 px-5 pt-4 pb-4" style={{ background: '#0A0A0A' }}>
        <p className="font-mono text-white/60 text-xs mb-1.5 uppercase tracking-widest">STEP {step} / 5</p>
        <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'var(--color-brand)' }}
          />
        </div>
        {/* @copy CRO-heading-setup-optional-01 Lv1 */}
        <p className="text-white font-bold text-base">プロフィールを充実させましょう。</p>
        {/* @copy CRO-label-setup-optional-03 Lv1 */}
        <p className="text-white/40 text-xs mt-0.5">あとで設定することもできます。</p>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 min-h-0 bg-white px-5 pt-6 pb-6 overflow-y-auto">

        {/* STEP 1: 写真のみ */}
        {step === 1 && (
          <div className="space-y-6">
            {/* @copy CRO-heading-setup-optional-02 Lv1 */}
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              まずは顔写真を登録しましょう。
            </h2>

            {/* 写真 */}
            <div className="space-y-2">
              <p className="font-bold text-sm text-ink">プロフィール写真<span className="badge-required">必須</span></p>
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center"
                  style={{ border: '2px solid #0A0A0A', background: '#f5f5f5' }}
                >
                  {photoPreview ? (
                    // @copy CRO-label-setup-optional-04 Lv1
                    <img src={photoPreview} alt="プレビュー" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl text-ink/20 font-bold">?</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-bold px-4 py-2 border-2 border-ink"
                  style={{ background: 'var(--color-brand)', boxShadow: '3px 3px 0 0 #0A0A0A', borderRadius: 8 }}
                >
                  {/* @copy CRO-button-setup-optional-03 Lv1 */}
                  {photoPreview ? '写真を変える' : '+ 写真を追加'}
                </button>
                {/* @copy CRO-label-setup-optional-05 Lv1 */}
                <p className="text-sm text-ink/60 text-center">写真を設定すると、マッチしやすくなります。</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              {step1PhotoError && (
                <p className="text-sm font-bold text-center text-danger">写真を設定してください。</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: 表示名 + 学年 */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              あなたのことを教えてください。
            </h2>

            {/* 表示名 */}
            <div>
              {/* @copy CRO-label-setup-optional-06 Lv1 */}
              <label className="block font-bold text-sm text-ink mb-1.5">
                表示名<span className="badge-required">必須</span>
              </label>
              {/* @copy CRO-placeholder-setup-optional-01 Lv1 */}
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 20))}
                placeholder="みんなに表示される名前です。"
                className="w-full h-11 border-2 border-ink px-3 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
                style={{ borderRadius: 8 }}
                maxLength={20}
              />
              <div className="flex justify-between mt-1">
                {/* @copy CRO-label-setup-optional-07 Lv1 */}
                <p className="text-xs text-ink/40">他のユーザーに表示される名前です</p>
                <p className="text-xs text-ink/40">{displayName.length} / 20</p>
              </div>
              {step2NameError && (
                <p className="text-sm font-bold mt-1 text-danger">表示名を入力してください。</p>
              )}
            </div>

            {/* 学年 */}
            <div>
              <label className="block font-bold text-sm text-ink mb-1.5">
                学年<span className="badge-required">必須</span>
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full h-11 border-2 border-ink bg-white px-3 text-sm focus:outline-none"
                style={{ borderRadius: 8 }}
              >
                <option value="">選択してください</option>
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>{getYearLabel(y)}</option>
                ))}
              </select>
              {step2YearError && (
                <p className="text-sm font-bold mt-1 text-danger">学年を選択してください。</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: 自己紹介 */}
        {step === 3 && (
          <div className="space-y-5">
            {/* @copy CRO-heading-setup-optional-03 Lv1 */}
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              自己紹介を書いてみましょう。
            </h2>
            <p className="text-sm text-ink/60">自己紹介を書くと、あなたと相性がいい人と出会いやすくなります。</p>
            {/* ガイドラインカード */}
            <div
              className="p-4 space-y-3 rounded-xl"
              style={{ border: '2px solid #0A0A0A', background: 'var(--color-bone)' }}
            >
              <p className="font-mono text-xs font-bold text-ink uppercase tracking-wider">WRITING GUIDE</p>
              <div className="space-y-1">
                {/* @copy CRO-heading-setup-optional-04 Lv2 */}
                <p className="text-xs font-bold text-ink">書くと盛り上がる話題</p>
                {/* @copy CRO-onboarding-setup-optional-01 Lv1 */}
                <ul className="text-xs text-muted space-y-0.5">
                  <li>· 趣味や最近ハマってること</li>
                  <li>· よく行く場所・お気に入りのお店</li>
                  <li>· 休日の過ごし方や好きなこと</li>
                  <li>· 大学でやっていること</li>
                </ul>
              </div>
              <div className="h-px bg-ink/10" />
              <div className="space-y-1">
                {/* @copy CRO-heading-setup-optional-05 Lv0 */}
                <p className="text-xs font-bold text-hot">書かないでほしいこと</p>
                {/* @copy CRO-onboarding-setup-optional-02 Lv0 */}
                <ul className="text-xs text-muted space-y-0.5">
                  <li>· SNSのIDや連絡先（マッチ後に交換しましょう）</li>
                  <li>· 本名・住所などの個人情報</li>
                  <li>· 他のユーザーへの批判・悪口</li>
                </ul>
              </div>
            </div>

            {/* テキストエリア */}
            <div>
              <label className="block font-bold text-sm text-ink mb-1.5">
                自己紹介<span className="badge-required">必須</span>
              </label>
              {/* @copy CRO-placeholder-setup-optional-02 Lv1 */}
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 200))}
                placeholder="あなたのことを、自由に書いてみてください。"
                rows={5}
                className="w-full border-2 border-ink px-3 py-2.5 text-sm resize-none focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
                style={{ borderRadius: 8 }}
              />
              <p className="text-xs text-ink/40 text-right mt-1">{bio.length} / 200</p>
              {step3BioError && (
                <p className="text-sm font-bold mt-1 text-danger">自己紹介を入力してください。</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: 今日の一言 */}
        {step === 4 && (
          <div className="space-y-6">
            {/* @copy CRO-heading-setup-optional-06 Lv1 */}
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              好きなことを教えてください。
            </h2>

            {/* 今日の一言 */}
            <div>
              {/* @copy CRO-label-setup-optional-09 Lv1 */}
              <label className="block font-bold text-sm text-ink mb-1.5">今日の一言</label>
              {/* @copy CRO-placeholder-setup-optional-03 Lv1 */}
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value.slice(0, 30))}
                placeholder="今日の気分を一言で"
                className="w-full h-11 border-2 border-ink px-3 text-sm focus:outline-none"
                style={{ borderRadius: 8 }}
              />
              <p className="text-xs text-ink/40 text-right mt-1">{statusMessage.length} / 30</p>
            </div>
          </div>
        )}

        {/* STEP 5: サークル + 身バレ防止 */}
        {step === 5 && (
          <div className="space-y-6">
            {/* @copy CRO-heading-setup-optional-07 Lv1 */}
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              最後に、もう少しだけ入力しましょう。
            </h2>

            {/* サークル */}
            <div>
              {/* @copy CRO-label-setup-optional-10 Lv1 */}
              <label className="block font-bold text-sm text-ink mb-2">所属サークル</label>
              <ClubSelector selected={clubs} onChange={setClubs} maxCount={5} />
            </div>

            {/* 身バレ防止設定 */}
            <div
              className="p-4 rounded-xl space-y-4"
              style={{ border: '2px solid #0A0A0A', boxShadow: '4px 4px 0 0 #0A0A0A' }}
            >
              {/* @copy CRO-heading-setup-optional-08 Lv0 */}
              <span className="font-mono text-xs font-bold bg-ink text-white px-2 py-1 uppercase">身バレ防止設定</span>

              {/* 学部・学科の非表示設定 */}
              <div className="space-y-2">
                {/* @copy CRO-label-setup-optional-12 Lv0 */}
                <p className="font-bold text-sm text-ink">
                  {studentType === 'grad' ? '研究科の非表示設定' : '学部・学科の非表示設定'}
                </p>
                {/* @copy CRO-label-setup-optional-13 Lv0 */}
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
                      // @copy CRO-label-setup-optional-14 Lv0
                      { value: 'none' as FacultyHideLevel, label: '全員に表示する' },
                      // @copy CRO-label-setup-optional-15 Lv0
                      { value: 'faculty' as FacultyHideLevel, label: '同じ学部の人とお互いに見えなくする' },
                      // @copy CRO-label-setup-optional-16 Lv0
                      { value: 'department' as FacultyHideLevel, label: '同じ学科の人とお互いに見えなくする' },
                    ]
                ).map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-ink flex items-center justify-center shrink-0"
                      style={{ background: facultyHideLevel === opt.value ? '#0A0A0A' : 'white' }}
                      onClick={() => setFacultyHideLevel(opt.value)}
                    >
                      {facultyHideLevel === opt.value && (
                        <div className="w-2 h-2 rounded-full bg-brand" />
                      )}
                    </div>
                    <span
                      className="text-sm font-medium text-ink"
                      onClick={() => setFacultyHideLevel(opt.value)}
                    >
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* 所属サークルの非表示 */}
              {clubs.length > 0 && (
                <div className="space-y-2">
                  {/* @copy CRO-label-setup-optional-17 Lv0 */}
                  <p className="font-bold text-sm text-ink">所属サークルの非表示</p>
                  {/* @copy CRO-label-setup-optional-18 Lv0 */}
                  <p className="text-xs text-ink/40">非表示にしたサークルの同メンバーには表示されなくなります</p>
                  <div className="space-y-1.5">
                    {clubs.map((club) => {
                      const isHidden = hiddenClubs.includes(club)
                      return (
                        <label key={club} className="flex items-center gap-2 cursor-pointer">
                          <div
                            className="w-5 h-5 rounded border-2 border-ink flex items-center justify-center shrink-0"
                            style={{ background: isHidden ? '#0A0A0A' : 'white' }}
                            onClick={() =>
                              setHiddenClubs(prev =>
                                isHidden ? prev.filter(c => c !== club) : [...prev, club]
                              )
                            }
                          >
                            {isHidden && <span className="text-white text-xs font-bold leading-none">✓</span>}
                          </div>
                          <span
                            className="text-sm font-medium text-ink"
                            onClick={() =>
                              setHiddenClubs(prev =>
                                isHidden ? prev.filter(c => c !== club) : [...prev, club]
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
              )}
            </div>
          </div>
        )}

      </div>

      {/* ボトムボタン */}
      <div
        className="shrink-0 px-5 pt-4 space-y-2"
        style={{ background: 'white', borderTop: '2px solid #0A0A0A', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {error && <p className="text-sm text-hot font-medium text-center">{error}</p>}
        {step < 5 ? (
          <>
            <button
              type="button"
              onClick={goNext}
              disabled={uploadingPhoto}
              className="w-full h-14 font-bold text-base border-2 border-ink transition-all"
              style={{
                background: '#0A0A0A',
                color: '#fff',
                boxShadow: '4px 4px 0 0 #0A0A0A',
                borderRadius: 12,
                opacity: uploadingPhoto ? 0.7
                  : (step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2) || (step === 3 && !canProceedStep3) ? 0.4
                  : 1,
              }}
            >
              {/* @copy CRO-button-setup-optional-04 Lv1 */}
              {uploadingPhoto ? '送信中…' : '次へ →'}
            </button>
            <div className="flex justify-between">
              <button
                type="button"
                onClick={step === 1 ? () => navigate('/setup/thanks') : () => setStep(step - 1)}
                className="text-ink/60 text-sm font-bold py-1"
              >
                {/* @copy CRO-button-setup-optional-05 Lv1 */}
                ← 戻る
              </button>
              {step > 3 && (
                <button
                  type="button"
                  onClick={skip}
                  className="text-ink/40 text-sm font-medium py-1"
                >
                  {/* @copy CRO-button-setup-optional-06 Lv1 */}
                  スキップ
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => finish()}
              disabled={saving}
              className="w-full h-14 font-bold text-base border-2 border-ink transition-all"
              style={{
                background: 'var(--color-brand)',
                color: '#0A0A0A',
                boxShadow: '4px 4px 0 0 #0A0A0A',
                borderRadius: 12,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {/* @copy CRO-button-setup-optional-07 Lv1 */}
              {saving ? '保存中…' : '設定を保存して始める'}
            </button>
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setStep(4)}
                disabled={saving}
                className="text-ink/60 text-sm font-bold py-1"
              >
                {/* @copy CRO-button-setup-optional-08 Lv1 */}
                ← 戻る
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
