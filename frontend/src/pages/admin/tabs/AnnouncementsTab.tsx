// 解説: このファイルは管理者ダッシュボードの「お知らせ配信」タブを定義する。
// 解説: 機能: お知らせ作成（タイトル/本文/対象セレクタ）・一覧表示・編集・取消（論理削除）
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, ChevronDown, ChevronUp, Pencil, Trash2, X, Check } from 'lucide-react'
import api from '@/lib/api'
import { FACULTY_NAMES } from '@/lib/osaka-u-data'
import { useAdminToast } from '../components/AdminToast'
import type { AnnouncementAdminItem } from '../types'

interface FormState {
  title: string
  body: string
  target_all: boolean
  target_faculties: string[]
  target_grades: number[]
  target_genders: string[]
}

const EMPTY_FORM: FormState = {
  title: '',
  body: '',
  target_all: false,
  target_faculties: [],
  target_grades: [],
  target_genders: [],
}

const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6]

function targetSummary(ann: AnnouncementAdminItem): string {
  if (ann.target_all) return '全員'
  const parts: string[] = []
  if (ann.target_faculties.length > 0) parts.push(ann.target_faculties.join('・'))
  if (ann.target_grades.length > 0) parts.push(ann.target_grades.map((g) => `${g}年`).join('・'))
  if (ann.target_genders.length > 0)
    parts.push(ann.target_genders.map((g) => (g === 'male' ? '男性' : '女性')).join('・'))
  return parts.length > 0 ? parts.join(' / ') : '（未設定・誰にも届かない）'
}

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

