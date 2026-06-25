export interface LegalVersion {
  version: string
  date: string    // ISO 8601 (YYYY-MM-DD)
  summary: string
}

export const PRIVACY_POLICY_VERSIONS: readonly LegalVersion[] = [
  { version: 'v1.0', date: '2026-06-18', summary: '初版制定' },
  {
    version: 'v1.1',
    date: '2026-06-22',
    summary: '本名・学籍番号の取得廃止・email_hash 一本化・退会後30日ブロック方針を明記（Phase B-D）',
  },
  {
    version: 'v1.2',
    date: '2026-06-26',
    summary: '2書類本人確認（学生証＋写真付き身分証）を明記',
  },
] as const

export const TERMS_OF_SERVICE_VERSIONS: readonly LegalVersion[] = [
  { version: 'v1.0', date: '2026-06-18', summary: '初版制定' },
  {
    version: 'v1.1',
    date: '2026-06-22',
    summary: '本名・学籍番号の定義削除・email_hash 方針への更新（Phase B-D）',
  },
  {
    version: 'v1.2',
    date: '2026-06-26',
    summary: '2書類本人確認（学生証＋写真付き身分証）を明記',
  },
] as const

export function formatLegalDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${year}年${month}月${day}日`
}
