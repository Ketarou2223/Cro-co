import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import Layout from '@/components/Layout'
import api from '@/lib/api'

interface BrowseProfileItem {
  id: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  avatar_url: string | null
  is_liked: boolean
}

export default function BrowsePage() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState<BrowseProfileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<BrowseProfileItem[]>('/api/profiles')
      .then((res) => setProfiles(res.data))
      .catch(() => setError('ユーザー一覧の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout>
      <div className="px-4 py-5 space-y-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">みんなを見る</h1>
            {!loading && !error && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {profiles.length}人が登録中
              </p>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ローディング skeleton */}
        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <Skeleton className="w-full aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 空状態 */}
        {!loading && !error && profiles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-6xl">🌵</div>
            <p className="text-base font-medium text-center">まだ誰もいません</p>
            <p className="text-sm text-muted-foreground text-center">
              友達を招待してみよう！
            </p>
          </div>
        )}

        {/* プロフィールグリッド */}
        {!loading && !error && profiles.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left w-full"
                onClick={() => navigate(`/profile/${profile.id}`)}
              >
                {/* アバター */}
                <div className="relative w-full aspect-square bg-muted">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name ?? 'アバター'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-muted-foreground">
                      👤
                    </div>
                  )}
                  {/* いいね済みバッジ */}
                  {profile.is_liked && (
                    <div className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                      ♥ いいね
                    </div>
                  )}
                </div>

                {/* 情報 */}
                <div className="p-3 space-y-0.5">
                  <p className="font-semibold text-sm truncate">
                    {profile.name ?? '（未設定）'}
                  </p>
                  {(profile.year != null || profile.faculty) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[
                        profile.year != null ? `${profile.year}年` : null,
                        profile.faculty,
                      ]
                        .filter(Boolean)
                        .join('・')}
                    </p>
                  )}
                  {profile.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed pt-0.5">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
