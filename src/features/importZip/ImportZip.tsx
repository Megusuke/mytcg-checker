import React, { useState } from 'react'
import { useImportZip } from './useImportZip'

export const ImportZip: React.FC = () => {
  const { importImagesFromZip } = useImportZip()
  const [progress, setProgress] = useState<{done:number,total:number,current?:string}>()
  const [busy, setBusy] = useState(false)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setProgress({done:0,total:0})
    try {
      await importImagesFromZip(file, p => setProgress(p))
      alert('画像の取り込みが完了しました')
    } catch (e) {
      console.error(e)
      alert('取り込み中にエラーが発生しました')
    } finally {
      setBusy(false)
    }
  }

  const pct = progress && progress.total ? Math.floor(progress.done/progress.total*100) : 0

  return (
    <div style={{display:'grid', gap:12}}>
      <label style={{display:'inline-block', padding:'8px 12px', background:'#0ea5e9', color:'#fff', borderRadius:8, cursor:'pointer'}}>
        画像ZIPを選択
         <input
           type="file"
           accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream"
           onChange={onPick}
           hidden
         />
      </label>
      {busy && (
        <div>
          <div>読み込み中: {progress?.done ?? 0} / {progress?.total ?? 0}（{pct}%）</div>
          {progress?.current && <div>現在: {progress.current}</div>}
          <div style={{height:10, background:'#eee', borderRadius:6, overflow:'hidden', marginTop:6}}>
            <div style={{height:'100%', width:`${pct}%`, background:'#0ea5e9`'}}/>
          </div>
        </div>
      )}
    </div>
  )
}
