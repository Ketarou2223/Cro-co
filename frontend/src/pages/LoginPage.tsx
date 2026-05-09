import { Link } from 'react-router-dom'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">ログインページ</h1>
      <p className="text-muted-foreground">準備中です</p>
      <nav className="flex gap-4">
        <Link to="/home" className="text-primary underline underline-offset-4">ホーム</Link>
        <Link to="/signup" className="text-primary underline underline-offset-4">新規登録</Link>
      </nav>
    </div>
  )
}
