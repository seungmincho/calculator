// Stack & Queue — pure logic for step-by-step visualization

export interface StackQueueStep {
  stack: number[]
  queue: number[]
  action: 'push' | 'pop' | 'enqueue' | 'dequeue' | 'peek-stack' | 'peek-queue'
  value: number | null
  target: 'stack' | 'queue'
  description: string
}

export interface StackQueueResult {
  steps: StackQueueStep[]
}

export interface Operation {
  op: string
  value?: number
  target: 'stack' | 'queue'
}

/**
 * Run a sequence of stack/queue operations and record every step.
 */
export function runOperations(operations: Operation[]): StackQueueResult {
  const stack: number[] = []
  const queue: number[] = []
  const steps: StackQueueStep[] = []

  for (const { op, value, target } of operations) {
    if (target === 'stack') {
      if (op === 'push' && value !== undefined) {
        stack.push(value)
        steps.push({
          stack: [...stack],
          queue: [...queue],
          action: 'push',
          value,
          target: 'stack',
          description: `Push ${value} → 스택 상단에 추가`,
        })
      } else if (op === 'pop') {
        if (stack.length === 0) continue
        const popped = stack.pop()!
        steps.push({
          stack: [...stack],
          queue: [...queue],
          action: 'pop',
          value: popped,
          target: 'stack',
          description: `Pop ${popped} ← 스택 상단에서 제거 (LIFO)`,
        })
      } else if (op === 'peek') {
        if (stack.length === 0) continue
        const top = stack[stack.length - 1]
        steps.push({
          stack: [...stack],
          queue: [...queue],
          action: 'peek-stack',
          value: top,
          target: 'stack',
          description: `Peek → 스택 상단 값: ${top}`,
        })
      }
    } else {
      if (op === 'enqueue' && value !== undefined) {
        queue.push(value)
        steps.push({
          stack: [...stack],
          queue: [...queue],
          action: 'enqueue',
          value,
          target: 'queue',
          description: `Enqueue ${value} → 큐 후단(Rear)에 추가`,
        })
      } else if (op === 'dequeue') {
        if (queue.length === 0) continue
        const dequeued = queue.shift()!
        steps.push({
          stack: [...stack],
          queue: [...queue],
          action: 'dequeue',
          value: dequeued,
          target: 'queue',
          description: `Dequeue ${dequeued} ← 큐 전단(Front)에서 제거 (FIFO)`,
        })
      } else if (op === 'peek') {
        if (queue.length === 0) continue
        const front = queue[0]
        steps.push({
          stack: [...stack],
          queue: [...queue],
          action: 'peek-queue',
          value: front,
          target: 'queue',
          description: `Peek → 큐 전단 값: ${front}`,
        })
      }
    }
  }

  return { steps }
}

/**
 * Demo sequence that shows all 4 operations with clear LIFO/FIFO contrast.
 */
export function generateDemoOperations(): Operation[] {
  return [
    // Build up the stack
    { op: 'push', value: 10, target: 'stack' },
    { op: 'push', value: 20, target: 'stack' },
    { op: 'push', value: 30, target: 'stack' },
    // Build up the queue in parallel
    { op: 'enqueue', value: 10, target: 'queue' },
    { op: 'enqueue', value: 20, target: 'queue' },
    { op: 'enqueue', value: 30, target: 'queue' },
    // Peek both
    { op: 'peek', target: 'stack' },
    { op: 'peek', target: 'queue' },
    // Pop from stack (LIFO: 30 comes out)
    { op: 'pop', target: 'stack' },
    // Dequeue from queue (FIFO: 10 comes out)
    { op: 'dequeue', target: 'queue' },
    // Push & enqueue more
    { op: 'push', value: 40, target: 'stack' },
    { op: 'enqueue', value: 40, target: 'queue' },
    // Pop twice from stack (40, then 20)
    { op: 'pop', target: 'stack' },
    { op: 'pop', target: 'stack' },
    // Dequeue twice from queue (20, then 30)
    { op: 'dequeue', target: 'queue' },
    { op: 'dequeue', target: 'queue' },
  ]
}
