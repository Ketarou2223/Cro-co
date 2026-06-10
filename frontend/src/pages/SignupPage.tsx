import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { supabase } from '@/lib/supabase'
import { isAllowedDomain, getDomainErrorMessage } from '@/lib/validation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { setConsent, trackEvent } from '@/lib/analytics'

export default function SignupPage() {
  usePageTitle('新規登録')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [agreedTerms, setAgreedTerms] = useState<boolean>(false)
  const [agreedPrivacy, setAgreedPrivacy] = useState<boolean>(false)
  const [analyticsConsented, setAnalyticsConsented] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!agreedTerms || !agreedPrivacy) {
      setError('利用規約とプライバシーポリシーへの同意が必要です。')
      return
    }

    if (!isAllowedDomain(email)) {
      setError(getDomainErrorMessage())
      return
    }

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
    })

    setLoading(false)

    if (signUpError) {
      setError('うまくいきませんでした。もう一度お試しください。')
      return
    }

    setConsent(analyticsConsented)
    trackEvent('sign_up')
    setSuccess(true)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 上半分: ミント背景 */}
      <div className="bg-mint flex-1 flex flex-col justify-center px-6 pt-16 pb-12 min-h-[40vh]">
        <h1 className="font-display text-5xl text-ink mb-3">Cro-co.</h1>
        <p className="text-2xl font-bold text-ink mb-2">はじめまして。</p>
        <p className="font-mono text-xs text-muted">大阪大学限定マッチングアプリ</p>
      </div>

      {/* 下半分: 白背景 */}
      <div className="bg-white flex-1 flex flex-col px-6 pt-0 pb-10">
        <div className="card-bold bg-white rounded-[18px] p-6 -translate-y-6 space-y-4">
          {success ? (
            <div className="bg-mint border-2 border-ink rounded-lg p-4 space-y-1">
              <p className="font-bold text-ink">確認メールを送信しました。</p>
              <p className="text-sm text-ink/70">
                メールのリンクをクリックして登録を完了してください。その後、学生証をアップロードして本人確認を行ってください。
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-hot text-white border-2 border-ink p-3 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="font-bold text-ink">メールアドレス<span className="badge-required">必須</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="大学メールアドレス（@ecs.osaka-u.ac.jp）"
                  className="border-2 border-ink rounded-lg h-11 focus-visible:ring-0 focus-visible:border-ink"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="font-bold text-ink">パスワード<span className="badge-required">必須</span></Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="パスワード（8文字以上）"
                    className="border-2 border-ink rounded-lg h-11 pr-11 focus-visible:ring-0 focus-visible:border-ink"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示する'}
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-ink/50 hover:text-ink transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* 18歳未満利用禁止（法第10条） */}
              <p className="flex items-center gap-1.5 font-mono text-sm font-bold text-ink">
                <ShieldAlert size={14} strokeWidth={2.5} className="shrink-0" />
                18歳未満の方は登録・利用できません。
              </p>

              <div className="border-2 border-ink rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 p-3">
                  <Checkbox
                    id="agree-terms"
                    checked={agreedTerms}
                    onCheckedChange={(checked) => setAgreedTerms(checked === true)}
                    className="shrink-0 border-ink data-[state=checked]:bg-ink data-[state=checked]:border-ink"
                  />
                  <Label htmlFor="agree-terms" className="text-sm font-normal cursor-pointer text-ink">
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold underline">利用規約</a>に同意する（必須）
                  </Label>
                </div>
                <div className="border-t border-ink/20" />
                <div className="flex items-center gap-2 p-3">
                  <Checkbox
                    id="agree-privacy"
                    checked={agreedPrivacy}
                    onCheckedChange={(checked) => setAgreedPrivacy(checked === true)}
                    className="shrink-0 border-ink data-[state=checked]:bg-ink data-[state=checked]:border-ink"
                  />
                  <Label htmlFor="agree-privacy" className="text-sm font-normal cursor-pointer text-ink">
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold underline">プライバシーポリシー</a>に同意する（必須）
                  </Label>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Switch
                  id="analytics"
                  checked={analyticsConsented}
                  onCheckedChange={setAnalyticsConsented}
                  className="mt-0.5 shrink-0"
                />
                <div>
                  <Label htmlFor="analytics" className="text-sm font-bold text-ink cursor-pointer">
                    アクセス解析に協力する（任意）
                  </Label>
                  <p className="text-xs text-ink/60 mt-0.5">
                    オンにすると閲覧情報などが Google に送信され分析に使われます。オフでも全機能をご利用いただけます。詳しくは<Link to="/privacy" className="underline font-bold">プライバシーポリシー</Link>をご覧ください。
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                variant="acid"
                className="w-full h-11 text-base"
                disabled={loading || !email.trim() || !password.trim() || !agreedTerms || !agreedPrivacy}
              >
                {loading ? '処理中...' : 'アカウントを作る'}
              </Button>
            </form>
          )}

          <Button variant="outline-bold" className="w-full h-11 text-base" asChild>
            <Link to="/login">すでにアカウントがある → ログイン</Link>
          </Button>
        </div>

        <p className="text-center font-mono text-xs text-subtle mt-2">
          @ecs.osaka-u.ac.jp のみ登録可能
        </p>
      </div>
    </div>
  )
}
