// src/utils/images.ts
export function guessMime(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return 'application/octet-stream'
}

/**
 * 高品質サムネ生成
 * @param original 元画像Blob
 * @param longEdge 長辺ピクセル（例: 600）
 * @returns WebP(優先) -> JPEG -> PNG の Blob
 */
export async function makeThumbnail(original: Blob, longEdge = 600): Promise<Blob> {
  // まずは高速デコード（Safari/古ブラウザは HTMLImageElement フォールバック）
  let bmp: ImageBitmap | null = null
  try {
    bmp = await createImageBitmap(original)
  } catch {
    // フォールバック
    const url = URL.createObjectURL(original)
    try {
      const img = await loadImage(url)
      const blob = await rasterize(img, longEdge)
      return blob
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  // ImageBitmap からサムネ作成
  const blob = await rasterize(bmp!, longEdge)
  return blob
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = url
  })
}

async function rasterize(src: { width: number; height: number }, longEdge: number): Promise<Blob> {
  const sw = src.width
  const sh = src.height
  const scale = sw >= sh ? longEdge / sw : longEdge / sh
  const dw = Math.max(1, Math.round(sw * scale))
  const dh = Math.max(1, Math.round(sh * scale))

  const canvas = document.createElement('canvas')
  canvas.width = dw
  canvas.height = dh
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  // @ts-ignore drawImage signature OK for both ImageBitmap and HTMLImageElement
  ctx.drawImage(src as any, 0, 0, dw, dh)

  // WebP優先 → JPEG → PNG
  const toBlob = (type: string, quality?: number) =>
    new Promise<Blob | null>(r => canvas.toBlob(b => r(b), type, quality))
  let out = await toBlob('image/webp', 0.9)
  if (!out) out = await toBlob('image/jpeg', 0.92)
  if (!out) out = await toBlob('image/png')
  return out!
}
