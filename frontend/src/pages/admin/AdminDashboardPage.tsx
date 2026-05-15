import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle,
  Clock,
  Heart,
  MessageSquare,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import api from '@/lib/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'

interface PendingProfile {
  id: string
  email: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  submitted_at: string
  student_id_image_path: string
}

interface AdminStats {
  total_users: number
  pending_count: number
  approved_count: number
  rejected_count: number
  total_matches: number
  total_messages: number
  total_reports: number
  active_today: number
}

interface ReportItem {
  id: string
  reporter_id: string
  reporter_name: string | null
  reported_id: string
  reported_name: string | null
  reason: string
  detail: string | null
  created_at: string
}

type Tab = 'pending' | 'reports'

const MAX_REASON_LENGTH = 500

interface StatCard {
  Icon: LucideIcon
  label: string
  value: number | undefined
  alert: boolean
}

export default function AdminDashboardPage() {
  usePageTitle('管理者ダッシュボード')
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('pending')

  const [profiles, setProfiles] = useState<PendingProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [reports, setReports] = useState<ReportItem[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [suspendingId, setSuspendingId] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)

  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<AdminStats>('/api/admin/stats').then(r => r.data),
  })

  useEffect(() => {
    api
      .get<PendingProfile[]>('/api/admin/pending')
      .then((res) => setProfiles(res.data))
      .catch((err) => {
        if (err.response?.status === 403) {
          setError('管理者権限がありません')
        } else {
          setError('データの取得に失敗しました')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab !== 'reports') return
    setReportsLoading(true)
    api
      .get<ReportItem[]>('/api/admin/reports')
      .then((res) => setReports(res.data))
      .catch(() => setReportsError('通報一覧の取得に失敗しました'))
      .finally(() => setReportsLoading(false))
  }, [tab])

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  const removeProfile = (id: string) =>
    setProfiles((prev) => prev.filter((p) => p.id !== id))

  const handleViewStudentId = async (userId: string) => {
    setSelectedImageUrl(null)
    setImageLoading(true)
    setDialogOpen(true)
    try {
      const res = await api.get<{ signed_url: string }>(`/api/admin/student-id/${userId}`)
      setSelectedImageUrl(res.data.signed_url)
    } catch {
      setSelectedImageUrl(null)
    } finally {
      setImageLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    if (!window.confirm('このユーザーを承認しますか？')) return
    setProcessingId(userId)
    try {
      await api.post(`/api/admin/approve/${userId}`)
      removeProfile(userId)
      showToast('承認しました')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        '承認処理に失敗しました'
      alert(msg)
    } finally {
      setProcessingId(null)
    }
  }

  const openRejectDialog = (userId: string) => {
    setRejectTargetId(userId)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  const handleReject = async () => {
    if (!rejectTargetId) return
    setProcessingId(rejectTargetId)
    try {
      await api.post(`/api/admin/reject/${rejectTargetId}`, { reason: rejectReason })
      setRejectDialogOpen(false)
      removeProfile(rejectTargetId)
      showToast('却下しました')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        '却下処理に失敗しました'
      alert(msg)
    } finally {
      setProcessingId(null)
      setRejectTargetId(null)
    }
  }

  const handleSuspend = async (userId: string, userName: string | null) => {
    if (!window.confirm(`${userName ?? 'このユーザー'}を通報による停止にしますか？`)) return
    setSuspendingId(userId)
    try {
      await api.post(`/api/admin/suspend/${userId}`)
      showToast('停止しました')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        '停止処理に失敗しました'
      alert(msg)
    } finally {
      setSuspendingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="font-mono text-ink/50">読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-hot font-bold">{error}</p>
      </div>
    )
  }

  const STAT_CARDS: StatCard[] = [
    { Icon: Users, label: '総ユーザー数', value: stats?.total_users, alert: false },
    { Icon: Clock, label: '審査待ち', value: stats?.pending_count, alert: false },
    { Icon: CheckCircle, label: '承認済み', value: stats?.approved_count, alert: false },
    { Icon: XCircle, label: '却下済み', value: stats?.rejected_count, alert: false },
    { Icon: Heart, label: '総マッチ数', value: stats?.total_matches, alert: false },
    { Icon: MessageSquare, label: '総メッセージ数', value: stats?.total_messages, alert: false },
    { Icon: AlertTriangle, label: '未対応通報', value: stats?.total_reports, alert: true },
    { Icon: Activity, label: '本日アクティブ', value: stats?.active_today, alert: false },
  ]

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 bg-white min-h-screen">
      {/* 戻るボタン */}
      <div>
        <Button variant="outline-bold" size="sm" className="gap-1.5" onClick={() => navigate('/settings')}>
          <ArrowLeft className="w-3.5 h-3.5" />
          設定に戻る
        </Button>
      </div>

      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">管理者ダッシュボード</h1>
        <span className="font-mono text-xs bg-hot text-white border-2 border-ink px-3 py-1">
          ADMIN ONLY
        </span>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className={`card-bold rounded-[14px] p-4 text-center space-y-1 ${
              card.alert ? 'bg-hot text-white' : 'bg-white'
            }`}
          >
            <div className="flex justify-center">
              <card.Icon className={`w-7 h-7 ${card.alert ? 'text-white' : 'text-ink/60'}`} />
            </div>
            <p className={`font-mono text-3xl font-bold ${card.alert ? 'text-white' : 'text-ink'}`}>
              {card.value ?? '—'}
            </p>
            <p className={`text-xs font-bold uppercase font-mono ${card.alert ? 'text-white/80' : 'text-ink/50'}`}>
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* トースト */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-ink text-white border-2 border-ink px-4 py-2 rounded-lg shadow-lg text-sm font-bold"
          style={{ boxShadow: '4px 4px 0 0 #0A0A0A' }}>
          {toast}
        </div>
      )}

      {/* タブ */}
      <div className="flex border-2 border-ink rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
            tab === 'pending'
              ? 'bg-ink text-white'
              : 'bg-white text-ink hover:bg-gray-50'
          }`}
        >
          審査待ち（{profiles.length}）
        </button>
        <button
          type="button"
          onClick={() => setTab('reports')}
          className={`flex-1 py-2.5 text-sm font-bold transition-colors border-l-2 border-ink ${
            tab === 'reports'
              ? 'bg-ink text-white'
              : 'bg-white text-ink hover:bg-gray-50'
          }`}
        >
          通報一覧
        </button>
      </div>

      {/* 審査待ちタブ */}
      {tab === 'pending' && (
        <div className="space-y-4">
          {profiles.length === 0 ? (
            <div className="card-bold rounded-[18px] bg-white p-6 text-center">
              <p className="font-mono text-sm text-ink/50">審査待ちのユーザーはいません</p>
            </div>
          ) : (
            profiles.map((profile) => {
              const isProcessing = processingId === profile.id
              return (
                <div key={profile.id} className="card-bold bg-white rounded-[18px] p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-ink">{profile.email}</p>
                      <p className="font-mono text-xs text-ink/50">
                        提出: {new Date(profile.submitted_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm bg-acid/20 rounded-lg p-3">
                    <div>
                      <span className="text-xs font-mono text-ink/50">名前</span>
                      <p className="font-medium text-ink">{profile.name ?? '未設定'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-mono text-ink/50">学年</span>
                      <p className="font-medium text-ink">{profile.year != null ? `${profile.year}年` : '未設定'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-mono text-ink/50">学部</span>
                      <p className="font-medium text-ink">{profile.faculty ?? '未設定'}</p>
                    </div>
                  </div>

                  {profile.bio && (
                    <p className="text-sm text-ink/70 border-l-2 border-ink pl-3">{profile.bio}</p>
                  )}

                  <div className="flex gap-2 pt-1 flex-wrap">
                    <Button
                      variant="outline-bold"
                      size="sm"
                      disabled={isProcessing}
                      onClick={() => handleViewStudentId(profile.id)}
                    >
                      学生証を見る
                    </Button>
                    <Button
                      variant="acid"
                      size="sm"
                      disabled={isProcessing}
                      onClick={() => handleApprove(profile.id)}
                    >
                      {isProcessing ? '処理中...' : '✓ 承認'}
                    </Button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => openRejectDialog(profile.id)}
                      className="inline-flex items-center justify-center h-7 gap-1 rounded-lg border-2 border-hot text-hot bg-white font-bold text-sm px-2.5 shadow-[4px_4px_0_0_#FF3B6B] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#FF3B6B] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#FF3B6B] transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isProcessing ? '処理中...' : '✕ 却下'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* 通報一覧タブ */}
      {tab === 'reports' && (
        <div className="space-y-4">
          {reportsLoading && (
            <p className="font-mono text-sm text-ink/50">読み込み中...</p>
          )}
          {reportsError && (
            <p className="text-hot font-bold text-sm">{reportsError}</p>
          )}
          {!reportsLoading && !reportsError && reports.length === 0 && (
            <div className="card-bold rounded-[18px] bg-white p-6 text-center">
              <p className="font-mono text-sm text-ink/50">通報はありません</p>
            </div>
          )}
          {reports.map((report) => (
            <div key={report.id} className="card-bold bg-white rounded-[18px] p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-xs font-mono text-ink/50">通報者</span>
                  <p className="font-medium text-ink">{report.reporter_name ?? '（名前未設定）'}</p>
                </div>
                <div>
                  <span className="text-xs font-mono text-ink/50">通報された人</span>
                  <p className="font-medium text-ink">{report.reported_name ?? '（名前未設定）'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-acid border-2 border-ink font-mono text-xs px-2 py-0.5 inline-block">
                  {report.reason}
                </span>
                <span className="text-xs text-ink/50 font-mono">
                  {new Date(report.created_at).toLocaleString('ja-JP')}
                </span>
              </div>

              {report.detail && (
                <div className="text-sm bg-acid/20 rounded-lg p-3 border border-ink/10">
                  <span className="text-xs font-mono text-ink/50">詳細: </span>
                  <span className="text-ink">{report.detail}</span>
                </div>
              )}

              <button
                type="button"
                disabled={suspendingId === report.reported_id}
                onClick={() => handleSuspend(report.reported_id, report.reported_name)}
                className="inline-flex items-center justify-center h-8 gap-1.5 rounded-lg border-2 border-ink bg-hot text-white font-bold text-sm px-3 shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                <Ban className="w-4 h-4" />
                {suspendingId === report.reported_id ? '処理中...' : 'ユーザーを停止'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 学生証表示 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">学生証</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-40">
            {imageLoading && (
              <p className="font-mono text-sm text-ink/50">読み込み中...</p>
            )}
            {!imageLoading && selectedImageUrl && (
              <img
                src={selectedImageUrl}
                alt="学生証"
                className="max-w-full max-h-96 object-contain rounded"
              />
            )}
            {!imageLoading && !selectedImageUrl && (
              <p className="text-hot font-bold text-sm">画像の取得に失敗しました</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 却下理由入力 AlertDialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">却下理由を入力してください</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder="例：学生証の画像が不鮮明です"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
              rows={4}
              disabled={processingId === rejectTargetId}
              className="border-2 border-ink"
            />
            <p className="text-xs text-ink/40 font-mono text-right">
              {rejectReason.length} / {MAX_REASON_LENGTH}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingId === rejectTargetId}>
              キャンセル
            </AlertDialogCancel>
            <button
              type="button"
              disabled={rejectReason.trim().length === 0 || processingId === rejectTargetId}
              onClick={handleReject}
              className="inline-flex items-center justify-center h-8 gap-1 rounded-lg border-2 border-hot bg-hot text-white font-bold text-sm px-4 shadow-[4px_4px_0_0_#FF3B6B] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#FF3B6B] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#FF3B6B] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {processingId === rejectTargetId ? '処理中...' : '却下する'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
