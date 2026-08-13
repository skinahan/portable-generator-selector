import loads from '../data/loads.json'
import generators from '../data/generators.json'
import type { Generator, Load } from './types/catalog'

const catalogLoads = loads as Load[]
const catalogGenerators = generators as Generator[]

export default function App() {
  return (
    <main className="shell">
      <p className="brand">Portable Generator Selector</p>
      <h1>Tell us what you need to keep running during an outage. We&apos;ll find the generators that actually fit.</h1>
      <p className="lede">
        This first version answers one question well: what size and type of portable
        generator should you buy — not which unit is vaguely &ldquo;best.&rdquo;
      </p>
      <p className="status">
        Scaffold ready. Catalog stubs: {catalogLoads.length} loads,{' '}
        {catalogGenerators.length} generators. Questionnaire and recommendation
        engine land in the next slice.
      </p>
    </main>
  )
}
