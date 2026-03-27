'use client'
import { useRef, useEffect, useState } from 'react'
import type { Player, RayHit } from '@/utils/algorithm/raycasting'
import { FOV } from '@/utils/algorithm/raycasting'

interface RaycastingCanvas2DProps {
  map: number[][]
  player: Player
  rays: RayHit[]
  width?: number
  height?: number
  onMapClick?: (x: number, y: number) => void
  showMinimap?: boolean
}

const WALL_COLORS = {
  vertLight: '#60a5fa',
  vertDark: '#3b82f6',
  horizLight: '#818cf8',
  horizDark: '#6366f1',
}

export default function RaycastingCanvas2D({
  map,
  player,
  rays,
  width = 600,
  height = 420,
  onMapClick,
  showMinimap = true,
}: RaycastingCanvas2DProps) {
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

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height / 2)
    if (isDark) {
      skyGrad.addColorStop(0, '#0f172a')
      skyGrad.addColorStop(1, '#1e293b')
    } else {
      skyGrad.addColorStop(0, '#7dd3fc')
      skyGrad.addColorStop(1, '#bae6fd')
    }
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, width, height / 2)

    // Floor gradient
    const floorGrad = ctx.createLinearGradient(0, height / 2, 0, height)
    if (isDark) {
      floorGrad.addColorStop(0, '#374151')
      floorGrad.addColorStop(1, '#1f2937')
    } else {
      floorGrad.addColorStop(0, '#6b7280')
      floorGrad.addColorStop(1, '#374151')
    }
    ctx.fillStyle = floorGrad
    ctx.fillRect(0, height / 2, width, height / 2)

    // Draw 3D view (columns)
    if (rays.length > 0) {
      const colWidth = width / rays.length

      for (let i = 0; i < rays.length; i++) {
        const ray = rays[i]
        const wallHeight = Math.min(height, height / Math.max(ray.distance, 0.1))
        const wallTop = (height - wallHeight) / 2

        // Color based on side + distance shading
        const shade = Math.max(0.3, 1 - ray.distance / 12)
        let r: number, g: number, b: number

        if (ray.side === 'vertical') {
          r = isDark ? Math.floor(59 * shade) : Math.floor(96 * shade)
          g = isDark ? Math.floor(130 * shade) : Math.floor(165 * shade)
          b = isDark ? Math.floor(246 * shade) : Math.floor(250 * shade)
        } else {
          r = isDark ? Math.floor(99 * shade * 0.8) : Math.floor(129 * shade * 0.8)
          g = isDark ? Math.floor(102 * shade * 0.8) : Math.floor(140 * shade * 0.8)
          b = isDark ? Math.floor(241 * shade * 0.8) : Math.floor(248 * shade * 0.8)
        }

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.fillRect(i * colWidth, wallTop, colWidth + 1, wallHeight)

        // Wall edge lines
        if (wallHeight > 20) {
          ctx.strokeStyle = `rgba(0,0,0,${0.1 * shade})`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(i * colWidth, wallTop)
          ctx.lineTo(i * colWidth + colWidth, wallTop)
          ctx.moveTo(i * colWidth, wallTop + wallHeight)
          ctx.lineTo(i * colWidth + colWidth, wallTop + wallHeight)
          ctx.stroke()
        }
      }
    }

    // Draw minimap
    if (showMinimap) {
      const mapRows = map.length
      const mapCols = map[0].length
      const minimapSize = Math.min(width * 0.28, height * 0.35)
      const cellSize = minimapSize / Math.max(mapRows, mapCols)
      const mx = width - minimapSize - 10
      const my = 10

      // Background
      ctx.save()
      ctx.globalAlpha = 0.85
      ctx.fillStyle = isDark ? '#111827' : '#ffffff'
      ctx.strokeStyle = isDark ? '#4b5563' : '#d1d5db'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(mx - 5, my - 5, minimapSize + 10, minimapSize + 10, 8)
      ctx.fill()
      ctx.stroke()
      ctx.globalAlpha = 1

      // Walls
      for (let r = 0; r < mapRows; r++) {
        for (let c = 0; c < mapCols; c++) {
          if (map[r][c] > 0) {
            ctx.fillStyle = isDark ? '#6366f1' : '#818cf8'
          } else {
            ctx.fillStyle = isDark ? '#1f2937' : '#f3f4f6'
          }
          ctx.fillRect(mx + c * cellSize, my + r * cellSize, cellSize - 0.5, cellSize - 0.5)
        }
      }

      // Player
      const px = mx + player.x * cellSize
      const py = my + player.y * cellSize

      // Draw rays on minimap
      if (rays.length > 0) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.15)'
        ctx.lineWidth = 0.5
        for (const ray of rays) {
          const endX = player.x + Math.cos(ray.rayAngle) * ray.distance
          const endY = player.y + Math.sin(ray.rayAngle) * ray.distance
          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.lineTo(mx + endX * cellSize, my + endY * cellSize)
          ctx.stroke()
        }
      }

      // Player dot and direction
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px + Math.cos(player.angle) * 10, py + Math.sin(player.angle) * 10)
      ctx.stroke()

      // FOV cone
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px + Math.cos(player.angle - FOV / 2) * 15, py + Math.sin(player.angle - FOV / 2) * 15)
      ctx.moveTo(px, py)
      ctx.lineTo(px + Math.cos(player.angle + FOV / 2) * 15, py + Math.sin(player.angle + FOV / 2) * 15)
      ctx.stroke()

      ctx.restore()
    }
  }, [map, player, rays, width, height, isDark, showMinimap])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className="rounded-xl"
    />
  )
}
