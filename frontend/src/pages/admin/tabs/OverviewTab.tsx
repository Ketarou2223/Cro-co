import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity, Users, Clock, CheckCircle, XCircle,
  Heart, MessageSquare, AlertTriangle,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import api from '@/lib/api'
import type { AdminStats } from '../types'

interface TimeSeriesPoint { date: string; count: number; cumulative: number }
interface StatsTimeSeriesResponse {
  registrations: TimeSeriesPoint[]
  matches: TimeSeriesPoint[]
}
interface FacultyBreakdown { faculty: string; count: number; male: number; female: number }
interface StatsBreakdownResponse {
  by_faculty: FacultyBreakdown[]
  by_gender: Record<string, number>
  by_year: Record<string, number>
}

function KpiCard({
  Icon, label, value, alert, sub,
}: {
  Icon: typeof Activity
  label: string
  value: number | undefined
  alert?: boolean
  sub?: string
}) {
  return (
    <div
      className={`card-bold rounded-[14px] p-4 space-y-1 ${alert ? 'bg-hot text-white' : 'bg-white'}`}
    >
      <div className="flex items-center justify-between">
        <Icon className={`w-5 h-5 ${alert ? 'text-white/80' : 'text-ink/50'}`} />
        {sub && (
          <span className={`font-mono text-[9px] uppercase tracking-wide ${alert ? 'text-white/60' : 'text-muted'}`}>
            {sub}
          </span>
        )}
      </div>
      <p className={`font-mono text-3xl font-bold leading-none ${alert ? 'text-white' : 'text-ink'}`}>
        {value ?? '—'}
      </p>
      <p className={`font-mono text-[10px] uppercase tracking-wide ${alert ? 'text-white/80' : 'text-muted'}`}>
        {label}
      </p>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border-2 border-ink rounded-lg px-3 py-2 shadow-md text-xs font-mono">
      <p className="text-muted mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function OverviewTab() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<AdminStats>('/api/admin/stats').then((r) => r.data),
    staleTime: 60_000,
  })

  const [days, setDays] = useState<7 | 30 | 90>(30)

  const { data: timeseries } = useQuery({
    queryKey: ['admin-stats-timeseries', days],
    queryFn: () =>
      api.get<StatsTimeSeriesResponse>(`/api/admin/stats/timeseries?days=${days}`).then((r) => r.data),
    staleTime: 120_000,
  })

  const { data: breakdown } = useQuery({
    queryKey: ['admin-stats-breakdown'],
    queryFn: () =>
      api.get<StatsBreakdownResponse>('/api/admin/stats/breakdown').then((r) => r.data),
    staleTime: 120_000,
  })

  const chartData = (timeseries?.registrations ?? []).map((r, i) => ({
    date: r.date.slice(5),
    登録: r.count,
    累計: r.cumulative,
    マッチ: timeseries?.matches[i]?.count ?? 0,
  }))

  const facultyData = (breakdown?.by_faculty ?? []).slice(0, 8).map((f) => ({
    name: f.faculty.length > 6 ? f.faculty.slice(0, 6) + '…' : f.faculty,
    男性: f.male,
    女性: f.female,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard Icon={Users} label="総ユーザー" value={stats?.total_users} />
        <KpiCard Icon={Activity} label="本日アクティブ" value={stats?.active_today} sub="DAU" />
        <KpiCard Icon={Clock} label="審査待ち" value={stats?.pending_count} alert={(stats?.pending_count ?? 0) > 0} />
        <KpiCard Icon={AlertTriangle} label="未対応通報" value={stats?.total_reports} alert={(stats?.total_reports ?? 0) > 0} />
        <KpiCard Icon={CheckCircle} label="承認済み" value={stats?.approved_count} />
        <KpiCard Icon={XCircle} label="却下" value={stats?.rejected_count} />
        <KpiCard Icon={Heart} label="総マッチ" value={stats?.total_matches} />
        <KpiCard Icon={MessageSquare} label="総メッセージ" value={stats?.total_messages} />
      </div>

      <div className="card-bold rounded-[14px] bg-white p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="font-mono text-xs font-bold uppercase tracking-wide text-ink">
            登録・マッチ推移
          </p>
          <div className="flex gap-1">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`font-mono text-[10px] font-bold px-2 py-1 border-2 border-ink ${
                  days === d ? 'bg-ink text-white' : 'bg-white text-ink'
                }`}
                style={{ borderRadius: 4 }}
              >
                {d}日
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fontFamily: 'monospace' }}
              interval={Math.max(0, Math.floor(chartData.length / 6))}
            />
            <YAxis tick={{ fontSize: 9, fontFamily: 'monospace' }} width={28} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
            <Line type="monotone" dataKey="登録" stroke="#FF3B6B" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="マッチ" stroke="#A8F0D1" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="累計" stroke="#DFFF1F" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {facultyData.length > 0 && (
        <div className="card-bold rounded-[14px] bg-white p-4 space-y-3">
          <p className="font-mono text-xs font-bold uppercase tracking-wide text-ink">
            学部別（承認済み・上位8件）
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={facultyData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 9, fontFamily: 'monospace' }} width={28} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 9, fontFamily: 'monospace' }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
              <Bar dataKey="男性" fill="#6BB5FF" stackId="a" />
              <Bar dataKey="女性" fill="#FF7DA8" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {breakdown && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card-bold rounded-[14px] bg-white p-4 space-y-2">
            <p className="font-mono text-xs font-bold uppercase">性別比率</p>
            <div className="space-y-2">
              {Object.entries(breakdown.by_gender).map(([g, count]) => {
                const total = Object.values(breakdown.by_gender).reduce((a, b) => a + b, 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={g}>
                    <div className="flex justify-between mb-0.5">
                      <span className="font-mono text-[10px] text-ink">
                        {g === 'male' ? '男性' : '女性'}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-ink">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-ink/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: g === 'male' ? '#6BB5FF' : '#FF7DA8',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card-bold rounded-[14px] bg-white p-4 space-y-2">
            <p className="font-mono text-xs font-bold uppercase">学年内訳</p>
            <div className="space-y-1.5">
              {Object.entries(breakdown.by_year)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([year, count]) => {
                  const total = Object.values(breakdown.by_year).reduce((a, b) => a + b, 0)
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0
                  return (
                    <div key={year} className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted w-8 shrink-0">{year}年</span>
                      <div className="flex-1 h-2 bg-ink/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: '#DFFF1F' }}
                        />
                      </div>
                      <span className="font-mono text-[10px] font-bold text-ink w-8 text-right shrink-0">
                        {count}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
