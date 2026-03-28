'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { RotateCcw, Play, ArrowRight, ArrowLeft, Zap, ChevronDown, ChevronUp } from 'lucide-react'

// ── Types ──
type ActivationFn = 'sigmoid' | 'relu' | 'tanh'

interface NetworkState {
  layers: number[]            // neuron counts per layer
  weights: number[][][]       // weights[l][j][i] = weight from layer l neuron i → layer l+1 neuron j
  biases: number[][]          // biases[l][j] for layer l+1 neuron j (index 0 = first hidden)
  activations: number[][]     // post-activation values per layer
  preActivations: number[][]  // pre-activation (z) values per layer
  gradients: number[][]       // dL/d(activation) per layer (for visualization)
}

interface Preset {
  name: string
  layers: number[]
  inputs: number[]
  targets: number[]
  lr: number
  activation: ActivationFn
}

// ── Activation Functions ──
function activate(x: number, fn: ActivationFn): number {
  switch (fn) {
    case 'sigmoid': return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))))
    case 'relu': return Math.max(0, x)
    case 'tanh': return Math.tanh(x)
  }
}

function activateDerivative(x: number, fn: ActivationFn): number {
  switch (fn) {
    case 'sigmoid': { const s = activate(x, 'sigmoid'); return s * (1 - s) }
    case 'relu': return x > 0 ? 1 : 0
    case 'tanh': { const t = Math.tanh(x); return 1 - t * t }
  }
}

// ── Network Logic ──
function initNetwork(layers: number[]): NetworkState {
  const weights: number[][][] = []
  const biases: number[][] = []
  for (let l = 0; l < layers.length - 1; l++) {
    const fanIn = layers[l]
    const fanOut = layers[l + 1]
    // Xavier initialization
    const scale = Math.sqrt(2 / (fanIn + fanOut))
    const w: number[][] = []
    const b: number[] = []
    for (let j = 0; j < fanOut; j++) {
      const row: number[] = []
      for (let i = 0; i < fanIn; i++) {
        row.push((Math.random() * 2 - 1) * scale)
      }
      w.push(row)
      b.push(0)
    }
    weights.push(w)
    biases.push(b)
  }
  const activations = layers.map(n => new Array(n).fill(0))
  const preActivations = layers.map(n => new Array(n).fill(0))
  const gradients = layers.map(n => new Array(n).fill(0))
  return { layers, weights, biases, activations, preActivations, gradients }
}

function forwardPass(net: NetworkState, inputs: number[], fn: ActivationFn): NetworkState {
  const newAct = net.layers.map(n => new Array(n).fill(0))
  const newPre = net.layers.map(n => new Array(n).fill(0))
  // Set input layer
  for (let i = 0; i < net.layers[0]; i++) {
    newAct[0][i] = inputs[i] ?? 0
    newPre[0][i] = inputs[i] ?? 0
  }
  // Propagate
  for (let l = 0; l < net.layers.length - 1; l++) {
    for (let j = 0; j < net.layers[l + 1]; j++) {
      let sum = net.biases[l][j]
      for (let i = 0; i < net.layers[l]; i++) {
        sum += net.weights[l][j][i] * newAct[l][i]
      }
      newPre[l + 1][j] = sum
      newAct[l + 1][j] = activate(sum, fn)
    }
  }
  return { ...net, activations: newAct, preActivations: newPre }
}

