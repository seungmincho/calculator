'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import type { Site } from '@/utils/algorithm/voronoi'
import { computeNearestSiteMap, computeEdgeMap, REGION_COLORS } from '@/utils/algorithm/voronoi'

interface VoronoiCanvas2DProps {
  sites: Site[]
  revealedRows: number
  width?: number
  height?: number
  onAddSite?: (x: number, y: number) => void
}

const SCALE = 2  // downscale factor for performance

export default function VoronoiCanvas2D({
  sites,
  revealedRows,
  width = 600,
  height = 420,
  onAddSite,
}: VoronoiCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  // Dark mode observer
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!onAddSite) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * width
    const y = ((e.clientY - rect.top) / rect.height) * height
    onAddSite(x, y)
  }, [width, height, onAddSite])

  const handleTouch = useCallback((e: React.TouchEvent) => {
    if (!onAddSite) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const touch = e.changedTouches[0]
    const x = ((touch.clientX - rect.left) / rect.width) * width
    const y = ((touch.clientY - rect.top) / rect.height) * height
    onAddSite(x, y)
  }, [width, height, onAddSite])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = isDark ? '#1f2937' : '#f9fafb'
    ctx.fillRect(0, 0, width, height)

    if (sites.length === 0) return

    // Compute nearest map
    const nearestMap = computeNearestSiteMap(sites, width, height, SCALE)
    const edgeMap = computeEdgeMap(nearestMap, width, height, SCALE)
    const scaledW = Math.ceil(width / SCALE)
    const maxRow = Math.ceil(revealedRows / SCALE)

    // Draw colored regions
    for (let y = 0; y < maxRow && y < Math.ceil(height / SCALE); y++) {
      for (let x = 0; x < scaledW; x++) {
        const idx = y * scaledW + x
        const siteIdx = nearestMap[idx]
        const baseColor = REGION_COLORS[siteIdx % REGION_COLORS.length]

        if (edgeMap.has(idx)) {
          ctx.fillStyle = isDark ? '#4b5563' : '#374151'
        } else {
          // Parse hex and apply alpha for dark mode
          const r = parseInt(baseColor.slice(1, 3), 16)
          const g = parseInt(baseColor.slice(3, 5), 16)
          const b = parseInt(baseColor.slice(5, 7), 16)
          if (isDark) {
            ctx.fillStyle = `rgba(${Math.floor(r * 0.6)}, ${Math.floor(g * 0.6)}, ${Math.floor(b * 0.6)}, 0.7)`
          } else {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`
          }
        }
        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE)
      }
    }

    // Draw sweep line
    if (revealedRows < height) {
      ctx.save()
      ctx.strokeStyle = isDark ? '#f59e0b' : '#d97706'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(0, revealedRows)
      ctx.lineTo(width, revealedRows)
      ctx.stroke()
      ctx.restore()
    }

    // Draw sites
    for (const site of sites) {
      const color = REGION_COLORS[site.id % REGION_COLORS.length]

      // White outline
      ctx.save()
      ctx.fillStyle = isDark ? '#111827' : '#ffffff'
      ctx.beginPath()
      ctx.arc(site.x, site.y, 7, 0, Math.PI * 2)
      ctx.fill()

      // Colored fill
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(site.x, site.y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Label
      ctx.save()
      ctx.font = '10px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillStyle = isDark ? '#d1d5db' : '#374151'
      ctx.fillText(String(site.id), site.x, site.y - 9)
      ctx.restore()
    }
  }, [sites, revealedRows, width, height, isDark])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className="rounded-xl cursor-crosshair"
      onClick={handleClick}
      onTouchEnd={handleTouch}
    />
  )
}
