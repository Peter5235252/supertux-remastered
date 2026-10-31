import { useScrollProgress } from './hooks'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Ticker } from './components/Ticker'
import { Worlds } from './components/Worlds'
import { Story } from './components/Story'
import { Rebuilt } from './components/Rebuilt'
import { Install } from './components/Install'
import { Timeline } from './components/Timeline'
import { FAQ } from './components/FAQ'
import { Footer } from './components/Footer'

function ScrollProgress() {
  const progress = useScrollProgress()
  return (
    <div className="scroll-progress" aria-hidden="true">
      <span style={{ transform: `scaleX(${progress})` }} />
    </div>
  )
}

export default function App() {
  return (
    <>
      <ScrollProgress />
      <Header />
      <main>
        <Hero />
        <Ticker />
        <Worlds />
        <Story />
        <Rebuilt />
        <Install />
        <Timeline />
        <FAQ />
      </main>
      <Footer />
    </>
  )
}
