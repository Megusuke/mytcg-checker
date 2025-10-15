import { useState } from 'react'
import { ImportZip } from './features/importZip/ImportZip'
import { ZipDoctor } from './features/importZip/ZipDoctor'
import { ImportCsv } from './features/importCsv/ImportCsv'
import { CardsList } from './features/cards/CardsList'
import { Stats } from './features/stats/Stats'
import { Backup } from './features/backup/Backup'
import { Toaster } from './components/Toaster'
import { Tabs } from './components/Tabs'
import { Collect } from './features/collect/Collect'

export default function App() {
  const [tab, setTab] = useState<'import'|'search'|'collect'|'stats'>('import')

  return (
    <div className="app-viewport">
      <div className="container">
        <h1>mytcg-checker</h1>

        <Tabs
          tabs={[
            { key: 'import', label: 'インポート' },
            { key: 'search', label: '検索' },
            { key: 'collect', label: '収集' },
            { key: 'stats',  label: '統計' },
          ]}
          value={tab}
          onChange={(k) => setTab(k as any)}
        />

        {/* インポート：このタブでもスクロールできるようラッパでoverflow:auto */}
        {tab === 'import' && (
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
            <section className="panel grid" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
              <div className="two-col">
                <ImportZip />
                <ZipDoctor />
              </div>
              <ImportCsv />
              <Backup />
            </section>
          </div>
        )}

        {/* 検索：上部固定＋カードだけ内部スクロール（search-surfaceはCSSでflex/overflow管理） */}
        {tab === 'search' && (
          <section className="panel search-surface">
            <CardsList />
          </section>
        )}
        
        {/* 収集 */}
        {tab === 'collect' && (
          <section className="panel">
          <Collect />
          </section>
        )}
        
        {/* 統計：こちらもスクロール可にしておく */}
        {tab === 'stats' && (
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
            <section className="grid" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
              <div className="panel"><Stats /></div>
            </section>
          </div>
        )}

        <Toaster />
      </div>
    </div>
  )
}
