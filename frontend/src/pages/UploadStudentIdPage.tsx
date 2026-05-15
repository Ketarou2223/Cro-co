import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

export default function UploadStudentIdPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const selected = e.target.files?.[0]
    if (!selected) return

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('JPEGまたはPNG形式の画像を選択してください')
      return
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('ファイルサイズは5MB以下にしてください')
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Content-Type を 'multipart/form-data' に指定することで axios の JSON変換を防ぎ、
      // ブラウザ XHR が正しい boundary 付きの Content-Type を自動設定する
      await api.post('/api/profile/upload-student-id', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      navigate('/pending')
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'アップロードに失敗しました')
      } else {
        setError('アップロードに失敗しました')
      }
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm space-y-6">
        {/* ヘッダー */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-3xl text-ink">学生証を確認</h1>
            <span className="font-mono text-xs bg-acid border-2 border-ink px-3 py-1 rounded-full font-bold">
              STEP 2 / 3
            </span>
          </div>
          <p className="text-sm text-ink/60">
            顔写真付きの学生証を撮影してアップロードしてください。
          </p>
        </div>

        {/* アップロードエリア */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
        />

        {previewUrl ? (
          <div
            className="card-bold rounded-[18px] overflow-hidden cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <img
              src={previewUrl}
              alt="学生証プレビュー"
              className="w-full object-contain max-h-56"
            />
            <div className="p-3 text-center">
              <p className="text-xs font-bold text-ink/60">タップして変更する</p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full card-bold rounded-[18px] border-2 border-dashed border-ink p-10 flex flex-col items-center gap-3 cursor-pointer hover:bg-acid/10 transition-colors"
            style={{ boxShadow: '4px 4px 0 0 #0A0A0A' }}
          >
            <svg width="120" height="120" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* IDカード本体 */}
              <rect x="4" y="20" width="100" height="66" rx="8" fill="#DFFF1F" stroke="#0A0A0A" strokeWidth="2.5"/>
              {/* 顔の円 */}
              <circle cx="34" cy="44" r="12" fill="white" stroke="#0A0A0A" strokeWidth="2"/>
              {/* 肩のライン */}
              <path d="M16 76 Q34 58 52 76" stroke="#0A0A0A" strokeWidth="2" fill="none"/>
              {/* テキスト行 */}
              <line x1="58" y1="38" x2="96" y2="38" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round"/>
              <line x1="58" y1="50" x2="86" y2="50" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="58" y1="60" x2="80" y2="60" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round"/>
              {/* 大学マーク（右上） */}
              <circle cx="91" cy="30" r="6" fill="#0A0A0A"/>
              <line x1="91" y1="24" x2="91" y2="36" stroke="white" strokeWidth="1.5"/>
              <line x1="85" y1="30" x2="97" y2="30" stroke="white" strokeWidth="1.5"/>
              {/* カメラボディ */}
              <rect x="78" y="74" width="46" height="34" rx="6" fill="white" stroke="#0A0A0A" strokeWidth="2.5"/>
              {/* カメラノッチ */}
              <path d="M91 74 L97 66 L107 66 L113 74" fill="white" stroke="#0A0A0A" strokeWidth="2" strokeLinejoin="round"/>
              {/* カメラレンズ */}
              <circle cx="101" cy="90" r="10" fill="#0A0A0A"/>
              <circle cx="101" cy="90" r="6" fill="white"/>
              <circle cx="101" cy="90" r="3" fill="#0A0A0A"/>
            </svg>
            <span className="font-bold text-ink">タップして写真を選ぶ</span>
            <span className="text-xs text-ink/50 font-mono">JPEG / PNG • 最大5MB</span>
          </button>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-hot text-white border-2 border-ink p-3 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        {/* 注意事項 */}
        <div className="bg-acid border-2 border-ink rounded-lg p-4 space-y-2">
          <p className="font-bold text-xs text-ink uppercase font-mono">注意事項</p>
          <ul className="text-sm text-ink space-y-1">
            <li className="flex gap-2"><span>•</span><span>顔と学生証が両方はっきり写っていること</span></li>
            <li className="flex gap-2"><span>•</span><span>文字が読み取れる明るさであること</span></li>
            <li className="flex gap-2"><span>•</span><span>加工・切り抜きなし</span></li>
          </ul>
          <p className="text-xs text-ink/60">審査完了まで1〜2日かかる場合があります。</p>
        </div>

        {/* ボタン */}
        <div className="space-y-3">
          <Button
            variant="bold"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full h-11 text-base"
          >
            {isUploading ? 'アップロード中...' : 'アップロードして申請'}
          </Button>

          <Button
            variant="outline-bold"
            onClick={() => navigate('/pending')}
            disabled={isUploading}
            className="w-full h-11 text-base"
          >
            キャンセル
          </Button>
        </div>
      </div>
    </div>
  )
}
