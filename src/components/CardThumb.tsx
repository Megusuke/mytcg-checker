import React, { useEffect, useState } from 'react'
import { getDB } from '../db'

export const CardThumb: React.FC<{ cardId: string; size?: number }> = ({ cardId, size = 120 }) => {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objUrl: string | null = null
    getDB().then(async db => {
      const blob = await db.get('images', `image-thumb:${cardId}`)
      if (blob) {
        objUrl = URL.createObjectURL(blob)
        setUrl(objUrl)
      }
    })
    return () => { if (objUrl) URL.revokeObjectURL(objUrl) }
  }, [cardId])

  return url
  ? <img src={url} loading="lazy" alt={cardId} width={size} height={size}
         style={{objectFit:'cover', borderRadius:8}}/>
  : <div style={{width:size, height:size, background:'#0b1223', border:'1px solid #1e293b', borderRadius:8}}/>

}
