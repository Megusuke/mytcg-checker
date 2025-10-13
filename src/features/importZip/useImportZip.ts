import { getDB } from '../../db'
import { readZip } from '../../utils/zip'
import { makeThumbnail, guessMime } from '../../utils/images'

export interface ImportProgress {
  total: number
  done: number
  current?: string
}

export function useImportZip() {
  async function importImagesFromZip(file: File, onProgress?: (p: ImportProgress) => void) {
    const db = await getDB()
    const entries = await readZip(file)
    const files = Object.entries(entries).filter(([name]) => /\.(jpe?g|png|webp)$/i.test(name))

    const total = files.length
    let done = 0

    for (const [name, bytes] of files) {
      const base = name.replace(/^.*\//, '')      // フォルダ無視
      const cardId = base.replace(/\.[^.]+$/, '') // 拡張子除去 → OP06-001

      const blob = new Blob([bytes.buffer], { type: guessMime(name) })
      const thumb = await makeThumbnail(blob, 220)

      const tx = db.transaction('images', 'readwrite')
      await tx.store.put(blob,  `image-original:${cardId}`)
      await tx.store.put(thumb, `image-thumb:${cardId}`)
      await tx.done

      done++
      onProgress?.({ total, done, current: base })

      if (done % 50 === 0) await new Promise(r => setTimeout(r))
    }
  }

  return { importImagesFromZip }
}
