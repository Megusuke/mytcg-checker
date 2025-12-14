import React, { useEffect, useMemo, useState } from 'react'
import { getAllCards, getOwnership, setOwnership } from '../../db'
import type { Card } from '../../models'
import { CardThumb } from '../../components/CardThumb'

/**
 * 並び替え：
 * - まず dansort（数値として比較できれば数値、できなければ文字列比較）
 * - 同一 dansort のときは cardId で安定ソート
 */
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

export const CardsList: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([])
  const [searchCardId, setSearchCardId] = useState<string>('') // cardId で検索
  const [onlyUnowned, setOnlyUnowned] = useState<boolean>(() => {
    const saved = localStorage.getItem('search.onlyUnowned')
    return saved === null ? true : saved === '1'
  })
  const [viewer, setViewer] = useState<string | null>(null) // 拡大表示中の cardId
  const [viewerIndex, setViewerIndex] = useState<number>(-1) // filtered 上のインデックス
  const [ownCount, setOwnCount] = useState<number>(0) // 拡大中カードの所持枚数
  const [ownMap, setOwnMap] = useState<Record<string, number>>({})
  const [danFilter, setDanFilter] = useState<string>(() => {
    const saved = localStorage.getItem('search.dan')
    return saved !== null ? saved : ''
  })
  const [rarityFilter, setRarityFilter] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('search.rarity')
      const arr = raw ? JSON.parse(raw) : []
      return Array.isArray(arr) ? arr.map(String) : []
    } catch {
      return []
    }
  })

  // カードごとの販売情報（複数行）
  type SaleRow = { place: string; price: string }
  const [sales, setSales] = useState<SaleRow[]>([])
  const salesKey = (cid: string) => `sales.${cid}`

  // 初回ロード：カード取得、前回の検索条件復元、所持状況読み込み
  useEffect(() => {
    (async () => {
      const cs = await getAllCards()
      setCards(cs)

      // 前回の検索条件を復元
      const savedCardId = localStorage.getItem('search.cardId') || ''
      setSearchCardId(savedCardId)

      // 所持情報をまとめて読み込み（並列）
      const map: Record<string, number> = {}
      await Promise.all(
        cs.map(async (c) => {
          const ow = await getOwnership(c.cardId)
          if (ow) map[c.cardId] = ow.count
        })
      )
      setOwnMap(map)
    })()
  }, [])

  // 絞り込み＋dansortでソート＋「未所持のみ」
  const filtered = useMemo(() => {
    let list = cards
    // dan で絞り込み（空文字 = 絞り込み無し）
    if (danFilter.trim() !== '') {
      list = list.filter((c) => String((c as any).dan) === danFilter)
    }
    // rarity で絞り込み（選択なし＝全件）
    if (rarityFilter.length > 0) {
      const set = new Set(rarityFilter)
      list = list.filter((c) => set.has(String((c as any).rarity ?? '')))
    }
    // cardId で絞り込み（部分一致、大文字小文字区別なし）
    if (searchCardId.trim() !== '') {
      const query = searchCardId.trim().toLowerCase()
      list = list.filter((c) => c.cardId.toLowerCase().includes(query))
    }
    // 未所持のみ
    if (onlyUnowned) {
      list = list.filter((c) => (ownMap[c.cardId] ?? 0) === 0)
    }
    return [...list].sort(compareDansort)
  }, [cards, searchCardId, onlyUnowned, ownMap, danFilter, rarityFilter])

  // searchCardId を保存
  useEffect(() => {
    localStorage.setItem('search.cardId', searchCardId)
  }, [searchCardId])
  // danFilter を保存
  useEffect(() => {
    localStorage.setItem('search.dan', danFilter)
  }, [danFilter])
  useEffect(() => {
    localStorage.setItem('search.rarity', JSON.stringify(rarityFilter))
  }, [rarityFilter])
  useEffect(() => {
    localStorage.setItem('search.onlyUnowned', onlyUnowned ? '1' : '0')
  }, [onlyUnowned])

  // 画像クリックで拡大＆カウンタ取得
  async function openViewer(cid: string, idxOverride?: number) {
    setViewer(cid)
    if (idxOverride !== undefined) setViewerIndex(idxOverride)
    else {
      const idx = filtered.findIndex((c) => c.cardId === cid)
      setViewerIndex(idx)
    }
    const ow = await getOwnership(cid)
    setOwnCount(ow?.count ?? 0)
    // 販売情報読み込み
    const raw = localStorage.getItem(salesKey(cid))
    try {
      const parsed: SaleRow[] = raw ? JSON.parse(raw) : []
      setSales(Array.isArray(parsed) ? parsed : [])
    } catch {
      setSales([])
    }
  }

  function saveSales(cid: string | null, next: SaleRow[] | null = null) {
    if (!cid) return
    const data = next ?? sales
    localStorage.setItem(salesKey(cid), JSON.stringify(data))
    setSales(data)
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

  // 販売行の編集操作
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

  // dan の候補（重複除去、'dan'ヘッダ除外）
  const danOptions = useMemo(() => {
    const s = new Set<string>()
    for (const c of cards) {
      const raw = (c as any).dan
      if (!raw) continue
      const v = String(raw).trim()
      if (v === '') continue
      if (v.toLowerCase() === 'dan') continue
      s.add(v)
    }
    return Array.from(s).sort()
  }, [cards])

  const rarityOptions = useMemo(() => {
    const s = new Set<string>()
    for (const c of cards) {
      const raw = (c as any).rarity
      if (raw === undefined || raw === null) continue
      const v = String(raw).trim()
      if (v === '') continue
      s.add(v)
    }
    return Array.from(s).sort()
  }, [cards])

  const totalCount = cards.length
  const filteredCount = filtered.length

  // filtered が変わった際に viewer の位置を更新
  useEffect(() => {
    if (!viewer) {
      setViewerIndex(-1)
      return
    }
    const idx = filtered.findIndex((c) => c.cardId === viewer)
    setViewerIndex(idx)
  }, [filtered, viewer])

  function openByIndex(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= filtered.length) return
    const nextCard = filtered[nextIndex]
    if (nextCard) openViewer(nextCard.cardId, nextIndex)
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
    if (dx < 0) openByIndex(viewerIndex + 1) // 左→右スワイプで次へ
    else openByIndex(viewerIndex - 1)        // 右→左スワイプで前へ
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
    <div className="cards-list">
      {/* ツールバー：cardId 検索 + 未所持のみ */}
      <div
        className="toolbar"
        style={{ position: 'sticky', top: 0, zIndex: 5, margin: '-12px -12px 12px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#cbd5e1', marginBottom: 4 }}>
          <div>表示 {filteredCount} / {totalCount}</div>
        </div>
        <div
          className="grid toolbar-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, alignItems: 'center' }}
        >
          <select
            className="select"
            value={danFilter}
            onChange={(e) => setDanFilter(e.target.value)}
            style={{ padding: '8px' }}
          >
            <option value="">ALL</option>
            {danOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {rarityOptions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {rarityOptions.map((r) => {
                const checked = rarityFilter.includes(r)
                return (
                  <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setRarityFilter((prev) =>
                          e.target.checked ? [...prev, r] : prev.filter((x) => x !== r)
                        )
                      }}
                    />
                    {r}
                  </label>
                )
              })}
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={onlyUnowned} onChange={(e) => setOnlyUnowned(e.target.checked)} />
            未所持のみ
          </label>

          <input
            type="text"
            className="select"
            placeholder="CardID を入力..."
            value={searchCardId}
            onChange={(e) => setSearchCardId(e.target.value)}
            style={{ padding: '8px' }}
          />
        </div>
      </div>

      {/* スクロール可能な結果領域 */}
      <div
        className="search-scroll"
        style={{
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 220px)',
          paddingRight: 2
        }}
      >
        <div
          className="cards-grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
            gap: 8,
            justifyContent: 'flex-start',
            justifyItems: 'center'
          }}
        >
          {filtered.map((c) => (
            <button
              key={c.cardId}
              onClick={() => openViewer(c.cardId, filtered.findIndex((x) => x.cardId === c.cardId))}
              title={c.cardId}
              style={{
                display: 'block',
                padding: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <CardThumb cardId={c.cardId} width="100%" />
            </button>
          ))}
          {filtered.length === 0 && <div style={{ opacity: 0.8 }}>該当カードがありません</div>}
        </div>
      </div>

      {/* 画像タップ時の拡大ビュー（簡易モーダル） */}
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
              {/* カード画像（上）→ 情報・操作・メモ（下）に配置 */}
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
