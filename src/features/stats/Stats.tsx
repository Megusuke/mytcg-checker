import React, { useEffect, useMemo, useState } from 'react'
import type { Card } from '../../models'
import { getAllCards, getAllOwnership } from '../../db'

// 例: "OP06-001" -> "OP06"
function getSetId(cardId: string): string {
  const m = cardId.match(/^[^-_]+/)
  return m ? m[0] : 'UNKNOWN'
}

export const Stats: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([])
  const [ownMap, setOwnMap] = useState<Record<string, number>>({})

  useEffect(() => {
    (async () => {
      const [cs, owns] = await Promise.all([getAllCards(), getAllOwnership()])
      setCards(cs)
      const map: Record<string, number> = {}
      for (const o of owns) map[o.cardId] = o.count
      setOwnMap(map)
    })()
  }, [])

  const { total, ownedKinds, bySet } = useMemo(() => {
    const total = cards.length
    let ownedKinds = 0
    const bySet: Record<string, { total: number; owned: number }> = {}

    for (const c of cards) {
      const setId = getSetId(c.cardId)
      bySet[setId] ??= { total: 0, owned: 0 }
      bySet[setId].total += 1

      const cnt = ownMap[c.cardId] ?? 0
      if (cnt > 0) {
        ownedKinds += 1
        bySet[setId].owned += 1
      }
    }
    return { total, ownedKinds, bySet }
  }, [cards, ownMap])

  const overall = total ? Math.round((ownedKinds / total) * 100) : 0
  const setRows = Object.entries(bySet)
    .map(([setId, v]) => ({ setId, ...v, pct: v.total ? Math.round((v.owned / v.total) * 100) : 0 }))
    .sort((a, b) => a.setId.localeCompare(b.setId))

  return (
    <section>
      <h2>統計</h2>
      <div style={{margin:'8px 0'}}>
        <strong>全体所持率:</strong> {ownedKinds} / {total}（{overall}%）
        <div style={{height:10, background:'#eee', borderRadius:6, overflow:'hidden', marginTop:6}}>
          <div style={{height:'100%', width:`${overall}%`}} />
        </div>
      </div>

      <h3 style={{marginTop:16}}>セット別</h3>
      <div style={{display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:8, alignItems:'center', maxWidth:520}}>
        <div style={{fontWeight:600}}>セット</div>
        <div style={{textAlign:'right', fontWeight:600}}>所持</div>
        <div style={{textAlign:'right', fontWeight:600}}>総数</div>
        <div style={{textAlign:'right', fontWeight:600}}>達成率</div>

        {setRows.map(r => (
          <React.Fragment key={r.setId}>
            <div>{r.setId}</div>
            <div style={{textAlign:'right'}}>{r.owned}</div>
            <div style={{textAlign:'right'}}>{r.total}</div>
            <div style={{textAlign:'right'}}>{r.pct}%</div>
          </React.Fragment>
        ))}
        {!setRows.length && <div style={{gridColumn:'1 / -1'}}>カードがありません。CSVを取り込んでください。</div>}
      </div>
    </section>
  )
}
