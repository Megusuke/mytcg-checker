import React, { useState } from 'react'
import { zip, unzip } from 'fflate'
import { getAllCards, getAllOwnership, getAllImageKeys, getImageBlobByKey, clearAllStores, putCards, putOwnershipBulk } from '../../db'
import { guessMime, makeThumbnail } from '../../utils/images'

// バイナリ→ダウンロード
function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Blob -> Uint8Array
async function blobToUint8(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}

export const Backup: React.FC = () => {
  const [busy, setBusy] = useState<null | string>(null)

  async function onExport() {
    try {
      setBusy('エクスポート中...')
      // 1) JSONデータ
      const [cards, ownership] = await Promise.all([getAllCards(), getAllOwnership()])
      const dataJson = new TextEncoder().encode(JSON.stringify({ cards, ownership }, null, 2))

      // 2) 画像（原本のみ）
      const files: Record<string, Uint8Array> = { 'data.json': dataJson }
      const keys = await getAllImageKeys()
      let done = 0
      for (const key of keys) {
        const m = key.match(/^image-original:(.+)$/)
        if (!m) continue
        const cardId = m[1]
        const blob = await getImageBlobByKey(key)
        if (!blob) continue
        files[`images/${cardId}.jpg`] = await blobToUint8(blob)
        // UI更新のために少しゆるめる
        done++
        if (done % 50 === 0) await new Promise(r => setTimeout(r))
      }

      // 3) ZIP生成
      const zipped = await new Promise<Uint8Array>((resolve, reject) => {
        zip(files, (err, data) => (err ? reject(err) : resolve(data)))
      })

      downloadBlob(new Blob([zipped], { type: 'application/zip' }), 'opcg-backup.zip')
      setBusy(null)
      alert('バックアップZIPを保存しました')
    } catch (e) {
      console.error(e)
      setBusy(null)
      alert('エクスポートでエラーが発生しました')
    }
  }

  async function onImportZip(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.currentTarget.value = ''
    setBusy('インポート中...')

    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
        unzip(buf, (err, data) => (err ? reject(err) : resolve(data as Record<string, Uint8Array>)))
      })

      // 1) data.json
      const dataJson = files['data.json']
      if (!dataJson) throw new Error('ZIPに data.json が見つかりません')
      const json = JSON.parse(new TextDecoder().decode(dataJson)) as { cards: any[]; ownership: any[] }

      // 2) 既存データを消去（上書きモード）
      await clearAllStores()

      // 3) カード & 所持を書き込み
      await putCards(json.cards as any)
      await putOwnershipBulk(json.ownership as any)

      // 4) 画像を復元（thumbは再生成）
      const imageEntries = Object.entries(files).filter(([name]) => /^images\/.+\.(jpe?g|png|webp)$/i.test(name))
      let done = 0
      for (const [name, bytes] of imageEntries) {
        const base = name.replace(/^images\//, '')
        const cardId = base.replace(/\.[^.]+$/, '')
        const blob = new Blob([bytes], { type: guessMime(name) })
        // thumb再生成
        const thumb = await makeThumbnail(blob, 220)

        // IndexedDBへ保存
        const { getDB } = await import('../../db')
        const db = await getDB()
        const tx = db.transaction('images', 'readwrite')
        await tx.store.put(blob,  `image-original:${cardId}`)
        await tx.store.put(thumb, `image-thumb:${cardId}`)
        await tx.done

        done++
        if (done % 50 === 0) await new Promise(r => setTimeout(r))
      }

      setBusy(null)
      alert('バックアップZIPを復元しました')
    } catch (e) {
      console.error(e)
      setBusy(null)
      alert('インポートでエラーが発生しました')
    }
  }

  return (
    <section>
      <h2>バックアップ</h2>
      <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
        <button onClick={onExport} disabled={!!busy}>全データをZIPでエクスポート</button>
        <label style={{display:'inline-block'}}>
          <span style={{display:'inline-block', padding:'6px 10px', background:'#334155', color:'#fff', borderRadius:6, cursor:'pointer', opacity: busy ? .6 : 1}}>
            ZIPからインポート
          </span>
          <input type="file" accept=".zip,application/zip" onChange={onImportZip} hidden />
        </label>
      </div>
      {busy && <div style={{marginTop:8}}>{busy}</div>}
      <small style={{display:'block', marginTop:8, color:'#555'}}>
        ※ エクスポートには cards / ownership / images（原本）が含まれます。サムネイルは復元時に再生成します。
      </small>
    </section>
  )
}
