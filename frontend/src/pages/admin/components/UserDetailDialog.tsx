// 解説: このファイルはユーザー詳細ダイアログコンポーネントを定義する（UsersTab / ReportsTab で使用）。
// 解説: GET /api/admin/users/:id で詳細データ取得 → 学生証画像・アバター・プロフィール情報を表示する
// 解説: 管理操作: 承認（approve）/ 却下（reject）/ BAN / 警告送信（POST /api/admin/users/:id/warn）
// 解説: BanDialog を内部で呼び出す（BAN ボタン押下で BanDialog が開く）
import { useEffect, useState } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Ban, Eye, Heart, MessageSquare, ShieldCheck, User as UserIcon } from 'lucide-react'
import api from '@/lib/api'
import StatusBadge from './StatusBadge'
import BanDialog from './BanDialog'
import type { UserDetail } from '../types'

function calcAge(bd?: string | null): number | null {
  if (!bd) return null
  const b = new Date(bd), t = new Date()
  let a = t.getFullYear() - b.getFullYear()
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--
  return a
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
  onChange?: () => void
}

export default function UserDetailDialog({ open, onOpenChange, userId, onChange }: Props) {
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [banDialogOpen, setBanDialogOpen] = useState(false)

  useEffect(() => {
    if (!open || !userId) return
    setLoading(true)
    setError(null)
    setData(null)
    api
      .get<UserDetail>(`/api/admin/users/${userId}`)
      .then((r) => setData(r.data))
      .catch(() => setError('ユーザー情報の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [open, userId])

  const handleBanSuccess = () => {
    if (userId) {
      api.get<UserDetail>(`/api/admin/users/${userId}`).then((r) => setData(r.data))
    }
    onChange?.()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogOverlay className="bg-black/60" />
          <DialogPrimitive.Content
            className="fixed top-1/2 left-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 border-2 border-ink bg-white shadow-[4px_4px_0_0_#0A0A0A] rounded-[18px] p-6 space-y-4 outline-none"
          >
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-ink">ユーザー詳細</DialogTitle>
            </DialogHeader>

            {loading && <p className="text-sm" style={{ color: 'var(--color-muted, #888)' }}>読み込み中...</p>}
            {error && <p className="text-hot font-bold">{error}</p>}

            {data && (
              <div className="space-y-4">
                {/* ヘッダー: 画像 + 名前 + ステータス */}
                <div className="flex items-start gap-4">
                  <div
                    className="w-20 h-20 rounded-xl border-2 border-ink shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ background: '#F5F5F5' }}
                  >
                    {data.profile_image_url ? (
                      <img src={data.profile_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-8 h-8 text-ink/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-ink text-lg">{data.name ?? '（未設定）'}</p>
                      <StatusBadge status={data.status} />
                      {data.identity_verified && (
                        <span
                          className="font-accent text-[13px] font-bold px-2 py-0.5 border-2 border-ink bg-brand"
                          style={{ borderRadius: 4 }}
                        >
                          <ShieldCheck className="inline w-3 h-3 mr-0.5" />
                          本人確認済み
                        </span>
                      )}
                    </div>
                    <p className="font-accent font-bold text-xs" style={{ color: 'var(--color-muted, #888)' }}>{data.email}</p>
                    <p className="text-sm text-ink/70 mt-1">
                      {[
                        data.year != null ? `${data.year}年` : null,
                        data.faculty,
                        data.department,
                        data.gender === 'male' ? '男性' : data.gender === 'female' ? '女性' : null,
                      ].filter(Boolean).join(' / ') || '未設定'}
                    </p>
                  </div>
                </div>

                {/* 統計バー */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { Icon: Heart,         label: 'マッチ',  value: data.match_count,    alert: false },
                    { Icon: MessageSquare, label: 'いいね送', value: data.sent_likes,     alert: false },
                    { Icon: Eye,           label: 'いいね受', value: data.received_likes, alert: false },
                    { Icon: AlertTriangle, label: '通報',    value: data.report_count,   alert: data.report_count > 0 },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`card-bold rounded-[10px] p-2 text-center ${s.alert ? 'bg-hot text-white' : 'bg-white'}`}
                    >
                      <s.Icon className={`w-4 h-4 mx-auto ${s.alert ? 'text-white' : 'text-ink/60'}`} />
                      <p className={`font-accent text-lg font-bold ${s.alert ? 'text-white' : 'text-ink'}`}>{s.value}</p>
                      <p className={`font-accent font-bold text-[9px] uppercase ${s.alert ? 'text-white/80' : ''}`}
                         style={!s.alert ? { color: 'var(--color-muted, #888)' } : undefined}>
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* BAN情報 */}
                {data.status === 'banned' && (
                  <div className="bg-hot/10 border-2 border-hot rounded-lg p-3 space-y-1">
                    <p className="font-accent text-xs font-bold text-hot uppercase">BANNED</p>
                    <p className="text-sm text-ink">理由: {data.ban_reason}</p>
                    {data.banned_at && (
                      <p className="font-accent font-bold text-xs" style={{ color: 'var(--color-muted, #888)' }}>
                        実施日時: {new Date(data.banned_at).toLocaleString('ja-JP')}
                      </p>
                    )}
                  </div>
                )}

                {/* 却下情報 */}
                {data.status === 'rejected' && data.rejection_reason && (
                  <div className="bg-hot/10 border-2 border-hot rounded-lg p-3">
                    <p className="font-accent text-xs font-bold text-hot uppercase mb-1">REJECTED</p>
                    <p className="text-sm text-ink">{data.rejection_reason}</p>
                  </div>
                )}

                {/* 個人情報削除済み */}
                {data.privacy_purged_at && (
                  <div className="bg-brand/30 border-2 border-ink rounded-lg p-3">
                    <p className="font-accent text-xs font-bold uppercase mb-1">DELETED</p>
                    <p className="text-sm text-ink">
                      {new Date(data.privacy_purged_at).toLocaleString('ja-JP')} に
                      学生証の写真は削除されました。
                    </p>
                  </div>
                )}

                {/* 本人確認情報 */}
                {!data.privacy_purged_at && data.status !== 'banned' && (
                  <div className="bg-brand/20 border-2 border-ink rounded-lg p-3 space-y-1">
                    <p className="font-accent text-xs font-bold text-ink uppercase">IDENTITY</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-accent font-bold text-[13px]" style={{ color: 'var(--color-muted, #888)' }}>BIRTH DATE</span>
                        <p className="font-bold">{data.birth_date ?? '—'}</p>
                      </div>
                      <div>
                        <span className="font-accent font-bold text-[13px]" style={{ color: 'var(--color-muted, #888)' }}>AGE</span>
                        <p className="font-bold">{calcAge(data.birth_date) != null ? `${calcAge(data.birth_date)}歳` : '—'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 自己紹介 */}
                {data.bio && (
                  <div>
                    <p className="font-accent font-bold text-xs uppercase mb-1" style={{ color: 'var(--color-muted, #888)' }}>BIO</p>
                    <p className="text-sm text-ink border-l-2 border-ink pl-3 whitespace-pre-wrap">{data.bio}</p>
                  </div>
                )}

                {/* 写真 */}
                {data.photos.length > 0 && (
                  <div>
                    <p className="font-accent font-bold text-xs uppercase mb-1" style={{ color: 'var(--color-muted, #888)' }}>
                      PHOTOS ({data.photos.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {data.photos.map((ph) => (
                        <a key={ph.id} href={ph.url} target="_blank" rel="noopener noreferrer">
                          <img src={ph.url} alt="" className="aspect-square object-cover rounded border-2 border-ink" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* メタ情報 */}
                <div className="font-accent font-bold text-[13px] space-y-0.5" style={{ color: 'var(--color-muted, #888)' }}>
                  <p>登録: {new Date(data.created_at).toLocaleString('ja-JP')}</p>
                  {data.reviewed_at && <p>審査: {new Date(data.reviewed_at).toLocaleString('ja-JP')}</p>}
                  {data.last_seen_at && <p>最終ログイン: {new Date(data.last_seen_at).toLocaleString('ja-JP')}</p>}
                </div>

                {/* アクションボタン */}
                <div className="flex justify-end gap-2 pt-2 border-t-2 border-ink/10">
                  <Button variant="outline-bold" onClick={() => onOpenChange(false)}>閉じる</Button>
                  {data.status === 'banned' ? (
                    <button
                      type="button"
                      onClick={() => setBanDialogOpen(true)}
                      className="inline-flex items-center justify-center h-9 gap-1 rounded-lg border-2 border-ink bg-brand font-bold text-sm px-4"
                      style={{ boxShadow: '4px 4px 0 0 #0A0A0A' }}
                    >
                      BAN解除
                    </button>
                  ) : data.status === 'approved' ? (
                    <button
                      type="button"
                      onClick={() => setBanDialogOpen(true)}
                      className="inline-flex items-center justify-center h-9 gap-1 rounded-lg border-2 border-ink bg-hot text-white font-bold text-sm px-4"
                      style={{ boxShadow: '4px 4px 0 0 #0A0A0A' }}
                    >
                      <Ban className="w-4 h-4" />
                      BAN
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {data && (
        <BanDialog
          open={banDialogOpen}
          onOpenChange={setBanDialogOpen}
          userId={data.id}
          userName={data.name}
          mode={data.status === 'banned' ? 'unban' : 'ban'}
          onSuccess={handleBanSuccess}
        />
      )}
    </>
  )
}
