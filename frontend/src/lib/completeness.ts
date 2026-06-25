// 充実度スコア（いいね経済の中核）。
// SSoT は本ファイルと backend/app/services/completeness.py の二重実装。
// 数式を変える時は必ず両方を同時に変更すること。

export const MISC_FIELDS = [
  'height_cm', 'body_type', 'blood_type', 'sibling_rank', 'languages',
  'campus', 'housing', 'commute_time', 'commute_means', 'second_lang',
  'marriage_intent', 'preferred_age_band', 'drinking', 'smoking', 'mbti',
  'hometown', 'free_slots',
] as const;

const ARRAY_MISC = new Set<string>(['languages', 'commute_means']);
export const BIO_FULL_LEN = 350;
export const PHOTO_CAP = 4;

function isFilled(field: string, value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (ARRAY_MISC.has(field)) return Array.isArray(value) && value.length > 0;
  // 全0文字列（空コマ）は未入力扱い（"1"を1つ以上含む場合のみ埋まりとみなす）
  if (field === 'free_slots') return typeof value === 'string' && value.includes('1');
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

export function photoPoints(photoCount: number): number {
  return Math.max(0, Math.min(photoCount, PHOTO_CAP) - 1) * 5;
}

export function bioPoints(bioLen: number): number {
  const ratio = Math.min(bioLen, BIO_FULL_LEN) / BIO_FULL_LEN;
  return 25 * Math.pow(ratio, 1.5);
}

export interface Completeness {
  score: number;        // 0-100
  photoCount: number;
  photoPoints: number;
  bioLength: number;
  bioPoints: number;
  miscFilled: number;
  miscTotal: number;
  miscPoints: number;
  unfilledMisc: string[];
}

export const SAME_SEX_UNLOCK = 70
export const MALE_BONUS_THRESHOLD = 80

export function sendRegime(
  gender: string | null | undefined,
  interestIn: string | null | undefined,
): string {
  if (gender === 'female' && interestIn === 'male') return 'female_unlimited'
  if (gender === 'male' && interestIn === 'female') return 'male_hetero'
  if (gender != null && gender === interestIn) return 'same_sex'
  return 'female_unlimited'
}

export function computeCompleteness(
  profile: Record<string, unknown>,
  photoCount: number,
): Completeness {
  const bioLen = typeof profile.bio === 'string' ? profile.bio.trim().length : 0;
  const filled = MISC_FIELDS.filter((f) => isFilled(f, profile[f])).length;
  const unfilled = MISC_FIELDS.filter((f) => !isFilled(f, profile[f]));
  const pPts = photoPoints(photoCount);
  const bPts = bioPoints(bioLen);
  const mPts = (60 * filled) / MISC_FIELDS.length;
  return {
    score: Math.round((pPts + bPts + mPts) * 10) / 10,
    photoCount,
    photoPoints: Math.round(pPts * 10) / 10,
    bioLength: bioLen,
    bioPoints: Math.round(bPts * 10) / 10,
    miscFilled: filled,
    miscTotal: MISC_FIELDS.length,
    miscPoints: Math.round(mPts * 10) / 10,
    unfilledMisc: [...unfilled],
  };
}
