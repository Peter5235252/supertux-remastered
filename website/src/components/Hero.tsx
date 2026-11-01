import { useState } from 'react'
import { ArrowDown, ArrowRight, Check, Copy, Download, Play, Smartphone, Sparkles, Usb } from 'lucide-react'
import { useCopy, usePlatform } from '../hooks'
import { asset, detectAndroid, detectArch } from '../lib'
import { PLATFORM_META, RELEASE, RELEASES_URL } from '../data'
import { PlatformGlyph } from './ui'
import { Snowfall } from './Snowfall'

const STATS = [
  { value: '110', label: 'hand-built levels' },
  { value: '73', label: 'original tracks' },
  { value: '3', label: 'native GPU backends' },
  { value: '0', label: 'translation layers' },
]

const ANDROID_APKS = [
  { label: 'ARM64 · most phones', filename: 'SuperTux-Android-arm64-v8a.apk', href: RELEASE.androidArm64 },
  { label: 'ARMv7 · 32-bit phones', filename: 'SuperTux-Android-armeabi-v7a.apk', href: RELEASE.androidArmv7 },
  { label: 'x86_64 · emulators', filename: 'SuperTux-Android-x86_64.apk', href: RELEASE.androidX64 },
  { label: 'x86 · legacy emulators', filename: 'SuperTux-Android-x86.apk', href: RELEASE.androidX86 },
]

const ADB_INSTALL_COMMAND = 'adb install -r SuperTux-Android-arm64-v8a.apk'

export function Hero() {
  const platform = usePlatform()
  const meta = PLATFORM_META[platform]
  const arch = detectArch()
  const isAndroid = detectAndroid()
  const [showAndroidInstall, setShowAndroidInstall] = useState(false)
  const { copied, copy } = useCopy()

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
            Vulkan on Linux and Android. Direct3D 12 on Windows. Metal on macOS.
            <br className="hero__br" /> Original artwork. Zero translation layers.
          </p>

          <div className="hero__actions">
            {isAndroid ? (
              <a href={RELEASE.androidArm64} className="button button--primary button--hero">
                <Download size={18} />
                Download Android APK
                <span className="button__arrow"><ArrowRight size={17} /></span>
              </a>
            ) : (
              <a href="#install" className="button button--primary button--hero">
                <Download size={18} />
                Install for {meta.short}
                <span className="button__arrow"><ArrowRight size={17} /></span>
              </a>
            )}
            <button
              type="button"
              className="button button--glass button--hero"
              aria-expanded={showAndroidInstall}
              aria-controls="android-usb-install"
              onClick={() => setShowAndroidInstall((open) => !open)}
            >
              <Usb size={16} />
              {showAndroidInstall ? 'Hide Android install steps' : 'Install over USB debugging'}
            </button>
            <a href="wasm/supertux2.html" className="button button--glass button--hero">
              <Play size={16} />
              Play in Browser (WebGL 2)
            </a>
            <a href="#worlds" className="button button--glass button--hero">
              Explore the worlds
              <ArrowDown size={16} />
            </a>
          </div>

          {showAndroidInstall && (
            <section className="hero__usb-panel" id="android-usb-install" aria-label="Install SuperTux on Android over USB">
              <div className="hero__usb-panel-head">
                <div>
                  <span className="mono-label">Android · SDL_GPU / Vulkan</span>
                  <h3>Install through USB debugging</h3>
                </div>
                <a href={RELEASES_URL} target="_blank" rel="noreferrer">All Android builds <ArrowRight size={14} /></a>
              </div>
              <p className="hero__usb-panel-intro">
                Download the APK for your device, connect your phone by USB, then install it with Android Debug Bridge (ADB).
              </p>
              <div className="hero__usb-downloads">
                {ANDROID_APKS.map((apk) => (
                  <a href={apk.href} key={apk.filename}>
                    <Download size={14} />
                    <span>{apk.label}</span>
                  </a>
                ))}
              </div>
              <ol className="hero__usb-steps">
                <li>Enable Developer options and USB debugging on your Android phone.</li>
                <li>Connect it to this computer, unlock the phone, and approve the USB debugging prompt.</li>
                <li>Download the matching APK. In a terminal opened in the download folder, run:</li>
              </ol>
              <div className="hero__usb-command">
                <code>{ADB_INSTALL_COMMAND}</code>
                <button type="button" onClick={() => copy(ADB_INSTALL_COMMAND)} aria-label="Copy ADB install command">
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="hero__usb-note">
                This uses ADB from your computer; browsers cannot run local ADB commands themselves. Install
                <a href="https://developer.android.com/tools/releases/platform-tools" target="_blank" rel="noreferrer"> Android Platform Tools</a>
                first. The ARM64 download is the default for most current phones; the other APKs cover 32-bit devices and emulators.
              </p>
            </section>
          )}

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
              {isAndroid ? <Smartphone size={21} /> : <PlatformGlyph platform={platform} />}
            </span>
            <div>
              <strong>{isAndroid ? 'Android' : meta.name}</strong>
              <span>{isAndroid ? 'SDL_GPU · Vulkan' : `${arch} · ${meta.backend}`}</span>
            </div>
          </div>
          <div className="system-card__pipe" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <a href={isAndroid ? RELEASE.androidArm64 : '#install'} className="system-card__link">
            {isAndroid ? 'Download Android APK' : `Get the ${meta.short} build`}
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
