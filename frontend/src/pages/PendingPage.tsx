import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PendingPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (e) {
      console.error('[PendingPage] signOut error:', e)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">審査中です</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            現在、運営による本人確認の審査中です。
          </p>
          <p className="text-xs text-muted-foreground">
            ※ Phase 3bで学生証アップロード機能を実装予定
          </p>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            ログアウト
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
