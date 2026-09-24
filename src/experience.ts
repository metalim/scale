import * as THREE from 'three'
import { createScaleWorld, type ScaleWorld } from './scenes'
import { clampLog, HUMAN_LOG, MAX_LOG, MIN_LOG, sceneAt, type ScaleScene } from './scale'

export interface ExperienceState {
  log: number
  scene: ScaleScene
  auto: boolean
  reducedMotion: boolean
  canDive: boolean
}

interface ExperienceOptions {
  container: HTMLElement
  onState: (state: ExperienceState) => void
}

const INSIDE_TARGET: Partial<Record<string, number>> = {
  human: -4.25,
  hand: -0.7,
  finger: -1.6,
  skin: -2.6,
  muscle: -3.5,
  capillary: -3.5,
  cell: -9.5,
  chromosome: -8.4,
  molecule: -10,
  atom: -14,
  nucleus: -15,
  earth: 7.05,
  sun: 13,
  solarSystem: 16.5,
  nebula: 19.4,
  stellarCloud: 21,
  galaxy: 22.4,
  localGroup: 26.3,
}

export class ScaleExperience {
  private readonly container: HTMLElement
  private readonly onState: (state: ExperienceState) => void
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.01, 250)
  private readonly renderer: THREE.WebGLRenderer
  private readonly clock = new THREE.Clock()
  private readonly world: ScaleWorld
  private readonly ambient = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial())
  private readonly raycaster = new THREE.Raycaster()
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private currentLog = HUMAN_LOG
  private targetLog = HUMAN_LOG
  private auto = true
  private startDelay = 2.6
  private pointerX = 0
  private pointerY = 0
  private pointerDown: { x: number; y: number; log: number } | null = null
  private animationFrame = 0
  private disposed = false
  private lastStateScene = ''

  constructor(options: ExperienceOptions) {
    this.container = options.container
    this.onState = options.onState
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    this.renderer.setClearColor(0x050c11, 0)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.12
    this.renderer.domElement.className = 'world-canvas'
    this.renderer.domElement.setAttribute('aria-label', 'Интерактивный мир реальных размеров')
    this.container.prepend(this.renderer.domElement)

    this.camera.position.set(0, 0, 3.35)
    this.camera.lookAt(0, 0, 0)
    this.scene.add(this.camera)
    this.scene.add(new THREE.AmbientLight(new THREE.Color('#a6c8d4'), 0.48))
    this.scene.add(new THREE.DirectionalLight('#d8fff3', 1.8))
    this.scene.add(new THREE.PointLight('#4dbbff', 1.3, 20))

    this.world = createScaleWorld()
    this.scene.add(this.world.root)
    this.createAmbientField()
    this.bindEvents()
    this.resize()
    this.emitState()
    this.animate()
  }

  private createAmbientField(): void {
    const count = 1400
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2
      const radius = 3.2 + Math.random() * 4.5
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = (Math.random() - 0.5) * 7
      positions[i * 3 + 2] = -2 - Math.random() * 8
    }
    this.ambient.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = this.ambient.material as THREE.PointsMaterial
    material.color = new THREE.Color('#b8d8e8')
    material.size = 0.009
    material.sizeAttenuation = true
    material.transparent = true
    material.opacity = 0.34
    material.depthWrite = false
    this.scene.add(this.ambient)
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.resize)
    const canvas = this.renderer.domElement
    canvas.addEventListener('wheel', this.onWheel, { passive: false })
    canvas.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('dblclick', this.diveIntoScene)
    window.addEventListener('keydown', this.onKeyDown)
  }

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault()
    this.auto = false
    this.startDelay = 0
    const delta = Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY), 120)
    this.targetLog = clampLog(this.targetLog - delta * 0.0022)
    this.emitState()
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.pointerDown = { x: event.clientX, y: event.clientY, log: this.targetLog }
    this.renderer.domElement.setPointerCapture(event.pointerId)
  }

  private onPointerMove = (event: PointerEvent): void => {
    this.pointerX = (event.clientX / window.innerWidth - 0.5) * 2
    this.pointerY = (event.clientY / window.innerHeight - 0.5) * 2
    if (!this.pointerDown) return
    const distanceY = event.clientY - this.pointerDown.y
    const distanceX = event.clientX - this.pointerDown.x
    if (Math.hypot(distanceX, distanceY) > 7) {
      this.auto = false
      this.startDelay = 0
      this.targetLog = clampLog(this.pointerDown.log - distanceY * 0.018)
      this.emitState()
    }
  }

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.pointerDown) return
    const distance = Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y)
    if (distance < 7) this.selectAt(event.clientX, event.clientY)
    this.pointerDown = null
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null
    if (target?.tagName === 'INPUT' || target?.tagName === 'BUTTON') return
    if (event.code === 'Space') {
      event.preventDefault()
      this.toggleAuto()
    }
    if (event.key.toLowerCase() === 'r') this.reset()
    if (event.key === 'ArrowDown') this.nudge(-1)
    if (event.key === 'ArrowUp') this.nudge(1)
  }

  private selectAt(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(pointer, this.camera)
    const visible = Object.values(this.world.groups).filter(Boolean) as THREE.Group[]
    const intersections = this.raycaster.intersectObjects(visible, true)
    if (!intersections.length) return
    let selected: THREE.Object3D | null = intersections[0].object
    while (selected && typeof selected.userData.logSize !== 'number') selected = selected.parent
    if (selected) this.diveTo(typeof selected.userData.logSize === 'number' ? selected.userData.logSize : this.currentLog)
  }

  private diveIntoScene = (): void => {
    const scene = sceneAt(this.currentLog)
    const target = INSIDE_TARGET[scene.kind]
    if (target !== undefined) this.diveTo(target)
  }

  private diveTo(log: number): void {
    this.auto = false
    this.startDelay = 0
    this.targetLog = clampLog(log)
    this.emitState()
  }

  private nudge(direction: -1 | 1): void {
    this.auto = false
    this.startDelay = 0
    this.targetLog = clampLog(this.targetLog + direction * 0.45)
    this.emitState()
  }

  toggleAuto(): void {
    if (this.currentLog >= MAX_LOG - 0.15) this.reset()
    this.auto = !this.auto
    this.startDelay = 0
    this.emitState()
  }

  reset(): void {
    this.auto = true
    this.startDelay = 2.2
    this.currentLog = HUMAN_LOG
    this.targetLog = HUMAN_LOG
    this.emitState()
  }

  jumpTo(log: number): void {
    this.auto = false
    this.startDelay = 0
    this.targetLog = clampLog(log)
    this.emitState()
  }

  private resize = (): void => {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  private animate = (): void => {
    if (this.disposed) return
    const delta = Math.min(this.clock.getDelta(), 0.05)
    const elapsed = this.clock.elapsedTime

    if (this.startDelay > 0) {
      this.startDelay -= delta
    } else if (this.auto) {
      const ease = 1 - 0.32 * Math.exp(-Math.pow((this.currentLog - 0.23) / 2.2, 2))
      this.targetLog = Math.min(MAX_LOG, this.targetLog + delta * 0.16 * ease)
    }

    const smoothing = this.reducedMotion ? 1 : 1 - Math.exp(-delta * (this.auto ? 1.45 : 2.8))
    this.currentLog = THREE.MathUtils.lerp(this.currentLog, this.targetLog, smoothing)
    this.world.update(this.currentLog, elapsed)

    const parallax = this.reducedMotion ? 0 : 1
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.pointerX * 0.07 * parallax, 0.025)
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, -this.pointerY * 0.045 * parallax, 0.025)
    this.camera.lookAt(0, 0, 0)
    this.ambient.rotation.z = elapsed * 0.003

    this.renderer.render(this.scene, this.camera)
    this.emitState()
    this.animationFrame = requestAnimationFrame(this.animate)
  }

  private emitState(): void {
    const scene = sceneAt(this.currentLog)
    this.onState({ log: this.currentLog, scene, auto: this.auto, reducedMotion: this.reducedMotion, canDive: INSIDE_TARGET[scene.kind] !== undefined })
  }

  destroy(): void {
    this.disposed = true
    cancelAnimationFrame(this.animationFrame)
    window.removeEventListener('resize', this.resize)
    this.renderer.domElement.removeEventListener('wheel', this.onWheel)
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('keydown', this.onKeyDown)
    this.world.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
