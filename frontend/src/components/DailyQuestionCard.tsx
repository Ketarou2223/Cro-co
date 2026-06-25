import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import api from '@/lib/api'
import DailyStatsBar from '@/components/DailyStatsBar'

interface DailyOption {
  key: string
  label: string
}

interface DailyQuestion {
  id: string
  body: string
  options: DailyOption[]
}

interface DailyStats {
  total: number
  counts: Record<string, number>
  percentages: Record<string, number>
}

interface DailyToday {
  question: DailyQuestion | null
  answered: boolean
  my_choice: string | null
  stats: DailyStats | null
}

export default function DailyQuestionCard() {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['daily-today'],
    queryFn: () => api.get<DailyToday>('/api/daily/today').then(r => r.data),
    staleTime: 60 * 1000,
  })

  const answer = useMutation({
    mutationFn: (choice: string) =>
      api.post<{ answered: boolean; my_choice: string }>('/api/daily/answer', { choice }),
    onMutate: (choice) => {
      const previous = queryClient.getQueryData<DailyToday>(['daily-today'])
      queryClient.setQueryData<DailyToday>(['daily-today'], (old) =>
        old ? { ...old, answered: true, my_choice: choice } : old
      )
      return { previous }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-today'] })
    },
    onError: (err, _choice, ctx) => {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        queryClient.invalidateQueries({ queryKey: ['daily-today'] })
        return
      }
      if (ctx?.previous) {
        queryClient.setQueryData<DailyToday>(['daily-today'], ctx.previous)
      }
    },
  })

  if (!data?.question) return null

  const { question, answered, my_choice, stats } = data

  return (
    <section
      className="mx-4 mt-4 mb-4 card-bold bg-white p-4"
      style={{ borderLeft: '4px solid var(--color-brand)' }}
    >
      <p
        className="font-mono font-bold text-xs mb-0.5 tracking-widest"
        style={{ color: 'var(--color-brand)' }}
      >
        TODAY'S Q
      </p>
      <p className="text-[11px] text-ink/50 mb-2 leading-snug">
        毎日の質問。回答すると、あなたのプロフィールにも表示されます。
      </p>
      <p className="font-bold text-ink text-base mb-3 leading-snug">{question.body}</p>
      {answered ? (
        <>
          <p className="text-sm text-ink/60 mb-2">
            今日の回答：<span className="font-bold text-ink">{question.options.find(o => o.key === my_choice)?.label ?? my_choice}</span>
          </p>
          {stats && (
            <DailyStatsBar
              options={question.options}
              percentages={stats.percentages}
              counts={stats.counts}
              highlightKey={my_choice}
            />
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {question.options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              disabled={answer.isPending}
              onClick={() => answer.mutate(opt.key)}
              className="w-full py-2.5 px-4 text-sm font-bold text-left border-2 border-ink rounded-lg bg-white text-ink transition-all duration-150 hover:bg-bone disabled:opacity-50"
              style={{ boxShadow: '2px 2px 0 0 #0A0A0A' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
