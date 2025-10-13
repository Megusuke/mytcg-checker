import React, { useState } from 'react'
import { useImportZip } from './useImportZip'
import { useToast } from '../../components/Toaster'

export const ImportZip: React.FC = () => {
  const { importImagesFromZip } = useImportZip()
  const [progress, setProgress] = useState<{done:number,total:number,current?:string}>()
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  
  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setProgress({done:0,total:0})
    try {
      await importImagesFromZip(file, p => setProgress(p))
      // 成功時:
      toast({ text: '画像の取り込みが完了しました', type:'ok' })
    } catch (e) {
      console.error(e)
      // エラー時:
      toast({ text: '取り込み中にエラーが発生しました', type:'error' })
    } finally {
      setBusy(false)
    }
  }

  const pct = progress && progress.total ? Math.floor(progress.done/progress.total*100) : 0

  return (
    <div className="grid">
      <label className="btn" style={{width:'fit-content'}}>
        画像ZIPを選択
        <input
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream"
          onChange={onPick}
          hidden
        />
      </label>

      {busy && (
        <div className="grid">
          <div>読み込み中: {progress?.done ?? 0} / {progress?.total ?? 0}</div>
          {progress?.current && <div className="badge">現在: {progress.current}</div>}
          <div className="progress"><div className="fill" style={{width:`${pct}%`}} /></div>
        </div>
      )}
    </div>
  )
}
