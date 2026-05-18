import { useEffect, useRef, useState } from 'react'
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Upload, X } from 'lucide-react'
import FacultySelector from '@/components/FacultySelector'
import LoadingScreen from '@/components/LoadingScreen'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

type Gender = 'male' | 'female'
type InterestIn = 'male' | 'female'

type SetupDraft = {
  gender: Gender | ''
  interest_in: InterestIn | ''
  real_name: string
  student_number: string
  birth_date: string
  year: string
  faculty: string
  department: string
}

const YEAR_OPTIONS = [
  { value: 1, label: '1年' },
  { value: 2, label: '2年' },
  { value: 3, label: '3年' },
  { value: 4, label: '4年' },
  { value: 5, label: '5年' },
  { value: 6, label: '6年' },
  { value: 7, label: 'M1' },
  { value: 8, label: 'M2' },
  { value: 9, label: 'D1' },
  { value: 10, label: 'D2' },
  { value: 11, label: 'D3' },
]

const _todayDate = new Date()
const MAX_BIRTH_DATE = new Date(_todayDate.getFullYear() - 18, _todayDate.getMonth(), _todayDate.getDate())
  .toISOString().split('T')[0]
const MIN_BIRTH_DATE = '1990-01-01'

interface ProfileCheck {
  id: string
  gender: string | null
  interest_in: string | null
  profile_setup_completed: boolean
  onboarding_completed: boolean
  status: string
  rejection_reason: string | null
  real_name: string | null
  student_number: string | null
  birth_date: string | null
  year: number | null
  faculty: string | null
  department: string | null
  identity_verified: boolean
  student_id_submitted?: boolean
}

const EMPTY_DRAFT: SetupDraft = {
  gender: '',
  interest_in: '',
  real_name: '',
  student_number: '',
  birth_date: '',
  year: '',
  faculty: '',
  department: '',
}

function isValidBirthDate(value: string): boolean {
  if (!value) return false
  const date = new Date(value)
  if (isNaN(date.getTime())) return false
  const [y, m, d] = value.split('-').map(Number)
  if (date.getFullYear() !== y) return false
  if (date.getMonth() + 1 !== m) return false
  if (date.getDate() !== d) return false
  const today = new Date()
  const age = today.getFullYear() - y - (today < new Date(today.getFullYear(), m - 1, d) ? 1 : 0)
  return age >= 18
}

