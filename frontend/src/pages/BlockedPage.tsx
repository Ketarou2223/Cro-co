// 解説: このファイルは再登録ブロック（退会30日以内・BAN）ユーザーの専用画面を定義する。
// 解説: 到達経路: useProfile / SetupRequiredPage が GET /api/profile/me の 423 を検出して navigate('/blocked', { state: {...} })
// 解説: withdrawal = 退会ブロック（日付つき）/ ban = BAN・在籍中（中立文のみ・日付・「退会」の語を出さない）
// 解説: このページは useProfile() を呼ばない（423 → navigate → 423 の循環を防ぐ）
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { clearAllDB, clearSensitiveStorage } from '@/lib/db'

interface BlockState {
  type?: string
  message?: string
  retain_until?: string
  code?: string
}

export default function BlockedPage() {
  const location = useLocation()
  const { signOut } = useAuth()
  const state = (location.state ?? {}) as BlockState
  const isWithdrawal = state.type === 'withdrawal'

  const handleLogout = async () => {
    try {
      clearSensitiveStorage()
      await clearAllDB()
      await signOut()
    } catch {
      await signOut()
    }
  }

  return (
    <div className="min-h-screen flex flex-col max-w-[480px] mx-auto bg-white">
      {/* ヘッダー */}
      <div
        className="sticky top-0 z-10 flex items-center px-4 border-b-2"
        style={{ borderColor: '#0A0A0A', height: 56, background: '#FFFFFF' }}
      >
        <span
          className="font-display text-2xl"
          style={{ color: '#0A0A0A', fontWeight: 900, letterSpacing: '-0.02em' }}
        >
          Cro-co.
        </span>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col items-start justify-center px-6 py-12 space-y-8">
        {/* Croco SVG */}
        <div className="flex justify-center w-full">
          <svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* 胴体 */}
            <ellipse cx="48" cy="56" rx="28" ry="22" fill="#3DDC97" stroke="#0A0A0A" strokeWidth="2.5" />
            {/* 頭 */}
            <ellipse cx="48" cy="34" rx="20" ry="16" fill="#3DDC97" stroke="#0A0A0A" strokeWidth="2.5" />
            {/* 目（左） */}
            <circle cx="41" cy="29" r="3.5" fill="white" stroke="#0A0A0A" strokeWidth="2" />
            <circle cx="41" cy="29" r="1.5" fill="#0A0A0A" />
            {/* 目（右） */}
            <circle cx="55" cy="29" r="3.5" fill="white" stroke="#0A0A0A" strokeWidth="2" />
            <circle cx="55" cy="29" r="1.5" fill="#0A0A0A" />
            {/* 鼻 */}
            <ellipse cx="48" cy="38" rx="5" ry="3" fill="#2BB87A" stroke="#0A0A0A" strokeWidth="2" />
            {/* 手（左） */}
            <ellipse cx="18" cy="58" rx="8" ry="5" fill="#3DDC97" stroke="#0A0A0A" strokeWidth="2.5" transform="rotate(-20 18 58)" />
            {/* 手（右） */}
            <ellipse cx="78" cy="58" rx="8" ry="5" fill="#3DDC97" stroke="#0A0A0A" strokeWidth="2.5" transform="rotate(20 78 58)" />
            {/* 足（左） */}
            <ellipse cx="36" cy="76" rx="7" ry="5" fill="#3DDC97" stroke="#0A0A0A" strokeWidth="2.5" />
            {/* 足（右） */}
            <ellipse cx="60" cy="76" rx="7" ry="5" fill="#3DDC97" stroke="#0A0A0A" strokeWidth="2.5" />
          </svg>
        </div>

        {/* テキスト */}
        <div className="space-y-3 w-full">
          <h1
            className="font-display text-3xl"
            style={{ color: '#0A0A0A', fontWeight: 900, letterSpacing: '-0.02em' }}
          >
            {isWithdrawal ? 'しばらくおまちください。' : 'ご利用いただけません。'}
          </h1>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(10,10,10,0.6)' }}>
            {isWithdrawal
              ? (state.message ?? 'しばらく経ってから再登録をお試しください。')
              : '現在このアカウントではご利用いただけません。'}
          </p>
        </div>

        {/* ログアウトボタン */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3 font-bold text-base"
          style={{
            background: '#FFFFFF',
            color: '#0A0A0A',
            border: '2px solid #0A0A0A',
            borderRadius: 8,
            boxShadow: '4px 4px 0 0 #0A0A0A',
            fontWeight: 700,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseDown={e => {
            const el = e.currentTarget
            el.style.transform = 'translate(2px, 2px)'
            el.style.boxShadow = '2px 2px 0 0 #0A0A0A'
          }}
          onMouseUp={e => {
            const el = e.currentTarget
            el.style.transform = ''
            el.style.boxShadow = '4px 4px 0 0 #0A0A0A'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.transform = ''
            el.style.boxShadow = '4px 4px 0 0 #0A0A0A'
          }}
        >
          ログアウト
        </button>
      </div>
    </div>
  )
}
