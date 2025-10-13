import { ImportZip } from './features/importZip/ImportZip'
import { ZipDoctor } from './features/importZip/ZipDoctor'
import { ImportCsv } from './features/importCsv/ImportCsv'
import { CardsList } from './features/cards/CardsList'
import { Stats } from './features/stats/Stats'
import { Backup } from './features/backup/Backup'
import { Toaster } from './components/Toaster'

export default function App() {
  return (
    <div className="container">
      <h1>mytcg-checker</h1>

      <section className="grid" style={{gridTemplateColumns:'1fr', marginBottom:12}}>
        <div className="panel grid">
          <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
            <ImportZip />
            <ZipDoctor />
            <ImportCsv />
          </div>
        </div>
      </section>

      <div className="panel" style={{marginBottom:12}}>
        <CardsList />
      </div>

      <div className="grid" style={{gridTemplateColumns:'1fr', gap:12}}>
        <div className="panel"><Stats /></div>
        <div className="panel"><Backup /></div>
      </div>

      <Toaster />
    </div>
  )
}
