// 解説: このファイルはメール認証リンクのコールバックページを定義する。
// 解説: Supabase のメール確認リンク（/auth/confirm?...）をクリックするとここに遷移する
// 解説: URL ハッシュにエラーコードがある場合はエラー表示 / user がある場合は成功 / どちらもない場合はすでに確認済みと判定
// 解説: parseHashError = マウント時1回だけハッシュを読む（Supabase が hash を削除する前に同期的に取得）
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// supabase-js が hash を処理・消去する前にエラー情報を拾えるとは限らないため
// マウント時に1回だけ同期的にキャプチャする
function parseHashError(): string | null {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null
  const params = new URLSearchParams(hash)
  return params.get('error_code') ?? params.get('error')
}

const buttonClass =
  'inline-flex items-center justify-center w-full h-11 bg-ink text-white border-2 border-ink rounded-lg font-bold text-sm shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A] transition-all'

export default function AuthConfirmedPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [hashError] = useState<string | null>(() => parseHashError())

  if (loading) {
    return (
      <div className="min-h-dvh bg-paper flex items-center justify-center p-6">
        {/* @copy CRO-banner-auth-confirmed-01 Lv0 */}
        <p className="font-bold text-ink">読み込んでいます。少しお待ちください。</p>
      </div>
    )
  }

  if (hashError) {
    return (
      <div className="min-h-dvh bg-paper flex items-center justify-center p-6">
        <div className="w-full max-w-sm card-bold bg-white rounded-[18px] p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-ink flex items-center justify-center bg-paper">
              <AlertCircle className="w-8 h-8 text-ink" strokeWidth={2} />
            </div>
          </div>
          <div className="space-y-2">
            {/* @copy CRO-heading-auth-confirmed-01 Lv0 */}
            <h1 className="font-display text-2xl text-ink">このリンクは使用済みか、期限切れです</h1>
            {/* @copy CRO-error-auth-confirmed-01 Lv0 */}
            <p className="text-sm text-ink/70 leading-relaxed">
              すでに認証が完了している可能性があります。まずはログインをお試しください。ログインできない場合は、新規登録からやり直して確認メールを受け取り直してください。
            </p>
          </div>
          <button type="button" onClick={() => navigate('/login')} className={buttonClass}>
            {/* @copy CRO-button-auth-confirmed-01 Lv0 */}
            ログインページへ
          </button>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-dvh bg-paper flex items-center justify-center p-6">
        <div className="w-full max-w-sm card-bold bg-white rounded-[18px] p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-full border-2 border-ink flex items-center justify-center"
              style={{ background: 'var(--color-success)' }}
            >
              <CheckCircle className="w-8 h-8 text-ink" strokeWidth={2} />
            </div>
          </div>
          <div className="space-y-2">
            {/* @copy CRO-heading-auth-confirmed-02 Lv0 */}
            <h1 className="font-display text-2xl text-ink">メールアドレスを確認しました</h1>
            {/* @copy CRO-onboarding-auth-confirmed-01 Lv1 */}
            <p className="text-sm text-ink/70 leading-relaxed">
              このまま登録を続けましょう。
            </p>
          </div>
          <button type="button" onClick={() => navigate('/setup/required')} className={buttonClass}>
            {/* @copy CRO-button-auth-confirmed-02 Lv1 */}
            登録をつづける →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center p-6">
      <div className="w-full max-w-sm card-bold bg-white rounded-[18px] p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div
            className="w-16 h-16 rounded-full border-2 border-ink flex items-center justify-center"
            style={{ background: 'var(--color-success)' }}
          >
            <CheckCircle className="w-8 h-8 text-ink" strokeWidth={2} />
          </div>
        </div>
        <div className="space-y-2">
          {/* @copy CRO-heading-auth-confirmed-03 Lv0 */}
          <h1 className="font-display text-2xl text-ink">メールアドレスの確認は完了しています</h1>
          {/* @copy CRO-onboarding-auth-confirmed-02 Lv0 */}
          <p className="text-sm text-ink/70 leading-relaxed">
            ログインして登録の続きにお進みください。
          </p>
        </div>
        <button type="button" onClick={() => navigate('/login')} className={buttonClass}>
          {/* @copy CRO-button-auth-confirmed-03 Lv0 */}
          ログインページへ
        </button>
      </div>
    </div>
  )
}
