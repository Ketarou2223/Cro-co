// 解説: このファイルは TanStack Query のリトライ戦略をカスタマイズするユーティリティを提供する。
// 解説: 呼ばれる場所: TanStack Query の QueryClient 設定（main.tsx 等）でグローバル設定として使う
// 解説: TanStack Query のデフォルトは「3回リトライ」だが、401 などは不要なリトライを防ぎたい

// 解説: AxiosLikeError = axios のエラー形式を TypeScript で表現するための型
//   response.status でHTTPステータスコードを取れる
type AxiosLikeError = {
  response?: { status?: number }
}

// 解説: defaultRetry = クエリ失敗時にリトライするかどうかを判定する関数
//   TanStack Query の QueryClient の defaultOptions.queries.retry に渡す
export const defaultRetry = (failureCount: number, error: unknown): boolean => {
  const status = (error as AxiosLikeError)?.response?.status
  if (status === 401) {
    // トークンリフレッシュのタイムラグ対応: 1回だけリトライ
    return failureCount < 1
  }
  // その他のエラーも1回リトライ
  return failureCount < 1
}