function backwardPass(
  net: NetworkState, targets: number[], fn: ActivationFn, lr: number
): NetworkState {
  const L = net.layers.length
  const newWeights = net.weights.map(lw => lw.map(row => [...row]))
  const newBiases = net.biases.map(lb => [...lb])
  const grads: number[][] = net.layers.map(n => new Array(n).fill(0))

  // Output layer gradients: dL/da * da/dz
  const outIdx = L - 1
  const deltas: number[][] = net.layers.map(n => new Array(n).fill(0))
  for (let j = 0; j < net.layers[outIdx]; j++) {
    const dLda = 2 * (net.activations[outIdx][j] - (targets[j] ?? 0)) / net.layers[outIdx]
    const dadz = activateDerivative(net.preActivations[outIdx][j], fn)
    deltas[outIdx][j] = dLda * dadz
    grads[outIdx][j] = dLda
  }

  // Hidden layer deltas
  for (let l = outIdx - 1; l >= 1; l--) {
    for (let i = 0; i < net.layers[l]; i++) {
      let sum = 0
      for (let j = 0; j < net.layers[l + 1]; j++) {
        sum += deltas[l + 1][j] * net.weights[l][j][i]
      }
      const dadz = activateDerivative(net.preActivations[l][i], fn)
      deltas[l][i] = sum * dadz
      grads[l][i] = sum
    }
  }

  // Update weights and biases
  for (let l = 0; l < L - 1; l++) {
    for (let j = 0; j < net.layers[l + 1]; j++) {
      for (let i = 0; i < net.layers[l]; i++) {
        newWeights[l][j][i] -= lr * deltas[l + 1][j] * net.activations[l][i]
      }
      newBiases[l][j] -= lr * deltas[l + 1][j]
    }
  }

  return { ...net, weights: newWeights, biases: newBiases, gradients: grads }
}

function computeLoss(net: NetworkState, targets: number[]): number {
  const outIdx = net.layers.length - 1
  let sum = 0
  for (let j = 0; j < net.layers[outIdx]; j++) {
    const diff = net.activations[outIdx][j] - (targets[j] ?? 0)
    sum += diff * diff
  }
  return sum / net.layers[outIdx]
}

// ── Presets ──
const PRESETS: Preset[] = [
  { name: 'XOR 문제', layers: [2, 4, 1], inputs: [1, 0], targets: [1], lr: 0.5, activation: 'sigmoid' },
  { name: 'AND 게이트', layers: [2, 1], inputs: [1, 1], targets: [1], lr: 0.3, activation: 'sigmoid' },
  { name: '간단한 분류', layers: [2, 3, 2], inputs: [0.5, 0.8], targets: [1, 0], lr: 0.3, activation: 'tanh' },
]

