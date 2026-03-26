'use client'

import { useRef, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface AxisGap {
  x: boolean
  y: boolean
  z: boolean
}

export default function SATBabylonView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<import('@babylonjs/core').Engine | null>(null)
  const t = useTranslations('satVisualizer')

  const [gaps, setGaps] = useState<AxisGap>({ x: true, y: true, z: true })
  const [isCollision, setIsCollision] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const isPausedRef = useRef(false)
  const timeRef = useRef(0)

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let disposed = false

    const init = async () => {
      const BABYLON = await import('@babylonjs/core')

      if (disposed) return

      const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
      engineRef.current = engine

      const scene = new BABYLON.Scene(engine)
      scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.18, 1)
      scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.4)

      // Light
      const dirLight = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-1, -2, -1), scene)
      dirLight.intensity = 1.0
      new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene).intensity = 0.5

      // Materials
      const matBlue = new BABYLON.StandardMaterial('matBlue', scene)
      matBlue.diffuseColor = new BABYLON.Color3(0.23, 0.51, 0.96) // blue-500
      matBlue.alpha = 0.85
      matBlue.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3)

      const matAmber = new BABYLON.StandardMaterial('matAmber', scene)
      matAmber.diffuseColor = new BABYLON.Color3(0.96, 0.62, 0.04) // amber-500
      matAmber.alpha = 0.85
      matAmber.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3)

      const matCollisionBlue = new BABYLON.StandardMaterial('matCollisionBlue', scene)
      matCollisionBlue.diffuseColor = new BABYLON.Color3(0.94, 0.27, 0.27) // red
      matCollisionBlue.alpha = 0.85
      matCollisionBlue.emissiveColor = new BABYLON.Color3(0.2, 0, 0)

      const matCollisionAmber = new BABYLON.StandardMaterial('matCollisionAmber', scene)
      matCollisionAmber.diffuseColor = new BABYLON.Color3(0.94, 0.27, 0.27)
      matCollisionAmber.alpha = 0.85
      matCollisionAmber.emissiveColor = new BABYLON.Color3(0.2, 0, 0)

      // Boxes — asymmetric shapes
      const box1 = BABYLON.MeshBuilder.CreateBox('box1', { width: 3, height: 0.5, depth: 0.5 }, scene)
      box1.material = matBlue

      const box2 = BABYLON.MeshBuilder.CreateBox('box2', { width: 1, height: 2.5, depth: 1.2 }, scene)
      box2.material = matAmber

      // Edge lines for clarity
      box1.enableEdgesRendering()
      box1.edgesWidth = 2.0
      box1.edgesColor = new BABYLON.Color4(0.37, 0.65, 0.98, 1)

      box2.enableEdgesRendering()
      box2.edgesWidth = 2.0
      box2.edgesColor = new BABYLON.Color4(0.98, 0.75, 0.14, 1)

      // Ground grid
      const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 12, height: 12, subdivisions: 20 }, scene)
      const groundMat = new BABYLON.StandardMaterial('groundMat', scene)
      groundMat.diffuseColor = new BABYLON.Color3(0.12, 0.12, 0.2)
      groundMat.wireframe = true
      groundMat.alpha = 0.3
      ground.material = groundMat
      ground.position.y = -3

      // --- 4 viewports (cameras) ---
      // Perspective (top-left)
      const camPersp = new BABYLON.ArcRotateCamera('camPersp', Math.PI / 4, Math.PI / 3, 12, BABYLON.Vector3.Zero(), scene)

      // Top (top-right) — Y축 위에서 내려다봄
      const camTop = new BABYLON.FreeCamera('camTop', new BABYLON.Vector3(0, 15, 0), scene)
      camTop.setTarget(BABYLON.Vector3.Zero())
      camTop.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA
      const orthoSize = 5
      camTop.orthoLeft = -orthoSize * 1.2
      camTop.orthoRight = orthoSize * 1.2
      camTop.orthoTop = orthoSize
      camTop.orthoBottom = -orthoSize

      // Front (bottom-left) — Z축 앞에서 봄
      const camFront = new BABYLON.FreeCamera('camFront', new BABYLON.Vector3(0, 0, 15), scene)
      camFront.setTarget(BABYLON.Vector3.Zero())
      camFront.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA
      camFront.orthoLeft = -orthoSize * 1.2
      camFront.orthoRight = orthoSize * 1.2
      camFront.orthoTop = orthoSize
      camFront.orthoBottom = -orthoSize

      // Side (bottom-right) — X축 옆에서 봄
      const camSide = new BABYLON.FreeCamera('camSide', new BABYLON.Vector3(15, 0, 0), scene)
      camSide.setTarget(BABYLON.Vector3.Zero())
      camSide.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA
      camSide.orthoLeft = -orthoSize * 1.2
      camSide.orthoRight = orthoSize * 1.2
      camSide.orthoTop = orthoSize
      camSide.orthoBottom = -orthoSize

      // Set active camera (for interaction)
      scene.activeCamera = camPersp
      camPersp.attachControl(canvas, true)

      // Setup viewports (4 quadrants)
      camPersp.viewport = new BABYLON.Viewport(0, 0.5, 0.5, 0.5)     // top-left
      camTop.viewport = new BABYLON.Viewport(0.5, 0.5, 0.5, 0.5)     // top-right
      camFront.viewport = new BABYLON.Viewport(0, 0, 0.5, 0.5)       // bottom-left
      camSide.viewport = new BABYLON.Viewport(0.5, 0, 0.5, 0.5)      // bottom-right

      scene.activeCameras = [camPersp, camTop, camFront, camSide]

      // Animation + SAT check
      scene.registerBeforeRender(() => {
        if (!isPausedRef.current) {
          timeRef.current += 0.007
        }
        const ti = timeRef.current

        // Independent movements
        box1.position.x = Math.sin(ti * 1.5) * 2.5
        box1.position.y = Math.cos(ti * 0.8) * 1.2
        box1.rotation.z = ti * 1.1

        box2.position.z = Math.sin(ti * 1.2) * 2.0
        box2.rotation.y = ti * 0.6

        // AABB SAT check
        box1.computeWorldMatrix(true)
        box2.computeWorldMatrix(true)
        const b1 = box1.getBoundingInfo().boundingBox
        const b2 = box2.getBoundingInfo().boundingBox

        const gapX = b1.minimumWorld.x > b2.maximumWorld.x || b2.minimumWorld.x > b1.maximumWorld.x
        const gapY = b1.minimumWorld.y > b2.maximumWorld.y || b2.minimumWorld.y > b1.maximumWorld.y
        const gapZ = b1.minimumWorld.z > b2.maximumWorld.z || b2.minimumWorld.z > b1.maximumWorld.z
        const colliding = !gapX && !gapY && !gapZ

        // Update materials on collision
        box1.material = colliding ? matCollisionBlue : matBlue
        box2.material = colliding ? matCollisionAmber : matAmber

        setGaps({ x: gapX, y: gapY, z: gapZ })
        setIsCollision(colliding)
      })

      engine.runRenderLoop(() => scene.render())

      const onResize = () => engine.resize()
      window.addEventListener('resize', onResize)

      return () => {
        window.removeEventListener('resize', onResize)
        engine.dispose()
      }
    }

    const cleanup = init()

    return () => {
      disposed = true
      cleanup.then(fn => fn?.())
    }
  }, [])

  const viewOverlaps = [
    isCollision,              // perspective = final
    !gaps.x && !gaps.z,       // top = X-Z
    !gaps.x && !gaps.y,       // front = X-Y
    !gaps.y && !gaps.z,       // side = Y-Z
  ]

  const viewLabels = [
    t('threeView.perspective'),
    t('threeView.topView') + ' (X-Z)',
    t('threeView.frontView') + ' (X-Y)',
    t('threeView.sideView') + ' (Y-Z)',
  ]

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsPaused(p => !p)}
          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium transition-colors"
        >
          {isPaused ? '▶ ' + t('threeView.play') : '⏸ ' + t('threeView.pause')}
        </button>

        <div className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
          isCollision
            ? 'bg-red-500/20 text-red-500 shadow-lg shadow-red-500/10'
            : 'bg-emerald-500/20 text-emerald-500 shadow-lg shadow-emerald-500/10'
        }`}>
          {isCollision ? '❌ ' + t('threeView.crash') : '✅ ' + t('threeView.safe')}
        </div>
      </div>

      {/* Canvas + viewport overlays */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-gray-700/50">
        <canvas ref={canvasRef} className="w-full" style={{ aspectRatio: '4/3' }} />

        {/* Viewport labels + status */}
        {viewLabels.map((label, i) => {
          const isLeft = i % 2 === 0
          const isTop = i < 2
          const overlap = viewOverlaps[i]

          return (
            <div
              key={i}
              className="absolute pointer-events-none"
              style={{
                left: isLeft ? 0 : '50%',
                top: isTop ? 0 : '50%',
                width: '50%',
                height: '50%',
              }}
            >
              <div className="absolute top-2 left-2 bg-black/70 text-white text-[11px] px-2 py-1 rounded z-10 backdrop-blur-sm font-mono">
                {label}
              </div>
              <div className={`absolute bottom-3 right-3 px-3 py-1.5 rounded-lg text-xs font-bold z-10 transition-all duration-300 ${
                overlap
                  ? 'bg-red-500/90 text-white shadow-lg shadow-red-500/30'
                  : 'bg-emerald-500/90 text-white shadow-lg shadow-emerald-500/30'
              }`}>
                {i === 0
                  ? (isCollision ? 'CRASH!' : 'SAFE')
                  : (overlap ? 'OVERLAP' : 'GAP FOUND')
                }
              </div>
              <div className={`absolute inset-0 border-2 pointer-events-none transition-colors duration-300 ${
                overlap ? 'border-red-500/40' : 'border-emerald-500/40'
              }`} />
            </div>
          )
        })}

        {/* Dividers */}
        <div className="absolute top-0 left-1/2 w-px h-full bg-gray-500/50 pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-gray-500/50 pointer-events-none" />
      </div>

      {/* Axis indicators */}
      <div className="grid grid-cols-3 gap-3">
        {(['x', 'y', 'z'] as const).map(axis => (
          <div
            key={axis}
            className={`py-2.5 px-3 rounded-xl text-center text-sm font-bold transition-all duration-300 ${
              gaps[axis]
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
            }`}
          >
            {axis.toUpperCase()}{t('threeView.axis')}: {gaps[axis] ? 'GAP ✅' : 'OVERLAP ❌'}
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-blue-950/30 border border-blue-500/10 rounded-xl p-4 text-sm space-y-2">
        <p className="font-semibold text-gray-200">💡 {t('threeView.howItWorks')}</p>
        <p className="text-gray-400">{t('threeView.explanation')}</p>
      </div>
    </div>
  )
}
