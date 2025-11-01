// src/features/backup/Backup.tsx
//
// 所持状況(ownership)だけをテキストでバックアップ/復元する簡易ツール。
// iPhoneのPWA環境でも確実に使えるように、ファイルダウンロードではなく
// テキストのコピー＆貼り付けでやり取りする方式。
// 通知は alert() で行い、トーストに依存しない。

import React, { useState } from 'react'
import { getAllOwnership, setOwnership } from '../../db'

// Ownership のイメージ：
// getAllOwnership() は { [cardId: string]: number } を返す想定。
// setOwnership(cardId, count) で1件ずつ書き戻せる想定。

export const Backup: React.FC = () => {
  // export / import 用のテキストエリア中身
  const [textData, setTextData] = useState('')

  // 進行中フラグ
  const [busyExport, setBusyExport] = useState(false)
  const [busyImport, setBusyImport] = useState(false)

  // 所持状況をJSON文字列として textData に出力
  async function handleExport() {
    try {
      setBusyExport(true)

      // 1. IndexedDBから ownership 全件をとる
      const map = await getAllOwnership()
      // map は { [cardId: string]: number }

      // 2. 扱いやすい配列へ {cardId,count}[]
      const arr = Object.entries(map).map(([cardId, count]) => ({
        cardId,
        count,
      }))

      // 3. JSON文字列に
      //    - 見やすいようインデント2で整形
      const jsonStr = JSON.stringify(
        {
          version: 1,        // 将来拡張用
          exportedAt: Date.now(),
          ownership: arr,    // [{cardId,count}, ...]
        },
        null,
        2
      )

      setTextData(jsonStr)
      alert('所持状況をエクスポートしました。このテキストをコピーして保管してください。')
    } catch (e: any) {
      console.error(e)
      alert('エクスポートに失敗しました。')
    } finally {
      setBusyExport(false)
    }
  }

  // textData に貼られたJSONを復元
  async function handleImport() {
    try {
      setBusyImport(true)

      if (!textData.trim()) {
        alert('復元データが空です。')
        return
      }

      let parsed: any
      try {
        parsed = JSON.parse(textData)
      } catch (e) {
        alert('JSONとして読み込めませんでした。')
        return
      }

      // 期待フォーマット: { version:1, ownership:[{cardId,count}, ...] }
      if (!parsed || !Array.isArray(parsed.ownership)) {
        alert('フォーマットが不正です。')
        return
      }

      const list: { cardId: string; count: number }[] = parsed.ownership

      // 1件ずつDBへ書き戻し
      for (const item of list) {
        if (!item || typeof item.cardId !== 'string') continue
        const c = typeof item.count === 'number' && item.count >= 0 ? item.count : 0
        await setOwnership(item.cardId, c)
      }

      alert('所持状況を復元しました。')
    } catch (e: any) {
      console.error(e)
      alert('復元に失敗しました。')
    } finally {
      setBusyImport(false)
    }
  }

  return (
    <div className="panel" style={{ display:'grid', gap:12 }}>
      <h2 style={{ margin:'0 0 4px' }}>バックアップ / 復元（所持状況のみ）</h2>

      <p style={{margin:0, fontSize:13, lineHeight:1.5, color:'var(--muted)'}}>
        ・「エクスポート」を押すと、現在の所持枚数データ（どのカードを何枚持っているか）が
        下のテキストエリアにJSONとして表示されます。<br/>
        ・その文字列をメモ帳やメール等にコピーして保存してください。<br/>
        ・復元したいときは、保存しておいたJSON文字列を貼り付けて「復元」を押します。<br/>
        ・画像やカード一覧マスタは含みません（CSV/ZIPはこれまで通りインポートしてください）。
      </p>

      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <button
          className="btn"
          onClick={handleExport}
          disabled={busyExport}
          style={{flex:'0 0 auto'}}
        >
          {busyExport ? 'エクスポート中…' : '所持状況をエクスポート'}
        </button>

        <button
          className="btn ok"
          onClick={handleImport}
          disabled={busyImport}
          style={{flex:'0 0 auto'}}
        >
          {busyImport ? '復元中…' : 'テキストから復元'}
        </button>
      </div>

      <textarea
        className="input"
        style={{
          minHeight: '140px',
          fontFamily: 'monospace',
          fontSize: '12px',
          lineHeight: 1.4,
          whiteSpace: 'pre',
          overflowX: 'auto'
        }}
        placeholder={`{\n  "version":1,\n  "ownership":[{"cardId":"OP01-001","count":2}, ...]\n}`}
        value={textData}
        onChange={(e)=> setTextData(e.target.value)}
      />

      <div style={{fontSize:12, color:'var(--muted)'}}>
        注意: このバックアップは所持枚数のみです。カード画像やカード名リストは含みません。
        それらは今までどおりCSVインポート、ZIPインポートで復元してください。
      </div>
    </div>
  )
}
