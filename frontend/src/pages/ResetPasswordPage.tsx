// 解説: このファイルはパスワードリセットページを定義する。
// 解説: 遷移元: LoginPage の「パスワードを忘れた？」→ メールリンク → ここに遷移
// 解説: ready = PASSWORD_RECOVERY イベントまたは既存セッションが確認されたときフォームを表示する
// 解説: race condition 対策: メールリンクで遷移すると PASSWORD_RECOVERY がマウント前に発火することがあるため getSession() で先にセッション確認する
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  // @copy CRO-heading-reset-password-01 Lv0
  usePageTitle('パスワードリセット')
  const navigate = useNavigate()
  const [ready, setReady] = useState<boolean>(false)
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [showNew, setShowNew] = useState<boolean>(false)
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 解説: 先に getSession() を確認する（マウント前に PASSWORD_RECOVERY が発火した場合の race condition 吸収）
    // メールリンクからの遷移では PASSWORD_RECOVERY がマウント前に発火することがある
    // getSession() でセッション有無を先に確認し、race condition を吸収する
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      // @copy CRO-error-reset-password-01 Lv0
      setError('パスワードが一致しません。')
      return
    }
    if (newPassword.length < 8) {
      // @copy CRO-error-reset-password-02 Lv0
      setError('パスワードは8文字以上で入力してください。')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    setLoading(false)

    if (updateError) {
      // @copy CRO-error-reset-password-03 Lv0
      setError('うまくいきませんでした。もう一度お試しください。')
      return
    }

    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 上半分: 黒背景 */}
      <div className="bg-ink flex-1 flex flex-col justify-center px-6 pt-16 pb-12 relative min-h-[40vh]">
        <div>
          <h1 className="font-display text-3xl text-brand mb-3">Cro-co.</h1>
          {/* @copy CRO-heading-reset-password-02 Lv0 */}
          <p className="text-2xl font-bold text-white">パスワードを再設定します。</p>
        </div>
        <div className="absolute bottom-6 right-6">
          <span className="font-mono text-xs text-white/60">RESET / PASSWORD</span>
        </div>
      </div>

      {/* 下半分: 白背景 */}
      <div className="bg-white flex-1 flex flex-col px-6 pt-0 pb-10">
        <div className="card-bold bg-white rounded-[18px] p-6 -translate-y-6 space-y-4">
          {!ready ? (
            // @copy CRO-banner-reset-password-01 Lv0
            <p className="text-sm text-muted text-center py-4">リンクを確認しています…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-hot text-white border-2 border-ink p-3 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                {/* @copy CRO-label-reset-password-01 Lv0 */}
                <Label htmlFor="new-password" className="font-bold text-ink">新しいパスワード</Label>
                <div className="relative">
                  {/* @copy CRO-placeholder-reset-password-01 Lv0 */}
                  <Input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="8文字以上"
                    className="border-2 border-ink rounded-lg h-11 pr-11 focus-visible:ring-0 focus-visible:border-ink"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    // @copy CRO-label-reset-password-02 Lv0
                    aria-label={showNew ? 'パスワードを隠す' : 'パスワードを表示する'}
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-ink/50 hover:text-ink transition-colors"
                  >
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {/* @copy CRO-label-reset-password-03 Lv0 */}
                <Label htmlFor="confirm-password" className="font-bold text-ink">パスワード（確認）</Label>
                <div className="relative">
                  {/* @copy CRO-placeholder-reset-password-02 Lv0 */}
                  <Input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="もう一度入力"
                    className="border-2 border-ink rounded-lg h-11 pr-11 focus-visible:ring-0 focus-visible:border-ink"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    // @copy CRO-label-reset-password-04 Lv0
                    aria-label={showConfirm ? 'パスワードを隠す' : 'パスワードを表示する'}
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-ink/50 hover:text-ink transition-colors"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="bold"
                className="w-full h-11 text-base"
                disabled={loading}
              >
                {/* @copy CRO-button-reset-password-01 Lv0 */}
                {loading ? '保存中…' : 'パスワードを変更する'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
