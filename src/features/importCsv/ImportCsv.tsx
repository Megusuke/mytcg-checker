import React, { useRef, useState } from 'react'
import Papa from 'papaparse'
import type { Card } from '../../models'
import { putCards } from '../../db'

export const ImportCsv: React.FC = () => {
  const [busy, setBusy] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function S(v: unknown): string {
    return (v ?? '').toString().trim()
  }

  function mapRow(row: any): Card {
    return {
      cardId: S(row.cardId),
      name:   S(row.name),
      number: S(row.number),
      rarity: S(row.rarity),
      color:  S(row.color),
      kind:   S(row.kind),
      type:   S(row.type),
      cost:   S(row.cost),
      counter:S(row.counter),
      life:   S(row.life),
      power:  S(row.power),
      effect: S(row.effect),
      attribute: row.attribute ? S(row.attribute) : undefined,
      blockicon: row.blockicon ? S(row.blockicon) : undefined,
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
