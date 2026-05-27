import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, EyeOff, User } from 'lucide-react'
import Layout from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/contexts/ToastContext'
import api from '@/lib/api'

interface SafetyUserItem {
  id: string
  name: string | null
  avatar_url: string | null
}

type SafetyTab = 'block' | 'hide'

function Avatar({ user }: { user: SafetyUserItem }) {
  return (
    <div className="w-11 h-11 rounded-full border-2 border-ink overflow-hidden shrink-0">
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.name ?? ''}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <User className="w-5 h-5 text-gray-400" />
        </div>
      )}
    </div>
  )
}

export default function SafetyListPage() {
  usePageTitle('ブロック・非表示')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const tab: SafetyTab = searchParams.get('tab') === 'hide' ? 'hide' : 'block'
  const changeTab = (next: SafetyTab) => setSearchParams({ tab: next }, { replace: true })

  const {
    data: blocks = [],
    isLoading: blocksLoading,
    isError: blocksError,
  } = useQuery({
    queryKey: ['safety-blocks'],
    queryFn: () => api.get<SafetyUserItem[]>('/api/safety/blocks').then((r) => r.data),
    staleTime: 30_000,
  })

  const {
    data: hides = [],
    isLoading: hidesLoading,
    isError: hidesError,
  } = useQuery({
    queryKey: ['safety-hides'],
    queryFn: () => api.get<SafetyUserItem[]>('/api/safety/hides').then((r) => r.data),
    staleTime: 30_000,
  })

  const unhide = useMutation({
    mutationFn: (userId: string) => api.delete(`/api/safety/hide/${userId}`),
    onSuccess: (_res, userId) => {
      const name = hides.find((h) => h.id === userId)?.name ?? '相手'
      queryClient.invalidateQueries({ queryKey: ['safety-hides'] })
      showToast(`${name}の非表示を解除しました`)
    },
    onError: () => {
      showToast('うまくいかなかった。もう一度試してみて。')
    },
  })

  return (
    <Layout>
      <div className="px-4 pt-5 pb-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 font-mono text-sm font-bold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </button>

        <h1
          className="font-display text-3xl text-ink"
          style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 }}
        >
          ブロック・非表示
        </h1>

        <div className="flex border-2 border-ink rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => changeTab('block')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold transition-colors ${
              tab === 'block' ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-gray-50'
            }`}
          >
            <Ban className="w-4 h-4" />
            ブロック
          </button>
          <button
            type="button"
            onClick={() => changeTab('hide')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold transition-colors border-l-2 border-ink ${
              tab === 'hide' ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-gray-50'
            }`}
          >
            <EyeOff className="w-4 h-4" />
            非表示
          </button>
        </div>

        {tab === 'block' && (
          <div className="space-y-2">
            {blocksLoading ? (
              <p className="font-mono text-sm text-muted">探してます、ちょっと待って。</p>
            ) : blocksError ? (
              <p className="font-mono text-sm text-muted">うまくいかなかった。もう一度試してみて。</p>
            ) : blocks.length === 0 ? (
              <div className="card-bold bg-white p-8 flex flex-col items-center gap-3">
                <Ban className="w-12 h-12 text-ink/20" />
                <p className="font-mono text-sm text-muted">ブロックしてる人はいない。</p>
              </div>
            ) : (
              <>
                {blocks.map((u) => (
                  <div key={u.id} className="card-bold bg-white flex items-center gap-3 p-3">
                    <Avatar user={u} />
                    <span className="flex-1 min-w-0 font-bold text-sm text-ink truncate">
                      {u.name ?? '（名前未設定）'}
                    </span>
                    <span className="font-mono text-xs text-muted shrink-0">ブロック中</span>
                  </div>
                ))}
                <p className="font-mono text-xs text-muted leading-relaxed pt-1">
                  ※ ブロックは取り消せません。誤ブロックの場合はサポートまでご連絡ください。
                </p>
              </>
            )}
          </div>
        )}

        {tab === 'hide' && (
          <div className="space-y-2">
            {hidesLoading ? (
              <p className="font-mono text-sm text-muted">探してます、ちょっと待って。</p>
            ) : hidesError ? (
              <p className="font-mono text-sm text-muted">うまくいかなかった。もう一度試してみて。</p>
            ) : hides.length === 0 ? (
              <div className="card-bold bg-white p-8 flex flex-col items-center gap-3">
                <EyeOff className="w-12 h-12 text-ink/20" />
                <p className="font-mono text-sm text-muted">非表示にしてる人はいない。</p>
              </div>
            ) : (
              hides.map((u) => (
                <div key={u.id} className="card-bold bg-white flex items-center gap-3 p-3">
                  <Avatar user={u} />
                  <span className="flex-1 min-w-0 font-bold text-sm text-ink truncate">
                    {u.name ?? '（名前未設定）'}
                  </span>
                  <Button
                    variant="outline-bold"
                    size="sm"
                    className="shrink-0"
                    disabled={unhide.isPending}
                    onClick={() => unhide.mutate(u.id)}
                  >
                    解除
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