// 対象セレクタコンポーネント
function TargetSelector({
  form,
  onChange,
}: {
  form: FormState
  onChange: (f: FormState) => void
}) {
  return (
    <div className="space-y-3">
      {/* 全員トグル */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.target_all}
          onChange={(e) => onChange({ ...form, target_all: e.target.checked })}
          className="w-4 h-4 accent-brand border-2 border-ink"
        />
        <span className="font-bold text-sm">全員に送る</span>
      </label>

      {!form.target_all && (
        <div className="pl-2 space-y-3 border-l-2 border-ink/20">
          {/* 学部 */}
          <div>
            <p className="font-mono text-xs font-bold text-ink/60 uppercase mb-1.5">学部（複数選択可）</p>
            <div className="flex flex-wrap gap-1.5">
              {FACULTY_NAMES.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => onChange({ ...form, target_faculties: toggleItem(form.target_faculties, f) })}
                  className={`tag-pill text-xs transition-all ${
                    form.target_faculties.includes(f)
                      ? 'bg-brand border-ink text-ink shadow-[2px_2px_0_0_#0A0A0A]'
                      : 'bg-white border-ink text-ink/40 hover:text-ink'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* 学年 */}
          <div>
            <p className="font-mono text-xs font-bold text-ink/60 uppercase mb-1.5">学年（複数選択可）</p>
            <div className="flex gap-1.5">
              {GRADE_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => onChange({ ...form, target_grades: toggleItem(form.target_grades, g) })}
                  className={`w-9 h-9 border-2 border-ink font-bold text-sm transition-all ${
                    form.target_grades.includes(g)
                      ? 'bg-brand text-ink shadow-[2px_2px_0_0_#0A0A0A]'
                      : 'bg-white text-ink/40 hover:text-ink'
                  }`}
                  style={{ borderRadius: 8 }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 性別 */}
          <div>
            <p className="font-mono text-xs font-bold text-ink/60 uppercase mb-1.5">性別（複数選択可）</p>
            <div className="flex gap-1.5">
              {[
                { value: 'male', label: '男性' },
                { value: 'female', label: '女性' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    onChange({ ...form, target_genders: toggleItem(form.target_genders, value) })
                  }
                  className={`px-4 h-9 border-2 border-ink font-bold text-sm transition-all ${
                    form.target_genders.includes(value)
                      ? 'bg-brand text-ink shadow-[2px_2px_0_0_#0A0A0A]'
                      : 'bg-white text-ink/40 hover:text-ink'
                  }`}
                  style={{ borderRadius: 8 }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 作成/編集フォームコンポーネント
function AnnouncementForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: {
  form: FormState
  onChange: (f: FormState) => void
  onSubmit: () => void
  onCancel: () => void
  submitting: boolean
  submitLabel: string
}) {
  const titleLen = form.title.length
  const bodyLen = form.body.length
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [form.body])

  const canSubmit =
    form.title.trim().length > 0 && form.body.trim().length > 0 && !submitting

  return (
    <div className="space-y-4">
      {/* タイトル */}
      <div>
        <label className="font-mono text-xs font-bold text-ink/60 uppercase block mb-1">
          タイトル <span className="text-ink/40">({titleLen}/100)</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          maxLength={100}
          placeholder="お知らせのタイトル"
          className="w-full border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
        />
      </div>

      {/* 本文 */}
      <div>
        <label className="font-mono text-xs font-bold text-ink/60 uppercase block mb-1">
          本文 <span className="text-ink/40">({bodyLen}/1000)</span>
        </label>
        <textarea
          ref={bodyRef}
          value={form.body}
          onChange={(e) => onChange({ ...form, body: e.target.value })}
          maxLength={1000}
          placeholder="お知らせの本文（プレーンテキストのみ）"
          className="w-full border-2 border-ink rounded-lg px-3 py-2 text-sm resize-none overflow-hidden focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
          style={{ minHeight: '6rem' }}
        />
      </div>

      {/* 配信対象 */}
      <div>
        <p className="font-mono text-xs font-bold text-ink/60 uppercase mb-2">配信対象</p>
        <TargetSelector form={form} onChange={onChange} />
      </div>

      {/* ボタン */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand border-2 border-ink font-bold text-sm shadow-[3px_3px_0_0_#0A0A0A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#0A0A0A] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[3px_3px_0_0_#0A0A0A]"
          style={{ borderRadius: 10 }}
        >
          <Check className="w-3.5 h-3.5" />
          {submitting ? '送信中…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-ink font-bold text-sm shadow-[3px_3px_0_0_#0A0A0A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#0A0A0A] transition-all"
          style={{ borderRadius: 10 }}
        >
          <X className="w-3.5 h-3.5" />
          キャンセル
        </button>
      </div>
    </div>
  )
}

export default function AnnouncementsTab() {
  const { show: showToast } = useAdminToast()
  const qc = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<FormState>({ ...EMPTY_FORM })

  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>({ ...EMPTY_FORM })

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: items = [], isLoading } = useQuery<AnnouncementAdminItem[]>({
    queryKey: ['admin-announcements'],
    queryFn: () => api.get<AnnouncementAdminItem[]>('/api/admin/announcements').then((r) => r.data),
    staleTime: 30_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-announcements'] })

  const createMut = useMutation({
    mutationFn: (body: FormState) => api.post('/api/admin/announcements/', body),
    onSuccess: () => {
      showToast('お知らせを作成しました')
      setShowCreate(false)
      setCreateForm({ ...EMPTY_FORM })
      invalidate()
    },
    onError: () => showToast('作成に失敗しました'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<FormState> }) =>
      api.patch(`/api/admin/announcements/${id}`, body),
    onSuccess: () => {
      showToast('お知らせを更新しました')
      setEditId(null)
      invalidate()
    },
    onError: () => showToast('更新に失敗しました'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/announcements/${id}`),
    onSuccess: () => {
      showToast('お知らせを取り消しました')
      setConfirmDeleteId(null)
      invalidate()
    },
    onError: () => showToast('取り消しに失敗しました'),
  })

  const handleStartEdit = (ann: AnnouncementAdminItem) => {
    setEditId(ann.id)
    setEditForm({
      title: ann.title,
      body: ann.body,
      target_all: ann.target_all,
      target_faculties: [...ann.target_faculties],
      target_grades: [...ann.target_grades],
      target_genders: [...ann.target_genders],
    })
  }

  return (
    <div className="space-y-5">
      {/* 新規作成 */}
      <div className="card-bold p-4 bg-white space-y-4">
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="w-full flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-ink" />
            <span className="font-bold text-sm">新規お知らせを作成する</span>
          </div>
          {showCreate ? (
            <ChevronUp className="w-4 h-4 text-ink/60" />
          ) : (
            <ChevronDown className="w-4 h-4 text-ink/60" />
          )}
        </button>

        {showCreate && (
          <AnnouncementForm
            form={createForm}
            onChange={setCreateForm}
            onSubmit={() => createMut.mutate(createForm)}
            onCancel={() => {
              setShowCreate(false)
              setCreateForm({ ...EMPTY_FORM })
            }}
            submitting={createMut.isPending}
            submitLabel="公開する"
          />
        )}
      </div>

      {/* 一覧 */}
      <div className="space-y-3">
        <h2 className="font-mono text-xs font-bold text-ink/60 uppercase tracking-wide">
          送信済み一覧 ({items.length}件)
        </h2>

        {isLoading && (
          <p className="text-sm text-ink/60 py-4 text-center">読み込んでいます。少しお待ちください。</p>
        )}

        {!isLoading && items.length === 0 && (
          <p className="text-sm text-ink/60 py-4 text-center">お知らせはまだありません。</p>
        )}

        {items.map((ann) => (
          <div
            key={ann.id}
            className={`card-bold p-4 space-y-3 ${ann.is_deleted ? 'opacity-50' : 'bg-white'}`}
          >
            {/* ヘッダー行 */}
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-ink truncate">{ann.title}</p>
                  {ann.is_deleted && (
                    <span className="tag-pill text-[13px] bg-danger/10 text-danger border-danger/30">
                      取消済み
                    </span>
                  )}
                </div>
                <p className="font-mono text-[13px] text-ink/40 mt-0.5">
                  {new Date(ann.created_at).toLocaleDateString('ja-JP')} / {targetSummary(ann)}
                </p>
              </div>

              {/* アクションボタン（取消済みは非表示） */}
              {!ann.is_deleted && (
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => (editId === ann.id ? setEditId(null) : handleStartEdit(ann))}
                    className="w-7 h-7 flex items-center justify-center border-2 border-ink bg-white hover:bg-bone transition-colors"
                    style={{ borderRadius: 6 }}
                    title="編集"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDeleteId(confirmDeleteId === ann.id ? null : ann.id)
                    }
                    className="w-7 h-7 flex items-center justify-center border-2 border-ink bg-white hover:bg-danger/10 transition-colors"
                    style={{ borderRadius: 6 }}
                    title="取消"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-danger" />
                  </button>
                </div>
              )}
            </div>

            {/* 本文プレビュー */}
            <p className="text-xs text-ink/70 leading-relaxed line-clamp-2">{ann.body}</p>

            {/* 取消確認 */}
            {confirmDeleteId === ann.id && (
              <div className="border-t-2 border-ink/10 pt-3 flex items-center gap-3">
                <p className="text-xs font-bold text-danger flex-1">取り消すと元に戻せません。</p>
                <button
                  type="button"
                  onClick={() => deleteMut.mutate(ann.id)}
                  disabled={deleteMut.isPending}
                  className="px-3 py-1 bg-danger text-white border-2 border-ink font-bold text-xs shadow-[2px_2px_0_0_#0A0A0A] disabled:opacity-60"
                  style={{ borderRadius: 6 }}
                >
                  {deleteMut.isPending ? '処理中…' : '取り消す'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-3 py-1 bg-white border-2 border-ink font-bold text-xs shadow-[2px_2px_0_0_#0A0A0A]"
                  style={{ borderRadius: 6 }}
                >
                  やめておく
                </button>
              </div>
            )}

            {/* 編集フォーム（インライン展開） */}
            {editId === ann.id && (
              <div className="border-t-2 border-ink/20 pt-4">
                <AnnouncementForm
                  form={editForm}
                  onChange={setEditForm}
                  onSubmit={() => updateMut.mutate({ id: ann.id, body: editForm })}
                  onCancel={() => setEditId(null)}
                  submitting={updateMut.isPending}
                  submitLabel="更新する"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
