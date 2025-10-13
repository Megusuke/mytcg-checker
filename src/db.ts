// src/db.ts
import { openDB, type IDBPDatabase, type DBSchema as IDBDBSchema } from 'idb'
import type { Card, Ownership } from './models'

interface AppDB extends IDBDBSchema {
  cards: { key: string; value: Card };
  ownership: { key: string; value: Ownership };
  images: { key: string; value: Blob };
  meta: { key: string; value: any };
}

// ★ Promise で一元管理（_db を使わない）
let _dbPromise: Promise<IDBPDatabase<AppDB>> | null = null

export function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (_dbPromise) return _dbPromise
  _dbPromise = openDB<AppDB>('mytcg-checker', 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('cards')) db.createObjectStore('cards')
      if (!db.objectStoreNames.contains('ownership')) db.createObjectStore('ownership')
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images')
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
    },
  })
  return _dbPromise
}

// ====== Cards ======
export async function putCards(cards: Card[]) {
  const db = await getDB()
  const tx = db.transaction('cards', 'readwrite')
  for (const c of cards) await tx.store.put(c, c.cardId)
  await tx.done
}

export async function getAllCards(): Promise<Card[]> {
  const db = await getDB()
  return db.getAll('cards')
}

// ====== Ownership ======
export async function setOwnership(cardId: string, count: number) {
  const db = await getDB()
  const row: Ownership = { cardId, count: Math.max(0, Number(count) || 0) }
  await db.put('ownership', row, cardId)
}

export async function getOwnership(cardId: string): Promise<Ownership | null> {
  const db = await getDB()
  const row = await db.get('ownership', cardId)
  if (!row) return null
  return { cardId: row.cardId, count: Number((row as any).count ?? 0) }
}

// ====== Images ======
export async function getImage(key: string) {
  const db = await getDB()
  return db.get('images', key)
}
export async function putImageOriginal(cardId: string, blob: Blob) {
  const db = await getDB()
  await db.put('images', blob, `image-original:${cardId}`)
}
export async function putImageThumb(cardId: string, blob: Blob) {
  const db = await getDB()
  await db.put('images', blob, `image-thumb:${cardId}`)
}

export async function getAllOwnership(): Promise<Ownership[]> {
  const db = await getDB()
  return db.getAll('ownership')
}

// src/db.ts の末尾あたりに追記
export async function clearAllStores(options?: { exclude?: Array<'cards'|'ownership'|'images'|'meta'> }) {
  const db = await getDB()
  const exclude = new Set(options?.exclude ?? [])
  // クリアしたくないストアがあれば exclude に渡せます
  for (const s of ['cards','ownership','images','meta'] as const) {
    if (exclude.has(s)) continue
    const tx = db.transaction(s, 'readwrite')
    await tx.store.clear()
    await tx.done
  }
}

// src/db.ts に追記
export async function getAllImageKeys(prefix?: string): Promise<string[]> {
  const db = await getDB()
  const tx = db.transaction('images', 'readonly')
  const keys = await tx.store.getAllKeys()
  const list = keys.map(String)
  return prefix ? list.filter(k => k.startsWith(prefix)) : list
}

// src/db.ts に追記
export async function getImageBlobByKey(key: string): Promise<Blob | undefined> {
  const db = await getDB()
  const blob = await db.get('images', key)
  return blob ?? undefined
}

// src/db.ts に追記
export async function putOwnershipBulk(rows: Ownership[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('ownership', 'readwrite')
  for (const r of rows) {
    // 型を守りつつ0未満は0に
    const safe: Ownership = {
      cardId: String(r.cardId),
      count: Math.max(0, Number(r.count) || 0),
    }
    await tx.store.put(safe, safe.cardId)
  }
  await tx.done
}
