import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getDB } from '../db'

type Props = {
  cardId: string
  title?: string
  onClose: () => void
}

export const ImageModal: React.FC<Props> = ({ cardId, title, onClose }) => {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fitContain, setFitContain] = useState(true) // クリックで contain ↔ original 切替

  useEffect(() => {
    let objUrl: string | null = null
    let mounted = true

    ;(async () => {
      try {
        const db = await getDB()
        const blob = await db.get('images', `image-original:${cardId}`)
        if (!blob) {
          throw new Error('原本画像が見つかりません')
        }
        objUrl = URL.createObjectURL(blob)
        if (mounted) setUrl(objUrl)
      } catch (e: any) {
        console.error(e)
        if (mounted) setError(e?.message ?? '画像の読み込みに失敗しました')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key.toLowerCase() === 'f') setFitContain(v => !v) // fキーで拡大切替
    }
    document.addEventListener('keydown', onKey)

    // 背景スクロールを止める
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      mounted = false
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      if (objUrl) URL.revokeObjectURL(objUrl)
    }
  }, [cardId, onClose])

  const modalBody = (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
        display:'grid', placeItems:'center', zIndex:9999, padding:16
      }}
      aria-modal
      role="dialog"
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position:'relative', width:'min(96vw, 1200px)', height:'min(90vh, 1200px)',
          background:'#111', borderRadius:12, overflow:'hidden', display:'grid'
        }}
      >
        {/* ヘッダー */}
        <div style={{
          position:'absolute', top:8, left:12, right:12, display:'flex',
          alignItems:'center', justifyContent:'space-between', color:'#fff', zIndex:2
        }}>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <strong>{title ?? cardId}</strong>
            <span style={{opacity:.8, fontSize:12}}>(タップ/クリックで拡大切替、Escで閉じる)</span>
          </div>
          <button
            onClick={onClose}
            style={{background:'transparent', color:'#fff', border:'1px solid #fff', borderRadius:8, padding:'4px 10px', cursor:'pointer'}}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* コンテンツ */}
        <div style={{display:'grid', placeItems:'center', width:'100%', height:'100%'}}>
          {loading && <div style={{color:'#fff'}}>読み込み中...</div>}
          {error && <div style={{color:'#fff'}}>{error}</div>}
          {!loading && !error && url && (
            <img
              src={url}
              alt={title ?? cardId}
              onClick={() => setFitContain(v => !v)}
              style={{
                maxWidth: fitContain ? '100%' : 'none',
                maxHeight: fitContain ? '100%' : 'none',
                objectFit: fitContain ? 'contain' : 'unset',
                cursor:'zoom-in',
                userSelect:'none'
              }}
            />
          )}
        </div>
      </div>
    </div>
  )

  // Portal で body 直下に描画
  return createPortal(modalBody, document.body)
}
