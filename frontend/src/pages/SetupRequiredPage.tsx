// 解説: このファイルは本人確認（必須オンボーディング）ページを定義する。
// 解説: STEP 0〜5 の段階構成: ウェルカム → 性別/恋愛対象 → 生年月日 → 学年/学部学科 → 学生証アップロード → 確認・提出
// 解説: isReapply = ?mode=reapply のとき再申請モード（ステップ5のみ表示・却下理由バナー表示・性別ロック）
// 解説: DRAFT_KEY / STEP_KEY = localStorage に下書き + ステップを自動保存しリロード後も再開できる
// 解説: 提出先: POST /api/profile/upload-student-id（multipart/form-data）→ /setup/thanks に遷移
import { useEffect, useRef, useState } from 'react'
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Upload, X } from 'lucide-react'
import axios from 'axios'
import FacultySelector from '@/components/FacultySelector'
import { GRADUATE_SCHOOLS } from '@/lib/osaka-u-data'
import LoadingScreen from '@/components/LoadingScreen'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { trackEvent } from '@/lib/analytics'

type Gender = 'male' | 'female'
type InterestIn = 'male' | 'female'

type SetupDraft = {
  gender: Gender | ''
  interest_in: InterestIn | ''
  birth_date: string
  year: string
  faculty: string
  department: string
  student_type: '' | 'undergrad' | 'grad'
  admission_year: string
}

const CURRENT_YEAR = new Date().getFullYear()

const ADMISSION_YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 2018 + 1 },
  (_, i) => 2018 + i,
).reverse()

const _todayDate = new Date()
const MAX_BIRTH_DATE = new Date(_todayDate.getFullYear() - 18, _todayDate.getMonth(), _todayDate.getDate())
  .toISOString().split('T')[0]
const MIN_BIRTH_DATE = '1990-01-01'

const ALLOWED_STUDENT_ID_MIME = ['image/jpeg', 'image/png']
const MAX_STUDENT_ID_SIZE = 5 * 1024 * 1024

interface ProfileCheck {
  id: string
  gender: string | null
  interest_in: string | null
  profile_setup_completed: boolean
  onboarding_completed: boolean
  status: string
  rejection_reason: string | null
  birth_date: string | null
  year: number | null
  faculty: string | null
  department: string | null
  student_type?: string | null
  admission_year?: number | null
  identity_verified: boolean
  student_id_submitted?: boolean
}

const EMPTY_DRAFT: SetupDraft = {
  gender: '',
  interest_in: '',
  birth_date: '',
  year: '',
  faculty: '',
  department: '',
  student_type: '',
  admission_year: '',
}

function getBirthDateError(value: string): string | null {
  // @copy CRO-error-setup-required-04 Lv0
  if (!value) return '生年月日を入力してください'
  const [y, m, d] = value.split('-').map(Number)
  // @copy CRO-error-setup-required-05 Lv0
  if (!y || !m || !d) return '不正な日付です'
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) {
    // @copy CRO-error-setup-required-06 Lv0
    return '存在しない日付です（例: 4月31日など）'
  }
  const today = new Date()
  let age = today.getFullYear() - y
  const monthDiff = today.getMonth() + 1 - m
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) age -= 1
  // @copy CRO-error-setup-required-07 Lv0
  if (age < 18) return '18歳以上の方のみご利用いただけます'
  // @copy CRO-error-setup-required-08 Lv0
  if (age > 100) return '正しい生年月日を入力してください'
  return null
}

function getFacultyError(value: string): string | null {
  // @copy CRO-error-setup-required-10 Lv0
  if (!value) return '学部を選択してください'
  return null
}

function getDepartmentError(value: string): string | null {
  // @copy CRO-error-setup-required-11 Lv0
  if (!value) return '学科を選択してください'
  return null
}

function getAdmissionYearError(v: string): string | null {
  return !v ? '入学年度を選択してください' : null
}

