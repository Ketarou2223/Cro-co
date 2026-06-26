import {
  computeCompleteness,
  sendRegime,
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
      copyText = `あと${rem}% で、いいねをくれた人の写真が見られます。`
    } else {
      copyText = 'いいねをくれた人の写真が見られます。'
    }
  }

  // 「のばすには」: カテゴリ別 gain（最大点 - 現在点）で行を生成
  type AdviceItem = { gain: number; label: string }
  const adviceItems: AdviceItem[] = []

  const bioGain = 25 - c.bioPoints
  const bioRemChars = BIO_FULL_LEN - Math.min(c.bioLength, BIO_FULL_LEN)
  if (bioGain > 0) {
    adviceItems.push({ gain: bioGain, label: `自己紹介をあと${bioRemChars}文字書きましょう` })
  }

  const photoGain = 15 - c.photoPoints
  const photoRemCount = PHOTO_CAP - Math.min(c.photoCount, PHOTO_CAP)
  if (photoGain > 0) {
    adviceItems.push({ gain: photoGain, label: `写真をあと${photoRemCount}枚追加しましょう` })
  }

  const miscGain = 60 - c.miscPoints
  const miscRemCount = c.miscTotal - c.miscFilled
  if (miscGain > 0) {
    adviceItems.push({ gain: miscGain, label: `詳細プロフィールをあと${miscRemCount}個うめましょう` })
  }

  const sortedAdvice = [...adviceItems].sort((a, b) => b.gain - a.gain)

  return (
    <div className="sticky top-14 z-30 bg-bone border-b-2 border-ink">
      <div className="max-w-[480px] mx-auto px-4 py-3">

        {/* スコア + バー */}
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[13px] font-bold text-ink/50 shrink-0">充実度</span>
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
            className="font-accent text-sm font-bold shrink-0 tabular-nums"
            style={{ color: barColor, minWidth: '3.2rem', textAlign: 'right' }}
          >
            {score.toFixed(1).replace(/\.0$/, '')}%
          </span>
        </div>

        {/* threshold + 100% labels */}
        <div className="relative h-4 ml-[5.5rem] mr-[3.4rem] mb-1">
          <span
            className="absolute font-accent font-bold text-[9px] text-ink/40 -translate-x-1/2"
            style={{ left: `${threshold}%` }}
          >
            {threshold}%
          </span>
          <span className="absolute font-accent font-bold text-[9px] text-ink/40 right-0">100%</span>
        </div>

        {/* copy */}
        <p className="text-xs font-bold text-ink leading-snug mb-2">{copyText}</p>

        {/* のばすには */}
        {sortedAdvice.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <p style={{ fontSize: '11.5px', color: 'rgba(10,10,10,0.45)', letterSpacing: '0.03em', marginBottom: '6px' }}>のばすには</p>

            {/* 1位 hero行 */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px', marginBottom: '12px' }}>
              <span style={{ fontFamily: 'var(--font-accent)', fontWeight: 700, fontSize: '26px', color: '#B45309', letterSpacing: '-0.02em', lineHeight: 1 }}>
                +{sortedAdvice[0].gain.toFixed(1)}%
              </span>
              <span style={{ fontSize: '13.5px', color: '#0A0A0A' }}>{sortedAdvice[0].label}</span>
            </div>

            {/* 2位・3位 サブ行 */}
            {sortedAdvice.length > 1 && (
              <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(10,10,10,0.12)', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {sortedAdvice.slice(1).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
                    <span style={{ fontFamily: 'var(--font-accent)', fontWeight: 700, fontSize: '14px', color: '#147a52', minWidth: '46px' }}>
                      +{item.gain.toFixed(1)}%
                    </span>
                    <span style={{ fontSize: '12.5px', color: 'rgba(10,10,10,0.62)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
