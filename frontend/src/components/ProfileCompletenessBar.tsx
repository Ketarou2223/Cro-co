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
      copyText = `あと${rem}% で、いいねをくれた相手が見られます。`
    } else {
      copyText = 'いいねをくれた相手が見られます。'
    }
  }

  // カテゴリ別残り伸びしろ（最大到達点 - 現在点）
  const photoRem = Math.round((15 - c.photoPoints) * 10) / 10
  const bioRem = Math.round((25 - c.bioPoints) * 10) / 10
  const miscRem = Math.round((60 - c.miscPoints) * 10) / 10

  type AdviceCat = { rem: number; detail: string }
  const cats: AdviceCat[] = []
  if (photoRem > 0.05 && photoCount < PHOTO_CAP) {
    cats.push({ rem: photoRem, detail: `写真あと${PHOTO_CAP - photoCount}枚` })
  }
  if (bioRem > 0.05) {
    cats.push({ rem: bioRem, detail: `自己紹介あと${BIO_FULL_LEN - c.bioLength}字` })
  }
  if (miscRem > 0.05) {
    cats.push({ rem: miscRem, detail: `プロフ項目あと${c.unfilledMisc.length}個` })
  }
  const sorted = [...cats].sort((a, b) => b.rem - a.rem)
  const primary = sorted[0]
  const secondary = sorted[1]

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

        {/* advice: 最大伸びしろ1つ大きく + 次点小さく */}
        {primary && (
          <div className="space-y-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-bold text-ink leading-tight">{primary.detail}で</span>
              <span
                className="font-mono font-bold leading-none"
                style={{ fontSize: '1.5rem', color: barColor }}
              >
                +{primary.rem.toFixed(1).replace(/\.0$/, '')}%
              </span>
            </div>
            {secondary && (
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-[9px] text-ink/40">▸</span>
                <span className="text-[11px] text-ink/60">{secondary.detail}で</span>
                <span
                  className="font-mono text-[11px] font-bold ml-auto shrink-0"
                  style={{ color: 'var(--color-brand)' }}
                >
                  +{secondary.rem.toFixed(1).replace(/\.0$/, '')}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
