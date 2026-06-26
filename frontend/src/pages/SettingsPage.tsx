// 解説: このファイルは設定ページを定義する。
// 解説: セクション構成: アカウント情報 / マイQRコード / プライバシー設定（学部・サークル非表示） / 通知設定 / ブロック/非表示リスト / アプリ情報 / アカウント削除
// 解説: handleFacultyHideChange = faculty_hide_level（none/faculty/department）を楽観的更新で即変更 → PATCH /api/profile/me
// 解説: handleClubToggle = hidden_clubs 配列を楽観的更新で変更 → PATCH /api/profile/me（サークルごとの身バレ防止）
// 解説: isAdmin = GET /api/admin/pending が成功すれば true（管理者セクションを表示する）
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Ban, Bell, EyeOff, Info, LogOut, MessageSquare, QrCode, Settings2, Shield, Trash2, User } from 'lucide-react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import PWAInstallBanner from '@/components/PWAInstallBanner'
import api from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { clearAllDB, clearSensitiveStorage } from '@/lib/db'
import { subscribePush, unsubscribeAllPush, isPushSubscribed } from '@/lib/push'
import { getConsent, setConsent } from '@/lib/analytics'

type FacultyHideLevel = 'none' | 'faculty' | 'department'

interface ProfileMe {
  email: string
  faculty: string | null
  department: string | null
  clubs: string[]
  faculty_hide_level: FacultyHideLevel
  hidden_clubs: string[]
  identity_verified: boolean
}

