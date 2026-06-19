// 解説: このファイルは axios HTTP クライアントのシングルトンを定義する（§5 保護ファイル・ロジック変更禁止）。
// 解説: baseURL = VITE_API_URL（.env.local）。全ページはこの api を import して API 呼び出しをする
// 解説: interceptors.request = 毎リクエスト前に Supabase セッションから JWT を取得して Authorization ヘッダーに自動付与する
// 解説: この仕組みにより各コンポーネントはトークン管理を意識せず api.get/post/patch/delete を呼ぶだけでよい
import axios from 'axios'
import { supabase } from '@/lib/supabase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

export default api
