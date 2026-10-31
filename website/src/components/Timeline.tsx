import { ArrowUpRight, GitCommitHorizontal } from 'lucide-react'
import { REPO_URL, TIMELINE } from '../data'
import { Reveal, SectionHeading } from './ui'

export function Timeline() {
  return (
    <section className="section timeline" id="timeline">
      <div className="container">
        <div className="timeline__grid">
          <div className="timeline__intro">
            <SectionHeading
              kicker="The build log"
              title={
                <>
                  Made in public.
                  <br />
                  Glitches included.
                </>
              }
              lede="SuperTux Remastered is a fresh rewrite with a single maintainer and a very honest changelog. Here is the short version of how the renderer got here."
            />
            <Reveal delay={160}>
              <a href={`${REPO_URL}/blob/main/CHANGELOG-FORK.md`} target="_blank" rel="noreferrer" className="text-link">
                Read the full fork changelog <ArrowUpRight size={15} />
              </a>
            </Reveal>
          </div>

          <ol className="timeline-list">
            {TIMELINE.map((item, index) => (
              <Reveal as="li" key={`${item.date}-${item.title}`} delay={index * 60} className="timeline-item">
                <div className="timeline-item__rail" aria-hidden="true">
                  <span className="timeline-item__dot" />
                </div>
                <div className="timeline-item__content">
                  <div className="timeline-item__meta">
                    <span className="timeline-item__date">{item.date}</span>
                    <span className="timeline-item__tag">{item.tag}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal className="timeline-commit">
          <div className="timeline-commit__left">
            <GitCommitHorizontal size={18} />
            <span className="mono-label">Current tree</span>
            <code>main · 9f0504a</code>
          </div>
          <p>Upstream base b562c6c · SuperTux 0.7.0 generation · GPL-3.0-or-later</p>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-link">
            Browse the source <ArrowUpRight size={14} />
          </a>
        </Reveal>
      </div>
    </section>
  )
}
