import { useState } from 'react'
import { Check, Cpu, Layers, MonitorUp, Sparkles } from 'lucide-react'
import { usePlatform } from '../hooks'
import { PLATFORM_META, type Platform } from '../data'
import { cn } from '../lib'
import { PlatformGlyph, Reveal, SectionHeading } from './ui'

const BACKENDS: Record<
  Platform,
  {
    api: string
    shader: string
    status: string
    headline: string
    body: string
    notes: string[]
  }
> = {
  linux: {
    api: 'Vulkan',
    shader: 'SPIR-V',
    status: 'Native · primary Linux path',
    headline: 'Straight to your Vulkan driver.',
    body: 'SDL_GPU creates the device and swapchain directly. No GLX, no OpenGL compatibility path, no driver translation layer. Mesa, RADV and the NVIDIA proprietary driver are all first-class citizens.',
    notes: ['SPIR-V shaders', 'FSR 1.0 upscaling', 'HDR groundwork'],
  },
  windows: {
    api: 'Direct3D 12',
    shader: 'DXIL',
    status: 'Native · Vulkan fallback',
    headline: 'Direct3D 12, with a safety net.',
    body: 'Windows 10 and 11 render through native D3D12 with DXIL shaders. If device creation fails on a particular driver, the engine falls back to Vulkan instead of silently dropping to software.',
    notes: ['DXIL shaders', 'Vulkan fallback', '10-bit HDR ready'],
  },
  macos: {
    api: 'Metal',
    shader: 'MSL',
    status: 'Native · universal binary',
    headline: 'Metal on Apple Silicon and Intel.',
    body: 'The macOS app is universal and renders natively through Metal with MSL shaders. MoltenVK, KosmicKrisp and the Vulkan loader are not in the bundle — if Metal fails, the game says so.',
    notes: ['Universal .app', 'MSL shaders', 'No MoltenVK'],
  },
}

const FEATURES = [
  {
    icon: Layers,
    title: 'One pipeline, three APIs',
    body: 'SDL_GPU abstracts the platform without abstracting away the performance. The settings menu names the backend you are actually using.',
  },
  {
    icon: Sparkles,
    title: 'Shaders for every backend',
    body: 'SPIR-V, DXIL and MSL are generated from the same source and shipped with the build. The loader picks the format from the live device capabilities.',
  },
  {
    icon: MonitorUp,
    title: 'FSR 1.0 + HDR groundwork',
    body: 'AMD FidelityFX Super Resolution 1.0 is exposed in the options menu, with 10-bit sRGB and HDR output groundwork underneath.',
  },
  {
    icon: Cpu,
    title: 'Still a real game',
    body: 'Gamepad support, rebindable controls, a level editor, add-ons, 110 levels and the original soundtrack. The renderer is new; the game is intact.',
  },
]

export function Rebuilt() {
  const detected = usePlatform()
  const [selected, setSelected] = useState<Platform>(detected)
  const backend = BACKENDS[selected]
  const meta = PLATFORM_META[selected]

  return (
    <section className="section rebuilt" id="rebuilt">
      <div className="rebuilt__glow" aria-hidden="true" />
      <div className="container">
        <div className="rebuilt__grid">
          <div className="rebuilt__intro">
            <SectionHeading
              kicker="Under the hood"
              title={
                <>
                  A 2003 classic.
                  <br />
                  A 2026 renderer.
                </>
              }
              lede="The old SDL and OpenGL backends are gone. Every frame now goes through SDL_GPU to the native graphics API of your operating system — with the original game still doing what it always did."
            />
            <Reveal delay={200}>
              <div className="rebuilt__facts">
                <div>
                  <strong>0</strong>
                  <span>translation layers</span>
                </div>
                <div>
                  <strong>3</strong>
                  <span>native backends</span>
                </div>
                <div>
                  <strong>1</strong>
                  <span>shared game</span>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={100} className="backend-panel">
            <div className="backend-panel__head">
              <div className="backend-tabs" role="tablist" aria-label="Renderer backends">
                {(Object.keys(BACKENDS) as Platform[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={selected === key}
                    className={cn('backend-tab', selected === key && 'is-active')}
                    onClick={() => setSelected(key)}
                  >
                    <PlatformGlyph platform={key} />
                    {PLATFORM_META[key].name}
                    {detected === key && <span className="backend-tab__you">you</span>}
                  </button>
                ))}
              </div>
              <span className="backend-panel__badge">
                <span className="status-dot" aria-hidden="true" /> Native
              </span>
            </div>

            <div className="pipeline" key={selected}>
              <div className="pipeline__node">
                <span className="pipeline__icon"><Cpu size={18} /></span>
                <span className="pipeline__label">SuperTux</span>
                <span className="pipeline__sub">game</span>
              </div>
              <div className="pipeline__wire" aria-hidden="true"><span /></div>
              <div className="pipeline__node pipeline__node--accent">
                <span className="pipeline__icon"><Layers size={18} /></span>
                <span className="pipeline__label">SDL_GPU</span>
                <span className="pipeline__sub">abstraction</span>
              </div>
              <div className="pipeline__wire" aria-hidden="true"><span /></div>
              <div className="pipeline__node pipeline__node--target">
                <span className="pipeline__icon"><PlatformGlyph platform={selected} /></span>
                <span className="pipeline__label">{backend.api}</span>
                <span className="pipeline__sub">{meta.name} driver</span>
              </div>
            </div>

            <div className="backend-detail">
              <div className="backend-detail__copy">
                <span className="mono-label">{backend.status}</span>
                <h3>{backend.headline}</h3>
                <p>{backend.body}</p>
                <ul className="backend-notes">
                  {backend.notes.map((note) => (
                    <li key={note}><Check size={13} /> {note}</li>
                  ))}
                </ul>
              </div>
              <div className="terminal" aria-label={`${meta.name} renderer details`}>
                <div className="terminal__bar">
                  <span /><span /><span />
                  <em>renderer.log</em>
                </div>
                <pre>
                  <code>
<span className="term-dim">$</span> supertux2 --verbose{'\n'}
<span className="term-dim">[</span><span className="term-green">gpu</span><span className="term-dim">]</span> driver: <span className="term-ice">{backend.api.toLowerCase()}</span>{'\n'}
<span className="term-dim">[</span><span className="term-green">gpu</span><span className="term-dim">]</span> shader: <span className="term-ice">{backend.shader}</span>{'\n'}
<span className="term-dim">[</span><span className="term-green">gpu</span><span className="term-dim">]</span> translation: <span className="term-orange">none</span>{'\n'}
<span className="term-dim">[</span><span className="term-green">gpu</span><span className="term-dim">]</span> vsync: <span className="term-ice">on</span>{'\n'}
<span className="term-dim">[</span><span className="term-green">gpu</span><span className="term-dim">]</span> status: <span className="term-green">ready</span>
                  </code>
                </pre>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="feature-grid">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 60}>
              <article className="feature-card">
                <span className="feature-card__icon"><feature.icon size={20} /></span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
