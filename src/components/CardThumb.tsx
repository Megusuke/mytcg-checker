import { useEffect, useState } from 'react'
import { getDB } from '../db'

export function CardThumb({ cardId, width = '100%' }: { cardId: string; width?: number | string }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [origUrl, setOrigUrl]   = useState<string | null>(null)

  useEffect(() => {
    let tUrl: string | null = null
    let oUrl: string | null = null
    let mounted = true
    ;(async () => {
      const db = await getDB()
      const thumb = await db.get('images', `image-thumb:${cardId}`)
      const orig  = await db.get('images', `image-original:${cardId}`)
      if (!mounted) return
      if (thumb) { tUrl = URL.createObjectURL(thumb); setThumbUrl(tUrl) }
      if (orig)  { oUrl = URL.createObjectURL(orig);  setOrigUrl(oUrl)  }
    })()
    return () => {
      mounted = false
      if (tUrl) URL.revokeObjectURL(tUrl)
      if (oUrl) URL.revokeObjectURL(oUrl)
    }
  }, [cardId])

  return (
    <div
      style={{
        width,
        aspectRatio: '63 / 88',          // ワンピースカードの縦横比に近い
        background: 'transparent',
        border: '1px solid #1e293b',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {(thumbUrl || origUrl) ? (
        <img
          src={thumbUrl ?? origUrl!}
          // ★ Retina(2x) では原本を使わせる（即画質改善）
          srcSet={origUrl ? `${thumbUrl ?? origUrl} 1x, ${origUrl} 2x` : undefined}
          sizes="100vw"
          alt={cardId}
          loading="lazy"
          style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}
        />
      ) : (
        <div style={{opacity:.4, fontSize:12, color:'#94a3b8'}}>No Image</div>
      )}
    </div>
  )
}
