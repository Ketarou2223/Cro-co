// 解説: このファイルは未ログインユーザー向けのランディングページを定義する。
// 解説: GSAP + ScrollTrigger = スクロール連動アニメーション（水平スクロール・フェードイン・ヘッダー色変化）
// 解説: LandingPage（外側）= ログイン済みなら /home にリダイレクト。未ログインなら LandingPageInner を表示する
// 解説: LandingPageInner = LP 本体（refs を prop で受け取る設計は hooks を条件分岐内で使えない React の制約回避）
// 解説: HITOKOTO = 「今日のひとこと」にタイピングアニメーションで表示するテキスト配列（LP 専用トーン）
// 解説: ヒーローのワニ = タップで画面（ヒーロー内のみ）を暗転させ、目から黄色いビームを出して
// 解説:                 文字化け中の地の文を解読し、「イケてる」をタイプ表示するギミック。
// 解説: 画像は public/ 配置。/croco.png（二足ワニ透過）, /butterflies.png（蝶2匹透過）を参照する。
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useAuth } from '@/contexts/AuthContext'

gsap.registerPlugin(ScrollTrigger)

// public/ 配置の画像（ファイル名は配置に合わせて変更可）
const CROC_SRC = '/croco.png'
const BFLY_SRC = '/butterflies.png'

// 解説: ワニ画像内の「目」の位置（画像左上を 0,0 とした比率）。ビームの起点に使う。
const EYE_X = 0.478
const EYE_Y = 0.22

// 解説: ヒーローの地の文（旧カード4枚を地の文化）。文字化け中はこの本文をスクランブル表示する。
const HERO_LINES = [
  '授業の合間に、同じキャンパスの誰かと「ちょっと話そう」。',
  '阪大生限定。大学メール認証あり。',
  'いまβ版。ときどき、つまずきます。',
  '18歳未満は利用できません。',
]
// 文字化けに使う文字プール
const SCRAMBLE_POOL = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ▓▒░█◆◇#%@¥§*<>/=+'.split('')

// @copy CRO-hitokoto-landing-array Lv3-4 一括保留: LP 専用タメ口リスト・意図的毒・オーナー承認待ち
const HITOKOTO = [
  '眠い。永遠に。',
  'カフェ、おごられたい。',
  '単位が、ない。',
  '誰か、たこ焼き行こ。',
  'レポートから逃げてる。',
  '朝起きれたら天才。',
  '一限は都市伝説。',
  '図書館で寝るプロ。',
  '傘、また大学に忘れた。',
  'バイト代が消えた。なぜ。',
  '再履バスで会いましょう。',
  '豊中と吹田は遠距離です。',
  '箕面は…どこ？',
  '待ち合わせは銀杏並木で。',
  '過去問は文化遺産。',
  '教務課に怯えて生きてる。',
  '5限の存在を許してない。',
  '第二外国語とは他人です。',
  '必修と相性が悪い。',
  'GPAは聞かないで。',
  '自販機の前で3分悩む。',
  '推しが尊くて学業が無理。',
  'ラーメンに救われてる。',
  '草むしりサークル設立希望。',
  '人生のシラバスがほしい。',
  '寝坊は才能だと思ってる。',
  '口癖は「それな」。',
  '春から本気出す（4回目）。',
  '実験レポは愛より重い。',
  '出席だけが取り柄。',
  '既読つけない主義。ごめん。',
  '返信は早い。授業中なら。',
  '課題と私、どっちが大事？',
  '恋人いない歴、浪人込み。',
  '夢は内定、現実は二度寝。',
  '運命、休講情報より来ない。',
  '顔より時間割で選んで。',
  '親には言えない時間割。',
  '留年はしてない。まだ。',
  '卒業、できる気がしない。',
  'モチベは死んだ。香典募集。',
  '単位の供養、承ります。',
  'メンタルは追試対応で。',
  '将来の夢は、現実逃避。',
  '計画性は前世に忘れた。',
  '借りた過去問で延命中。',
  '人間関係も再履修したい。',
  '深夜テンションで登録した。',
  'ここにいる時点でお互い様。',
  '普通の人には、勧めてない。',
]

export default function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailValid, setEmailValid] = useState(false)
  const [, setProgressText] = useState('AWAKE')

  const lpRootRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
  const scrollProgressRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const featuresRef = useRef<HTMLElement>(null)
  const registerRef = useRef<HTMLElement>(null)
  const submitBtnContainerRef = useRef<HTMLDivElement>(null)
  const hitokotoRef = useRef<HTMLSpanElement>(null)

  // 新ヒーロー用 refs
  const heroRef = useRef<HTMLElement>(null)
  const crocRef = useRef<HTMLImageElement>(null)
  const beamSvgRef = useRef<SVGSVGElement>(null)
  const beamPolyRef = useRef<SVGPolygonElement>(null)
  const kwRef = useRef<HTMLSpanElement>(null)
  const litRef = useRef(false)

  if (user) return <Navigate to="/home" replace />

  return <LandingPageInner
    email={email} setEmail={setEmail}
    emailValid={emailValid} setEmailValid={setEmailValid}
    setProgressText={setProgressText}
    navigate={navigate}
    refs={{ lpRootRef, cursorRef, loaderRef, scrollProgressRef, headerRef, featuresRef, registerRef, submitBtnContainerRef, hitokotoRef, heroRef, crocRef, beamSvgRef, beamPolyRef, kwRef, litRef }}
  />
}

