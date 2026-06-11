export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen max-w-[480px] mx-auto">
      <p className="font-mono text-ink/40 text-sm animate-pulse">
        読み込んでいます。少しお待ちください。
      </p>
    </div>
  )
}
