import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { MessageResponse } from '@/hooks/useChat'

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
}

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

export interface UnreadCounts {
  matches: number
  messages: number
  views: number
  likes_received: number
}

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

let dbInstance: IDBPDatabase<CrocoDBSchema> | null = null

export async function getDB() {
  if (dbInstance) return dbInstance
  dbInstance = await openDB<CrocoDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('matches')
      db.createObjectStore('messages')
      db.createObjectStore('profiles')
      db.createObjectStore('unread')
    },
  })
  return dbInstance
}

export async function dbGet<K extends 'matches' | 'messages' | 'profiles' | 'unread'>(
  store: K,
  key: string,
  ttlMs: number
): Promise<CrocoDBSchema[K]['value']['data'] | null> {
  try {
    const db = await getDB()
    const record = await db.get(store, key)
    if (!record) return null
    if (Date.now() - record.fetchedAt > ttlMs) return null
    return record.data as CrocoDBSchema[K]['value']['data']
  } catch {
    return null
  }
}

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

export async function dbDelete(store: 'matches' | 'messages' | 'profiles' | 'unread', key: string) {
  try {
    const db = await getDB()
    await db.delete(store, key)
  } catch {}
}

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
  } catch {}
}
