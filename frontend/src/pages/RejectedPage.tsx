import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

const SUPPORT_EMAIL = 'support@example.com'

export default function RejectedPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (e) {
      console.error('[RejectedPage] signOut error:', e)
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-4">
      {/* ロゴ */}
      <div className="mb-8">
        <span className="text-2xl font-bold text-primary tracking-tight">Cro-co</span>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div className="text-5xl">😔</div>
            <div className="text-center">
              <h1 className="text-lg font-bold">申請が却下されました</h1>
              <p className="text-sm text-muted-foreground mt-1">
                学生証の審査が通りませんでした。
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl px-4 py-4 space-y-2">
            <p className="text-sm font-medium">考えられる理由</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>学生証の画像が鮮明でなかった</li>
              <li>学生証の有効期限が切れている</li>
              <li>対象大学の学生証ではない</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              ご不明な点はお問い合わせください
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <span>✉️</span>
              <span>{SUPPORT_EMAIL}</span>
            </a>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full text-muted-foreground"
        >
          ログアウト
        </Button>
      </div>
    </div>
  )
}
