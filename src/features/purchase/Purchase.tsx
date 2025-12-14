import React, { useEffect, useMemo, useState } from 'react'
import { getAllCards, getAllOwnership, getOwnership, setOwnership } from '../../db'
import type { Card } from '../../models'
import { CardThumb } from '../../components/CardThumb'

function compareDansort(a: Card, b: Card): number {
  const ax = (a as any).dansort ?? ''
  const bx = (b as any).dansort ?? ''

  const an = Number(ax)
  const bn = Number(bx)
  const aNum = !Number.isNaN(an)
  const bNum = !Number.isNaN(bn)

  if (aNum && bNum) {
    if (an !== bn) return an - bn
  } else {
    const s = String(ax).localeCompare(String(bx), 'ja')
    if (s !== 0) return s
  }
  return a.cardId.localeCompare(b.cardId, 'ja')
}

type SaleRow = { place: string; price: string }

export const Purchase: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([])
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  // 検索タブ同様「未所持のみ」フィルタを保持（デフォルト ON）
  const [onlyUnowned, setOnlyUnowned] = useState<boolean>(() => {
    const saved = localStorage.getItem('purchase.onlyUnowned')
    return saved === null ? true : saved === '1'
  })
  const [ownMap, setOwnMap] = useState<Record<string, number>>({})
  const [ownCount, setOwnCount] = useState<number>(0)
  const [viewer, setViewer] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number>(-1) // sorted 内のインデックス
  const [sales, setSales] = useState<SaleRow[]>([])
  const salesKey = (cid: string) => `sales.${cid}`

  useEffect(() => {
    ;(async () => {
      const [cs, ownership] = await Promise.all([getAllCards(), getAllOwnership()])
      setCards(cs)
      setOwnMap(ownership)
    })()
  }, [])

  // フィルタ状態を保存
  useEffect(() => {
    localStorage.setItem('purchase.onlyUnowned', onlyUnowned ? '1' : '0')
  }, [onlyUnowned])

  // カードごとの最安値を取得
  const getMinPrice = (cardId: string): { place: string; price: number } | null => {
    const raw = localStorage.getItem(salesKey(cardId))
    if (!raw) return null
    try {
      const parsed: SaleRow[] = JSON.parse(raw)
      if (!Array.isArray(parsed) || parsed.length === 0) return null
      const valid = parsed.filter((r) => r.price && !Number.isNaN(Number(r.price)))
      if (valid.length === 0) return null
      const min = valid.reduce((acc, r) => {
        const p = Number(r.price)
        return p < acc.price ? { place: r.place, price: p } : acc
      }, { place: valid[0].place, price: Number(valid[0].price) })
      return min
    } catch {
      return null
    }
  }

  // ソート対象：販売情報がある（最安値が存在する）カードのみ
  const { sorted, withPriceCount } = useMemo(() => {
    const withPrice = cards
      .map((c) => {
        const min = getMinPrice(c.cardId)
        return min ? { card: c, minPrice: min } : null
      })
      .filter((x): x is { card: Card; minPrice: { place: string; price: number } } => x !== null)

    const filtered = onlyUnowned
      ? withPrice.filter(({ card }) => (ownMap[card.cardId] ?? 0) === 0)
      : withPrice

    return {
      sorted: filtered.sort((a, b) => {
        const diff = a.minPrice.price - b.minPrice.price
        return sortOrder === 'asc' ? diff : -diff
      }),
      withPriceCount: withPrice.length,
    }
  }, [cards, sortOrder, onlyUnowned, ownMap])

  const filteredCount = sorted.length

  // filtered が変わったら viewer の位置を更新
  useEffect(() => {
    if (!viewer) {
      setViewerIndex(-1)
      return
    }
    const idx = sorted.findIndex((x) => x.card.cardId === viewer)
    setViewerIndex(idx)
  }, [sorted, viewer])

  async function openViewer(cid: string, idxOverride?: number) {
    setViewer(cid)
    if (idxOverride !== undefined) setViewerIndex(idxOverride)
    else {
      const idx = sorted.findIndex((x) => x.card.cardId === cid)
      setViewerIndex(idx)
    }
    const raw = localStorage.getItem(salesKey(cid))
    try {
      const parsed: SaleRow[] = raw ? JSON.parse(raw) : []
      setSales(Array.isArray(parsed) ? parsed : [])
    } catch {
      setSales([])
    }
    const ow = await getOwnership(cid)
    setOwnCount(ow?.count ?? 0)
  }

  function saveSales(cid: string | null, next: SaleRow[] | null = null) {
    if (!cid) return
    const data = next ?? sales
    localStorage.setItem(salesKey(cid), JSON.stringify(data))
    setSales(data)
  }

  function addSaleRow() {
    const next = [...sales, { place: '', price: '' }]
    saveSales(viewer, next)
  }
  function updateSaleRow(idx: number, field: 'place' | 'price', value: string) {
    const next = sales.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    saveSales(viewer, next)
  }
  function removeSaleRow(idx: number) {
    const next = sales.filter((_, i) => i !== idx)
    saveSales(viewer, next)
  }

  async function inc() {
    if (!viewer) return
    const next = ownCount + 1
    await setOwnership(viewer, next)
    setOwnCount(next)
    setOwnMap((prev) => ({ ...prev, [viewer]: next }))
  }

  async function dec() {
    if (!viewer) return
    const next = Math.max(0, ownCount - 1)
    await setOwnership(viewer, next)
    setOwnCount(next)
    setOwnMap((prev) => ({ ...prev, [viewer]: next }))
  }

  function openByIndex(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= sorted.length) return
    const entry = sorted[nextIndex]
    if (entry) openViewer(entry.card.cardId, nextIndex)
  }

  // スワイプで前後カードへ
  let touchStartX = 0
  let touchStartY = 0
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touchStartX = t.clientX
    touchStartY = t.clientY
  }
  function onTouchEnd(e: React.TouchEvent) {
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartX
    const dy = t.clientY - touchStartY
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) openByIndex(viewerIndex + 1)
    else openByIndex(viewerIndex - 1)
  }

  // キーボード左右キーで前後カードに移動
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      openByIndex(viewerIndex + 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      openByIndex(viewerIndex - 1)
    }
  }

  return (
    <div className="purchase-list">
      {/* ツールバー：ソート */}
      <div
        className="toolbar"
        style={{ position: 'sticky', top: 0, zIndex: 5, margin: '-12px -12px 12px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#cbd5e1', marginBottom: 4 }}>
          <div>表示 {filteredCount} / {withPriceCount}</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="radio"
              name="sort"
              value="asc"
              checked={sortOrder === 'asc'}
              onChange={() => setSortOrder('asc')}
            />
            安い順
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="radio"
              name="sort"
              value="desc"
              checked={sortOrder === 'desc'}
              onChange={() => setSortOrder('desc')}
            />
            高い順
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={onlyUnowned}
              onChange={(e) => setOnlyUnowned(e.target.checked)}
            />
            未所持のみ
          </label>
        </div>
      </div>

      {/* スクロール可能な結果領域 */}
      <div
        className="purchase-scroll"
        style={{
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 220px)',
          paddingRight: 2
        }}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          {sorted.length === 0 && (
            <div style={{ opacity: 0.8 }}>
              {withPriceCount === 0 ? '販売情報が登録されていません' : '該当するカードがありません'}
            </div>
          )}
          {sorted.map(({ card, minPrice }) => (
            <div
              key={card.cardId}
              onClick={() => openViewer(card.cardId, sorted.findIndex((x) => x.card.cardId === card.cardId))}
              style={{
                display: 'grid',
                gridTemplateColumns: 'min(120px, 25%) 1fr',
                gap: 12,
                padding: 12,
                background: 'var(--panel)',
                border: '1px solid #334155',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <CardThumb cardId={card.cardId} width="100%" />
              </div>
              <div style={{ display: 'grid', gap: 8, justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600 }}>{card.cardId}</div>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontSize: '0.9em', opacity: 0.9 }}>最安値</div>
                  <div style={{ fontSize: '1.1em', fontWeight: 600 }}>¥{minPrice.price.toLocaleString('ja-JP')}</div>
                  <div style={{ fontSize: '0.85em', opacity: 0.8 }}>{minPrice.place}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 拡大ビュー（検索タブと同じ） */}
      {viewer && (
        <div
          onClick={() => setViewer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.7)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: 16
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onKeyDown={onKeyDown}
            tabIndex={0}
            style={{
              background: 'var(--panel)',
              border: '1px solid #1e293b',
              borderRadius: 12,
              maxWidth: 'min(92vw, 900px)',
              maxHeight: '90vh',
              width: '100%',
              boxShadow: 'var(--shadow)',
              padding: 12,
              overflow: 'auto'
            }}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 'min(92vw, 320px)' }}>
                  <CardThumb cardId={viewer} width="100%" />
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{viewer}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        dec()
                      }}
                    >
                      -
                    </button>
                    <div style={{ minWidth: 36, textAlign: 'center' }}>{ownCount}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        inc()
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 販売行リスト */}
                <div style={{ display: 'grid', gap: 8 }}>
                  {sales.length === 0 && <div style={{ opacity: 0.8 }}>販売情報がありません。追加してください。</div>}
                  {sales.map((row, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 120px auto',
                        gap: 8,
                        alignItems: 'center',
                        minWidth: 0
                      }}
                    >
                      <input
                        type="text"
                        value={row.place}
                        placeholder="販売場所"
                        onChange={(e) => updateSaleRow(idx, 'place', e.target.value)}
                        style={{ padding: 8, borderRadius: 8, border: '1px solid #334155', background: 'var(--panel)', minWidth: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <input
                        type="number"
                        value={row.price}
                        placeholder="金額"
                        onChange={(e) => updateSaleRow(idx, 'price', e.target.value)}
                        style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #334155', background: 'var(--panel)', minWidth: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeSaleRow(idx)
                        }}
                        style={{ padding: '6px 10px' }}
                      >
                        削除
                      </button>
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addSaleRow()
                      }}
                    >
                      追加
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
