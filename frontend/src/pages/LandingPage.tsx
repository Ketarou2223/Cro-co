// 解説: このファイルは未ログインユーザー向けのランディングページを定義する。
// 解説: GSAP + ScrollTrigger = スクロール連動アニメーション（水平スクロール・フェードイン・ヘッダー色変化）
// 解説: LandingPage（外側）= ログイン済みなら /home にリダイレクト。未ログインなら LandingPageInner を表示する
// 解説: LandingPageInner = LP 本体（refs を prop で受け取る設計は hooks を条件分岐内で使えない React の制約回避）
// 解説: HITOKOTO = 「今日のひとこと」にタイピングアニメーションで表示するテキスト配列（LP 専用トーン）
// 解説: スタンドライトクリック = 画面を暗転させ「普通じゃない」のキーワードを光らせるギミック
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useAuth } from '@/contexts/AuthContext'

gsap.registerPlugin(ScrollTrigger)

// @copy CRO-hitokoto-landing-array Lv3-4 一括保留: LP 専用タメ口リスト・意図的毒・オーナー承認待ち
/* 元HTML L833-883 の lines をそのまま移植（日常→阪大あるある→ちょいズレ→シニカル→ブラック→メタ） */
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
  const [progressText, setProgressText] = useState('AWAKE')

  const lpRootRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
  const heroCTARef = useRef<HTMLDivElement>(null)
  const lampWrapRef = useRef<HTMLDivElement>(null)
  const bulbRef = useRef<SVGEllipseElement>(null)
  const bulbMRef = useRef<SVGEllipseElement>(null)
  const blackoutRef = useRef<HTMLDivElement>(null)
  const beamSvgRef = useRef<SVGSVGElement>(null)
  const beamPolyRef = useRef<SVGPolygonElement>(null)
  const kwRef = useRef<HTMLSpanElement>(null)
  const hitokotoRef = useRef<HTMLSpanElement>(null)
  const scrollProgressRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const featuresRef = useRef<HTMLElement>(null)
  const horizontalWrapperRef = useRef<HTMLDivElement>(null)
  const registerRef = useRef<HTMLElement>(null)
  const submitBtnContainerRef = useRef<HTMLDivElement>(null)
  const lightsOutRef = useRef(false)

  if (user) return <Navigate to="/home" replace />

  return <LandingPageInner
    email={email} setEmail={setEmail}
    emailValid={emailValid} setEmailValid={setEmailValid}
    progressText={progressText} setProgressText={setProgressText}
    navigate={navigate}
    refs={{ lpRootRef, cursorRef, loaderRef, heroCTARef, lampWrapRef, bulbRef, bulbMRef, blackoutRef, beamSvgRef, beamPolyRef, kwRef, hitokotoRef, scrollProgressRef, headerRef, featuresRef, horizontalWrapperRef, registerRef, submitBtnContainerRef, lightsOutRef }}
  />
}

