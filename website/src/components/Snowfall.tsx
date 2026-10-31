import { useEffect, useRef } from 'react'

type Flake = {
  x: number
  y: number
  radius: number
  speed: number
  drift: number
  phase: number
  alpha: number
  star: boolean
}

export function Snowfall({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let dpr = 1
    let flakes: Flake[] = []
    let frame = 0
    let running = true

    const makeFlake = (initial = false): Flake => {
      const star = Math.random() > 0.72
      return {
        x: Math.random() * width,
        y: initial ? Math.random() * height : -20 - Math.random() * 80,
        radius: star ? 3 + Math.random() * 4 : 0.7 + Math.random() * 1.8,
        speed: 0.15 + Math.random() * 0.55,
        drift: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.25 + Math.random() * 0.6,
        star,
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(150, Math.round((width * height) / 14000))
      flakes = Array.from({ length: count }, () => makeFlake(true))
    }

    const drawStar = (flake: Flake) => {
      context.save()
      context.translate(flake.x, flake.y)
      context.rotate(flake.phase)
      context.strokeStyle = `rgba(214, 244, 255, ${flake.alpha})`
      context.lineWidth = 0.8
      context.beginPath()
      for (let arm = 0; arm < 6; arm += 1) {
        const angle = (arm * Math.PI) / 3
        const dx = Math.cos(angle) * flake.radius
        const dy = Math.sin(angle) * flake.radius
        context.moveTo(0, 0)
        context.lineTo(dx, dy)
        context.moveTo(dx * 0.55, dy * 0.55)
        context.lineTo(
          dx * 0.55 + Math.cos(angle + 0.9) * flake.radius * 0.3,
          dy * 0.55 + Math.sin(angle + 0.9) * flake.radius * 0.3,
        )
        context.moveTo(dx * 0.55, dy * 0.55)
        context.lineTo(
          dx * 0.55 + Math.cos(angle - 0.9) * flake.radius * 0.3,
          dy * 0.55 + Math.sin(angle - 0.9) * flake.radius * 0.3,
        )
      }
      context.stroke()
      context.restore()
    }

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height)
      const seconds = time / 1000
      for (const flake of flakes) {
        if (!reduced) {
          flake.y += flake.speed
          flake.x += flake.drift + Math.sin(seconds * 0.5 + flake.phase) * 0.16
          if (flake.y > height + 12) {
            const replacement = makeFlake()
            Object.assign(flake, replacement)
          }
          if (flake.x < -20) flake.x = width + 20
          if (flake.x > width + 20) flake.x = -20
        }
        if (flake.star) {
          drawStar(flake)
        } else {
          context.beginPath()
          context.fillStyle = `rgba(225, 247, 255, ${flake.alpha})`
          context.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2)
          context.fill()
        }
      }
      if (running && !reduced) frame = window.requestAnimationFrame(draw)
    }

    resize()
    frame = window.requestAnimationFrame(draw)

    const onResize = () => {
      resize()
      if (reduced) draw(0)
    }
    window.addEventListener('resize', onResize)

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting)
      if (visible && !running) {
        running = true
        frame = window.requestAnimationFrame(draw)
      } else if (!visible) {
        running = false
        window.cancelAnimationFrame(frame)
      }
    })
    observer.observe(canvas)

    return () => {
      running = false
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
