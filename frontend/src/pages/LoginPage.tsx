import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePageTitle } from '@/hooks/usePageTitle'
import { supabase } from '@/lib/supabase'
import { isAllowedDomain, getDomainErrorMessage } from '@/lib/validation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  usePageTitle('ログイン')
  const navigate = useNavigate()
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
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
      setError('メールアドレスまたはパスワードが正しくありません')
      return
    }

    navigate('/home')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 上半分: 黒背景 */}
      <div className="bg-ink flex-1 flex flex-col justify-center px-6 pt-16 pb-12 relative min-h-[40vh]">
        <div>
          <h1 className="font-display text-5xl text-acid mb-3">Cro-co.</h1>
          <p className="text-2xl font-bold text-white">おかえり。</p>
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
                placeholder="パスワード"
                className="border-2 border-ink rounded-lg h-11 focus-visible:ring-0 focus-visible:border-ink"
              />
            </div>

            <Button
              type="submit"
              variant="bold"
              className="w-full h-11 text-base"
              disabled={loading}
            >
              {loading ? '処理中...' : 'ログイン'}
            </Button>

            <p className="text-center">
              <span className="text-sm text-ink underline cursor-pointer">
                パスワードを忘れた方
              </span>
            </p>
          </form>

          <hr className="border-ink/20" />

          <Button variant="acid" className="w-full h-11 text-base" asChild>
            <Link to="/signup">アカウントをお持ちでない方は新規登録</Link>
          </Button>
        </div>

        <p className="text-center font-mono text-xs text-ink/40 mt-2">
          @ecs.osaka-u.ac.jp のみ登録可能
        </p>
      </div>
    </div>
  )
}
