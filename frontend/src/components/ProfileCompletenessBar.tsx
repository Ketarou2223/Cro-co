import {
  computeCompleteness,
  sendRegime,
  bioPoints,
  photoPoints,
  BIO_FULL_LEN,
  PHOTO_CAP,
  SAME_SEX_UNLOCK,
  MALE_BONUS_THRESHOLD,
} from '@/lib/completeness'

interface Props {
  profile: Record<string, unknown>
  photoCount: number
  gender: string | null | undefined
  interestIn: string | null | undefined
}

export default function ProfileCompletenessBar({ profile, photoCount, gender, interestIn }: Props) {
  const c = computeCompleteness(profile, photoCount)
  const score = c.score
  const regime = sendRegime(gender, interestIn)

  const threshold = regime === 'same_sex' ? SAME_SEX_UNLOCK : MALE_BONUS_THRESHOLD

  const barColor =
    score < 50
      ? 'var(--color-danger)'
      : score < 80
      ? 'var(--color-warning)'
      : 'var(--color-brand)'

  let copyText = ''
  if (regime === 'male_hetero') {
    if (score < MALE_BONUS_THRESHOLD) {
      const rem = (MALE_BONUS_THRESHOLD - score).toFixed(1).replace(/\.0$/, '')
      copyText = `あと${rem}% で、ログインのいいね回復が解放されます。`
    } else {
      copyText = 'いいね回復が解放されています。100%で回復が2倍に。'
    }
  } else if (regime === 'same_sex') {
    if (score < SAME_SEX_UNLOCK) {
      const rem = (SAME_SEX_UNLOCK - score).toFixed(1).replace(/\.0$/, '')
      copyText = `あと${rem}% で、いいねが送り放題になります。`
    } else {
      copyText = 'いいねが送り放題です。'
    }
  } else {
    // female_unlimited
    if (score < MALE_BONUS_THRESHOLD) {
      const rem = (MALE_BONUS_THRESHOLD - score).toFixed(1).replace(/\.0$/, '')
      copyText = `あと${rem}% で、いいねをくれた相手が見られます。`
    } else {
      copyText = 'いいねをくれた相手が見られます。'
    }
  }

  // advice items (gain desc, top 3, skip gain=0)
  const adviceItems: { text: string; gain: number }[] = []

  if (photoCount < PHOTO_CAP) {
    const gain = photoPoints(photoCount + 1) - photoPoints(photoCount)
    if (gain > 0) adviceItems.push({ text: '写真をもう1枚ふやす', gain })
  }

  const bioLen = c.bioLength
  if (bioLen < BIO_FULL_LEN) {
    const addChars = Math.min(100, BIO_FULL_LEN - bioLen)
    const gain = bioPoints(bioLen + addChars) - bioPoints(bioLen)
    if (gain > 0) adviceItems.push({ text: `自己紹介をあと${addChars}字書く`, gain })
  }

  if (c.unfilledMisc.length > 0) {
    adviceItems.push({ text: 'プロフ項目をうめる（1つ）', gain: 60 / 17 })
  }

  const topAdvice = [...adviceItems].sort((a, b) => b.gain - a.gain).slice(0, 3)

  return (
    <div className="sticky top-14 z-30 bg-bone border-b-2 border-ink">
      <div className="max-w-[480px] mx-auto px-4 py-3">

        {/* スコア + バー */}
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-[10px] font-bold text-ink/50 shrink-0 uppercase tracking-wide">充実度</span>
          <div className="relative flex-1 h-4 rounded-full border-2 border-ink overflow-hidden" style={{ background: 'var(--color-paper)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(score, 100)}%`, background: barColor }}
            />
            {/* threshold marker */}
            <div
              className="absolute top-0 bottom-0 w-px"
              style={{ left: `${threshold}%`, background: 'var(--color-ink)', opacity: 0.4 }}
            />
          </div>
          <span
            className="font-mono text-sm font-bold shrink-0 tabular-nums"
            style={{ color: barColor, minWidth: '3.2rem', textAlign: 'right' }}
          >
            {score.toFixed(1).replace(/\.0$/, '')}%
          </span>
        </div>

        {/* threshold + 100% labels */}
        <div className="relative h-4 ml-[5.5rem] mr-[3.4rem] mb-1">
          <span
            className="absolute font-mono text-[9px] text-ink/40 -translate-x-1/2"
            style={{ left: `${threshold}%` }}
          >
            {threshold}%
          </span>
          <span className="absolute font-mono text-[9px] text-ink/40 right-0">100%</span>
        </div>

        {/* copy */}
        <p className="text-xs font-bold text-ink leading-snug mb-2">{copyText}</p>

        {/* advice */}
        {topAdvice.length > 0 && (
          <div className="space-y-0.5">
            {topAdvice.map((item) => (
              <div key={item.text} className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-ink/40">▸</span>
                <span className="text-[11px] text-ink/70">{item.text}</span>
                <span
                  className="font-mono text-[10px] font-bold ml-auto shrink-0"
                  style={{ color: 'var(--color-brand)' }}
                >
                  +{item.gain.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