function LandingPageInner({
  email, setEmail, emailValid, setEmailValid, progressText, setProgressText, navigate, refs,
}: {
  email: string
  setEmail: (v: string) => void
  emailValid: boolean
  setEmailValid: (v: boolean) => void
  progressText: string
  setProgressText: (v: string) => void
  navigate: ReturnType<typeof useNavigate>
  refs: {
    lpRootRef: React.RefObject<HTMLDivElement | null>
    cursorRef: React.RefObject<HTMLDivElement | null>
    loaderRef: React.RefObject<HTMLDivElement | null>
    heroCTARef: React.RefObject<HTMLDivElement | null>
    lampWrapRef: React.RefObject<HTMLDivElement | null>
    bulbRef: React.RefObject<SVGEllipseElement | null>
    bulbMRef: React.RefObject<SVGEllipseElement | null>
    blackoutRef: React.RefObject<HTMLDivElement | null>
    beamSvgRef: React.RefObject<SVGSVGElement | null>
    beamPolyRef: React.RefObject<SVGPolygonElement | null>
    kwRef: React.RefObject<HTMLSpanElement | null>
    hitokotoRef: React.RefObject<HTMLSpanElement | null>
    scrollProgressRef: React.RefObject<HTMLDivElement | null>
    headerRef: React.RefObject<HTMLElement | null>
    featuresRef: React.RefObject<HTMLElement | null>
    horizontalWrapperRef: React.RefObject<HTMLDivElement | null>
    registerRef: React.RefObject<HTMLElement | null>
    submitBtnContainerRef: React.RefObject<HTMLDivElement | null>
    lightsOutRef: React.MutableRefObject<boolean>
  }
}) {
  const { lpRootRef, cursorRef, loaderRef, heroCTARef, lampWrapRef, bulbRef, bulbMRef, blackoutRef, beamSvgRef, beamPolyRef, kwRef, hitokotoRef, scrollProgressRef, headerRef, featuresRef, horizontalWrapperRef, registerRef, submitBtnContainerRef, lightsOutRef } = refs

  /* body class: cursor:none LP スコープ */
  useEffect(() => {
    document.body.classList.add('lp-active')
    return () => {
      document.body.classList.remove('lp-active')
      document.body.classList.remove('lp-lights-out')
    }
  }, [])

  // 解説: emailValid が true になったとき登録ボタンをフェードイン + シェイクアニメーションで強調する
  /* submit button reveal / shake when emailValid changes */
  useEffect(() => {
    const btn = submitBtnContainerRef.current
    if (!btn) return
    if (emailValid) {
      btn.classList.remove('lp-hidden')
      gsap.fromTo(btn, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 })
      const inner = btn.querySelector('button')
      if (inner) {
        gsap.to(inner, { x: -5, yoyo: true, repeat: 9, duration: 0.06, ease: 'power1.inOut', onComplete: () => gsap.set(inner, { x: 0 }) })
      }
    } else {
      gsap.to(btn, { opacity: 0, y: 10, duration: 0.2, onComplete: () => btn.classList.add('lp-hidden') })
    }
  }, [emailValid])

  /* 全 GSAP 処理を単一 useEffect に集約 */
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
        const osc = ac.createOscillator()
        const gain = ac.createGain()
        osc.type = type; osc.frequency.value = freq
        osc.connect(gain); gain.connect(ac.destination)
        osc.start()
        gain.gain.exponentialRampToValueAtTime(0.00001, ac.currentTime + dur)
        osc.stop(ac.currentTime + dur)
      } catch { /* blocked before user gesture */ }
    }

    /* 元HTML は html.scroll-smooth（#register アンカーのスムーズスクロール） */
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

    /* CTA の裏切りホバー（元 L823-828） */
    const ctaA = heroCTARef.current?.querySelector('a')
    let ctaCleanup: (() => void) | null = null
    if (ctaA) {
      const t0 = ctaA.textContent?.trim() ?? ''
      // @copy CRO-cta-landing-hover-01 Lv3 保留: LP意図的タメ口
      const onCtaEnter = () => { ctaA.textContent = 'ほんとに押す？' }
      const onCtaLeave = () => { ctaA.textContent = t0 }
      ctaA.addEventListener('mouseenter', onCtaEnter)
      ctaA.addEventListener('mouseleave', onCtaLeave)
      ctaCleanup = () => { ctaA.removeEventListener('mouseenter', onCtaEnter); ctaA.removeEventListener('mouseleave', onCtaLeave) }
    }

    /* スクロール進捗バー（元 L901-911: documentElement 基準・resize 連動・初期実行） */
    const updProgress = () => {
      const sp = scrollProgressRef.current; if (!sp) return
      const max = document.documentElement.scrollHeight - window.innerHeight
      sp.style.width = (max > 0 ? (window.scrollY / max * 100) : 0) + '%'
    }
    window.addEventListener('scroll', updProgress, { passive: true })
    window.addEventListener('resize', updProgress)
    updProgress()

    /* 今日のひとこと: タイピング（元 L885-899: 打鍵110ms・停止1800ms・削除40ms） */
    let li = 0, ci = 0, del = false
    let typeTimer: ReturnType<typeof setTimeout> | null = null
    const tick = () => {
      const el = hitokotoRef.current; if (!el) return
      const s = HITOKOTO[li]
      if (!del) {
        ci++
        el.textContent = s.slice(0, ci)
        if (ci >= s.length) { del = true; typeTimer = setTimeout(tick, 1800); return }
        typeTimer = setTimeout(tick, 110)
      } else {
        ci--
        el.textContent = s.slice(0, ci)
        if (ci <= 0) { del = false; li = (li + 1) % HITOKOTO.length }
        typeTimer = setTimeout(tick, 40)
      }
    }
    tick()

    /* positionBeam（元 L771-808 と同一ロジック） */
    const positionBeam = () => {
      const isMobile = window.innerWidth < 768
      const bulb = (isMobile && bulbMRef.current) ? bulbMRef.current : bulbRef.current
      const kw = kwRef.current; const poly = beamPolyRef.current; const svg = beamSvgRef.current
      if (!bulb || !kw || !poly || !svg) return
      const b = bulb.getBoundingClientRect(); const k = kw.getBoundingClientRect()
      const ax = b.left + b.width / 2, ay = b.top + b.height / 2
      svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`)
      svg.setAttribute('width', String(window.innerWidth))
      svg.setAttribute('height', String(window.innerHeight))
      if (isMobile) {
        const pad = 26
        const cs = [[k.left - pad, k.top - pad], [k.right + pad, k.top - pad], [k.right + pad, k.bottom + pad], [k.left - pad, k.bottom + pad]]
        const a0 = Math.atan2((k.top + k.bottom) / 2 - ay, (k.left + k.right) / 2 - ax)
        const rel = (a: number) => { let d = a - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d }
        let hi: [number, number[]] | null = null, lo: [number, number[]] | null = null
        cs.forEach(c => { const r = rel(Math.atan2(c[1] - ay, c[0] - ax)); if (!hi || r > hi[0]) hi = [r, c]; if (!lo || r < lo[0]) lo = [r, c] })
        const ext = (c: number[]) => { const dx = c[0] - ax, dy = c[1] - ay, L = Math.hypot(dx, dy) || 1, s = (L + 90) / L; return `${ax + dx * s},${ay + dy * s}` }
        const px = -Math.sin(a0) * 8, py = Math.cos(a0) * 8
        poly.setAttribute('points', `${ax + px},${ay + py} ${ext(hi![1])} ${ext(lo![1])} ${ax - px},${ay - py}`)
      } else {
        const farX = k.left - 70
        const cx = Math.min(k.right + 20, ax - 40)
        const edgeY = (cy: number) => ay + (cy - ay) * (farX - ax) / (cx - ax)
        const topY = edgeY(k.top - 14), botY = edgeY(k.bottom + 14)
        poly.setAttribute('points',
          `${ax},${ay - 9} ${ax},${ay + 9} ${farX},${botY} ${farX},${topY}`)
      }
    }

    /* flicker アニメを毎回再生し直す（元 L809） */
    const reflow = () => {
      ;[beamSvgRef.current, kwRef.current, bulbRef.current, bulbMRef.current].forEach(el => {
        if (!el) return
        const h = el as unknown as HTMLElement
        h.style.animation = 'none'
        void h.offsetWidth
        h.style.animation = ''
      })
    }

    /* ランプ toggle（元 L810-816: 点灯時に positionBeam + reflow、点灯/消灯ビープ） */
    const toggleLamp = () => {
      const on = !lightsOutRef.current
      lightsOutRef.current = on
      document.body.classList.toggle('lp-lights-out', on)
      if (on) { positionBeam(); reflow() }
      try { playBeep(on ? 140 : 560, 'square', 0.12) } catch { /* noop */ }
    }
    const lamp = lampWrapRef.current
    const onLampClick = (e: MouseEvent) => {
      e.stopPropagation()
      if (lamp) gsap.fromTo(lamp, { scale: 0.94 }, { scale: 1, duration: 0.28, ease: 'back.out(3)' })
      toggleLamp()
    }
    const onLampKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleLamp() } }
    lamp?.addEventListener('click', onLampClick)
    lamp?.addEventListener('keydown', onLampKey)

    /* 点灯中は resize / scroll でビーム再計算（元 L817-818） */
    const onResize = () => { if (lightsOutRef.current) positionBeam() }
    window.addEventListener('resize', onResize)
    const onScrollBeam = () => { if (lightsOutRef.current) positionBeam() }
    window.addEventListener('scroll', onScrollBeam, { passive: true })

    /* 暗幕クリックで消灯（元 L819） */
    const blackout = blackoutRef.current
    const onBlackout = () => { lightsOutRef.current = false; document.body.classList.remove('lp-lights-out') }
    blackout?.addEventListener('click', onBlackout)

    /* GSAP ScrollTrigger & animations — 初期化（StrictMode の二重実行で gsap.from が固まるためガード） */
    const mm = gsap.matchMedia()
    let inited = false
    const initAnims = () => {
      if (inited) return
      inited = true
      /* Hero CTA */
      ScrollTrigger.create({
        trigger: 'main',
        start: 'top -10%',
        onEnter: () => gsap.to(heroCTARef.current, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)' }),
        onLeaveBack: () => gsap.to(heroCTARef.current, { opacity: 0, y: 10, duration: 0.3 }),
      })
      /* Header color when features in view（元 L702-711: 透明度 0.8） */
      ScrollTrigger.create({
        trigger: featuresRef.current,
        start: 'top top',
        onEnter: () => gsap.to(headerRef.current, { backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'white', color: 'white', duration: 0.3 }),
        onLeaveBack: () => gsap.to(headerRef.current, { backgroundColor: 'rgba(255,255,255,0.8)', borderColor: 'black', color: 'black', duration: 0.3 }),
      })
      /* Horizontal scroll (PC only) */
      const hw = horizontalWrapperRef.current; const fs = featuresRef.current
      mm.add('(min-width: 768px)', () => {
        if (!hw || !fs) return
        const tw = gsap.to(hw, {
          x: () => -(hw.scrollWidth - window.innerWidth) + 'px', ease: 'none',
          scrollTrigger: { trigger: fs, pin: true, scrub: 1, end: () => '+=' + hw.scrollWidth },
        })
        return () => { tw.scrollTrigger?.kill(true); tw.kill() }
      })
      /* Step items */
      gsap.utils.toArray<HTMLElement>('.lp-step-item').forEach(step => {
        gsap.from(step, { scrollTrigger: { trigger: step, start: 'top 80%' }, y: 100, opacity: 0, duration: 1, ease: 'power3.out' })
      })
      /* Register dark theme — 元 L747-759: body（=ルート）の CSS 変数を切替えページ全体を 0.5s で暗転 */
      ScrollTrigger.create({
        trigger: registerRef.current,
        start: 'top 50%',
        onEnter: () => {
          const r = lpRootRef.current
          if (r) { r.style.setProperty('--lp-bg', '#111'); r.style.setProperty('--lp-text', '#f4f4f0') }
        },
        onLeaveBack: () => {
          const r = lpRootRef.current
          if (r) { r.style.setProperty('--lp-bg', '#f4f4f0'); r.style.setProperty('--lp-text', '#111') }
        },
      })
    }

    /* loader → initAnims（元 L606-615: 1.5秒見せてから捌ける） */
    let loaderTimer: ReturnType<typeof setTimeout> | null = null
    const runLoader = () => {
      loaderTimer = setTimeout(() => {
        gsap.to(loaderRef.current, { yPercent: -100, duration: 0.8, ease: 'power4.inOut', onComplete: initAnims })
      }, 1500)
    }
    if (document.readyState === 'complete') { runLoader() }
    else { window.addEventListener('load', runLoader, { once: true }) }

    return () => {
      window.removeEventListener('load', runLoader)
      if (loaderTimer) clearTimeout(loaderTimer)
      ScrollTrigger.getAll().forEach(t => t.kill())
      mm.revert()
      if (typeTimer) clearTimeout(typeTimer)
      moveFns.forEach(f => f())
      beepCleanups.forEach(f => f())
      ctaCleanup?.()
      window.removeEventListener('scroll', updProgress)
      window.removeEventListener('resize', updProgress)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScrollBeam)
      lamp?.removeEventListener('click', onLampClick)
      lamp?.removeEventListener('keydown', onLampKey)
      blackout?.removeEventListener('click', onBlackout)
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
        .lp-root{--lp-bg:#f4f4f0;--lp-text:#0A0A0A;font-family:'Syne',sans-serif;background-color:var(--lp-bg);color:var(--lp-text);transition:background-color .5s ease,color .5s ease;overflow-x:hidden;padding-bottom:5rem;-webkit-font-smoothing:antialiased}
        .lp-root ::selection{background:#FF3B6B;color:white}
        .lp-cinzel{font-family:'Cinzel',serif;font-weight:700}
        .lp-mono{font-family:'Space Mono',monospace}
        .lp-brutal{border:4px solid var(--lp-text);box-shadow:8px 8px 0 var(--lp-text);border-radius:0}
        .lp-glitch:hover{animation:lp-glitch .3s cubic-bezier(.25,.46,.45,.94) both infinite;color:#FF3B6B}
        @keyframes lp-glitch{0%{transform:skew(0deg)}20%{transform:skew(-20deg)}40%{transform:skew(20deg)}60%{transform:skew(-10deg)}80%{transform:skew(10deg)}100%{transform:skew(0deg)}}
        @keyframes lp-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .lp-marquee-inner{display:inline-block;animation:lp-mq 15s linear infinite;font-family:'Space Mono',monospace;font-weight:bold;font-size:1.5rem;white-space:nowrap}
        @keyframes lp-mq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .lp-noise-overlay{position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
        #lp-scroll-progress{position:fixed;top:0;left:0;height:6px;width:0;background:#FF3B6B;border-bottom:3px solid var(--lp-text);z-index:60}
        #lp-custom-cursor{position:fixed;top:0;left:0;width:20px;height:20px;background:#FF3B6B;border-radius:50%;pointer-events:none;z-index:10000;mix-blend-mode:difference;transition:transform .1s ease;transform:translate(-50%,-50%)}
        #lp-custom-cursor.lp-cursor-hovered{transform:translate(-50%,-50%) scale(3);background:transparent;border:2px solid white}
        body.lp-lights-out #lp-custom-cursor{z-index:10002}
        #lp-loader{position:fixed;top:0;left:0;width:100vw;height:100vh;background:var(--lp-text);color:var(--lp-bg);display:flex;justify-content:center;align-items:center;z-index:10001;font-size:clamp(.9rem,4.4vw,3rem);font-weight:800;white-space:nowrap;text-align:center}
        #lp-blackout{position:fixed;inset:0;background:#050505;opacity:0;pointer-events:none;z-index:55;transition:opacity .28s ease}
        body.lp-lights-out #lp-blackout{opacity:.97;pointer-events:auto}
        #lp-kw{color:transparent;-webkit-text-stroke:1px rgba(10,10,10,.2)}
        body.lp-lights-out #lp-kw{z-index:60;color:var(--color-brand);-webkit-text-stroke:0;text-shadow:0 0 14px rgba(61,220,151,.9),0 0 42px rgba(61,220,151,.6),0 0 90px rgba(61,220,151,.4);animation:lp-flicker 1.4s ease forwards}
        #lp-beam-svg{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:58;opacity:0;filter:blur(7px)}
        body.lp-lights-out #lp-beam-svg{opacity:1;animation:lp-flicker 1.4s ease forwards}
        .lp-bulb{transition:fill .1s ease}
        body.lp-lights-out .lp-bulb{fill:var(--color-brand);filter:drop-shadow(0 0 12px var(--color-brand));animation:lp-flicker 1.4s ease forwards}
        @keyframes lp-flicker{0%{opacity:0}7%{opacity:.9}10%{opacity:0}14%{opacity:.7}18%{opacity:0}24%{opacity:1}28%{opacity:.25}33%{opacity:1}38%{opacity:.6}43%{opacity:1}100%{opacity:1}}
        #lp-lamp-area{display:flex;align-items:center;gap:1rem}
        #lp-lamp-wrap{transition:transform .2s ease}
        #lp-lamp-wrap:hover{transform:scale(1.04)}
        #lp-gatekeeper-stamp{transform:rotate(-8deg)}
        .lp-signup{border:2px solid black;background:black;color:white;padding:.5rem 1rem;border-radius:50px;transition:all .15s ease;display:inline-block}
        .lp-signup:hover{background:#FF3B6B;border-color:#FF3B6B;transform:translateY(-2px)}
        .lp-cta-btn{background:black;color:white;padding:1rem 2rem;display:inline-block;transition:all .15s ease}
        .lp-cta-btn:hover{background:#FF3B6B;transform:translateY(-.25rem);box-shadow:12px 12px 0 0 rgba(0,0,0,1)}
        .lp-email-input{background:transparent;border:0;border-bottom:4px solid currentColor;color:inherit;transition:border-color .3s}
        .lp-email-input:focus{border-color:#A6F0FF}
        .lp-submit-btn{background:#FF3B6B;color:white;transition:all .15s ease}
        .lp-submit-btn:hover{background:black;color:white}
        .lp-hover-a1:hover{color:#FF3B6B}
        .lp-hover-a2:hover{color:#A6F0FF}
        .lp-hover-a3:hover{color:var(--color-brand)}
        .lp-typing-dot{animation:lp-td 1.2s steps(1) infinite}
        @keyframes lp-td{0%,60%,100%{opacity:.15}30%{opacity:1}}
        #lp-hitokoto-caret{animation:lp-caret 1s steps(1) infinite}
        @keyframes lp-caret{0%,49%{opacity:1}50%,100%{opacity:0}}
        #lp-swipe-card{animation:lp-discard 3s ease-in-out infinite}
        @keyframes lp-discard{0%,30%{transform:translate(0,0) rotate(0deg);opacity:1}62%{transform:translate(150px,-36px) rotate(18deg);opacity:0}63%,82%{transform:translate(0,0) rotate(0deg);opacity:0}100%{transform:translate(0,0) rotate(0deg);opacity:1}}
        #lp-px-heart{transform-origin:center;animation:lp-beat 1.8s steps(2) infinite}
        @keyframes lp-beat{0%,70%,100%{transform:scale(1)}76%{transform:scale(1.08)}84%{transform:scale(1)}90%{transform:scale(1.05)}}
        .lp-path-line{position:absolute;top:0;left:50%;width:4px;height:100%;background:var(--lp-text);transform:translateX(-50%);z-index:-1}
        details.lp-details summary{list-style:none;position:relative;padding-right:2.2rem}
        details.lp-details summary::-webkit-details-marker{display:none}
        details.lp-details summary::after{content:"+";position:absolute;right:.3rem;top:0;font-weight:700;transition:transform .2s ease}
        details.lp-details[open] summary::after{transform:rotate(45deg);color:var(--color-brand)}
        details.lp-details:hover summary{color:var(--color-brand)}
        .lp-retro-marquee{background:black;color:#0f0;font-family:monospace;padding:5px;text-transform:uppercase;letter-spacing:2px;width:256px}
        .lp-hidden{display:none!important}
        @media (min-width:768px){#lp-hero-btns{position:absolute;top:7rem;right:8%;z-index:70;display:flex;flex-direction:column;gap:.625rem}}
        .lp-horizontal-scroll-wrapper{display:flex;width:300vw;height:100vh}
        .lp-horizontal-panel{width:100vw;height:100vh;display:flex;flex-direction:column;justify-content:center;padding:5vw}
        @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
        @media (hover:none),(pointer:coarse){#lp-custom-cursor{display:none!important}}
        @media (max-width:767px){
          .lp-root header{width:94%;padding-left:1rem;padding-right:1rem}
          .lp-root header .text-2xl{font-size:1.2rem}
          #lp-lamp-area{position:static!important;margin:1.5rem 0 0 0;justify-content:flex-end;gap:.75rem!important}
          #lp-lamp-wrap{width:48vw!important;max-width:200px!important}
          #lp-hero-btns{position:static!important;align-self:flex-end;margin-top:1rem;gap:.4rem!important}
          #lp-kw{-webkit-text-stroke:0.3px rgba(10,10,10,.2)}
          #lp-gatekeeper-stamp{position:static!important;display:block;margin-top:1.25rem;transform:rotate(-4deg)}
          #lp-hero-cta{right:1rem;bottom:1rem}
          #lp-hero-cta a{padding:.8rem 1.2rem;font-size:.95rem}
          .lp-horizontal-scroll-wrapper{display:block!important;width:100%!important;max-width:100%;height:auto!important;transform:none!important}
          .lp-horizontal-panel{width:100%;height:auto;min-height:auto;padding-top:14vh;padding-bottom:14vh;justify-content:flex-start}
          #lp-lamp-svg-pc{display:none!important}
          #lp-lamp-svg-m{display:block!important}
          #lp-swipe-stack{width:110px!important;height:140px!important;right:5%!important;bottom:6%!important;opacity:.85}
          #lp-swipe-card span{font-size:2.2rem}
          .lp-step-neg-mt{margin-top:0!important}
          html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
          .lp-root footer h3{font-size:clamp(1.7rem,8.5vw,2.25rem);word-break:break-word}
          .lp-step-item{align-items:stretch!important}
          .lp-step-item > div:not(.absolute){width:100%!important;max-width:100%!important}
          .lp-step-item .lp-brutal{width:min(78vw,270px)!important;margin-left:auto!important;margin-right:auto!important}
          .lp-step-item .bg-black{padding:1rem!important}
          #lp-hitokoto-box{font-size:clamp(.72rem,3.4vw,.9rem)}
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
        <div id="lp-blackout" ref={blackoutRef} />
        <svg id="lp-beam-svg" ref={beamSvgRef} aria-hidden="true">
          <polygon ref={beamPolyRef as React.RefObject<SVGPolygonElement>} fill="rgba(61,220,151,.45)" />
        </svg>

        {/* Loader */}
        {/* @copy CRO-loader-landing-01 Lv2 保留: LP専用毒トーン */}
        <div id="lp-loader" ref={loaderRef}>
          <span className="lp-cinzel italic pr-2">Cro-co</span>
          {' '}// SCANNING CAMPUS...
        </div>

        {/* Header */}
        <header
          ref={headerRef}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between w-[90%] max-w-4xl px-6 py-3"
          style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', border: '4px solid black', borderRadius: 50 }}
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
            <Link to="/signup" className="lp-mono text-xs font-bold uppercase lp-interactive lp-signup">
              Sign Up
            </Link>
            <span
              className="lp-mono text-[10px] absolute -bottom-9 right-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
              style={{ background: 'black', color: 'white', padding: '0.25rem 0.75rem', borderRadius: 50 }}
            >
              Don't click if u're boring.
            </span>
          </nav>
        </header>

        <main>
          {/* Hero */}
          <section className="relative min-h-screen pt-32 pb-20 px-4 md:px-12 flex flex-col justify-center items-start overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] border border-black rounded-full opacity-20" style={{ animation: 'lp-spin 60s linear infinite' }} />
            <div className="absolute bottom-[-20%] left-[-10%] w-[70vw] h-[70vw] border border-black opacity-20" style={{ animation: 'lp-spin 40s linear reverse infinite' }} />

            {/* @copy CRO-heading-landing-hero-01 Lv2 保留: LP専用毒トーン */}
            <h1 className="font-black" style={{ fontSize: '12vw', lineHeight: 0.82 }}>
              阪大生の、<br />
              ちょっと<br />
              <span id="lp-kw" ref={kwRef} style={{ position: 'relative' }}>普通じゃない</span><br />
              出会い方。
            </h1>

            <p className="lp-mono text-sm md:text-base mt-8 max-w-md relative z-10" style={{ lineBreak: 'strict', wordBreak: 'keep-all' }}>
              授業の合間に、同じキャンパスの誰かと<span className="whitespace-nowrap" style={{ color: '#FF3B6B' }}>「ちょっと話そう」</span>。
            </p>
            <p className="lp-mono text-sm md:text-base mt-3 font-bold relative z-10">
              阪大生<span style={{ color: '#FF3B6B' }}>限定</span>。<span className="font-normal opacity-70">大学メール認証あり。</span>
            </p>

            <div className="flex flex-wrap items-start gap-4 mt-8 relative z-10">
              {/* @copy CRO-banner-landing-beta-01 Lv2 保留: LP専用毒トーン */}
              <span className="lp-mono text-sm md:text-lg font-bold px-4 py-2 lp-brutal inline-block" style={{ background: 'var(--color-brand)', transform: 'rotate(-2deg)' }}>
                いまβ版。ときどき、つまずきます。
              </span>
              {/* @copy CRO-banner-landing-age-01 Lv2 保留: LP専用毒トーン */}
              <span className="lp-mono text-[10px] md:text-xs px-4 py-2 lp-brutal inline-block" style={{ background: '#0A0A0A', color: 'white', transform: 'rotate(1.5deg)' }}>
                18歳未満は利用不可。阪大に17歳がいたら、それはそれで天才。
              </span>
            </div>

            <div
              id="lp-gatekeeper-stamp"
              className="absolute top-[63%] right-[6%] z-20 select-none whitespace-nowrap"
              aria-hidden="true"
            >
              {/* @copy CRO-stamp-landing-gatekeeper-01 Lv2 保留: LP専用毒トーン */}
              <span className="lp-mono font-black tracking-[0.25em] text-sm md:text-base px-4 py-1.5 opacity-80 inline-block"
                style={{ border: '3px dashed #FF3B6B', color: '#FF3B6B' }}>
                学外、お断り。
              </span>
            </div>

            {/* ログイン/登録ボタン（PCで hero 右上コーナーへ絶対配置・スマホは flow 内右寄せ） */}
            <div id="lp-hero-btns" className="flex flex-col gap-2.5">
              <Link
                to="/signup"
                className="lp-mono text-xs md:text-sm font-bold uppercase whitespace-nowrap lp-interactive"
                style={{ border: '2px solid var(--lp-text)', background: 'var(--color-brand)', color: 'var(--lp-text)', padding: '.45rem .9rem', borderRadius: 50, display: 'inline-block', transition: 'all .15s ease' }}
              >
                はじめる →
              </Link>
              <Link
                to="/login"
                className="lp-mono text-xs font-bold uppercase whitespace-nowrap lp-interactive text-center"
                style={{ border: '2px solid currentColor', padding: '.3rem .75rem', borderRadius: 50, opacity: 0.75, display: 'inline-block', transition: 'opacity .15s ease' }}
              >
                ログイン
              </Link>
            </div>

            {/* スタンドライト */}
            <div
              id="lp-lamp-area"
              className="absolute top-[36%] right-[3%] md:right-[8%] z-[70]"
            >

              {/* ランプ本体 */}
              <div
                id="lp-lamp-wrap"
                ref={lampWrapRef}
                className="w-[34vw] lp-interactive cursor-pointer select-none"
                style={{ maxWidth: 250 }}
                role="button"
                tabIndex={0}
                aria-label="スタンドライト"
              >
              <svg id="lp-lamp-svg-pc" viewBox="0 0 260 260" className="w-full h-auto block relative" xmlns="http://www.w3.org/2000/svg">
                <path d="M126 248 L214 248 L200 226 L140 226 Z" fill="#0A0A0A" />
                <path d="M170 228 L170 150" stroke="#0A0A0A" strokeWidth="11" strokeLinecap="round" fill="none" />
                <circle cx="170" cy="150" r="10" fill="#0A0A0A" />
                <path d="M170 150 L92 96" stroke="#0A0A0A" strokeWidth="11" strokeLinecap="round" fill="none" />
                <circle cx="92" cy="96" r="9" fill="#0A0A0A" />
                <path d="M100 80 L112 104 L52 130 L40 70 Z" fill="#0A0A0A" />
                <ellipse ref={bulbRef} className="lp-bulb" cx="48" cy="100" rx="8" ry="24" transform="rotate(-14 48 100)" fill="#2b2b2b" />
              </svg>
              <svg id="lp-lamp-svg-m" viewBox="0 0 260 260" className="w-full h-auto relative" xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }}>
                <path d="M66 248 L164 248 L150 226 L80 226 Z" fill="#0A0A0A" />
                <path d="M115 228 L115 150" stroke="#0A0A0A" strokeWidth="11" strokeLinecap="round" fill="none" />
                <circle cx="115" cy="150" r="10" fill="#0A0A0A" />
                <path d="M115 150 L152 84" stroke="#0A0A0A" strokeWidth="11" strokeLinecap="round" fill="none" />
                <circle cx="152" cy="84" r="9" fill="#0A0A0A" />
                <path d="M138 86 L172 64 L150 24 L108 48 Z" fill="#0A0A0A" />
                <ellipse ref={bulbMRef} className="lp-bulb" cx="127" cy="34" rx="8" ry="22" transform="rotate(60 127 34)" fill="#2b2b2b" />
              </svg>
              </div>
            </div>

            {/* 固定CTA */}
            {/* @copy CRO-button-landing-cta-01 Lv1 */}
            <div id="lp-hero-cta" ref={heroCTARef} className="fixed bottom-10 right-10 z-40" style={{ opacity: 0, transform: 'translateY(2.5rem)' }}>
              <a
                href="#register"
                className="lp-brutal lp-cta-btn lp-mono font-bold uppercase text-lg lp-interactive"
              >
                Start Cro-co
              </a>
            </div>

            {/* @copy CRO-easter-landing-01 Lv4 保留: LP専用イースターエッグ */}
            <div
              className="absolute bottom-5 left-5 lp-mono text-[8px] text-gray-400 cursor-pointer"
              onClick={() => alert('隠し要素、発見。')}
            >
              押さないで
            </div>
          </section>

          {/* Marquee bar */}
          <div style={{ borderTop: '4px solid #0A0A0A', borderBottom: '4px solid #0A0A0A', background: 'var(--color-brand)', padding: '10px 0', transform: 'rotate(-1.5deg) scale(1.04)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div className="lp-marquee-inner">
              OSAKA UNIV ONLY ✕ TRUST NO FEED ✕ EVERYONE LIES A LITTLE ✕ PROBABLY A BAD IDEA ✕ SOMEONE NEARBY IS BORED ✕ OSAKA UNIV ONLY ✕ TRUST NO FEED ✕ EVERYONE LIES A LITTLE ✕ PROBABLY A BAD IDEA ✕ SOMEONE NEARBY IS BORED ✕{' '}
            </div>
          </div>

          {/* Features — dark / horizontal scroll */}
          <section ref={featuresRef} style={{ background: '#050505', color: 'white', position: 'relative', overflow: 'hidden' }}>
            <div ref={horizontalWrapperRef} className="lp-horizontal-scroll-wrapper">
              {/* Panel 01 */}
              <div className="lp-horizontal-panel relative">
                <div className="absolute top-10 left-10 lp-mono leading-none font-black" style={{ fontSize: '20vw', color: 'rgba(255,255,255,0.1)' }}>01</div>
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
                <div className="absolute top-10 left-10 lp-mono leading-none font-black" style={{ fontSize: '20vw', color: 'rgba(255,255,255,0.1)' }}>02</div>
                <div className="z-10 w-full flex justify-end">
                  <div className="max-w-xl text-right">
                    <h2 className="text-6xl md:text-8xl font-black mb-6 uppercase">
                      <span style={{ color: 'transparent', WebkitTextStroke: '2px white' }}>Pure</span><br />Chaos.
                    </h2>
                    <svg id="lp-px-heart" viewBox="0 0 13 11" width="143" height="121" className="ml-auto mb-4" style={{ imageRendering: 'pixelated' }} aria-hidden="true">
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
                <div className="absolute top-10 left-10 lp-mono leading-none font-black" style={{ fontSize: '20vw', color: 'rgba(255,255,255,0.1)' }}>03</div>
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

          {/* Skew transition */}
          <div className="-skew-y-3 origin-top-left -mb-12 relative z-10 h-24" style={{ background: '#050505' }} />

          {/* How It Works */}
          <section className="relative pt-32 pb-40 px-4 md:px-12" style={{ background: '#f4f4f0' }}>
            <h2 className="font-black uppercase text-center mb-32 z-10 relative" style={{ fontSize: '8vw' }}>
              How to <span className="lp-cinzel italic">Ruin</span> your Life
            </h2>
            <div className="relative max-w-5xl mx-auto">
              <div className="lp-path-line hidden md:block" />

              {/* Step 01 */}
              <div className="relative flex flex-col md:flex-row items-center justify-between mb-40 lp-step-item">
                <div className="absolute -left-10 md:-left-32 top-0 lp-mono font-black z-0 opacity-[0.05]" style={{ fontSize: '15vw', color: 'black' }}>01</div>
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
                    <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full animate-bounce" style={{ background: '#FF3B6B' }} />
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
              <div className="relative flex flex-col md:flex-row-reverse items-center justify-between mb-40 lp-step-item lp-step-neg-mt" style={{ marginTop: '-5rem' }}>
                <div className="absolute -right-10 md:-right-32 top-0 lp-mono font-black z-0 opacity-[0.05]" style={{ fontSize: '15vw', color: 'black' }}>02</div>
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

          {/* Register — 背景はルートの CSS 変数を継承（個別背景なし・元と同じ） */}
          <section
            ref={registerRef}
            id="register"
            className="min-h-screen flex flex-col items-center justify-center px-4 relative transition-colors duration-1000"
          >
            <div className="w-full max-w-4xl text-center z-10">
              <h2 className="font-black uppercase mb-8 leading-none" style={{ fontSize: '8vw' }}>
                Dare to<br />Join?
              </h2>
              <p className="lp-mono text-sm max-w-xl mx-auto mb-10 text-center" style={{ opacity: 0.6 }}>
                <span className="font-bold block mb-1">データは、アプリを良くするためだけに使います</span>
                個人を晒すことはありません。あなたの使い方が、次の改善のヒントになります。協力してくれたら、ちょっと嬉しいです。
              </p>
              <form className="space-y-12 text-left max-w-2xl mx-auto" onSubmit={handleSubmit}>
                <div>
                  {/* @copy CRO-label-landing-register-01 Lv3 保留: LP専用タメ口 */}
                  <label className="block lp-mono text-xl mb-4" style={{ opacity: 0.7 }}>&gt; 阪大メール、教えて。(Email)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => handleEmailChange(e.target.value)}
                    className="lp-email-input w-full text-4xl font-black focus:outline-none pb-2 lp-interactive"
                    // @copy CRO-placeholder-landing-register-01 Lv0
                    placeholder="you@ecs.osaka-u.ac.jp"
                    required
                    aria-label="阪大メールアドレス"
                  />
                  {email.length > 0 && !emailValid && (
                    <p className="lp-mono text-xs mt-2" style={{ color: '#FF3B6B', opacity: 0.8 }}>
                      {/* @copy CRO-error-landing-register-01 Lv0 */}
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
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-20" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=')" }} />
                  </button>
                  {/* @copy CRO-label-landing-register-02 Lv3 保留: LP専用毒トーン */}
                  <p className="lp-mono text-xs text-center mt-4" style={{ opacity: 0.5 }}>押した時点で、もう普通じゃない。</p>
                </div>
              </form>
            </div>
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 lp-mono text-sm tracking-widest uppercase">
              Status: {progressText}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="relative pt-32 pb-10 overflow-hidden" style={{ background: 'black', color: 'white' }}>
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black pointer-events-none select-none whitespace-nowrap"
            style={{ fontSize: '30vw', color: 'rgba(255,255,255,0.05)' }}
            aria-hidden="true"
          >
            Cro-co.
          </div>
          <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row justify-between items-end">
            <div className="mb-12 md:mb-0">
              <h3 className="text-4xl font-black mb-6 uppercase lp-glitch lp-interactive">End of<br />Transmission.</h3>
              <div className="lp-retro-marquee mb-6">
                <div className="lp-marquee-inner" style={{ fontSize: '0.9rem', animation: 'lp-mq 8s linear infinite' }}>
                  β版、稼働中... β版、稼働中... β版、稼働中... β版、稼働中...{' '}
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
