// Raycasting engine — Wolfenstein-style 2.5D rendering
// Pure functions, no side effects, TypeScript strict

export interface Player {
  x: number
  y: number
  angle: number  // radians
}

export interface RayHit {
  distance: number
  wallX: number       // where on the wall the ray hit (0..1)
  side: 'vertical' | 'horizontal'
  mapX: number
  mapY: number
  rayAngle: number
}

export interface RaycastStep {
  player: Player
  rays: RayHit[]
  currentColumn: number
  action: 'cast-ray' | 'render-column' | 'frame-complete'
  description: string
}

export interface RaycastResult {
  steps: RaycastStep[]
}

export const DEFAULT_MAP: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,1,0,0,0,0,0,1,1,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,0,1,1,0,0,0,0,0,1,1,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
]

export const DEFAULT_PLAYER: Player = {
  x: 3.5,
  y: 2.5,
  angle: 0,
}

export const FOV = Math.PI / 3  // 60 degrees

/** Cast a single ray using DDA algorithm */
export function castRay(
  map: number[][],
  px: number,
  py: number,
  angle: number,
  maxDist: number = 20
): RayHit {
  const mapH = map.length
  const mapW = map[0].length

  const dirX = Math.cos(angle)
  const dirY = Math.sin(angle)

  // DDA setup
  let mapX = Math.floor(px)
  let mapY = Math.floor(py)

  const deltaDistX = Math.abs(1 / (dirX || 1e-10))
  const deltaDistY = Math.abs(1 / (dirY || 1e-10))

  let stepX: number, stepY: number
  let sideDistX: number, sideDistY: number

  if (dirX < 0) {
    stepX = -1
    sideDistX = (px - mapX) * deltaDistX
  } else {
    stepX = 1
    sideDistX = (mapX + 1 - px) * deltaDistX
  }

  if (dirY < 0) {
    stepY = -1
    sideDistY = (py - mapY) * deltaDistY
  } else {
    stepY = 1
    sideDistY = (mapY + 1 - py) * deltaDistY
  }

  let side: 'vertical' | 'horizontal' = 'vertical'
  let dist = 0

  // DDA loop
  for (let i = 0; i < 200; i++) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX
      mapX += stepX
      side = 'vertical'
    } else {
      sideDistY += deltaDistY
      mapY += stepY
      side = 'horizontal'
    }

    if (mapX < 0 || mapX >= mapW || mapY < 0 || mapY >= mapH) break
    if (map[mapY][mapX] > 0) break
  }

  if (side === 'vertical') {
    dist = (mapX - px + (1 - stepX) / 2) / (dirX || 1e-10)
  } else {
    dist = (mapY - py + (1 - stepY) / 2) / (dirY || 1e-10)
  }

  if (dist < 0) dist = maxDist

  // Calculate wallX
  let wallX: number
  if (side === 'vertical') {
    wallX = py + dist * dirY
  } else {
    wallX = px + dist * dirX
  }
  wallX = wallX - Math.floor(wallX)

  return {
    distance: Math.min(dist, maxDist),
    wallX,
    side,
    mapX,
    mapY,
    rayAngle: angle,
  }
}

/** Cast all rays for a frame */
export function castAllRays(
  map: number[][],
  player: Player,
  numColumns: number
): RayHit[] {
  const rays: RayHit[] = []
  for (let col = 0; col < numColumns; col++) {
    const rayAngle = player.angle - FOV / 2 + (col / numColumns) * FOV
    const hit = castRay(map, player.x, player.y, rayAngle)
    // Fix fisheye: multiply by cos of angle difference
    hit.distance *= Math.cos(rayAngle - player.angle)
    rays.push(hit)
  }
  return rays
}

/** Generate step-by-step raycasting for column-by-column visualization */
export function generateRaycastSteps(
  map: number[][],
  player: Player,
  numColumns: number,
  columnsPerStep: number = 4
): RaycastResult {
  const steps: RaycastStep[] = []
  const allRays: RayHit[] = []

  for (let col = 0; col < numColumns; col++) {
    const rayAngle = player.angle - FOV / 2 + (col / numColumns) * FOV
    const hit = castRay(map, player.x, player.y, rayAngle)
    hit.distance *= Math.cos(rayAngle - player.angle)
    allRays.push(hit)

    if ((col + 1) % columnsPerStep === 0 || col === numColumns - 1) {
      steps.push({
        player: { ...player },
        rays: [...allRays],
        currentColumn: col,
        action: 'cast-ray',
        description: `Cast rays 0..${col}`,
      })
    }
  }

  steps.push({
    player: { ...player },
    rays: [...allRays],
    currentColumn: numColumns - 1,
    action: 'frame-complete',
    description: `Frame complete — ${numColumns} columns rendered`,
  })

  return { steps }
}

/** Move player with collision detection */
export function movePlayer(
  player: Player,
  map: number[][],
  forward: number,
  strafe: number,
  rotate: number,
  moveSpeed: number = 0.1,
  rotSpeed: number = 0.05
): Player {
  const newAngle = player.angle + rotate * rotSpeed
  const dx = Math.cos(player.angle) * forward * moveSpeed + Math.cos(player.angle + Math.PI / 2) * strafe * moveSpeed
  const dy = Math.sin(player.angle) * forward * moveSpeed + Math.sin(player.angle + Math.PI / 2) * strafe * moveSpeed

  let newX = player.x + dx
  let newY = player.y + dy

  const margin = 0.2

  // Collision detection
  const mapH = map.length
  const mapW = map[0].length

  if (newX - margin < 0 || newX + margin >= mapW || map[Math.floor(player.y)][Math.floor(newX + (dx > 0 ? margin : -margin))] > 0) {
    newX = player.x
  }
  if (newY - margin < 0 || newY + margin >= mapH || map[Math.floor(newY + (dy > 0 ? margin : -margin))][Math.floor(player.x)] > 0) {
    newY = player.y
  }

  return { x: newX, y: newY, angle: newAngle }
}

/** Toggle wall on/off */
export function toggleWall(map: number[][], x: number, y: number): number[][] {
  const newMap = map.map(row => [...row])
  if (x >= 0 && x < newMap[0].length && y >= 0 && y < newMap.length) {
    newMap[y][x] = newMap[y][x] > 0 ? 0 : 1
  }
  return newMap
}
