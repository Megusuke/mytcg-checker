import { useEffect, useState } from 'react'
import { getAllCards } from '../../db'
import type { Card } from '../../models'
import { CardThumb } from '../../components/CardThumb'

export const Gallery: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([])
  const [q, setQ] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      const cs = await getAllCards()
      setCards(cs)
    })()
  }, [])

  const filtered = cards.filter((c: Card) => {
    if (!q.trim()) return true
    const t = q.trim().toLowerCase()
    return (
      c.cardId.toLowerCase().includes(t) ||
      (c.name ?? '').toLowerCase().includes(t) ||
      (c.type ?? '').toLowerCase().includes(t)
    )
  })

  return (
    <section>
      <div className="panel toolbar" style={{ display: 'grid', gap: 8 }}>
        <input
          className="input"
          placeholder="検索（cardId / 名前 / 特徴）"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="cards-grid">
        {filtered.map((c: Card) => (
          <div key={c.cardId} className="card tight">
            <div className="thumb-box">
              <CardThumb cardId={c.cardId} width="100%" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
