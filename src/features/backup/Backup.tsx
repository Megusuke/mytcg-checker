// src/features/backup/Backup.tsx
//
// 所持状況(ownership)だけをテキストでバックアップ/復元する簡易ツール。
// iPhoneのPWA環境でも確実に使えるように、ファイルダウンロードではなく
// テキストのコピー＆貼り付けでやり取りする方式。
// 通知は alert() で行い、トーストに依存しない。

import React, { useRef, useState } from 'react'
import { getAllCards, getOwnership, setOwnership } from '../../db'
import type { Card } from '../../models'

const salesKey = (cid: string) => `sales.${cid}`

// 軽いフォールバック通知
const toast = {
  success: (msg: string) => window.alert(msg),
  error: (msg: string) => window.alert(msg)
}

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch {
    return false
  }
}

async function gatherOwnership(cards: Card[]) {
  const map: Record<string, number> = {}
  await Promise.all(
    cards.map(async (c) => {
      const ow = await getOwnership(c.cardId)
      if (ow) map[c.cardId] = ow.count
    })
  )
  return map
}

async function gatherPurchases(cards: Card[]) {
  const out: Record<string, { place: string; price: string }[]> = {}
  for (const c of cards) {
    const raw = localStorage.getItem(salesKey(c.cardId))
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        out[c.cardId] = parsed.map((r: any) => ({ place: String(r.place ?? ''), price: String(r.price ?? '') }))
      }
    } catch {
      // ignore malformed
    }
  }
  return out
}

export const Backup: React.FC = () => {
  const [textArea, setTextArea] = useState<string>('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function exportOwnershipCopy() {
    try {
      const cards = await getAllCards()
      const ownership = await gatherOwnership(cards)
      const text = JSON.stringify({ ownership }, null, 2)
      const ok = await copyToClipboard(text)
      if (ok) toast.success('所持状況をクリップボードにコピーしました')
      else toast.error('クリップボードへのコピーに失敗しました')
    } catch (e) {
      toast.error('エクスポートに失敗しました')
    }
  }

  async function exportPurchasesCopy() {
    try {
      const cards = await getAllCards()
      const purchases = await gatherPurchases(cards)
      const text = JSON.stringify({ purchases }, null, 2)
      const ok = await copyToClipboard(text)
      if (ok) toast.success('購入情報をクリップボードにコピーしました')
      else toast.error('クリップボードへのコピーに失敗しました')
    } catch {
      toast.error('エクスポートに失敗しました')
    }
  }

  async function exportAllCopy() {
    try {
      const cards = await getAllCards()
      const ownership = await gatherOwnership(cards)
      const purchases = await gatherPurchases(cards)
      const text = JSON.stringify({ ownership, purchases }, null, 2)
      const ok = await copyToClipboard(text)
      if (ok) toast.success('所持状況と購入情報をクリップボードにコピーしました')
      else toast.error('クリップボードへのコピーに失敗しました')
    } catch {
      toast.error('エクスポートに失敗しました')
    }
  }

  // ---------- インポート（復元）処理 ----------
  async function applyImportedObject(obj: any) {
    const cards = await getAllCards()
    const validCardIds = new Set(cards.map((c) => c.cardId))

    // ownership の復元
    let ownership: Record<string, number> = {}
    
    if (obj && obj.ownership) {
      // 新形式（オブジェクト）か旧形式（配列）か判定
      if (Array.isArray(obj.ownership)) {
        // 旧形式: [ { cardId: "...", count: number }, ... ]
        for (const item of obj.ownership) {
          if (item && item.cardId && typeof item.count === 'number') {
            ownership[item.cardId] = item.count
          }
        }
      } else if (typeof obj.ownership === 'object') {
        // 新形式: { cardId: count, ... }
        ownership = obj.ownership
      }
    }

    // ownership を DB に保存
    const entries = Object.entries(ownership)
    await Promise.all(
      entries.map(async ([cardId, val]) => {
        if (!validCardIds.has(cardId)) return
        const count = Number(val)
        if (!Number.isNaN(count)) {
          try {
            await setOwnership(cardId, count)
          } catch {
            // ignore
          }
        }
      })
    )

    // purchases の復元（新形式のみ対応）
    if (obj && typeof obj.purchases === 'object') {
      const entries = Object.entries(obj.purchases)
      for (const [cardId, arr] of entries) {
        if (!validCardIds.has(cardId)) continue
        try {
          if (Array.isArray(arr)) {
            const normalized = arr.map((r: any) => ({ place: String(r.place ?? ''), price: String(r.price ?? '') }))
            localStorage.setItem(salesKey(cardId), JSON.stringify(normalized))
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-bold">バックアップ & 復元</h2>

      {/* エクスポート セクション */}
      <div className="border rounded p-4 space-y-2">
        <h3 className="font-semibold">エクスポート</h3>
        <button
          onClick={exportOwnershipCopy}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          所持状況をコピー
        </button>
        <button
          onClick={exportPurchasesCopy}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ml-2"
        >
          購入情報をコピー
        </button>
        <button
          onClick={exportAllCopy}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ml-2"
        >
          すべてコピー
        </button>
      </div>

      {/* インポート セクション */}
      <div className="border rounded p-4 space-y-2">
        <h3 className="font-semibold">インポート</h3>
        <textarea
          value={textArea}
          onChange={(e) => setTextArea(e.target.value)}
          placeholder="バックアップのテキストをここに貼り付けてください"
          className="w-full h-32 border rounded p-2 font-mono text-sm"
        />
        <button
          onClick={async () => {
            try {
              const obj = JSON.parse(textArea)
              await applyImportedObject(obj)
              toast.success('復元しました')
              setTextArea('')
            } catch {
              toast.error('無効なデータです')
            }
          }}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          復元する
        </button>
      </div>
    </div>
  )
}
