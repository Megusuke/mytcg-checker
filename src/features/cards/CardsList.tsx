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
  const [searchCardId, setSearchCardId] = useState<string>('')  // cardId で検索
  const [onlyUnowned, setOnlyUnowned] = useState<boolean>(() => {
    // 既定は「未所持のみ = ON」。保存値があれば復元
    const saved = localStorage.getItem('search.onlyUnowned')
    return saved === null ? true : saved === '1'
  })
  const [viewer, setViewer] = useState<string | null>(null) // 拡大表示中の cardId
  const [ownCount, setOwnCount] = useState<number>(0)       // 拡大中カードの所持枚数
  const [ownMap, setOwnMap] = useState<Record<string, number>>({})
  const [danFilter, setDanFilter] = useState<string>('')

  // カードごとのメモ
  const [memoText, setMemoText] = useState<string>('')
  const memoKey = (cid: string) => `memo.${cid}`

  // 初回ロード：カード取得、前回の検索条件復元、所持状況読み込み
  useEffect(() => {
    (async () => {
      const cs = await getAllCards()
      setCards(cs)
 
      // 前回の検索条件を復元
      const savedCardId = localStorage.getItem('search.cardId') || ''
      setSearchCardId(savedCardId)
      const savedDan = localStorage.getItem('search.dan') || ''
      setDanFilter(savedDan)
 
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
      list = list.filter(c => String((c as any).dan) === danFilter)
    }
    // cardId で絞り込み（部分一致、大文字小文字区別なし）
    if (searchCardId.trim() !== '') {
      const query = searchCardId.trim().toLowerCase()
      list = list.filter(c => c.cardId.toLowerCase().includes(query))
    }
    // 未所持のみ
    if (onlyUnowned) {
      list = list.filter(c => (ownMap[c.cardId] ?? 0) === 0)
    }
    return [...list].sort(compareDansort)
  }, [cards, searchCardId, onlyUnowned, ownMap, danFilter])

  // searchCardId を保存
  useEffect(() => {
    localStorage.setItem('search.cardId', searchCardId)
  }, [searchCardId])
  // danFilter を保存
  useEffect(() => {
    localStorage.setItem('search.dan', danFilter)
  }, [danFilter])
  useEffect(() => {
    localStorage.setItem('search.onlyUnowned', onlyUnowned ? '1' : '0')
  }, [onlyUnowned])

  // 画像クリックで拡大＆カウンタ取得
  async function openViewer(cid: string) {
    setViewer(cid)
    const ow = await getOwnership(cid)
    setOwnCount(ow?.count ?? 0)
    // メモ読み込み
    const saved = localStorage.getItem(memoKey(cid)) ?? ''
    setMemoText(saved)
  }

  function saveMemo(cid: string | null) {
    if (!cid) return
    localStorage.setItem(memoKey(cid), memoText)
  }
  
  async function inc() {
    if (!viewer) return
    const next = ownCount + 1
    await setOwnership(viewer, next)
    setOwnCount(next)
    setOwnMap(prev => ({ ...prev, [viewer]: next }))
  }

  async function dec() {
    if (!viewer) return
    const next = Math.max(0, ownCount - 1)
    await setOwnership(viewer, next)
    setOwnCount(next)
    setOwnMap(prev => ({ ...prev, [viewer]: next }))
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

  return (
    <div className="cards-list">
      {/* ツールバー：cardId 検索 + 未所持のみ */}
      <div className="toolbar" style={{ position: 'sticky', top: 0, zIndex: 5, margin: '-12px -12px 12px' }}>
        <div className="grid toolbar-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, alignItems: 'center' }}>
          <select
            className="select"
            value={danFilter}
            onChange={(e) => setDanFilter(e.target.value)}
            style={{ padding: '8px' }}
          >
            <option value="">全て（danなし）</option>
            {danOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input
            type="text"
            className="select"
            placeholder="CardID を入力..."
            value={searchCardId}
            onChange={(e) => setSearchCardId(e.target.value)}
            style={{ padding: '8px' }}
          />
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
        className="search-scroll"
        style={{
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 220px)',
          paddingRight: 2
        }}
      >
        <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8 }}>
          {filtered.map(c => (
            <button
              key={c.cardId}
              onClick={() => openViewer(c.cardId)}
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
          {filtered.length === 0 && (
            <div style={{ opacity: .8 }}>該当カードがありません</div>
          )}
        </div>
      </div>

      {/* 画像タップ時の拡大ビュー（簡易モーダル） */}
      {viewer && (
        <div
          onClick={() => setViewer(null)}
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,.7)',
            display:'grid', placeItems:'center', zIndex:9999, padding:16
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:'var(--panel)', border:'1px solid #1e293b', borderRadius:12,
              maxWidth:'min(92vw, 900px)', width:'100%', boxShadow:'var(--shadow)', padding:12
            }}
          >
            <div style={{display:'grid', gap:12}}>
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
                    <button onClick={(e) => { e.stopPropagation(); dec() }}>-</button>
                    <div style={{ minWidth: 36, textAlign: 'center' }}>{ownCount}</div>
                    <button onClick={(e) => { e.stopPropagation(); inc() }}>+</button>
                  </div>
                </div>

                <textarea
                  value={memoText}
                  onChange={(e) => setMemoText(e.target.value)}
                  onBlur={() => saveMemo(viewer)}
                  placeholder="このカードについてのメモを入力..."
                  style={{ width: '100%', minHeight: 120, resize: 'vertical', padding: 8, borderRadius: 8, border: '1px solid #334155', background: 'var(--panel)' }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); saveMemo(viewer); }}>保存</button>
                  <button onClick={(e) => { e.stopPropagation(); localStorage.removeItem(memoKey(viewer)); setMemoText('') }}>消去</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
