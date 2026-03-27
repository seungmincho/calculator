// Voronoi Diagram — Brute-force nearest-site coloring with sweep animation
// Pure functions, no side effects, TypeScript strict

export interface Site {
  x: number
  y: number
  id: number
}

export interface VoronoiStep {
  sites: Site[]
  sweepY: number             // current sweep line Y position
  revealedRows: number       // how many rows have been colored
  action: 'add-site' | 'sweep' | 'done'
  description: string
}

export interface VoronoiResult {
  steps: VoronoiStep[]
  sites: Site[]
}

/** Generate sweep steps — each step reveals more rows */
export function buildVoronoiSweep(
  sites: Site[],
  width: number,
  height: number,
  rowsPerStep: number = 8
): VoronoiResult {
  const steps: VoronoiStep[] = []

  // Initial step showing sites
  steps.push({
    sites: [...sites],
    sweepY: 0,
    revealedRows: 0,
    action: 'add-site',
    description: `${sites.length} sites placed`,
  })

  // Sweep from top to bottom
  for (let row = rowsPerStep; row <= height; row += rowsPerStep) {
    steps.push({
      sites: [...sites],
      sweepY: row,
      revealedRows: row,
      action: 'sweep',
      description: `Sweep line at y=${row}`,
    })
  }

  // Final step
  steps.push({
    sites: [...sites],
    sweepY: height,
    revealedRows: height,
    action: 'done',
    description: 'Voronoi diagram complete',
  })

  return { steps, sites }
}

/** For each pixel, find nearest site index. Returns flat Uint16Array [width * height] */
export function computeNearestSiteMap(
  sites: Site[],
  width: number,
  height: number,
  scale: number = 1
): Uint16Array {
  const w = Math.ceil(width / scale)
  const h = Math.ceil(height / scale)
  const map = new Uint16Array(w * h)
  for (let y = 0; y < h; y++) {
    const py = y * scale
    for (let x = 0; x < w; x++) {
      const px = x * scale
      let minDist = Infinity
      let minIdx = 0
      for (let s = 0; s < sites.length; s++) {
        const dx = px - sites[s].x
        const dy = py - sites[s].y
        const d = dx * dx + dy * dy
        if (d < minDist) {
          minDist = d
          minIdx = s
        }
      }
      map[y * w + x] = minIdx
    }
  }
  return map
}

/** Compute Voronoi edge pixels (where nearest site changes) */
export function computeEdgeMap(
  nearestMap: Uint16Array,
  width: number,
  height: number,
  scale: number = 1
): Set<number> {
  const w = Math.ceil(width / scale)
  const h = Math.ceil(height / scale)
  const edges = new Set<number>()
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      const cur = nearestMap[idx]
      // Check right and bottom neighbors
      if (x + 1 < w && nearestMap[idx + 1] !== cur) edges.add(idx)
      if (y + 1 < h && nearestMap[(y + 1) * w + x] !== cur) edges.add(idx)
      if (x + 1 < w && y + 1 < h && nearestMap[(y + 1) * w + x + 1] !== cur) edges.add(idx)
    }
  }
  return edges
}

export function generateRandomSites(count: number, width: number, height: number, margin = 30): Site[] {
  const w = width - margin * 2
  const h = height - margin * 2
  return Array.from({ length: count }, (_, i) => ({
    x: margin + Math.random() * w,
    y: margin + Math.random() * h,
    id: i,
  }))
}

export function generateGridSites(count: number, width: number, height: number): Site[] {
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  const sites: Site[] = []
  const marginX = width * 0.1
  const marginY = height * 0.1
  const gapX = (width - 2 * marginX) / Math.max(cols - 1, 1)
  const gapY = (height - 2 * marginY) / Math.max(rows - 1, 1)
  let id = 0
  for (let r = 0; r < rows && id < count; r++) {
    for (let c = 0; c < cols && id < count; c++) {
      sites.push({
        x: marginX + c * gapX + (Math.random() - 0.5) * gapX * 0.4,
        y: marginY + r * gapY + (Math.random() - 0.5) * gapY * 0.4,
        id: id++,
      })
    }
  }
  return sites
}

/** Pastel color palette for regions */
export const REGION_COLORS = [
  '#93c5fd', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd',
  '#67e8f9', '#fdba74', '#f9a8d4', '#a3e635', '#fbbf24',
  '#818cf8', '#34d399', '#fb923c', '#e879f9', '#2dd4bf',
  '#a78bfa', '#4ade80', '#f87171', '#38bdf8', '#facc15',
  '#c084fc', '#6ee7b7', '#fb7185', '#22d3ee', '#fde047',
]