// ── Canvas Drawing ──
function drawNetwork(
  canvas: HTMLCanvasElement,
  net: NetworkState,
  animLayer: number,  // -1 = none, 0..L-1 = forward highlight, 100+l = backward highlight
  dark: boolean
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)
  const W = rect.width
  const H = rect.height

  ctx.clearRect(0, 0, W, H)

  const L = net.layers.length
  const padX = 80
  const padY = 40
  const usableW = W - padX * 2
  const usableH = H - padY * 2
  const layerSpacing = L > 1 ? usableW / (L - 1) : 0

  // Neuron positions
  const positions: { x: number; y: number }[][] = []
  for (let l = 0; l < L; l++) {
    const n = net.layers[l]
    const x = padX + l * layerSpacing
    const spacing = Math.min(60, usableH / (n + 1))
    const totalH = (n - 1) * spacing
    const startY = (H - totalH) / 2
    const layerPos: { x: number; y: number }[] = []
    for (let i = 0; i < n; i++) {
      layerPos.push({ x, y: startY + i * spacing })
    }
    positions.push(layerPos)
  }

  const neuronR = Math.min(22, 18)

  // Draw connections
  for (let l = 0; l < L - 1; l++) {
    for (let j = 0; j < net.layers[l + 1]; j++) {
      for (let i = 0; i < net.layers[l]; i++) {
        const w = net.weights[l][j][i]
        const absW = Math.min(Math.abs(w), 3)
        const lineWidth = 0.5 + (absW / 3) * 3.5
        const from = positions[l][i]
        const to = positions[l + 1][j]

        ctx.beginPath()
        ctx.moveTo(from.x + neuronR, from.y)
        ctx.lineTo(to.x - neuronR, to.y)
        ctx.lineWidth = lineWidth

        if (w >= 0) {
          const alpha = 0.15 + (absW / 3) * 0.7
          ctx.strokeStyle = dark
            ? `rgba(96, 165, 250, ${alpha})`   // blue-400
            : `rgba(37, 99, 235, ${alpha})`     // blue-600
        } else {
          const alpha = 0.15 + (absW / 3) * 0.7
          ctx.strokeStyle = dark
            ? `rgba(248, 113, 113, ${alpha})`   // red-400
            : `rgba(220, 38, 38, ${alpha})`     // red-600
        }
        ctx.stroke()
      }
    }
  }

  // Layer labels
  const labels = net.layers.map((_, i) => {
    if (i === 0) return '입력층'
    if (i === L - 1) return '출력층'
    return `은닉층 ${i}`
  })
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  for (let l = 0; l < L; l++) {
    ctx.fillStyle = dark ? '#9ca3af' : '#6b7280'
    ctx.fillText(labels[l], positions[l][0].x, padY - 12)
  }

  // Draw neurons
  for (let l = 0; l < L; l++) {
    for (let i = 0; i < net.layers[l]; i++) {
      const { x, y } = positions[l][i]
      const val = net.activations[l][i]
      const clampVal = Math.max(0, Math.min(1, (val + 1) / 2)) // map [-1,1] → [0,1]

      // Highlight during animation
      const isForwardHighlight = animLayer === l
      const isBackwardHighlight = animLayer === 100 + l

      // Neuron circle
      ctx.beginPath()
      ctx.arc(x, y, neuronR, 0, Math.PI * 2)

      if (isForwardHighlight) {
        ctx.fillStyle = dark ? '#fbbf24' : '#f59e0b' // amber
      } else if (isBackwardHighlight) {
        ctx.fillStyle = dark ? '#a78bfa' : '#7c3aed' // violet
      } else {
        // Gradient from white/gray to blue based on activation
        if (dark) {
          const r = Math.round(55 + (1 - clampVal) * 30)
          const g = Math.round(55 + (1 - clampVal) * 30)
          const b = Math.round(80 + clampVal * 170)
          ctx.fillStyle = `rgb(${r},${g},${b})`
        } else {
          const r = Math.round(255 - clampVal * 100)
          const g = Math.round(255 - clampVal * 60)
          const b = Math.round(255 - clampVal * 20)
          ctx.fillStyle = `rgb(${r},${g},${b})`
        }
      }
      ctx.fill()

      ctx.strokeStyle = dark ? '#6b7280' : '#9ca3af'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Value text inside neuron
      ctx.fillStyle = dark ? '#f3f4f6' : '#1f2937'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(val.toFixed(2), x, y)
    }
  }

  // Draw gradient arrows during backprop animation
  if (animLayer >= 100) {
    const l = animLayer - 100
    for (let i = 0; i < net.layers[l]; i++) {
      const { x, y } = positions[l][i]
      const grad = net.gradients[l][i]
      if (Math.abs(grad) > 0.001) {
        const arrowLen = Math.min(Math.abs(grad) * 15, 20)
        ctx.beginPath()
        ctx.moveTo(x + neuronR + 4, y)
        ctx.lineTo(x + neuronR + 4 + arrowLen, y)
        ctx.strokeStyle = dark ? '#c084fc' : '#8b5cf6'
        ctx.lineWidth = 2
        ctx.stroke()
        // Arrowhead
        ctx.beginPath()
        ctx.moveTo(x + neuronR + 4, y)
        ctx.lineTo(x + neuronR + 10, y - 4)
        ctx.lineTo(x + neuronR + 10, y + 4)
        ctx.closePath()
        ctx.fillStyle = dark ? '#c084fc' : '#8b5cf6'
        ctx.fill()
      }
    }
  }
}

