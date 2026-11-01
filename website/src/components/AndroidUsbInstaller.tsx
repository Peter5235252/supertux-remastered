import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, FileUp, Loader2, Smartphone, Usb, X } from 'lucide-react'
import { RELEASE, RELEASES_URL } from '../data'

type AdbClient = {
  getProp(name: string): Promise<string>
}

type AdbTransport = {
  close?: () => void | Promise<void>
}

type UsbDevice = {
  serial: string
  connect(): Promise<unknown>
}

type UsbManager = {
  requestDevice(): Promise<UsbDevice | undefined>
}

type PackageInstaller = {
  pushAndInstallStream(
    stream: ReadableStream<Uint8Array>,
    options?: Record<string, unknown>,
  ): Promise<void>
}

type BrowserAdbModules = {
  adb: {
    Adb: new (transport: AdbTransport) => AdbClient
    AdbDaemonTransport: {
      authenticate(options: {
        serial: string
        connection: unknown
        credentialStore: unknown
      }): Promise<AdbTransport>
    }
  }
  webusb: {
    AdbDaemonWebUsbDeviceManager: {
      BROWSER?: UsbManager
    }
  }
  credentials: {
    default: new (name?: string) => unknown
  }
  androidBin: {
    PackageManager: new (adb: AdbClient) => PackageInstaller
  }
}

type AndroidApk = {
  abi: string
  label: string
  filename: string
  url: string
}

const APK_BUILDS: AndroidApk[] = [
  {
    abi: 'arm64-v8a',
    label: 'ARM64',
    filename: 'SuperTux-Android-arm64-v8a.apk',
    url: RELEASE.androidArm64,
  },
  {
    abi: 'armeabi-v7a',
    label: 'ARMv7',
    filename: 'SuperTux-Android-armeabi-v7a.apk',
    url: RELEASE.androidArmv7,
  },
  {
    abi: 'x86_64',
    label: 'x86_64',
    filename: 'SuperTux-Android-x86_64.apk',
    url: RELEASE.androidX64,
  },
  {
    abi: 'x86',
    label: 'x86',
    filename: 'SuperTux-Android-x86.apk',
    url: RELEASE.androidX86,
  },
]

const CDN_MODULES = {
  adb: 'https://esm.sh/@yume-chan/adb@2.6.4?bundle',
  webusb: 'https://esm.sh/@yume-chan/adb-daemon-webusb@2.3.2?bundle',
  credentials: 'https://esm.sh/@yume-chan/adb-credential-web@2.1.0?bundle',
  androidBin: 'https://esm.sh/@yume-chan/android-bin@2.1.0?bundle',
}

function errorMessage(
  error: unknown,
  stage: 'modules' | 'connection' | 'download' | 'transfer' | 'install' = 'install',
): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/NotFoundError/i.test(message)) {
    return 'No USB device was selected. Connect your phone and try again.'
  }
  if (/DeviceBusyError|Unable to claim interface|claimed by another/i.test(message)) {
    return 'Another program is using the phone’s ADB interface. Close Android Studio, scrcpy, other ADB tools and other WebADB tabs, then reconnect.'
  }
  if (/unauthorized|authentication|auth.*failed/i.test(message)) {
    return 'ADB authorization was not completed. Unlock your phone and approve the USB debugging fingerprint prompt.'
  }
  if (/Failed to fetch|Load failed|NetworkError/i.test(message)) {
    if (stage === 'download') {
      return 'The APK download failed. Use the direct APK download link and select the file from this computer instead.'
    }
    if (stage === 'modules') {
      return 'The browser ADB libraries could not be loaded. Check the network connection and reload this page.'
    }
    if (stage === 'connection') {
      return 'The ADB USB connection failed or was interrupted. Reconnect the phone, unlock it, and approve the USB debugging prompt.'
    }
    if (stage === 'transfer') {
      return 'The USB connection was interrupted while sending the APK. Keep the phone connected and unlocked, close other ADB tools, reconnect, and retry.'
    }
    return 'The USB connection was interrupted while Android was installing the APK. Reconnect the phone and retry the installation.'
  }
  if (/INSTALL_FAILED_UPDATE_INCOMPATIBLE/i.test(message)) {
    return 'Android rejected this update because the installed app was signed with a different key. Uninstall the existing SuperTux app first, then install again.'
  }
  if (/INSTALL_FAILED_VERSION_DOWNGRADE/i.test(message)) {
    return 'The phone has a newer app version. Uninstall it first or use a newer APK.'
  }
  return message
}

