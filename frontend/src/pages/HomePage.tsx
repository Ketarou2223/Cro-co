import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import Layout from '@/components/Layout'
import api from '@/lib/api'

interface Profile {
  id: string
  email: string
  created_at: string
  updated_at: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  profile_image_path: string | null
}

export default function HomePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [matchCount, setMatchCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<Profile>('/api/profile/me')
      .then((res) => {
        setProfile(res.data)
        if (res.data.profile_image_path) {
          return api.get<{ signed_url: string | null }>('/api/profile/avatar-url')
        }
        return null
      })
      .then((urlRes) => {
        if (urlRes) setAvatarUrl(urlRes.data.signed_url)
      })
      .catch(() => setError('プロフィールの取得に失敗しました'))
      .finally(() => setLoading(false))

    api
      .get<{ user_id: string }[]>('/api/matches/')
      .then((res) => setMatchCount(res.data.length))
      .catch(() => setMatchCount(null))
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (e) {
      console.error('[HomePage] signOut error:', e)
    }
  }

  const completionFields = profile
    ? [
        !!profile.name,
        profile.year != null,
        !!profile.faculty,
        !!profile.bio,
        !!profile.profile_image_path,
      ]
    : []
  const completedCount = completionFields.filter(Boolean).length
  const completionPct = profile
    ? Math.round((completedCount / completionFields.length) * 100)
    : 0

  const logoutBtn = (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="text-muted-foreground text-xs h-8 px-3"
    >
      ログアウト
    </Button>
  )

  return (
    <Layout headerRight={logoutBtn}>
      <div className="px-4 py-6 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ユーザーヒーローエリア */}
        <div className="flex flex-col items-center gap-3 pt-2 pb-2">
          {loading ? (
            <>
              <Skeleton className="w-[120px] h-[120px] rounded-full" />
              <Skeleton className="w-32 h-6 rounded-lg" />
              <Skeleton className="w-44 h-4 rounded-lg" />
            </>
          ) : (
            <>
              <div className="w-[120px] h-[120px] rounded-full bg-muted overflow-hidden ring-4 ring-primary/20 shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="アバター"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl text-muted-foreground">
                    👤
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-center">
                {profile?.name ?? '（名前未設定）'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {profile?.email ?? user?.email}
              </p>
            </>
          )}
        </div>

        {/* プロフィール完成度 */}
        {!loading && profile && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">プロフィール完成度</span>
              <span
                className={`font-bold text-base ${
                  completionPct === 100 ? 'text-primary' : 'text-amber-500'
                }`}
              >
                {completionPct}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            {completionPct < 100 && (
              <p className="text-xs text-muted-foreground">
                プロフィールを充実させて、もっとマッチしやすくなろう！
              </p>
            )}
          </div>
        )}

        {/* プロフィール情報 */}
        {loading ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>
        ) : profile ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎓</span>
              <div>
                <p className="text-xs text-muted-foreground">学年・学部</p>
                <p className="text-sm font-medium">
                  {[
                    profile.year != null ? `${profile.year}年` : null,
                    profile.faculty,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '（未設定）'}
                </p>
              </div>
            </div>
            {profile.bio && (
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">✍️</span>
                <div>
                  <p className="text-xs text-muted-foreground">自己紹介</p>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* クイックアクション */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            asChild
            variant="outline"
            className="h-14 flex-col gap-1 rounded-2xl border-border bg-white shadow-sm"
          >
            <Link to="/profile/edit">
              <span className="text-lg">✏️</span>
              <span className="text-xs font-medium">プロフィール編集</span>
            </Link>
          </Button>
          <Button
            asChild
            className="h-14 flex-col gap-1 rounded-2xl shadow-sm"
          >
            <Link to="/browse">
              <span className="text-lg">🔍</span>
              <span className="text-xs font-medium">みんなを見る</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            className="h-14 flex-col gap-1 rounded-2xl col-span-2 shadow-sm"
          >
            <Link to="/matches">
              <span className="text-lg">💕</span>
              <span className="text-xs font-medium">
                マッチ一覧
                {matchCount != null ? `（${matchCount}件）` : ''}
              </span>
            </Link>
          </Button>
        </div>

        <div className="text-center pt-2">
          <Link
            to="/debug"
            className="text-xs text-muted-foreground underline underline-offset-4"
          >
            デバッグ
          </Link>
        </div>
      </div>
    </Layout>
  )
}
