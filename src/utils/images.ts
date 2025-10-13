export async function makeThumbnail(blob: Blob, maxSize = 200): Promise<Blob> {
  const bmp = await createImageBitmap(blob)
  const scale = Math.min(maxSize / bmp.width, maxSize / bmp.height, 1)
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bmp, 0, 0, w, h)

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85)
  })
}

export function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}
