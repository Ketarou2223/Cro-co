import { useState } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'motion/react'
import {
  ArrowUpRight,
  Sparkles,
  Heart,
  Star,
  Calendar,
  Coffee,
  Check,
  ShieldCheck,
  ShieldAlert,
  EyeOff,
  Flag,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

/* ---------- 内部コンポーネント ---------- */

function Sticker({
  children,
  color,
  rotate,
  textColor = '#0A0A0A',
}: {
  children: ReactNode
  color: string
  rotate: number
  textColor?: string
}) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 border-[3px] border-ink rounded-[10px] font-mono text-xs font-bold uppercase"
      style={{ background: color, transform: `rotate(${rotate}deg)`, boxShadow: '4px 4px 0 #0A0A0A', color: textColor }}
    >
      {children}
    </div>
  )
}

function NoiseBG() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>
  )
}

function Avatar({
  seed,
  skinColor,
  flip = false,
  className = '',
}: {
  seed: string
  skinColor?: string
  flip?: boolean
  className?: string
}) {
  const params = new URLSearchParams({
    seed,
    backgroundColor: 'transparent',
    flip: flip ? 'true' : 'false',
    ...(skinColor ? { skinColor } : {}),
  })
  return (
    <img
      src={`https://api.dicebear.com/9.x/lorelei/svg?${params.toString()}`}
      alt=""
      className={`w-full h-full object-cover ${className}`}
    />
  )
}

/* タッチ端末では hover を発火させない（PC 判定） */
function useCanHover() {
  const [canHover] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches,
  )
  return canHover
}

/* dot pattern + diagonal stripes（薄い背景装飾） */
function Patterns() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#0A0A0A 1px, transparent 1.4px)',
          backgroundSize: '22px 22px',
          opacity: 0.08,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{ backgroundImage: 'repeating-linear-gradient(135deg, #0A0A0A 0 2px, transparent 2px 22px)' }}
      />
    </>
  )
}

/* ---------- データ ---------- */

type Profile = {
  name: string
  age: number
  faculty: string
  bio: string
  tags: string[]
  seed: string
  skinColor: string
  flip: boolean
  bg: string
  accent: string
  rotate: number
  badge?: string
  offsetY: number
}

const PROFILES: Profile[] = [
  { name: 'ハルカ', age: 20, faculty: '文学部・3年', bio: '空きコマはだいたいカフェ。映画と古着とフィルムカメラ。',
    tags: ['#映画', '#カフェ巡り', '#フィルム'], seed: 'haruka-bun', skinColor: 'f3d4a3', flip: false, bg: '#FFE9D6', accent: '#FF5A36', rotate: -3, badge: 'NEW', offsetY: 0 },
  { name: 'ユウタ', age: 21, faculty: '経済学部・3年', bio: '週末はバンド練。ガクチカは100均ベース改造。',
    tags: ['#バンド', '#音楽', '#DIY'], seed: 'yuta-keizai', skinColor: 'edb98a', flip: true, bg: '#D6F0FF', accent: '#2D6BFF', rotate: 2, offsetY: 32 },
  { name: 'ミオ', age: 19, faculty: '外国語学部・2年', bio: '韓国ドラマと抹茶ラテで生きてます。語学交換歓迎。',
    tags: ['#K-pop', '#語学', '#抹茶'], seed: 'mio-gaikoku', skinColor: 'f4c4a0', flip: false, bg: '#E8E0FF', accent: '#7A3BFF', rotate: -2, badge: 'HOT', offsetY: 12 },
  { name: 'ケンタ', age: 22, faculty: '工学部・4年', bio: 'ロボコン勢。最近はサーフィン始めました。理系男子。',
    tags: ['#ロボコン', '#サーフィン', '#コーヒー'], seed: 'kenta-kougaku', skinColor: 'd08b5b', flip: true, bg: '#D8FFD6', accent: '#11A93D', rotate: 3, offsetY: 44 },
  { name: 'アヤカ', age: 20, faculty: '法学部・3年', bio: 'サークルでイベント企画。タピオカ三日に一回は飲んでます。',
    tags: ['#イベント', '#フェス', '#旅行'], seed: 'ayaka-hougaku', skinColor: 'fdbcb4', flip: false, bg: '#FFDCE9', accent: '#FF2E88', rotate: -4, offsetY: 0 },
  { name: 'リョウ', age: 21, faculty: '基礎工学部・3年', bio: '古着とレコード。下北沢の住人みたいになってる。',
    tags: ['#古着', '#レコード', '#散歩'], seed: 'ryo-kisokou', skinColor: 'ae5d29', flip: true, bg: '#FFF6B0', accent: '#0A0A0A', rotate: 1, offsetY: 24 },
]

