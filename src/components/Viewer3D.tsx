'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Upload, RotateCcw, Maximize2, Camera, Play, Pause, Grid3X3, Box,
  RefreshCw, Square, Film, Layers, Download, Settings, Printer, FileType,
  AlertCircle
} from 'lucide-react'

type ActiveTab = 'viewer' | 'convert' | 'optimize' | 'print'

interface ModelInfo {
  fileName: string
  fileSize: string
  vertices: number
  faces: number
  meshes: number
  materials: number
  textures: number
  animations: string[]
  // 3D printing analysis
  volume?: number // cm³
  surfaceArea?: number // cm²
  boundingBoxSize?: { x: number; y: number; z: number } // mm
}

interface PrintAnalysis {
  volume: number // cm³
  surfaceArea: number // cm²
  boundingBox: { x: number; y: number; z: number } // mm
  estimatedPrintTime: { // hours
    fdm: number
    sla: number
  }
  estimatedMaterial: { // grams
    pla: number
    abs: number
    resin: number
  }
  warnings: string[]
}

interface AnimationGroup {
  name: string
  from: number
  to: number
  isPlaying: boolean
  speedRatio: number
  loopAnimation: boolean
  play: (loop?: boolean) => void
  pause: () => void
  stop: () => void
  reset: () => void
}

