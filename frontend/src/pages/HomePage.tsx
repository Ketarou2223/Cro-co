import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">ホーム</h1>
      <p className="text-muted-foreground">準備中です</p>
      <nav className="flex gap-4">
        <Link to="/login" className="text-primary underline underline-offset-4">ログイン</Link>
        <Link to="/signup" className="text-primary underline underline-offset-4">新規登録</Link>
        <Link to="/debug" className="text-muted-foreground underline underline-offset-4 text-sm">デバッグ</Link>
      </nav>
    </div>
  )
}
