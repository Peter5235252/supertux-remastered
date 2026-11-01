import { useState } from 'react'
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileArchive,
  FolderOpen,
  HardDrive,
  Play,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react'
import { CLI, DOWNLOADS, PLATFORM_META, RELEASE, RELEASES_URL, type Platform } from '../data'
import { useCopy, usePlatform } from '../hooks'
import { asset, cn } from '../lib'
import { PlatformGlyph, Reveal, SectionHeading } from './ui'

const STEPS = [
  {
    icon: Download,
    title: 'Download the setup',
    body: 'One small, self-contained executable. No package manager, no terminal, no sudo.',
  },
  {
    icon: FolderOpen,
    title: 'Choose where it lives',
    body: 'Install for your user by default, or pick any folder. The installer shows the exact path first.',
  },
  {
    icon: Play,
    title: 'Press play',
    body: 'It fetches the game, verifies the release digest, adds a desktop shortcut and launches Tux.',
  },
]

const CHECKS = [
  'SHA-256 digest verification against the GitHub release',
  'Installs to your home folder — no administrator prompt',
  'Adds a desktop entry, icon and uninstaller',
  'Bundles SDL3_image/SDL3_ttf for a clean first launch',
  'Never bundles ads, launchers, telemetry or an account',
]

const PLATFORM_TABS: Platform[] = ['linux', 'windows', 'macos']

function CliBlock({ platform }: { platform: Platform }) {
  const { copied, copy } = useCopy()
  const command = CLI[platform]
  return (
    <div className="cli">
      <div className="cli__bar">
        <span><Terminal size={14} /> Advanced install</span>
        <button type="button" className="cli__copy" onClick={() => copy(command)}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy command'}
        </button>
      </div>
      <pre className="cli__code"><code>{command}</code></pre>
      <p className="cli__note">
        The same release files, one command. Keep this if you prefer a terminal, scripted
        installs or a portable folder you can move yourself.
      </p>
    </div>
  )
}

