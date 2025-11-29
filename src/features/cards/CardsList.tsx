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
  const [qSet, setQSet] = useState<string>('')           // dan で絞り込み
  const [viewer, setViewer] = useState<string | null>(null) // 拡大表示中の cardId
  const [ownCount, setOwnCount] = useState<number>(0)    // 拡大中カードの所持枚数

  // 初回ロード：カード取得、前回の絞り込み（dan）復元
  useEffect(() => {
    (async () => {
      const cs = await getAllCards()
      setCards(cs)

      // 前回の絞り込み復元（なければ最初のdan）
      const saved = localStorage.getItem('search.qSet') || ''
      const allDans = Array.from(new Set(cs.map(c => (c as any).dan).filter(Boolean))).sort()
      if (saved && allDans.includes(saved)) {
        setQSet(saved)
      } else {
        setQSet(allDans[0] ?? '')
      }
    })()
  }, [])

  // dan の候補一覧
  const danOptions = useMemo(() => {
    const s = new Set<string>()
    for (const c of cards) {
      const d = (c as any).dan
      if (d) s.add(String(d))
    }
    return Array.from(s).sort()
  }, [cards])

  // 絞り込み＋dansortでソート
  const filtered = useMemo(() => {
    let list = cards
    if (qSet) list = list.filter(c => String((c as any).dan) === qSet)
    return [...list].sort(compareDansort)
  }, [cards, qSet])

  // qSet を選ぶたび保存（次回起動時に復元）
  useEffect(() => {
    if (qSet) localStorage.setItem('search.qSet', qSet)
  }, [qSet])

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
  }

  async function dec() {
    if (!viewer) return
    const next = Math.max(0, ownCount - 1)
    await setOwnership(viewer, next)
    setOwnCount(next)
  }

  return (
    <div className="cards-list">

      {/* ツールバー：dan 絞り込みのみ（ALLは廃止方針） */}
      <div className="toolbar" style={{position:'sticky', top:0, zIndex:5, margin:'-12px -12px 12px'}}>
        <div className="grid toolbar-grid" style={{display:'grid', gridTemplateColumns:'1fr 200px', gap:12, alignItems:'center'}}>
          <h2 style={{margin:0}}>検索</h2>
          <select className="select" value={qSet} onChange={e => setQSet(e.target.value)}>
            {danOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* 画像のみ 5列グリッド */}
      <div className="cards-grid" style={{gridTemplateColumns: 'repeat(5, 1fr)'}}>
        {filtered.map(c => (
          <button
            key={c.cardId}
            onClick={() => openViewer(c.cardId)}
            title={c.cardId}
            style={{
              display:'block',
              padding:0,
              background:'transparent',
              border:'none',
              cursor:'pointer'
            }}
          >
            <CardThumb cardId={c.cardId} width="100%" />
          </button>
        ))}
        {filtered.length === 0 && (
          <div style={{opacity:.8}}>該当カードがありません</div>
        )}
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
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <div style={{fontWeight:700}}>{viewer}</div>
                <button className="btn ghost" onClick={() => setViewer(null)}>閉じる</button>
              </div>

              <div>
                <CardThumb cardId={viewer} width="100%" />
              </div>

              {/* 所持枚数カウンタ */}
              <div style={{display:'flex', alignItems:'center', gap:8, justifyContent:'center'}}>
                <button className="btn" onClick={dec}>−</button>
                <input
                  className="input input--num"
                  type="number"
                  value={ownCount}
                  readOnly
                  style={{textAlign:'center'}}
                />
                <button className="btn" onClick={inc}>＋</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
