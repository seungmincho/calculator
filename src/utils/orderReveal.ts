import { shuffle } from './password.ts'

export type OrderRevealMode = 'auto' | 'manual'
export type OrderRevealPhase = 'idle' | 'shuffling' | 'revealing' | 'complete'
export interface OrderRevealSnapshot {
  readonly runId: number
  readonly phase: OrderRevealPhase
  readonly mode: OrderRevealMode
  readonly items: readonly string[]
  readonly revealedCount: number
  readonly active: boolean
}

export function isOrderBusy(state: OrderRevealSnapshot): boolean {
  return state.phase === 'shuffling' || state.phase === 'revealing'
}
export function canRevealNext(state: OrderRevealSnapshot): boolean {
  return state.active && state.mode === 'manual' && isOrderBusy(state)
}
export function canRevealAll(state: OrderRevealSnapshot): boolean {
  return state.active && (state.phase === 'revealing' || state.mode === 'manual' && state.phase === 'shuffling')
}
export function canExportOrder(state: OrderRevealSnapshot): boolean {
  return state.active && state.phase === 'complete' && state.items.length >= 2 && state.revealedCount === state.items.length
}

export interface OrderRevealPorts {
  shuffle?: (items: string[]) => string[]
  schedule?: (callback: () => void, delay: number) => unknown
  cancel?: (timer: unknown) => void
  onChange?: (snapshot: OrderRevealSnapshot) => void
}

/** A draw owns one permutation; each scheduled callback owns a distinct reservation. */
export function createOrderRevealController(ports: OrderRevealPorts = {}, active = true) {
  const schedule = ports.schedule ?? ((callback: () => void, delay: number) => setTimeout(callback, delay))
  const cancel = ports.cancel ?? (timer => clearTimeout(timer as ReturnType<typeof setTimeout>))
  let state: OrderRevealSnapshot = Object.freeze({ runId: 0, phase: 'idle', mode: 'auto', items: Object.freeze([]), revealedCount: 0, active })
  let disposed = false, generation = 0
  type Reservation = { generation: number; timer?: unknown }
  let pending: Reservation | null = null
  const cancelPending = () => {
    generation++
    const previous = pending
    pending = null
    if (previous?.timer !== undefined) { try { cancel(previous.timer) } catch { /* Ownership still invalidates queued callbacks. */ } }
  }
  const publish = (next: OrderRevealSnapshot) => {
    state = Object.freeze(next)
    ports.onChange?.(state)
  }
  const queue = () => {
    if (disposed || pending || !state.active || state.mode !== 'auto' || !isOrderBusy(state)) return
    const reservation: Reservation = { generation }
    const expectedRun = state.runId, expectedPhase = state.phase
    pending = reservation
    const callback = () => {
      if (disposed || pending !== reservation || reservation.generation !== generation || !state.active || state.mode !== 'auto' || state.runId !== expectedRun || state.phase !== expectedPhase) return
      pending = null
      if (state.phase === 'shuffling') publish({ ...state, phase: 'revealing' })
      else {
        const count = state.revealedCount + 1
        publish({ ...state, revealedCount: count, phase: count === state.items.length ? 'complete' : 'revealing' })
      }
      queue() // Reentrant onChange may have paused/reset/disposed or already scheduled its own work.
    }
    reservation.timer = schedule(callback, expectedPhase === 'shuffling' ? 400 : 500)
    if (pending !== reservation) { try { cancel(reservation.timer) } catch { /* A synchronous scheduler may already have consumed it. */ } }
  }
  return {
    getSnapshot(): OrderRevealSnapshot { return state },
    start(items: readonly string[], expectedRun = state.runId): boolean {
      if (disposed || !state.active || expectedRun !== state.runId || isOrderBusy(state) || items.length < 2 || !items.every(item => typeof item === 'string')) return false
      const permutation = Object.freeze([...(ports.shuffle ?? shuffle)([...items])])
      cancelPending()
      publish({ ...state, runId: state.runId + 1, items: permutation, revealedCount: 0, phase: 'shuffling' })
      queue()
      return true
    },
    setMode(mode: OrderRevealMode): void {
      if (disposed || mode === state.mode || mode !== 'auto' && mode !== 'manual') return
      cancelPending()
      publish({ ...state, mode })
      queue()
    },
    revealNext(expectedRun = state.runId): boolean {
      if (disposed || expectedRun !== state.runId || !canRevealNext(state)) return false
      cancelPending()
      const count = state.revealedCount + 1
      publish({ ...state, revealedCount: count, phase: count === state.items.length ? 'complete' : 'revealing' })
      queue()
      return true
    },
    revealAll(expectedRun = state.runId): boolean {
      if (disposed || expectedRun !== state.runId || !canRevealAll(state)) return false
      cancelPending()
      publish({ ...state, revealedCount: state.items.length, phase: 'complete' })
      return true
    },
    reset(expectedRun = state.runId): boolean {
      if (disposed || expectedRun !== state.runId) return false
      cancelPending()
      publish({ ...state, runId: state.runId + 1, phase: 'idle', items: Object.freeze([]), revealedCount: 0 })
      return true
    },
    setActive(next: boolean): void {
      if (disposed || next === state.active) return
      cancelPending()
      publish({ ...state, active: next })
      queue()
    },
    /** Reversible setActive(false/true) is appropriate for effect replay and tool-tab changes. */
    dispose(): void { disposed = true; cancelPending(); state = Object.freeze({ ...state, active: false }) },
  }
}