const FACULTIES = [
  '文学部', '人間科学部', '外国語学部', '法学部', '経済学部',
  '理学部', '医学部', '歯学部', '薬学部', '工学部', '基礎工学部',
]

const SAFETY = [
  { icon: Check, text: '学生証 & 大学メールアドレスで二段階審査' },
  { icon: EyeOff, text: '学部・サークル単位で相互非表示' },
  { icon: Flag, text: '通報されたユーザーは即時非表示' },
  { icon: Trash2, text: '退会後3日で本名・学籍番号を完全削除' },
]

/* ---------- プロフィールカード（TODAY'S CAMPUS 用） ---------- */

function ProfileCard({ p, index }: { p: Profile; index: number }) {
  const canHover = useCanHover()
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
      className="md:mt-[var(--off)]"
      style={{ ['--off' as string]: `${p.offsetY}px` } as CSSProperties}
    >
      <motion.div
        initial={{ y: 0, rotate: p.rotate }}
        animate={{ y: [0, -10, 0], rotate: [p.rotate, p.rotate - 2, p.rotate] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: (index % 3) * 0.5 }}
        whileHover={
          canHover
            ? { rotate: 0, y: -6, transition: { type: 'spring', stiffness: 220, damping: 18 } }
            : undefined
        }
        whileTap={{ scale: 0.97, rotate: 0 }}
        className="relative border-[3px] border-ink rounded-[16px] overflow-hidden bg-paper"
        style={{ boxShadow: '5px 5px 0 #0A0A0A' }}
      >
        {/* 写真エリア（DiceBear） */}
        <div className="relative aspect-[4/5]" style={{ background: p.bg }}>
          <Avatar seed={p.seed} skinColor={p.skinColor} flip={p.flip} />
          {p.badge && (
            <div className="absolute top-2 right-2">
              <Sticker color={p.badge === 'NEW' ? '#FF3B6B' : '#DFFF1F'} rotate={6} textColor={p.badge === 'NEW' ? '#fff' : '#0A0A0A'}>
                {p.badge}
              </Sticker>
            </div>
          )}
          {/* diagonal clip strip */}
          <div
            className="absolute bottom-0 left-0 right-0 h-12"
            style={{ background: p.accent, clipPath: 'polygon(0 45%, 100% 0, 100% 100%, 0 100%)' }}
          />
          {/* 巨大年齢 */}
          <span className="absolute bottom-0.5 right-2 font-display text-white leading-none text-5xl md:text-7xl">
            {p.age}
          </span>
        </div>

        {/* 下半分 */}
        <div className="p-3 border-t-2 border-ink">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg md:text-2xl text-ink">{p.name}</span>
            <span className="font-mono text-[10px] md:text-xs text-muted">{p.faculty}</span>
          </div>
          <p className="text-xs md:text-sm text-ink/80 mt-1 leading-snug">{p.bio}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {p.tags.map((t) => (
              <span key={t} className="font-mono text-[10px] md:text-xs border border-ink rounded-full px-2 py-0.5">
                {t}
              </span>
            ))}
          </div>
          <Link
            to="/signup"
            className="mt-3 w-full h-9 bg-hot text-white border-2 border-ink rounded-lg font-bold text-xs inline-flex items-center justify-center gap-1.5 active:translate-y-0.5 transition-transform"
          >
            <Heart size={13} strokeWidth={3} /> LIKE
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ---------- LIVE COUNTER STRIP の1ユニット ---------- */

function MarqueeUnit() {
  const items = ['Cro-co', 'OSAKA UNIV', 'SPRING 2026', 'STUDENTS ONLY', 'JOIN NOW']
  return (
    <div className="flex items-center shrink-0">
      {items.map((it) => (
        <span key={it} className="font-mono font-bold uppercase text-sm tracking-wider px-4 inline-flex items-center gap-4">
          {it}
          <Star size={12} strokeWidth={3} className="text-acid" fill="#DFFF1F" />
        </span>
      ))}
    </div>
  )
}

/* ---------- ページ本体 ---------- */

export default function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canHover = useCanHover()
  const { scrollYProgress } = useScroll()
  const blobY1 = useTransform(scrollYProgress, [0, 1], [0, -260])
  const blobY2 = useTransform(scrollYProgress, [0, 1], [0, 180])

  if (user) return <Navigate to="/home" replace />

  return (
    <div className="relative w-full overflow-x-hidden bg-paper text-ink">
      <style>{`
        @keyframes lp-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>

      {/* ① HEADER */}
      <header className="sticky top-0 z-50 bg-paper border-b-2 border-ink">
        <div className="flex items-center justify-between px-4 md:px-12 h-14">
          <span className="font-display text-xl md:text-2xl text-ink">Cro-co.</span>
          <Link
            to="/login"
            className="font-mono text-xs font-bold uppercase border-2 border-ink rounded-lg px-4 py-2 bg-white hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#0A0A0A] active:translate-y-0 transition-all"
          >
            ログイン
          </Link>
        </div>
      </header>

      {/* ② HERO */}
      <section className="relative bg-[#EEF8EE] overflow-hidden">
        <Patterns />
        <NoiseBG />

        {/* 浮遊 Blob（PC のみ・パララックス） */}
        <motion.div
          style={{ y: blobY1 }}
          className="hidden md:block absolute -top-10 right-[8%] w-40 h-40 rounded-full bg-acid border-[3px] border-ink"
          aria-hidden
        />
        <motion.div
          style={{ y: blobY2 }}
          className="hidden md:block absolute bottom-6 left-[4%] w-28 h-28 bg-hot border-[3px] border-ink"
          aria-hidden
        />

        <div className="relative px-4 md:px-12 pt-10 pb-16 md:py-20 grid md:grid-cols-12 gap-10 md:gap-8 items-center max-w-[1280px] mx-auto">
          {/* 左カラム */}
          <div className="md:col-span-6">
            <div className="flex flex-wrap gap-3 mb-7">
              <Sticker color="#DFFF1F" rotate={-3}>
                <Sparkles size={14} strokeWidth={3} /> 阪大学部生限定
              </Sticker>
              <Sticker color="#A6F0FF" rotate={4}>
                <Calendar size={14} strokeWidth={3} /> 同じキャンパスで
              </Sticker>
              <Sticker color="#A8F0D1" rotate={-2}>
                学生証で本人確認
              </Sticker>
            </div>

            <h1 className="font-display text-ink" style={{ fontSize: 'clamp(48px, 7.5vw, 112px)', lineHeight: 0.82, letterSpacing: '-0.04em' }}>
              はじける、
              <br />
              <span style={{ color: '#FF3B6B' }}>青春</span>
              <span
                className="inline-block bg-acid border-2 border-ink ml-1 align-baseline"
                style={{ transform: 'rotate(2deg)', boxShadow: '4px 4px 0 #0A0A0A', padding: '0 0.12em' }}
              >
                .app
              </span>
            </h1>

            <p className="font-mono font-bold uppercase tracking-tight text-ink/60 text-[11px] md:text-sm mt-5">
              MATCH / CHAT / CHILL — OSAKA UNIV ONLY
            </p>

            <p className="text-ink/80 text-sm md:text-[15px] leading-relaxed mt-5 max-w-md">
              授業の合間も、テスト終わりの夜も。同じキャンパスの誰かと「ちょっと話そう」が始まるアプリ。
            </p>

            {/* β告知 */}
            <div
              className="inline-flex items-center gap-2 mt-5 px-3 py-1.5 border-2 border-ink rounded-[10px] bg-acid"
              style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
            >
              <Sparkles size={14} strokeWidth={3} className="text-ink shrink-0" />
              <span className="text-xs font-bold text-ink">いまβ版。たまにつまずくかも。</span>
            </div>

            {/* 18歳未満利用禁止（法第10条） */}
            <div
              className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 border-2 border-ink rounded-[10px] bg-paper"
              style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
            >
              <ShieldAlert size={14} strokeWidth={2.5} className="text-ink shrink-0" />
              <span className="font-mono text-sm font-bold text-ink">18歳未満は利用できません。</span>
            </div>

            <div className="flex flex-wrap gap-4 mt-8">
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="inline-flex items-center gap-2 h-14 px-7 bg-hot text-white border-2 border-ink font-bold text-sm md:text-base rounded-xl shadow-[5px_5px_0_#0A0A0A] md:shadow-[7px_7px_0_#0A0A0A] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#0A0A0A] transition-all"
              >
                いますぐ始める <ArrowUpRight size={18} strokeWidth={3} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center h-14 px-7 bg-white text-ink border-2 border-ink font-bold text-sm md:text-base rounded-xl shadow-[5px_5px_0_#0A0A0A] md:shadow-[7px_7px_0_#0A0A0A] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#0A0A0A] transition-all"
              >
                ログイン
              </button>
            </div>
          </div>

          {/* 右カラム */}
          <div className="md:col-span-6">
            <div className="grid grid-cols-2 gap-3 md:gap-5 max-w-md mx-auto md:mx-0 md:ml-auto">
              {/* カード1 */}
              <motion.div
                initial={{ y: 0, rotate: -4 }}
                animate={{ y: [0, -10, 0], rotate: [-4, -6, -4] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                whileHover={
                  canHover
                    ? { rotate: 0, y: -6, transition: { type: 'spring', stiffness: 220, damping: 18 } }
                    : undefined
                }
                whileTap={{ scale: 0.97, rotate: 0 }}
                className="relative border-[3px] border-ink rounded-[16px] overflow-hidden"
                style={{ background: '#FFDCE9', boxShadow: '5px 5px 0 #0A0A0A' }}
              >
                <div className="absolute top-2 right-2 z-10">
                  <Sticker color="#FF3B6B" rotate={8} textColor="#fff">
                    <Sparkles size={10} strokeWidth={3} /> NEW
                  </Sticker>
                </div>
                <div className="aspect-[4/5]">
                  <Avatar seed="sakura-rikei" skinColor="f4c4a0" />
                </div>
                <div className="bg-white px-3 py-2 border-t-2 border-ink">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-base text-ink">MIO</span>
                    <span className="font-mono text-[9px] text-muted">/ 19 / 文学部</span>
                  </div>
                  <p className="font-mono text-[11px] font-bold mt-0.5 text-ink leading-tight">「韓ドラ語れる人いる？」</p>
                </div>
              </motion.div>

              {/* カード2 */}
              <motion.div
                initial={{ y: 0, rotate: 6 }}
                animate={{ y: [0, -12, 0], rotate: [6, 8, 6] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                whileHover={
                  canHover
                    ? { rotate: 0, y: -6, transition: { type: 'spring', stiffness: 220, damping: 18 } }
                    : undefined
                }
                whileTap={{ scale: 0.97, rotate: 0 }}
                className="relative border-[3px] border-ink rounded-[16px] overflow-hidden mt-8 md:mt-12"
                style={{ background: '#A8F0D1', boxShadow: '5px 5px 0 #0A0A0A' }}
              >
                <div className="absolute top-2 right-2 z-10">
                  <Sticker color="#DFFF1F" rotate={-6}>
                    <Heart size={10} strokeWidth={3} /> 92%
                  </Sticker>
                </div>
                <div className="aspect-[4/5]">
                  <Avatar seed="takumi-kougaku" skinColor="edb98a" />
                </div>
                <div className="bg-white px-3 py-2 border-t-2 border-ink">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-base text-ink">TAKUMI</span>
                    <span className="font-mono text-[9px] text-muted">/ 21 / 工学部</span>
                  </div>
                  <p className="font-mono text-[11px] font-bold mt-0.5 text-ink leading-tight">「カフェで課題やる人募集」</p>
                </div>
              </motion.div>
            </div>

            {/* チャットバブル */}
            <div
              className="mt-5 max-w-md mx-auto md:mx-0 md:ml-auto bg-[#A6F0FF] border-[3px] border-ink rounded-2xl p-3"
              style={{ transform: 'rotate(-2deg)', boxShadow: '5px 5px 0 #0A0A0A' }}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full border-2 border-ink overflow-hidden bg-white shrink-0">
                  <Avatar seed="yuta-keizai" skinColor="d08b5b" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-ink" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-bold text-ink">YUTA / 21 / 経済学部</p>
                  <p className="text-sm font-bold text-ink inline-flex items-center gap-1">
                    2限あいてる？ <Coffee size={13} strokeWidth={3} />
                  </p>
                </div>
                <div className="ml-auto self-end">
                  <span className="bg-white border-2 border-ink rounded-xl px-3 py-1.5 inline-block text-xs font-bold text-ink whitespace-nowrap">
                    じゃ生協前で
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ③ LIVE COUNTER STRIP */}
      <section className="bg-ink text-white border-y-[3px] border-ink py-3 overflow-hidden">
        <div className="flex whitespace-nowrap w-max" style={{ animation: 'lp-scroll 22s linear infinite' }}>
          <MarqueeUnit />
          <MarqueeUnit />
        </div>
      </section>

      {/* ④ HOW IT WORKS */}
      <section
        className="relative bg-ink text-white py-20 md:py-28"
        style={{ clipPath: 'polygon(0 2.5%, 100% 0, 100% 97.5%, 0 100%)' }}
      >
        <div className="relative px-4 md:px-12 grid md:grid-cols-12 gap-10 md:gap-12 max-w-[1280px] mx-auto">
          {/* 左 */}
          <div className="md:col-span-5">
            <p className="font-mono text-xs text-white/50 uppercase tracking-widest mb-4">/ 01 — HOW IT WORKS</p>
            <h2 className="font-display text-white" style={{ fontSize: 'clamp(34px, 5vw, 60px)', lineHeight: 0.92 }}>
              3ステップで
              <br />
              <span style={{ color: '#DFFF1F' }}>ちょっと話そう。</span>
            </h2>
            <p className="text-white/70 text-sm md:text-[15px] leading-relaxed mt-5 max-w-sm">
              難しいプロフィール文も、無理なやり取りも、いらない。同じキャンパスにいる、ちょうどいい距離の出会い。
            </p>
            <div className="grid grid-cols-2 gap-4 mt-8 max-w-sm">
              <div className="border-2 border-ink rounded-xl p-4 text-center" style={{ background: '#A8F0D1', boxShadow: '4px 4px 0 #DFFF1F' }}>
                <p className="font-mono text-3xl font-bold text-ink">30s</p>
                <p className="font-mono text-[11px] text-ink/70 mt-1">登録に必要な時間</p>
              </div>
              <div className="border-2 border-ink rounded-xl p-4 text-center" style={{ background: '#DFFF1F', boxShadow: '4px 4px 0 #FF3B6B' }}>
                <p className="font-mono text-3xl font-bold text-ink">0円</p>
                <p className="font-mono text-[11px] text-ink/70 mt-1">すべての基本機能</p>
              </div>
            </div>
          </div>

          {/* 右（3ステップ・互い違い） */}
          <div className="md:col-span-7 space-y-5">
            {[
              { n: '01', t: '学生証で本人確認', d: '数十秒で完了。安心して始められる。', c: '#FF3B6B', tc: '#fff', ml: 'md:ml-0' },
              { n: '02', t: '気になる人を探す', d: '同じキャンパスの誰かを、学部や趣味で見つける。', c: '#A6F0FF', tc: '#0A0A0A', ml: 'md:ml-12' },
              { n: '03', t: 'マッチしたらチャット', d: '重くない短時間チャットからスタート。', c: '#A8F0D1', tc: '#0A0A0A', ml: 'md:ml-24' },
            ].map((s) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5 }}
                className={`bg-white text-ink border-[3px] border-ink rounded-2xl p-5 ${s.ml}`}
                style={{ boxShadow: '6px 6px 0 #DFFF1F' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono text-sm font-bold border-2 border-ink rounded-md px-2 py-0.5"
                    style={{ background: s.c, color: s.tc }}
                  >
                    {s.n}
                  </span>
                  <p className="font-display text-xl">{s.t}</p>
                </div>
                <p className="text-sm text-muted leading-relaxed mt-2">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤ TODAY'S CAMPUS */}
      <section className="relative bg-[#EEF8EE] py-20 md:py-28 overflow-hidden">
        <Patterns />
        {/* 巨大背景テキスト */}
        <span
          className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 font-display text-ink opacity-[0.06] whitespace-nowrap"
          style={{ fontSize: 'clamp(120px, 24vw, 360px)', lineHeight: 1 }}
        >
          Cro-co
        </span>

        <div className="relative px-4 md:px-12 max-w-[1280px] mx-auto">
          <div className="mb-10">
            <p className="font-mono text-xs text-ink/50 uppercase tracking-widest mb-3">/ 02 — TODAY'S CAMPUS</p>
            <h2 className="font-display text-ink" style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 0.92 }}>
              今日キャンパスに
              <br />
              いる、誰か。
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-x-8 md:gap-y-12 max-w-6xl mx-auto">
            {PROFILES.map((p, i) => (
              <ProfileCard key={p.seed} p={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ⑥ TRUST & SAFETY */}
      <section className="relative bg-[#5FBE83] text-white py-20 md:py-28 overflow-hidden">
        <NoiseBG />
        <div className="relative px-4 md:px-12 grid md:grid-cols-12 gap-10 md:gap-12 items-center max-w-[1280px] mx-auto">
          {/* 左 */}
          <div className="md:col-span-6">
            <p className="font-mono text-xs text-white/60 uppercase tracking-widest mb-4">/ 03 — TRUST &amp; SAFETY</p>
            <h2 className="font-display text-white" style={{ fontSize: 'clamp(34px, 5vw, 60px)', lineHeight: 0.92 }}>
              安心のために、
              <br />
              <span
                className="inline-block bg-white text-ink border-2 border-ink px-2 mt-1"
                style={{ transform: 'rotate(-2deg)', boxShadow: '4px 4px 0 #0A0A0A' }}
              >
                妥協しない。
              </span>
            </h2>
            <p className="text-white/85 text-sm md:text-[15px] leading-relaxed mt-6 max-w-md">
              学生証 & 大学メールの二段階審査、身バレ防止フィルター、退会後3日でのPII削除。安心は、具体的に。
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <Sticker color="#DFFF1F" rotate={-4}>
                <ShieldCheck size={13} strokeWidth={3} /> VERIFIED
              </Sticker>
              <Sticker color="#A6F0FF" rotate={3}>PRIVATE</Sticker>
              <Sticker color="#A8F0D1" rotate={-2}>SAFE</Sticker>
              <Sticker color="#FFFFFF" rotate={5}>SECURE</Sticker>
            </div>
          </div>

          {/* 右（安全機能カード） */}
          <div className="md:col-span-6">
            <div
              className="relative bg-white text-ink border-[3px] border-ink rounded-3xl p-6 md:p-7"
              style={{ transform: 'rotate(-1.5deg)', boxShadow: '8px 8px 0 #0A0A0A' }}
            >
              <div className="absolute -top-4 -right-2">
                <Sticker color="#0A0A0A" rotate={6} textColor="#fff">
                  <Star size={11} strokeWidth={3} fill="#DFFF1F" stroke="#DFFF1F" /> TRUST BUILT-IN
                </Sticker>
              </div>
              <p className="font-mono text-xs text-muted uppercase tracking-widest mb-5">/ SAFETY CHECKLIST</p>
              <ul className="space-y-4">
                {SAFETY.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-md border-2 border-ink bg-acid inline-flex items-center justify-center">
                      <Icon size={15} strokeWidth={3} className="text-ink" />
                    </span>
                    <span className="text-sm font-bold leading-snug pt-0.5">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ⑧ FACULTIES IN CRO-CO */}
      <section className="bg-paper py-20 md:py-24">
        <div className="px-4 md:px-12 max-w-[1280px] mx-auto">
          <div
            className="bg-white border-[3px] border-ink rounded-3xl p-7 md:p-10"
            style={{ boxShadow: '8px 8px 0 #0A0A0A' }}
          >
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-5">/ JOINED FROM</p>
            <div className="flex flex-wrap gap-2.5 md:gap-3">
              {FACULTIES.map((f, i) => {
                const palette = ['#DFFF1F', '#A8F0D1', '#A6F0FF', '#FFDCE9', '#FFFFFF']
                return (
                  <span
                    key={f}
                    className="font-mono text-sm font-bold border-2 border-ink rounded-full px-4 py-2"
                    style={{ background: palette[i % palette.length], boxShadow: '3px 3px 0 #0A0A0A' }}
                  >
                    {f}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ⑩ FINAL CTA */}
      <section className="bg-paper px-4 md:px-12 pb-20 md:pb-28">
        <div
          className="relative overflow-hidden bg-acid border-[3px] border-ink rounded-[32px] px-6 md:px-12 py-12 md:py-16 max-w-[1280px] mx-auto"
          style={{ boxShadow: '14px 14px 0 #0A0A0A' }}
        >
          {/* 装飾 */}
          <div className="hidden md:block absolute -top-8 -left-8 w-32 h-32 rounded-full bg-hot border-[3px] border-ink" aria-hidden />
          <div
            className="hidden md:block absolute -bottom-10 -right-6 w-36 h-36 bg-[#A6F0FF] border-[3px] border-ink"
            style={{ transform: 'rotate(12deg)' }}
            aria-hidden
          />

          <div className="relative grid md:grid-cols-12 gap-10 items-center">
            {/* 左テキスト */}
            <div className="md:col-span-7">
              <h2 className="font-display text-ink" style={{ fontSize: 'clamp(40px, 6vw, 84px)', lineHeight: 0.86 }}>
                さあ、
                <br />
                <span
                  className="inline-block bg-white border-2 border-ink px-3 mt-2"
                  style={{ transform: 'rotate(-2deg)', boxShadow: '5px 5px 0 #0A0A0A' }}
                >
                  はじめよ。
                </span>
              </h2>
              <p className="text-ink/80 text-sm md:text-[15px] leading-relaxed mt-6 max-w-md">
                登録は阪大メールアドレスだけ。30秒で、同じキャンパスのどこかの誰かと繋がる。
              </p>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="inline-flex items-center gap-2 h-14 px-8 mt-8 bg-ink text-white border-[3px] border-ink font-bold text-base rounded-xl shadow-[7px_7px_0_#FF3B6B] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#FF3B6B] transition-all"
              >
                いますぐ始める <ArrowUpRight size={20} strokeWidth={3} />
              </button>
            </div>

            {/* 右スマホモック（PC のみ） */}
            <div className="hidden md:flex md:col-span-5 justify-center">
              <div className="relative">
                <div
                  className="w-60 bg-white border-[3px] border-ink rounded-[28px] p-4"
                  style={{ transform: 'rotate(3deg)', boxShadow: '8px 8px 0 #0A0A0A' }}
                >
                  <p className="font-mono text-[10px] text-muted uppercase tracking-widest">TODAY</p>
                  <p className="font-display text-xl text-ink mt-1 mb-3">3件の新しいマッチ</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['cta-1', 'cta-2', 'cta-3'].map((s, i) => (
                      <div
                        key={s}
                        className="aspect-square rounded-xl border-2 border-ink overflow-hidden"
                        style={{ background: ['#FFDCE9', '#A8F0D1', '#A6F0FF'][i] }}
                      >
                        <Avatar seed={s} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-acid border-2 border-ink rounded-xl px-3 py-2 inline-flex items-center gap-2">
                    <Heart size={13} strokeWidth={3} className="text-hot" fill="#FF3B6B" />
                    <span className="text-xs font-bold text-ink">MIO さんにいいねされました</span>
                  </div>
                </div>
                {/* 周囲ステッカー */}
                <div className="absolute -top-4 -left-6">
                  <Sticker color="#FF3B6B" rotate={-10} textColor="#fff">NEW MATCH!</Sticker>
                </div>
                <div className="absolute -bottom-4 -right-4">
                  <Sticker color="#0A0A0A" rotate={8} textColor="#fff">
                    <Heart size={11} strokeWidth={3} fill="#FF3B6B" stroke="#FF3B6B" /> +3
                  </Sticker>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ⑪ FOOTER */}
      <footer className="bg-ink text-white border-t-[3px] border-ink">
        <div className="px-4 md:px-12 py-12 max-w-[1280px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <span className="font-display text-white leading-none" style={{ fontSize: 'clamp(48px, 9vw, 64px)' }}>
              Cro-co.
            </span>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Link to="/terms" className="font-mono text-xs text-white/70 hover:text-white uppercase tracking-wide">
                利用規約
              </Link>
              <Link to="/privacy" className="font-mono text-xs text-white/70 hover:text-white uppercase tracking-wide">
                プライバシーポリシー
              </Link>
              <a href="mailto:support@crocoweb.jp" className="font-mono text-xs text-white/70 hover:text-white uppercase tracking-wide">
                お問い合わせ
              </a>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/20 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="font-mono text-[11px] text-white/40">© 2026 Cro-co / 阪大学部生のためのマッチング</p>
            <p className="font-mono text-[11px] text-white/40">「ちょっと話そう」が、青春のはじまり。</p>
          </div>
          <p className="mt-3 font-mono text-[11px] text-white/60">18歳未満は利用できません。</p>
        </div>
      </footer>
    </div>
  )
}
