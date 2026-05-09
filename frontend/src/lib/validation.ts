const ALLOWED_DOMAIN = '@ecs.osaka-u.ac.jp'

export function isAllowedDomain(email: string): boolean {
  return email.toLowerCase().endsWith(ALLOWED_DOMAIN)
}

export function getDomainErrorMessage(): string {
  return '@ecs.osaka-u.ac.jp の大阪大学メールアドレスのみご利用いただけます'
}
