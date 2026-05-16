import { Navigate, Link, useNavigate } from 'react-router-dom'
import { Coffee, BookOpen, Utensils, Moon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import MarqueeBar from '@/components/MarqueeBar'
import { Button } from '@/components/ui/button'

const DUMMY_USERS = [
  { name: 'さくら', year: 2, faculty: '文', color: '#FFE94D' },
  { name: 'けんた', year: 3, faculty: '理', color: '#FF7DA8' },
  { name: 'みお', year: 1, faculty: '工', color: '#A8F0D1' },
]

const ACTIVITY_TAGS = [
  { Icon: Coffee, label: 'CAFE' },
  { Icon: BookOpen, label: 'STUDY' },
  { Icon: Utensils, label: 'LUNCH' },
  { Icon: Moon, label: 'NIGHT' },
]

const STATS = [
  { value: '200K+', label: 'ACTIVE STUDENTS' },
  { value: '1', label: 'UNIVERSITY' },
  { value: '92%', label: 'RESPONSE RATE' },
  { value: '10MIN', label: 'AVG TO MATCH' },
]

export default function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (user) return <Navigate to="/home" replace />

  return (
    <div className="max-w-[480px] mx-auto overflow-x-hidden">

      {/* Section 1: ヒーロー（黒背景） */}
      <section className="bg-ink px-5 pt-6 pb-16 flex flex-col min-h-screen">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-10">
          <span className="font-display text-2xl text-acid">Cro-co.</span>
          <Link
            to="/login"
            className="font-mono text-xs text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            ログイン
          </Link>
        </div>

        {/* ヒーローコンテンツ */}
        <div className="flex-1 flex flex-col justify-center gap-8">
          <div>
            <h1 className="font-display text-6xl text-white" style={{ lineHeight: 0.9 }}>
              普通の日常を、<br />
              カラフルに。
            </h1>
            <p className="font-mono text-xs text-white/60 mt-3 tracking-widest">
              思ったより、近くに。
            </p>
            <p className="font-mono text-xs text-white/40 mt-2 tracking-widest">
              OSAKA UNIV. ONLY
            </p>
          </div>

          {/* カードイラスト */}
          <div className="relative h-44 self-end w-full">
            {/* カード3（後ろ・ミント） */}
            <div
              className="absolute bottom-0 right-0 w-32 h-40 bg-[#A8F0D1] border-2 border-ink rounded-[14px] flex items-center justify-center"
              style={{ transform: 'rotate(12deg)', boxShadow: '4px 4px 0 0 #DFFF1F' }}
            >
              <span className="font-display text-5xl text-ink/70">22</span>
            </div>
            {/* カード2（中央・ピンク） */}
            <div
              className="absolute bottom-2 right-16 w-32 h-40 bg-[#FF7DA8] border-2 border-ink rounded-[14px] flex items-center justify-center"
              style={{ transform: 'rotate(-5deg)', boxShadow: '4px 4px 0 0 #0A0A0A' }}
            >
              <span className="font-display text-5xl text-white/80">19</span>
            </div>
            {/* カード1（前・黄） */}
            <div
              className="absolute bottom-4 right-32 w-32 h-40 bg-[#FFE94D] border-2 border-ink rounded-[14px] flex items-center justify-center"
              style={{ transform: 'rotate(3deg)', boxShadow: '4px 4px 0 0 #0A0A0A' }}
            >
              <span className="font-display text-5xl text-ink/80">21</span>
            </div>
          </div>

          {/* CTAボタン */}
          <div className="flex flex-col gap-3">
            <Button variant="acid" className="w-full h-12 text-base" onClick={() => navigate('/signup')}>
              いますぐ始める
            </Button>
            <button
              type="button"
              className="w-full h-12 text-base bg-transparent text-white border-2 border-white font-bold rounded-lg shadow-[4px_4px_0_0_#FFFFFF] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#FFFFFF] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#FFFFFF] transition-all"
              onClick={() => navigate('/login')}
            >
              ログイン
            </button>
          </div>
        </div>
      </section>

      {/* Section 2: マーキーバー */}
      <MarqueeBar />

      {/* Section 3: 仕組み（白背景） */}
      <section className="bg-white px-5 py-14 space-y-6">
        <h2 className="font-display text-4xl text-ink">
          3ステップで、<br />はじめよう。
        </h2>

        <div className="space-y-4">
          <div className="card-bold bg-white p-5 space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold bg-acid px-2 py-0.5">01</span>
              <p className="font-bold text-ink">学生証で本人確認</p>
            </div>
            <p className="font-mono text-xs text-ink/50 leading-relaxed">
              大阪大学のメールアドレスと学生証が必要です
            </p>
          </div>

          <div className="card-bold bg-white p-5 space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold bg-ink text-white px-2 py-0.5">02</span>
              <p className="font-bold text-ink">気になる人を探す</p>
            </div>
            <p className="font-mono text-xs text-ink/50 leading-relaxed">
              同じキャンパスの人を見つけよう
            </p>
          </div>

          <div className="card-bold bg-white p-5 space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold bg-hot text-white px-2 py-0.5">03</span>
              <p className="font-bold text-ink">メッセージを送る</p>
            </div>
            <p className="font-mono text-xs text-ink/50 leading-relaxed">
              マッチしたら即チャット開始
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="card-bold bg-acid p-4 flex-1 text-center">
            <p className="font-mono text-3xl font-bold text-ink">30s</p>
            <p className="font-mono text-xs text-ink/60 mt-1">登録時間</p>
          </div>
          <div className="card-bold bg-ink p-4 flex-1 text-center">
            <p className="font-mono text-3xl font-bold text-white">0円</p>
            <p className="font-mono text-xs text-white/60 mt-1">完全無料</p>
          </div>
        </div>
      </section>

      {/* Section 4: 今日のキャンパス（mint背景） */}
      <section className="bg-mint px-5 py-14 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-4xl text-ink">
            今日のキャンパスに、<br />誰か。
          </h2>
          <span className="font-mono text-xs border-2 border-ink bg-white px-2 py-1 whitespace-nowrap shrink-0 mt-1">
            ONLINE NOW
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {DUMMY_USERS.map((u) => (
            <div
              key={u.name}
              className="card-bold overflow-hidden"
              style={{ backgroundColor: u.color }}
            >
              <div className="aspect-square flex items-center justify-center">
                <span className="font-display text-4xl text-ink/70">{u.year}</span>
              </div>
              <div className="bg-white px-2 py-1.5 border-t-2 border-ink">
                <p className="font-bold text-xs text-ink truncate">{u.name}</p>
                <p className="font-mono text-[10px] text-ink/50">{u.faculty}学部</p>
              </div>
            </div>
          ))}
        </div>

        <Button variant="bold" className="w-full" onClick={() => navigate('/signup')}>
          みんなを見る →
        </Button>
      </section>

      {/* Section 5: 空きコマ（黒背景） */}
      <section className="bg-ink px-5 py-14 space-y-6">
        <h2 className="font-display text-4xl text-white">
          空きコマ、<br />誰かと使う？
        </h2>
        <div className="flex flex-wrap gap-3">
          {ACTIVITY_TAGS.map(({ Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 border-2 border-white text-white rounded-full px-4 py-2 font-mono text-sm"
            >
              <Icon className="w-4 h-4" />
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* Section 6: 統計（acid背景） */}
      <section className="bg-acid px-5 py-14">
        <div className="grid grid-cols-2 gap-4">
          {STATS.map(({ value, label }) => (
            <div key={label} className="card-bold bg-white p-4 text-center space-y-1">
              <p className="font-mono text-3xl font-bold text-ink">{value}</p>
              <p className="font-mono text-xs text-ink/50">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7: CTA（白背景） */}
      <section className="bg-white px-5 py-16 space-y-5">
        <h2 className="font-display text-5xl text-ink">
          さあ、<br />はじめよ。
        </h2>
        <div className="space-y-3">
          <Button variant="acid" className="w-full h-12 text-base" onClick={() => navigate('/signup')}>
            いますぐ始める
          </Button>
          <Button variant="outline-bold" className="w-full h-12 text-sm" onClick={() => navigate('/login')}>
            ログインはこちら →
          </Button>
        </div>
        <div className="flex items-center justify-between pt-6 border-t border-ink/10">
          <span className="font-mono text-xs text-ink/40">© 2026 Cro-co</span>
          <div className="flex gap-4">
            <Link to="/terms" className="font-mono text-xs text-ink/40 hover:text-ink underline underline-offset-2">
              利用規約
            </Link>
            <Link to="/privacy" className="font-mono text-xs text-ink/40 hover:text-ink underline underline-offset-2">
              プライバシーポリシー
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
