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
  const [qSet, setQSet] = useState<string>('')             // dan で絞り込み
  const [onlyUnowned, setOnlyUnowned] = useState<boolean>(() => {
    // 既定は「未所持のみ = ON」。保存値があれば復元
    const saved = localStorage.getItem('search.onlyUnowned')
    return saved === null ? true : saved === '1'
  })
  const [viewer, setViewer] = useState<string | null>(null) // 拡大表示中の cardId
  const [ownCount, setOwnCount] = useState<number>(0)       // 拡大中カードの所持枚数
  const [ownMap, setOwnMap] = useState<Record<string, number>>({})

  // 初回ロード：カード取得、前回の絞り込み（dan）復元、所持状況読み込み
  useEffect(() => {
    (async () => {
      const cs = await getAllCards()
      setCards(cs)

      // 前回の絞り込みを復元（なければ 'OP01'）
      const savedDan = localStorage.getItem('search.qSet') // null if not set
      const allDans = Array.from(new Set(cs.map(c => (c as any).dan).filter(Boolean))).sort()
      if (savedDan !== null) {
        // savedDan may be '' (ALL) or a valid dan value
        if (savedDan === '' || allDans.includes(savedDan)) setQSet(savedDan)
        else setQSet('OP01')
      } else {
        // no saved preference -> default to 'OP01'
        setQSet('OP01')
      }

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

  // dan の候補一覧（重複除去、ヘッダ'dan'を除外、先頭に ALL）
  const danOptions = useMemo(() => {
    const s = new Set<string>()
    for (const c of cards) {
      const raw = (c as any).dan
      if (!raw) continue
      const v = String(raw).trim()
      // CSVヘッダなどで "dan" が入るケースを除外（大/小文字両対応）
      if (v === '') continue
      if (v.toLowerCase() === 'dan') continue
      s.add(v)
    }
    const list = Array.from(s).sort()
    // 先頭に ALL（値は空文字 -> フィルタ無し）
    return [''].concat(list)
  }, [cards])

  // 絞り込み＋dansortでソート＋「未所持のみ」
  const filtered = useMemo(() => {
    let list = cards
    // dan で絞り込み（空文字 = ALL なので絞り込みなし）
    if (qSet !== '') {
      list = list.filter(c => String((c as any).dan) === qSet)
    }
    // 未所持のみ
    if (onlyUnowned) {
      list = list.filter(c => (ownMap[c.cardId] ?? 0) === 0)
    }
    return [...list].sort(compareDansort)
  }, [cards, qSet, onlyUnowned, ownMap])

  // qSet / onlyUnowned を選ぶたび保存（次回起動時に復元）
  useEffect(() => {
    localStorage.setItem('search.qSet', qSet)
  }, [qSet])
  useEffect(() => {
    localStorage.setItem('search.onlyUnowned', onlyUnowned ? '1' : '0')
  }, [onlyUnowned])

  // 画像クリックで拡大＆カウンタ取得
  async function openViewer(cid: string) {
    setViewer(cid)
    const ow = await getOwnership(cid)
    setOwnCount(ow?.count ?? 0)
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

  return (
    <div className="cards-list">
      {/* ツールバー：dan 絞り込み + 未所持のみ */}
      <div className="toolbar" style={{ position: 'sticky', top: 0, zIndex: 5, margin: '-12px -12px 12px' }}>
        <div className="grid toolbar-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>検索</h2>
          <select className="select" value={qSet} onChange={e => setQSet(e.target.value)}>
            {danOptions.map(d => <option key={d} value={d}>{d === '' ? 'ALL' : d}</option>)}
          </select>
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

      {/* ...existing code... */}
    </div>
  )
}
