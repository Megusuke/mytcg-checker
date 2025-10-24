// src/db.ts
// IndexedDB ヘルパー（idb使用）: cards / ownership / images / imagesMeta
import { openDB } from 'idb'
import type { Card } from './models'

export const DB_NAME = 'mytcg-checker'
export const DB_VERSION = 3  // imagesMeta 追加時に v3

let _db: any | null = null

export async function getDB(): Promise<any> {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // cards: 可能なら keyPath=cardId で作成
      if (!db.objectStoreNames.contains('cards')) {
        db.createObjectStore('cards', { keyPath: 'cardId' })
      }
      // ownership: keyPath=cardId
      if (!db.objectStoreNames.contains('ownership')) {
        db.createObjectStore('ownership', { keyPath: 'cardId' })
      }
      // images: key=string（image-original:xxx / image-thumb:xxx など）
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images')
      }
      // 画像メタ情報（フォルダ名等）: key=string（image-folder:cardId）
      if (!db.objectStoreNames.contains('imagesMeta')) {
        db.createObjectStore('imagesMeta')
      }
    }
  })
  return _db
}

/* ------------------------------
 * cards
 * ------------------------------ */

// 全カードを取得（cardId昇順）
export async function getAllCards(): Promise<Card[]> {
  const db = await getDB()
  const tx = db.transaction('cards', 'readonly')
  const out: Card[] = []
  let cur = await tx.store.openCursor()
  while (cur) {
    out.push(cur.value as Card)
    cur = await cur.continue()
  }
  await tx.done
  return out.sort((a, b) => a.cardId.localeCompare(b.cardId, 'ja'))
}

// カードを一括登録/更新
// ★ keyPath 無し（out-of-line）の環境でも動くよう、明示キーを渡す
export async function putCards(cards: Card[]): Promise<void> {
  if (!cards?.length) return
  const db = await getDB()
  const tx = db.transaction('cards', 'readwrite')
  for (const c of cards) {
    // key=cardId を明示（既存ストアが keyPath でも out-of-line でもOK）
    await tx.store.put(c, (c as any).cardId)
  }
  await tx.done
}

/* ------------------------------
 * ownership
 * ------------------------------ */

export interface Ownership {
  cardId: string
  count: number
}

export async function getOwnership(cardId: string): Promise<Ownership | undefined> {
  const db = await getDB()
  const v = await db.get('ownership', cardId)
  return v as Ownership | undefined
}

// ★ 念のため ownership もキー引数を明示
export async function setOwnership(cardId: string, count: number): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('ownership', 'readwrite')
  await tx.store.put({ cardId, count } as Ownership, cardId)
  await tx.done
}

// 便利: 全 ownership を {cardId: count} で取得
export async function getAllOwnership(): Promise<Record<string, number>> {
  const db = await getDB()
  const tx = db.transaction('ownership', 'readonly')
  const map: Record<string, number> = {}
  let cur = await tx.store.openCursor()
  while (cur) {
    const v = cur.value as Ownership
    map[v.cardId] = v.count
    cur = await cur.continue()
  }
  await tx.done
  return map
}

// 便利: まとめて上書き
export async function putOwnershipBulk(map: Record<string, number>): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('ownership', 'readwrite')
  for (const [cardId, count] of Object.entries(map)) {
    await tx.store.put({ cardId, count } as Ownership, cardId)
  }
  await tx.done
}

/* ------------------------------
 * images / imagesMeta
 * ------------------------------ */

// 画像キー列挙（バックアップ用途）
export async function getAllImageKeys(): Promise<string[]> {
  const db = await getDB()
  const tx = db.transaction('images', 'readonly')
  const keys: string[] = []
  let cur = await tx.store.openCursor()
  while (cur) {
    keys.push(String(cur.key))
    cur = await cur.continue()
  }
  await tx.done
  return keys
}

// キー指定で画像Blob取得（例: image-original:OP01-001）
export async function getImageBlobByKey(key: string): Promise<Blob | undefined> {
  const db = await getDB()
  const v = await db.get('images', key)
  return v as Blob | undefined
}

// cardId に対する画像フォルダ名（OP01/OP02など）を保存
export async function putImageFolder(cardId: string, folder: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('imagesMeta', 'readwrite')
  await tx.store.put(folder, `image-folder:${cardId}`)
  await tx.done
}

// cardId からフォルダ名を取得
export async function getImageFolder(cardId: string): Promise<string | undefined> {
  const db = await getDB()
  const v = await db.get('imagesMeta', `image-folder:${cardId}`)
  return v as string | undefined
}

// すべての { cardId: folder } をMapで取得
export async function getAllImageFolderMap(): Promise<Record<string, string>> {
  const db = await getDB()
  const tx = db.transaction('imagesMeta', 'readonly')
  const map: Record<string, string> = {}
  let cur = await tx.store.openCursor()
  while (cur) {
    const k = String(cur.key)
    if (k.startsWith('image-folder:')) {
      const cardId = k.slice('image-folder:'.length)
      map[cardId] = String(cur.value)
    }
    cur = await cur.continue()
  }
  await tx.done
  return map
}

/* ------------------------------
 * util / maintenance
 * ------------------------------ */

// すべてのストアをクリア（初期化用・バックアップ復元用）
export async function clearAllStores(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear('cards'),
    db.clear('ownership'),
    db.clear('images'),
    db.clear('imagesMeta'),
  ])
}
