import React, { useEffect, useMemo, useState } from 'react'
import type { Card } from '../../models'
import { getAllCards, getOwnership, setOwnership } from '../../db'
import { CardThumb } from '../../components/CardThumb'

export const CardsList: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [ownCache, setOwnCache] = useState<Record<string, number>>({})

  useEffect(() => {
    setBusy(true)
    getAllCards().then(list => {
      setCards(list)
      setBusy(false)
    })
  }, [])

  // 検索（名前・番号・タイプ・効果を部分一致）
  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase()
    if (!key) return cards
    return cards.filter(c =>
      (c.name?.toLowerCase().includes(key)) ||
      (c.number?.toLowerCase().includes(key)) ||
      (c.type?.toLowerCase().includes(key)) ||
      (c.effect?.toLowerCase().includes(key))
    )
  }, [q, cards])

  // 所持枚数の遅延ロード（行が表示された時に読む方式でもOK。ここは最初にざっと読む簡易実装）
  useEffect(() => {
    (async () => {
      const copy: Record<string, number> = {}
      for (const c of cards) {
        const ow = await getOwnership(c.cardId)
        if (ow) copy[c.cardId] = ow.count
      }
      setOwnCache(copy)
    })()
  }, [cards])

  async function changeCount(cardId: string, next: number) {
    if (next < 0) next = 0
    await setOwnership(cardId, next)
    setOwnCache(prev => ({ ...prev, [cardId]: next }))
  }

  const ownedKinds = Object.values(ownCache).filter(n => (n ?? 0) > 0).length
  const progress = cards.length ? Math.round(ownedKinds / cards.length * 100) : 0

  return (
    <section>
      <h2>カード一覧（{filtered.length} / {cards.length}） 所持率: {progress}%</h2>
      <input
        placeholder="検索（名前/番号/タイプ/効果）"
        value={q}
        onChange={e => setQ(e.target.value)}
        style={{width:'100%', padding:8, margin:'8px 0', border:'1px solid #ddd', borderRadius:8}}
      />
      {busy && <div>読み込み中...</div>}
      {!busy && !cards.length && <div>カードがありません。CSVを取り込んでください。</div>}

      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',
        gap:12
      }}>
        {filtered.map(card => {
          const cnt = ownCache[card.cardId] ?? 0
          return (
            <div key={card.cardId} style={{display:'grid', gridTemplateColumns:'96px 1fr', gap:8, border:'1px solid #eee', borderRadius:12, padding:8}}>
              <CardThumb cardId={card.cardId} size={96}/>
              <div style={{display:'grid', gap:4}}>
                <div style={{fontWeight:600}}>{card.name} <small>({card.cardId})</small></div>
                <div style={{fontSize:12, color:'#666'}}>
                  #{card.number} / {card.rarity} / {card.color} / {card.kind}
                </div>
                <div style={{fontSize:12, color:'#666', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={card.effect}>
                  {card.effect}
                </div>
                <div style={{display:'flex', alignItems:'center', gap:8, marginTop:6}}>
                  <button onClick={() => changeCount(card.cardId, cnt - 1)}>-</button>
                  <input
                    type="number"
                    min={0}
                    value={cnt}
                    onChange={e => changeCount(card.cardId, Number(e.target.value))}
                    style={{width:60, textAlign:'center'}}
                  />
                  <button onClick={() => changeCount(card.cardId, cnt + 1)}>+</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
