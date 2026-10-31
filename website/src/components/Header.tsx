import { useEffect, useState } from 'react'
import { ArrowUpRight, Download, Github, Menu, X } from 'lucide-react'
import { useActiveSection, usePlatform, useScrolled } from '../hooks'
import { asset, cn } from '../lib'
import { PLATFORM_META, REPO_URL } from '../data'
import { PlatformGlyph } from './ui'

const NAV = [
  { id: 'worlds', label: 'Worlds' },
  { id: 'rebuilt', label: 'Rebuilt' },
  { id: 'install', label: 'Install' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'faq', label: 'FAQ' },
]

const SECTION_IDS = NAV.map((item) => item.id)

export function Header() {
  const scrolled = useScrolled(30)
  const active = useActiveSection(SECTION_IDS)
  const platform = usePlatform()
  const [open, setOpen] = useState(false)
  const meta = PLATFORM_META[platform]

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className={cn('site-header', (scrolled || open) && 'is-scrolled', open && 'is-open')}>
      <div className="site-header__inner container">
        <a href="#top" className="brand" aria-label="SuperTux Remastered home">
          <span className="brand__mark">
            <img src={asset('/brand/tux.webp')} alt="" width={32} height={40} />
          </span>
          <span className="brand__text">
            <span className="brand__name">SuperTux</span>
            <span className="brand__tag">Remastered</span>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Sections">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn('desktop-nav__link', active === item.id && 'is-active')}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="icon-button header-github"
            aria-label="SuperTux Remastered on GitHub"
          >
            <Github size={18} />
          </a>
          <a href="#install" className="button button--small button--primary header-install">
            <Download size={15} />
            <span className="header-install__label">Install for {meta.short}</span>
            <PlatformGlyph platform={platform} className="header-install__icon" />
          </a>
          <button
            type="button"
            className="icon-button menu-toggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div className="mobile-menu" id="mobile-menu" hidden={!open}>
        <nav className="mobile-menu__nav" aria-label="Mobile navigation">
          {NAV.map((item, index) => (
            <a key={item.id} href={`#${item.id}`} onClick={() => setOpen(false)}>
              <span>0{index + 1}</span>
              {item.label}
              <ArrowUpRight size={18} />
            </a>
          ))}
        </nav>
        <div className="mobile-menu__foot">
          <a href="#install" className="button button--primary" onClick={() => setOpen(false)}>
            <Download size={16} /> Install for {meta.short}
          </a>
          <a href={REPO_URL} target="_blank" rel="noreferrer noopener" className="mobile-menu__repo">
            <Github size={16} /> View source on GitHub <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </header>
  )
}
