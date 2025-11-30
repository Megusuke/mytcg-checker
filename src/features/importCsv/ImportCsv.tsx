// CSVインポート：dan / dansort をサポート（旧 sort を dansort にフォールバック）
import { useRef, useState } from 'react'
import Papa from 'papaparse'
import type { Card } from '../../models'
import { putCards } from '../../db'

export function ImportCsv() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  function s(v: any): string {
    if (v === undefined || v === null) return ''
    return String(v).trim()
  }
  function nOpt(v: any): number | undefined {
    if (v === undefined || v === null) return undefined
    const t = String(v).trim()
    if (t === '') return undefined
    const n = Number(t)
    return Number.isFinite(n) ? n : undefined
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const text = await file.text()
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => String(h).trim(),
      })
      if (parsed.errors?.length) {
        console.error(parsed.errors)
        alert('CSV 解析に失敗しました。ヘッダや内容をご確認ください。')
        return
      }

      const rows: any[] = (parsed.data as any[]) || []
      const cards: Card[] = rows.map((r) => {
        // ヘッダ別名の許容（cardid / cardId）
        const cardId = s(r.cardId ?? r.cardid)
        // dan / dansort（dansortが未指定で旧sortがあればそれを採用）
        const dan = s(r.dan)
        const dansort = nOpt(r.dansort)
        const legacySort = nOpt(r.sort)
        const finalDansort = dansort ?? legacySort

        const card: Card = {
          cardId,
          dan: dan || undefined,
          dansort: finalDansort,
          sort: legacySort, // 互換保持（未使用だが残してOK）

          name: s(r.name),
          rarity: s(r.rarity),
          color: s(r.color),
          kind: s(r.kind),
          type: s(r.type),
          cost: s(r.cost),
          counter: s(r.counter),
          life: s(r.life),
          power: s(r.power),
          effect: s(r.effect),
          attribute: s(r.attribute),
          blockicon: s(r.blockicon),
        }
        return card
      }).filter(c => c.cardId)

      if (!cards.length) {
        alert('取り込む行がありません。cardId 列をご確認ください。')
        return
      }

      await putCards(cards)
      alert(`カードを ${cards.length} 件取り込みました`)
    } catch (err) {
      console.error(err)
      alert('CSV の読み込みに失敗しました。')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="panel" style={{ display:'grid', gap:8 }}>
      <h3 style={{ margin:'4px 0' }}>カードCSVのインポート</h3>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={onPick}
        disabled={busy}
        className="input"
      />
    </div>
  )
}
