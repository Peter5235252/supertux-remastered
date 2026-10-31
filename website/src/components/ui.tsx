import type { CSSProperties, ReactNode } from 'react'
import { useReveal } from '../hooks'
import { cn } from '../lib'
import type { Platform } from '../data'

export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'article' | 'li' | 'span'
}) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  return (
    <Tag
      ref={ref as never}
      className={cn('reveal', visible && 'is-visible', className)}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  )
}

export function SectionHeading({
  kicker,
  title,
  lede,
  align = 'left',
  className,
}: {
  kicker: string
  title: ReactNode
  lede?: ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <div className={cn('section-heading', align === 'center' && 'is-center', className)}>
      <Reveal>
        <div className="kicker">
          <span className="kicker__spark" aria-hidden="true" />
          {kicker}
        </div>
      </Reveal>
      <Reveal delay={80}>
        <h2 className="section-heading__title">{title}</h2>
      </Reveal>
      {lede && (
        <Reveal delay={160}>
          <p className="section-heading__lede">{lede}</p>
        </Reveal>
      )}
    </div>
  )
}

export function PlatformGlyph({ platform, className }: { platform: Platform; className?: string }) {
  if (platform === 'windows') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
        <path d="M3 5.5 10.5 4.4v7.1H3V5.5Zm9.1-1.3L21 3v8.5h-8.9V4.2ZM3 12.5h7.5v7.1L3 18.5v-6Zm9.1 0H21V21l-8.9-1.2v-7.3Z" />
      </svg>
    )
  }
  if (platform === 'macos') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
        <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.8-.4 6.9 1.1 9.1.8 1.1 1.7 2.3 2.9 2.2 1.2-.1 1.6-.8 3.1-.8 1.5 0 1.9.8 3.2.7 1.3 0 2.1-1.1 2.9-2.1.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.9-1.1-3-4.3ZM14.2 5.6c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3Z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 2.7c-1.1 0-2 .9-2 2 0 .5.2 1 .5 1.3-.9 1-1.6 2.2-2 3.6L10.2 8c.5-.7 1.1-1.1 1.8-1.1s1.3.4 1.8 1.1l1.7 1.6c-.4-1.4-1.1-2.6-2-3.6.3-.3.5-.8.5-1.3 0-1.1-.9-2-2-2Zm-4 9.1c-1.8.4-3.1 2-3.1 3.9 0 .9.3 1.7.8 2.4.3-.5.7-1 1.2-1.4l1.9-1.8c-.4-.9-.7-2-.8-3.1Zm8 0c-.1 1.1-.4 2.2-.8 3.1l1.9 1.8c.5.4.9.9 1.2 1.4.5-.7.8-1.5.8-2.4 0-1.9-1.3-3.5-3.1-3.9ZM12 8.7c-1 0-1.8.6-2.4 1.4l-3.3 4.7c-.8 1.2-1.2 2.5-1.2 3.5 0 1.1.8 2 1.9 2 .8 0 1.6-.5 2.2-1.3.7-.9 1.6-1.5 2.8-1.5s2.1.6 2.8 1.5c.6.8 1.4 1.3 2.2 1.3 1.1 0 1.9-.9 1.9-2 0-1-.4-2.3-1.2-3.5l-3.3-4.7C13.8 9.3 13 8.7 12 8.7Z" />
    </svg>
  )
}

export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={className}>
      {children}
    </a>
  )
}