async function compressImage(file: File, maxSizeMB: number = 1): Promise<File> {
  void maxSizeMB
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
        canvas.toBlob(
          (blob) => {
            resolve(new File([blob!], file.name, { type: 'image/jpeg' }))
          },
          'image/jpeg',
          0.8,
        )
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function SetupRequiredPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isReapply = searchParams.get('mode') === 'reapply'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const DRAFT_KEY = `setup_draft_${user?.id ?? 'anon'}`
  const STEP_KEY = `setup_step_${user?.id ?? 'anon'}`

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () => api.get<ProfileCheck>('/api/profile/me').then(r => r.data),
    retry: false,
    staleTime: 0,
  })

  const [step, setStep] = useState(isReapply ? 3 : 0)
  const [draft, setDraft] = useState<SetupDraft>(EMPTY_DRAFT)
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore draft and step from localStorage (non-reapply only)
  useEffect(() => {
    if (!user || isReapply) return
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as SetupDraft
        setDraft(parsed)
      }
      const savedStep = localStorage.getItem(STEP_KEY)
      if (savedStep) {
        const parsed = parseInt(savedStep, 10)
        if ([0, 1, 2, 3].includes(parsed)) setStep(parsed)
      }
    } catch { /* ignore */ }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Prefill draft from profile (reapply only)
  useEffect(() => {
    if (!profile || !isReapply) return
    setDraft(prev => ({
      ...prev,
      gender: (profile.gender as Gender | null) ?? prev.gender,
      interest_in: (profile.interest_in as InterestIn | null) ?? prev.interest_in,
      real_name: profile.real_name ?? prev.real_name,
      student_number: profile.student_number ?? prev.student_number,
      birth_date: profile.birth_date ?? prev.birth_date,
      year: profile.year != null ? String(profile.year) : prev.year,
      faculty: profile.faculty ?? prev.faculty,
      department: profile.department ?? prev.department,
    }))
  }, [profile?.id, isReapply]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft and step to localStorage (non-reapply only)
  useEffect(() => {
    if (!user || isReapply) return
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch { /* ignore */ }
  }, [draft, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user || isReapply) return
    try { localStorage.setItem(STEP_KEY, String(step)) } catch { /* ignore */ }
  }, [step, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateDraft = (fields: Partial<SetupDraft>) => setDraft(prev => ({ ...prev, ...fields }))

  if (isLoading) return <LoadingScreen />
  if (profile?.onboarding_completed && !isReapply) return <Navigate to="/home" replace />
  // 学生証提出済みで通常フロー → 次のステップ（任意プロフィール入力）へ
  if (!isReapply && profile?.student_id_submitted && !profile?.onboarding_completed) {
    return <Navigate to="/setup/optional" replace />
  }

  const effectiveGender = draft.gender as Gender | ''
  const effectiveInterestIn = draft.interest_in as InterestIn | ''
  const genderLocked = isReapply && !!(profile?.gender)
  const interestInLocked = isReapply && !!(profile?.interest_in)

  const canProceedStep1 = !!(effectiveGender && effectiveInterestIn)
  const isBirthDateError = draft.birth_date.length > 0 && !isValidBirthDate(draft.birth_date)
  const canProceedStep2 =
    isValidBirthDate(draft.birth_date) &&
    draft.real_name.trim().length > 0 &&
    draft.student_number.trim().length > 0 &&
    draft.year.length > 0 &&
    draft.faculty.length > 0 &&
    draft.department.length > 0

  const canSubmitNormal = canProceedStep1 && canProceedStep2 && !!studentIdFile
  const canSubmitReapply = !!studentIdFile && draft.year.length > 0
  const canSubmit = isReapply ? canSubmitReapply : canSubmitNormal

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const compressed = await compressImage(f)
    setStudentIdFile(compressed)
    setPreviewUrl(URL.createObjectURL(compressed))
  }

  const removeFile = () => {
    setStudentIdFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', studentIdFile!)
      formData.append('real_name', draft.real_name.trim())
      formData.append('student_number', draft.student_number.trim())
      formData.append('birth_date', draft.birth_date)
      formData.append('year', draft.year)
      formData.append('faculty', draft.faculty)
      formData.append('department', draft.department)
      formData.append('gender', effectiveGender)
      formData.append('interest_in', effectiveInterestIn)
      await api.post('/api/profile/upload-student-id', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      try {
        localStorage.removeItem(DRAFT_KEY)
        localStorage.removeItem(STEP_KEY)
      } catch { /* ignore */ }
      await queryClient.invalidateQueries({ queryKey: ['profile-me'] })
      await queryClient.refetchQueries({ queryKey: ['profile-me'] })
      if (isReapply) {
        navigate(-1)
      } else {
        navigate('/setup/thanks')
      }
    } catch {
      setError('うまくいかなかった。もう一度試してみて。')
      setSubmitting(false)
    }
  }

  const ProgressBar = (
    <div>
      <p className="font-mono text-white/60 text-xs mb-1 uppercase tracking-widest">
        {isReapply ? '再申請' : `STEP ${step} / 3`}
      </p>
      <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.15)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(step / 3) * 100}%`, background: '#DFFF1F' }}
        />
      </div>
    </div>
  )

  // ---- STEP 0: Welcome ----
  if (!isReapply && step === 0) {
    return (
      <div className="min-h-screen flex flex-col max-w-[480px] mx-auto">
        <div className="flex-1 flex flex-col justify-center px-6 py-16 bg-white space-y-8">
          <div className="space-y-1">
            <span
              className="font-display text-5xl block"
              style={{ color: '#0A0A0A', fontWeight: 900, letterSpacing: '-0.02em' }}
            >
              Cro-co.
            </span>
          </div>
          <div className="space-y-4">
            <h1
              className="font-display text-4xl text-ink leading-tight"
              style={{ fontWeight: 900 }}
            >
              ようこそ、<br />Cro-co へ。
            </h1>
            <p className="text-ink/70 text-base leading-relaxed">
              阪大生だけの、本気のマッチングアプリ。<br />
              プロフィールを設定して、気になる人を見つけよう。
            </p>
            <p className="text-ink/50 text-sm leading-relaxed">
              まず本人確認をお願いします。<br />
              審査は通常1〜2営業日で完了します。
            </p>
          </div>
        </div>
        <div className="px-6 pb-12 bg-white">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full h-14 font-bold text-base border-2 border-ink"
            style={{ background: '#0A0A0A', color: '#DFFF1F', borderRadius: 12, boxShadow: '4px 4px 0 0 #0A0A0A', letterSpacing: '0.05em' }}
          >
            はじめる →
          </button>
        </div>
      </div>
    )
  }

  // ---- STEP 1: Gender / interest_in ----
  if (!isReapply && step === 1) {
    return (
      <div className="min-h-screen flex flex-col max-w-[480px] mx-auto">
        <div className="sticky top-0 z-10 px-5 pt-5 pb-4" style={{ background: '#0A0A0A' }}>
          {ProgressBar}
          <h1 className="font-display text-2xl text-white" style={{ fontWeight: 900 }}>
            あなたについて教えて。
          </h1>
        </div>

        <div className="flex-1 bg-white overflow-y-auto px-5 pt-6 pb-36 space-y-8">
          <div>
            <p className="font-bold text-ink text-base mb-3">あなたは？</p>
            <div className="flex gap-3">
              {(['male', 'female'] as Gender[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={genderLocked}
                  onClick={() => updateDraft({ gender: v })}
                  className="flex-1 py-4 rounded-xl border-2 font-bold text-base transition-all"
                  style={{
                    background: effectiveGender === v ? '#DFFF1F' : '#f5f5f5',
                    borderColor: effectiveGender === v ? '#0A0A0A' : '#e0e0e0',
                    color: '#0A0A0A',
                    boxShadow: effectiveGender === v ? '3px 3px 0 0 #0A0A0A' : 'none',
                    opacity: genderLocked ? 0.7 : 1,
                  }}
                >
                  {v === 'male' ? '男性' : '女性'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-bold text-ink text-base mb-3">好きになる相手は？</p>
            <div className="flex gap-3">
              {(['female', 'male'] as InterestIn[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={interestInLocked}
                  onClick={() => updateDraft({ interest_in: v })}
                  className="flex-1 py-4 rounded-xl border-2 font-bold text-sm transition-all"
                  style={{
                    background: effectiveInterestIn === v ? '#DFFF1F' : '#f5f5f5',
                    borderColor: effectiveInterestIn === v ? '#0A0A0A' : '#e0e0e0',
                    color: '#0A0A0A',
                    boxShadow: effectiveInterestIn === v ? '3px 3px 0 0 #0A0A0A' : 'none',
                    opacity: interestInLocked ? 0.7 : 1,
                  }}
                >
                  {v === 'female' ? '女性が好き' : '男性が好き'}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs font-bold" style={{ color: '#FF3B6B' }}>
            ※ 一度設定すると変更できません。慎重に選んでください。
          </p>
        </div>

        <div
          className="fixed bottom-0 left-0 right-0 px-5 py-4 max-w-[480px] mx-auto space-y-2"
          style={{ background: 'white', borderTop: '2px solid #0A0A0A' }}
        >
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!canProceedStep1}
            className="w-full h-14 font-bold text-base border-2 transition-all"
            style={{
              background: canProceedStep1 ? '#0A0A0A' : '#e5e5e5',
              color: canProceedStep1 ? '#ffffff' : '#999',
              borderColor: canProceedStep1 ? '#0A0A0A' : '#e5e5e5',
              boxShadow: canProceedStep1 ? '4px 4px 0 0 #0A0A0A' : 'none',
              borderRadius: 12,
            }}
          >
            次へ →
          </button>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="w-full text-center text-gray-500 text-sm font-bold py-1"
          >
            ← 戻る
          </button>
        </div>
      </div>
    )
  }

  // ---- STEP 2: Basic info ----
  if (!isReapply && step === 2) {
    return (
      <div className="min-h-screen flex flex-col max-w-[480px] mx-auto">
        <div className="sticky top-0 z-10 px-5 pt-5 pb-4" style={{ background: '#0A0A0A' }}>
          {ProgressBar}
          <h1 className="font-display text-2xl text-white" style={{ fontWeight: 900 }}>
            基本情報を入力して。
          </h1>
        </div>

        <div className="flex-1 bg-white overflow-y-auto px-5 pt-6 pb-36 space-y-5">
          <div>
            <label className="block font-bold text-sm text-ink mb-1.5">
              本名 <span className="text-hot">*</span>
            </label>
            <input
              type="text"
              value={draft.real_name}
              onChange={(e) => updateDraft({ real_name: e.target.value })}
              placeholder="本名を入力して"
              className="w-full h-11 border-2 border-ink px-3 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
              style={{ borderRadius: 8 }}
            />
            <p className="text-xs text-gray-400 mt-1">審査のみに使用。他のユーザーには表示されません。</p>
            <p className="text-xs text-amber-600 mt-0.5">※ 承認後は変更できません。</p>
          </div>

          <div>
            <label className="block font-bold text-sm text-ink mb-1.5">
              学籍番号 <span className="text-hot">*</span>
            </label>
            <input
              type="text"
              value={draft.student_number}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '')
                updateDraft({ student_number: val })
              }}
              placeholder="例：B12345678"
              pattern="[a-zA-Z0-9]*"
              className="w-full h-11 border-2 border-ink px-3 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A] font-mono"
              style={{ borderRadius: 8 }}
            />
            <p className="text-xs text-gray-400 mt-1">他のユーザーには表示されません。</p>
            <p className="text-xs text-amber-600 mt-0.5">※ 承認後は変更できません。</p>
          </div>

          <div>
            <label className="block font-bold text-sm text-ink mb-1.5">
              生年月日 <span className="text-hot">*</span>
            </label>
            <input
              type="date"
              value={draft.birth_date}
              onChange={(e) => updateDraft({ birth_date: e.target.value })}
              className="w-full h-11 border-2 border-ink px-3 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
              style={{ borderRadius: 8 }}
              max={MAX_BIRTH_DATE}
              min={MIN_BIRTH_DATE}
            />
            {isBirthDateError && (
              <p className="text-xs font-bold mt-1" style={{ color: '#FF3B6B' }}>有効な日付を入力してください（18歳以上）</p>
            )}
            <p className="text-xs text-amber-600 mt-1">※ 承認後は変更できません。</p>
          </div>

          <div>
            <label className="block font-bold text-sm text-ink mb-1.5">
              学年 <span className="text-hot">*</span>
            </label>
            <select
              value={draft.year}
              onChange={(e) => updateDraft({ year: e.target.value })}
              className="w-full h-11 border-2 border-ink bg-white px-3 text-sm focus:outline-none"
              style={{ borderRadius: 8 }}
            >
              <option value="">選択</option>
              {YEAR_OPTIONS.map((o) => (
                <option key={o.value} value={String(o.value)}>{o.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">※ 学年は後から変更できます。</p>
          </div>

          <div>
            <span
              className="inline-block font-mono text-xs font-bold text-white px-3 py-1 uppercase tracking-wider mb-3"
              style={{ background: '#0A0A0A' }}
            >
              学部・学科
            </span>
            <FacultySelector
              faculty={draft.faculty}
              department={draft.department}
              onFacultyChange={(v) => updateDraft({ faculty: v })}
              onDepartmentChange={(v) => updateDraft({ department: v })}
            />
            <p className="text-xs text-gray-400 mt-1">ほかのユーザーに見えないように設定できます（設定画面から変更可能）。</p>
            <p className="text-xs text-amber-600 mt-0.5">※ 承認後は変更できません。</p>
          </div>
        </div>

        <div
          className="fixed bottom-0 left-0 right-0 px-5 py-4 max-w-[480px] mx-auto space-y-2"
          style={{ background: 'white', borderTop: '2px solid #0A0A0A' }}
        >
          <button
            type="button"
            onClick={() => setStep(3)}
            disabled={!canProceedStep2}
            className="w-full h-14 font-bold text-base border-2 transition-all"
            style={{
              background: canProceedStep2 ? '#0A0A0A' : '#e5e5e5',
              color: canProceedStep2 ? '#ffffff' : '#999',
              borderColor: canProceedStep2 ? '#0A0A0A' : '#e5e5e5',
              boxShadow: canProceedStep2 ? '4px 4px 0 0 #0A0A0A' : 'none',
              borderRadius: 12,
            }}
          >
            次へ →
          </button>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full text-center text-gray-500 text-sm font-bold py-1"
          >
            ← 戻る
          </button>
        </div>
      </div>
    )
  }

  // ---- STEP 3: Confirmation + student ID upload ----
  const displayYear = YEAR_OPTIONS.find(o => String(o.value) === draft.year)?.label ?? draft.year

  return (
    <div className="min-h-screen flex flex-col max-w-[480px] mx-auto">
      <div className="sticky top-0 z-10 px-5 pt-5 pb-4" style={{ background: '#0A0A0A' }}>
        {ProgressBar}
        <h1 className="font-display text-2xl text-white" style={{ fontWeight: 900 }}>
          {isReapply ? '再申請' : '内容を確認して。'}
        </h1>
      </div>

      <div className="flex-1 bg-white overflow-y-auto px-5 pt-6 pb-36 space-y-6">
        {/* 却下理由バナー（reapply のみ） */}
        {isReapply && profile?.rejection_reason && (
          <div
            className="p-4 rounded-xl"
            style={{ border: '2px solid #FF3B6B', background: 'rgba(255,59,107,0.08)', boxShadow: '3px 3px 0 0 #FF3B6B' }}
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-hot" />
              <div>
                <p className="text-xs font-bold text-hot mb-0.5">審査が却下されました</p>
                <p className="text-sm text-ink leading-relaxed">{profile.rejection_reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* 入力内容確認 */}
        <section
          className="p-4 rounded-xl space-y-3"
          style={{ border: '2px solid #0A0A0A', boxShadow: '4px 4px 0 0 #0A0A0A' }}
        >
          <span className="font-mono text-xs font-bold bg-ink text-white px-2 py-0.5 uppercase">
            {isReapply ? '登録済み情報' : '入力内容'}
          </span>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink/50 font-mono text-xs">性別</span>
              <span className="font-bold">{effectiveGender === 'male' ? '男性' : effectiveGender === 'female' ? '女性' : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/50 font-mono text-xs">恋愛対象</span>
              <span className="font-bold">{effectiveInterestIn === 'male' ? '男性が好き' : effectiveInterestIn === 'female' ? '女性が好き' : '—'}</span>
            </div>
            <div className="h-px bg-ink/10" />
            <div className="flex justify-between">
              <span className="text-ink/50 font-mono text-xs">本名</span>
              <span className="font-bold">{draft.real_name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/50 font-mono text-xs">学籍番号</span>
              <span className="font-bold font-mono">{draft.student_number || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/50 font-mono text-xs">生年月日</span>
              <span className="font-bold">{draft.birth_date || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink/50 font-mono text-xs">学年</span>
              {isReapply ? (
                <select
                  value={draft.year}
                  onChange={(e) => updateDraft({ year: e.target.value })}
                  className="h-9 border-2 border-ink bg-white px-2 text-sm focus:outline-none font-bold"
                  style={{ borderRadius: 8, minWidth: 80 }}
                >
                  <option value="">選択</option>
                  {YEAR_OPTIONS.map((o) => (
                    <option key={o.value} value={String(o.value)}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <span className="font-bold">{displayYear || '—'}</span>
              )}
            </div>
            <div className="h-px bg-ink/10" />
            <div className="flex justify-between items-start">
              <span className="text-ink/50 font-mono text-xs">学部</span>
              <span className="font-bold text-right max-w-[55%]">{draft.faculty || '—'}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-ink/50 font-mono text-xs">学科</span>
              <span className="font-bold text-right max-w-[55%]">{draft.department || '—'}</span>
            </div>
          </div>
          {!isReapply && (
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-ink/50 underline"
              >
                性別を修正
              </button>
              <span className="text-ink/20">|</span>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-bold text-ink/50 underline"
              >
                基本情報を修正
              </button>
            </div>
          )}
        </section>

        {/* 学生証アップロード */}
        <section className="space-y-3">
          <span
            className="inline-block font-mono text-xs font-bold text-white px-3 py-1 uppercase tracking-wider"
            style={{ background: '#0A0A0A' }}
          >
            学生証をアップロード
          </span>

          {previewUrl ? (
            <div className="relative w-full">
              <img
                src={previewUrl}
                alt="学生証プレビュー"
                className="w-full max-h-48 object-contain rounded-lg border-2 border-ink"
              />
              <button
                type="button"
                onClick={removeFile}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed border-ink/40 flex flex-col items-center gap-2 transition-all hover:border-ink"
            >
              <Upload className="w-8 h-8 text-ink/40" />
              <span className="text-sm font-bold text-ink/60">タップして選択</span>
              <span className="text-xs text-ink/40">JPG / PNG・5MB以下</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-xs text-ink/60">顔と学生証が両方写っていること</p>
        </section>

        {/* 注意書き */}
        <div
          className="p-4 rounded-xl"
          style={{ border: '2px solid #0A0A0A', boxShadow: '4px 4px 0 0 #0A0A0A', background: 'rgba(223,255,31,0.15)' }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-ink/60" />
            <p className="text-xs text-ink/70 leading-relaxed">
              入力した情報は学生証と照合して確認します。承認後、本名・学籍番号・生年月日・学部学科は変更できません。
            </p>
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 px-5 py-4 max-w-[480px] mx-auto space-y-2"
        style={{ background: 'white', borderTop: '2px solid #0A0A0A' }}
      >
        {error && <p className="text-sm text-hot font-medium text-center">{error}</p>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full h-14 font-bold text-base border-2 transition-all"
          style={{
            background: canSubmit ? '#0A0A0A' : '#e5e5e5',
            color: canSubmit ? '#ffffff' : '#999',
            borderColor: canSubmit ? '#0A0A0A' : '#e5e5e5',
            boxShadow: canSubmit ? '4px 4px 0 0 #0A0A0A' : 'none',
            borderRadius: 12,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? '送ってます...' : isReapply ? '確認のため再提出する' : '確認のため提出する'}
        </button>
        <button
          type="button"
          onClick={isReapply ? () => navigate(-1) : () => setStep(2)}
          disabled={submitting}
          className="w-full text-center text-gray-500 text-sm font-bold py-1"
        >
          ← 戻る
        </button>
      </div>
    </div>
  )
}
