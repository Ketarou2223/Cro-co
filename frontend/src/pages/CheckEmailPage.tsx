import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import CrocoIllust from '@/components/CrocoIllust'

const RESEND_COOLDOWN_SEC = 60

type Status = 'idle' | 'sent' | 'error' | 'rate' | 'no_email'

export default function CheckEmailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = (location.state as { email?: string } | null)?.email ?? ''

  const [cooldown, setCooldown] = useState(0)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const handleResend = useCallback(async () => {
    if (!email) {
      setStatus('no_email')
      return
    }
    if (sending || cooldown > 0) return
    setSending(true)
    setStatus('idle')
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
      })
      if (error) {
        const msg = (error.message || '').toLowerCase()
        if (error.status === 429 || msg.includes('rate') || msg.includes('seconds')) {
          setStatus('rate')
        } else {
          setStatus('error')
        }
      } else {
        setStatus('sent')
      }
    } catch {
      setStatus('error')
    } finally {
      setSending(false)
      setCooldown(RESEND_COOLDOWN_SEC)
    }
  }, [email, sending, cooldown])

  const buttonDisabled = sending || cooldown > 0 || !email
  const buttonLabel = sending
    ? '送信中…'
    : cooldown > 0
    ? `再送する（${cooldown}秒）`
    : '確認メールを再送する'

  return (
    <div className="min-h-dvh bg-bone flex flex-col">
      <div className="max-w-[480px] w-full mx-auto px-6 pt-6 flex flex-col flex-1">
        <button
          onClick={() => navigate('/login')}
          className="self-start flex items-center gap-1 text-sm text-ink/60 mb-8"
        >
          <ArrowLeft size={16} />
          ログインへ
        </button>

        <div className="flex flex-col items-center text-center">
          <CrocoIllust size={88} />
          <div className="mt-6 inline-flex items-center gap-2 border-2 border-ink rounded-[10px] bg-paper px-3 py-1.5 shadow-[3px_3px_0_0_var(--color-ink)]">
            <Mail size={16} />
            <span className="font-accent font-bold text-sm">CHECK YOUR EMAIL</span>
          </div>

          <h1 className="mt-6 font-display text-2xl text-ink">確認メールを送りました</h1>
          <p className="mt-3 text-sm text-ink/60 leading-relaxed">
            {email ? (
              <>
                <span className="font-bold text-ink break-all">{email}</span>
                <br />
                に届いた確認リンクを開くと、登録が完了します。
              </>
            ) : (
              'メールに届いた確認リンクを開くと、登録が完了します。'
            )}
          </p>

          <button
            onClick={handleResend}
            disabled={buttonDisabled}
            className="mt-8 w-full bg-brand text-ink border-2 border-ink rounded-xl py-3 font-bold shadow-[4px_4px_0_0_var(--color-ink)] disabled:opacity-40"
          >
            {buttonLabel}
          </button>

          <div className="mt-3 min-h-5 text-sm text-ink/70">
            {status === 'sent' && <p>確認メールを再送しました。メールをご確認ください。</p>}
            {status === 'rate' && <p>しばらく時間をおいてからお試しください。</p>}
            {status === 'error' && <p>うまくいきませんでした。もう一度お試しください。</p>}
            {status === 'no_email' && <p>ログインからやり直してください。</p>}
          </div>

          <p className="mt-10 text-xs text-ink/40 leading-relaxed">
            メールが届かない場合は、迷惑メールフォルダもご確認ください。
          </p>
          <Link to="/login" className="mt-2 text-sm text-ink underline underline-offset-4">
            すでに確認済みの方はログイン
          </Link>
        </div>
      </div>
    </div>
  )
}
