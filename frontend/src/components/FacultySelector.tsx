import { OSAKA_U_FACULTIES } from '@/lib/osaka-u-data'
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
  const selectedFaculty = OSAKA_U_FACULTIES.find((f) => f.name === faculty)
  const departments = (selectedFaculty?.departments as readonly string[]) ?? []

  const handleFacultyChange = (value: string) => {
    onFacultyChange(value)
    onDepartmentChange('')
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="font-mono text-xs font-bold text-ink/60 uppercase">学部</Label>
          {disabled && (
            <span className="font-mono text-[10px] font-bold bg-acid border border-ink text-ink px-1.5 py-0.5 leading-none">
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
          <option value="">選択してください</option>
          {OSAKA_U_FACULTIES.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="font-mono text-xs font-bold text-ink/60 uppercase">学科</Label>
        <select
          value={department}
          onChange={(e) => onDepartmentChange(e.target.value)}
          disabled={disabled || !faculty}
          className="w-full h-10 border-2 border-ink bg-background px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed"
        >
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
