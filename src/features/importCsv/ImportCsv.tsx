import React, { useRef, useState } from 'react'
import Papa from 'papaparse'
import type { Card } from '../../models'
import { putCards } from '../../db'
import { useToast } from '../../components/Toaster'

function S(v: unknown): string {
  return (v ?? '').toString().trim()
}

export const ImportCsv: React.FC = () => {
  const [busy, setBusy] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  
function mapRow(row: any): Card {
  return {
    cardId:   S(row.cardId),     // 例: OP01-001
    name:     S(row.name),
    rarity:   S(row.rarity),
    color:    S(row.color),
    kind:     S(row.kind),
    type:     S(row.type),
    cost:     S(row.cost),
    counter:  S(row.counter),
    life:     S(row.life),
    power:    S(row.power),
    effect:   S(row.effect),
    attribute: row.attribute ? S(row.attribute) : undefined,
    blockicon: row.blockicon ? S(row.blockicon) : undefined,
  }
}

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.currentTarget
    const file = inputEl.files?.[0]
    if (!file) return
    setBusy(true)
    setCount(null)
    try {
      const text = await file.text()
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
      if (parsed.errors?.length) console.warn(parsed.errors)
      const rows = (parsed.data as any[])
      const cards: Card[] = rows.map(mapRow).filter(c => c.cardId)
      await putCards(cards)
      setCount(cards.length)
      // 成功時:
      toast({ text: `カードを ${cards.length} 件取り込みました`, type: 'ok' })
    } catch (err) {
      console.error(err)
      // エラー時:
      toast({ text: 'CSV取り込みでエラーが発生しました', type:'error' })
    } finally {
      inputEl.value = ''
      setBusy(false)
    }
  }

  return (
    <div style={{display:'grid', gap:8}}>
      <label className="btn ok" style={{width:'fit-content'}}>
       カードCSVを選択
       <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onPick} hidden />
      </label>
      {busy && <div className="badge">読み込み中…</div>}
    </div>
  )
}
