// src/features/importZip/useImportZip.ts
import { getDB } from '../../db'
import { readZip } from '../../utils/zip'
import { makeThumbnail, guessMime } from '../../utils/images'

export interface ImportProgress {
  total: number
  done: number
  current?: string
}

// パスの末尾（ファイル名）を取得: / と \ の両対応
function baseName(path: string) {
  return path.replace(/^.*[\\/]/, '')
}

// 拡張子を除去
function stripExt(name: string) {
  return name.replace(/\.[^.]+$/, '')
}

// 画像拡張子かどうか
function isImageName(name: string) {
  return /\.(jpe?g|png|webp)$/i.test(name)
}

export function useImportZip() {
  async function importImagesFromZip(file: File, onProgress?: (p: ImportProgress) => void) {
    const db = await getDB()
    const entries = await readZip(file)

    const names = Object.keys(entries)
    if (!names.length) {
      throw new Error('ZIP内にファイルがありません。（空のZIP）')
    }

    // デバッグ用に先頭数件のファイル名をログ
    console.log('[ZIP entries sample]', names.slice(0, 10))

    // 対象は画像のみ
    const files = Object.entries(entries).filter(([n]) => isImageName(n))
    if (!files.length) {
      const head = names.slice(0, 10).join(', ')
      throw new Error(`ZIP内に画像(.jpg/.jpeg/.png/.webp)が見つかりません。先頭: ${head}`)
    }

    const total = files.length
    let done = 0

    for (const [rawName, bytes] of files) {
      const base = baseName(rawName)              // フォルダ除去（/ と \ 両対応）
      const cardId = stripExt(base)               // "OP06-001" など
      const mime = guessMime(base)                // 拡張子からMIMEを推定

      // BlobPartの環境差（Safari等）を避けるため、明示的に Uint8Array を渡す
      const original = new Blob([new Uint8Array(bytes)], { type: mime })

      // サムネ生成（Safariの createImageBitmap / toBlob 対策あり）
      let thumb: Blob
      try {
        thumb = await makeThumbnail(original, 600) // 長辺600pxで高精細サムネ
      } catch (e) {
        console.warn('[thumb fallback]', base, e)
        // 失敗時は原本をそのままサムネとして保存（確実に表示できる）
        thumb = original
      }

      // IndexedDB に保存
      const tx = db.transaction('images', 'readwrite')
      await tx.store.put(original, `image-original:${cardId}`)
      await tx.store.put(thumb,    `image-thumb:${cardId}`)
      await tx.done

      done++
      onProgress?.({ total, done, current: base })

      // UIブロック防止（大量取込時）
      if (done % 50 === 0) {
        // ループを一瞬手放して描画更新
        await new Promise(r => setTimeout(r))
      }
    }
  }

  return { importImagesFromZip }
}
