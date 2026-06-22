// 解説: このファイルはログインページを定義する。
// 解説: Supabase signInWithPassword でメール+パスワード認証を行い、成功したら /home へ遷移する
// 解説: パスワードリセット = resetPasswordForEmail でリセットメールを送信（同画面内）
// 解説: isAllowedDomain = @ecs.osaka-u.ac.jp 以外のドメインはログイン不可（フロント側バリデーション）
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { supabase } from '@/lib/supabase'
import { isAllowedDomain, getDomainErrorMessage } from '@/lib/validation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  // @copy CRO-heading-login-01 Lv1
  usePageTitle('ログイン')
  const navigate = useNavigate()
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [emailUnconfirmed, setEmailUnconfirmed] = useState<boolean>(false)
  const [resetSent, setResetSent] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!isAllowedDomain(email)) {
      setError(getDomainErrorMessage())
      return
    }

    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (signInError) {
      const isUnconfirmed =
        signInError.message === 'Email not confirmed' ||
        (signInError as unknown as { code?: string }).code === 'email_not_confirmed'
      if (isUnconfirmed) {
        setEmailUnconfirmed(true)
        setError(null)
      } else {
        setEmailUnconfirmed(false)
        // @copy CRO-error-login-01 Lv0
        setError('メールアドレスまたはパスワードが正しくありません。')
      }
      return
    }
    setEmailUnconfirmed(false)

    navigate('/home')
  }

  const handleForgotPassword = async () => {
    if (!email) {
      // @copy CRO-error-login-02 Lv1
      setError('先にメールアドレスを入力してください。')
      return
    }
    if (!isAllowedDomain(email)) {
      setError(getDomainErrorMessage())
      return
    }

    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      // @copy CRO-error-login-03 Lv0
      setError('送信できませんでした。もう一度お試しください。')
      return
    }

    setResetSent(true)
    setError(null)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 上半分: 黒背景 */}
      <div className="bg-ink flex-1 flex flex-col justify-center px-6 pt-16 pb-12 relative min-h-[40vh]">
        <div>
          <h1 className="font-display text-5xl text-brand mb-3">Cro-co.</h1>
          {/* @copy CRO-heading-login-02 Lv2 */}
          <p className="text-2xl font-bold text-white">おかえりなさい。お待ちしていました。</p>
        </div>
        <div className="absolute bottom-6 right-6">
          <span className="font-mono text-xs text-white/60">MATCH / DATE / CHILL — UNIV ONLY</span>
        </div>
      </div>

      {/* 下半分: 白背景 */}
      <div className="bg-white flex-1 flex flex-col px-6 pt-0 pb-10">
        {/* カード（上部が黒に重なる形で浮く） */}
        <div className="card-bold bg-white rounded-[18px] p-6 -translate-y-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {emailUnconfirmed && (
              <div className="bg-warning/10 border-2 border-warning p-3 rounded-lg text-sm font-medium text-ink space-y-1">
                <p>メールアドレスの確認が完了していません。</p>
                <p className="font-normal text-ink/70">登録時に届いたメールのリンクをクリックしてください。まだ登録していない場合は<Link to="/signup" className="underline font-bold text-ink">新規登録</Link>へ。</p>
              </div>
            )}
            {error && (
              <div className="bg-hot text-white border-2 border-ink p-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            {resetSent && (
              <div className="bg-success border-2 border-ink p-3 rounded-lg text-sm font-medium text-ink">
                {/* @copy CRO-banner-login-01 Lv1 */}
                リセット用のメールを送りました。受信ボックスを確認してください。
              </div>
            )}

            <div className="space-y-1.5">
              {/* @copy CRO-label-login-01 Lv1 */}
              <Label htmlFor="email" className="font-bold text-ink">メールアドレス<span className="badge-required">必須</span></Label>
              {/* @copy CRO-placeholder-login-01 Lv1 */}
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="大学メールアドレス"
                className="border-2 border-ink rounded-lg h-11 focus-visible:ring-0 focus-visible:border-ink"
              />
            </div>

            <div className="space-y-1.5">
              {/* @copy CRO-label-login-02 Lv1 */}
              <Label htmlFor="password" className="font-bold text-ink">パスワード<span className="badge-required">必須</span></Label>
              <div className="relative">
                {/* @copy CRO-placeholder-login-02 Lv1 */}
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="パスワード"
                  className="border-2 border-ink rounded-lg h-11 pr-11 focus-visible:ring-0 focus-visible:border-ink"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  // @copy CRO-label-login-03 Lv1
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示する'}
                  className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-ink/50 hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="bold"
              className="w-full h-11 text-base"
              disabled={loading || !email.trim() || !password.trim()}
            >
              {/* @copy CRO-button-login-01 Lv1 */}
              {loading ? '処理中…' : 'ログイン'}
            </Button>

            <p className="text-center">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-sm text-ink underline cursor-pointer disabled:opacity-50"
              >
                {/* @copy CRO-button-login-02 Lv2 */}
                パスワードを忘れた？
              </button>
            </p>
          </form>

          <hr className="border-ink/20" />

          <Button variant="brand" className="w-full h-11 text-base" asChild>
            {/* @copy CRO-button-login-03 Lv2 */}
            <Link to="/signup">アカウントがない？ → 新規登録</Link>
          </Button>
        </div>

        {/* @copy CRO-label-login-04 Lv1 */}
        <p className="text-center font-mono text-xs text-subtle mt-2">
          @ecs.osaka-u.ac.jp のみ登録可能
        </p>
      </div>
    </div>
  )
}