export default function SettingsPage() {
  usePageTitle('設定')
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin'],
    queryFn: () =>
      api.get('/api/admin/pending')
        .then(() => true)
        .catch(() => false),
    staleTime: 1000 * 60 * 5,
  })

  const { data: likeStock } = useQuery({
    queryKey: ['like-stock'],
    queryFn: () => api.get<{
      is_applicable: boolean
      is_unlimited: boolean
      regime: string
      score: number
      quantity: number | null
      recovery_per_day: number
      initial: number
      cap: number
    }>('/api/likes/stock').then(r => r.data),
    retry: false,
    staleTime: 60 * 1000,
  })
  const qrDownloadRef = useRef<HTMLDivElement>(null)
  const [profile, setProfile] = useState<ProfileMe | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0)

  const [isPushSupported] = useState(
    () => typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
  )
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifDenied, setNotifDenied] = useState(false)
  const [gaConsent, setGaConsent] = useState(() => getConsent())
  const [facultyHideSaving, setFacultyHideSaving] = useState(false)
  const [clubToggling, setClubToggling] = useState<string | null>(null)

  useEffect(() => {
    isPushSubscribed().then(setNotifEnabled)
  }, [])

  useEffect(() => {
    api.get<ProfileMe>('/api/profile/me').then((res) => {
      setProfile({
        email: res.data.email,
        faculty: res.data.faculty,
        department: res.data.department,
        clubs: res.data.clubs ?? [],
        faculty_hide_level: (res.data.faculty_hide_level as FacultyHideLevel) ?? 'none',
        hidden_clubs: res.data.hidden_clubs ?? [],
        identity_verified: res.data.identity_verified ?? false,
      })
    }).catch(() => {})
  }, [])

  const handleLogout = async () => {
    clearSensitiveStorage()
    await clearAllDB()
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const handleNotifToggle = async (checked: boolean) => {
    setNotifEnabled(checked)
    setNotifDenied(false)

    if (checked) {
      const success = await subscribePush()
      if (!success) {
        setNotifEnabled(false)
        setNotifDenied(true)
        return
      }
      const actual = await isPushSubscribed()
      if (!actual) {
        setNotifEnabled(false)
        setNotifDenied(true)
      }
    } else {
      try {
        await unsubscribeAllPush()
      } catch {
        // 失敗してもUI上はOFFのままでよい
      }
    }
  }

  const handleFacultyHideChange = async (level: FacultyHideLevel) => {
    if (!profile || facultyHideSaving) return
    setFacultyHideSaving(true)
    const prev = profile.faculty_hide_level
    setProfile((p) => p ? { ...p, faculty_hide_level: level } : p)
    try {
      await api.patch('/api/profile/me', { faculty_hide_level: level })
    } catch {
      setProfile((p) => p ? { ...p, faculty_hide_level: prev } : p)
    } finally {
      setFacultyHideSaving(false)
    }
  }

  const handleClubToggle = async (club: string, checked: boolean) => {
    if (!profile || clubToggling) return
    setClubToggling(club)
    const prevHidden = profile.hidden_clubs
    const newHidden = checked
      ? [...prevHidden, club]
      : prevHidden.filter((c) => c !== club)
    setProfile((p) => p ? { ...p, hidden_clubs: newHidden } : p)
    try {
      await api.patch('/api/profile/me', { hidden_clubs: newHidden })
    } catch {
      setProfile((p) => p ? { ...p, hidden_clubs: prevHidden } : p)
    } finally {
      setClubToggling(null)
    }
  }

  const qrUrl = user ? `${window.location.origin}/profile/${user.id}` : ''

  const handleQrDownload = () => {
    const canvas = qrDownloadRef.current?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'cro-co-profile-qr.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete('/api/profile/me')
      clearSensitiveStorage()
      await clearAllDB()
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    } catch {
      // @copy CRO-error-settings-delete-01 Lv0
      setDeleteError('うまくいきませんでした。もう一度お試しください。')
      setDeleting(false)
    }
  }

  return (
    <div className="px-4 py-6 space-y-4">
        {/* @copy CRO-heading-settings-01 Lv1 */}
        <h1 className="font-display text-4xl text-ink">設定</h1>

        {/* 男性向け告知（充実度 < 100） */}
        {likeStock?.regime === 'male_hetero' && (likeStock?.score ?? 100) < 100 && (
          <div
            className="p-3 rounded-[18px] flex items-start gap-2"
            style={{ border: '2px solid var(--color-ink)', background: 'var(--color-paper)' }}
          >
            <Info className="w-4 h-4 text-ink/60 shrink-0 mt-0.5" />
            {/* @copy CRO-label-settings-male-notice-01 Lv1 */}
            <p className="text-sm font-bold text-ink leading-snug">
              プロフィールを埋めると、送れるいいねが増えます。80%でログイン回復、100%で回復が2倍に。
            </p>
          </div>
        )}

        {/* アカウント情報 */}
        <div className="card-bold bg-white p-4 space-y-3">
          <h2 className="text-xs font-bold bg-ink text-white px-3 py-1 inline-flex items-center gap-1.5">
            <User className="w-3 h-3" />
            {/* @copy CRO-heading-settings-02 Lv1 */}
            アカウント情報
          </h2>
          <div className="space-y-0.5">
            {/* @copy CRO-label-settings-01 Lv1 */}
            <p className="font-accent font-bold text-xs text-muted">EMAIL</p>
            <p className="text-sm font-medium text-ink">{profile?.email ?? '読み込み中…'}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline-bold" size="sm" asChild>
              <Link to="/profile/edit">
                {/* @copy CRO-button-settings-01 Lv1 */}
                プロフィールを編集する
              </Link>
            </Button>
            {user && (
              <Button variant="outline-bold" size="sm" asChild>
                <Link to={`/profile/${user.id}`}>
                  {/* @copy CRO-button-settings-02 Lv1 */}
                  自分のプロフィールを見る
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* マイQRコード */}
        {qrUrl && (
          <div className="card-bold bg-white p-4 space-y-3">
            <h2 className="text-xs font-bold bg-ink text-white px-3 py-1 inline-flex items-center gap-1.5">
              <QrCode className="w-3 h-3" />
              {/* @copy CRO-heading-settings-03 Lv1 */}
              マイQRコード
            </h2>
            {/* @copy CRO-label-settings-02 Lv1 */}
            <p className="text-xs text-muted leading-relaxed">
              このQRコードを見せると、あなたのプロフィールに直接アクセスできます
            </p>
            <div className="flex justify-center">
              <div className="p-3 border-2 border-ink">
                <QRCodeSVG value={qrUrl} size={200} />
              </div>
            </div>
            <div ref={qrDownloadRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
              <QRCodeCanvas value={qrUrl} size={400} />
            </div>
            <Button variant="outline-bold" className="w-full" onClick={handleQrDownload}>
              {/* @copy CRO-button-settings-03 Lv1 */}
              保存する
            </Button>
          </div>
        )}

        {/* プライバシー設定 */}
        <div className="card-bold bg-white p-4 space-y-4">
          <h2 className="text-xs font-bold bg-ink text-white px-3 py-1 inline-flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            {/* @copy CRO-heading-settings-04 Lv1 */}
            プライバシー設定
          </h2>

          <div className="space-y-3">
            {/* 学部・学科の非表示設定 */}
            <div className="space-y-1">
              {/* @copy CRO-heading-settings-05 Lv1 */}
              <p className="text-sm font-bold text-ink">学部・学科の非表示設定</p>
              {/* @copy CRO-label-settings-03 Lv1 */}
              <p className="text-xs text-muted leading-relaxed">
                同じ学部・学科の人にあなたのプロフィールは表示されず、あなたにも相手のプロフィールは表示されません。お互いに見えなくすることで、身バレを防ぎます。
              </p>
            </div>

            <div className="space-y-2">
              {(
                // @copy CRO-label-settings-04〜06 Lv1 (radio labels: none/faculty/department)
                [
                  {
                    value: 'none' as FacultyHideLevel,
                    label: '全員に表示する',
                    description: '同じ学部・学科の人にも表示される',
                  },
                  {
                    value: 'faculty' as FacultyHideLevel,
                    label: '同じ学部の人とお互いに見えなくする',
                    description: profile?.faculty ? `${profile.faculty}の人には見えない` : '学部が設定されていません',
                  },
                  {
                    value: 'department' as FacultyHideLevel,
                    label: '同じ学科の人とお互いに見えなくする',
                    description: (profile?.faculty && profile?.department)
                      ? `${profile.faculty} ${profile.department}の人には見えない`
                      : '学部・学科が設定されていません',
                  },
                ] as const
              ).map((opt) => (
                <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="faculty-hide-level"
                    value={opt.value}
                    checked={profile?.faculty_hide_level === opt.value}
                    onChange={() => handleFacultyHideChange(opt.value)}
                    disabled={facultyHideSaving}
                    className="mt-0.5 accent-ink"
                  />
                  <div>
                    <p className="text-sm font-medium text-ink leading-tight">{opt.label}</p>
                    <p className="text-[13px] text-muted">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* アクセス解析同意 */}
          <div className="border-t border-ink/10 pt-4">
            <div className="flex items-start gap-3">
              <Switch
                id="ga-consent"
                checked={gaConsent}
                onCheckedChange={(checked) => {
                  setGaConsent(checked)
                  setConsent(checked)
                }}
                className="mt-0.5 shrink-0"
              />
              <div>
                <label htmlFor="ga-consent" className="text-sm font-bold text-ink cursor-pointer">
                  {/* @copy CRO-label-settings-07 Lv1 */}
                  アクセス解析に協力する（任意）
                </label>
                {/* @copy CRO-label-settings-08 Lv1 — 保留: 「ご利用いただけます」は禁止「〜できます」類似・オーナー確認待ち */}
                <p className="text-xs text-muted mt-0.5">
                  オンにすると閲覧情報などが Google に送信され分析に使われます。オフでも全機能をご利用いただけます。詳しくは<a href="/privacy" className="underline font-bold">プライバシーポリシー</a>をご覧ください。
                </p>
              </div>
            </div>
          </div>

          {/* サークルの非表示設定 */}
          <div className="border-t border-ink/10 pt-4 space-y-3">
            <div className="space-y-1">
              {/* @copy CRO-heading-settings-06 Lv1 */}
              <p className="text-sm font-bold text-ink">サークルの非表示設定</p>
              {/* @copy CRO-label-settings-09 Lv1 — 保留: 「設定できます」は禁止「〜できます」・オーナー確認待ち */}
              <p className="text-xs text-muted leading-relaxed">
                各サークルの同メンバーとは、お互いのプロフィールが表示されなくなります。身バレが心配なサークルだけ非表示に設定できます。
              </p>
            </div>

            {!profile ? (
              // @copy CRO-label-settings-10 Lv1
              <p className="text-xs text-subtle">読み込み中…</p>
            ) : profile.clubs.length === 0 ? (
              <div className="space-y-2">
                {/* @copy CRO-empty-settings-01 Lv1 — 保留: 「追加できます」は禁止「〜できます」・オーナー確認待ち */}
                <p className="text-xs text-muted">
                  サークルが登録されていません。プロフィール編集からサークルを追加できます。
                </p>
                <Button variant="outline-bold" size="sm" asChild>
                  <Link to="/profile/edit">プロフィールを編集する</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {profile.clubs.map((club) => {
                  const isHidden = profile.hidden_clubs.includes(club)
                  return (
                    <div key={club} className="border border-ink/10 p-3 space-y-2">
                      <p className="text-sm font-bold text-ink">{club}</p>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`club-hide-${club}`}
                            checked={!isHidden}
                            onChange={() => handleClubToggle(club, false)}
                            disabled={clubToggling !== null}
                            className="accent-ink"
                          />
                          {/* @copy CRO-label-settings-11 Lv1 */}
                          <span className="text-sm text-ink">表示する</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`club-hide-${club}`}
                            checked={isHidden}
                            onChange={() => handleClubToggle(club, true)}
                            disabled={clubToggling !== null}
                            className="accent-ink"
                          />
                          {/* @copy CRO-label-settings-12 Lv1 */}
                          <span className="text-sm text-ink">非表示にする</span>
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* PWA インストール */}
        <PWAInstallBanner wrapperClassName="" />

        {/* 通知設定 */}
        <div className="card-bold bg-white p-4 space-y-3">
          <h2 className="text-xs font-bold bg-ink text-white px-3 py-1 inline-flex items-center gap-1.5">
            <Bell className="w-3 h-3" />
            {/* @copy CRO-heading-settings-07 Lv1 */}
            通知設定
          </h2>
          {isPushSupported ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 flex-1">
                  {/* @copy CRO-label-settings-13 Lv1 */}
                  <p className="text-sm font-medium text-ink">プッシュ通知を受け取る</p>
                  {/* @copy CRO-label-settings-14 Lv1 */}
                  <p className="text-xs text-muted leading-relaxed">
                    アプリを閉じていてもマッチ・いいね・メッセージを通知
                  </p>
                </div>
                <Switch
                  checked={notifEnabled}
                  onCheckedChange={handleNotifToggle}
                />
              </div>
              {notifEnabled && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.post('/api/push/test')
                    } catch (e) {
                      console.error(e)
                    }
                  }}
                  className="text-xs text-muted underline mt-2"
                >
                  {/* @copy CRO-button-settings-04 Lv1 */}
                  通知テストを送る
                </button>
              )}
              {notifDenied && (
                <p className="text-xs text-destructive leading-relaxed">
                  {/* @copy CRO-error-settings-notify-01 Lv0 */}
                  通知の許可が必要です。ブラウザの設定から変更してください。
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted leading-relaxed">
              {/* @copy CRO-label-settings-15 Lv1 */}
              このブラウザはプッシュ通知に対応していません。
            </p>
          )}
        </div>

        {/* ブロック・非表示リスト入口 */}
        <div className="space-y-3">
          <button
            type="button"
            className="w-full card-bold p-4 flex items-center gap-4 text-left hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all"
            style={{ backgroundColor: 'var(--color-hash-rose)' }}
            onClick={() => navigate('/settings/safety?tab=block')}
          >
            <div className="w-12 h-12 rounded-full bg-white border-2 border-ink flex items-center justify-center shrink-0">
              <Ban className="w-5 h-5 text-ink" />
            </div>
            <div className="flex-1 min-w-0">
              {/* @copy CRO-button-settings-05 Lv1 */}
              <p className="font-bold text-ink text-base leading-snug">ブロックしたユーザー</p>
              {/* @copy CRO-label-settings-16 Lv1 — 保留: 「確認できます」は禁止「〜できます」・オーナー確認待ち */}
              <p className="text-xs text-muted mt-0.5">ブロック中のユーザーを確認できます。</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-ink font-bold text-lg leading-none">→</span>
            </div>
          </button>

          <button
            type="button"
            className="w-full card-bold p-4 flex items-center gap-4 text-left hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all"
            style={{ backgroundColor: 'var(--color-hash-violet)' }}
            onClick={() => navigate('/settings/safety?tab=hide')}
          >
            <div className="w-12 h-12 rounded-full bg-white border-2 border-ink flex items-center justify-center shrink-0">
              <EyeOff className="w-5 h-5 text-ink" />
            </div>
            <div className="flex-1 min-w-0">
              {/* @copy CRO-button-settings-06 Lv1 */}
              <p className="font-bold text-ink text-base leading-snug">非表示にしたユーザー</p>
              {/* @copy CRO-label-settings-17 Lv1 — 保留: 「解除できます」は禁止「〜できます」・オーナー確認待ち */}
              <p className="text-xs text-muted mt-0.5">非表示を解除できます。</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-ink font-bold text-lg leading-none">→</span>
            </div>
          </button>

          <button
            type="button"
            className="w-full card-bold p-4 flex items-center gap-4 text-left hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all"
            style={{ backgroundColor: 'var(--color-hash-amber)' }}
            onClick={() => navigate('/settings/contact')}
          >
            <div className="w-12 h-12 rounded-full bg-white border-2 border-ink flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-ink" />
            </div>
            <div className="flex-1 min-w-0">
              {/* @copy CRO-button-settings-07 Lv1 */}
              <p className="font-bold text-ink text-base leading-snug">お問い合わせ</p>
              {/* @copy CRO-label-settings-18 Lv1 */}
              <p className="text-xs text-muted mt-0.5">バグ報告・要望・相談</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-ink font-bold text-lg leading-none">→</span>
            </div>
          </button>
        </div>

        {/* アプリ情報 */}
        <div className="card-bold bg-white p-4 space-y-3">
          <h2 className="text-xs font-bold bg-ink text-white px-3 py-1 inline-flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            {/* @copy CRO-heading-settings-08 Lv1 */}
            アプリ情報
          </h2>
          <div className="flex justify-between text-sm">
            {/* @copy CRO-label-settings-19 Lv1 */}
            <span className="font-bold text-muted">バージョン</span>
            <span className="font-accent font-bold text-ink">v1.0.0</span>
          </div>
          {/* @copy CRO-legal-settings-01〜02 Lv0 */}
          <div className="flex gap-4 text-sm">
            <Link to="/terms" className="text-ink underline underline-offset-2 hover:text-ink/70">利用規約</Link>
            <Link to="/privacy" className="text-ink underline underline-offset-2 hover:text-ink/70">プライバシーポリシー</Link>
          </div>
        </div>

        {/* 管理者セクション */}
        {isAdmin && (
          <div className="card-bold p-4 space-y-3" style={{ backgroundColor: 'rgba(255,59,107,0.08)', borderColor: 'var(--color-danger)', boxShadow: '4px 4px 0 0 var(--color-danger)' }}>
            <h2 className="text-xs font-bold bg-hot text-white px-3 py-1 inline-flex items-center gap-1.5">
              <Settings2 className="w-3 h-3" />
              ADMIN
            </h2>
            {/* @copy CRO-label-settings-20 Lv0 */}
            <p className="text-xs text-muted">審査・通報の管理</p>
            <button
              type="button"
              className="w-full h-9 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-hot bg-hot text-white font-bold text-sm shadow-[4px_4px_0_0_#FF3B6B] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#FF3B6B] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#FF3B6B] transition-all"
              onClick={() => navigate('/admin')}
            >
              {/* @copy CRO-button-settings-08 Lv0 */}
              管理者ダッシュボードを開く
            </button>
          </div>
        )}

        {/* ログアウト */}
        <div className="card-bold bg-white p-4">
          <Button
            variant="outline-bold"
            className="w-full gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            {/* @copy CRO-button-settings-09 Lv1 */}
            ログアウト
          </Button>
        </div>

        {/* アカウント削除 */}
        <div className="card-bold bg-white p-4 space-y-3">
          <h2 className="text-xs font-bold bg-ink text-white px-3 py-1 inline-flex items-center gap-1.5">
            <Trash2 className="w-3 h-3" />
            {/* @copy CRO-heading-settings-09 Lv0 */}
            アカウントを削除する
          </h2>
          {/* @copy CRO-label-settings-21 Lv0 */}
          <p className="text-xs text-muted leading-relaxed">
            削除すると、プロフィール・写真・マッチ・メッセージなどすべてのデータが完全に消去されます。
          </p>
          <Button
            className="border-2 border-ink gap-2 font-bold shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
            style={{ backgroundColor: '#FF3B6B', color: '#fff' }}
            onClick={() => { setDeleteError(null); setDeleteStep(1) }}
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4" />
            {/* @copy CRO-button-settings-10 Lv0 */}
            アカウントを削除する
          </Button>
        </div>

        {/* アカウント削除 2段階確認モーダル */}
        {deleteStep > 0 && (() => {
          const d = new Date()
          d.setDate(d.getDate() + 30)
          const withdrawalReleaseDate = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
          return (
            <div
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
              style={{ background: 'rgba(0,0,0,0.65)' }}
              onClick={() => { if (!deleting) setDeleteStep(0) }}
            >
              <div
                className="card-bold bg-white w-full max-w-sm p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* ステップ 1: データ消去の警告 */}
                {deleteStep === 1 && (
                  <>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: '#FF3B6B' }} />
                      {/* @copy CRO-confirm-settings-delete-01 Lv0 */}
                      <h2 className="font-display text-2xl text-ink">退会しますか？</h2>
                    </div>
                    {/* @copy CRO-confirm-settings-delete-02 Lv0 */}
                    <p className="text-xs font-bold" style={{ color: '#FF3B6B' }}>
                      この操作は取り消せません
                    </p>
                    {/* @copy CRO-confirm-settings-delete-03 Lv0 */}
                    <p className="text-sm text-ink leading-relaxed">
                      プロフィール・写真・マッチ・メッセージがすべて完全に削除されます。復元はできません。
                    </p>
                    <div className="flex gap-3 pt-1">
                      <Button
                        variant="outline-bold"
                        className="flex-1"
                        onClick={() => setDeleteStep(0)}
                      >
                        {/* @copy CRO-button-settings-11 Lv1 */}
                        やめておく
                      </Button>
                      <Button
                        className="flex-1 border-2 border-ink font-bold shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
                        style={{ backgroundColor: '#FF3B6B', color: '#fff' }}
                        onClick={() => setDeleteStep(2)}
                      >
                        {/* @copy CRO-button-settings-12 Lv0 */}
                        退会に進む
                      </Button>
                    </div>
                  </>
                )}

                {/* ステップ 2: 再登録ブロック期間の警告 */}
                {deleteStep === 2 && (
                  <>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: '#FF3B6B' }} />
                      {/* @copy CRO-confirm-settings-delete-04 Lv0 */}
                      <h2 className="font-display text-xl text-ink leading-tight">もう一度確認してください</h2>
                    </div>
                    {/* @copy CRO-confirm-settings-delete-05 Lv0 */}
                    <p className="text-sm text-ink leading-relaxed">
                      退会後は <span className="font-bold">{withdrawalReleaseDate}</span> まで、このメールアドレスでは再登録できません。
                    </p>
                    {deleteError && (
                      <p className="text-sm text-destructive">{deleteError}</p>
                    )}
                    <div className="flex gap-3 pt-1">
                      <Button
                        variant="outline-bold"
                        className="flex-1"
                        onClick={() => setDeleteStep(0)}
                        disabled={deleting}
                      >
                        やめておく
                      </Button>
                      <Button
                        className="flex-1 border-2 border-ink font-bold shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
                        style={{ backgroundColor: '#FF3B6B', color: '#fff' }}
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {/* @copy CRO-button-settings-13 Lv0 */}
                        {deleting ? '削除中…' : '退会する'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })()}
    </div>
  )
}
