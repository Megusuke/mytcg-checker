// src/db.ts
import { openDB, type IDBPDatabase, type DBSchema as IDBDBSchema } from 'idb'
import type { Card, Ownership } from './models'

// idb の DBSchema に沿って「key/value」型を明示
interface AppDB extends IDBDBSchema {
  cards: {
    key: string;      // cardId
    value: Card;
  };
  ownership: {
    key: string;      // cardId
    value: Ownership;
  };
  images: {
    key: string;      // `image-original:{cardId}` / `image-thumb:{cardId}`
    value: Blob;      // 画像Blob
  };
}

let dbp: Promise<IDBPDatabase<AppDB>> | null = null

export function getDB() {
  if (!dbp) {
    dbp = openDB<AppDB>('opcg-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cards')) {
          db.createObjectStore('cards', { keyPath: 'cardId' })
        }
        if (!db.objectStoreNames.contains('ownership')) {
          db.createObjectStore('ownership', { keyPath: 'cardId' })
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images') // key は明示しない（任意の string）
        }
      }
    })
  }
  return dbp!
}

// === Bulk ops & ownership helpers ===
import type { IDBPDatabase } from 'idb'

export async function putCards(cards: Card[]) {
  const db = await getDB()
  const tx = db.transaction('cards', 'readwrite')
  for (const c of cards) {
    await tx.store.put(c)
  }
  await tx.done
}

export async function getAllCards(): Promise<Card[]> {
  const db = await getDB()
  return db.getAll('cards')
}

export async function getOwnership(cardId: string): Promise<Ownership | undefined> {
  const db = await getDB()
  return db.get('ownership', cardId)
}

export async function setOwnership(cardId: string, count: number) {
  const db = await getDB()
  const now = Date.now()
  await db.put('ownership', { cardId, count, updatedAt: now })
}

export async function getAllOwnership(): Promise<Ownership[]> {
  const db = await getDB()
  return db.getAll('ownership')
}

// 画像キー列挙 & 取得
export async function getAllImageKeys(): Promise<string[]> {
  const db = await getDB()
  const tx = db.transaction('images')
  const keys = await tx.store.getAllKeys()
  return keys.map(String).filter(k => k.startsWith('image-original:'))
}

export async function getImageBlobByKey(key: string): Promise<Blob | undefined> {
  const db = await getDB()
  return db.get('images', key)
}

// ストア全消去（上書きインポート用）
export async function clearAllStores() {
  const db = await getDB()
  await Promise.all([
    db.clear('cards'),
    db.clear('ownership'),
    db.clear('images'),
  ])
}

// まとめ書き込み（上書き）
export async function putOwnershipBulk(rows: Ownership[]) {
  const db = await getDB()
  const tx = db.transaction('ownership', 'readwrite')
  for (const r of rows) await tx.store.put(r)
  await tx.done
}
