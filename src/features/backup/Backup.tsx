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
    // 期待形: { ownership: { cardId: number, ... }, purchases: { cardId: [ {place,price}, ... ] } }
    const cards = await getAllCards()
    const validCardIds = new Set(cards.map((c) => c.cardId))

    // ownership の復元
    if (obj && typeof obj.ownership === 'object') {
      const entries = Object.entries(obj.ownership)
      await Promise.all(
        entries.map(async ([cardId, val]) => {
          if (!validCardIds.has(cardId)) return
          const count = Number(val)
          if (!Number.isNaN(count)) {
            try {
              await setOwnership(cardId, count)
            } catch {
              // ignore per-item error
            }
          }
        })
      )
    }

    // purchases の復元（localStorage の sales.{cardId} に保存）
    if (obj && typeof obj.purchases === 'object') {
      const entries = Object.entries(obj.purchases)
      for (const [cardId, arr] of entries) {
        if (!validCardIds.has(cardId)) continue
        try {
          if (Array.isArray(arr)) {
            // 正規化: 各行を {place,price} にして保存
            const normalized = arr.map((r: any) => ({ place: String(r.place ?? ''), price: String(r.price ?? '') }))
            localStorage.setItem(salesKey(cardId), JSON.stringify(normalized))
          }
        } catch {
          // ignore
        }
      }
    }
  }

  async function importFromText(input: string) {
    if (!input || input.trim() === '') {
      toast.error('読み込む JSON が空です')
      return
    }
    try {
      const parsed = JSON.parse(input)
      await applyImportedObject(parsed)
      toast.success('インポートが完了しました')
      // 変更を UI に反映するためイベント等で通知したい場合は再ロードするか、必要な箇所で再読込処理を行ってください
    } catch (e) {
      toast.error('JSON の解析に失敗しました')
    }
  }

  async function pasteFromClipboardAndImport() {
    try {
      const text = await navigator.clipboard.readText()
      await importFromText(text)
    } catch {
      toast.error('クリップボードからの読み取りに失敗しました')
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const r = new FileReader()
    r.onload = async () => {
      const txt = String(r.result ?? '')
      await importFromText(txt)
    }
    r.readAsText(f, 'utf-8')
    // reset input so same file can be chosen again
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={exportOwnershipCopy}>所持状況をエクスポート（コピー）</button>
        <button onClick={exportPurchasesCopy}>購入情報をエクスポート（コピー）</button>
        <button onClick={exportAllCopy}>両方をエクスポート（コピー）</button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.8 }}>
        エクスポートは JSON 形式でクリップボードへコピーされます。以下からインポート（復元）できます。
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={pasteFromClipboardAndImport}>クリップボードからインポート</button>
          <input ref={fileRef} type="file" accept="application/json" onChange={onFileChange} />
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <textarea
            value={textArea}
            onChange={(e) => setTextArea(e.target.value)}
            placeholder='ここにエクスポートした JSON を貼り付けて「貼り付けからインポート」を押してください'
            style={{ width: '100%', minHeight: 120, padding: 8, borderRadius: 8, border: '1px solid #334155', background: 'var(--panel)' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={async () => {
                await importFromText(textArea)
              }}
            >
              貼り付けからインポート
            </button>
            <button
              onClick={() => {
                setTextArea('')
              }}
            >
              クリア
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Backup
