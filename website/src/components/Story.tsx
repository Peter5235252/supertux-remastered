import { ArrowUpRight } from 'lucide-react'
import { asset } from '../lib'
import { Reveal } from './ui'

export function Story() {
  return (
    <section className="story" aria-labelledby="story-title">
      <div className="story__bg" aria-hidden="true">
        <img src={asset('/shots/journey-begins.webp')} alt="" loading="lazy" />
      </div>
      <div className="story__scrim" aria-hidden="true" />
      <div className="container story__inner">
        <Reveal className="story__copy">
          <span className="kicker">
            <span className="kicker__spark" aria-hidden="true" />
            The story
          </span>
          <h2 id="story-title">
            A picnic. A flash.
            <br />
            A very rude note.
          </h2>
          <p>
            Tux and Penny were enjoying a quiet afternoon on the ice fields of Antarctica.
            Then a shadow jumped out of an ice bush, there was a flash — and Tux fell asleep.
          </p>
          <p>
            He wakes to an empty picnic blanket and a letter from Nolok. Penny is gone. The
            fortress is far away. The path is full of minions. You know what to do.
          </p>
          <a href="#worlds" className="text-link">
            See where the journey goes <ArrowUpRight size={15} />
          </a>
        </Reveal>

        <Reveal className="letter" delay={140}>
          <div className="letter__pin" aria-hidden="true" />
          <div className="letter__head">
            <span>Delivered by</span>
            <span className="letter__stamp">NOLOK</span>
          </div>
          <blockquote>
            “Tux, my arch enemy! I have captured your beautiful Penny and have taken her to
            my fortress. The path to my fortress is littered with my minions. Give up on the
            thought of trying to reclaim her — you haven’t got a chance!”
          </blockquote>
          <div className="letter__sign">
            <span>— Nolok</span>
            <span className="letter__scribble" aria-hidden="true">be seeing you</span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
