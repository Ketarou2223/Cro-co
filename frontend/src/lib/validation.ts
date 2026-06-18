// 解説: このファイルはメールアドレスのドメイン検証ユーティリティを提供する。
// 解説: 呼ばれる場所: LoginPage.tsx / SignupPage.tsx 等でメールアドレス入力時のバリデーションに使う
// 解説: Cro-co は @ecs.osaka-u.ac.jp のアドレスを持つ大阪大学学部生のみが利用できる

const ALLOWED_DOMAIN = '@ecs.osaka-u.ac.jp'

// 解説: isAllowedDomain(email) = メールアドレスが許可ドメインで終わるかどうかを返す
export function isAllowedDomain(email: string): boolean {
  return email.toLowerCase().endsWith(ALLOWED_DOMAIN)
}

// 解説: getDomainErrorMessage() = ドメインエラー時に表示する固定文言を返す
export function getDomainErrorMessage(): string {
  // @copy CRO-error-validation-01 Lv0
  return '@ecs.osaka-u.ac.jp の大阪大学メールアドレスのみご利用いただけます'
}
