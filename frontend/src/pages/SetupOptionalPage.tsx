import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import ClubSelector from '@/components/ClubSelector'
import LoadingScreen from '@/components/LoadingScreen'
import { useProfile } from '@/hooks/useProfile'
import { getCroppedImg } from '@/lib/cropImage'
import api from '@/lib/api'

type FacultyHideLevel = 'none' | 'faculty' | 'department'

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

export default function SetupOptionalPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { profile, isLoading } = useProfile()

  const [step, setStep] = useState(1)

  // Step 1: 写真 + 表示名
  const [displayName, setDisplayName] = useState('')
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Crop modal state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  // Step 2: 自己紹介
  const [bio, setBio] = useState('')

  // Step 3: 趣味 + 今日の一言
  const [interests, setInterests] = useState<string[]>([])
  const [interestInput, setInterestInput] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  // Step 4: サークル + 出身地 + 身バレ防止
  const [clubs, setClubs] = useState<string[]>([])
  const [hometown, setHometown] = useState('')
  const [facultyHideLevel, setFacultyHideLevel] = useState<FacultyHideLevel>('none')
  const [hiddenClubs, setHiddenClubs] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const progress = (step / 4) * 100

  // Prefill name from profile
  useEffect(() => {
    if (profile?.name) setDisplayName(profile.name)
  }, [profile?.name])

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

  const addInterest = () => {
    const v = interestInput.trim()
    if (!v || interests.length >= 10 || interests.includes(v)) return
    setInterests([...interests, v])
    setInterestInput('')
  }

  const removeInterest = (i: string) => setInterests(interests.filter((x) => x !== i))

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
      if (!displayName.trim()) {
        setError('表示名を入力して。')
        return
      }
      if (croppedBlob) await uploadPhoto()
      try {
        await api.patch('/api/profile/me', { name: displayName.trim() })
      } catch { /* ignore */ }
      setStep(2)
    } else if (step === 2) {
      if (bio.trim()) {
        try { await api.patch('/api/profile/me', { bio: bio.trim() }) } catch { /* ignore */ }
      }
      setStep(3)
    } else if (step === 3) {
      const updates: Record<string, unknown> = {}
      if (interests.length > 0) updates.interests = interests
      if (statusMessage.trim()) updates.status_message = statusMessage.trim()
      if (Object.keys(updates).length > 0) {
        try { await api.patch('/api/profile/me', updates) } catch { /* ignore */ }
      }
      setStep(4)
    }
  }

  const skip = () => {
    if (step < 4) setStep(step + 1)
  }

  const finish = async (skipAll = false) => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const updates: Record<string, unknown> = {}
      if (!skipAll) {
        if (clubs.length > 0) updates.clubs = clubs
        if (hometown) updates.hometown = hometown
        updates.faculty_hide_level = facultyHideLevel
        if (hiddenClubs.length > 0) updates.hidden_clubs = hiddenClubs
      }
      if (Object.keys(updates).length > 0) {
        await api.patch('/api/profile/me', updates)
      }
      await queryClient.invalidateQueries({ queryKey: ['profile-me'] })
      navigate('/setup/notify', { replace: true })
    } catch {
      setError('うまくいかなかった。もう一度試してみて。')
      setSaving(false)
    }
  }

  // clubs 変更時に非表示サークルを同期
  useEffect(() => {
    setHiddenClubs(prev => prev.filter(c => clubs.includes(c)))
  }, [clubs])

  if (isLoading) return <LoadingScreen />

  if (profile && !profile.student_id_submitted) {
    return <Navigate to="/setup/required" replace />
  }
  if (profile?.onboarding_completed) {
    return <Navigate to="/browse" replace />
  }

  return (
    <div className="min-h-screen flex flex-col max-w-[480px] mx-auto">
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
              <span className="font-mono text-xs text-white/50">縮小</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
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

      {/* プログレスバー */}
      <div className="sticky top-0 z-10 px-5 pt-4 pb-4" style={{ background: '#0A0A0A' }}>
        <p className="font-mono text-white/60 text-xs mb-1.5 uppercase tracking-widest">STEP {step} / 4</p>
        <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: '#DFFF1F' }}
          />
        </div>
        <p className="text-white font-bold text-base">プロフィールを充実させよう。</p>
        <p className="text-white/40 text-xs mt-0.5">あとで設定することもできるよ。</p>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 bg-white px-5 pt-6 pb-32 overflow-y-auto">

        {/* STEP 1: 写真 + 表示名 */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              まずは顔を見せて。
            </h2>

            {/* 写真 */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center"
                style={{ border: '2px solid #0A0A0A', background: '#f5f5f5' }}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="プレビュー" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl text-gray-300 font-bold">?</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-bold px-4 py-2 border-2 border-ink"
                style={{ background: '#DFFF1F', boxShadow: '3px 3px 0 0 #0A0A0A', borderRadius: 8 }}
              >
                {photoPreview ? '写真を変える' : '+ 写真を追加'}
              </button>
              <p className="text-sm text-gray-500 text-center">設定するとマッチ率が大幅に上がる</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* 表示名 */}
            <div>
              <label className="block font-bold text-sm text-ink mb-1.5">
                表示名 <span className="text-hot">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 20))}
                placeholder="みんなに表示される名前"
                className="w-full h-11 border-2 border-ink px-3 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
                style={{ borderRadius: 8 }}
                maxLength={20}
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-400">他のユーザーに表示される名前です</p>
                <p className="text-xs text-gray-400">{displayName.length} / 20</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: 自己紹介 */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              自己紹介を書いてみよう。
            </h2>
            <p className="text-sm text-muted">あとで変更できるよ。スキップしてもOK。</p>

            {/* ガイドラインカード */}
            <div
              className="p-4 space-y-3 rounded-xl"
              style={{ border: '2px solid #0A0A0A', background: '#FFFEF0' }}
            >
              <p className="font-mono text-xs font-bold text-ink uppercase tracking-wider">WRITING GUIDE</p>
              <div className="space-y-1">
                <p className="text-xs font-bold text-ink">書くと盛り上がる話題</p>
                <ul className="text-xs text-muted space-y-0.5">
                  <li>· 趣味や最近ハマってること</li>
                  <li>· よく行く場所・お気に入りのお店</li>
                  <li>· 休日の過ごし方や好きなこと</li>
                  <li>· 大学でやっていること</li>
                </ul>
              </div>
              <div className="h-px bg-ink/10" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-hot">書かないでほしいこと</p>
                <ul className="text-xs text-muted space-y-0.5">
                  <li>· SNSのIDや連絡先（マッチ後に交換してね）</li>
                  <li>· 本名・住所などの個人情報</li>
                  <li>· 他のユーザーへの批判・悪口</li>
                </ul>
              </div>
            </div>

            {/* テキストエリア */}
            <div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 200))}
                placeholder="あなたのこと、もっと知りたい。"
                rows={5}
                className="w-full border-2 border-ink px-3 py-2.5 text-sm resize-none focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
                style={{ borderRadius: 8 }}
              />
              <p className="text-xs text-gray-400 text-right mt-1">{bio.length} / 200</p>
            </div>
          </div>
        )}

        {/* STEP 3: 趣味 + 今日の一言 */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              好きなこと、教えて。
            </h2>

            {/* 趣味タグ */}
            <div>
              <label className="block font-bold text-sm text-ink mb-2">趣味・興味</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                  placeholder="映画、音楽、スポーツなど"
                  className="flex-1 h-10 border-2 border-ink px-3 text-sm focus:outline-none"
                  style={{ borderRadius: 8 }}
                  disabled={interests.length >= 10}
                />
                <button
                  type="button"
                  onClick={addInterest}
                  disabled={interests.length >= 10 || !interestInput.trim()}
                  className="h-10 px-4 font-bold text-sm border-2 border-ink"
                  style={{ background: '#DFFF1F', borderRadius: 8 }}
                >
                  追加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {interests.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-3 py-1 font-bold text-xs"
                    style={{ border: '1.5px solid #0A0A0A', borderRadius: 9999, background: '#A8F0D1' }}
                  >
                    {tag}
                    <button type="button" onClick={() => removeInterest(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">{interests.length} / 10</p>
            </div>

            {/* 今日の一言 */}
            <div>
              <label className="block font-bold text-sm text-ink mb-1.5">今日の一言</label>
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value.slice(0, 30))}
                placeholder="今日の気分を一言で"
                className="w-full h-11 border-2 border-ink px-3 text-sm focus:outline-none"
                style={{ borderRadius: 8 }}
              />
              <p className="text-xs text-gray-400 text-right mt-1">{statusMessage.length} / 30</p>
            </div>
          </div>
        )}

        {/* STEP 4: サークル + 出身地 + 身バレ防止 */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 900 }}>
              最後にもう少しだけ。
            </h2>

            {/* サークル */}
            <div>
              <label className="block font-bold text-sm text-ink mb-2">所属サークル</label>
              <ClubSelector selected={clubs} onChange={setClubs} maxCount={5} />
            </div>

            {/* 出身地 */}
            <div>
              <label className="block font-bold text-sm text-ink mb-1.5">出身地</label>
              <select
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
                className="w-full h-11 border-2 border-ink bg-white px-3 text-sm focus:outline-none"
                style={{ borderRadius: 8 }}
              >
                <option value="">選択してください</option>
                {HOMETOWNS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* 身バレ防止設定 */}
            <div
              className="p-4 rounded-xl space-y-4"
              style={{ border: '2px solid #0A0A0A', boxShadow: '4px 4px 0 0 #0A0A0A' }}
            >
              <span className="font-mono text-xs font-bold bg-ink text-white px-2 py-1 uppercase">身バレ防止設定</span>

              {/* 学部・学科の非表示設定 */}
              <div className="space-y-2">
                <p className="font-bold text-sm text-ink">学部・学科の非表示設定</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  同じ学部・学科の人にあなたのプロフィールは表示されず、あなたにも相手のプロフィールは表示されません。お互いに見えなくすることで、身バレを防ぎます。
                </p>
                {([
                  { value: 'none', label: '全員に表示する' },
                  { value: 'faculty', label: '同じ学部の人とお互いに見えなくする' },
                  { value: 'department', label: '同じ学科の人とお互いに見えなくする' },
                ] as { value: FacultyHideLevel; label: string }[]).map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-ink flex items-center justify-center shrink-0"
                      style={{ background: facultyHideLevel === opt.value ? '#0A0A0A' : 'white' }}
                      onClick={() => setFacultyHideLevel(opt.value)}
                    >
                      {facultyHideLevel === opt.value && (
                        <div className="w-2 h-2 rounded-full bg-acid" />
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
                  <p className="font-bold text-sm text-ink">所属サークルの非表示</p>
                  <p className="text-xs text-gray-400">非表示にしたサークルの同メンバーには表示されなくなります</p>
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
        className="fixed bottom-0 left-0 right-0 px-5 py-4 max-w-[480px] mx-auto space-y-2"
        style={{ background: 'white', borderTop: '2px solid #0A0A0A' }}
      >
        {error && <p className="text-sm text-hot font-medium text-center">{error}</p>}
        {step < 4 ? (
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
                opacity: uploadingPhoto ? 0.7 : 1,
              }}
            >
              {uploadingPhoto ? '送ってます...' : '次へ →'}
            </button>
            <div className="flex justify-between">
              <button
                type="button"
                onClick={step === 1 ? () => navigate('/setup/thanks') : () => setStep(step - 1)}
                className="text-gray-500 text-sm font-bold py-1"
              >
                ← 戻る
              </button>
              <button
                type="button"
                onClick={skip}
                className="text-gray-400 text-sm font-medium py-1"
              >
                スキップ
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => finish(false)}
              disabled={saving}
              className="w-full h-14 font-bold text-base border-2 border-ink transition-all"
              style={{
                background: '#A8F0D1',
                color: '#0A0A0A',
                boxShadow: '4px 4px 0 0 #0A0A0A',
                borderRadius: 12,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '保存中...' : '設定を保存して始める'}
            </button>
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={saving}
                className="text-gray-500 text-sm font-bold py-1"
              >
                ← 戻る
              </button>
              <button
                type="button"
                onClick={() => finish(true)}
                disabled={saving}
                className="text-gray-400 text-sm font-medium py-1"
              >
                スキップして始める
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
