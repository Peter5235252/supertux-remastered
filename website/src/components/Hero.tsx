import { ArrowDown, ArrowRight, Download, Play, Sparkles } from 'lucide-react'
import { usePlatform } from '../hooks'
import { asset, detectArch } from '../lib'
import { PLATFORM_META } from '../data'
import { PlatformGlyph } from './ui'
import { Snowfall } from './Snowfall'

const STATS = [
  { value: '110', label: 'hand-built levels' },
  { value: '73', label: 'original tracks' },
  { value: '3', label: 'native GPU backends' },
  { value: '0', label: 'translation layers' },
]

export function Hero() {
  const platform = usePlatform()
  const meta = PLATFORM_META[platform]
  const arch = detectArch()

  return (
    <section className="hero" id="top">
      <div className="hero__media" aria-hidden="true">
        <img
          src={asset('/shots/night-chill.webp')}
          alt=""
          className="hero__image"
          fetchPriority="high"
        />
        <div className="hero__scrim" />
        <div className="hero__aura hero__aura--one" />
        <div className="hero__aura hero__aura--two" />
      </div>

      <Snowfall className="hero__snow" />

      <div className="hero__content container">
        <div className="hero__copy">
          <div className="hero__eyebrow">
            <span className="status-dot" aria-hidden="true" />
            Independent remaster
            <span className="hero__eyebrow-divider" aria-hidden="true" />
            <span className="hero__eyebrow-muted">rolling test build · Oct 2026</span>
          </div>

          <h1 className="hero__title" aria-label="SuperTux Remastered">
            <img
              src={asset('/brand/supertux-logo.png')}
              alt=""
              className="hero__logo"
              width={356}
              height={200}
            />
            <span className="hero__remastered">Remastered</span>
          </h1>

          <p className="hero__tagline">
            The classic penguin platformer, rebuilt on a{' '}
            <em>native GPU renderer.</em>
          </p>
          <p className="hero__sub">
            Vulkan on Linux. Direct3D 12 on Windows. Metal on macOS.
            <br className="hero__br" /> Original artwork. Zero translation layers.
          </p>

          <div className="hero__actions">
            <a href="#install" className="button button--primary button--hero">
              <Download size={18} />
              Install for {meta.short}
              <span className="button__arrow"><ArrowRight size={17} /></span>
            </a>
            <a href="wasm/supertux2.html" className="button button--glass button--hero">
              <Play size={16} />
              Play in Browser (WebGL 2)
              <span className="button__badge">Experimental</span>
            </a>
            <a href="#worlds" className="button button--glass button--hero">
              Explore the worlds
              <ArrowDown size={16} />
            </a>
          </div>

          <div className="hero__fineprint">
            <Sparkles size={14} />
            Free &amp; open source
            <span aria-hidden="true">·</span>
            GPL-3.0
            <span aria-hidden="true">·</span>
            No account, no launcher
          </div>
        </div>

        <aside className="system-card" aria-label="Detected system">
          <div className="system-card__top">
            <span className="system-card__label">Your system</span>
            <span className="system-card__live">
              <span className="status-dot" aria-hidden="true" /> Detected
            </span>
          </div>
          <div className="system-card__os">
            <span className="system-card__glyph">
              <PlatformGlyph platform={platform} />
            </span>
            <div>
              <strong>{meta.name}</strong>
              <span>{arch} · {meta.backend}</span>
            </div>
          </div>
          <div className="system-card__pipe" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <a href="#install" className="system-card__link">
            Get the {meta.short} build
            <ArrowRight size={15} />
          </a>
        </aside>
      </div>

      <div className="hero__bottom container">
        <div className="hero__stats">
          {STATS.map((stat) => (
            <div className="hero__stat" key={stat.label}>
              <span className="hero__stat-value">{stat.value}</span>
              <span className="hero__stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
        <a href="#worlds" className="hero__scroll" aria-label="Scroll to the worlds">
          <span>Scroll to explore</span>
          <span className="hero__scroll-line" aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}
