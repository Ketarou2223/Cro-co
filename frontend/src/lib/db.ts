// 解説: このファイルはブラウザの IndexedDB（ローカル永続ストレージ）アクセスを管理するユーティリティを提供する。
// 解説: 呼ばれる場所: useChat.ts（メッセージキャッシュ）/ BrowsePage.tsx（プロフィールキャッシュ）等
// 解説: IndexedDB = ブラウザに内蔵された NoSQL DB。オフライン時もデータを保持できる。
//   localStorage（同期・小容量）と違い非同期で大容量データを扱える
// 解説: idb = IndexedDB のラッパーライブラリ（Promise/TypeScript で使いやすくしたもの）
// 解説: TTL（Time To Live）= データの有効期限（ms単位）。期限切れは null を返す

import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { MessageResponse } from '@/hooks/useChat'

// 解説: MatchedUser = マッチ一覧に表示する相手ユーザーの型定義
export interface MatchedUser {
  match_id: string
  user_id: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  avatar_url: string | null
  matched_at: string
  is_deleted?: boolean
  last_message?: {
    content: string
    created_at: string
    is_mine: boolean
  } | null
  last_activity_at?: string
  unread_count?: number
}

// 解説: BrowseProfileItem = おすすめ・検索一覧に表示するユーザーカードの型定義
export interface BrowseProfileItem {
  id: string
  name: string | null
  year: number | null
  faculty: string | null
  department: string | null
  bio: string | null
  avatar_url: string | null
  is_liked: boolean
  last_seen_at: string | null
  show_online_status: boolean
  status_message: string | null
  clubs?: string[]
}

// 解説: UnreadCounts = 未読件数のサマリー（バッジ表示に使う）
export interface UnreadCounts {
  matches: number
  messages: number
  views: number
  likes_received: number
}

// 解説: CrocoDBSchema = IndexedDB のスキーマ定義（テーブル名 + キー型 + 値型）
interface CrocoDBSchema extends DBSchema {
  matches: {
    key: string
    value: { data: MatchedUser[]; fetchedAt: number }
  }
  messages: {
    key: string
    value: { data: MessageResponse[]; fetchedAt: number }
  }
  profiles: {
    key: string
    value: { data: BrowseProfileItem[]; fetchedAt: number }
  }
  unread: {
    key: string
    value: { data: UnreadCounts; fetchedAt: number }
  }
}

const DB_NAME = 'croco-db'
const DB_VERSION = 1

// 解説: dbInstance = DB 接続をシングルトンとして保持する（何度も openDB を呼ばないため）
let dbInstance: IDBPDatabase<CrocoDBSchema> | null = null

// 解説: getDB() = DB 接続を取得する（まだ開いていなければ openDB で開く）
export async function getDB() {
  if (dbInstance) return dbInstance
  dbInstance = await openDB<CrocoDBSchema>(DB_NAME, DB_VERSION, {
    // 解説: upgrade = DB を初めて作る（またはバージョンが上がる）ときに呼ばれる
    upgrade(db) {
      db.createObjectStore('matches')
      db.createObjectStore('messages')
      db.createObjectStore('profiles')
      db.createObjectStore('unread')
    },
  })
  return dbInstance
}

// 解説: dbGet(store, key, ttlMs) = 指定ストアのキーからデータを取得する（TTL 切れは null）
export async function dbGet<K extends 'matches' | 'messages' | 'profiles' | 'unread'>(
  store: K,
  key: string,
  ttlMs: number
): Promise<CrocoDBSchema[K]['value']['data'] | null> {
  try {
    const db = await getDB()
    const record = await db.get(store, key)
    if (!record) return null
    // 解説: Date.now() - fetchedAt > ttlMs = 取得してから ttlMs ミリ秒以上経過していたら期限切れ
    if (Date.now() - record.fetchedAt > ttlMs) return null
    return record.data as CrocoDBSchema[K]['value']['data']
  } catch {
    return null
  }
}

// 解説: dbSet(store, key, data) = 指定ストアにデータを保存する（fetchedAt = 保存時刻）
export async function dbSet<K extends 'matches' | 'messages' | 'profiles' | 'unread'>(
  store: K,
  key: string,
  data: CrocoDBSchema[K]['value']['data']
) {
  try {
    const db = await getDB()
    await db.put(store, { data, fetchedAt: Date.now() } as CrocoDBSchema[K]['value'], key)
  } catch {
    // IndexedDB unavailable (private browsing etc.) — silently degrade
  }
}

// 解説: dbDelete(store, key) = 指定ストアのキーのデータを削除する
export async function dbDelete(store: 'matches' | 'messages' | 'profiles' | 'unread', key: string) {
  try {
    const db = await getDB()
    await db.delete(store, key)
  } catch {}
}

// 解説: clearAllDB() = 全ストアのデータを一括削除する（ログアウト時のキャッシュ消去に使う）
export async function clearAllDB() {
  try {
    const db = await getDB()
    await Promise.all([
      db.clear('matches'),
      db.clear('messages'),
      db.clear('profiles'),
      db.clear('unread'),
    ])
  } catch {}
}

// 解説: clearSensitiveStorage() = localStorage のセンシティブなキーを削除する（ログアウト時）
//   setup_draft_ / setup_step_ = セットアップ途中の下書きデータ
export function clearSensitiveStorage() {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('setup_draft_') || key.startsWith('setup_step_'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
    localStorage.removeItem('cro-co-profile-draft')
    localStorage.removeItem('crocoBrowseHistory')
    localStorage.removeItem('crocoBrowseApplied')
  } catch {}
}
