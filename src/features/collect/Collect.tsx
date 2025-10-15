import { useEffect, useMemo, useRef, useState } from 'react'
import { getAllCards, getOwnership, setOwnership } from '../../db'
import type { Card } from '../../models'
import { CardThumb } from '../../components/CardThumb'

function getSetId(cardId: string) {
  const m = cardId.match(/^[^-_]+/)
  return m ? m[0] : 'UNKNOWN'
}

export const Collect: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([])
  const [own, setOwn] = useState<Record<string, number>>({})
  const [qSet, setQSet] = useState<string>('ALL')  // OP01/OP02…
  const [busy, setBusy] = useState(false)

  // Pager
  const perPage = 9
  const pagerRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)

  useEffect(() => {
    setBusy(true)
    ;(async () => {
      const cs = await getAllCards()
      setCards(cs)
      const m: Record<string, number> = {}
      for (const c of cs) {
        const ow = await getOwnership(c.cardId)
        if (ow) m[c.cardId] = ow.count
      }
      setOwn(m)
      setBusy(false)
    })()
  }, [])

  const setOptions = useMemo(() => {
    const s = new Set<string>()
    for (const c of cards) s.add(getSetId(c.cardId))
    return ['ALL', ...Array.from(s).sort()]
  }, [cards])

  const filtered = useMemo(() => {
    let list = cards
    if (qSet !== 'ALL') list = list.filter(c => getSetId(c.cardId) === qSet)
    return [...list].sort((a,b)=> a.cardId.localeCompare(b.cardId,'ja'))
  }, [cards, qSet])

  // ★ 絞り込み後の所持数
  const ownedFiltered = useMemo(() => {
    if (!filtered.length) return 0
    let n = 0
    for (const c of filtered) {
      if ((own[c.cardId] ?? 0) > 0) n++
    }
    return n
  }, [filtered, own])

  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const pageCards = (p: number) => filtered.slice(p*perPage, p*perPage + perPage)

  async function toggle(cardId: string) {
    const cur = own[cardId] ?? 0
    const next = cur > 0 ? 0 : 1
    await setOwnership(cardId, next)
    setOwn(prev => ({ ...prev, [cardId]: next }))
  }

  // 横スクロールで現在ページを更新
  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const p = Math.round(el.scrollLeft / el.clientWidth)
    if (p !== page) setPage(p)
  }

  // セット切替時は先頭ページへ
  useEffect(() => {
    setPage(0)
    const el = pagerRef.current
    if (el) el.scrollTo({ left: 0, behavior: 'auto' })
  }, [qSet])

  return (
    <section className="collect">
      <div className="grid" style={{ gridTemplateColumns:'1fr auto', alignItems:'center' }}>
        <h2 style={{margin:0}}>
          収集：所持 {ownedFiltered} / {filtered.length}
          {filtered.length > 0 && (
            <span style={{marginLeft:8, color:'#94a3b8'}}>
              ({Math.round((ownedFiltered/filtered.length)*100)}%)
            </span>
          )}
        </h2>
        <select className="select" value={qSet} onChange={e => setQSet(e.target.value)}>
          {setOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {busy && <div style={{marginTop:8}}>読み込み中…</div>}

      {/* 横スクロール・スナップ（ボタンなし、スワイプのみ） */}
      <div className="pager" ref={pagerRef} onScroll={onScroll}>
        {Array.from({length: pages}).map((_, i) => (
          <div className="page" key={i}>
            <div className="collect-grid">
              {pageCards(i).map(c => {
                const owned = (own[c.cardId] ?? 0) > 0
                return (
                  <button
                    key={c.cardId}
                    className={`collect-item ${owned ? 'owned' : 'unowned'}`}
                    onClick={() => toggle(c.cardId)}
                    aria-pressed={owned}
                    title={c.cardId}
                  >
                    <CardThumb cardId={c.cardId} width="100%" />
                    {!owned && <div className="dim" aria-hidden="true" />}
                  </button>
                )
              })}
              {/* 3x3に満たない最終ページの穴埋め */}
              {Array.from({length: Math.max(0, perPage - pageCards(i).length)}).map((_, k) =>
                <div key={`pad-${k}`} className="collect-item pad" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ページインジケーター（ドット） */}
      <div style={{marginTop:8, display:'flex', justifyContent:'center', gap:6}}>
        {Array.from({length: pages}).map((_, i) => (
          <span key={i}
            style={{
              width: 6, height: 6, borderRadius: 9999,
              background: i===page ? '#38bdf8' : '#334155'
            }}
          />
        ))}
      </div>
    </section>
  )
}
