// 解説: このファイルは学生証提出完了後の「ありがとうページ」を定義する。
// 解説: 遷移元: SetupRequiredPage.tsx の提出成功後（isReapply=false のみ）
// 解説: 「プロフィールを入力する →」ボタンで /setup/install → /setup/optional へ進む
// 解説: 審査完了までの待機期間をプロフィール充実に使うよう促す画面
import { useNavigate } from 'react-router-dom'

export default function SetupThanksPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col max-w-[480px] mx-auto">
      <div className="flex-1 flex flex-col justify-center px-6 py-16 bg-white space-y-8">
        <div className="space-y-4">
          <span
            className="inline-block font-mono text-xs font-bold px-3 py-1 uppercase tracking-wider"
            style={{ background: 'var(--color-brand)', border: '2px solid #0A0A0A', boxShadow: '3px 3px 0 0 #0A0A0A' }}
          >
            {/* @copy CRO-label-setup-thanks-01 Lv0 */}
            提出完了
          </span>
          {/* @copy CRO-heading-setup-thanks-01 Lv0 */}
          <h1
            className="font-display text-5xl text-ink leading-tight"
            style={{ fontWeight: 900 }}
          >
            ありがとうございます。
          </h1>
        </div>

        {/* @copy CRO-onboarding-setup-thanks-01 Lv0 */}
        <p className="text-ink/70 text-base leading-relaxed">
          本人確認の申請を受け付けました。審査には数日いただくことがあります。結果はアプリ内のステータスでご確認いただけます。
        </p>

        <div className="h-px bg-ink/10" />

        <div className="space-y-4">
          {/* @copy CRO-onboarding-setup-thanks-02 Lv1 */}
          <p className="font-bold text-ink text-base">
            審査を待つ間に、プロフィールを充実させましょう。
          </p>
          <button
            type="button"
            onClick={() => navigate('/setup/install')}
            className="w-full h-14 font-bold text-base border-2 border-ink"
            style={{
              background: '#0A0A0A',
              color: 'var(--color-brand)',
              borderRadius: 12,
              boxShadow: '4px 4px 0 0 #0A0A0A',
              letterSpacing: '0.02em',
            }}
          >
            {/* @copy CRO-button-setup-thanks-01 Lv1 */}
            プロフィールを入力する →
          </button>
        </div>
      </div>
    </div>
  )
}
