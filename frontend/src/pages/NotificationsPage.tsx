// 解説: このファイルは通知ページを定義する。
// 解説: サブタブ「お知らせ」「通知」を持つ。?tab=announcements でお知らせを初期表示
// 解説: markedIdsRef = 既読マーク済みの通知 ID を Set で管理し二重 POST を防ぐ（useEffect が2回実行される StrictMode 対策）
// 解説: unread_views / unread_likes_received / unread_matches = /api/matches/unread-count から30秒ポーリングで取得する
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Bell, ChevronDown, ChevronUp, Eye, Heart, Lock, MessageCircle } from 'lucide-react'
import Layout from '@/components/Layout'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useProfile } from '@/hooks/useProfile'
import api from '@/lib/api'

interface UnreadCounts {
  unread_messages: number
  unread_matches: number
  unread_views: number
  unread_likes_received: number
}

interface AdminWarning {
  id: string
  type: string
  message_preview: string | null
  read_at: string | null
  created_at: string
}

interface AnnouncementItem {
  id: string
  title: string
  body: string
  created_at: string
  is_read: boolean
}

export default function NotificationsPage() {
  usePageTitle('通知')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { profile } = useProfile()
  const qc = useQueryClient()

  const isApproved = profile?.status === 'approved'

  // サブタブ: ?tab=announcements でお知らせを初期表示
  const [activeTab, setActiveTab] = useState<'announcements' | 'notifications'>(
    searchParams.get('tab') === 'announcements' ? 'announcements' : 'notifications'
  )

  // お知らせアコーディオン開閉状態（React state のみ・localStorage 禁止）
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const toggleOpen = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const { data: counts } = useQuery({
    queryKey: ['unread-count-notif'],
    queryFn: () => api.get<UnreadCounts>('/api/matches/unread-count').then(r => r.data),
    refetchInterval: 30 * 1000,
    enabled: isApproved,
  })

  const { data: notifications } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: () => api.get<AdminWarning[]>('/api/notifications/').then(r => r.data),
    enabled: isApproved,
    staleTime: 60_000,
  })

  // 運営お知らせ
  const { data: announcements = [] } = useQuery<AnnouncementItem[]>({
    queryKey: ['announcements-list'],
    queryFn: () => api.get<AnnouncementItem[]>('/api/announcements').then(r => r.data),
    enabled: isApproved,
    staleTime: 60_000,
  })

  const adminWarnings = notifications?.filter(n => n.type === 'admin_warning') ?? []
  const unreadWarnings = adminWarnings.filter(n => !n.read_at)

  // 解説: markedIdsRef = 既読マーク済み ID を Set で追跡（useEffect が複数回発火しても POST が重複しない）
  const markedIdsRef = useRef<Set<string>>(new Set())
  const unreadWarningIds = unreadWarnings.map(n => n.id).join(',')
  useEffect(() => {
    if (!unreadWarningIds) return
    unreadWarningIds.split(',').forEach(id => {
      if (markedIdsRef.current.has(id)) return
      markedIdsRef.current.add(id)
      api.post(`/api/notifications/${id}/read`).catch(() => {})
    })
  }, [unreadWarningIds])

  // お知らせタブを開いた時点で全件既読化（unread がある場合のみ）
  const hasUnreadAnnouncements = announcements.some(a => !a.is_read)
  const announcementsReadRef = useRef(false)
  useEffect(() => {
    if (activeTab !== 'announcements' || !isApproved || !hasUnreadAnnouncements || announcementsReadRef.current) return
    announcementsReadRef.current = true
    api.post('/api/announcements/read').then(() => {
      // 既読化後にキャッシュを更新してベルバッジを即時クリア
      qc.invalidateQueries({ queryKey: ['announcement-unread-count'] })
      qc.setQueryData(['announcements-list'], (old: AnnouncementItem[] | undefined) =>
        old?.map(a => ({ ...a, is_read: true })) ?? []
      )
    }).catch(() => {})
  }, [activeTab, isApproved, hasUnreadAnnouncements])

  if (profile && profile.status !== 'approved') {
    return (
      <Layout>
        <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/30 flex items-center justify-center p-6">
          <div className="bg-white border-4 border-black rounded-2xl p-8 max-w-sm w-full shadow-[8px_8px_0_0_#000]">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-brand border-4 border-black rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8" />
              </div>
            </div>
            {/* @copy CRO-heading-notifications-locked-01 Lv0 */}
            <h2 className="text-xl font-bold text-center mb-3">
              {profile.status === 'rejected'
                ? '学生証の再提出が必要です'
                : '通知は認証完了後に利用できます'}
            </h2>
            {/* @copy CRO-onboarding-notifications-locked-01 Lv0 */}
            <p className="text-sm text-ink/60 text-center mb-6">
              {profile.status === 'rejected'
                ? '再申請して承認されると、通知機能が使えるようになります。'
                : '学生証の審査が完了すると、通知機能が使えるようになります。'}
            </p>
            {profile.status === 'rejected' ? (
              <button
                type="button"
                onClick={() => navigate('/setup/required?mode=reapply')}
                className="w-full bg-black text-white font-bold py-3 rounded-xl border-2 border-black"
              >
                {/* @copy CRO-button-notifications-01 Lv0 */}
                再申請する →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="w-full bg-brand text-black font-bold py-3 rounded-xl border-2 border-black"
              >
                {/* @copy CRO-button-notifications-02 Lv1 */}
                ホームに戻る
              </button>
            )}
          </div>
        </div>
      </Layout>
    )
  }

  // @copy CRO-label-notifications-section-01〜03 Lv1 (label), CRO-label-notifications-section-04〜06 Lv1 (sublabel)
  const sections = [
    {
      key: 'footprints',
      label: 'あなたを見た人',
      sublabel: 'プロフィールを閲覧した人',
      href: '/footprints',
      Icon: Eye,
      count: counts?.unread_views ?? 0,
      bg: 'var(--color-hash-coral)',
    },
    {
      key: 'likes',
      label: 'あなたへのいいね',
      sublabel: 'いいねを返して、マッチしてみましょう。',
      href: '/likes/received',
      Icon: Heart,
      count: counts?.unread_likes_received ?? 0,
      bg: 'var(--color-hash-rose)',
    },
    {
      key: 'matches',
      label: '新しいマッチ',
      sublabel: 'マッチした相手とチャットできます。',
      href: '/matches',
      Icon: MessageCircle,
      count: counts?.unread_matches ?? 0,
      bg: 'var(--color-hash-azure)',
    },
  ]

  const notificationsUnreadCount =
    (counts?.unread_views ?? 0) +
    (counts?.unread_likes_received ?? 0) +
    (counts?.unread_matches ?? 0) +
    unreadWarnings.length
  const announcementsUnreadCount = announcements.filter(a => !a.is_read).length

  return (
    <Layout>
      <div className="px-4 pt-5 pb-6 space-y-4">
        {/* @copy CRO-heading-notifications-01 Lv1 */}
        <h1
          className="font-display text-3xl text-ink"
          style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 }}
        >
          通知
        </h1>

        {/* サブタブ切替 */}
        <div className="flex border-2 border-ink rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveTab('announcements')}
            className={`flex-1 py-2.5 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'announcements' ? 'bg-ink text-white' : 'bg-white text-ink'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            お知らせ
            {announcementsUnreadCount > 0 && activeTab !== 'announcements' && (
              <span className="w-2 h-2 rounded-full bg-hot shrink-0" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-2.5 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors border-l-2 border-ink ${
              activeTab === 'notifications' ? 'bg-ink text-white' : 'bg-white text-ink'
            }`}
          >
            通知
            {notificationsUnreadCount > 0 && activeTab !== 'notifications' && (
              <span className="w-2 h-2 rounded-full bg-hot shrink-0" />
            )}
          </button>
        </div>

        {/* お知らせタブ */}
        {activeTab === 'announcements' && (
          <div className="space-y-2">
            {announcements.length === 0 && adminWarnings.length === 0 && (
              <p className="text-sm text-ink/60 py-6 text-center">お知らせはまだありません。</p>
            )}

            {/* 管理者警告 */}
            {adminWarnings.map(n => (
              <div
                key={n.id}
                className="card-bold p-4 bg-white flex gap-3 items-start"
              >
                <div className="w-10 h-10 rounded-full bg-hot/10 border-2 border-ink flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-hot" />
                </div>
                <div className="flex-1 min-w-0">
                  {/* @copy CRO-label-notifications-warning-01 Lv0 */}
                  <p className="font-bold text-sm text-ink">運営からの警告</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{n.message_preview}</p>
                  <p className="font-mono text-[10px] text-muted mt-1.5">
                    {new Date(n.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                {!n.read_at && (
                  <span className="w-2 h-2 rounded-full bg-hot shrink-0 mt-1.5" />
                )}
              </div>
            ))}

            {/* 運営お知らせ（アコーディオン） */}
            {announcements.map(ann => (
              <div key={ann.id} className="card-bold bg-white">
                <button
                  type="button"
                  onClick={() => toggleOpen(ann.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-brand/10 border-2 border-ink flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-ink" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-ink">{ann.title}</p>
                    <p className="font-mono text-[10px] text-muted mt-0.5">
                      {new Date(ann.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!ann.is_read && (
                      <span className="w-2 h-2 rounded-full bg-hot" />
                    )}
                    {openIds.has(ann.id) ? (
                      <ChevronUp className="w-4 h-4 text-ink/60" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-ink/60" />
                    )}
                  </div>
                </button>
                {openIds.has(ann.id) && (
                  <div className="px-4 pb-4 border-t-2 border-ink/10">
                    <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-wrap pt-3">
                      {ann.body}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 通知タブ */}
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {sections.map(({ key, label, sublabel, href, Icon, count, bg }) => (
              <button
                key={key}
                type="button"
                className="w-full card-bold p-4 flex items-center gap-4 text-left hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all"
                style={{ backgroundColor: bg }}
                onClick={() => navigate(href)}
              >
                <div className="w-12 h-12 rounded-full bg-white border-2 border-ink flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-ink" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink text-base leading-snug">{label}</p>
                  <p className="text-xs text-muted mt-0.5">{sublabel}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {count > 0 && (
                    <span className="min-w-[24px] h-6 bg-hot text-white font-mono font-bold text-xs rounded-full flex items-center justify-center px-1.5 leading-none border-2 border-ink">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                  <span className="text-ink font-bold text-lg leading-none">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
