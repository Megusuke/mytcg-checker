import { useEffect, useMemo, useState } from 'react'
import { getAllCards, getAllOwnership } from '../../db'
import type { Card } from '../../models'

type DanStats = {
  total: number
  owned: number
}

export const Stats: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([])
  const [ownMap, setOwnMap] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setBusy(true)
    ;(async () => {
      const cs = await getAllCards()
      const om = await getAllOwnership()
      setCards(cs)
      setOwnMap(om)
      setBusy(false)
    })()
  }, [])

  const totalCards = cards.length
  const ownedDistinct = useMemo(() => {
    let n = 0
    for (const c of cards) {
      if ((ownMap[c.cardId] ?? 0) > 0) n++
    }
    return n
  }, [cards, ownMap])

  // dan 別の集計（CSVの dan 列。無い場合は 'UNKNOWN'）
  const byDan = useMemo(() => {
    const acc = new Map<string, DanStats>()
    for (const c of cards) {
      const dan = (c as any).dan ? String((c as any).dan) : 'UNKNOWN'
      const s = acc.get(dan) ?? { total: 0, owned: 0 }
      s.total += 1
      if ((ownMap[c.cardId] ?? 0) > 0) s.owned += 1
      acc.set(dan, s)
    }
    // 表示用に並べ替え（UNKNOWN は最後）
    const entries = Array.from(acc.entries()).sort((a, b) => {
      const [ka] = a
      const [kb] = b
      if (ka === 'UNKNOWN' && kb !== 'UNKNOWN') return 1
      if (kb === 'UNKNOWN' && ka !== 'UNKNOWN') return -1
      return ka.localeCompare(kb, 'ja')
    })
    return entries
  }, [cards, ownMap])

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)

  return (
  <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, overflow: 'auto' }}>
      <div className="panel">
        {busy ? (
          <div>集計中…</div>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            <div>総カード数：{totalCards}</div>
            <div>所持枚数（種類）：{ownedDistinct}</div>
            <div>
              所持率：{pct(ownedDistinct, totalCards)}%
              <div className="progress" style={{ marginTop: 6 }}>
                <div
                  className="fill"
                  style={{ width: `${pct(ownedDistinct, totalCards)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        {busy ? (
          <div>集計中…</div>
        ) : byDan.length === 0 ? (
          <div>データがありません。</div>
        ) : (
          <div style={{ display: 'grid', gap: 10, maxHeight: '400px', overflowY: 'auto' }}>
            {byDan.map(([dan, s]) => (
              <div key={dan}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span className="badge" style={{ marginRight: 8 }}>{dan}</span>
                    {s.owned} / {s.total}（{pct(s.owned, s.total)}%）
                  </div>
                </div>
                <div className="progress" style={{ marginTop: 6 }}>
                  <div
                    className="fill"
                    style={{ width: `${pct(s.owned, s.total)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </section>
)
}
