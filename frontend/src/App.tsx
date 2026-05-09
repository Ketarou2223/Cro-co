import { useEffect, useState } from 'react'
import api from '@/lib/api'

export default function App() {
  const [result, setResult] = useState<string>('テスト中...')

  useEffect(() => {
    api
      .get('/api/test/supabase')
      .then((res) => setResult(JSON.stringify(res.data, null, 2)))
      .catch((err) => setResult(`エラー: ${String(err)}`))
  }, [])

  return (
    <div style={{ fontFamily: 'monospace', padding: '2rem' }}>
      <h1>Supabase 接続テスト</h1>
      <pre>{result}</pre>
    </div>
  )
}