export function Install() {
  const detected = usePlatform()
  const [platform, setPlatform] = useState<Platform>(detected)
  const [advanced, setAdvanced] = useState(false)
  const meta = PLATFORM_META[platform]

  return (
    <section className="section install" id="install">
      <div className="install__aurora" aria-hidden="true" />
      <div className="container">
        <SectionHeading
          kicker="Get the game"
          title={
            <>
              No terminal.
              <br />
              No treasure hunt.
            </>
          }
          lede="A real graphical installer: choose a folder, get a desktop shortcut, launch Tux. The command line is still here for the people who want it — tucked away where it belongs."
          align="center"
          className="install__heading"
        />

        <Reveal className="install-shell">
          <div className="install-panel">
            <div className="install-panel__top">
              <div className="platform-tabs" role="tablist" aria-label="Choose your platform">
                {PLATFORM_TABS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={platform === key}
                    className={cn('platform-tab', platform === key && 'is-active')}
                    onClick={() => setPlatform(key)}
                  >
                    <PlatformGlyph platform={key} />
                    <span>{PLATFORM_META[key].name}</span>
                    {detected === key && <span className="platform-tab__dot" aria-label="Detected system" />}
                  </button>
                ))}
              </div>
              <span className="install-panel__release">
                {RELEASE.label} · {RELEASE.date}
              </span>
            </div>

            <div className="install-main">
              <div className="install-main__copy">
                <span className="mono-label">
                  {platform === 'linux'
                    ? 'Recommended for your system'
                    : `${meta.name} · native ${meta.backend}`}
                </span>
                <h3>
                  {platform === 'linux' && 'SuperTux Remastered Setup'}
                  {platform === 'windows' && 'SuperTux Remastered for Windows'}
                  {platform === 'macos' && 'SuperTux Remastered for macOS'}
                </h3>
                <p>
                  {platform === 'linux' &&
                    'A standalone graphical installer for 64-bit x86_64 Linux. It fetches the current test build from GitHub, checks the official SHA-256 digest, installs the game and creates a launcher.'}
                  {platform === 'windows' &&
                    'The portable Windows build, ready to unzip and run. Rendering uses native Direct3D 12 with a Vulkan fallback. A signed setup is on the way; the portable build is the same game today.'}
                  {platform === 'macos' &&
                    'A universal .app for Apple Silicon and Intel Macs, rendering natively through Metal. Unzip, drag SuperTux to Applications, and right-click → Open the first time.'}
                </p>

                <div className="download-actions">
                  {platform === 'linux' ? (
                    <>
                      <a
                        className="button button--primary button--wide"
                        href={asset(DOWNLOADS.linuxInstaller)}
                        download={DOWNLOADS.linuxInstallerName}
                      >
                        <Download size={18} />
                        Download installer
                        <span className="download-actions__size">{DOWNLOADS.linuxInstallerSize}</span>
                      </a>
                      <a
                        className="button button--outline button--wide"
                        href={RELEASE.linuxPortable}
                        download
                      >
                        <FileArchive size={17} />
                        Portable .tar.gz
                        <span className="download-actions__size">{DOWNLOADS.linuxPortableSize}</span>
                      </a>
                    </>
                  ) : platform === 'windows' ? (
                    <>
                      <a className="button button--primary button--wide" href={RELEASE.windowsPortable} download>
                        <Download size={18} />
                        Download portable build
                        <span className="download-actions__size">{DOWNLOADS.windowsPortableSize}</span>
                      </a>
                      <a className="button button--outline button--wide" href={RELEASES_URL} target="_blank" rel="noreferrer">
                        <ArrowUpRight size={17} />
                        All release files
                      </a>
                    </>
                  ) : (
                    <>
                      <a className="button button--primary button--wide" href={RELEASE.macosUniversal} download>
                        <Download size={18} />
                        Download universal .app
                        <span className="download-actions__size">{DOWNLOADS.macosPortableSize}</span>
                      </a>
                      <a className="button button--outline button--wide" href={RELEASES_URL} target="_blank" rel="noreferrer">
                        <ArrowUpRight size={17} />
                        All release files
                      </a>
                    </>
                  )}
                </div>

                {platform === 'linux' && (
                  <div className="install-alt">
                    <div className="install-alt__item">
                      <span className="install-alt__icon"><ShieldCheck size={16} /></span>
                      <div>
                        <strong>Checksum published</strong>
                        <a href={asset('/downloads/SHA256SUMS')} download="SHA256SUMS">
                          Verify the installer <ArrowUpRight size={12} />
                        </a>
                      </div>
                    </div>
                    <div className="install-alt__item">
                      <span className="install-alt__icon"><HardDrive size={16} /></span>
                      <div>
                        <strong>Any modern distro</strong>
                        <a href={RELEASES_URL} target="_blank" rel="noreferrer">
                          Inspect the release <ArrowUpRight size={12} />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <p className="install-hint">
                  <Sparkles size={14} />
                  {platform === 'linux' &&
                    'Download, open, install. If your browser strips the executable bit, right-click the file → Properties → Permissions → allow executing.'}
                  {platform === 'windows' &&
                    'Unsigned test build. SmartScreen may ask: More info → Run anyway. The zip contains the full game and data.'}
                  {platform === 'macos' &&
                    'Unsigned test build. macOS may block the first launch; right-click the app → Open. No installer or admin password required.'}
                </p>
              </div>

              <div className="install-window" aria-label="SuperTux Remastered installer preview">
                <div className="install-window__bar">
                  <span /><span /><span />
                  <em>SuperTux Remastered Setup</em>
                </div>
                <div className="install-window__body">
                  <div className="install-window__brand">
                    <img src={asset('/brand/tux.webp')} alt="" />
                    <div>
                      <strong>SuperTux</strong>
                      <span>Remastered · Setup</span>
                    </div>
                  </div>
                  <div className="install-window__status">
                    <span className="status-dot" aria-hidden="true" />
                    Ready to install
                    <em>Linux x86_64</em>
                  </div>
                  <div className="install-window__path">
                    <FolderOpen size={14} />
                    <span>~/.local/share/SuperTux Remastered</span>
                  </div>
                  <div className="install-window__progress">
                    <span style={{ width: '100%' }} />
                  </div>
                  <div className="install-window__row">
                    <span>Download</span><span>275 MB</span>
                  </div>
                  <div className="install-window__row">
                    <span>Digest</span><span className="install-window__ok"><Check size={12} /> verified</span>
                  </div>
                  <div className="install-window__row">
                    <span>Desktop shortcut</span><span>enabled</span>
                  </div>
                  <div className="install-window__cta">
                    <span>Install &amp; play</span>
                    <Play size={13} />
                  </div>
                </div>
                <div className="install-window__glow" aria-hidden="true" />
              </div>
            </div>

            <div className="install-checks">
              {CHECKS.map((check) => (
                <span key={check}><Check size={13} /> {check}</span>
              ))}
            </div>
          </div>

          <aside className="install-side">
            <div className="install-side__card">
              <span className="mono-label">Three steps, one Tux</span>
              <ol className="install-steps">
                {STEPS.map((step, index) => (
                  <li key={step.title}>
                    <span className="install-steps__num">0{index + 1}</span>
                    <span className="install-steps__icon"><step.icon size={17} /></span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="install-side__note">
              <ShieldCheck size={18} />
              <p>
                <strong>No account. No telemetry. No extra launcher.</strong>
                SuperTux Remastered is free software. The installer only contacts GitHub
                for the release you asked it to download.
              </p>
            </div>
            <div className="install-side__system">
              <span className="mono-label">System requirements</span>
              <ul>
                <li><span>OS</span><span>{meta.name} 64-bit</span></li>
                <li><span>GPU</span><span>{meta.backend} capable</span></li>
                <li><span>RAM</span><span>6 GB minimum · 8 GB recommended</span></li>
                <li><span>Disk</span><span>~650 MB installed</span></li>
                <li><span>Input</span><span>Keyboard + gamepad</span></li>
              </ul>
              <div className="install-tested">
                <span className="status-dot" aria-hidden="true" />
                Tested on CachyOS · KDE Plasma · GTX 1660 SUPER
              </div>
            </div>
          </aside>
        </Reveal>

        <Reveal delay={100} className="install-advanced">
          <button
            type="button"
            className={cn('advanced-toggle', advanced && 'is-open')}
            aria-expanded={advanced}
            onClick={() => setAdvanced((value) => !value)}
          >
            <span><Terminal size={16} /> Prefer the command line?</span>
            <span className="advanced-toggle__meta">Same files. Full control. <ChevronDown size={15} /></span>
          </button>
          {advanced && <CliBlock platform={platform} />}
        </Reveal>
      </div>
    </section>
  )
}
