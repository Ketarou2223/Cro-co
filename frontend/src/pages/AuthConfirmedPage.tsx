import { Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'

export default function AuthConfirmedPage() {
  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center p-6">
      <div className="w-full max-w-sm card-bold bg-white rounded-[18px] p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div
            className="w-16 h-16 rounded-full border-2 border-ink flex items-center justify-center"
            style={{ background: 'var(--color-mint, #A8F0D1)' }}
          >
            <CheckCircle className="w-8 h-8 text-ink" strokeWidth={2} />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl text-ink">メールアドレスを確認しました</h1>
          <p className="text-sm text-ink/70 leading-relaxed">
            確認が完了しました。元のページに戻って続けてください。
          </p>
        </div>
        <Link
          to="/login"
          className="inline-flex items-center justify-center w-full h-11 bg-ink text-white border-2 border-ink rounded-lg font-bold text-sm shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
        >
          ログインページへ
        </Link>
      </div>
    </div>
  )
}
