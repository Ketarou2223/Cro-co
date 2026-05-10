import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

export default function UploadStudentIdPage() {
  const navigate = useNavigate()
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">学生証のアップロード</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            本人確認のため、学生証の画像をアップロードしてください。
          </p>

          <Input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileChange}
            disabled={isUploading}
          />

          {previewUrl && (
            <img
              src={previewUrl}
              alt="学生証プレビュー"
              className="w-full rounded-md object-contain max-h-48 border"
            />
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? 'アップロード中...' : 'アップロード'}
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/pending')}
            disabled={isUploading}
            className="w-full"
          >
            キャンセル
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
