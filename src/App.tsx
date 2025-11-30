import { useState } from 'react'
import { ImportZip } from './features/importZip/ImportZip'
import { ImportCsv } from './features/importCsv/ImportCsv'
import { CardsList } from './features/cards/CardsList'
import { Stats } from './features/stats/Stats'
import { Backup } from './features/backup/Backup'
import { Toaster } from './components/Toaster'
import { Tabs } from './components/Tabs'
import { Collect } from './features/collect/Collect'
import { Purchase } from './features/purchase/Purchase'

export default function App() {
  const [tab, setTab] = useState<'import'|'search'|'purchase'|'collect'|'stats'>('search')

  return (
    <div className="app-viewport">
      <div className="container">
        <h1>mytcg-checker</h1>

        <Tabs
          tabs={[
            { key: 'search',  label: '検索' },
            { key: 'purchase', label: '購入' },
            { key: 'collect', label: '収集' },
            { key: 'stats',   label: '統計' },
            { key: 'import',  label: 'インポート' },
          ]}
          value={tab}
          onChange={(k)=> setTab(k as any)}
        />

        {tab === 'import' && (
          <section className="panel grid" style={{gridTemplateColumns:'1fr', gap:12}}>
            <div className="two-col">
              <ImportZip />
            </div>
            <ImportCsv />
            <Backup />
          </section>
        )}

        {tab === 'search' && (
          <section className="panel search-surface">
            <CardsList />
          </section>
        )}

        {tab === 'purchase' && (
          <section className="panel search-surface">
            <Purchase />
          </section>
        )}

        {tab === 'collect' && (
          <section className="panel">
            <Collect />
          </section>
        )}

        {tab === 'stats' && (
          <section className="grid" style={{gridTemplateColumns:'1fr', gap:12}}>
            <div className="panel"><Stats /></div>
          </section>
        )}

        <Toaster />
      </div>
    </div>
  )
}
