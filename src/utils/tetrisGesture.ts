export interface TetrisGesturePoint { pointerId: number; target: string; x: number; y: number; at: number; width: number }
export interface TetrisGestureToken { readonly epoch: number; readonly sequence: number; readonly pointerId: number; readonly target: string }
export type TetrisGestureAction = Readonly<{ type: 'move'; direction: -1 | 1; count: number } | { type: 'soft'; count: number } | { type: 'rotate' | 'hard' | 'hold' }>
interface GestureState { token: TetrisGestureToken; x0: number; y0: number; x: number; y: number; at: number; lastAt: number; moved: boolean }
const validPoint = (point: TetrisGesturePoint) => Number.isSafeInteger(point.pointerId) && point.pointerId >= 0 && typeof point.target === 'string' && point.target.length > 0 && point.target.length <= 128 &&
  [point.x, point.y, point.at, point.width].every(Number.isFinite) && point.width > 0
const none = Object.freeze([]) as readonly TetrisGestureAction[]

/** Returns bounded action plans. The caller alone invokes the unchanged game engine. */
export function createTetrisGesture(columns: number, rows: number) {
  if (!Number.isSafeInteger(columns) || !Number.isSafeInteger(rows) || columns < 1 || rows < 1 || columns > 1000 || rows > 1000) throw new RangeError('Invalid board dimensions')
  let epoch = 0, sequence = 0, enabled = false, state: GestureState | null = null
  const owns = (token: TetrisGestureToken, point?: TetrisGesturePoint) => !!state && state.token === token && token.epoch === epoch && enabled &&
    (!point || token.pointerId === point.pointerId && token.target === point.target)
  return {
    reset(nextEpoch: number, active: boolean): boolean {
      if (!Number.isSafeInteger(nextEpoch) || nextEpoch <= epoch) return false
      epoch = nextEpoch; enabled = active; state = null; return true
    },
    getToken(): TetrisGestureToken | null { return state?.token ?? null },
    begin(point: TetrisGesturePoint, expectedEpoch = epoch): TetrisGestureToken | null {
      if (!enabled || expectedEpoch !== epoch || state || !validPoint(point)) return null
      const token = Object.freeze({ epoch, sequence: ++sequence, pointerId: point.pointerId, target: point.target })
      state = { token, x0: point.x, y0: point.y, x: point.x, y: point.y, at: point.at, lastAt: point.at, moved: false }
      return token
    },
    move(token: TetrisGestureToken, point: TetrisGesturePoint): readonly TetrisGestureAction[] {
      if (!owns(token, point)) return none
      const s = state!
      const cell = point.width / columns, downCell = cell * 1.2, dx = point.x - s.x, dy = point.y - s.y
      if (!validPoint(point) || point.at < s.lastAt || ![cell, downCell, dx, dy, dx / cell, dy / downCell].every(Number.isFinite) || cell <= 0 || downCell <= 0) { state = null; return none }
      const horizontal = Math.trunc(dx / cell), down = Math.max(0, Math.floor(dy / downCell))
      const plan: TetrisGestureAction[] = []
      if (horizontal !== 0) {
        plan.push(Object.freeze({ type: 'move', direction: horizontal < 0 ? -1 : 1, count: Math.min(Math.abs(horizontal), columns) }))
        s.x = point.x - dx % cell; s.moved = true
      }
      if (down > 0) {
        plan.push(Object.freeze({ type: 'soft', count: Math.min(down, rows) }))
        s.y = point.y - dy % downCell; s.moved = true
      }
      s.lastAt = point.at
      return Object.freeze(plan)
    },
    end(token: TetrisGestureToken, point: TetrisGesturePoint): readonly TetrisGestureAction[] {
      if (!owns(token, point)) return none
      const s = state!; state = null
      const dx = point.x - s.x0, dy = point.y - s.y0, dt = point.at - s.at
      if (!validPoint(point) || point.at < s.lastAt || ![dx, dy, dt].every(Number.isFinite) || dt < 0) return none
      if (!s.moved && Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 350) return Object.freeze([Object.freeze({ type: 'rotate' })])
      if (dt < 300 && dy > 50 && dy > Math.abs(dx) * 1.5) return Object.freeze([Object.freeze({ type: 'hard' })])
      if (dt < 300 && dy < -50 && -dy > Math.abs(dx) * 1.5) return Object.freeze([Object.freeze({ type: 'hold' })])
      return none
    },
    cancel(token: TetrisGestureToken, pointerId = token.pointerId, target = token.target): boolean {
      if (!owns(token) || pointerId !== token.pointerId || target !== token.target) return false
      state = null; return true
    },
  }
}
