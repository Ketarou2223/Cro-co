import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import api from '@/lib/api'

interface MatchedUser {
  user_id: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  avatar_url: string | null
  matched_at: string
}

const formatMatchedAt = (dateStr: string) =>
  new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr))

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<MatchedUser[]>('/api/matches/')
      .then((res) => setMatches(res.data))
      .catch(() => setError('マッチ一覧の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">マッチ一覧</h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/home">ホームへ</Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && matches.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground text-lg">まだマッチしていません</p>
          <p className="text-muted-foreground text-sm">
            いいねし合うとマッチが成立します
          </p>
          <Button asChild variant="default">
            <Link to="/browse">ユーザーを探す</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {matches.map((m) => (
          <Card
            key={m.user_id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => { window.location.href = `/profile/${m.user_id}` }}
          >
            <CardContent className="pt-4">
              <div className="flex gap-4 items-start">
                {/* アバター */}
                <Avatar className="w-20 h-20 shrink-0">
                  {m.avatar_url ? (
                    <AvatarImage src={m.avatar_url} alt={m.name ?? '相手'} />
                  ) : null}
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {m.name ? m.name.charAt(0) : '?'}
                  </AvatarFallback>
                </Avatar>

                {/* 情報 */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    {m.name ?? '（名前未設定）'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {[
                      m.year != null ? `${m.year}年` : null,
                      m.faculty ?? null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '（未設定）'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatMatchedAt(m.matched_at)} マッチ
                  </p>
                </div>
              </div>

              {/* ボタン群 */}
              <div
                className="mt-4 flex gap-2 flex-wrap"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Phase 6で実装 */}
                <Button
                  size="sm"
                  disabled
                  title="メッセージ機能は準備中です（Phase 6で実装予定）"
                  className="cursor-not-allowed"
                >
                  メッセージを送る
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/profile/${m.user_id}`}>プロフィールを見る</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
