// 画像を display:block で描画し、URLが無い間は <img> 自体を出さない
import { useEffect, useState } from 'react'
import { getImageBlobByKey } from '../db'

type Props = {
  cardId: string
  width?: string | number // "100%" 推奨
}

export const CardThumb: React.FC<Props> = ({ cardId, width = '100%' }) => {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let currentUrl: string | null = null
    let canceled = false

    ;(async () => {
      const blob =
        (await getImageBlobByKey(`image-thumb:${cardId}`)) ||
        (await getImageBlobByKey(`image-original:${cardId}`))
      if (canceled) return
      if (!blob) {
        setUrl(null)
        return
        }
      currentUrl = URL.createObjectURL(blob)
      setUrl(currentUrl)
    })()

    return () => {
      canceled = true
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
        currentUrl = null
      }
    }
  }, [cardId])

  // URL 未準備の間は img を出さない（空文字は出さない）
  if (!url) {
    // 必要ならプレースホルダを返す（高さ確保したい場合は適宜）
    return <div style={{ width: typeof width === 'number' ? `${width}px` : width }} />
  }

  return (
    <img
      src={url ?? undefined}     // 空文字は渡さない
      alt={cardId}
      style={{
        display: 'block',        // 右下の謎の隙間を消す
        width: typeof width === 'number' ? `${width}px` : width,
        height: 'auto',
        objectFit: 'contain',    // カード全体が見えるように（切り抜かない）
      }}
      draggable={false}
    />
  )
}