function getStudentTypeError(v: string): string | null {
  return v !== 'undergrad' && v !== 'grad' ? '区分を選択してください' : null
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
  const idDocInputRef = useRef<HTMLInputElement>(null)
  const DRAFT_KEY = `setup_draft_${user?.id ?? 'anon'}`
  const STEP_KEY = `setup_step_${user?.id ?? 'anon'}`

  const { data: profile, isLoading, error: profileQueryError } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () => api.get<ProfileCheck>('/api/profile/me').then(r => r.data),
    retry: false,
    staleTime: 0,
  })

  const [step, setStep] = useState(isReapply ? 1 : 0)
  const [draft, setDraft] = useState<SetupDraft>(EMPTY_DRAFT)
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [idDocFile, setIdDocFile] = useState<File | null>(null)
  const [idDocPreviewUrl, setIdDocPreviewUrl] = useState<string | null>(null)
  const [idDocError, setIdDocError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [step1Touched, setStep1Touched] = useState(false)
  const [step2Touched, setStep2Touched] = useState(false)
  const [step3Touched, setStep3Touched] = useState(false)
  const [step4Touched, setStep4Touched] = useState(false)

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
        if ([0, 1, 2, 3, 4, 5].includes(parsed)) setStep(parsed)
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
      birth_date: profile.birth_date ?? prev.birth_date,
      year: profile.year != null ? String(profile.year) : prev.year,
      faculty: profile.faculty ?? prev.faculty,
      department: profile.department ?? prev.department,
      student_type: (profile.student_type as '' | 'undergrad' | 'grad' | null) ?? prev.student_type,
      admission_year: profile.admission_year != null ? String(profile.admission_year) : prev.admission_year,
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

  // 万が一 OnboardingGuard をすり抜けて到達した場合の自己救済
  useEffect(() => {
    if (isReapply) return
    if (profile?.student_id_submitted && profile?.onboarding_completed) {
      navigate('/home', { replace: true })
      return
    }
    if (profile?.student_id_submitted && !profile?.onboarding_completed) {
      navigate('/setup/optional', { replace: true })
    }
  }, [profile?.student_id_submitted, profile?.onboarding_completed, isReapply, navigate])

  // 423: 再登録ブロック / 403: BAN・削除済み → /blocked へリダイレクト
  // SetupRequiredPage は OnboardingGuard 外のため useProfile のハンドラが効かない・独自対応が必要。
  // FastAPI の HTTPException は {"detail": {...}} 形式で返すため、detail を unwrap して state に渡す。
  useEffect(() => {
    if (!profileQueryError) return
    if (!axios.isAxiosError(profileQueryError)) return
    const status = profileQueryError.response?.status
    if (status !== 423 && status !== 403) return
    const raw = profileQueryError.response?.data
    const rawDetail = raw != null ? (raw as { detail?: unknown }).detail : undefined
    const d = rawDetail != null && typeof rawDetail === 'object' ? rawDetail : {}
    navigate('/blocked', { state: d, replace: true })
  }, [profileQueryError, navigate])

  if (isLoading) return <LoadingScreen />
  // 423/403 確定時: useEffect のリダイレクト実行まで LoadingScreen を維持し、setup 画面を一瞬も見せない
  if (axios.isAxiosError(profileQueryError) && (profileQueryError.response?.status === 423 || profileQueryError.response?.status === 403)) return <LoadingScreen />
  if (profile?.onboarding_completed && !isReapply) return <Navigate to="/home" replace />
  if (!isReapply && profile?.student_id_submitted && !profile?.onboarding_completed) {
    return <Navigate to="/setup/optional" replace />
  }

  const effectiveGender = draft.gender as Gender | ''
  const effectiveInterestIn = draft.interest_in as InterestIn | ''
  const genderLocked = isReapply && !!(profile?.gender)
  const interestInLocked = isReapply && !!(profile?.interest_in)

  const canProceedStep1 = !!(effectiveGender && effectiveInterestIn)

  // 早期 return（isLoading 等）より後に hook を置くと React #310 になるため useMemo は使わない
  const canProceedStep2 = !getBirthDateError(draft.birth_date) && !getAdmissionYearError(draft.admission_year)

  const canProceedStep3 =
    !getStudentTypeError(draft.student_type) &&
    !getFacultyError(draft.faculty) &&
    (draft.student_type === 'grad'
      ? true  // 院生は研究科のみ必須・department は空許容
      : !getDepartmentError(draft.department))

  const canSubmitNormal = canProceedStep1 && canProceedStep2 && canProceedStep3 && !!studentIdFile && !!idDocFile
  const canSubmitReapply = !!studentIdFile && !!idDocFile
  const canSubmit = isReapply ? canSubmitReapply : canSubmitNormal

  const handleNextStep1 = () => {
    setStep1Touched(true)
    if (canProceedStep1) setStep(2)
  }

  const handleNextStep2 = () => {
    setStep2Touched(true)
    setTouched(t => ({ ...t, birth_date: true }))
    if (canProceedStep2) setStep(3)
  }

  const handleNextStep3 = () => {
    setStep3Touched(true)
    if (canProceedStep3) setStep(4)
  }

  const handleNextStep4 = () => {
    setStep4Touched(true)
    if (studentIdFile && idDocFile) setStep(5)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ''
    if (!ALLOWED_STUDENT_ID_MIME.includes(f.type)) {
      // @copy CRO-error-setup-required-12 Lv0
      setFileError('JPEGまたはPNG形式の画像を選択してください')
      return
    }
    if (f.size > MAX_STUDENT_ID_SIZE) {
      // @copy CRO-error-setup-required-13 Lv0
      setFileError('ファイルサイズは5MB以下にしてください')
      return
    }
    const compressed = await compressImage(f)
    setStudentIdFile(compressed)
    setPreviewUrl(URL.createObjectURL(compressed))
  }

  const removeFile = () => {
    setStudentIdFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleIdDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdDocError(null)
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ''
    if (!ALLOWED_STUDENT_ID_MIME.includes(f.type)) {
      setIdDocError('JPEGまたはPNG形式の画像を選択してください')
      return
    }
    if (f.size > MAX_STUDENT_ID_SIZE) {
      setIdDocError('ファイルサイズは5MB以下にしてください')
      return
    }
    const compressed = await compressImage(f)
    setIdDocFile(compressed)
    setIdDocPreviewUrl(URL.createObjectURL(compressed))
  }

  const removeIdDoc = () => {
    setIdDocFile(null)
    setIdDocPreviewUrl(null)
    if (idDocInputRef.current) idDocInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', studentIdFile!)
      formData.append('id_doc_file', idDocFile!)
      formData.append('birth_date', draft.birth_date)
      formData.append('student_type', draft.student_type)
      formData.append('admission_year', draft.admission_year)
      formData.append('faculty', draft.faculty)
      formData.append('department', draft.department)
      formData.append('gender', effectiveGender)
      formData.append('interest_in', effectiveInterestIn)
      await api.post('/api/profile/upload-student-id', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      trackEvent('student_id_submitted')
      try {
        localStorage.removeItem(DRAFT_KEY)
        localStorage.removeItem(STEP_KEY)
      } catch { /* ignore */ }
      if (isReapply) {
        navigate(-1)
      } else {
        navigate('/setup/thanks')
      }
      queryClient.invalidateQueries({ queryKey: ['profile-me'] })
    } catch (err: unknown) {
      // 退会ブロック（400 + code: withdrawal_block）は再登録可能日を表示する
      const isWithdrawalBlock =
        axios.isAxiosError(err) &&
        err.response?.status === 400 &&
        err.response?.data?.detail?.code === 'withdrawal_block'
      // BAN・在籍中等（400 + detail が文字列）は中立文言
      const isGenericBlock =
        axios.isAxiosError(err) &&
        err.response?.status === 400 &&
        err.response?.data?.detail === 'この内容では登録できません'
      // @copy CRO-error-setup-required-14 Lv0
      const withdrawalMsg = isWithdrawalBlock
        ? (err as { response?: { data?: { detail?: { message?: string } } } })
            .response?.data?.detail?.message
        : undefined
      setError(
        isWithdrawalBlock
          ? (withdrawalMsg ?? 'しばらく再登録できません。時間をおいてお試しください。')
          : isGenericBlock
          ? 'この内容では登録できません。お心当たりがない場合はお問い合わせください。'
          : 'うまくいきませんでした。もう一度お試しください。',
      )
      setSubmitting(false)
    }
  }

  const ProgressBar = (
    <div>
      <p className="font-mono text-white/60 text-xs mb-1 uppercase tracking-widest">
        {isReapply ? '再申請' : `STEP ${step} / 5`}
      </p>
      <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.15)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(step / 5) * 100}%`, background: 'var(--color-brand)' }}
        />
      </div>
    </div>
  )

  // ---- STEP 0: Welcome ----
  if (!isReapply && step === 0) {
    return (
      <div className="h-dvh flex flex-col max-w-[480px] mx-auto">
        <div className="flex-1 flex flex-col justify-center px-6 py-16 bg-white space-y-8">
          <div className="space-y-1">
            <span
              className="font-display text-3xl block"
              style={{ color: '#0A0A0A', fontWeight: 900, letterSpacing: '-0.02em' }}
            >
              Cro-co.
            </span>
          </div>
          <div className="space-y-4">
            {/* @copy CRO-heading-setup-required-01 Lv1 */}
            <h1
              className="font-display text-4xl text-ink leading-tight"
              style={{ fontWeight: 900 }}
            >
              ようこそ、<br />Cro-co へ。
            </h1>
            {/* @copy CRO-onboarding-setup-required-01 Lv1 */}
            <p className="text-ink/70 text-base leading-relaxed">
              阪大生だけの、本気のマッチングアプリ。<br />
              プロフィールを設定して、気になる人を見つけましょう。
            </p>
            {/* @copy CRO-onboarding-setup-required-02 Lv0 */}
            <p className="text-muted text-sm leading-relaxed">
              まず本人確認をお願いします。審査には数日いただくことがあります。結果はアプリ内のステータスでご確認いただけます。
            </p>
          </div>
        </div>
        {/* β告知（フットノート） */}
        <div className="px-6 pb-2 bg-white">
          {/* @copy CRO-legal-setup-required-01 Lv0 */}
          <p className="text-xs text-ink/40 leading-relaxed">
            ※ Cro-coは現在β版です。正式リリースは2026年10月を予定しています。β版は完全無料です。
          </p>
        </div>
        <div className="px-6 pb-12 bg-white">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full h-14 font-bold text-base border-2 border-ink"
            style={{ background: '#0A0A0A', color: 'var(--color-brand)', borderRadius: 12, boxShadow: '4px 4px 0 0 #0A0A0A', letterSpacing: '0.05em' }}
          >
            {/* @copy CRO-button-setup-required-01 Lv1 */}
            はじめる →
          </button>
        </div>
      </div>
    )
  }

  // ---- STEP 1: Gender / interest_in ----
  if (step === 1) {
    return (
      <div className="h-dvh flex flex-col max-w-[480px] mx-auto">
        <div className="sticky top-0 z-10 px-5 pt-5 pb-4" style={{ background: '#0A0A0A' }}>
          {ProgressBar}
          {/* @copy CRO-heading-setup-required-02 Lv1 */}
          <h1 className="font-display text-2xl text-white" style={{ fontWeight: 900 }}>
            あなたについて教えてください。
          </h1>
        </div>

        <div className="flex-1 min-h-0 bg-white overflow-y-auto px-5 pt-6 pb-6 space-y-8">
          <div>
            {/* @copy CRO-label-setup-required-01 Lv1 */}
            <p className="font-bold text-ink text-base mb-3">性別は？<span className="badge-required">必須</span></p>
            <div className="flex gap-3">
              {(['male', 'female'] as Gender[]).map((v) => {
                const sel = effectiveGender === v
                const bgClass = sel ? (v === 'male' ? 'bg-hash-azure' : 'bg-hash-rose') : 'bg-white'
                const textClass = sel ? 'text-white' : 'text-ink'
                return (
                <button
                  key={v}
                  type="button"
                  disabled={genderLocked}
                  onClick={() => updateDraft({ gender: v })}
                  className={`flex-1 py-4 rounded-xl border-2 border-ink font-bold text-base transition-all ${bgClass} ${textClass} ${genderLocked ? 'opacity-70' : ''}`}
                  style={{ boxShadow: sel ? '3px 3px 0 0 #0A0A0A' : 'none' }}
                >
                  {v === 'male' ? '自分は男性' : '自分は女性'}
                </button>
                )
              })}
            </div>
            {step1Touched && !effectiveGender && (
              // @copy CRO-error-setup-required-15 Lv0
              <p className="text-sm font-bold mt-1.5" style={{ color: '#FF3B6B' }}>性別を選択してください</p>
            )}
          </div>

          <div>
            {/* @copy CRO-label-setup-required-02 Lv1 */}
            <p className="font-bold text-ink text-base mb-3">恋愛対象は？<span className="badge-required">必須</span></p>
            <div className="flex gap-3">
              {(['female', 'male'] as InterestIn[]).map((v) => {
                const sel = effectiveInterestIn === v
                return (
                <button
                  key={v}
                  type="button"
                  disabled={interestInLocked}
                  onClick={() => updateDraft({ interest_in: v })}
                  className={`flex-1 py-4 rounded-xl border-2 border-ink font-bold text-sm transition-all ${sel ? 'bg-brand text-ink' : 'bg-white text-ink'} ${interestInLocked ? 'opacity-70' : ''}`}
                  style={{ boxShadow: sel ? '3px 3px 0 0 #0A0A0A' : 'none' }}
                >
                  {v === 'female' ? '女性が好き' : '男性が好き'}
                </button>
                )
              })}
            </div>
            {step1Touched && !effectiveInterestIn && (
              // @copy CRO-error-setup-required-16 Lv0
              <p className="text-sm font-bold mt-1.5" style={{ color: '#FF3B6B' }}>好みを選択してください</p>
            )}
          </div>

          {/* @copy CRO-confirm-setup-required-01 Lv0 */}
          <p className="text-xs font-bold" style={{ color: '#FF3B6B' }}>
            ※ 一度設定すると変更できません。慎重に選んでください。
          </p>
        </div>

        <div
          className="shrink-0 px-5 pt-4 space-y-2"
          style={{ background: 'white', borderTop: '2px solid #0A0A0A', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleNextStep1}
            className="w-full h-14 font-bold text-base border-2 transition-all"
            style={{
              background: '#0A0A0A',
              color: '#ffffff',
              borderColor: '#0A0A0A',
              boxShadow: '4px 4px 0 0 #0A0A0A',
              borderRadius: 12,
              opacity: canProceedStep1 ? 1 : 0.4,
            }}
          >
            {/* @copy CRO-button-setup-required-02 Lv1 */}
            次へ →
          </button>
          <button
            type="button"
            onClick={() => isReapply ? navigate(-1) : setStep(0)}
            className="w-full text-center text-ink/60 text-sm font-bold py-1"
          >
            {/* @copy CRO-button-setup-required-03 Lv1 */}
            ← 戻る
          </button>
        </div>
      </div>
    )
  }

  // ---- STEP 2: 生年月日 ----
  if (step === 2) {
    return (
      <div className="h-dvh flex flex-col max-w-[480px] mx-auto">
        <div className="sticky top-0 z-10 px-5 pt-5 pb-4" style={{ background: '#0A0A0A' }}>
          {ProgressBar}
          {/* @copy CRO-heading-setup-required-03 Lv0 */}
          <h1 className="font-display text-2xl text-white" style={{ fontWeight: 900 }}>
            生年月日を教えてください。
          </h1>
        </div>

        <div className="flex-1 min-h-0 bg-white overflow-y-auto px-5 pt-6 pb-6 space-y-5">
          <div>
            {/* @copy CRO-label-setup-required-04 Lv0 */}
            <label className="block font-bold text-sm text-ink mb-1.5">
              生年月日<span className="badge-required">必須</span>
            </label>
            <input
              type="date"
              value={draft.birth_date}
              onChange={(e) => updateDraft({ birth_date: e.target.value })}
              onBlur={() => setTouched(t => ({ ...t, birth_date: true }))}
              className="w-full h-11 border-2 border-ink px-3 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
              style={{ borderRadius: 8 }}
              max={MAX_BIRTH_DATE}
              min={MIN_BIRTH_DATE}
            />
            {touched.birth_date && getBirthDateError(draft.birth_date) && (
              <p className="text-sm font-bold mt-1" style={{ color: '#FF3B6B' }}>{getBirthDateError(draft.birth_date)}</p>
            )}
            {/* @copy CRO-confirm-setup-required-03 Lv0 */}
            <p className="text-xs text-warning mt-1">※ 承認後は変更できません。</p>
          </div>

          <div>
            <label className="block font-bold text-sm text-ink mb-1.5">
              入学年度<span className="badge-required">必須</span>
            </label>
            <select
              value={draft.admission_year}
              onChange={(e) => setDraft(prev => ({ ...prev, admission_year: e.target.value }))}
              className="w-full h-11 border-2 border-ink bg-white px-3 text-sm focus:outline-none"
              style={{ borderRadius: 8 }}
            >
              <option value="">選択してください</option>
              {ADMISSION_YEAR_OPTIONS.map((y) => (
                <option key={y} value={String(y)}>{y}年度</option>
              ))}
            </select>
            {step2Touched && getAdmissionYearError(draft.admission_year) && (
              <p className="text-sm font-bold mt-1" style={{ color: '#FF3B6B' }}>{getAdmissionYearError(draft.admission_year)}</p>
            )}
          </div>
        </div>

        <div
          className="shrink-0 px-5 pt-4 space-y-2"
          style={{ background: 'white', borderTop: '2px solid #0A0A0A', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleNextStep2}
            className="w-full h-14 font-bold text-base border-2 transition-all"
            style={{
              background: '#0A0A0A',
              color: '#ffffff',
              borderColor: '#0A0A0A',
              boxShadow: '4px 4px 0 0 #0A0A0A',
              borderRadius: 12,
              opacity: canProceedStep2 ? 1 : 0.4,
            }}
          >
            {/* @copy CRO-button-setup-required-04 Lv1 */}
            次へ →
          </button>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full text-center text-ink/60 text-sm font-bold py-1"
          >
            {/* @copy CRO-button-setup-required-05 Lv1 */}
            ← 戻る
          </button>
        </div>
      </div>
    )
  }

  // ---- STEP 3: 学年 + 学部学科 ----
  if (step === 3) {
    return (
      <div className="h-dvh flex flex-col max-w-[480px] mx-auto">
        <div className="sticky top-0 z-10 px-5 pt-5 pb-4" style={{ background: '#0A0A0A' }}>
          {ProgressBar}
          {/* @copy CRO-heading-setup-required-04 Lv0 */}
          <h1 className="font-display text-2xl text-white" style={{ fontWeight: 900 }}>
            学籍情報を入力してください。
          </h1>
        </div>

        <div className="flex-1 min-h-0 bg-white overflow-y-auto px-5 pt-6 pb-6 space-y-5">
          {/* 身分選択 */}
          <div className="space-y-2">
            <p className="font-bold text-sm text-ink mb-1.5">区分<span className="badge-required">必須</span></p>
            <div className="flex gap-3">
              {([
                { v: 'undergrad', label: '学部生' },
                { v: 'grad', label: '院生' },
              ] as const).map(({ v, label }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDraft(prev => ({
                    ...prev,
                    student_type: v,
                    faculty: '',
                    department: '',
                  }))}
                  className={`flex-1 h-12 border-2 border-ink font-bold rounded-xl ${
                    draft.student_type === v ? 'bg-ink text-white' : 'bg-white text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {step3Touched && getStudentTypeError(draft.student_type) && (
              <p className="text-sm font-bold mt-1" style={{ color: '#FF3B6B' }}>{getStudentTypeError(draft.student_type)}</p>
            )}
          </div>

          {/* 学部生: 学部→学科 連動 */}
          {draft.student_type === 'undergrad' && (
            <div>
              <span
                className="inline-block font-mono text-xs font-bold text-white px-3 py-1 uppercase tracking-wider mb-3"
                style={{ background: '#0A0A0A' }}
              >
                学部・学科
              </span>
              <span className="badge-required ml-2">必須</span>
              <FacultySelector
                faculty={draft.faculty}
                department={draft.department}
                onFacultyChange={(f) => setDraft(prev => ({ ...prev, faculty: f, department: '' }))}
                onDepartmentChange={(d) => setDraft(prev => ({ ...prev, department: d }))}
              />
              {step3Touched && getFacultyError(draft.faculty) && (
                <p className="text-sm font-bold mt-1" style={{ color: '#FF3B6B' }}>{getFacultyError(draft.faculty)}</p>
              )}
              {step3Touched && !getFacultyError(draft.faculty) && getDepartmentError(draft.department) && (
                <p className="text-sm font-bold mt-1" style={{ color: '#FF3B6B' }}>{getDepartmentError(draft.department)}</p>
              )}
              <p className="text-xs text-ink/40 mt-1">マッチするまで他のユーザーには表示されません。マッチ後は学部のみ表示されます。</p>
              <p className="text-xs text-warning mt-0.5">※ 承認後は変更できません。</p>
            </div>
          )}

          {/* 院生: 研究科 select のみ（専攻は削除） */}
          {draft.student_type === 'grad' && (
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-sm text-ink mb-1.5">
                  研究科<span className="badge-required">必須</span>
                </label>
                <select
                  value={draft.faculty}
                  onChange={(e) => setDraft(prev => ({ ...prev, faculty: e.target.value, department: '' }))}
                  className="w-full h-11 border-2 border-ink bg-white px-3 text-sm focus:outline-none"
                  style={{ borderRadius: 8 }}
                >
                  <option value="">選択してください</option>
                  {GRADUATE_SCHOOLS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                {step3Touched && getFacultyError(draft.faculty) && (
                  <p className="text-sm font-bold mt-1" style={{ color: '#FF3B6B' }}>{getFacultyError(draft.faculty)}</p>
                )}
              </div>
              <p className="text-xs text-ink/40">マッチするまで他のユーザーには表示されません。マッチ後は研究科のみ表示されます。</p>
              <p className="text-xs text-warning">※ 承認後は変更できません。</p>
            </div>
          )}
        </div>

        <div
          className="shrink-0 px-5 pt-4 space-y-2"
          style={{ background: 'white', borderTop: '2px solid #0A0A0A', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleNextStep3}
            className="w-full h-14 font-bold text-base border-2 transition-all"
            style={{
              background: '#0A0A0A',
              color: '#ffffff',
              borderColor: '#0A0A0A',
              boxShadow: '4px 4px 0 0 #0A0A0A',
              borderRadius: 12,
              opacity: canProceedStep3 ? 1 : 0.4,
            }}
          >
            {/* @copy CRO-button-setup-required-06 Lv1 */}
            次へ →
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full text-center text-ink/60 text-sm font-bold py-1"
          >
            {/* @copy CRO-button-setup-required-07 Lv1 */}
            ← 戻る
          </button>
        </div>
      </div>
    )
  }

  // ---- STEP 4: 本人確認書類アップロード ----
  if (step === 4) {
    const bothReady = !!studentIdFile && !!idDocFile
    return (
      <div className="h-dvh flex flex-col max-w-[480px] mx-auto">
        <div className="sticky top-0 z-10 px-5 pt-5 pb-4" style={{ background: '#0A0A0A' }}>
          {ProgressBar}
          <h1 className="font-display text-2xl text-white" style={{ fontWeight: 900 }}>
            本人確認書類を<br />アップロードしてください。
          </h1>
        </div>

        <div className="flex-1 min-h-0 bg-white overflow-y-auto px-5 pt-6 pb-6 space-y-6">
          {/* 枠1: 学生証 */}
          <div className="space-y-2">
            <p className="font-bold text-sm text-ink">学生証<span className="badge-required">必須</span></p>
            <p className="text-xs text-ink/50">顔写真のある面をアップロードしてください</p>
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
                onClick={() => { setStep4Touched(true); fileInputRef.current?.click() }}
                className="w-full py-10 rounded-xl border-2 border-dashed border-ink/40 flex flex-col items-center gap-3 transition-all hover:border-ink"
              >
                <Upload className="w-8 h-8 text-ink/40" />
                <span className="text-sm font-bold text-muted">タップして選択</span>
                <span className="text-xs text-subtle">JPG / PNG・5MB以下</span>
              </button>
            )}
            {step4Touched && !studentIdFile && (
              <p className="text-sm font-bold" style={{ color: '#FF3B6B' }}>学生証画像を選択してください</p>
            )}
            {fileError && (
              <p className="text-sm font-bold" style={{ color: '#FF3B6B' }}>{fileError}</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* 枠2: 写真付き身分証 */}
          <div className="space-y-2">
            <p className="font-bold text-sm text-ink">写真付き身分証（免許証 / マイナンバーカード）<span className="badge-required">必須</span></p>
            <p className="text-xs text-ink/50">顔写真のある面をアップロードしてください</p>
            {idDocPreviewUrl ? (
              <div className="relative w-full">
                <img
                  src={idDocPreviewUrl}
                  alt="身分証プレビュー"
                  className="w-full max-h-48 object-contain rounded-lg border-2 border-ink"
                />
                <button
                  type="button"
                  onClick={removeIdDoc}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setStep4Touched(true); idDocInputRef.current?.click() }}
                className="w-full py-10 rounded-xl border-2 border-dashed border-ink/40 flex flex-col items-center gap-3 transition-all hover:border-ink"
              >
                <Upload className="w-8 h-8 text-ink/40" />
                <span className="text-sm font-bold text-muted">タップして選択</span>
                <span className="text-xs text-subtle">JPG / PNG・5MB以下</span>
              </button>
            )}
            {step4Touched && !idDocFile && (
              <p className="text-sm font-bold" style={{ color: '#FF3B6B' }}>身分証画像を選択してください</p>
            )}
            {idDocError && (
              <p className="text-sm font-bold" style={{ color: '#FF3B6B' }}>{idDocError}</p>
            )}
            <input
              ref={idDocInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleIdDocChange}
            />
          </div>

          <div
            className="p-4 rounded-xl"
            style={{ border: '2px solid #0A0A0A', boxShadow: '4px 4px 0 0 #0A0A0A', background: 'rgba(61,220,151,0.15)' }}
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-ink/60" />
              <p className="text-xs text-ink/70 leading-relaxed">
                学生証と写真付き身分証の2枚が必要です。文字が読めるよう鮮明に撮影してください。
              </p>
            </div>
          </div>
        </div>

        <div
          className="shrink-0 px-5 pt-4 space-y-2"
          style={{ background: 'white', borderTop: '2px solid #0A0A0A', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleNextStep4}
            disabled={!bothReady}
            className="w-full h-14 font-bold text-base border-2 transition-all"
            style={{
              background: bothReady ? '#0A0A0A' : '#e5e5e5',
              color: bothReady ? '#ffffff' : 'rgba(10,10,10,0.4)',
              borderColor: bothReady ? '#0A0A0A' : '#e5e5e5',
              boxShadow: bothReady ? '4px 4px 0 0 #0A0A0A' : 'none',
              borderRadius: 12,
            }}
          >
            次へ →
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className="w-full text-center text-ink/60 text-sm font-bold py-1"
          >
            ← 戻る
          </button>
        </div>
      </div>
    )
  }

  // ---- STEP 5: 確認・提出（通常フロー）/ 再申請 ----

  return (
    <div className="h-dvh flex flex-col max-w-[480px] mx-auto">
      <div className="sticky top-0 z-10 px-5 pt-5 pb-4" style={{ background: '#0A0A0A' }}>
        {ProgressBar}
        {/* @copy CRO-heading-setup-required-06 Lv0 */}
        <h1 className="font-display text-2xl text-white" style={{ fontWeight: 900 }}>
          {isReapply ? '再申請' : '内容を確認してください。'}
        </h1>
      </div>

      <div className="flex-1 min-h-0 bg-white overflow-y-auto px-5 pt-6 pb-6 space-y-6">
        {/* 却下理由バナー（reapply のみ） */}
        {isReapply && profile?.rejection_reason && (
          <div
            className="p-4 rounded-xl"
            style={{ border: '2px solid #FF3B6B', background: 'rgba(255,59,107,0.08)', boxShadow: '3px 3px 0 0 #FF3B6B' }}
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-hot" />
              <div>
                {/* @copy CRO-banner-setup-required-01 Lv0 */}
                <p className="text-xs font-bold text-hot mb-0.5">審査が却下されました</p>
                <p className="text-sm text-ink leading-relaxed">{profile.rejection_reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* 入力内容確認 */}
        <section
          className="p-4 rounded-xl space-y-4"
          style={{ border: '2px solid #0A0A0A', boxShadow: '4px 4px 0 0 #0A0A0A' }}
        >
          <span className="block w-fit font-mono text-xs font-bold bg-ink text-white px-2 py-0.5 uppercase">
            {isReapply ? '登録済み情報' : '入力内容'}
          </span>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted font-mono text-xs">性別</span>
              <span className="font-bold">{effectiveGender === 'male' ? '男性' : effectiveGender === 'female' ? '女性' : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted font-mono text-xs">恋愛対象</span>
              <span className="font-bold">{effectiveInterestIn === 'male' ? '男性が好き' : effectiveInterestIn === 'female' ? '女性が好き' : '—'}</span>
            </div>
            <div className="h-px bg-ink/10" />
            <div className="flex justify-between">
              <span className="text-muted font-mono text-xs">生年月日</span>
              <span className="font-bold">{draft.birth_date || '—'}</span>
            </div>
            <div className="h-px bg-ink/10" />
            <div className="flex justify-between">
              <span className="text-muted font-mono text-xs">区分</span>
              <span className="font-bold">
                {draft.student_type === 'undergrad' ? '学部生' : draft.student_type === 'grad' ? '院生' : '—'}
              </span>
            </div>
            <div className="h-px bg-ink/10" />
            <div className="flex justify-between">
              <span className="text-muted font-mono text-xs">入学年度</span>
              <span className="font-bold">{draft.admission_year ? `${draft.admission_year}年度` : '—'}</span>
            </div>
            <div className="h-px bg-ink/10" />
            <div className="flex justify-between items-start">
              <span className="text-muted font-mono text-xs">学部 / 研究科</span>
              <span className="font-bold text-right max-w-[55%]">{draft.faculty || '—'}</span>
            </div>
            {draft.student_type !== 'grad' && (
              <div className="flex justify-between items-start">
                <span className="text-muted font-mono text-xs">学科</span>
                <span className="font-bold text-right max-w-[55%]">{draft.department || '—'}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            {/* @copy CRO-button-setup-required-10a Lv1 */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-bold text-muted underline underline-offset-2"
            >
              性別を修正
            </button>
            <span className="text-ink/20">|</span>
            {/* @copy CRO-button-setup-required-10b Lv1 */}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs font-bold text-muted underline underline-offset-2"
            >
              生年月日を修正
            </button>
            <span className="text-ink/20">|</span>
            {/* @copy CRO-button-setup-required-10c Lv1 */}
            <button
              type="button"
              onClick={() => setStep(3)}
              className="text-xs font-bold text-muted underline underline-offset-2"
            >
              区分・学部学科を修正
            </button>
          </div>
        </section>

        {/* 本人確認書類エリア */}
        {!isReapply ? (
          /* 通常フロー: 2枚プレビュー + 変更リンク */
          <section className="space-y-3">
            <span
              className="inline-block font-mono text-xs font-bold text-white px-3 py-1 uppercase tracking-wider"
              style={{ background: '#0A0A0A' }}
            >
              本人確認書類
            </span>
            <div className="space-y-2">
              <p className="text-xs text-ink/50 font-bold">学生証</p>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="学生証プレビュー"
                  className="w-full max-h-40 object-contain rounded-lg border-2 border-ink"
                />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs text-ink/50 font-bold">写真付き身分証</p>
              {idDocPreviewUrl && (
                <img
                  src={idDocPreviewUrl}
                  alt="身分証プレビュー"
                  className="w-full max-h-40 object-contain rounded-lg border-2 border-ink"
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="text-xs font-bold text-muted underline underline-offset-2"
            >
              本人確認書類を変更
            </button>
          </section>
        ) : (
          /* 再申請: 2枠アップロード */
          <section className="space-y-4">
            <span
              className="inline-block font-mono text-xs font-bold text-white px-3 py-1 uppercase tracking-wider"
              style={{ background: '#0A0A0A' }}
            >
              本人確認書類をアップロード
            </span>

            {/* 学生証 */}
            <div className="space-y-2">
              <p className="font-bold text-sm text-ink">学生証<span className="badge-required">必須</span></p>
              <p className="text-xs text-ink/50">顔写真のある面をアップロードしてください</p>
              {previewUrl ? (
                <div className="relative w-full">
                  <img
                    src={previewUrl}
                    alt="学生証プレビュー"
                    className="w-full max-h-40 object-contain rounded-lg border-2 border-ink"
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
                  onClick={() => { setStep4Touched(true); fileInputRef.current?.click() }}
                  className="w-full py-8 rounded-xl border-2 border-dashed border-ink/40 flex flex-col items-center gap-2 transition-all hover:border-ink"
                >
                  <Upload className="w-8 h-8 text-ink/40" />
                  <span className="text-sm font-bold text-muted">タップして選択</span>
                  <span className="text-xs text-subtle">JPG / PNG・5MB以下</span>
                </button>
              )}
              {step4Touched && !studentIdFile && (
                <p className="text-sm font-bold" style={{ color: '#FF3B6B' }}>学生証画像を選択してください</p>
              )}
              {fileError && (
                <p className="text-sm font-bold" style={{ color: '#FF3B6B' }}>{fileError}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* 写真付き身分証 */}
            <div className="space-y-2">
              <p className="font-bold text-sm text-ink">写真付き身分証（免許証 / マイナンバーカード）<span className="badge-required">必須</span></p>
              <p className="text-xs text-ink/50">顔写真のある面をアップロードしてください</p>
              {idDocPreviewUrl ? (
                <div className="relative w-full">
                  <img
                    src={idDocPreviewUrl}
                    alt="身分証プレビュー"
                    className="w-full max-h-40 object-contain rounded-lg border-2 border-ink"
                  />
                  <button
                    type="button"
                    onClick={removeIdDoc}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setStep4Touched(true); idDocInputRef.current?.click() }}
                  className="w-full py-8 rounded-xl border-2 border-dashed border-ink/40 flex flex-col items-center gap-2 transition-all hover:border-ink"
                >
                  <Upload className="w-8 h-8 text-ink/40" />
                  <span className="text-sm font-bold text-muted">タップして選択</span>
                  <span className="text-xs text-subtle">JPG / PNG・5MB以下</span>
                </button>
              )}
              {step4Touched && !idDocFile && (
                <p className="text-sm font-bold" style={{ color: '#FF3B6B' }}>身分証画像を選択してください</p>
              )}
              {idDocError && (
                <p className="text-sm font-bold" style={{ color: '#FF3B6B' }}>{idDocError}</p>
              )}
              <input
                ref={idDocInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleIdDocChange}
              />
            </div>
          </section>
        )}

        {/* 注意書き */}
        <div
          className="p-4 rounded-xl"
          style={{ border: '2px solid #0A0A0A', boxShadow: '4px 4px 0 0 #0A0A0A', background: 'rgba(61,220,151,0.15)' }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-ink/60" />
            {/* @copy CRO-confirm-setup-required-06 Lv0 */}
            <p className="text-xs text-ink/70 leading-relaxed">
              入力した情報は学生証と照合して確認します。承認後、生年月日・学部学科は変更できません。
            </p>
          </div>
        </div>
      </div>

      <div
        className="shrink-0 px-5 pt-4 space-y-2"
        style={{ background: 'white', borderTop: '2px solid #0A0A0A', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {error && <p className="text-sm text-hot font-medium text-center">{error}</p>}
        <button
          type="button"
          onClick={() => { setStep4Touched(true); handleSubmit() }}
          disabled={!canSubmit || submitting}
          className="w-full h-14 font-bold text-base border-2 transition-all"
          style={{
            background: canSubmit ? '#0A0A0A' : '#e5e5e5',
            color: canSubmit ? '#ffffff' : 'rgba(10,10,10,0.4)',
            borderColor: canSubmit ? '#0A0A0A' : '#e5e5e5',
            boxShadow: canSubmit ? '4px 4px 0 0 #0A0A0A' : 'none',
            borderRadius: 12,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {/* @copy CRO-button-setup-required-11 Lv0 */}
          {submitting ? '送信中…' : isReapply ? '確認のため再提出する' : '確認のため提出する'}
        </button>
        <button
          type="button"
          onClick={() => setStep(4)}
          disabled={submitting}
          className="w-full text-center text-ink/60 text-sm font-bold py-1"
        >
          {/* @copy CRO-button-setup-required-12 Lv1 */}
          ← 戻る
        </button>
      </div>
    </div>
  )
}
