import { ArrowUpRight } from 'lucide-react'
import { WORLDS } from '../data'
import { asset, cn } from '../lib'
import { Reveal, SectionHeading } from './ui'

export function Worlds() {
  return (
    <section className="section worlds" id="worlds">
      <div className="container">
        <div className="worlds__head">
          <SectionHeading
            kicker="The worlds"
            title={
              <>
                A hundred and ten ways
                <br />
                to lose a feather.
              </>
            }
            lede="Two story worlds, a bonus arcade and a post-game campaign — all of it running on the new renderer. This is the original SuperTux level design, not a tribute act."
          />
          <Reveal delay={180} className="worlds__head-note">
            <span className="mono-label">Playable now</span>
            <p>
              Icy Island and Rooted Forest ship complete. Bonus arcade and Revenge in
              Redmond are included with every build.
            </p>
            <span className="worlds__capture">Screenshots captured in-game · 1920×1080</span>
          </Reveal>
        </div>

        <div className="world-grid">
          {WORLDS.map((world, index) => (
            <Reveal
              key={world.id}
              className={cn('world-card-wrap', index % 2 === 1 && 'world-card-wrap--offset')}
              delay={index * 70}
            >
              <article className={cn('world-card', `world-card--${world.tone}`)}>
                <a href="#install" className="world-card__link" aria-label={`Install to play ${world.name}`}>
                  <div className="world-card__media">
                    <img src={asset(world.image)} alt="" loading="lazy" />
                    <div className="world-card__scrim" />
                    <div className="world-card__topline">
                      <span className="world-card__index">{world.index}</span>
                      <span className="world-card__levels">{world.levels}</span>
                    </div>
                    <span className="world-card__arrow" aria-hidden="true">
                      <ArrowUpRight size={20} />
                    </span>
                  </div>
                  <div className="world-card__body">
                    <div className="world-card__title-row">
                      <div>
                        <span className="world-card__kicker">{world.kicker}</span>
                        <h3>{world.name}</h3>
                      </div>
                      <span className="world-card__medallion">
                        <img src={asset(world.art)} alt="" loading="lazy" />
                      </span>
                    </div>
                    <p>{world.description}</p>
                  </div>
                </a>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className="worlds__banner">
          <div className="worlds__banner-media" aria-hidden="true">
            <img src={asset('/shots/crystal-mine.webp')} alt="" loading="lazy" />
          </div>
          <div className="worlds__banner-content">
            <span className="mono-label">The original art, untouched</span>
            <p>
              No AI-upscaled texture pack. No “HD” replacements. Just the hand-drawn
              SuperTux artwork, rendered properly by a modern GPU pipeline.
            </p>
            <a href="#rebuilt" className="text-link">
              See what was rebuilt <ArrowUpRight size={15} />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
