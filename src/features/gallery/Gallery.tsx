import React, { useEffect, useState } from 'react'
import { getDB } from '../../db'
import { CardThumb } from '../../components/CardThumb'

function extractCardIdFromKey(key: string) {
  const m = key.match(/^image-thumb:(.+)$/)
  return m ? m[1] : null
}

export const Gallery: React.FC = () => {
  const [cardIds, setCardIds] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const db = await getDB()
      const tx = db.transaction('images')
      const keys = await tx.store.getAllKeys()
      const ids = keys
        .map(k => extractCardIdFromKey(String(k)))
        .filter((x): x is string => !!x)
        .sort()
      if (mounted) setCardIds(ids)
    })()
    return () => { mounted = false }
  }, [])

  if (!cardIds.length) {
    return <p>まだサムネがありません。画像ZIPを取り込んでください。</p>
  }

  return (
    <div>
      <h2>サムネ一覧（{cardIds.length}件）</h2>
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))',
        gap:12
      }}>
        {cardIds.map(id => (
          <div key={id} style={{display:'grid', gap:6, justifyItems:'center'}}>
            <CardThumb cardId={id} />
            <div style={{fontSize:12, color:'#555'}}>{id}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
