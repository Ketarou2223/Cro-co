import { useNavigate } from 'react-router-dom'

export default function SetupThanksPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col max-w-[480px] mx-auto">
      <div className="flex-1 flex flex-col justify-center px-6 py-16 bg-white space-y-8">
        <div className="space-y-4">
          <span
            className="inline-block font-mono text-xs font-bold px-3 py-1 uppercase tracking-wider"
            style={{ background: '#DFFF1F', border: '2px solid #0A0A0A', boxShadow: '3px 3px 0 0 #0A0A0A' }}
          >
            提出完了
          </span>
          <h1
            className="font-display text-5xl text-ink leading-tight"
            style={{ fontWeight: 900 }}
          >
            ありがとう。
          </h1>
        </div>

        <p className="text-ink/70 text-base leading-relaxed">
          本人確認の申請を受け付けました。<br />
          審査は通常1〜2営業日以内に完了します。<br />
          承認されたらメールでお知らせします。
        </p>

        <div className="h-px bg-ink/10" />

        <div className="space-y-4">
          <p className="font-bold text-ink text-base">
            審査を待つ間に、プロフィールを充実させよう。
          </p>
          <button
            type="button"
            onClick={() => navigate('/setup/install')}
            className="w-full h-14 font-bold text-base border-2 border-ink"
            style={{
              background: '#0A0A0A',
              color: '#DFFF1F',
              borderRadius: 12,
              boxShadow: '4px 4px 0 0 #0A0A0A',
              letterSpacing: '0.02em',
            }}
          >
            プロフィールを入力する →
          </button>
        </div>
      </div>
    </div>
  )
}
