// src/components/CardThumb.tsx
import { useEffect, useState } from 'react'
import { getDB } from '../db'

export function CardThumb({ cardId, width = '100%' }: { cardId: string; width?: number | string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objUrl: string | null = null
    let mounted = true
    ;(async () => {
      const db = await getDB()
      const blob =
        (await db.get('images', `image-thumb:${cardId}`)) ||
        (await db.get('images', `image-original:${cardId}`))
      if (blob && mounted) {
        objUrl = URL.createObjectURL(blob)
        setUrl(objUrl)
      }
    })()
    return () => {
      mounted = false
      if (objUrl) URL.revokeObjectURL(objUrl)
    }
  }, [cardId])

  return (
    <div
      style={{
        width,                 // ← 親から受けた幅でフィット
        aspectRatio: '63 / 88',
        background: '#0b1223',
        border: '1px solid #1e293b',
        borderRadius: 8,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
      }}
    >
      {url ? (
        <img
          src={url}
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