function LandingPageInner({
  email, setEmail, emailValid, setEmailValid, setProgressText, navigate, refs,
}: {
  email: string
  setEmail: (v: string) => void
  emailValid: boolean
  setEmailValid: (v: boolean) => void
  setProgressText: (v: string) => void
  navigate: ReturnType<typeof useNavigate>
  refs: {
    lpRootRef: React.RefObject<HTMLDivElement | null>
    cursorRef: React.RefObject<HTMLDivElement | null>
    loaderRef: React.RefObject<HTMLDivElement | null>
    scrollProgressRef: React.RefObject<HTMLDivElement | null>
    headerRef: React.RefObject<HTMLElement | null>
    featuresRef: React.RefObject<HTMLElement | null>
    registerRef: React.RefObject<HTMLElement | null>
    submitBtnContainerRef: React.RefObject<HTMLDivElement | null>
    hitokotoRef: React.RefObject<HTMLSpanElement | null>
    heroRef: React.RefObject<HTMLElement | null>
    crocRef: React.RefObject<HTMLImageElement | null>
    beamSvgRef: React.RefObject<SVGSVGElement | null>
    beamPolyRef: React.RefObject<SVGPolygonElement | null>
    kwRef: React.RefObject<HTMLSpanElement | null>
    litRef: React.MutableRefObject<boolean>
  }
}) {
  const { lpRootRef, cursorRef, loaderRef, scrollProgressRef, headerRef, featuresRef, registerRef, submitBtnContainerRef, hitokotoRef, heroRef, crocRef, beamSvgRef, beamPolyRef, kwRef, litRef } = refs

  /* body class: cursor:none LP スコープ */
  useEffect(() => {
    document.body.classList.add('lp-active')
    return () => { document.body.classList.remove('lp-active') }
  }, [])

  /* submit button reveal / shake when emailValid changes */
  useEffect(() => {
    const btn = submitBtnContainerRef.current
    if (!btn) return
    if (emailValid) {
      btn.classList.remove('lp-hidden')
      gsap.fromTo(btn, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 })
      const inner = btn.querySelector('button')
      if (inner) gsap.to(inner, { x: -5, yoyo: true, repeat: 9, duration: 0.06, ease: 'power1.inOut', onComplete: () => gsap.set(inner, { x: 0 }) })
    } else {
      gsap.to(btn, { opacity: 0, y: 10, duration: 0.2, onComplete: () => btn.classList.add('lp-hidden') })
    }
  }, [emailValid])

  /* 全 GSAP / インタラクション処理 */
  useEffect(() => {
    let audioCtx: AudioContext | null = null
    const getAudio = () => {
      if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      return audioCtx
    }
    const playBeep = (freq = 440, type: OscillatorType = 'sine', dur = 0.1) => {
      try {
        const ac = getAudio()
        if (ac.state === 'suspended') ac.resume()
        const osc = ac.createOscillator(); const gain = ac.createGain()
        osc.type = type; osc.frequency.value = freq
        osc.connect(gain); gain.connect(ac.destination)
        osc.start()
        gain.gain.exponentialRampToValueAtTime(0.00001, ac.currentTime + dur)
        osc.stop(ac.currentTime + dur)
      } catch { /* blocked before user gesture */ }
    }

    const prevScrollBehavior = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'smooth'

    /* カスタムカーソル */
    const isPointerFine = window.matchMedia('(pointer: fine)').matches
    const cursor = cursorRef.current
    const moveFns: Array<() => void> = []
    if (cursor && isPointerFine) {
      const onMove = (e: MouseEvent) => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px' }
      document.addEventListener('mousemove', onMove)
      moveFns.push(() => document.removeEventListener('mousemove', onMove))
      document.querySelectorAll('.lp-interactive, a, button, input, details').forEach(el => {
        const enter = () => cursor.classList.add('lp-cursor-hovered')
        const leave = () => cursor.classList.remove('lp-cursor-hovered')
        el.addEventListener('mouseenter', enter); el.addEventListener('mouseleave', leave)
        moveFns.push(() => { el.removeEventListener('mouseenter', enter); el.removeEventListener('mouseleave', leave) })
      })
    }

    /* ビープ音: ホバー/クリック */
    const beepCleanups: Array<() => void> = []
    document.querySelectorAll('a, button').forEach(el => {
      const e1 = () => playBeep(880, 'sine', 0.05)
      const e2 = () => playBeep(220, 'square', 0.15)
      el.addEventListener('mouseenter', e1); el.addEventListener('click', e2)
      beepCleanups.push(() => { el.removeEventListener('mouseenter', e1); el.removeEventListener('click', e2) })
    })

    /* スクロール進捗バー */
    const updProgress = () => {
      const sp = scrollProgressRef.current; if (!sp) return
      const max = document.documentElement.scrollHeight - window.innerHeight
      sp.style.width = (max > 0 ? (window.scrollY / max * 100) : 0) + '%'
    }
    window.addEventListener('scroll', updProgress, { passive: true })
    window.addEventListener('resize', updProgress)
    updProgress()

    /* ===== ヒーロー: 文字化け（地の文スクランブル） ===== */
    const rnd = () => SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)]
    const gEls = Array.from(document.querySelectorAll<HTMLElement>('.lp-hero .lp-g'))
    let scrambleTimer: ReturnType<typeof setInterval> | null = null
    const scramble = () => {
      gEls.forEach(el => {
        const real = el.dataset.text ?? ''
        let s = ''
        for (const ch of real) s += (ch === ' ' || ch === '　') ? ch : rnd()
        el.textContent = s
      })
    }
    const startScramble = () => { scramble(); scrambleTimer = setInterval(scramble, 80) }
    const stopScramble = () => { if (scrambleTimer) clearInterval(scrambleTimer); gEls.forEach(el => { el.textContent = el.dataset.text ?? '' }) }
    startScramble()

    /* ===== ヒーロー: 「イケてる」タイプ / backspace ===== */
    const kw = kwRef.current
    const KW_TEXT = 'イケてる'
    let kwTimer: ReturnType<typeof setInterval> | null = null
    const typeKW = () => {
      if (!kw) return
      if (kwTimer) clearInterval(kwTimer)
      let i = 0
      kwTimer = setInterval(() => { i++; kw.textContent = KW_TEXT.slice(0, i); if (i >= KW_TEXT.length && kwTimer) clearInterval(kwTimer) }, 55)
    }
    const backspaceKW = () => {
      if (!kw) return
      if (kwTimer) clearInterval(kwTimer)
      let i = kw.textContent?.length ?? 0
      kwTimer = setInterval(() => { i--; kw.textContent = KW_TEXT.slice(0, Math.max(0, i)); if (i <= 0 && kwTimer) clearInterval(kwTimer) }, 38)
    }

    /* ===== ヒーロー: ビーム =====
       目の位置・中心軸(TILT)は固定。扇の「半角(HALF)」だけを、文字(見出し+本文)の
       実測範囲を必ず覆う最小角＋マージンで端末ごとに算出する。 */
    const TILT = -18 * Math.PI / 180          // 中心軸の傾き（固定）
    const HALF_MIN = 22 * Math.PI / 180       // 下限（狭文字でも扇が細すぎない）
    const HALF_MAX = 80 * Math.PI / 180       // 上限（安全弁）
    const MARGIN = 6 * Math.PI / 180          // 文字端の外側マージン
    const positionBeam = () => {
      const hero = heroRef.current; const croc = crocRef.current
      const svg = beamSvgRef.current; const poly = beamPolyRef.current
      if (!hero || !croc || !svg || !poly) return
      const hr = hero.getBoundingClientRect(); const cr = croc.getBoundingClientRect()
      const W = hero.clientWidth, H = hero.clientHeight
      const ex = (cr.left - hr.left) + cr.width * EYE_X
      const ey = (cr.top - hr.top) + cr.height * EYE_Y
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
      const c = -Math.PI / 2 + TILT            // 扇の中心軸（上向き -90°＋傾き）

      // 覆うべき文字要素（見出し＋本文）の四隅を集める
      const corners: Array<[number, number]> = []
      hero.querySelectorAll('h1, .lp-hero-prose').forEach(el => {
        const r = el.getBoundingClientRect()
        const x0 = r.left - hr.left, x1 = r.right - hr.left
        const y0 = r.top - hr.top,  y1 = r.bottom - hr.top
        corners.push([x0, y0], [x1, y0], [x0, y1], [x1, y1])
      })

      // 各隅への角度と中心軸との差(絶対値)の最大 = 必要な半角
      let need = HALF_MIN
      for (const [px, py] of corners) {
        let d = Math.atan2(py - ey, px - ex) - c
        while (d > Math.PI) d -= 2 * Math.PI
        while (d < -Math.PI) d += 2 * Math.PI
        if (Math.abs(d) > need) need = Math.abs(d)
      }
      const HALF = Math.min(HALF_MAX, need + MARGIN)

      const len = Math.hypot(W, H) * 3
      const a1 = c - HALF, a2 = c + HALF
      poly.setAttribute('points', `${ex},${ey} ${ex + Math.cos(a1) * len},${ey + Math.sin(a1) * len} ${ex + Math.cos(a2) * len},${ey + Math.sin(a2) * len}`)
    }

    /* ===== ヒーロー: ワニタップで点灯トグル ===== */
    const toggleLit = () => {
      const hero = heroRef.current; if (!hero) return
      const on = !litRef.current
      litRef.current = on
      if (on) { positionBeam(); hero.classList.add('is-lit'); stopScramble(); typeKW() }
      else { hero.classList.remove('is-lit'); startScramble(); backspaceKW() }
      try { playBeep(on ? 150 : 520, 'square', 0.12) } catch { /* noop */ }
    }
    const croc = crocRef.current
    const onCrocClick = (e: MouseEvent) => { e.stopPropagation(); if (croc) gsap.fromTo(croc, { scale: 0.96 }, { scale: 1, duration: 0.26, ease: 'back.out(3)' }); toggleLit() }
    croc?.addEventListener('click', onCrocClick)
    const onBeamResize = () => { if (litRef.current) positionBeam() }
    window.addEventListener('resize', onBeamResize)

    /* 今日のひとこと: タイピング */
    let li = 0, ci = 0, del = false
    let typeTimer: ReturnType<typeof setTimeout> | null = null
    const tick = () => {
      const el = hitokotoRef.current; if (!el) return
      const s = HITOKOTO[li]
      if (!del) {
        ci++; el.textContent = s.slice(0, ci)
        if (ci >= s.length) { del = true; typeTimer = setTimeout(tick, 1800); return }
        typeTimer = setTimeout(tick, 110)
      } else {
        ci--; el.textContent = s.slice(0, ci)
        if (ci <= 0) { del = false; li = (li + 1) % HITOKOTO.length }
        typeTimer = setTimeout(tick, 40)
      }
    }
    tick()

    /* GSAP ScrollTrigger & animations */
    let inited = false
    const initAnims = () => {
      if (inited) return
      inited = true
      /* Header color when features in view */
      ScrollTrigger.create({
        trigger: featuresRef.current,
        start: 'top top',
        onEnter: () => gsap.to(headerRef.current, { backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'white', color: 'white', duration: 0.3 }),
        onLeaveBack: () => gsap.to(headerRef.current, { backgroundColor: 'rgba(255,255,255,0.8)', borderColor: 'black', color: 'black', duration: 0.3 }),
      })
      /* 全画面テーマトグル: hero明 → features暗 → How明 → register暗 */
      const setTheme = (dark: boolean) => {
        const r = lpRootRef.current; if (!r) return
        r.style.setProperty('--lp-bg', dark ? '#050505' : '#f4f4f0')
        r.style.setProperty('--lp-text', dark ? '#f4f4f0' : '#0A0A0A')
      }
      ScrollTrigger.create({ trigger: featuresRef.current, start: 'top 65%', onEnter: () => setTheme(true), onLeaveBack: () => setTheme(false) })
      ScrollTrigger.create({ trigger: '#how', start: 'top 65%', onEnter: () => setTheme(false), onLeaveBack: () => setTheme(true) })
      ScrollTrigger.create({ trigger: registerRef.current, start: 'top 65%', onEnter: () => setTheme(true), onLeaveBack: () => setTheme(false) })
      ScrollTrigger.create({ trigger: 'footer', start: 'top 65%', onEnter: () => setTheme(true), onEnterBack: () => setTheme(true) })
      /* Step items */
      gsap.utils.toArray<HTMLElement>('.lp-step-item').forEach(step => {
        gsap.from(step, { scrollTrigger: { trigger: step, start: 'top 80%' }, y: 100, opacity: 0, duration: 1, ease: 'power3.out' })
      })
    }

    /* loader → initAnims（1.5秒見せてから捌ける） */
    let loaderTimer: ReturnType<typeof setTimeout> | null = null
    const runLoader = () => {
      loaderTimer = setTimeout(() => {
        gsap.to(loaderRef.current, { yPercent: -100, duration: 0.8, ease: 'power4.inOut', onComplete: initAnims })
      }, 1500)
    }
    if (document.readyState === 'complete') runLoader()
    else window.addEventListener('load', runLoader, { once: true })

    return () => {
      window.removeEventListener('load', runLoader)
      if (loaderTimer) clearTimeout(loaderTimer)
      ScrollTrigger.getAll().forEach(t => t.kill())
      if (typeTimer) clearTimeout(typeTimer)
      if (scrambleTimer) clearInterval(scrambleTimer)
      if (kwTimer) clearInterval(kwTimer)
      moveFns.forEach(f => f())
      beepCleanups.forEach(f => f())
      croc?.removeEventListener('click', onCrocClick)
      window.removeEventListener('resize', onBeamResize)
      window.removeEventListener('scroll', updProgress)
      window.removeEventListener('resize', updProgress)
      document.documentElement.style.scrollBehavior = prevScrollBehavior
      audioCtx?.close().catch(() => {})
    }
  }, [])

  const handleEmailChange = (val: string) => {
    setEmail(val)
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
    setEmailValid(valid)
    if (val.length === 0) setProgressText('AWAKE')
    else if (valid) setProgressText('READY.')
    else setProgressText('ANALYZING...')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailValid) return
    gsap.to('body', {
      x: 10, y: 10, yoyo: true, repeat: 5, duration: 0.05,
      onComplete: () => { gsap.set('body', { x: 0, y: 0 }); navigate('/signup', { state: { email } }) },
    })
  }

  return (
    <>
      <style>{`
        /* 1:2 中央カラム（レターボックス）: 縦長端末は横幅いっぱい、横長は中央に縦長カラム */
        body{background:#050505}
        .lp-root{--lp-bg:#f4f4f0;--lp-text:#0A0A0A;--color-brand:#3DDC97;width:min(100vw,50dvh);margin-inline:auto;container-type:inline-size;font-family:'Noto Sans JP',sans-serif;background-color:var(--lp-bg);color:var(--lp-text);transition:background-color .5s ease,color .5s ease;overflow-x:hidden;padding-bottom:0;-webkit-font-smoothing:antialiased;box-shadow:0 0 80px rgba(0,0,0,.4)}
        .lp-root ::selection{background:#FF3B6B;color:white}
        .lp-cinzel{font-family:'Cinzel',serif;font-weight:700}
        .lp-mono{font-family:'Space Mono',monospace}
        .lp-brutal{border:4px solid var(--lp-text);box-shadow:8px 8px 0 var(--lp-text);border-radius:0}
        .lp-glitch:hover{animation:lp-glitch .3s cubic-bezier(.25,.46,.45,.94) both infinite;color:#FF3B6B}
        @keyframes lp-glitch{0%{transform:skew(0deg)}20%{transform:skew(-20deg)}40%{transform:skew(20deg)}60%{transform:skew(-10deg)}80%{transform:skew(10deg)}100%{transform:skew(0deg)}}
        .lp-marquee-inner{display:inline-block;animation:lp-mq 15s linear infinite;font-family:'Space Mono',monospace;font-weight:bold;font-size:1.5rem;white-space:nowrap}
        @keyframes lp-mq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .lp-noise-overlay{position:fixed;top:0;left:50%;transform:translateX(-50%);width:min(100vw,50dvh);height:100vh;pointer-events:none;z-index:9999;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
        #lp-scroll-progress{position:fixed;top:0;left:0;height:6px;width:0;background:#FF3B6B;border-bottom:3px solid var(--lp-text);z-index:60}
        #lp-custom-cursor{position:fixed;top:0;left:0;width:20px;height:20px;background:#FF3B6B;border-radius:50%;pointer-events:none;z-index:10000;mix-blend-mode:difference;transition:transform .1s ease;transform:translate(-50%,-50%)}
        #lp-custom-cursor.lp-cursor-hovered{transform:translate(-50%,-50%) scale(3);background:transparent;border:2px solid white}
        #lp-loader{position:fixed;top:0;left:50%;transform:translateX(-50%);width:min(100vw,50dvh);height:100vh;background:var(--lp-text);color:var(--lp-bg);display:flex;justify-content:center;align-items:center;z-index:10001;font-size:clamp(.9rem,4.4vw,3rem);font-weight:800;white-space:nowrap;text-align:center}

        /* ===== ヒーロー（ワニライト） ===== */
        .lp-hero{position:relative;min-height:100dvh;padding:108px clamp(22px,5cqw,60px) 0;display:flex;flex-direction:column;overflow:hidden;background:var(--lp-bg);transition:background-color .45s ease}
        .lp-hero.is-lit{background:#080808}
        .lp-hero h1{font-weight:900;letter-spacing:-.03em;line-height:.92;font-size:clamp(34px,16cqw,150px);position:relative;z-index:40;transition:color .45s}
        .lp-hero.is-lit h1{color:#f4f4f0}
        .lp-kwwrap{display:inline-flex;align-items:baseline;white-space:nowrap}
        .lp-kw{color:var(--color-brand);white-space:nowrap}
        .lp-hero.is-lit .lp-kw{text-shadow:0 0 12px rgba(61,220,151,.9),0 0 38px rgba(61,220,151,.55)}
        .lp-caret{display:inline-block;width:.07em;height:.9em;margin-left:.06em;background:currentColor;color:rgba(10,10,10,.55);transform:translateY(.02em);animation:lp-caret 1.05s steps(1) infinite}
        .lp-hero.is-lit .lp-caret{color:var(--color-brand);box-shadow:0 0 8px rgba(61,220,151,.8)}
        @keyframes lp-caret{0%,49%{opacity:1}50%,100%{opacity:0}}
        .lp-hero-prose{margin-top:clamp(20px,3.5vh,32px);max-width:34ch;position:relative;z-index:40}
        .lp-hero-prose p{font-size:clamp(14px,4cqw,18px);line-height:1.85;color:rgba(10,10,10,.5);transition:color .45s}
        .lp-hero-prose .lp-g{font-family:'Space Mono',monospace;letter-spacing:.02em}
        .lp-hero:not(.is-lit) .lp-g{animation:lp-blink 1.1s steps(2,end) infinite;color:rgba(10,10,10,.42)}
        .lp-hero.is-lit .lp-hero-prose p{color:rgba(244,244,240,.62)}
        .lp-hero.is-lit .lp-g{color:#f4f4f0;font-family:'Noto Sans JP',sans-serif;letter-spacing:0}
        @keyframes lp-blink{0%,100%{opacity:.35}50%{opacity:.9}}
        /* はじめる：床ライン固定・点灯で消失 */
        .lp-hero-start{position:absolute;left:clamp(22px,5cqw,60px);bottom:clamp(120px,28cqw,200px);z-index:40;font-family:'Space Mono',monospace;font-weight:700;font-size:clamp(14px,4cqw,18px);letter-spacing:.04em;padding:.85rem 1.7rem;border-radius:50px;border:2.5px solid var(--lp-text);background:var(--lp-text);color:var(--lp-bg);text-decoration:none;display:inline-flex;align-items:center;gap:.5rem;transition:transform .15s,color .4s,background-color .4s,border-color .4s}
        .lp-hero-start:active{transform:scale(.97)}
        .lp-hero.is-lit .lp-hero-start{background:transparent;color:transparent;border-color:transparent}
        /* 蝶：本文の下・はじめるの上に固定。暗転で燐光 */
        .lp-hero-bfly{position:absolute;left:clamp(20px,5cqw,58px);bottom:clamp(196px,44cqw,290px);width:clamp(92px,26cqw,150px);z-index:37;image-rendering:pixelated;user-select:none;pointer-events:none;transition:filter .45s ease}
        .lp-hero.is-lit .lp-hero-bfly{filter:drop-shadow(0 0 10px rgba(157,255,200,.75)) drop-shadow(0 0 26px rgba(61,220,151,.45)) brightness(1.15)}
        /* ワニ：右下・タップ可。暗転で黄燐光 */
        .lp-hero-croc{position:absolute;right:-4%;bottom:clamp(120px,28cqw,200px);width:clamp(180px,58cqw,330px);cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;image-rendering:pixelated;z-index:30;filter:drop-shadow(0 6px 0 rgba(10,10,10,.12));transition:transform .25s ease,filter .45s ease}
        .lp-hero-croc:active{transform:scale(.97)}
        .lp-hero.is-lit .lp-hero-croc{filter:drop-shadow(0 0 16px rgba(255,229,59,.55)) drop-shadow(0 0 40px rgba(255,229,59,.30)) brightness(1.12)}
        .lp-hero-hint{position:absolute;right:8%;bottom:clamp(126px,29cqw,206px);font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.1em;color:rgba(10,10,10,.4);z-index:31;animation:lp-blink 1.6s steps(2,end) infinite}
        .lp-hero.is-lit .lp-hero-hint{display:none}
        /* 暗幕（ヒーロー内のみ）*/
        .lp-hero-blackout{position:absolute;inset:0;background:#050505;opacity:0;pointer-events:none;z-index:20;transition:opacity .45s ease}
        .lp-hero.is-lit .lp-hero-blackout{opacity:.92}
        /* ビーム（ワニの前・文字の後ろ）*/
        .lp-hero-beam{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:35;opacity:0;transition:opacity .5s ease}
        .lp-hero.is-lit .lp-hero-beam{opacity:1}
        .lp-hero-beam polygon{fill:url(#lp-beam-grad)}

        /* ===== 下半分（現行踏襲）===== */
        .lp-email-input{background:transparent;border:0;border-bottom:4px solid currentColor;color:inherit;transition:border-color .3s}
        .lp-email-input:focus{border-color:#A6F0FF}
        .lp-submit-btn{background:#FF3B6B;color:white;transition:all .15s ease}
        .lp-submit-btn:hover{background:black;color:white}
        .lp-hover-a1:hover{color:#FF3B6B}
        .lp-hover-a2:hover{color:#A6F0FF}
        .lp-hover-a3:hover{color:var(--color-brand)}
        .lp-typing-dot{animation:lp-td 1.2s steps(1) infinite}
        @keyframes lp-td{0%,60%,100%{opacity:.15}30%{opacity:1}}
        #lp-hitokoto-caret{animation:lp-caret2 1s steps(1) infinite}
        @keyframes lp-caret2{0%,49%{opacity:1}50%,100%{opacity:0}}
        #lp-px-heart{transform-origin:center;animation:lp-beat 1.8s steps(2) infinite}
        @keyframes lp-beat{0%,70%,100%{transform:scale(1)}76%{transform:scale(1.08)}84%{transform:scale(1)}90%{transform:scale(1.05)}}
        #lp-swipe-card{animation:lp-discard 3s ease-in-out infinite}
        @keyframes lp-discard{0%,30%{transform:translate(0,0) rotate(0deg);opacity:1}62%{transform:translate(150px,-36px) rotate(18deg);opacity:0}63%,82%{transform:translate(0,0) rotate(0deg);opacity:0}100%{transform:translate(0,0) rotate(0deg);opacity:1}}
        .lp-path-line{position:absolute;top:0;left:50%;width:4px;height:100%;background:var(--lp-text);transform:translateX(-50%);z-index:-1}
        details.lp-details summary{list-style:none;position:relative;padding-right:2.2rem;cursor:pointer}
        details.lp-details summary::-webkit-details-marker{display:none}
        details.lp-details summary::after{content:"+";position:absolute;right:.3rem;top:0;font-weight:700;transition:transform .2s ease}
        details.lp-details[open] summary::after{transform:rotate(45deg);color:var(--color-brand)}
        details.lp-details:hover summary{color:var(--color-brand)}
        .lp-retro-marquee{background:black;color:#0f0;font-family:monospace;padding:5px;text-transform:uppercase;letter-spacing:2px;width:256px}
        .lp-hidden{display:none!important}
        .lp-horizontal-panel{width:100%;height:auto;display:flex;flex-direction:column;justify-content:center;padding:7cqw}
        @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
        @media (hover:none),(pointer:coarse){#lp-custom-cursor{display:none!important}}
        @media (min-width:0px){
          .lp-step-item{flex-direction:column!important}
          .lp-panel-num{position:static!important;display:block;width:100%;font-size:13cqw!important;opacity:.9!important;color:var(--color-brand)!important;line-height:.9;margin-bottom:.04em}
          .lp-num-r{text-align:right}
          .lp-num-l{text-align:left}
          .lp-num-c{text-align:center}
          .lp-root header{width:94%;padding-left:1rem;padding-right:1rem}
          .lp-root header .text-2xl{font-size:1.2rem}
          .lp-horizontal-scroll-wrapper{display:block!important;width:100%!important;max-width:100%;height:auto!important;transform:none!important}
          .lp-horizontal-panel{width:100%;height:auto;min-height:auto;padding-top:7vh;padding-bottom:7vh;justify-content:flex-start}
          #lp-swipe-stack{width:110px!important;height:140px!important;right:5%!important;bottom:6%!important;opacity:.85}
          #lp-swipe-card span{font-size:2.2rem}
          .lp-step-neg-mt{margin-top:0!important}
          html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
          .lp-root footer h3{font-size:clamp(1.7rem,8.5cqw,2.25rem);word-break:break-word}
          .lp-step-item{align-items:stretch!important}
          .lp-step-item > div:not(.absolute){width:100%!important;max-width:100%!important}
          .lp-step-item .lp-brutal{width:min(78cqw,270px)!important;margin-left:auto!important;margin-right:auto!important}
          .lp-step-item .bg-black{padding:1rem!important}
          #lp-hitokoto-box{font-size:clamp(.72rem,3.4cqw,.9rem)}
          #lp-hitokoto-box span{white-space:nowrap}
          .lp-root footer .relative.w-full{height:auto!important}
          .lp-root footer .relative.w-full a{position:static!important;display:block;margin:.45rem 0}
        }
      `}</style>

      <div className="lp-root" ref={lpRootRef}>
        {/* Fixed overlays */}
        <div className="lp-noise-overlay" />
        <div id="lp-scroll-progress" ref={scrollProgressRef} />
        <div id="lp-custom-cursor" ref={cursorRef} />

        {/* Loader */}
        {/* @copy CRO-loader-landing-01 Lv2 保留: LP専用毒トーン */}
        <div id="lp-loader" ref={loaderRef}>
          <span className="lp-cinzel italic pr-2">Cro-co</span>
          {' '}// SCANNING CAMPUS...
        </div>

        {/* Header */}
        <header
          ref={headerRef}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-6 py-3"
          style={{ width: 'min(86vw, calc(50dvh - 28px))', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', border: '4px solid black', borderRadius: 50 }}
        >
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="lp-interactive text-2xl font-black tracking-tighter uppercase bg-transparent border-0 cursor-pointer"
          >
            Cro-co.
          </button>
          <nav className="group flex items-center gap-3 relative">
            <Link to="/login" className="lp-mono text-xs font-bold uppercase lp-interactive">Sign In</Link>
            <Link to="/signup" className="lp-mono text-xs font-bold uppercase lp-interactive" style={{ border: '2px solid black', background: 'black', color: 'white', padding: '.5rem 1rem', borderRadius: 50 }}>Sign Up</Link>
          </nav>
        </header>

        <main>
          {/* ===== HERO（ワニライト）===== */}
          <section ref={heroRef} className="lp-hero">
            <div className="lp-hero-blackout" />
            <svg className="lp-hero-beam" ref={beamSvgRef} aria-hidden="true">
              <defs>
                <linearGradient id="lp-beam-grad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" stopColor="rgba(255,229,59,.58)" />
                  <stop offset="1" stopColor="rgba(255,229,59,.06)" />
                </linearGradient>
              </defs>
              <polygon ref={beamPolyRef} />
            </svg>

            <h1>
              阪大生の、<br />
              <span className="lp-kwwrap"><span className="lp-kw" ref={kwRef} /><span className="lp-caret" /></span><br />
              出会い方。
            </h1>

            <div className="lp-hero-prose lp-mono">
              {HERO_LINES.map((t, i) => (
                <p key={i}><span className="lp-g" data-text={t}>{t}</span></p>
              ))}
            </div>

            <img className="lp-hero-bfly" alt="" src={BFLY_SRC} aria-hidden="true" />
            {/* @copy CRO-cta-landing-hero-01 Lv1 */}
            <Link to="/signup" className="lp-hero-start lp-interactive">はじめる →</Link>

            <div className="lp-hero-hint">tap →</div>
            <img className="lp-hero-croc lp-interactive" ref={crocRef} alt="Cro-co" src={CROC_SRC} />
          </section>

          {/* Marquee bar */}
          <div style={{ borderTop: '4px solid #0A0A0A', borderBottom: '4px solid #0A0A0A', background: 'var(--color-brand)', padding: '10px 0', transform: 'rotate(-1.5deg) scale(1.04)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div className="lp-marquee-inner">
              OSAKA UNIV ONLY ✕ TRUST NO FEED ✕ EVERYONE LIES A LITTLE ✕ PROBABLY A BAD IDEA ✕ SOMEONE NEARBY IS BORED ✕ OSAKA UNIV ONLY ✕ TRUST NO FEED ✕ EVERYONE LIES A LITTLE ✕ PROBABLY A BAD IDEA ✕ SOMEONE NEARBY IS BORED ✕{' '}
            </div>
          </div>

          {/* Features — dark / horizontal scroll */}
          <section ref={featuresRef} style={{ color: 'white', position: 'relative', overflow: 'hidden' }}>
            <div className="lp-horizontal-scroll-wrapper">
              {/* Panel 01 */}
              <div className="lp-horizontal-panel relative">
                <div className="lp-panel-num lp-num-r absolute top-10 left-10 lp-mono leading-none font-black" style={{ fontSize: '20cqw', color: 'rgba(255,255,255,0.1)' }}>01</div>
                <div className="z-10 max-w-2xl">
                  <h2 className="text-6xl md:text-8xl font-black mb-6 uppercase lp-glitch">No<br />Swipe.</h2>
                  <p className="lp-mono text-xl md:text-2xl opacity-80" style={{ lineBreak: 'strict', wordBreak: 'keep-all' }}>
                    スワイプは、ない。<span className="whitespace-nowrap">写真を一周して、</span>
                    結局<span className="whitespace-nowrap" style={{ color: 'var(--color-brand)' }}>だれも残らない</span>。
                    <span className="whitespace-nowrap">あれ、もうしなくていい。</span>
                  </p>
                </div>
                <div id="lp-swipe-stack" className="absolute right-[12%] bottom-[22%]" style={{ width: 180, height: 220 }} aria-hidden="true">
                  <div className="absolute inset-0 border-4" style={{ borderColor: 'rgba(255,255,255,0.25)', transform: 'rotate(-6deg)' }} />
                  <div className="absolute inset-0 border-4" style={{ borderColor: 'rgba(255,255,255,0.5)', background: '#050505', transform: 'rotate(3deg)' }} />
                  <div id="lp-swipe-card" className="absolute inset-0 border-4 flex items-center justify-center" style={{ borderColor: '#FF3B6B', background: '#111' }}>
                    <span className="lp-mono font-bold text-6xl" style={{ color: '#FF3B6B' }}>✕</span>
                  </div>
                </div>
              </div>

              {/* Panel 02 */}
              <div className="lp-horizontal-panel relative">
                <div className="lp-panel-num lp-num-l absolute top-10 left-10 lp-mono leading-none font-black" style={{ fontSize: '20cqw', color: 'rgba(255,255,255,0.1)' }}>02</div>
                <div className="z-10 w-full flex justify-end">
                  <div className="max-w-xl text-right">
                    <h2 className="text-6xl md:text-8xl font-black mb-6 uppercase">
                      <span style={{ color: 'transparent', WebkitTextStroke: '2px white' }}>Pure</span><br />Chaos.
                    </h2>
                    <svg id="lp-px-heart" viewBox="0 0 13 11" width="143" height="121" className="ml-auto mb-4" style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }} aria-hidden="true">
                      <g fill="#FF3B6B">
                        <rect x="2" y="0" width="3" height="1" /><rect x="8" y="0" width="3" height="1" />
                        <rect x="1" y="1" width="5" height="2" /><rect x="7" y="1" width="5" height="2" />
                        <rect x="0" y="3" width="13" height="2" /><rect x="1" y="5" width="11" height="1" />
                        <rect x="2" y="6" width="9" height="1" /><rect x="3" y="7" width="7" height="1" />
                        <rect x="4" y="8" width="5" height="1" /><rect x="5" y="9" width="3" height="1" />
                        <rect x="6" y="10" width="1" height="1" />
                      </g>
                      <rect x="9" y="3" width="1" height="1" fill="#050505" />
                    </svg>
                    <p className="lp-mono text-xl md:text-2xl opacity-80" style={{ lineBreak: 'strict', wordBreak: 'keep-all' }}>
                      アルゴリズムが上に出す人が、<span className="whitespace-nowrap">運命とは限らない。</span>
                      本命は、たぶん<span className="whitespace-nowrap" style={{ color: 'var(--color-brand)' }}>下のほう</span>にいる。
                    </p>
                  </div>
                </div>
              </div>

              {/* Panel 03 */}
              <div className="lp-horizontal-panel relative items-center text-center">
                <div className="lp-panel-num lp-num-c absolute top-10 left-10 lp-mono leading-none font-black" style={{ fontSize: '20cqw', color: 'rgba(255,255,255,0.1)' }}>03</div>
                <div className="z-10 w-full max-w-3xl">
                  <h2 className="text-6xl md:text-8xl font-black mb-12 uppercase">Deep<br />Dive.</h2>
                  <div className="text-left space-y-4 lp-mono">
                    <details className="lp-details lp-brutal cursor-pointer p-4" style={{ borderColor: 'white', background: 'black' }}>
                      <summary className="text-xl font-bold uppercase">Q: WHO IS THIS FOR?</summary>
                      <p className="pt-4 opacity-80">A: 早くアプリやめたい人向け。なんでかって？きっとすぐ相手が見つかるから。</p>
                    </details>
                    <details className="lp-details lp-brutal cursor-pointer p-4" style={{ borderColor: 'white', background: 'black' }}>
                      <summary className="text-xl font-bold uppercase">Q: Is it safe?</summary>
                      <p className="pt-4 opacity-80">A: 学生証と大学メール（@ecs.osaka-u.ac.jp）で本人確認してる。だから入れるのは阪大生だけ。学外の人はそもそも入れない。<span style={{ color: '#FF3B6B' }}>…もし紛れ込めたら、それはもうスーパーハッカー。</span></p>
                    </details>
                    <details className="lp-details lp-brutal cursor-pointer p-4" style={{ borderColor: 'white', background: 'black' }}>
                      <summary className="text-xl font-bold uppercase">Q: Who's here?</summary>
                      <p className="pt-4 opacity-80">A: 阪大の学部生だけ。11学部、ひとつのキャンパス。それ以外? いない。</p>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          </section>


          {/* How It Works */}
          <section id="how" className="relative pt-14 pb-20 px-4 md:px-12">
            <h2 className="font-black uppercase text-center mb-14 z-10 relative" style={{ fontSize: '8cqw' }}>
              How to <span className="lp-cinzel italic">Ruin</span> your Life
            </h2>
            <div className="relative max-w-5xl mx-auto">
              <div className="lp-path-line hidden md:block" />

              {/* Step 01 */}
              <div className="relative flex flex-col md:flex-row items-center justify-between mb-24 lp-step-item">
                <div className="lp-mono font-black z-0" style={{ fontSize: '13cqw', color: '#0A0A0A', opacity: 0.85, lineHeight: 0.9, textAlign: 'left', width: '100%' }}>01</div>
                <div className="md:w-5/12 z-10 relative">
                  <div className="lp-brutal p-2 relative" style={{ background: 'white', transform: 'rotate(-3deg)' }}>
                    <div className="w-full bg-black flex flex-col items-center justify-center gap-4 p-6 text-center" style={{ aspectRatio: '5/6' }}>
                      <span className="lp-mono text-base md:text-lg" style={{ color: 'var(--color-brand)' }}>今日のひとこと:</span>
                      <div id="lp-hitokoto-box" className="flex items-center justify-center text-lg md:text-2xl overflow-hidden" style={{ height: '3em', width: '100%' }}>
                        <span className="font-black text-white leading-snug block text-center whitespace-nowrap">
                          「<span ref={hitokotoRef} />
                          <span id="lp-hitokoto-caret" className="inline-block align-middle" style={{ width: 4, height: '1em', background: 'var(--color-brand)', marginLeft: 2 }} />」
                        </span>
                      </div>
                      <span className="lp-mono text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>盛らない。今日の気分だけ。</span>
                    </div>
                  </div>
                </div>
                <div className="md:w-5/12 mt-10 md:mt-0 z-10 text-right">
                  <h3 className="text-4xl font-black mb-4 uppercase">Ditch the<br />Bio.</h3>
                  <p className="text-lg lp-mono" style={{ lineBreak: 'strict', wordBreak: 'keep-all' }}>
                    盛ったプロフィールは、どうせ<span className="whitespace-nowrap" style={{ color: '#FF3B6B' }}>三日でバレる</span>。
                    <span className="px-1 font-bold whitespace-nowrap" style={{ background: 'var(--color-brand)', color: 'black' }}>今日のひとこと</span>だけでいい。
                    <span className="whitespace-nowrap">素のあなたが、勝手に出る。</span>
                  </p>
                </div>
              </div>

              {/* Step 02 */}
              <div className="relative flex flex-col md:flex-row-reverse items-center justify-between mb-16 lp-step-item lp-step-neg-mt" style={{ marginTop: '-2rem' }}>
                <div className="lp-mono font-black z-0" style={{ fontSize: '13cqw', color: '#0A0A0A', opacity: 0.85, lineHeight: 0.9, textAlign: 'right', width: '100%' }}>02</div>
                <div className="md:w-6/12 z-10 relative md:-ml-20">
                  <div className="lp-brutal bg-black p-4 lp-mono flex flex-col gap-2" style={{ transform: 'rotate(2deg)' }}>
                    <div className="self-end text-black text-xs md:text-sm px-3 py-2 max-w-[80%]" style={{ background: 'white' }}>はじめまして！</div>
                    <div className="self-end text-black text-xs md:text-sm px-3 py-2 max-w-[80%]" style={{ background: 'white' }}>よかったら今度…</div>
                    <span className="self-end text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>既読 23:59</span>
                    <div className="self-start flex flex-col items-start max-w-[80%]">
                      <div className="px-3 py-2.5 inline-flex gap-1.5 items-center" style={{ background: '#222' }} aria-hidden="true">
                        <span className="lp-typing-dot w-2 h-2 inline-block" style={{ background: 'var(--color-brand)' }} />
                        <span className="lp-typing-dot w-2 h-2 inline-block" style={{ background: 'var(--color-brand)', animationDelay: '.2s' }} />
                        <span className="lp-typing-dot w-2 h-2 inline-block" style={{ background: 'var(--color-brand)', animationDelay: '.4s' }} />
                      </div>
                      <span className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>入力中…（もう40分）</span>
                    </div>
                  </div>
                </div>
                <div className="md:w-4/12 mt-10 md:mt-0 z-10">
                  <h3 className="text-4xl font-black mb-4 uppercase">Wait in the<br />Void.</h3>
                  <p className="text-lg lp-mono" style={{ lineBreak: 'strict', wordBreak: 'keep-all' }}>
                    <span className="whitespace-nowrap">気になる人に</span>
                    <span className="whitespace-nowrap">いいねを送ったら、</span>
                    <span className="font-bold whitespace-nowrap" style={{ borderBottom: '4px solid #FF3B6B' }}>あとは、待つだけ</span>。
                    <span className="whitespace-nowrap"><span className="font-bold" style={{ color: '#FF3B6B' }}>返信？</span>こないかもね。</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Register */}
          <section
            ref={registerRef}
            id="register"
            className="flex flex-col items-center justify-center px-4 pt-24 pb-28 relative"
            style={{ color: '#f4f4f0' }}
          >
            <div className="w-full max-w-4xl text-center z-10">
              <h2 className="font-black uppercase mb-8 leading-none" style={{ fontSize: '8cqw' }}>
                Dare to<br />Join?
              </h2>
              <form className="space-y-12 text-left max-w-2xl mx-auto" onSubmit={handleSubmit}>
                <div>
                  {/* @copy CRO-label-landing-register-01 Lv3 保留: LP専用タメ口 */}
                  <label className="block lp-mono text-xl mb-4" style={{ opacity: 0.7 }}>&gt; 阪大メール、教えて。(Email)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => handleEmailChange(e.target.value)}
                    className="lp-email-input w-full font-black focus:outline-none pb-2 lp-interactive"
                    style={{ fontSize: 'clamp(15px, 6cqw, 26px)' }}
                    placeholder="you@ecs.osaka-u.ac.jp"
                    required
                    aria-label="阪大メールアドレス"
                  />
                  {email.length > 0 && !emailValid && (
                    <p className="lp-mono text-xs mt-2" style={{ color: '#FF3B6B', opacity: 0.8 }}>
                      有効なメールアドレスを入力してください。ドメイン確認は登録ページで行います。
                    </p>
                  )}
                </div>
                <div ref={submitBtnContainerRef} className="pt-8 lp-hidden">
                  {/* @copy CRO-button-landing-register-01 Lv1 */}
                  <button
                    type="submit"
                    className="w-full lp-brutal lp-submit-btn text-4xl md:text-6xl font-black uppercase py-8 lp-interactive hover:scale-[1.02] active:scale-95 transition-all group relative overflow-hidden"
                  >
                    <span className="relative z-10">Enter Cro-co</span>
                  </button>
                  {/* @copy CRO-label-landing-register-02 Lv3 保留: LP専用毒トーン */}
                  <p className="lp-mono text-xs text-center mt-4" style={{ opacity: 0.5 }}>押した時点で、もう普通じゃない。</p>
                </div>
              </form>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="relative pt-32 pb-10 overflow-hidden" style={{ color: 'white' }}>
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black pointer-events-none select-none whitespace-nowrap"
            style={{ fontSize: '30cqw', color: 'rgba(255,255,255,0.05)' }}
            aria-hidden="true"
          >
            Cro-co.
          </div>
          <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row justify-between items-end">
            <div className="mb-12 md:mb-0">
              <h3 className="text-4xl font-black mb-6 uppercase lp-glitch lp-interactive">End of<br />Transmission.</h3>
              <div className="lp-retro-marquee mb-6">
                <div className="lp-marquee-inner" style={{ fontSize: '0.9rem', animation: 'lp-mq 8s linear infinite' }}>
                  β版、稼働中... β版、稼働中... β版、稼働中... β版、稼働中... β版、稼働中... β版、稼働中... β版、稼働中... β版、稼働中...{' '}
                </div>
              </div>
            </div>
            <div className="relative w-full md:w-1/2 h-40">
              {/* @copy CRO-link-landing-footer-01 Lv0 */}
              <Link to="/terms" className="absolute top-0 right-10 lp-mono underline lp-interactive lp-hover-a3" style={{ color: 'white' }}>利用規約</Link>
              {/* @copy CRO-link-landing-footer-02 Lv0 */}
              <Link to="/privacy" className="absolute bottom-10 left-10 lp-mono underline lp-interactive lp-hover-a1" style={{ color: 'white' }}>プライバシーポリシー</Link>
              {/* @copy CRO-link-landing-footer-03 Lv0 */}
              <a href="mailto:support@crocoweb.jp" className="absolute top-1/2 right-1/3 lp-mono underline lp-interactive lp-hover-a2" style={{ color: 'white' }}>お問い合わせ</a>
            </div>
          </div>
          <div
            className="mt-20 pt-6 px-6 flex flex-col md:flex-row gap-2 md:justify-between lp-mono text-xs"
            style={{ borderTop: '1px solid rgba(255,255,255,0.2)', opacity: 0.5 }}
          >
            {/* @copy CRO-legal-landing-copyright-01 Lv2 保留: LP専用毒トーン */}
            <span>© 2026 Cro-co. All rights destroyed.</span>
            {/* @copy CRO-legal-landing-beta-01 Lv0 */}
            <span>いまβ版。正式リリースは2026年10月。18歳未満は利用できません。</span>
            {/* @copy CRO-label-landing-footer-scroll-01 Lv2 保留: LP専用毒トーン */}
            <span>You scrolled this far. Respect.</span>
          </div>
        </footer>
      </div>
    </>
  )
}
