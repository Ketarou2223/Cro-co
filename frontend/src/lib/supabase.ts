// 解説: このファイルはフロントエンド用 Supabase クライアントを生成する（§5 保護ファイル・ロジック変更禁止）。
// 解説: anon キー使用 = RLS が適用される公開クライアント（バックエンドの service_role クライアントとは別物）
// 解説: 主な用途: ① supabase.auth.getSession() で JWT 取得（api.ts が使う）② supabase.auth.onAuthStateChange（AuthContext が使う）
// 解説: フロントから supabase.from() で直接テーブルを叩くことは禁止（CLAUDE.md §4「service_role 一本化」）
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