function findCompatibleBuild(abiList: string): AndroidApk | undefined {
  const supported = abiList.split(',').map((abi) => abi.trim()).filter(Boolean)
  return supported
    .map((abi) => APK_BUILDS.find((build) => build.abi === abi))
    .find((build): build is AndroidApk => Boolean(build))
}

async function loadAdbModules(): Promise<BrowserAdbModules> {
  const load = (url: string) => import(/* @vite-ignore */ url) as Promise<Record<string, unknown>>
  const [adb, webusb, credentials, androidBin] = await Promise.all([
    load(CDN_MODULES.adb),
    load(CDN_MODULES.webusb),
    load(CDN_MODULES.credentials),
    load(CDN_MODULES.androidBin),
  ])

  return {
    adb: {
      Adb: adb.Adb as BrowserAdbModules['adb']['Adb'],
      AdbDaemonTransport: adb.AdbDaemonTransport as BrowserAdbModules['adb']['AdbDaemonTransport'],
    },
    webusb: {
      AdbDaemonWebUsbDeviceManager:
        webusb.AdbDaemonWebUsbDeviceManager as BrowserAdbModules['webusb']['AdbDaemonWebUsbDeviceManager'],
    },
    credentials: {
      default: credentials.default as BrowserAdbModules['credentials']['default'],
    },
    androidBin: {
      PackageManager: androidBin.PackageManager as BrowserAdbModules['androidBin']['PackageManager'],
    },
  }
}

async function readResponseAsFile(
  response: Response,
  filename: string,
  onProgress: (value: number) => void,
): Promise<File> {
  if (!response.ok) {
    throw new Error(`APK download failed (HTTP ${response.status}). The Android build may not have been published yet.`)
  }

  const total = Number(response.headers.get('content-length')) || 0
  if (!response.body) {
    const blob = await response.blob()
    if (!blob.size) throw new Error('The APK download was empty.')
    onProgress(100)
    return new File([blob], filename, { type: 'application/vnd.android.package-archive' })
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      chunks.push(value)
      loaded += value.byteLength
      if (total > 0) onProgress(Math.min(100, Math.round((loaded / total) * 100)))
    }
  } finally {
    reader.releaseLock()
  }

  if (!loaded) throw new Error('The APK download was empty.')
  onProgress(100)
  return new File(chunks, filename, { type: 'application/vnd.android.package-archive' })
}

