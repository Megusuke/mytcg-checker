// src/features/importZip/ZipDoctor.tsx
import React, { useState } from 'react'
import { readZip } from '../../utils/zip'

export const ZipDoctor: React.FC = () => {
  const [names, setNames] = useState<string[]>([])
  const [msg, setMsg] = useState<string>('')

  async function onCheck(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.currentTarget.value = ''
    if (!file) return
    setMsg('解析中...')
    try {
      const entries = await readZip(file)
      const list = Object.keys(entries).sort((a, b) => a.localeCompare(b))
      setNames(list)
      setMsg(`ファイル数: ${list.length}（先頭10件表示）`)
    } catch (err: any) {
      console.error(err)
      setMsg(`ZIPの解析に失敗: ${err?.message ?? err}`)
      setNames([])
    }
  }

  const head = names.slice(0, 10)

  return (
    <div style={{display:'grid', gap:8}}>
      <label className="btn neutral" style={{width:'fit-content'}}>
        ZIPを検査（中身確認のみ）
        <input
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream"
          onChange={onCheck}
          hidden
        />
      </label>
      {!!msg && <div className="badge">{msg}</div>}
      {!!head.length && (
        <div style={{fontFamily:'monospace', fontSize:12, background:'#0b1223', padding:8, border:'1px solid #253149', borderRadius:6}}>
          {head.map((n, i) => <div key={i}>{n}</div>)}
        </div>
      )}
      {!head.length && !!msg && <div>（表示する項目なし）</div>}
    </div>
  )
}
