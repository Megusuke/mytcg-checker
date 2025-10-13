import React, { useRef, useState } from 'react'
import Papa from 'papaparse'
import type { Card } from '../../models'
import { putCards } from '../../db'

export const ImportCsv: React.FC = () => {
  const [busy, setBusy] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function mapRow(row: any): Card {
    return {
      cardId: String(row.cardId ?? '').trim(),
      name: String(row.name ?? '').trim(),
      number: String(row.number ?? '').trim(),
      rarity: String(row.rarity ?? '').trim(),
      color: String(row.color ?? '').trim(),
      kind: String(row.kind ?? '').trim(),
      type: String(row.type ?? '').trim(),
      cost: String(row.cost ?? '').trim(),
      counter: String(row.counter ?? '').trim(),
      life: String(row.life ?? '').trim(),
      power: String(row.power ?? '').trim(),
      effect: String(row.effect ?? '').trim(),
      attribute: row.attribute ? String(row.attribute).trim() : undefined,
      blockicon: row.blockicon ? String(row.blockicon).trim() : undefined,
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.currentTarget // ← 先に保持
    const file = inputEl.files?.[0]
    if (!file) return
    setBusy(true)
    setCount(null)
    try {
      const text = await file.text()
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
      if (parsed.errors?.length) {
        console.warn(parsed.errors)
      }
      const rows = (parsed.data as any[])
      const cards: Card[] = rows.map(mapRow).filter(c => c.cardId)
      await putCards(cards)
      setCount(cards.length)
      alert(`カードを ${cards.length} 件取り込みました`)
    } catch (err) {
      console.error(err)
      alert('CSV取り込みでエラーが発生しました')
    } finally {
      // 入力の値をクリア（同じファイルを続けて選べるように）
      if (inputEl) inputEl.value = ''
      setBusy(false)
    }
  }

  return (
    <div style={{display:'grid', gap:8}}>
      <label style={{display:'inline-block', padding:'8px 12px', background:'#10b981', color:'#fff', borderRadius:8, cursor:'pointer'}}>
        カードCSVを選択
        <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onPick} hidden />
      </label>
      {busy && <div>読み込み中...</div>}
      {count !== null && <div>取り込み件数: {count}</div>}
      <small>CSVヘッダ: cardId,name,number,rarity,color,kind,type,cost,counter,life,power,effect,attribute,blockicon</small>
    </div>
  )
}
