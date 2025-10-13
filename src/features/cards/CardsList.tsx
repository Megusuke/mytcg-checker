import React, { useEffect, useMemo, useState } from 'react'
import type { Card } from '../../models'
import { getAllCards, getOwnership, setOwnership } from '../../db'
import { CardThumb } from '../../components/CardThumb'
import { ImageModal } from '../../components/ImageModal'

type SortKey = 'name' | 'number' | 'rarity' | 'color'

export const CardsList: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [ownCache, setOwnCache] = useState<Record<string, number>>({})
  const [filterColor, setFilterColor] = useState<string>('ALL')
  const [filterRarity, setFilterRarity] = useState<string>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('number')
  const [sortAsc, setSortAsc] = useState<boolean>(true)
  const [onlyOwned, setOnlyOwned] = useState<boolean>(false)
  const [previewId, setPreviewId] = useState<string | null>(null) // ★ 追加

  useEffect(() => {
    setBusy(true)
    getAllCards().then(list => {
      setCards(list)
      setBusy(false)
    })
  }, [])

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

  const colorOptions = useMemo(() => ['ALL', ...Array.from(new Set(cards.map(c => c.color).filter(Boolean))).sort()], [cards])
  const rarityOptions = useMemo(() => ['ALL', ...Array.from(new Set(cards.map(c => c.rarity).filter(Boolean))).sort()], [cards])

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase()
    let list = cards

    if (key) {
      list = list.filter(c =>
        (c.name?.toLowerCase().includes(key)) ||
        (c.number?.toLowerCase().includes(key)) ||
        (c.type?.toLowerCase().includes(key)) ||
        (c.effect?.toLowerCase().includes(key))
      )
    }
    if (filterColor !== 'ALL') list = list.filter(c => c.color === filterColor)
    if (filterRarity !== 'ALL') list = list.filter(c => c.rarity === filterRarity)
    if (onlyOwned) list = list.filter(c => (ownCache[c.cardId] ?? 0) > 0)

    const mul = sortAsc ? 1 : -1
    list = [...list].sort((a, b) => {
      const av = (a[sortKey] ?? '').toString()
      const bv = (b[sortKey] ?? '').toString()
      return av.localeCompare(bv, 'ja') * mul
    })
    return list
  }, [cards, q, filterColor, filterRarity, sortKey, sortAsc, onlyOwned, ownCache])

  async function changeCount(cardId: string, next: number) {
    if (next < 0) next = 0
    await setOwnership(cardId, next)
    setOwnCache(prev => ({ ...prev, [cardId]: next }))
  }

  async function toggleOwned(cardId: string) {
    const cur = ownCache[cardId] ?? 0
    const next = cur > 0 ? 0 : 1
    await changeCount(cardId, next)
  }

  const ownedKinds = Object.values(ownCache).filter(n => (n ?? 0) > 0).length
  const progress = cards.length ? Math.round(ownedKinds / cards.length * 100) : 0

  return (
    <section>
      <h2>カード一覧（{filtered.length} / {cards.length}） 所持率: {progress}%</h2>

  // 1) ツールバー
  <div className="toolbar grid" style={{gridTemplateColumns:'1fr repeat(4, minmax(120px, auto))', alignItems:'center'}}>
    <input className="input" placeholder="検索（名前/番号/タイプ/効果）" … />
    <select className="select" …>{/* color */}</select>
    <select className="select" …>{/* rarity */}</select>
    <select className="select" …>{/* sort */}</select>
    <button className="btn ghost" onClick={() => setSortAsc(s=>!s)}>{sortAsc?'昇順':'降順'}</button>
  </div>

  <div style={{display:'flex', gap:12, alignItems:'center', marginTop:8}}>
    <label style={{display:'inline-flex', alignItems:'center', gap:6}}>
      <input type="checkbox" checked={onlyOwned} onChange={e => setOnlyOwned(e.target.checked)} />
      所持のみ
    </label>
    <button className="btn neutral" onClick={() => { … }}>絞り込みリセット</button>
  </div>

      {busy && <div style={{marginTop:8}}>読み込み中...</div>}
      {!busy && !cards.length && <div style={{marginTop:8}}>カードがありません。CSVを取り込んでください。</div>}

      // 2) カード行
      <div key={card.cardId} className={`card ${owned ? 'owned':''}`}>
        {filtered.map(card => {
          const cnt = ownCache[card.cardId] ?? 0
          const owned = cnt > 0
          return (
            <div key={card.cardId} style={{
              display:'grid', gridTemplateColumns:'96px 1fr', gap:8,
              border:'1px solid #eee', borderRadius:12, padding:8,
              background: owned ? '#f0fdf4' : 'white'
            }}>
              <div style={{position:'relative'}}>
                {/* サムネをタップで拡大 */}
                <button
                  onClick={() => setPreviewId(card.cardId)}
                  style={{all:'unset', cursor:'zoom-in', display:'block', lineHeight:0}}
                  aria-label="原本画像を拡大"
                  title="原本画像を拡大"
                >
                  <CardThumb cardId={card.cardId} size={96}/>
                </button>
                <button
                  title="クイック所持トグル"
                  onClick={() => toggleOwned(card.cardId)}
                  style={{
                    position:'absolute', right:4, bottom:4,
                    fontSize:12, padding:'2px 6px',
                    borderRadius:6, border:'1px solid #ccc',
                    background: owned ? '#10b981' : '#fff', color: owned ? '#fff' : '#111'
                  }}
                >
                  {owned ? '所持✓' : '未所持'}
                </button>
              </div>

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

      {previewId && (
        <ImageModal
          cardId={previewId}
          title={cards.find(c => c.cardId === previewId)?.name ?? previewId}
          onClose={() => setPreviewId(null)}
        />
      )}
    </section>
  )
}
