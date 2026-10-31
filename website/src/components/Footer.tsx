import { ArrowUp, Github, Heart } from 'lucide-react'
import { ORIGINAL_SITE, REPO_URL, UPSTREAM_URL } from '../data'
import { asset } from '../lib'

const LINKS = {
  Explore: [
    ['Worlds', '#worlds'],
    ['Rebuilt renderer', '#rebuilt'],
    ['Install', '#install'],
    ['Build log', '#timeline'],
    ['FAQ', '#faq'],
  ],
  Project: [
    ['GitHub repository', REPO_URL],
    ['Release downloads', `${REPO_URL}/releases/tag/test-build`],
    ['Report an issue', `${REPO_URL}/issues`],
    ['Fork changelog', `${REPO_URL}/blob/main/CHANGELOG-FORK.md`],
    ['Contributing', `${REPO_URL}/blob/main/CONTRIBUTING.md`],
  ],
  Credits: [
    ['Attribution', `${REPO_URL}/blob/main/ATTRIBUTION.md`],
    ['AI disclosure', `${REPO_URL}/blob/main/AI_DISCLOSURE.md`],
    ['Code license · GPL-3.0', `${REPO_URL}/blob/main/LICENSE.txt`],
    ['Font licenses · OFL', 'licenses/fonts.txt'],
    ['Original SuperTux', UPSTREAM_URL],
    ['supertux.org', ORIGINAL_SITE],
  ],
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__glow" aria-hidden="true" />
      <div className="container">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <a href="#top" className="brand brand--footer" aria-label="SuperTux Remastered home">
              <span className="brand__mark">
                <img src={asset('/brand/tux.webp')} alt="" width={32} height={40} />
              </span>
              <span className="brand__text">
                <span className="brand__name">SuperTux</span>
                <span className="brand__tag">Remastered</span>
              </span>
            </a>
            <p>
              An independent, hobbyist remaster of SuperTux 2 — the Milestone 2 engine
              generation. Native GPU rendering, original artwork, no translation layers.
            </p>
            <div className="site-footer__badges">
              <span><span className="status-dot" /> Test builds active</span>
              <span>GPL-3.0-or-later</span>
              <span>CC-BY-SA data</span>
            </div>
          </div>

          <div className="site-footer__links">
            {Object.entries(LINKS).map(([group, items]) => (
              <div key={group}>
                <h3>{group}</h3>
                <ul>
                  {items.map(([label, href]) => (
                    <li key={label}>
                      <a
                        href={href}
                        {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="site-footer__legal">
          <p>
            SuperTux Remastered is <strong>not an official SuperTux release</strong> and is
            not affiliated with The SuperTux Team. SuperTux is © 2003–2026 The SuperTux
            Team, written by Bill Kendrick, Ingo Ruhnke and contributors. All game
            artwork, music, levels and text remain the work of their original creators.
            Fork code is GPL-3.0-or-later; game data is CC-BY-SA. AI involvement in the
            development workflow is disclosed in the repository.
          </p>
          <div className="site-footer__end">
            <span>© 2026 Peter5235252 · built with <Heart size={13} /> and a very stubborn penguin</span>
            <div>
              <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub">
                <Github size={16} />
              </a>
              <a href="#top" className="back-top" aria-label="Back to top">
                <ArrowUp size={16} />
              </a>
            </div>
          </div>
        </div>

        <div className="site-footer__wordmark" aria-hidden="true">SuperTux</div>
      </div>
    </footer>
  )
}
