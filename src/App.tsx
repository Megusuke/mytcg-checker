import { useEffect, useState } from 'react'
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
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    if (tab !== 'search' && tab !== 'purchase') {
      setFiltersOpen(false)
    }
  }, [tab])

  return (
    <div className={`app-viewport ${filtersOpen ? 'filters-open' : ''}`}>
      <div className="container">
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
            <CardsList filtersOpen={filtersOpen} />
          </section>
        )}

        {tab === 'purchase' && (
          <section className="panel search-surface">
            <Purchase filtersOpen={filtersOpen} />
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

        <div className="tabs-bottom">
          {(tab === 'search' || tab === 'purchase') && (
            <button
              className={`filters-toggle ${filtersOpen ? 'open' : ''}`}
              onClick={() => setFiltersOpen((v) => !v)}
              aria-label="絞り込みを開閉"
              aria-expanded={filtersOpen}
            >
              ▵
            </button>
          )}
          <Tabs
            tabs={[
              { key: 'search',  label: '検索' },
              { key: 'purchase', label: '購入' },
              { key: 'collect', label: '収集' },
              { key: 'stats',   label: '統計' },
            { key: 'import',  label: '移行' },
            ]}
            value={tab}
            onChange={(k)=> setTab(k as any)}
          />
        </div>

        <Toaster />
      </div>
    </div>
  )
}
