import { useState } from 'react'
import { ImportZip } from './features/importZip/ImportZip'
import { ZipDoctor } from './features/importZip/ZipDoctor'
import { ImportCsv } from './features/importCsv/ImportCsv'
import { CardsList } from './features/cards/CardsList'
import { Stats } from './features/stats/Stats'
import { Backup } from './features/backup/Backup'
import { Toaster } from './components/Toaster'
import { Tabs } from './components/Tabs'

export default function App() {
  const [tab, setTab] = useState<'import'|'search'|'stats'>('import')

  return (
    <div className="container">
      <h1>mytcg-checker</h1>

      <Tabs
        tabs={[
          { key: 'import', label: 'インポート' },
          { key: 'search', label: '検索' },
          { key: 'stats',  label: '統計' },
        ]}
        value={tab}
        onChange={(k)=> setTab(k as any)}
      />

      {tab === 'import' && (
        <section className="panel grid" style={{gridTemplateColumns:'1fr', gap:12}}>
          <div className="two-col">
            <ImportZip />
            <ZipDoctor />
          </div>
          <ImportCsv />
          <Backup />
        </section>
      )}

      {tab === 'search' && (
        <section className="panel">
          <CardsList />
        </section>
      )}

      {tab === 'stats' && (
        <section className="grid" style={{gridTemplateColumns:'1fr', gap:12}}>
          <div className="panel"><Stats /></div>
        </section>
      )}

      <Toaster />
    </div>
  )
}
