import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '@/hooks/usePageTitle'
import { supabase } from '@/lib/supabase'
import { isAllowedDomain, getDomainErrorMessage } from '@/lib/validation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

export default function SignupPage() {
  usePageTitle('新規登録')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [agreed, setAgreed] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!agreed) {
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
      options: { emailRedirectTo: 'http://localhost:5173/home' },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    setSuccess(true)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 上半分: ミント背景 */}
      <div className="bg-mint flex-1 flex flex-col justify-center px-6 pt-16 pb-12 min-h-[40vh]">
        <h1 className="font-display text-5xl text-ink mb-3">Cro-co.</h1>
        <p className="text-2xl font-bold text-ink mb-2">はじめよう。</p>
        <p className="font-mono text-xs text-ink/60">大阪大学限定マッチングアプリ</p>
      </div>

      {/* 下半分: 白背景 */}
      <div className="bg-white flex-1 flex flex-col px-6 pt-0 pb-10">
        <div className="card-bold bg-white rounded-[18px] p-6 -translate-y-6 space-y-4">
          {success ? (
            <div className="bg-mint border-2 border-ink rounded-lg p-4 space-y-1">
              <p className="font-bold text-ink">確認メールを送信しました ✓</p>
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
                <Label htmlFor="email" className="font-bold text-ink">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="yourname@ecs.osaka-u.ac.jp"
                  className="border-2 border-ink rounded-lg h-11 focus-visible:ring-0 focus-visible:border-ink"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="font-bold text-ink">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="6文字以上"
                  className="border-2 border-ink rounded-lg h-11 focus-visible:ring-0 focus-visible:border-ink"
                />
              </div>

              <div className="flex items-start gap-2 p-3 border-2 border-ink rounded-lg">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  className="mt-0.5 border-ink data-[state=checked]:bg-ink data-[state=checked]:border-ink"
                />
                <Label htmlFor="agree" className="text-sm font-normal leading-relaxed cursor-pointer text-ink">
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold underline">利用規約</a>
                  {' '}および{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold underline">プライバシーポリシー</a>
                  {' '}に同意する（必須）
                </Label>
              </div>

              <Button
                type="submit"
                variant="acid"
                className="w-full h-11 text-base"
                disabled={loading}
              >
                {loading ? '処理中...' : 'アカウント作成'}
              </Button>
            </form>
          )}

          <Button variant="outline-bold" className="w-full h-11 text-base" asChild>
            <Link to="/login">すでにアカウントをお持ちの方はログイン</Link>
          </Button>
        </div>

        <p className="text-center font-mono text-xs text-ink/40 mt-2">
          @ecs.osaka-u.ac.jp のみ登録可能
        </p>
      </div>
    </div>
  )
}
