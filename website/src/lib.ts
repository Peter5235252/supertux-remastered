import type { Platform } from './data'

export const asset = (path: string) => {
  if (/^(https?:)?\/\//.test(path)) return path
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')

export function detectAndroid(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
}

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'linux'
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
  const raw = `${uaData?.platform ?? ''} ${navigator.userAgent} ${navigator.platform}`.toLowerCase()
  if (raw.includes('win')) return 'windows'
  if (raw.includes('mac') || raw.includes('iphone') || raw.includes('ipad')) return 'macos'
  return 'linux'
}

export function detectArch(): string {
  if (typeof navigator === 'undefined') return 'x86_64'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('aarch64') || ua.includes('arm64')) return 'arm64'
  return 'x86_64'
}

export const isMac = (platform: Platform) => platform === 'macos'
