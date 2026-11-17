import type { Step } from './textConvert.ts'

/** Thirty reversible transitions in memory, plus the currently displayed step list. */
export const TEXT_PIPELINE_HISTORY_LIMIT = 30
export interface TextPipelineHistory {
  past: Step[][]
  present: Step[]
  future: Step[][]
}
export type TextPipelineAction =
  | { type: 'add'; step: Step }
  | { type: 'remove'; index: number }
  | { type: 'move'; index: number; direction: 'up' | 'down' }
  | { type: 'reset' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'restore'; steps: readonly Step[] }

/** All properties of the existing Step union are primitive; preserve them, including an explicit undefined seed. */
export function cloneTextPipelineSteps(steps: readonly Step[]): Step[] {
  return steps.map(step => ({ ...step }))
}

function equalSteps(left: readonly Step[], right: readonly Step[]): boolean {
  return left.length === right.length && left.every((step, index) => {
    const other = right[index]
    const entries = Object.entries(step)
    return entries.length === Object.keys(other).length
      && entries.every(([key, value]) => Object.hasOwn(other, key) && Object.is(value, (other as Record<string, unknown>)[key]))
  })
}

export function createTextPipelineHistory(steps: readonly Step[] = []): TextPipelineHistory {
  return { past: [], present: cloneTextPipelineSteps(steps), future: [] }
}

function commit(state: TextPipelineHistory, steps: readonly Step[]): TextPipelineHistory {
  if (equalSteps(state.present, steps)) return state
  return {
    past: [...state.past, cloneTextPipelineSteps(state.present)].slice(-TEXT_PIPELINE_HISTORY_LIMIT),
    present: cloneTextPipelineSteps(steps),
    future: [],
  }
}

/** Only step edits belong here. Source text, unfinished forms, URL I/O and seed generation stay outside. */
export function reduceTextPipelineHistory(state: TextPipelineHistory, action: TextPipelineAction): TextPipelineHistory {
  switch (action.type) {
    case 'add': return commit(state, [...state.present, action.step])
    case 'remove': {
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= state.present.length) return state
      return commit(state, state.present.filter((_, index) => index !== action.index))
    }
    case 'move': {
      if (!Number.isInteger(action.index) || !['up', 'down'].includes(action.direction)) return state
      const target = action.index + (action.direction === 'up' ? -1 : 1)
      if (action.index < 0 || action.index >= state.present.length || target < 0 || target >= state.present.length) return state
      const steps = [...state.present]
      ;[steps[action.index], steps[target]] = [steps[target], steps[action.index]]
      return commit(state, steps)
    }
    case 'reset': return commit(state, [])
    case 'undo': {
      if (!state.past.length) return state
      return {
        past: state.past.slice(0, -1),
        present: cloneTextPipelineSteps(state.past[state.past.length - 1]),
        future: [cloneTextPipelineSteps(state.present), ...state.future],
      }
    }
    case 'redo': {
      if (!state.future.length) return state
      return {
        past: [...state.past, cloneTextPipelineSteps(state.present)],
        present: cloneTextPipelineSteps(state.future[0]),
        future: state.future.slice(1),
      }
    }
    // An external URL restore establishes a new baseline even if its step values match the current list.
    // The caller must not dispatch this for its own URL synchronization.
    case 'restore': return !state.past.length && !state.future.length && equalSteps(state.present, action.steps)
      ? state : createTextPipelineHistory(action.steps)
  }
}
