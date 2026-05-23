import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Phase 13 で profile-images バケットを Private 化したときに使う signed URL ヘルパー
// 現在は未使用（バケットが Public のため）。Private 化後にこちらに切り替える。
export async function getProfileImageSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('profile-images')
      .createSignedUrl(path, expiresIn)
    if (error || !data) return null
    return data.signedUrl
  } catch {
    return null
  }
}
