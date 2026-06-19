// 解説: このファイルは管理者ダッシュボードページを定義する（/admin）。
// 解説: AdminGuard がアクセス制御 → 管理者以外は弾かれる
// 解説: タブ構成: 概要 / ユーザー管理 / 審査（学生証）/ 写真審査 / 通報 / 問い合わせ / ログ
// 解説: AdminToastProvider = 管理者操作後の成功・エラーメッセージを表示するコンテキスト（各タブが useAdminToast() で呼ぶ）
// 解説: GET /api/admin/pending 等でカウントを取得し、未処理数をタブバッジに表示する
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/hooks/usePageTitle'
import AdminTabBar from './components/AdminTabBar'
import { AdminToastProvider } from './components/AdminToast'
import OverviewTab from './tabs/OverviewTab'
import UsersTab from './tabs/UsersTab'
import PendingTab from './tabs/PendingTab'
import PhotoReviewTab from './tabs/PhotoReviewTab'
import ReportsTab from './tabs/ReportsTab'
import InquiriesTab from './tabs/InquiriesTab'
import LogsTab from './tabs/LogsTab'
import AnnouncementsTab from './tabs/AnnouncementsTab'
import MaintenanceTab from './tabs/MaintenanceTab'
import type { AdminStats, AdminTab } from './types'

const VALID_TABS: AdminTab[] = ['overview', 'users', 'pending', 'photos', 'reports', 'inquiries', 'logs', 'announcements', 'maintenance']

export default function AdminDashboardPage() {
  usePageTitle('管理者ダッシュボード')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabParam = searchParams.get('tab')
  const initial: AdminTab = VALID_TABS.includes(tabParam as AdminTab)
    ? (tabParam as AdminTab)
    : 'users'
  const [tab, setTab] = useState<AdminTab>(initial)

  const handleTabChange = (t: AdminTab) => {
    setTab(t)
    setSearchParams({ tab: t }, { replace: true })
  }

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<AdminStats>('/api/admin/stats').then((r) => r.data),
    staleTime: 60_000,
  })

  const { data: pendingPhotos } = useQuery({
    queryKey: ['admin-pending-photos-count'],
    queryFn: () => api.get<{ id: string }[]>('/api/admin/photos/pending').then((r) => r.data),
    staleTime: 30_000,
  })

  return (
    <AdminToastProvider>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 bg-white min-h-screen">
        <div>
          <Button
            variant="outline-bold"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate('/settings')}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            設定に戻る
          </Button>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="font-display text-2xl sm:text-3xl text-ink">管理ダッシュボード</h1>
          <span className="font-mono text-[11px] bg-hot text-white border-2 border-ink px-2 py-0.5">
            ADMIN ONLY
          </span>
        </div>

        <AdminTabBar
          active={tab}
          onChange={handleTabChange}
          pendingCount={stats?.pending_count}
          pendingPhotoCount={pendingPhotos?.length}
          reportPendingCount={stats?.total_reports}
          inquiryUnreadCount={stats?.inquiry_unread_count}
        />

        <div className="pt-2">
          {tab === 'overview'   && <OverviewTab />}
          {tab === 'users'      && <UsersTab />}
          {tab === 'pending'    && <PendingTab />}
          {tab === 'photos'     && <PhotoReviewTab />}
          {tab === 'reports'    && <ReportsTab />}
          {tab === 'inquiries'  && <InquiriesTab />}
          {tab === 'logs'          && <LogsTab />}
          {tab === 'announcements' && <AnnouncementsTab />}
          {tab === 'maintenance'   && <MaintenanceTab />}
        </div>
      </div>
    </AdminToastProvider>
  )
}
