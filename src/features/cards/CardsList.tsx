import { useEffect, useMemo, useState } from 'react'
import type { Card } from '../../models'
import { getAllCards, getOwnership, setOwnership } from '../../db'
import { CardThumb } from '../../components/CardThumb'

function getSetId(cardId: string) {
  const m = cardId.match(/^[^-_]+/)
  return m ? m[0] : 'UNKNOWN'
}

export const CardsList: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([])
  const [busy, setBusy] = useState(false)
  const [ownCache, setOwnCache] = useState<Record<string, number>>({})
  const [ownReady, setOwnReady] = useState(false)

  // 絞り込み：検索語 / セット / 未所持のみ（デフォルトON）
  const [q, setQ] = useState('')
  const [setFilter, setSetFilter] = useState<string>('ALL')
  const [onlyUnowned, setOnlyUnowned] = useState<boolean>(true)

  useEffect(() => {
    setBusy(true)
    getAllCards().then(list => {
      setCards(list)
      setBusy(false)
    })
  }, [])

  // 所持キャッシュ
  useEffect(() => {
    ;(async () => {
      setOwnReady(false)
      const map: Record<string, number> = {}
      for (const c of cards) {
        const ow = await getOwnership(c.cardId)
        if (ow) map[c.cardId] = ow.count
      }
      setOwnCache(map)
      setOwnReady(true)
    })()
  }, [cards])

  // セット候補
  const setOptions = useMemo(() => {
    const uniq = new Set<string>()
    for (const c of cards) uniq.add(getSetId(c.cardId))
    return ['ALL', ...Array.from(uniq).sort()]
  }, [cards])

  // 絞り込み
  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase()
    let list = cards
    if (key) {
      list = list.filter(c =>
        (c.name ?? '').toLowerCase().includes(key) ||
        (c.cardId ?? '').toLowerCase().includes(key) ||
        (c.type ?? '').toLowerCase().includes(key) ||
        (c.effect ?? '').toLowerCase().includes(key)
      )
    }
    if (setFilter !== 'ALL') list = list.filter(c => getSetId(c.cardId) === setFilter)
    if (onlyUnowned && ownReady) list = list.filter(c => (ownCache[c.cardId] ?? 0) === 0)

    return [...list].sort((a, b) => String(a.cardId).localeCompare(String(b.cardId), 'ja'))
  }, [cards, q, setFilter, onlyUnowned, ownCache, ownReady])

  // 所持変更
  async function setCount(cardId: string, next: number) {
    const safe = Math.max(0, Math.floor(next || 0))
    await setOwnership(cardId, safe)
    setOwnCache(prev => ({ ...prev, [cardId]: safe }))
  }
  async function toggleOwned(cardId: string) {
    const cur = ownCache[cardId] ?? 0
    await setCount(cardId, cur > 0 ? 0 : 1)
  }

  const ownedKinds = Object.values(ownCache).filter(n => (n ?? 0) > 0).length
  const progress = cards.length ? Math.round((ownedKinds / cards.length) * 100) : 0

  return (
    <section>
      <h2>カード検索 / 所持チェック（{filtered.length} / {cards.length}） 所持率: {progress}%</h2>

      {/* 絞り込み（検索・セット・未所持のみ） */}
      <div className="toolbar grid toolbar-grid">
        <input
          className="input"
          placeholder="検索（名前/番号/特徴/効果）"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <select className="select" value={setFilter} onChange={e => setSetFilter(e.target.value)}>
          {setOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label style={{display:'inline-flex', alignItems:'center', gap:6}}>
          <input
            type="checkbox"
            checked={onlyUnowned}
            onChange={e => setOnlyUnowned(e.target.checked)}
          />
          未所持のみ
        </label>
        <div></div>
      </div>

      {busy && <div style={{ marginTop: 8 }}>読み込み中...</div>}
      {!busy && !cards.length && <div style={{ marginTop: 8 }}>カードがありません。CSVを取り込んでください。</div>}

      {/* 画像フル幅＋下にコントロール（左右の余白なし） */}
      <div className="cards-grid">
        {filtered.map(card => {
          const cnt = ownCache[card.cardId] ?? 0
          const owned = cnt > 0
          return (
            <div key={card.cardId} className={`card tight ${owned ? 'owned' : ''}`} style={{gridTemplateColumns:'1fr'}}>
              <div className="thumb-box">
                <CardThumb cardId={card.cardId} width="100%" />
              </div>
              <div
                className="controls"
                style={{
                  display:'grid',
                  gridTemplateColumns:'auto auto auto 1fr',
                  alignItems:'center',
                  gap:8
                }}
              >
                <button className="btn ghost" onClick={() => setCount(card.cardId, cnt - 1)} aria-label="減らす">-</button>
                <input
                  className="input input--num"
                  type="number"
                  min={0}
                  max={99}
                  inputMode="numeric"
                  value={cnt}
                  onChange={e => setCount(card.cardId, Number(e.target.value))}
                  aria-label="所持枚数"
                />
                <button className="btn ghost" onClick={() => setCount(card.cardId, cnt + 1)} aria-label="増やす">+</button>
                <button
                  className={`btn ${owned ? 'ok' : 'neutral'}`}
                  onClick={() => toggleOwned(card.cardId)}
                  aria-pressed={owned}
                  aria-label="所持トグル"
                  style={{ whiteSpace:'nowrap' }}
                >
                  {owned ? '所持✓' : '未所持'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="progress"><div className="fill" style={{ width: `${progress}%` }} /></div>
      </div>
    </section>
  )
}
