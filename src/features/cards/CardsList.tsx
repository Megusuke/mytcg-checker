// 検索タブ：画像のみの5列グリッド。タップで拡大＋所持カウンタ。
// セットは cardId 接頭辞（OPxx）。「ALL」は廃止し、候補が揃い次第、最初のセットに自動設定。
// q / qSet / onlyUnowned は localStorage に保存・復元。

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { getAllCards, getAllOwnership, setOwnership } from '../../db'
import type { Card } from '../../models'
import { CardThumb } from '../../components/CardThumb'

const LS_Q_KEY = 'search.q'
const LS_SET_KEY = 'search.qSet'
const LS_UNOWNED_KEY = 'search.onlyUnowned'

function getSetIdFromCardId(cardId: string) {
  const m = cardId.match(/^[^-_]+/)
  return m ? m[0] : 'UNKNOWN'
}

export const CardsList: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([])
  const [ownMap, setOwnMap] = useState<Record<string, number>>({})
  const [q, setQ] = useState<string>('')
  const [qSet, setQSet] = useState<string>('')           // ← ALLをやめるので空で開始
  const [onlyUnowned, setOnlyUnowned] = useState<boolean>(true)
  const [busy, setBusy] = useState(false)

  // モーダル（拡大表示）
  const [activeId, setActiveId] = useState<string | null>(null)

  // 復元の一回きり検証フラグ
  const validatedOnceRef = useRef(false)

  // --- localStorage 復元（初回のみ） ---
  useEffect(() => {
    try {
      const q0 = localStorage.getItem(LS_Q_KEY)
      const set0 = localStorage.getItem(LS_SET_KEY)
      const un0 = localStorage.getItem(LS_UNOWNED_KEY)
      if (q0 !== null) setQ(q0)
      if (set0 !== null) setQSet(set0)   // 存在確認は候補生成後に実施
      if (un0 !== null) setOnlyUnowned(un0 === '1')
    } catch {}
  }, [])

  // --- localStorage 保存 ---
  useEffect(() => { try { localStorage.setItem(LS_Q_KEY, q) } catch {} }, [q])
  useEffect(() => { try { if (qSet) localStorage.setItem(LS_SET_KEY, qSet) } catch {} }, [qSet])
  useEffect(() => { try { localStorage.setItem(LS_UNOWNED_KEY, onlyUnowned ? '1' : '0') } catch {} }, [onlyUnowned])

  // --- データロード ---
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

  // セット候補は cardId 接頭辞から生成（ALLなし）
  const setOptions = useMemo(() => {
    const s = new Set<string>()
    for (const c of cards) {
      const setId = getSetIdFromCardId(c.cardId)
      if (setId && setId !== 'UNKNOWN') s.add(setId)
    }
    return Array.from(s).sort()
  }, [cards])

  // 候補が出そろってから一度だけ qSet を検証。
  // 1) 未設定なら先頭に設定 2) 保存値が候補に無ければ先頭に差し替え
  useEffect(() => {
    if (validatedOnceRef.current) return
    if (!cards.length) return
    if (setOptions.length === 0) return

    const avail = new Set(setOptions)
    if (!qSet || !avail.has(qSet)) {
      setQSet(setOptions[0])
    }
    validatedOnceRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, setOptions])

  const filtered = useMemo(() => {
    if (!qSet) return [] // セット未確定の瞬間は空
    let list = cards.filter(c => getSetIdFromCardId(c.cardId) === qSet)

    if (q.trim()) {
      const t = q.trim().toLowerCase()
      list = list.filter(c =>
        c.cardId.toLowerCase().includes(t) ||
        (c.name ?? '').toLowerCase().includes(t) ||
        (c.type ?? '').toLowerCase().includes(t)
      )
    }
    if (onlyUnowned) {
      list = list.filter(c => (ownMap[c.cardId] ?? 0) <= 0)
    }
    return [...list].sort((a, b) => a.cardId.localeCompare(b.cardId, 'ja'))
  }, [cards, qSet, q, onlyUnowned, ownMap])

  // 所持数更新
  async function incr(cardId: string, delta: number) {
    const cur = ownMap[cardId] ?? 0
    const next = Math.max(0, cur + delta)
    await setOwnership(cardId, next)
    setOwnMap(prev => ({ ...prev, [cardId]: next }))
  }

  // モーダル制御
  const closeModal = useCallback(() => setActiveId(null), [])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeModal() }
    if (activeId) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeId, closeModal])

  // セレクトは候補のみ（ALLなし）。qSet が候補外の一瞬を避けるため、未確定時は disabled。
  const selectDisabled = setOptions.length === 0 || !qSet

  return (
    <section>
      {/* ツールバー */}
      <div className="panel toolbar toolbar-grid grid">
        <input
          className="input"
          placeholder="カード名 / 番号 / 特徴 で検索"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <select
          className="select"
          value={qSet || ''}
          disabled={selectDisabled}
          onChange={e => setQSet(e.target.value)}
        >
          {setOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label style={{display:'flex', alignItems:'center', gap:8}}>
          <input type="checkbox" checked={onlyUnowned} onChange={e => setOnlyUnowned(e.target.checked)} />
          未所持のみ
        </label>
      </div>

      {busy && <div style={{marginTop:8}}>読み込み中…</div>}

      {/* 画像のみの 5 列固定グリッド */}
      <div
        className="cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 12,
          marginTop: 12
        }}
      >
        {filtered.map(c => {
          const owned = (ownMap[c.cardId] ?? 0) > 0
          return (
            <button
              key={c.cardId}
              onClick={() => setActiveId(c.cardId)}
              className={`card tight ${owned ? 'owned' : ''}`}
              style={{ padding: 0, cursor: 'pointer' }}
              aria-label={`${c.cardId} を拡大`}
            >
              <div className="thumb-box">
                <CardThumb cardId={c.cardId} width="100%" />
              </div>
            </button>
          )
        })}
      </div>

      {/* モーダル（拡大 + カウンタ） */}
      {activeId && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,8,23,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16
          }}
        >
          <div
            className="panel"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(96vw, 520px)', maxHeight: '90vh', overflow: 'auto', padding: 12 }}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <h3 style={{ margin: 0 }}>{activeId}</h3>
              <button className="btn neutral" onClick={closeModal}>閉じる</button>
            </div>

            <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
              <CardThumb cardId={activeId} width="100%" />
            </div>

            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <button className="btn ghost" onClick={()=> incr(activeId, -1)}>-</button>
                <input className="input input--num" type="number" readOnly value={ownMap[activeId] ?? 0} />
                <button className="btn ghost" onClick={()=> incr(activeId, +1)}>+</button>
              </div>
              { (ownMap[activeId] ?? 0) > 0 ? (
                <button className="btn ok" onClick={()=> incr(activeId, -(ownMap[activeId] ?? 0))}>所持</button>
              ) : (
                <button className="btn neutral" onClick={()=> incr(activeId, 1)}>未所持</button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
