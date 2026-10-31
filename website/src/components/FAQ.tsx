import { useState } from 'react'
import { ArrowUpRight, Plus } from 'lucide-react'
import { FAQS, REPO_URL } from '../data'
import { asset, cn } from '../lib'
import { Reveal, SectionHeading } from './ui'

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="section faq" id="faq">
      <div className="container">
        <div className="faq__grid">
          <div className="faq__intro">
            <SectionHeading
              kicker="Questions"
              title={
                <>
                  The honest
                  <br />
                  fine print.
                </>
              }
              lede="It is a hobbyist remaster of a 2003 open-source classic, running on a renderer written in 2026. Here is what that means in practice."
            />
            <Reveal delay={160} className="faq__contact">
              <p>Something still unclear?</p>
              <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer" className="text-link">
                Open an issue on GitHub <ArrowUpRight size={15} />
              </a>
            </Reveal>
          </div>

          <div className="accordion">
            {FAQS.map((item, index) => {
              const isOpen = open === index
              return (
                <Reveal key={item.q} delay={index * 35}>
                  <div className={cn('accordion-item', isOpen && 'is-open')}>
                    <button
                      type="button"
                      className="accordion-item__button"
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${index}`}
                      id={`faq-button-${index}`}
                      onClick={() => setOpen(isOpen ? null : index)}
                    >
                      <span className="accordion-item__index">{String(index + 1).padStart(2, '0')}</span>
                      <span>{item.q}</span>
                      <span className="accordion-item__plus" aria-hidden="true">
                        <Plus size={18} />
                      </span>
                    </button>
                    <div
                      id={`faq-panel-${index}`}
                      role="region"
                      aria-labelledby={`faq-button-${index}`}
                      className="accordion-item__panel"
                      hidden={!isOpen}
                    >
                      <p>{item.a}</p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>

        <Reveal className="final-cta">
          <div className="final-cta__bg" aria-hidden="true">
            <img src={asset('/shots/journey-begins.webp')} alt="" loading="lazy" />
          </div>
          <div className="final-cta__inner">
            <span className="mono-label">One last thing</span>
            <h2>Tux is not going to rescue Penny by himself.</h2>
            <p>Download the remaster, keep the terminal closed, and let the penguin do the work.</p>
            <a href="#install" className="button button--primary button--hero">
              Install SuperTux Remastered
              <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="final-cta__tux" aria-hidden="true">
            <img src={asset('/brand/tux.webp')} alt="" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
