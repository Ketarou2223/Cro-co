import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import api from '@/lib/api'

interface BrowseProfileItem {
  id: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  avatar_url: string | null
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ユーザー一覧</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && profiles.length === 0 && (
        <p className="text-muted-foreground text-center py-12">他のユーザーはまだいません</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((profile) => (
          <Card
            key={profile.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/profile/${profile.id}`)}
          >
            <CardContent className="p-4 flex flex-col items-center gap-3">
              <Avatar className="w-20 h-20">
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt="アバター" />
                ) : null}
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                  写真なし
                </AvatarFallback>
              </Avatar>

              <div className="w-full text-center space-y-1">
                <p className="font-semibold text-base">
                  {profile.name ?? '（未設定）'}
                </p>
                {(profile.year != null || profile.faculty) && (
                  <p className="text-sm text-muted-foreground">
                    {[
                      profile.year != null ? `${profile.year}年` : null,
                      profile.faculty,
                    ]
                      .filter(Boolean)
                      .join('・')}
                  </p>
                )}
                {profile.bio && (
                  <p className="text-sm text-muted-foreground text-left">
                    {profile.bio.length > 50
                      ? `${profile.bio.slice(0, 50)}…`
                      : profile.bio}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