// ── Component ──
export default function NeuralNetworkVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [layerSizes, setLayerSizes] = useState<number[]>([2, 4, 1])
  const [activation, setActivation] = useState<ActivationFn>('sigmoid')
  const [lr, setLr] = useState(0.5)
  const [inputs, setInputs] = useState<number[]>([1, 0])
  const [targets, setTargets] = useState<number[]>([1])
  const [network, setNetwork] = useState<NetworkState>(() => initNetwork([2, 4, 1]))
  const [loss, setLoss] = useState(0)
  const [lossHistory, setLossHistory] = useState<number[]>([])
  const [epoch, setEpoch] = useState(0)
  const [animLayer, setAnimLayer] = useState(-1)
  const [isDark, setIsDark] = useState(false)
  const [showWeights, setShowWeights] = useState(false)
  const [hiddenCount, setHiddenCount] = useState(1)
  const [hiddenSizes, setHiddenSizes] = useState([4])
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dark mode detection
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // Redraw canvas on state change
  useEffect(() => {
    if (canvasRef.current) {
      drawNetwork(canvasRef.current, network, animLayer, isDark)
    }
  }, [network, animLayer, isDark])

  // Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) drawNetwork(canvasRef.current, network, animLayer, isDark)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [network, animLayer, isDark])

  const resetNetwork = useCallback(() => {
    if (animRef.current) clearTimeout(animRef.current)
    const layers = [layerSizes[0], ...hiddenSizes.slice(0, hiddenCount), layerSizes[layerSizes.length - 1]]
    const net = initNetwork(layers)
    setNetwork(net)
    setLoss(0)
    setLossHistory([])
    setEpoch(0)
    setAnimLayer(-1)
    setLayerSizes(layers)
  }, [layerSizes, hiddenCount, hiddenSizes])

  const runForward = useCallback(() => {
    if (animRef.current) clearTimeout(animRef.current)
    const updated = forwardPass(network, inputs, activation)
    setNetwork(updated)
    setLoss(computeLoss(updated, targets))

    // Animation: highlight layers left to right
    let step = 0
    const animate = () => {
      if (step < updated.layers.length) {
        setAnimLayer(step)
        step++
        animRef.current = setTimeout(animate, 300)
      } else {
        setAnimLayer(-1)
      }
    }
    animate()
  }, [network, inputs, activation, targets])

  const runBackward = useCallback(() => {
    if (animRef.current) clearTimeout(animRef.current)
    // First ensure forward pass is current
    let net = forwardPass(network, inputs, activation)
    // Then backward
    net = backwardPass(net, targets, activation, lr)
    const newLoss = computeLoss(forwardPass(net, inputs, activation), targets)

    // Do another forward pass with updated weights
    net = forwardPass(net, inputs, activation)
    setNetwork(net)
    setLoss(newLoss)
    setLossHistory(prev => [...prev.slice(-49), newLoss])
    setEpoch(prev => prev + 1)

    // Animation: highlight layers right to left
    let step = net.layers.length - 1
    const animate = () => {
      if (step >= 0) {
        setAnimLayer(100 + step)
        step--
        animRef.current = setTimeout(animate, 300)
      } else {
        setAnimLayer(-1)
      }
    }
    animate()
  }, [network, inputs, activation, targets, lr])

  const runEpoch = useCallback(() => {
    if (animRef.current) clearTimeout(animRef.current)
    let net = { ...network }
    const newHistory: number[] = []

    // Run 50 iterations
    for (let i = 0; i < 50; i++) {
      net = forwardPass(net, inputs, activation)
      net = backwardPass(net, targets, activation, lr)
      net = forwardPass(net, inputs, activation)
      if (i % 5 === 0) newHistory.push(computeLoss(net, targets))
    }

    const finalLoss = computeLoss(net, targets)
    setNetwork(net)
    setLoss(finalLoss)
    setLossHistory(prev => [...prev.slice(-(50 - newHistory.length)), ...newHistory])
    setEpoch(prev => prev + 50)
    setAnimLayer(-1)
  }, [network, inputs, activation, targets, lr])

  const applyPreset = useCallback((preset: Preset) => {
    if (animRef.current) clearTimeout(animRef.current)
    const net = initNetwork(preset.layers)
    setLayerSizes(preset.layers)
    setNetwork(net)
    setInputs(preset.inputs)
    setTargets(preset.targets)
    setLr(preset.lr)
    setActivation(preset.activation)
    setLoss(0)
    setLossHistory([])
    setEpoch(0)
    setAnimLayer(-1)

    const hCount = preset.layers.length - 2
    setHiddenCount(hCount)
    setHiddenSizes(preset.layers.slice(1, 1 + hCount))
  }, [])

  const updateArchitecture = useCallback((inputN: number, outputN: number, hCount: number, hSizes: number[]) => {
    const layers = [inputN, ...hSizes.slice(0, hCount), outputN]
    setLayerSizes(layers)
    setInputs(prev => {
      const arr = new Array(inputN).fill(0)
      for (let i = 0; i < Math.min(prev.length, inputN); i++) arr[i] = prev[i]
      return arr
    })
    setTargets(prev => {
      const arr = new Array(outputN).fill(0)
      for (let i = 0; i < Math.min(prev.length, outputN); i++) arr[i] = prev[i]
      return arr
    })
    const net = initNetwork(layers)
    setNetwork(net)
    setLoss(0)
    setLossHistory([])
    setEpoch(0)
  }, [])

  // Mini loss chart
  const renderLossChart = () => {
    if (lossHistory.length < 2) return null
    const maxLoss = Math.max(...lossHistory, 0.01)
    const chartW = 280
    const chartH = 60
    const points = lossHistory.map((l, i) => {
      const x = (i / (lossHistory.length - 1)) * chartW
      const y = chartH - (l / maxLoss) * chartH
      return `${x},${y}`
    }).join(' ')
    return (
      <svg width={chartW} height={chartH + 20} className="mt-2">
        <polyline points={points} fill="none" stroke={isDark ? '#60a5fa' : '#2563eb'} strokeWidth="2" />
        <text x={0} y={chartH + 14} fontSize="10" fill={isDark ? '#9ca3af' : '#6b7280'}>
          손실: {lossHistory[lossHistory.length - 1]?.toFixed(6)}
        </text>
      </svg>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">신경망 시각화</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          순전파·역전파 과정을 뉴런 단위로 시각화하며 딥러닝 원리를 이해하세요
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Controls Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Presets */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">프리셋</h3>
            <div className="space-y-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Architecture */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">네트워크 구조</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">입력 뉴런: {layerSizes[0]}</label>
                <input type="range" min={1} max={4} value={layerSizes[0]}
                  onChange={e => {
                    const v = Number(e.target.value)
                    updateArchitecture(v, layerSizes[layerSizes.length - 1], hiddenCount, hiddenSizes)
                  }}
                  className="w-full accent-blue-600" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">은닉층 수: {hiddenCount}</label>
                <input type="range" min={0} max={2} value={hiddenCount}
                  onChange={e => {
                    const v = Number(e.target.value)
                    setHiddenCount(v)
                    const hs = [...hiddenSizes]
                    while (hs.length < v) hs.push(3)
                    setHiddenSizes(hs)
                    updateArchitecture(layerSizes[0], layerSizes[layerSizes.length - 1], v, hs)
                  }}
                  className="w-full accent-blue-600" />
              </div>
              {Array.from({ length: hiddenCount }).map((_, idx) => (
                <div key={idx}>
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    은닉층 {idx + 1} 뉴런: {hiddenSizes[idx] ?? 3}
                  </label>
                  <input type="range" min={1} max={6} value={hiddenSizes[idx] ?? 3}
                    onChange={e => {
                      const hs = [...hiddenSizes]
                      hs[idx] = Number(e.target.value)
                      setHiddenSizes(hs)
                      updateArchitecture(layerSizes[0], layerSizes[layerSizes.length - 1], hiddenCount, hs)
                    }}
                    className="w-full accent-blue-600" />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">출력 뉴런: {layerSizes[layerSizes.length - 1]}</label>
                <input type="range" min={1} max={3} value={layerSizes[layerSizes.length - 1]}
                  onChange={e => {
                    const v = Number(e.target.value)
                    updateArchitecture(layerSizes[0], v, hiddenCount, hiddenSizes)
                  }}
                  className="w-full accent-blue-600" />
              </div>
            </div>
          </div>

          {/* Activation & LR */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">하이퍼파라미터</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">활성화 함수</label>
                <select
                  value={activation}
                  onChange={e => setActivation(e.target.value as ActivationFn)}
                  className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="sigmoid">Sigmoid</option>
                  <option value="relu">ReLU</option>
                  <option value="tanh">Tanh</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">학습률: {lr.toFixed(2)}</label>
                <input type="range" min={0.01} max={1} step={0.01} value={lr}
                  onChange={e => setLr(Number(e.target.value))}
                  className="w-full accent-blue-600" />
              </div>
            </div>
          </div>

          {/* Inputs & Targets */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">입출력 값</h3>
            <div className="space-y-2">
              {inputs.map((v, i) => (
                <div key={`in-${i}`} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-14">입력 {i + 1}</span>
                  <input type="number" step={0.1} value={v}
                    onChange={e => {
                      const newInputs = [...inputs]
                      newInputs[i] = Number(e.target.value)
                      setInputs(newInputs)
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              ))}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                <span className="text-xs text-gray-400">목표 출력 (역전파용)</span>
              </div>
              {targets.map((v, i) => (
                <div key={`tgt-${i}`} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-14">목표 {i + 1}</span>
                  <input type="number" step={0.1} value={v}
                    onChange={e => {
                      const newTargets = [...targets]
                      newTargets[i] = Number(e.target.value)
                      setTargets(newTargets)
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-2">
            <button onClick={runForward}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors">
              <ArrowRight size={16} /> 순전파
            </button>
            <button onClick={runBackward}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-violet-700 transition-colors">
              <ArrowLeft size={16} /> 역전파
            </button>
            <button onClick={runEpoch}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-colors">
              <Zap size={16} /> 50 에포크
            </button>
            <button onClick={resetNetwork}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors">
              <RotateCcw size={16} /> 초기화
            </button>
          </div>
        </div>

        {/* Main Canvas + Training Info */}
        <div className="lg:col-span-3 space-y-4">
          {/* Canvas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">네트워크 구조</h3>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 h-0.5 bg-blue-500"></span> 양수 가중치
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 h-0.5 bg-red-500"></span> 음수 가중치
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-amber-400"></span> 순전파
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-violet-500"></span> 역전파
                </span>
              </div>
            </div>
            <canvas
              ref={canvasRef}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg"
              style={{ height: Math.max(280, network.layers.reduce((a, b) => Math.max(a, b), 0) * 65 + 80) }}
            />
          </div>

          {/* Training Info */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">에포크</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{epoch}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">손실 (MSE)</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{loss.toFixed(6)}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">출력</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                [{network.activations[network.layers.length - 1].map(v => v.toFixed(4)).join(', ')}]
              </div>
            </div>
          </div>

          {/* Loss Chart */}
          {lossHistory.length >= 2 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">손실 추이</h3>
              {renderLossChart()}
            </div>
          )}

          {/* Weight Matrix (collapsible) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <button
              onClick={() => setShowWeights(!showWeights)}
              className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-900 dark:text-white"
            >
              가중치 행렬
              {showWeights ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showWeights && (
              <div className="px-4 pb-4 space-y-3">
                {network.weights.map((lw, l) => (
                  <div key={l}>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      레이어 {l} → {l + 1}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="text-xs font-mono">
                        <tbody>
                          {lw.map((row, j) => (
                            <tr key={j}>
                              {row.map((w, i) => (
                                <td key={i} className="px-2 py-0.5"
                                  style={{ color: w >= 0 ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#f87171' : '#dc2626') }}>
                                  {w.toFixed(4)}
                                </td>
                              ))}
                              <td className="px-2 py-0.5 text-gray-400">b={network.biases[l][j].toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">가이드</h2>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">인공 신경망이란?</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            인공 신경망(Artificial Neural Network)은 인간 뇌의 뉴런 구조에서 영감을 받은 머신러닝 모델입니다.
            입력층, 은닉층, 출력층으로 구성되며, 각 뉴런은 이전 층의 출력값에 가중치를 곱하고 편향을 더한 후
            활성화 함수를 통과시켜 다음 층으로 신호를 전달합니다. 충분한 뉴런과 층이 있으면
            어떤 연속 함수든 근사할 수 있다는 것이 만능근사정리(Universal Approximation Theorem)입니다.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">순전파와 역전파</h3>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p>
              <strong>순전파(Forward Propagation):</strong> 입력 데이터가 네트워크를 왼쪽에서 오른쪽으로 통과하며
              각 뉴런에서 z = Wx + b를 계산하고 활성화 함수 a = f(z)를 적용합니다. 최종 출력층에서 예측값이 나옵니다.
            </p>
            <p>
              <strong>역전파(Backpropagation):</strong> 출력의 오차(손실)를 체인 룰(Chain Rule)로 각 가중치에 대해
              편미분하여 기울기를 계산합니다. 이 기울기에 학습률을 곱해 가중치를 업데이트합니다.
              오른쪽(출력)에서 왼쪽(입력)으로 기울기가 전파되어 모든 가중치가 동시에 조정됩니다.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">활성화 함수 비교</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 px-3 text-gray-900 dark:text-white">함수</th>
                  <th className="py-2 px-3 text-gray-900 dark:text-white">수식</th>
                  <th className="py-2 px-3 text-gray-900 dark:text-white">범위</th>
                  <th className="py-2 px-3 text-gray-900 dark:text-white">특징</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-gray-300">
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 px-3 font-medium">Sigmoid</td>
                  <td className="py-2 px-3 font-mono text-xs">1/(1+e^(-x))</td>
                  <td className="py-2 px-3">(0, 1)</td>
                  <td className="py-2 px-3">확률 출력에 적합, 기울기 소실 문제</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 px-3 font-medium">ReLU</td>
                  <td className="py-2 px-3 font-mono text-xs">max(0, x)</td>
                  <td className="py-2 px-3">[0, +inf)</td>
                  <td className="py-2 px-3">계산 빠름, 죽은 뉴런 문제 가능</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Tanh</td>
                  <td className="py-2 px-3 font-mono text-xs">(e^x-e^(-x))/(e^x+e^(-x))</td>
                  <td className="py-2 px-3">(-1, 1)</td>
                  <td className="py-2 px-3">0 중심, Sigmoid보다 학습 안정적</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">자주 묻는 질문</h3>
          <div className="space-y-3">
            {[
              { q: '학습률이 너무 높으면 어떻게 되나요?', a: '손실이 발산하여 학습이 불안정해집니다. 반대로 너무 낮으면 학습 속도가 매우 느려집니다. 일반적으로 0.001~0.1 사이의 값을 사용합니다.' },
              { q: '은닉층이 많을수록 좋은가요?', a: '층이 깊으면 더 복잡한 패턴을 학습할 수 있지만, 기울기 소실/폭발 문제가 발생할 수 있고 과적합 위험이 높아집니다. 문제의 복잡도에 맞게 선택해야 합니다.' },
              { q: 'XOR 문제는 왜 은닉층이 필요한가요?', a: 'XOR은 선형 분리가 불가능한 문제입니다. 은닉층이 입력 공간을 비선형으로 변환하여 선형 분리 가능한 표현을 만들어줍니다.' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{item.q}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
