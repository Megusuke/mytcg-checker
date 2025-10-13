// src/utils/images.ts
export async function makeThumbnail(blob: Blob, maxSize = 200): Promise<Blob> {
  // 1) createImageBitmap が使えれば最速
  try {
    if ('createImageBitmap' in window) {
      const bmp = await createImageBitmap(blob)
      const scale = Math.min(maxSize / bmp.width, maxSize / bmp.height, 1)
      const w = Math.max(1, Math.round(bmp.width * scale))
      const h = Math.max(1, Math.round(bmp.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(bmp, 0, 0, w, h)
      const out = await canvasToJpeg(canvas, 0.85)
      return out
    }
  } catch {
    // 失敗時は下のフォールバックへ
  }

  // 2) フォールバック：Image要素で読み込んでからCanvasに描画（Safari対策）
  const img = await blobToImage(blob)
  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  return await canvasToJpeg(canvas, 0.85)
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    // Blobは同一オリジンなので crossOrigin は不要
    img.src = url
  })
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve) => {
    // Safariで null が返るケースに備えて2段構え
    canvas.toBlob((b) => {
      if (b) return resolve(b)
      // だめなら PNG にフォールバック
      canvas.toBlob((bb) => resolve(bb!), 'image/png')
    }, 'image/jpeg', quality)
  })
}

export function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}
