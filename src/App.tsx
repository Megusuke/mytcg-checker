import { ImportZip } from './features/importZip/ImportZip'
import { ImportCsv } from './features/importCsv/ImportCsv'
import { CardsList } from './features/cards/CardsList'
import { Stats } from './features/stats/Stats'
import { Backup } from './features/backup/Backup'

export default function App() {
  return (
    <main style={{maxWidth:1100, margin:'0 auto', padding:16}}>
      <h1>OPCG Checker</h1>
      <section style={{display:'grid', gap:12}}>
        <ImportZip />
        <ImportCsv />
      </section>
      <hr style={{margin:'20px 0'}} />
      <CardsList />
      <hr style={{margin:'20px 0'}} />
      <Stats />
      <hr style={{margin:'20px 0'}} />
      <Backup />
    </main>
  )
}
