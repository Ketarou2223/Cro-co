import { Navigate, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import MarqueeBar from '@/components/MarqueeBar'
import { Button } from '@/components/ui/button'

const DUMMY_USERS = [
  { name: 'さくら', year: 2, faculty: '理学部', color: '#FFE94D' },
  { name: 'けんた', year: 3, faculty: '工学部', color: '#FF7DA8' },
  { name: 'みお', year: 1, faculty: '文学部', color: '#A8F0D1' },
  { name: 'りょう', year: 4, faculty: '法学部', color: '#6BB5FF' },
  { name: 'あやか', year: 2, faculty: '経済学部', color: '#C9A8FF' },
  { name: 'だいき', year: 3, faculty: '医学部', color: '#FF7A3D' },
]

export default function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (user) return <Navigate to="/home" replace />

  return (
    <div className="max-w-[480px] mx-auto overflow-x-hidden">

      {/* ヘッダー + ヒーロー（黒背景） */}
      <section className="bg-ink px-5 pt-6 pb-14">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <span className="font-display text-2xl text-acid">Cro-co.</span>
          <Link
            to="/login"
            className="font-mono text-xs text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            ログイン
          </Link>
        </div>

        {/* ステッカー3枚 */}
        <div className="flex flex-wrap gap-3 mb-8 py-2">
          <span
            className="font-mono text-xs font-bold uppercase px-3 py-2 bg-acid border-2 border-ink inline-block"
            style={{ transform: 'rotate(-3deg)' }}
          >
            大学生限定
          </span>
          <span
            className="font-mono text-xs font-bold uppercase px-3 py-2 bg-mint border-2 border-ink inline-block"
            style={{ transform: 'rotate(4deg)' }}
          >
            空きコマで出会う
          </span>
          <span
            className="font-mono text-xs font-bold uppercase px-3 py-2 bg-white border-2 border-ink inline-block"
            style={{ transform: 'rotate(-2deg)' }}
          >
            学生証で本人確認
          </span>
        </div>

        {/* 見出し */}
        <div className="mb-5">
          <h1 className="font-display text-6xl text-white" style={{ lineHeight: 0.9 }}>
            はじける、
          </h1>
          <h1 className="font-display text-6xl flex items-baseline flex-wrap gap-x-2" style={{ lineHeight: 0.9 }}>
            <span className="text-hot">青春</span>
            <span
              className="inline-block bg-acid text-ink border-2 border-ink px-3 font-display text-6xl"
              style={{ transform: 'rotate(-2deg)', lineHeight: 0.95 }}
            >
              .app
            </span>
          </h1>
        </div>

        {/* サブコピー */}
        <p className="font-mono text-sm text-white/60 tracking-widest uppercase mb-4">
          MATCH / DATE / CHILL — UNIV ONLY
        </p>

        {/* 説明文 */}
        <p className="text-white/80 text-sm leading-relaxed mb-8">
          授業の空きコマも、テスト終わりの夜も。<br />
          同じキャンパスの誰かと「ちょっと話そう」が始まるアプリ。
        </p>

        {/* CTAボタン2つ（横並び） */}
        <div className="flex gap-3 mb-12">
          <button
            type="button"
            className="flex-1 h-14 bg-hot text-white border-2 border-ink font-bold text-sm shadow-[4px_4px_0_0_#0A0A0A] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
            onClick={() => navigate('/signup')}
          >
            いますぐ始める →
          </button>
          <a
            href="#how"
            className="flex-1 h-14 bg-white text-ink border-2 border-ink font-bold text-sm shadow-[4px_4px_0_0_#FFFFFF] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#FFFFFF] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#FFFFFF] transition-all flex items-center justify-center"
          >
            雰囲気を見る
          </a>
        </div>

        {/* プロフィールカード2枚（斜め重ね） */}
        <div className="flex items-end justify-center mb-8 pt-4">
          {/* カード1（左・回転-5deg） */}
          <div
            className="relative w-40 border-2 border-ink z-10 flex-shrink-0"
            style={{ transform: 'rotate(-5deg)', boxShadow: '4px 4px 0 0 #0A0A0A', backgroundColor: '#FF7DA8' }}
          >
            <div className="aspect-[3/4] flex items-center justify-center">
              <span className="font-display text-5xl text-white/60">1年</span>
            </div>
            <div className="bg-white px-3 py-2 border-t-2 border-ink">
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-ink text-sm">さくら</span>
                <span className="font-mono text-[10px] text-muted">19 / 理学部</span>
              </div>
              <p className="font-mono text-xs font-bold mt-1 text-ink leading-tight">「韓ドラ語れる人いる？」</p>
            </div>
            <div
              className="absolute -top-3 -right-3 bg-hot text-white font-mono text-xs border-2 border-ink px-2 py-1"
              style={{ transform: 'rotate(10deg)' }}
            >
              NEW
            </div>
          </div>

          {/* カード2（右・回転+5deg） */}
          <div
            className="relative w-40 border-2 border-ink flex-shrink-0 -ml-4"
            style={{ transform: 'rotate(5deg)', boxShadow: '4px 4px 0 0 #0A0A0A', backgroundColor: '#A8F0D1' }}
          >
            <div className="aspect-[3/4] flex items-center justify-center">
              <span className="font-display text-5xl text-ink/60">2年</span>
            </div>
            <div className="bg-white px-3 py-2 border-t-2 border-ink">
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-ink text-sm">たくみ</span>
                <span className="font-mono text-[10px] text-muted">21 / 工学部</span>
              </div>
              <p className="font-mono text-xs font-bold mt-1 text-ink leading-tight">「カフェで課題やる人募集」</p>
            </div>
            <div
              className="absolute -top-3 -right-3 bg-acid text-ink font-mono text-xs border-2 border-ink px-2 py-1"
              style={{ transform: 'rotate(10deg)' }}
            >
              92% MATCH
            </div>
          </div>
        </div>

        {/* チャットバブル */}
        <div
          className="bg-[#A8F0D1] border-2 border-ink rounded-2xl p-3"
          style={{ boxShadow: '4px 4px 0 0 #0A0A0A' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-mono text-xs font-bold text-ink">YUTA / 21</span>
          </div>
          <p className="text-sm text-ink mb-2">2限あいてる？</p>
          <div className="flex justify-end">
            <span className="bg-white border-2 border-ink rounded-xl px-3 py-1.5 inline-block text-sm font-bold text-ink">
              じゃ生協前で
            </span>
          </div>
        </div>
      </section>

      {/* マーキーバー */}
      <MarqueeBar />

      {/* 3ステップ（白背景） */}
      <section id="how" className="bg-white px-5 py-14 space-y-8">
        <div>
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">/ 01 — HOW IT WORKS</p>
          <h2 className="font-display text-4xl text-ink mb-3">
            3ステップで<br />ちょっと話そう。
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            難しいプロフィール文も、無理なやり取りも、いらない。<br />
            同じキャンパスにいる、ちょうどいい距離の出会い。
          </p>
        </div>

        <div className="space-y-4">
          <div className="card-bold bg-white p-5 space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold bg-acid px-2 py-0.5">01</span>
              <p className="font-bold text-ink">学生証で本人確認</p>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              阪大メールと学生証があればOK。審査は1〜2営業日。
            </p>
          </div>

          <div className="card-bold bg-white p-5 space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold bg-ink text-white px-2 py-0.5">02</span>
              <p className="font-bold text-ink">気になる人を探す</p>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              同じキャンパスの誰かを見つけよう。空きコマや趣味で絞れる。
            </p>
          </div>

          <div className="card-bold bg-white p-5 space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold bg-hot text-white px-2 py-0.5">03</span>
              <p className="font-bold text-ink">メッセージを送る</p>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              マッチしたら即チャット開始。難しく考えなくていい。
            </p>
          </div>
        </div>

        {/* ミニスタッツ */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card-bold bg-acid p-4 text-center">
            <p className="font-mono text-3xl font-bold text-ink">30s</p>
            <p className="font-mono text-xs text-ink/70 mt-1">登録に必要な時間</p>
          </div>
          <div className="card-bold bg-ink p-4 text-center">
            <p className="font-mono text-3xl font-bold text-white">0円</p>
            <p className="font-mono text-xs text-white/60 mt-1">すべての基本機能</p>
          </div>
        </div>
      </section>

      {/* 今日のキャンパス（bg-mint） */}
      <section className="bg-mint px-5 py-14 space-y-6">
        <div>
          <p className="font-mono text-xs text-ink/60 uppercase tracking-widest mb-3">/ 02 — TODAY'S CAMPUS</p>
          <h2 className="font-display text-4xl text-ink">
            今日キャンパスに<br />いる、誰か。
          </h2>
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
                <p className="font-mono text-[10px] text-muted truncate">{u.faculty}</p>
              </div>
            </div>
          ))}
        </div>

        <Button variant="bold" className="w-full" onClick={() => navigate('/signup')}>
          みんなを見る →
        </Button>
      </section>

      {/* 安心の理由（白背景） */}
      <section className="bg-white px-5 py-14 space-y-6">
        <h2 className="font-display text-3xl text-ink">
          安心して使えるのは、<br />本気の理由がある。
        </h2>

        <div className="space-y-4">
          <div className="card-bold bg-white p-5 space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold bg-acid px-2 py-0.5">VERIFIED</span>
              <p className="font-bold text-ink">学生証で本人確認済み</p>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              阪大生だけが使えるアプリ。身分確認で安心。
            </p>
          </div>

          <div className="card-bold bg-white p-5 space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold bg-mint px-2 py-0.5">SAFE</span>
              <p className="font-bold text-ink">身バレ防止機能あり</p>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              同じ学部・サークルの人を相互非表示にできる。
            </p>
          </div>

          <div className="card-bold bg-white p-5 space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold bg-hot text-white px-2 py-0.5">MONITORED</span>
              <p className="font-bold text-ink">運営が24時間監視</p>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              通報機能と運営パトロールで安全な環境を維持。
            </p>
          </div>
        </div>
      </section>

      {/* CTA（黒背景） */}
      <section className="bg-ink px-5 py-16 space-y-6">
        <h2 className="font-display text-6xl text-white" style={{ lineHeight: 0.9 }}>
          さあ、<br />はじめよ。
        </h2>
        <p className="text-white/70 text-sm leading-relaxed">
          登録は阪大メールだけ。30秒で、キャンパスのどこかの誰かと繋がる。
        </p>
        <div className="space-y-3">
          <Button variant="acid" className="w-full h-14 text-base font-bold" onClick={() => navigate('/signup')}>
            いますぐ始める →
          </Button>
          <Button variant="outline-bold" className="w-full h-14 font-bold" onClick={() => navigate('/login')}>
            ログインはこちら
          </Button>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-ink px-5 py-8 border-t-2 border-white/20">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs text-white/40">© 2026 Cro-co</span>
          <div className="flex gap-4">
            <Link
              to="/terms"
              className="font-mono text-xs text-white/40 hover:text-white/70 underline underline-offset-2"
            >
              利用規約
            </Link>
            <Link
              to="/privacy"
              className="font-mono text-xs text-white/40 hover:text-white/70 underline underline-offset-2"
            >
              プライバシーポリシー
            </Link>
          </div>
        </div>
        <p className="font-mono text-xs text-white/30 text-center">
          「ちょっと話そう」が、青春のはじまり。
        </p>
      </footer>

    </div>
  )
}
