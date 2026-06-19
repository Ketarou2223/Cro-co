// 解説: このファイルは学部・学科の連動セレクトコンポーネントを定義する。
// 解説: 呼ばれる場所: SetupRequiredPage.tsx / ProfileEditPage.tsx でプロフィール入力に使う
// 解説: 学部を変更すると onDepartmentChange('') が呼ばれ学科選択がリセットされる（連動）
// 解説: disabled = 承認済みユーザーは学部・学科を変更できない（不正防止）
import { FACULTIES, FACULTY_NAMES } from '@/lib/osaka-u-data'
import { Label } from '@/components/ui/label'

interface FacultySelectorProps {
  faculty: string
  department: string
  onFacultyChange: (faculty: string) => void
  onDepartmentChange: (department: string) => void
  disabled?: boolean
}

export default function FacultySelector({
  faculty,
  department,
  onFacultyChange,
  onDepartmentChange,
  disabled,
}: FacultySelectorProps) {
  // 解説: departments = 選択中の学部に紐づく学科一覧（未選択なら空配列）
  const departments = FACULTIES[faculty] ?? []

  // 解説: handleFacultyChange = 学部変更時に学科を '' にリセットして連動選択を保証する
  const handleFacultyChange = (value: string) => {
    onFacultyChange(value)
    onDepartmentChange('')
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          {/* @copy CRO-label-faculty-selector-01 Lv1 */}
          <Label className="font-mono text-xs font-bold text-muted uppercase">学部</Label>
          {disabled && (
            <span className="font-mono text-[10px] font-bold bg-brand border border-ink text-ink px-1.5 py-0.5 leading-none">
              {/* @copy CRO-label-faculty-selector-02 Lv0 */}
              承認済み
            </span>
          )}
        </div>
        <select
          value={faculty}
          onChange={(e) => handleFacultyChange(e.target.value)}
          disabled={disabled}
          className="w-full h-10 border-2 border-ink bg-background px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* @copy CRO-placeholder-faculty-selector-01 Lv1 */}
          <option value="">選択してください</option>
          {FACULTY_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        {/* @copy CRO-label-faculty-selector-03 Lv1 */}
        <Label className="font-mono text-xs font-bold text-muted uppercase">学科</Label>
        <select
          value={department}
          onChange={(e) => onDepartmentChange(e.target.value)}
          disabled={disabled || !faculty}
          className="w-full h-10 border-2 border-ink bg-background px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* @copy CRO-placeholder-faculty-selector-02 Lv1 */}
          <option value="">選択してください</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