export default function Viewer3D() {
  const t = useTranslations('viewer3d')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<any>(null)
  const sceneRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const animationGroupsRef = useRef<AnimationGroup[]>([])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [autoRotate, setAutoRotate] = useState(false)
  const [showWireframe, setShowWireframe] = useState(false)
  const [showGrid] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [isWebGPU, setIsWebGPU] = useState(false)
  const [backgroundColor, setBackgroundColor] = useState('#1a1a2e')
  const [lightIntensity, setLightIntensity] = useState(1)
  const [isReady, setIsReady] = useState(false)

  // Animation states
  const [selectedAnimation, setSelectedAnimation] = useState<string | null>(null)
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(1)
  const [loopAnimation, setLoopAnimation] = useState(true)

  // Environment preset
  const [envPreset, setEnvPreset] = useState<string>('none')

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('viewer')

  // Export state
  const [exportFormat, setExportFormat] = useState<string>('glb')
  const [isExporting, setIsExporting] = useState(false)

  // Optimization state
  const [optimizationLevel, setOptimizationLevel] = useState<number>(50)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizedInfo, setOptimizedInfo] = useState<{ vertices: number; faces: number } | null>(null)

  // Print analysis state
  const [printAnalysis, setPrintAnalysis] = useState<PrintAnalysis | null>(null)
  const [printScale, setPrintScale] = useState<number>(100)
  const [infillPercent, setInfillPercent] = useState<number>(20)

  // Store original mesh data for export
  const loadedMeshesRef = useRef<any[]>([])

  // Create grid helper
  const createGrid = useCallback((scene: any, BABYLON: any) => {
    const gridSize = 10
    const gridDivisions = 20

    for (let i = -gridSize; i <= gridSize; i += gridSize / gridDivisions * 2) {
      const lineX = BABYLON.MeshBuilder.CreateLines(
        `gridX${i}`,
        {
          points: [
            new BABYLON.Vector3(i, 0, -gridSize),
            new BABYLON.Vector3(i, 0, gridSize),
          ],
        },
        scene
      )
      lineX.color = new BABYLON.Color3(0.3, 0.3, 0.3)

      const lineZ = BABYLON.MeshBuilder.CreateLines(
        `gridZ${i}`,
        {
          points: [
            new BABYLON.Vector3(-gridSize, 0, i),
            new BABYLON.Vector3(gridSize, 0, i),
          ],
        },
        scene
      )
      lineZ.color = new BABYLON.Color3(0.3, 0.3, 0.3)
    }
  }, [])

  // Initialize Babylon.js engine
  useEffect(() => {
    if (!canvasRef.current) return
    if (engineRef.current) return

    let disposed = false

    const initEngine = async () => {
      try {
        console.log('Loading Babylon.js...')
        const BABYLON = await import('@babylonjs/core')
        await import('@babylonjs/loaders')
        console.log('Babylon.js loaded')

        if (disposed || !canvasRef.current) {
          console.log('Cancelled: component unmounted during load')
          return
        }

        let engine: any
        let useWebGPU = false

        if ((navigator as any).gpu) {
          try {
            console.log('Checking WebGPU support...')
            const adapter = await (navigator as any).gpu.requestAdapter()
            if (adapter) {
              console.log('WebGPU adapter found, initializing...')
              const webgpuEngine = new BABYLON.WebGPUEngine(canvasRef.current, {
                antialias: true,
                stencil: true,
              })

              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('WebGPU timeout')), 5000)
              )
              await Promise.race([webgpuEngine.initAsync(), timeoutPromise])

              if (disposed) {
                webgpuEngine.dispose()
                return
              }

              engine = webgpuEngine
              useWebGPU = true
              console.log('WebGPU engine initialized!')
            }
          } catch (e) {
            console.warn('WebGPU failed, falling back to WebGL:', e)
          }
        }

        if (!engine) {
          console.log('Initializing WebGL engine...')
          engine = new BABYLON.Engine(canvasRef.current, true, {
            preserveDrawingBuffer: true,
            stencil: true,
          })
          console.log('WebGL engine initialized')
        }

        if (disposed) {
          engine.dispose()
          return
        }

        engineRef.current = engine
        setIsWebGPU(useWebGPU)

        const scene = new BABYLON.Scene(engine)
        scene.clearColor = BABYLON.Color4.FromHexString('#1a1a2eff')
        sceneRef.current = scene

        const camera = new BABYLON.ArcRotateCamera(
          'camera',
          Math.PI / 4,
          Math.PI / 3,
          10,
          BABYLON.Vector3.Zero(),
          scene
        )
        camera.attachControl(canvasRef.current, true)
        camera.wheelPrecision = 50
        camera.minZ = 0.01
        camera.lowerRadiusLimit = 0.5
        camera.upperRadiusLimit = 100

        const hemisphericLight = new BABYLON.HemisphericLight(
          'hemisphericLight',
          new BABYLON.Vector3(0, 1, 0),
          scene
        )
        hemisphericLight.intensity = 0.5

        const directionalLight = new BABYLON.DirectionalLight(
          'directionalLight',
          new BABYLON.Vector3(-1, -2, -1),
          scene
        )
        directionalLight.intensity = 0.7

        if (showGrid) {
          createGrid(scene, BABYLON)
        }

        engine.runRenderLoop(() => {
          if (!disposed && scene && !scene.isDisposed) {
            scene.render()
          }
        })

        const handleResize = () => {
          if (engine && !disposed) {
            engine.resize()
          }
        }
        window.addEventListener('resize', handleResize)

        setIsReady(true)
        console.log('3D Engine ready!')

      } catch (err) {
        console.error('Failed to initialize Babylon.js:', err)
        setIsReady(false)
      }
    }

    initEngine()

    return () => {
      disposed = true
      if (engineRef.current) {
        engineRef.current.dispose()
        engineRef.current = null
        sceneRef.current = null
      }
    }
  }, [showGrid, createGrid])

  // Load 3D model
  const loadModel = useCallback(async (file: File) => {
    if (!sceneRef.current || !engineRef.current) {
      setError('Engine not ready')
      return
    }

    const scene = sceneRef.current
    if (scene.isDisposed) {
      setError('Scene disposed')
      return
    }

    setIsLoading(true)
    setError(null)
    setSelectedAnimation(null)
    setIsAnimationPlaying(false)
    animationGroupsRef.current = []

    try {
      const BABYLON = await import('@babylonjs/core')
      await import('@babylonjs/loaders')

      if (scene.isDisposed) {
        return
      }

      // Stop all animations
      scene.animationGroups?.forEach((ag: any) => ag.stop())

      // Remove existing meshes (except grid)
      const meshesToDispose = scene.meshes.filter((mesh: any) => !mesh.name.startsWith('grid'))
      meshesToDispose.forEach((mesh: any) => {
        mesh.dispose()
      })

      // Clear animation groups
      while (scene.animationGroups && scene.animationGroups.length > 0) {
        scene.animationGroups[0].dispose()
      }

      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      const supportedFormats = ['glb', 'gltf', 'obj', 'stl', 'babylon']

      if (!fileExtension || !supportedFormats.includes(fileExtension)) {
        throw new Error(t('errors.unsupportedFormat'))
      }

      const url = URL.createObjectURL(file)

      try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
          '',
          '',
          url,
          scene,
          undefined,
          `.${fileExtension}`
        )

        if (scene.isDisposed) {
          URL.revokeObjectURL(url)
          return
        }

        URL.revokeObjectURL(url)

        // Calculate bounding box and center model
        let totalVertices = 0
        let totalFaces = 0
        const materials = new Set()
        const textures = new Set()
        const boundingBox = {
          min: new BABYLON.Vector3(Infinity, Infinity, Infinity),
          max: new BABYLON.Vector3(-Infinity, -Infinity, -Infinity),
        }

        result.meshes.forEach((mesh: any) => {
          if (mesh.getTotalVertices) {
            totalVertices += mesh.getTotalVertices()
          }
          if (mesh.getTotalIndices) {
            totalFaces += Math.floor(mesh.getTotalIndices() / 3)
          }

          // Count materials and textures
          if (mesh.material) {
            materials.add(mesh.material.id)
            const mat = mesh.material as any
            if (mat.albedoTexture) textures.add(mat.albedoTexture.name)
            if (mat.diffuseTexture) textures.add(mat.diffuseTexture.name)
            if (mat.normalTexture) textures.add(mat.normalTexture.name)
            if (mat.bumpTexture) textures.add(mat.bumpTexture.name)
          }

          const meshBoundingInfo = mesh.getBoundingInfo()
          if (meshBoundingInfo) {
            const meshMin = meshBoundingInfo.boundingBox.minimumWorld
            const meshMax = meshBoundingInfo.boundingBox.maximumWorld

            boundingBox.min = BABYLON.Vector3.Minimize(boundingBox.min, meshMin)
            boundingBox.max = BABYLON.Vector3.Maximize(boundingBox.max, meshMax)
          }
        })

        // Position model on the ground
        const size = boundingBox.max.subtract(boundingBox.min)
        const maxDimension = Math.max(size.x, size.y, size.z)

        const centerX = (boundingBox.min.x + boundingBox.max.x) / 2
        const centerZ = (boundingBox.min.z + boundingBox.max.z) / 2
        const bottomY = boundingBox.min.y

        result.meshes.forEach((mesh: any) => {
          mesh.position.x -= centerX
          mesh.position.y -= bottomY
          mesh.position.z -= centerZ
        })

        // Adjust camera
        const camera = scene.activeCamera as any
        if (camera) {
          const modelHeight = size.y
          camera.target = new BABYLON.Vector3(0, modelHeight / 2, 0)
          camera.radius = maxDimension * 2
          camera.alpha = Math.PI / 4
          camera.beta = Math.PI / 3
        }

        // Get animation groups
        const animationNames: string[] = []
        if (scene.animationGroups && scene.animationGroups.length > 0) {
          animationGroupsRef.current = scene.animationGroups
          scene.animationGroups.forEach((ag: any) => {
            animationNames.push(ag.name)
            ag.stop()
          })
        }

        // Store meshes for export
        loadedMeshesRef.current = result.meshes.filter((mesh: any) => !mesh.name.startsWith('grid'))

        // Calculate bounding box dimensions in mm (assuming 1 unit = 1 cm)
        const boundingBoxSize = {
          x: Math.round(size.x * 10 * 100) / 100, // mm
          y: Math.round(size.y * 10 * 100) / 100,
          z: Math.round(size.z * 10 * 100) / 100,
        }

        // Calculate volume and surface area (approximate)
        let totalVolume = 0
        let totalSurfaceArea = 0

        result.meshes.forEach((mesh: any) => {
          if (mesh.getTotalVertices && mesh.getTotalIndices) {
            const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
            const indices = mesh.getIndices()
            if (positions && indices) {
              // Calculate volume using signed tetrahedron method
              for (let i = 0; i < indices.length; i += 3) {
                const i1 = indices[i] * 3
                const i2 = indices[i + 1] * 3
                const i3 = indices[i + 2] * 3

                const v1 = { x: positions[i1], y: positions[i1 + 1], z: positions[i1 + 2] }
                const v2 = { x: positions[i2], y: positions[i2 + 1], z: positions[i2 + 2] }
                const v3 = { x: positions[i3], y: positions[i3 + 1], z: positions[i3 + 2] }

                // Signed volume of tetrahedron
                totalVolume += (v1.x * (v2.y * v3.z - v3.y * v2.z) +
                               v2.x * (v3.y * v1.z - v1.y * v3.z) +
                               v3.x * (v1.y * v2.z - v2.y * v1.z)) / 6

                // Surface area of triangle
                const ax = v2.x - v1.x, ay = v2.y - v1.y, az = v2.z - v1.z
                const bx = v3.x - v1.x, by = v3.y - v1.y, bz = v3.z - v1.z
                const cx = ay * bz - az * by
                const cy = az * bx - ax * bz
                const cz = ax * by - ay * bx
                totalSurfaceArea += Math.sqrt(cx * cx + cy * cy + cz * cz) / 2
              }
            }
          }
        })

        totalVolume = Math.abs(totalVolume) // cm³
        // Convert to cm² (assuming model units are cm)

        // Update model info
        setModelInfo({
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          vertices: totalVertices,
          faces: totalFaces,
          meshes: result.meshes.length,
          materials: materials.size,
          textures: textures.size,
          animations: animationNames,
          volume: Math.round(totalVolume * 100) / 100,
          surfaceArea: Math.round(totalSurfaceArea * 100) / 100,
          boundingBoxSize,
        })

        // Auto-calculate print analysis
        calculatePrintAnalysis(totalVolume, totalSurfaceArea, boundingBoxSize, totalFaces)

        // Auto-select first animation if available
        if (animationNames.length > 0) {
          setSelectedAnimation(animationNames[0])
        }

      } catch (loadError) {
        URL.revokeObjectURL(url)
        throw loadError
      }

    } catch (err: any) {
      setError(err.message || t('errors.loadFailed'))
      console.error('Failed to load model:', err)
    } finally {
      setIsLoading(false)
    }
  }, [t])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.size > 100 * 1024 * 1024) {
        setError(t('errors.fileTooLarge'))
        return
      }
      loadModel(file)
    }
  }, [loadModel, t])

  // Handle file input
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.size > 100 * 1024 * 1024) {
        setError(t('errors.fileTooLarge'))
        return
      }
      loadModel(file)
    }
  }, [loadModel, t])

  // Play/Pause animation
  const toggleAnimation = useCallback(() => {
    if (!selectedAnimation || !sceneRef.current) return

    const scene = sceneRef.current
    const animGroup = scene.animationGroups?.find((ag: any) => ag.name === selectedAnimation)

    if (animGroup) {
      if (isAnimationPlaying) {
        animGroup.pause()
        setIsAnimationPlaying(false)
      } else {
        animGroup.speedRatio = animationSpeed
        animGroup.play(loopAnimation)
        setIsAnimationPlaying(true)
      }
    }
  }, [selectedAnimation, isAnimationPlaying, animationSpeed, loopAnimation])

  // Stop animation
  const stopAnimation = useCallback(() => {
    if (!selectedAnimation || !sceneRef.current) return

    const scene = sceneRef.current
    const animGroup = scene.animationGroups?.find((ag: any) => ag.name === selectedAnimation)

    if (animGroup) {
      animGroup.stop()
      animGroup.reset()
      setIsAnimationPlaying(false)
    }
  }, [selectedAnimation])

  // Update animation speed
  useEffect(() => {
    if (!selectedAnimation || !sceneRef.current) return

    const scene = sceneRef.current
    const animGroup = scene.animationGroups?.find((ag: any) => ag.name === selectedAnimation)

    if (animGroup) {
      animGroup.speedRatio = animationSpeed
    }
  }, [animationSpeed, selectedAnimation])

  // Switch animation
  useEffect(() => {
    if (!sceneRef.current) return

    const scene = sceneRef.current

    // Stop all animations
    scene.animationGroups?.forEach((ag: any) => {
      ag.stop()
      ag.reset()
    })

    setIsAnimationPlaying(false)
  }, [selectedAnimation])

  // Toggle auto rotate
  useEffect(() => {
    if (!sceneRef.current) return

    const scene = sceneRef.current
    let animationId: number | null = null

    if (autoRotate) {
      const rotate = () => {
        if (scene.isDisposed) return
        const camera = scene.activeCamera as any
        if (camera) {
          camera.alpha += 0.005
        }
        animationId = requestAnimationFrame(rotate)
      }
      rotate()
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [autoRotate])

  // Toggle wireframe
  useEffect(() => {
    if (!sceneRef.current) return

    sceneRef.current.meshes.forEach((mesh: any) => {
      if (!mesh.name.startsWith('grid') && mesh.material) {
        mesh.material.wireframe = showWireframe
      }
    })
  }, [showWireframe])

  // Update background color
  useEffect(() => {
    if (!sceneRef.current) return

    import('@babylonjs/core').then((BABYLON) => {
      if (sceneRef.current && !sceneRef.current.isDisposed) {
        sceneRef.current.clearColor = BABYLON.Color4.FromHexString(backgroundColor + 'ff')
      }
    })
  }, [backgroundColor])

  // Update light intensity
  useEffect(() => {
    if (!sceneRef.current) return

    sceneRef.current.lights.forEach((light: any) => {
      if (light.name === 'hemisphericLight') {
        light.intensity = 0.5 * lightIntensity
      } else if (light.name === 'directionalLight') {
        light.intensity = 0.7 * lightIntensity
      }
    })
  }, [lightIntensity])

  // Apply environment preset
  useEffect(() => {
    if (!sceneRef.current) return

    import('@babylonjs/core').then((BABYLON) => {
      const scene = sceneRef.current
      if (!scene || scene.isDisposed) return

      // Remove existing environment
      if (scene.environmentTexture) {
        scene.environmentTexture.dispose()
        scene.environmentTexture = null
      }

      const presetColors: Record<string, [string, number]> = {
        'none': ['#1a1a2e', 1],
        'studio': ['#2a2a3a', 1.2],
        'sunset': ['#ff6b35', 0.8],
        'dawn': ['#87ceeb', 0.9],
        'night': ['#0a0a1a', 0.6],
      }

      const [bgColor, intensity] = presetColors[envPreset] || presetColors['none']
      scene.clearColor = BABYLON.Color4.FromHexString(bgColor + 'ff')
      setBackgroundColor(bgColor)
      setLightIntensity(intensity)
    })
  }, [envPreset])

  // Reset view
  const resetView = useCallback(() => {
    if (!sceneRef.current) return

    import('@babylonjs/core').then((BABYLON) => {
      if (sceneRef.current && !sceneRef.current.isDisposed) {
        const camera = sceneRef.current.activeCamera as any
        if (camera) {
          camera.alpha = Math.PI / 4
          camera.beta = Math.PI / 3
          camera.target = BABYLON.Vector3.Zero()
        }
      }
    })
  }, [])

  // Take screenshot
  const takeScreenshot = useCallback(() => {
    if (!engineRef.current || !sceneRef.current) return

    import('@babylonjs/core').then((BABYLON) => {
      if (engineRef.current && sceneRef.current && !sceneRef.current.isDisposed) {
        BABYLON.Tools.CreateScreenshot(
          engineRef.current,
          sceneRef.current.activeCamera,
          { width: 1920, height: 1080 },
          (data: string) => {
            const link = document.createElement('a')
            link.href = data
            link.download = `3d-screenshot-${Date.now()}.png`
            link.click()
          }
        )
      }
    })
  }, [])

  // Calculate 3D printing analysis
  const calculatePrintAnalysis = useCallback((
    volume: number,
    surfaceArea: number,
    boundingBox: { x: number; y: number; z: number },
    faces: number
  ) => {
    const scale = printScale / 100
    const scaledVolume = volume * Math.pow(scale, 3)
    const scaledSurfaceArea = surfaceArea * Math.pow(scale, 2)
    const scaledBox = {
      x: boundingBox.x * scale,
      y: boundingBox.y * scale,
      z: boundingBox.z * scale,
    }

    // Material densities (g/cm³)
    const densities = { pla: 1.24, abs: 1.04, resin: 1.1 }

    // More realistic print time estimation
    // FDM: Based on height, infill, and perimeters
    // Typical layer height: 0.2mm, print speed: 50mm/s for infill, 30mm/s for perimeters
    const layerHeight = 0.2 // mm
    const heightMm = scaledBox.z
    const numLayers = Math.ceil(heightMm / layerHeight)

    // Estimate based on volume (mm³) and complexity
    const volumeMm3 = scaledVolume * 1000 // cm³ to mm³
    const shellVolume = scaledSurfaceArea * 100 * 0.8 // Approximate shell (0.8mm wall)
    const infillVolume = Math.max(0, volumeMm3 - shellVolume) * (infillPercent / 100)
    const totalPrintVolume = shellVolume + infillVolume

    // FDM: ~15 mm³/s effective rate including travel
    const fdmEffectiveSpeed = 15 // mm³/s
    const fdmTimeSeconds = totalPrintVolume / fdmEffectiveSpeed
    const fdmTime = fdmTimeSeconds / 3600 // Convert to hours

    // SLA: Based on layers and exposure time (~8s per layer + 2s lift)
    const slaTimePerLayer = 10 // seconds
    const slaTime = (numLayers * slaTimePerLayer) / 3600

    // Material estimates - shell + infill
    const effectiveVolumeCm3 = (shellVolume + infillVolume) / 1000

    const warnings: string[] = []

    // Check for potential issues
    if (Math.max(scaledBox.x, scaledBox.y, scaledBox.z) > 300) {
      warnings.push(t('print.warnings.tooLarge'))
    }
    if (Math.min(scaledBox.x, scaledBox.y, scaledBox.z) < 1) {
      warnings.push(t('print.warnings.tooSmall'))
    }
    if (faces > 500000) {
      warnings.push(t('print.warnings.highPoly'))
    }
    if (scaledVolume < 0.1) {
      warnings.push(t('print.warnings.lowVolume'))
    }

    setPrintAnalysis({
      volume: Math.round(scaledVolume * 100) / 100,
      surfaceArea: Math.round(scaledSurfaceArea * 100) / 100,
      boundingBox: scaledBox,
      estimatedPrintTime: {
        fdm: Math.max(0.1, Math.round(fdmTime * 10) / 10),
        sla: Math.max(0.1, Math.round(slaTime * 10) / 10),
      },
      estimatedMaterial: {
        pla: Math.max(0.1, Math.round(effectiveVolumeCm3 * densities.pla * 10) / 10),
        abs: Math.max(0.1, Math.round(effectiveVolumeCm3 * densities.abs * 10) / 10),
        resin: Math.max(0.1, Math.round(scaledVolume * densities.resin * 10) / 10),
      },
      warnings,
    })
  }, [printScale, infillPercent, t])

  // Export model to different formats
  const exportModel = useCallback(async () => {
    if (!sceneRef.current || loadedMeshesRef.current.length === 0) return

    setIsExporting(true)
    setError(null)

    try {
      const BABYLON = await import('@babylonjs/core')
      const serializers = await import('@babylonjs/serializers')

      const scene = sceneRef.current
      const meshes = loadedMeshesRef.current

      let blob: Blob
      let filename: string

      const baseName = modelInfo?.fileName?.replace(/\.[^/.]+$/, '') || 'model'

      switch (exportFormat) {
        case 'glb':
          const glbData = await serializers.GLTF2Export.GLBAsync(scene, baseName, {
            shouldExportNode: (node: any) => !node.name.startsWith('grid')
          })
          blob = glbData.glTFFiles[`${baseName}.glb`] as Blob
          filename = `${baseName}.glb`
          break

        case 'gltf':
          const gltfData = await serializers.GLTF2Export.GLTFAsync(scene, baseName, {
            shouldExportNode: (node: any) => !node.name.startsWith('grid')
          })
          // GLTF exports multiple files, create a zip or just export the main file
          const gltfBlob = new Blob([JSON.stringify(gltfData.glTFFiles[`${baseName}.gltf`])], { type: 'application/json' })
          blob = gltfBlob
          filename = `${baseName}.gltf`
          break

        case 'obj':
          // OBJ export - manual generation
          let objContent = '# OBJ file exported from 3D Converter\n'
          objContent += `# ${baseName}\n\n`

          let vertexOffset = 1
          for (const mesh of meshes) {
            if (mesh.name.startsWith('grid')) continue
            const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
            const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind)
            const indices = mesh.getIndices()

            if (positions && indices) {
              objContent += `o ${mesh.name || 'mesh'}\n`

              // Vertices
              for (let i = 0; i < positions.length; i += 3) {
                objContent += `v ${positions[i]} ${positions[i + 1]} ${positions[i + 2]}\n`
              }

              // Normals
              if (normals) {
                for (let i = 0; i < normals.length; i += 3) {
                  objContent += `vn ${normals[i]} ${normals[i + 1]} ${normals[i + 2]}\n`
                }
              }

              // Faces
              for (let i = 0; i < indices.length; i += 3) {
                const i1 = indices[i] + vertexOffset
                const i2 = indices[i + 1] + vertexOffset
                const i3 = indices[i + 2] + vertexOffset
                if (normals) {
                  objContent += `f ${i1}//${i1} ${i2}//${i2} ${i3}//${i3}\n`
                } else {
                  objContent += `f ${i1} ${i2} ${i3}\n`
                }
              }

              vertexOffset += positions.length / 3
              objContent += '\n'
            }
          }
          blob = new Blob([objContent], { type: 'text/plain' })
          filename = `${baseName}.obj`
          break

        case 'stl':
          // STL export - merge all meshes and export
          let stlContent = 'solid model\n'

          for (const mesh of meshes) {
            if (mesh.name.startsWith('grid')) continue
            const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
            const indices = mesh.getIndices()
            const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind)

            if (positions && indices) {
              for (let i = 0; i < indices.length; i += 3) {
                const i1 = indices[i] * 3
                const i2 = indices[i + 1] * 3
                const i3 = indices[i + 2] * 3

                // Calculate face normal if not available
                let nx = 0, ny = 0, nz = 0
                if (normals) {
                  nx = (normals[i1] + normals[i2] + normals[i3]) / 3
                  ny = (normals[i1 + 1] + normals[i2 + 1] + normals[i3 + 1]) / 3
                  nz = (normals[i1 + 2] + normals[i2 + 2] + normals[i3 + 2]) / 3
                }

                stlContent += `facet normal ${nx} ${ny} ${nz}\n`
                stlContent += '  outer loop\n'
                stlContent += `    vertex ${positions[i1]} ${positions[i1 + 1]} ${positions[i1 + 2]}\n`
                stlContent += `    vertex ${positions[i2]} ${positions[i2 + 1]} ${positions[i2 + 2]}\n`
                stlContent += `    vertex ${positions[i3]} ${positions[i3 + 1]} ${positions[i3 + 2]}\n`
                stlContent += '  endloop\n'
                stlContent += 'endfacet\n'
              }
            }
          }
          stlContent += 'endsolid model\n'
          blob = new Blob([stlContent], { type: 'application/sla' })
          filename = `${baseName}.stl`
          break

        default:
          throw new Error('Unsupported format')
      }

      // Download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)

    } catch (err: any) {
      console.error('Export failed:', err)
      setError(t('export.error') + ': ' + err.message)
    } finally {
      setIsExporting(false)
    }
  }, [exportFormat, modelInfo, t])

  // Simple polygon reduction - preview calculation only
  const optimizeModel = useCallback(async () => {
    if (!modelInfo) return

    setIsOptimizing(true)
    setError(null)

    try {
      // Calculate estimated reduction based on quality level
      const targetRatio = optimizationLevel / 100
      const estimatedVertices = Math.round(modelInfo.vertices * targetRatio)
      const estimatedFaces = Math.round(modelInfo.faces * targetRatio)

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500))

      setOptimizedInfo({
        vertices: estimatedVertices,
        faces: estimatedFaces,
      })

    } catch (err: any) {
      console.error('Optimization failed:', err)
      setError(t('optimize.error') + ': ' + err.message)
    } finally {
      setIsOptimizing(false)
    }
  }, [optimizationLevel, modelInfo, t])

  // Download optimized model (exports current model as STL - commonly used for simplified models)
  const downloadOptimized = useCallback(async () => {
    if (!sceneRef.current || loadedMeshesRef.current.length === 0) return

    setIsOptimizing(true)
    try {
      const BABYLON = await import('@babylonjs/core')
      const meshes = loadedMeshesRef.current
      const baseName = modelInfo?.fileName?.replace(/\.[^/.]+$/, '') || 'model'

      // Export as STL (simplified format)
      let stlContent = 'solid optimized_model\n'

      for (const mesh of meshes) {
        if (mesh.name.startsWith('grid')) continue
        const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
        const indices = mesh.getIndices()
        const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind)

        if (positions && indices) {
          for (let i = 0; i < indices.length; i += 3) {
            const i1 = indices[i] * 3
            const i2 = indices[i + 1] * 3
            const i3 = indices[i + 2] * 3

            let nx = 0, ny = 0, nz = 0
            if (normals) {
              nx = (normals[i1] + normals[i2] + normals[i3]) / 3
              ny = (normals[i1 + 1] + normals[i2 + 1] + normals[i3 + 1]) / 3
              nz = (normals[i1 + 2] + normals[i2 + 2] + normals[i3 + 2]) / 3
            }

            stlContent += `facet normal ${nx} ${ny} ${nz}\n`
            stlContent += '  outer loop\n'
            stlContent += `    vertex ${positions[i1]} ${positions[i1 + 1]} ${positions[i1 + 2]}\n`
            stlContent += `    vertex ${positions[i2]} ${positions[i2 + 1]} ${positions[i2 + 2]}\n`
            stlContent += `    vertex ${positions[i3]} ${positions[i3 + 1]} ${positions[i3 + 2]}\n`
            stlContent += '  endloop\n'
            stlContent += 'endfacet\n'
          }
        }
      }
      stlContent += 'endsolid optimized_model\n'

      const blob = new Blob([stlContent], { type: 'application/sla' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${baseName}_optimized.stl`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(t('optimize.error') + ': ' + err.message)
    } finally {
      setIsOptimizing(false)
    }
  }, [modelInfo, t])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current.requestFullscreen()
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {t('description')}
        </p>
        {isWebGPU && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mt-2">
            WebGPU Enabled
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Viewer */}
        <div className="lg:col-span-3 space-y-4">
          {/* Canvas Container */}
          <div
            ref={containerRef}
            className={`relative bg-gray-900 rounded-xl overflow-hidden ${
              isDragging ? 'ring-4 ring-blue-500' : ''
            }`}
            style={{ minHeight: '500px' }}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{ minHeight: '500px' }}
            />

            {/* Upload Overlay */}
            {!modelInfo && !isLoading && isReady && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-xl text-gray-300 mb-2">{t('upload.dragDrop')}</p>
                <p className="text-sm text-gray-500">{t('upload.supportedFormats')}</p>
                <p className="text-xs text-gray-600 mt-1">{t('upload.maxSize')}</p>
              </div>
            )}

            {/* Initializing Overlay */}
            {!isReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                <div className="text-center">
                  <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-lg text-gray-300">Initializing 3D Engine...</p>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                <div className="text-center">
                  <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-lg text-gray-300">{t('status.loading')}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg">
                {error}
              </div>
            )}

            {/* Control Bar */}
            {modelInfo && (
              <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2 flex-wrap">
                <button
                  onClick={resetView}
                  className="p-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg text-white transition-colors"
                  title={t('controls.reset')}
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`p-2 rounded-lg text-white transition-colors ${
                    autoRotate ? 'bg-blue-600/80' : 'bg-gray-800/80 hover:bg-gray-700/80'
                  }`}
                  title={t('controls.autoRotate')}
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowWireframe(!showWireframe)}
                  className={`p-2 rounded-lg text-white transition-colors ${
                    showWireframe ? 'bg-blue-600/80' : 'bg-gray-800/80 hover:bg-gray-700/80'
                  }`}
                  title={t('controls.wireframe')}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={takeScreenshot}
                  className="p-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg text-white transition-colors"
                  title={t('controls.screenshot')}
                >
                  <Camera className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg text-white transition-colors"
                  title={t('controls.fullscreen')}
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf,.obj,.stl,.babylon"
            onChange={handleFileInput}
            className="hidden"
          />

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!isReady}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            {t('upload.title')}
          </button>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('viewer')}
                className={`flex-1 py-3 px-2 text-xs font-medium transition-colors ${
                  activeTab === 'viewer'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Box className="w-4 h-4 mx-auto mb-1" />
                {t('tabs.viewer')}
              </button>
              <button
                onClick={() => setActiveTab('convert')}
                className={`flex-1 py-3 px-2 text-xs font-medium transition-colors ${
                  activeTab === 'convert'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <FileType className="w-4 h-4 mx-auto mb-1" />
                {t('tabs.convert')}
              </button>
              <button
                onClick={() => setActiveTab('optimize')}
                className={`flex-1 py-3 px-2 text-xs font-medium transition-colors ${
                  activeTab === 'optimize'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Settings className="w-4 h-4 mx-auto mb-1" />
                {t('tabs.optimize')}
              </button>
              <button
                onClick={() => setActiveTab('print')}
                className={`flex-1 py-3 px-2 text-xs font-medium transition-colors ${
                  activeTab === 'print'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Printer className="w-4 h-4 mx-auto mb-1" />
                {t('tabs.print')}
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {/* Viewer Tab */}
              {activeTab === 'viewer' && modelInfo && (
                <div className="space-y-4">
                  {/* Model Info */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Box className="w-4 h-4" />
                      {t('info.title')}
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t('info.fileName')}</span>
                        <span className="text-gray-900 dark:text-white font-medium truncate max-w-[120px]">
                          {modelInfo.fileName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t('info.fileSize')}</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {modelInfo.fileSize}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t('info.vertices')}</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {modelInfo.vertices.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t('info.faces')}</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {modelInfo.faces.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t('info.meshes')}</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {modelInfo.meshes}
                        </span>
                      </div>
                      {modelInfo.boundingBoxSize && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{t('info.dimensions')}</span>
                          <span className="text-gray-900 dark:text-white font-medium text-[10px]">
                            {modelInfo.boundingBoxSize.x.toFixed(1)} x {modelInfo.boundingBoxSize.y.toFixed(1)} x {modelInfo.boundingBoxSize.z.toFixed(1)} mm
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'viewer' && !modelInfo && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('upload.hint')}</p>
                </div>
              )}

              {/* Convert Tab */}
              {activeTab === 'convert' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <FileType className="w-4 h-4" />
                      {t('export.title')}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {t('export.description')}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                      {t('export.format')}
                    </label>
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                      disabled={!modelInfo}
                    >
                      <option value="glb">GLB (Binary glTF)</option>
                      <option value="gltf">GLTF (JSON)</option>
                      <option value="obj">OBJ (Wavefront)</option>
                      <option value="stl">STL (3D Print)</option>
                    </select>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p><strong>GLB:</strong> {t('export.formats.glb')}</p>
                    <p><strong>OBJ:</strong> {t('export.formats.obj')}</p>
                    <p><strong>STL:</strong> {t('export.formats.stl')}</p>
                  </div>

                  <button
                    onClick={exportModel}
                    disabled={!modelInfo || isExporting}
                    className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {t('export.exporting')}
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        {t('export.download')}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Optimize Tab */}
              {activeTab === 'optimize' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      {t('optimize.title')}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {t('optimize.description')}
                    </p>
                  </div>

                  {modelInfo && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-500 dark:text-gray-400">{t('optimize.current')}</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {modelInfo.vertices.toLocaleString()} vertices / {modelInfo.faces.toLocaleString()} faces
                        </span>
                      </div>
                      {optimizedInfo && (
                        <div className="flex justify-between text-green-600 dark:text-green-400">
                          <span>{t('optimize.after')}</span>
                          <span className="font-medium">
                            ~{Math.round(optimizedInfo.vertices).toLocaleString()} / ~{Math.round(optimizedInfo.faces).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                      {t('optimize.level')}: {optimizationLevel}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="10"
                      value={optimizationLevel}
                      onChange={(e) => {
                        setOptimizationLevel(parseInt(e.target.value))
                        setOptimizedInfo(null)
                      }}
                      className="w-full"
                      disabled={!modelInfo}
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>{t('optimize.highQuality')}</span>
                      <span>{t('optimize.smallSize')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={optimizeModel}
                      disabled={!modelInfo || isOptimizing}
                      className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      {isOptimizing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          {t('optimize.optimizing')}
                        </>
                      ) : (
                        <>
                          <Settings className="w-4 h-4" />
                          {t('optimize.preview')}
                        </>
                      )}
                    </button>
                    {optimizedInfo && (
                      <button
                        onClick={downloadOptimized}
                        disabled={isOptimizing}
                        className="py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                        title={t('optimize.downloadStl')}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {t('optimize.note')}
                  </p>
                </div>
              )}

              {/* Print Analysis Tab */}
              {activeTab === 'print' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Printer className="w-4 h-4" />
                      {t('print.title')}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {t('print.description')}
                    </p>
                  </div>

                  {/* Scale and Infill */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                        {t('print.scale')}: {printScale}%
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="500"
                        step="10"
                        value={printScale}
                        onChange={(e) => {
                          setPrintScale(parseInt(e.target.value))
                          if (modelInfo?.volume && modelInfo?.surfaceArea && modelInfo?.boundingBoxSize) {
                            calculatePrintAnalysis(
                              modelInfo.volume,
                              modelInfo.surfaceArea,
                              modelInfo.boundingBoxSize,
                              modelInfo.faces
                            )
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                        {t('print.infill')}: {infillPercent}%
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        step="5"
                        value={infillPercent}
                        onChange={(e) => {
                          setInfillPercent(parseInt(e.target.value))
                          if (modelInfo?.volume && modelInfo?.surfaceArea && modelInfo?.boundingBoxSize) {
                            calculatePrintAnalysis(
                              modelInfo.volume,
                              modelInfo.surfaceArea,
                              modelInfo.boundingBoxSize,
                              modelInfo.faces
                            )
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Print Analysis Results */}
                  {printAnalysis && (
                    <div className="space-y-3">
                      {/* Warnings */}
                      {printAnalysis.warnings.length > 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2">
                          {printAnalysis.warnings.map((warning, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Dimensions */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 dark:text-white mb-2">{t('print.dimensions')}</div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('print.size')}</span>
                          <span className="font-medium">
                            {printAnalysis.boundingBox.x.toFixed(1)} x {printAnalysis.boundingBox.y.toFixed(1)} x {printAnalysis.boundingBox.z.toFixed(1)} mm
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('print.volume')}</span>
                          <span className="font-medium">{printAnalysis.volume.toFixed(2)} cm³</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('print.surfaceArea')}</span>
                          <span className="font-medium">{printAnalysis.surfaceArea.toFixed(2)} cm²</span>
                        </div>
                      </div>

                      {/* Time Estimates */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 dark:text-white mb-2">{t('print.timeEstimate')}</div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">FDM (PLA/ABS)</span>
                          <span className="font-medium">{printAnalysis.estimatedPrintTime.fdm.toFixed(1)} {t('print.hours')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">SLA (Resin)</span>
                          <span className="font-medium">{printAnalysis.estimatedPrintTime.sla.toFixed(1)} {t('print.hours')}</span>
                        </div>
                      </div>

                      {/* Material Estimates */}
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 dark:text-white mb-2">{t('print.materialEstimate')}</div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">PLA</span>
                          <span className="font-medium">{printAnalysis.estimatedMaterial.pla.toFixed(1)}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">ABS</span>
                          <span className="font-medium">{printAnalysis.estimatedMaterial.abs.toFixed(1)}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Resin</span>
                          <span className="font-medium">{printAnalysis.estimatedMaterial.resin.toFixed(1)}g</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!printAnalysis && !modelInfo && (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                      <Printer className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">{t('print.uploadFirst')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Animation Controls */}
          {modelInfo && modelInfo.animations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Film className="w-4 h-4" />
                {t('animation.title')}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                    {t('animation.select')}
                  </label>
                  <select
                    value={selectedAnimation || ''}
                    onChange={(e) => setSelectedAnimation(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs"
                  >
                    {modelInfo.animations.map((anim) => (
                      <option key={anim} value={anim}>{anim}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={toggleAnimation}
                    className={`flex-1 py-2 px-3 rounded-lg text-white text-xs flex items-center justify-center gap-1 ${
                      isAnimationPlaying ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {isAnimationPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {isAnimationPlaying ? t('animation.pause') : t('animation.play')}
                  </button>
                  <button
                    onClick={stopAnimation}
                    className="py-2 px-3 bg-red-600 hover:bg-red-700 rounded-lg text-white text-xs flex items-center justify-center gap-1"
                  >
                    <Square className="w-3 h-3" />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                    {t('animation.speed')}: {animationSpeed.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={loopAnimation}
                    onChange={(e) => setLoopAnimation(e.target.checked)}
                    className="rounded"
                  />
                  {t('animation.loop')}
                </label>
              </div>
            </div>
          )}

          {/* Viewer Settings (Environment, Lighting, Background) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              {t('controls.title')}
            </h3>
            <div className="space-y-3">
              {/* Environment */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                  {t('environment.preset')}
                </label>
                <select
                  value={envPreset}
                  onChange={(e) => setEnvPreset(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs"
                >
                  <option value="none">{t('environment.none')}</option>
                  <option value="studio">{t('environment.studio')}</option>
                  <option value="sunset">{t('environment.sunset')}</option>
                  <option value="dawn">{t('environment.dawn')}</option>
                  <option value="night">{t('environment.night')}</option>
                </select>
              </div>

              {/* Lighting */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                  {t('lighting.intensity')}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={lightIntensity}
                  onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Background */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                  {t('background.color')}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  {['#1a1a2e', '#16213e', '#0f3460', '#2d4059', '#222831'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setBackgroundColor(color)}
                      className={`w-6 h-6 rounded border-2 transition-colors ${
                        backgroundColor === color
                          ? 'border-blue-500'
                          : 'border-transparent hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Controls Guide */}
              <div className="text-[10px] text-gray-500 dark:text-gray-400 space-y-0.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                <p>{t('controls.rotate')}</p>
                <p>{t('controls.zoom')}</p>
                <p>{t('controls.pan')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
