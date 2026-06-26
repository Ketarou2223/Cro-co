// 解説: このファイルは全画面ローディング表示コンポーネントを定義する。
// 解説: 呼ばれる場所: App.tsx の <Suspense fallback={<LoadingScreen />}> でページの遅延ロード中に表示
// 解説: CLAUDE.md §7「ローディングスピナー禁止」ルールに従い、文字アニメーションで代替する

export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen max-w-[480px] mx-auto">
      {/* @copy CRO-banner-loading-01 Lv1 */}
      {/* 解説: animate-pulse = Tailwind のパルスアニメーション（フェードイン/アウトを繰り返す） */}
      <p className="text-ink/40 text-sm animate-pulse">
        読み込んでいます。少しお待ちください。
      </p>
    </div>
  )
}
