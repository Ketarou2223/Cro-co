import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

interface ProfileDetail {
  id: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  created_at: string
  avatar_url: string | null
  is_liked: boolean
}

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [profile, setProfile] = useState<ProfileDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  const [likeError, setLikeError] = useState<string | null>(null)

  const isSelf = user?.id === id

  useEffect(() => {
    if (!id) return
    api
      .get<ProfileDetail>(`/api/profiles/${id}`)
      .then((res) => {
        setProfile(res.data)
        setIsLiked(res.data.is_liked)
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setNotFound(true)
        } else {
          setError('プロフィールの取得に失敗しました')
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleLike = async () => {
    if (!profile || isLiked || liking) return
    setLiking(true)
    setLikeError(null)
    try {
      await api.post('/api/likes', { liked_id: profile.id })
      setIsLiked(true)
    } catch {
      setLikeError('いいねに失敗しました。もう一度お試しください。')
    } finally {
      setLiking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium">ユーザーが見つかりません</p>
        <Button variant="outline" onClick={() => navigate('/browse')}>
          ← 一覧に戻る
        </Button>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen p-6 max-w-lg mx-auto pt-10">
        <Alert variant="destructive">
          <AlertDescription>{error ?? '予期しないエラーが発生しました'}</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/browse')}>
          ← 一覧に戻る
        </Button>
      </div>
    )
  }

  const registeredAt = new Date(profile.created_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto">
      <Button
        variant="ghost"
        className="mb-6 -ml-2"
        onClick={() => navigate('/browse')}
      >
        ← 一覧に戻る
      </Button>

      <div className="flex flex-col items-center gap-4">
        <Avatar className="w-[200px] h-[200px]">
          {profile.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt="アバター" />
          ) : null}
          <AvatarFallback className="bg-muted text-muted-foreground text-lg">
            写真なし
          </AvatarFallback>
        </Avatar>

        <h1 className="text-2xl font-bold text-center">
          {profile.name ?? '（未設定）'}
        </h1>

        {(profile.year != null || profile.faculty) && (
          <p className="text-muted-foreground text-center">
            {[
              profile.year != null ? `${profile.year}年` : null,
              profile.faculty,
            ]
              .filter(Boolean)
              .join('・')}
          </p>
        )}

        {profile.bio && (
          <p className="w-full text-sm leading-relaxed whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}

        <p className="text-xs text-muted-foreground self-start">
          登録日：{registeredAt}
        </p>

        {likeError && (
          <Alert variant="destructive" className="w-full">
            <AlertDescription>{likeError}</AlertDescription>
          </Alert>
        )}

        <div className="w-full pt-4">
          {isSelf ? (
            <p className="text-center text-muted-foreground text-sm">
              （自分のプロフィール）
            </p>
          ) : (
            <div className="flex gap-3 justify-center">
              <Button
                variant={isLiked ? 'secondary' : 'outline'}
                className={`flex-1 max-w-[160px] ${isLiked ? 'text-pink-500' : ''}`}
                disabled={isLiked || liking}
                onClick={handleLike}
              >
                {liking ? '処理中...' : isLiked ? '♥ いいね済み' : '♡ いいね'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 max-w-[160px] hover:bg-muted/60 transition-colors"
                onClick={() => navigate('/browse')}
              >
                × スキップ
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