export function AndroidUsbInstaller() {
  const adbRef = useRef<AdbClient | null>(null)
  const transportRef = useRef<AdbTransport | null>(null)
  const localFileRef = useRef<HTMLInputElement | null>(null)

  const [modules, setModules] = useState<BrowserAdbModules | null>(null)
  const [modulesError, setModulesError] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [androidVersion, setAndroidVersion] = useState('')
  const [abiList, setAbiList] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('Connect a phone with USB debugging enabled.')
  const [error, setError] = useState('')
  const [installed, setInstalled] = useState(false)

  const browserSupported =
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator !== 'undefined' &&
    'usb' in navigator

  useEffect(() => {
    if (!browserSupported) return
    let active = true
    setPhase('Preparing the browser ADB installer…')

    void loadAdbModules()
      .then((loaded) => {
        if (active) {
          setModules(loaded)
          setPhase('ADB is ready. Connect your Android phone over USB.')
        }
      })
      .catch((cause: unknown) => {
        if (active) setModulesError(errorMessage(cause, 'modules'))
      })

    return () => {
      active = false
    }
  }, [browserSupported])

  const compatibleBuild = findCompatibleBuild(abiList)
  const canInstall = Boolean(adbRef.current && (selectedFile || compatibleBuild) && !installing)

  async function connectDevice() {
    const activeModules = modules
    if (!activeModules) {
      setError(modulesError || 'The browser ADB client is still loading. Try again in a moment.')
      return
    }

    setConnecting(true)
    setError('')
    setInstalled(false)

    try {
      const manager = activeModules.webusb.AdbDaemonWebUsbDeviceManager.BROWSER
      if (!manager) {
        throw new Error('WebUSB is unavailable. Open this page over HTTPS in desktop Chrome or Microsoft Edge.')
      }

      // Open the USB picker immediately during this click event. Awaiting a
      // network/module load first would lose WebUSB's required user activation.
      setPhase('Choose your Android phone in the USB device picker…')
      const deviceRequest = manager.requestDevice()
      const backend = await deviceRequest
      if (!backend) {
        setPhase('No device selected.')
        return
      }

      setPhase('Opening the ADB USB connection…')
      const connection = await backend.connect()

      setPhase('Waiting for USB debugging authorization on your phone…')
      const credentialStore = new activeModules.credentials.default('SuperTux Remastered')
      const transport = await activeModules.adb.AdbDaemonTransport.authenticate({
        serial: backend.serial,
        connection,
        credentialStore,
      })
      transportRef.current = transport

      const adb = new activeModules.adb.Adb(transport)
      adbRef.current = adb

      setPhase('Reading device information…')
      const [model, release, abi] = await Promise.all([
        adb.getProp('ro.product.model'),
        adb.getProp('ro.build.version.release'),
        adb.getProp('ro.product.cpu.abilist'),
      ])

      setDeviceName(model || 'Android device')
      setAndroidVersion(release ? `Android ${release}` : 'Android')
      setAbiList(abi || '')
      setPhase(
        abi
          ? `Connected. Compatible ABI detected: ${abi.split(',')[0]}.`
          : 'Connected, but the device did not report its supported CPU ABIs. Select an APK manually.',
      )
    } catch (cause) {
      adbRef.current = null
      transportRef.current = null
      setError(errorMessage(cause, 'connection'))
      setPhase('Connection failed.')
    } finally {
      setConnecting(false)
    }
  }

  async function disconnectDevice() {
    try {
      await transportRef.current?.close?.()
    } catch {
      // The device may already have been unplugged.
    }
    adbRef.current = null
    transportRef.current = null
    setDeviceName('')
    setAndroidVersion('')
    setAbiList('')
    setInstalled(false)
    setProgress(0)
    setPhase('Disconnected. Connect a phone to continue.')
  }

  async function installGame() {
    const adb = adbRef.current
    if (!adb) return

    setInstalling(true)
    setInstalled(false)
    setError('')
    setProgress(0)

    let failureStage: 'download' | 'transfer' | 'install' = selectedFile ? 'transfer' : 'download'

    try {
      let file = selectedFile
      if (!file) {
        if (!compatibleBuild) {
          throw new Error('No matching APK was found for this phone. Select the correct APK file manually.')
        }

        setPhase(`Downloading the ${compatibleBuild.label} APK…`)
        const response = await fetch(compatibleBuild.url, { cache: 'no-store' })
        file = await readResponseAsFile(response, compatibleBuild.filename, setProgress)
      }

      if (!file.name.toLowerCase().endsWith('.apk')) {
        throw new Error('Choose a valid .apk file.')
      }
      if (file.size === 0) {
        throw new Error('The selected APK file is empty.')
      }

      failureStage = 'transfer'
      setProgress(0)
      setPhase(`Sending ${file.name} to ${deviceName} over USB…`)
      const activeModules = modules
      if (!activeModules) throw new Error(modulesError || 'The browser ADB client has not loaded yet.')
      const PackageManager = activeModules.androidBin.PackageManager
      const packageManager = new PackageManager(adb)

      let uploaded = 0
      const stream = file.stream().pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            uploaded += chunk.byteLength
            setProgress(Math.min(99, Math.round((uploaded / file!.size) * 100)))
            controller.enqueue(chunk)
          },
          flush() {
            failureStage = 'install'
            setProgress(100)
            setPhase('APK transferred. Waiting for Android to finish installation…')
          },
        }),
      )

      // Use ADB sync followed by `pm install` instead of `cmd package install -S`.
      // This avoids depending on the device's streaming-install implementation.
      await packageManager.pushAndInstallStream(stream)
      setInstalled(true)
      setPhase('SuperTux Remastered was installed successfully.')
    } catch (cause) {
      setError(errorMessage(cause, failureStage))
      setPhase('Installation failed.')
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div className="hero__adb-installer">
      <div className="hero__adb-header">
        <div>
          <span className="mono-label">Direct USB · WebUSB + ADB</span>
          <h3>Install directly to your phone</h3>
          <p>No terminal or Android SDK needed. The browser communicates with your phone over USB. Android requirements: 4 GB RAM minimum; 8 GB recommended.</p>
        </div>
        <span className="hero__adb-icon"><Smartphone size={22} /></span>
      </div>

      {!browserSupported && (
        <div className="hero__adb-notice">
          <AlertCircle size={17} />
          <span>Direct USB installation needs a secure HTTPS page in desktop Chrome or Edge. Firefox and Safari do not support the required WebUSB API.</span>
        </div>
      )}

      {!deviceName ? (
        <button
          type="button"
          className="button button--primary hero__adb-connect"
          onClick={connectDevice}
          disabled={!browserSupported || !modules || connecting || installing}
        >
          {connecting ? <Loader2 size={17} className="hero__adb-spinner" /> : <Usb size={17} />}
          {connecting ? 'Connecting…' : !modules ? 'Loading USB installer…' : 'Connect Android phone'}
        </button>
      ) : (
        <div className="hero__adb-device">
          <div className="hero__adb-device-main">
            <span className="status-dot" />
            <div>
              <strong>{deviceName}</strong>
              <span>{androidVersion} · {abiList || 'ABI not reported'}</span>
            </div>
          </div>
          <button type="button" onClick={disconnectDevice} disabled={installing} aria-label="Disconnect phone">
            <X size={15} /> Disconnect
          </button>
        </div>
      )}

      {deviceName && (
        <>
          <div className="hero__adb-build">
            <div>
              <strong>{selectedFile ? 'Selected APK' : 'Detected APK build'}</strong>
              <span>
                {selectedFile
                  ? selectedFile.name
                  : compatibleBuild
                    ? `${compatibleBuild.label} · ${compatibleBuild.abi}`
                    : 'No matching APK detected'}
              </span>
            </div>
            {compatibleBuild && !selectedFile && (
              <a href={compatibleBuild.url} target="_blank" rel="noreferrer" aria-label="Download detected APK">
                <Download size={15} />
              </a>
            )}
          </div>

          <div className="hero__adb-actions">
            <button
              type="button"
              className="button button--primary hero__adb-install"
              onClick={installGame}
              disabled={!canInstall}
            >
              {installing ? <Loader2 size={17} className="hero__adb-spinner" /> : installed ? <CheckCircle2 size={17} /> : <Download size={17} />}
              {installing ? 'Installing…' : installed ? 'Installed' : 'Install SuperTux'}
            </button>
            <button
              type="button"
              className="button button--outline hero__adb-file"
              onClick={() => localFileRef.current?.click()}
              disabled={installing}
            >
              <FileUp size={16} />
              Choose APK
            </button>
            <input
              ref={localFileRef}
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              hidden
              onChange={(event) => {
                setSelectedFile(event.currentTarget.files?.[0] ?? null)
                setInstalled(false)
                setError('')
              }}
            />
          </div>

          {(installing || progress > 0) && (
            <div className="hero__adb-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <div style={{ width: `${progress}%` }} />
              <span>{progress}%</span>
            </div>
          )}
        </>
      )}

      <p className="hero__adb-status" aria-live="polite">{phase}</p>
      {modulesError && !modules && (
        <div className="hero__adb-error" role="alert">
          <AlertCircle size={16} />
          <span>Could not load the browser ADB client: {modulesError}</span>
        </div>
      )}
      {error && (
        <div className="hero__adb-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {installed && (
        <div className="hero__adb-success" role="status">
          <CheckCircle2 size={16} />
          <span>You can now launch SuperTux from your Android app drawer.</span>
        </div>
      )}

      <ol className="hero__adb-steps">
        <li>Enable Developer options and USB debugging on Android.</li>
        <li>Connect the unlocked phone and approve the RSA authorization prompt.</li>
        <li>Press <strong>Install SuperTux</strong>. The page selects the APK for the phone’s ABI.</li>
      </ol>

      <p className="hero__adb-footnote">
        USB traffic and the APK stay between this browser and your phone. The ADB libraries are loaded from esm.sh;
        no device data is uploaded to a SuperTux server. <a href={RELEASES_URL} target="_blank" rel="noreferrer">View release files</a>.
      </p>
    </div>
  )
}
