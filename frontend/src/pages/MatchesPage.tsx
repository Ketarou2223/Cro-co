import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import Layout from '@/components/Layout'
import api from '@/lib/api'

interface MatchedUser {
  match_id: string
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
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr))

export default function MatchesPage() {
  const navigate = useNavigate()
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

  return (
    <Layout>
      <div className="px-4 py-5 space-y-4">
        {/* ヘッダー */}
        <div>
          <h1 className="text-xl font-bold">マッチ一覧</h1>
          {!loading && !error && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {matches.length > 0
                ? `${matches.length}人とマッチ中 💕`
                : 'まだマッチしていません'}
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ローディング */}
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex gap-4">
                <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <Skeleton className="h-3 w-1/3 rounded" />
                  <Skeleton className="h-8 w-28 rounded-lg mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 空状態 */}
        {!loading && !error && matches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="text-6xl">💭</div>
            <div className="text-center">
              <p className="font-semibold text-base">まだマッチしていません</p>
              <p className="text-sm text-muted-foreground mt-1">
                いいねし合うとマッチが成立します
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link to="/browse">みんなを見てみる</Link>
            </Button>
          </div>
        )}

        {/* マッチリスト */}
        {!loading && !error && matches.length > 0 && (
          <div className="space-y-3">
            {matches.map((m) => (
              <div
                key={m.user_id}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
                <div className="flex gap-4 items-center">
                  {/* アバター */}
                  <button
                    type="button"
                    onClick={() => { window.location.href = `/profile/${m.user_id}` }}
                    className="shrink-0"
                  >
                    <div className="w-16 h-16 rounded-full bg-muted overflow-hidden ring-2 ring-primary/10">
                      {m.avatar_url ? (
                        <img
                          src={m.avatar_url}
                          alt={m.name ?? '相手'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground">
                          👤
                        </div>
                      )}
                    </div>
                  </button>

                  {/* 情報 */}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold truncate">
                      {m.name ?? '（名前未設定）'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {[
                        m.year != null ? `${m.year}年` : null,
                        m.faculty ?? null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '（未設定）'}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {formatMatchedAt(m.matched_at)} マッチ
                    </p>
                  </div>
                </div>

                {/* ボタン群 */}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white border-0"
                    onClick={() => navigate(`/chat/${m.match_id}`)}
                  >
                    💬 メッセージ
                  </Button>
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link to={`/profile/${m.user_id}`}>プロフィール</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
