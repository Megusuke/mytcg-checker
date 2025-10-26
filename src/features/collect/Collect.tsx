// 収集タブ：絞り込みは CSV の dan、並びは dansort（数値昇順）→ cardId。
// 「ALL」は廃止。localStorage から qSet を復元し、候補が揃い次第、OP01 があれば OP01、無ければ先頭にフォールバック。

import { useEffect, useMemo, useRef, useState } from 'react'
import { getAllCards, getOwnership, setOwnership } from '../../db'
import type { Card } from '../../models'
import { CardThumb } from '../../components/CardThumb'

const LS_COLLECT_SET_KEY = 'collect.qSet'

// dansort の安全取得（未設定/NaN は +∞ で末尾へ）
function getDansortValue(c: Card): number {
  const raw: any = (c as any).dansort
  if (raw === undefined || raw === null || raw === '') return Number.POSITIVE_INFINITY
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10)
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY
}

export const Collect: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([])
  const [own, setOwn] = useState<Record<string, number>>({})
  const [qSet, setQSet] = useState<string>('')   // ← ALLは無し。空で開始し復元/確定後にセット
  const [busy, setBusy] = useState(false)

  // Pager
  const perPage = 9
  const pagerRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)

  // 復元一回きり検証フラグ
  const validatedOnceRef = useRef(false)

  // 初期復元
  useEffect(() => {
    try {
      const s0 = localStorage.getItem(LS_COLLECT_SET_KEY)
      if (s0) setQSet(s0)
    } catch {}
  }, [])

  // 変更時に保存
  useEffect(() => {
    try { if (qSet) localStorage.setItem(LS_COLLECT_SET_KEY, qSet) } catch {}
  }, [qSet])

  // データロード
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

  // 絞り込み候補：CSV の dan 列から生成（空/未設定は除外、ALL無し）
  const setOptions = useMemo(() => {
    const s = new Set<string>()
    for (const c of cards) {
      const dan = (c as any).dan
      if (dan) s.add(String(dan))
    }
    return Array.from(s).sort()
  }, [cards])

  // 候補が出そろってから一度だけ qSet を検証
  // 1) 未設定 → 'OP01' があれば OP01、無ければ先頭
  // 2) 保存値が候補に無ければ 1) と同じ
  useEffect(() => {
    if (validatedOnceRef.current) return
    if (!cards.length) return
    if (setOptions.length === 0) return

    const avail = new Set(setOptions)
    const pickDefault = () => (avail.has('OP01') ? 'OP01' : setOptions[0])

    if (!qSet || !avail.has(qSet)) {
      setQSet(pickDefault())
    }
    validatedOnceRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, setOptions])

  // セット未確定の瞬間は空
  const filtered = useMemo(() => {
    if (!qSet) return []
    let list = cards.filter(c => String((c as any).dan || '') === qSet)
    list = [...list].sort((a, b) => {
      const da = getDansortValue(a)
      const db = getDansortValue(b)
      if (da !== db) return da - db
      return a.cardId.localeCompare(b.cardId, 'ja')
    })
    return list
  }, [cards, qSet])

  // 絞り込み後の所持数
  const ownedFiltered = useMemo(() => {
    if (!filtered.length) return 0
    let n = 0
    for (const c of filtered) {
      if ((own[c.cardId] ?? 0) > 0) n++
    }
    return n
  }, [filtered, own])

  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const pageCards = (p: number) => filtered.slice(p * perPage, p * perPage + perPage)

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

  const selectDisabled = setOptions.length === 0 || !qSet

  return (
    <section className="collect">
      <div className="grid" style={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>
          収集：所持 {ownedFiltered} / {filtered.length}
          {filtered.length > 0 && (
            <span style={{ marginLeft: 8, color: '#94a3b8' }}>
              ({Math.round((ownedFiltered / filtered.length) * 100)}%)
            </span>
          )}
        </h2>
        <select
          className="select"
          value={qSet || ''}
          disabled={selectDisabled}
          onChange={e => setQSet(e.target.value)}
        >
          {setOptions.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {busy && <div style={{ marginTop: 8 }}>読み込み中…</div>}

      {/* 横スクロール・スナップ（ボタンなし、スワイプのみ） */}
      <div className="pager" ref={pagerRef} onScroll={onScroll}>
        {Array.from({ length: pages }).map((_, i) => (
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
              {Array.from({ length: Math.max(0, perPage - pageCards(i).length) }).map((_, k) => (
                <div key={`pad-${k}`} className="collect-item pad" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ページインジケーター（ドット） */}
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 6 }}>
        {Array.from({ length: pages }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 9999,
              background: i === page ? '#38bdf8' : '#334155',
            }}
          />
        ))}
      </div>
    </section>
  )
}
