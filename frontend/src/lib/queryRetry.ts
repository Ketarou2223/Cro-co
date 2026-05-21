type AxiosLikeError = {
  response?: { status?: number }
}

export const defaultRetry = (failureCount: number, error: unknown): boolean => {
  const status = (error as AxiosLikeError)?.response?.status
  if (status === 401) {
    // トークンリフレッシュのタイムラグ対応: 1回だけリトライ
    return failureCount < 1
  }
  // その他のエラーも1回リトライ
  return failureCount < 1
}
