import * as THREE from 'three'
import type { ScaleScene, SceneKind } from './scale'
import { SCENES } from './scale'

type SceneMap = Partial<Record<SceneKind, THREE.Group>>

const white = new THREE.Color('#eaf7ff')
const color = (value: string) => new THREE.Color(value)

function solid(value: string, opacity = 1, emissiveIntensity = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: value,
    roughness: 0.52,
    metalness: 0.12,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 0.95,
    emissive: color(value),
    emissiveIntensity,
  })
}

function glow(value: string, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: value,
    transparent: true,
    opacity,
    blending: opacity < 1 ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
  })
}

function line(points: THREE.Vector3[], value: string, opacity = 0.75): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: value,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  return new THREE.Line(geometry, material)
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position = [0, 0, 0] as [number, number, number],
): THREE.Mesh {
  const object = new THREE.Mesh(geometry, material)
  object.position.set(...position)
  return object
}

function tube(
  from: THREE.Vector3,
  to: THREE.Vector3,
  value: string,
  radius: number,
  opacity = 1,
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(to, from)
  const object = mesh(
    new THREE.CapsuleGeometry(radius, direction.length(), 6, 10),
    solid(value, opacity, opacity * 0.18),
    from.clone().add(to).multiplyScalar(0.5).toArray(),
  )
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
  return object
}

function particleCloud(
  count: number,
  radius: number,
  value: string,
  size: number,
  seed: number,
  opacity = 0.8,
): THREE.Points {
  const random = mulberry32(seed)
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const theta = random() * Math.PI * 2
    const phi = Math.acos(2 * random() - 1)
    const shell = radius * (0.55 + Math.pow(random(), 0.35) * 0.45)
    positions[i * 3] = shell * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = shell * Math.cos(phi) * 0.72
    positions[i * 3 + 2] = shell * Math.sin(phi) * Math.sin(theta)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: value,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  return new THREE.Points(geometry, material)
}

function mulberry32(seed: number): () => number {
  return () => {
    let value = seed += 0x6d2b79f5
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

function orbitalCloud(count: number, inner: number, outer: number, value: string, seed: number): THREE.Points {
  const random = mulberry32(seed)
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2
    const radius = inner + random() * (outer - inner)
    const y = (random() - 0.5) * 0.08 * radius
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = Math.sin(angle) * radius
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({ color: value, size: 0.018, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
  return new THREE.Points(geometry, material)
}

function buildProton(): THREE.Group {
  const group = new THREE.Group()
  group.add(particleCloud(900, 0.88, '#6ca8ff', 0.018, 2, 0.6))
  const quarks: Array<[string, THREE.Vector3]> = [
    ['#ff6b87', new THREE.Vector3(-0.28, 0.15, 0.2)],
    ['#5ce3bc', new THREE.Vector3(0.3, 0.18, 0.08)],
    ['#ca80ff', new THREE.Vector3(0.02, -0.3, 0.16)],
  ]
  quarks.forEach(([value, position], index) => {
    group.add(mesh(new THREE.IcosahedronGeometry(0.19, 3), glow(value, 0.9), position.toArray()))
    const ringPoints = Array.from({ length: 65 }, (_, point) => {
      const angle = (point / 64) * Math.PI * 2
      return new THREE.Vector3(
        position.x + Math.cos(angle + index) * 0.28,
        position.y + Math.sin(angle * 2) * 0.12,
        position.z + Math.sin(angle) * 0.28,
      )
    })
    group.add(line(ringPoints, value, 0.45))
  })
  return group
}

function buildNucleus(): THREE.Group {
  const group = new THREE.Group()
  group.add(mesh(new THREE.SphereGeometry(0.95, 40, 24), solid('#22415e', 0.12)))
  const random = mulberry32(8)
  for (let i = 0; i < 38; i += 1) {
    const theta = random() * Math.PI * 2
    const phi = Math.acos(2 * random() - 1)
    const r = 0.68 * Math.cbrt(random())
    const point = new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi))
    group.add(mesh(new THREE.SphereGeometry(0.13 + random() * 0.045, 12, 8), solid(i % 3 ? '#7aa6d8' : '#e7859b', 0.88), point.toArray()))
  }
  for (let i = 0; i < 5; i += 1) {
    const points = Array.from({ length: 90 }, (_, index) => {
      const angle = (index / 89) * Math.PI * 2
      return new THREE.Vector3(Math.cos(angle) * (0.86 + i * 0.03), Math.sin(angle * 1.4) * 0.1, Math.sin(angle) * (0.86 + i * 0.03))
    })
    group.add(line(points, '#6fc7ff', 0.12))
  }
  return group
}

function buildAtom(): THREE.Group {
  const group = new THREE.Group()
  group.add(mesh(new THREE.SphereGeometry(0.18, 28, 18), glow('#a7f8ff', 0.95)))
  group.add(mesh(new THREE.SphereGeometry(0.26, 28, 18), glow('#67b8ff', 0.13)))
  for (let i = 0; i < 5; i += 1) {
    const shell = new THREE.Group()
    shell.rotation.set(i * 0.71, i * 0.43, i * 0.29)
    const cloud = particleCloud(280, 0.78 - i * 0.075, '#73d9ff', 0.012, 30 + i, 0.56)
    shell.add(cloud)
    group.add(shell)
  }
  return group
}

function buildMolecule(): THREE.Group {
  const group = new THREE.Group()
  const oxygen = new THREE.Vector3(0, -0.2, 0)
  const h1 = new THREE.Vector3(-0.75, 0.55, 0)
  const h2 = new THREE.Vector3(0.75, 0.55, 0)
  group.add(tube(oxygen, h1, '#e6f4ff', 0.06, 0.8))
  group.add(tube(oxygen, h2, '#e6f4ff', 0.06, 0.8))
  group.add(mesh(new THREE.SphereGeometry(0.3, 28, 18), solid('#ff705f', 1, 0.45)))
  group.add(mesh(new THREE.SphereGeometry(0.16, 22, 14), solid('#eaf8ff', 1, 0.3), h1.toArray()))
  group.add(mesh(new THREE.SphereGeometry(0.16, 22, 14), solid('#eaf8ff', 1, 0.3), h2.toArray()))
  group.add(particleCloud(220, 1.15, '#7ce8ff', 0.014, 7, 0.32))
  return group
}

function buildProtein(): THREE.Group {
  const group = new THREE.Group()
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.9, -0.7, 0.1), new THREE.Vector3(-0.2, -0.9, 0.7),
    new THREE.Vector3(0.8, -0.35, 0.2), new THREE.Vector3(0.5, 0.7, -0.5),
    new THREE.Vector3(-0.5, 0.85, -0.2), new THREE.Vector3(-0.9, 0.05, 0.5),
    new THREE.Vector3(0.05, 0.1, 0.9), new THREE.Vector3(0.9, 0.05, 0.05),
  ], true)
  group.add(mesh(new THREE.TubeGeometry(curve, 180, 0.13, 10, true), solid('#c986ff', 0.72, 0.35)))
  for (let i = 0; i < 26; i += 1) {
    const point = curve.getPoint(i / 26)
    group.add(mesh(new THREE.SphereGeometry(0.18, 14, 10), solid(i % 2 ? '#71e5d0' : '#f2a7ff', 0.78, 0.35), point.toArray()))
  }
  return group
}

function buildChromosome(): THREE.Group {
  const group = new THREE.Group()
  group.add(mesh(new THREE.SphereGeometry(0.95, 24, 16), glow('#7bbcff', 0.12)))
  for (let arm = 0; arm < 2; arm += 1) {
    const points = Array.from({ length: 90 }, (_, index) => {
      const t = index / 89
      const y = arm === 0 ? 0.12 + t * 0.82 : 0.12 - t * 0.82
      const taper = Math.sin(t * Math.PI) * 0.2 + 0.08
      return new THREE.Vector3(Math.cos(t * 34) * taper, y, Math.sin(t * 34) * taper)
    })
    group.add(line(points, arm ? '#a5eaff' : '#d19aff', 0.9))
  }
  group.add(mesh(new THREE.SphereGeometry(0.16, 20, 12), glow('#fff0bb', 0.95), [0, 0.12, 0]))
  group.add(particleCloud(500, 1.05, '#8cbcff', 0.01, 71, 0.35))
  return group
}

function buildBloodCell(): THREE.Group {
  const group = new THREE.Group()
  const geometry = new THREE.SphereGeometry(0.95, 40, 24)
  geometry.scale(1, 0.78, 1)
  geometry.translate(0, -0.16, 0)
  const cell = mesh(geometry, new THREE.MeshPhysicalMaterial({ color: '#d83f5f', roughness: 0.48, transparent: true, opacity: 0.76, transmission: 0.12, emissive: '#5c0c20', emissiveIntensity: 0.45 }))
  group.add(cell)
  const ring = mesh(new THREE.TorusGeometry(0.78, 0.09, 12, 64), glow('#ff8294', 0.4), [0, -0.12, 0])
  ring.rotation.x = Math.PI / 2
  group.add(ring)
  group.add(particleCloud(300, 0.9, '#ff526d', 0.012, 14, 0.25))
  return group
}

function buildCell(): THREE.Group {
  const group = new THREE.Group()
  group.add(mesh(new THREE.SphereGeometry(1, 40, 26), new THREE.MeshPhysicalMaterial({ color: '#4bbfad', roughness: 0.25, transparent: true, opacity: 0.24, transmission: 0.18, emissive: '#1f7469', emissiveIntensity: 0.35, side: THREE.DoubleSide })))
  group.add(mesh(new THREE.SphereGeometry(0.3, 26, 18), solid('#8d6cff', 0.72, 0.35), [0.22, 0.12, 0.1]))
  group.add(mesh(new THREE.SphereGeometry(0.09, 16, 10), glow('#ffcf80', 0.95), [0.22, 0.12, 0.34]))
  for (let i = 0; i < 14; i += 1) {
    const angle = i * 2.4
    const radius = 0.48 + (i % 4) * 0.11
    const organelle = mesh(new THREE.CapsuleGeometry(0.065, 0.24, 5, 8), glow(i % 2 ? '#8bf1d1' : '#c69cff', 0.7))
    organelle.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.7) * radius, Math.sin(angle) * radius)
    organelle.rotation.set(angle, angle * 0.5, angle * 1.2)
    group.add(organelle)
  }
  group.add(particleCloud(480, 0.94, '#75f2cf', 0.011, 3, 0.3))
  return group
}

function buildMuscle(): THREE.Group {
  const group = new THREE.Group()
  const outer = mesh(new THREE.CylinderGeometry(0.76, 0.62, 1.7, 32, 1, true), solid('#d76655', 0.28, 0.18))
  outer.rotation.z = 0.15
  group.add(outer)
  for (let i = 0; i < 22; i += 1) {
    const angle = i * 0.57
    const points = Array.from({ length: 24 }, (_, index) => {
      const t = index / 23
      return new THREE.Vector3(Math.cos(angle) * (0.2 + t * 0.44), -0.82 + t * 1.64, Math.sin(angle) * (0.2 + t * 0.44))
    })
    group.add(line(points, i % 3 ? '#ffab79' : '#ff6b65', 0.66))
  }
  for (let i = 0; i < 12; i += 1) {
    const y = -0.73 + i * 0.133
    const stripe = mesh(new THREE.TorusGeometry(0.48 - Math.sin(i / 11 * Math.PI) * 0.16, 0.018, 6, 40), glow('#ffe0af', 0.5), [0, y, 0])
    stripe.rotation.x = Math.PI / 2
    group.add(stripe)
  }
  return group
}

function buildCapillary(): THREE.Group {
  const group = new THREE.Group()
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.2, -0.9, 0), new THREE.Vector3(-0.4, 0.7, 0.15),
    new THREE.Vector3(0.45, -0.65, -0.1), new THREE.Vector3(1.2, 0.85, 0),
  ])
  group.add(mesh(new THREE.TubeGeometry(curve, 100, 0.68, 22, false), new THREE.MeshPhysicalMaterial({ color: '#d94a62', roughness: 0.4, transparent: true, opacity: 0.35, side: THREE.DoubleSide, emissive: '#5d1021', emissiveIntensity: 0.4 })))
  group.add(mesh(new THREE.TubeGeometry(curve, 100, 0.5, 20, false), glow('#ff405d', 0.8)))
  for (let i = 0; i < 22; i += 1) {
    const point = curve.getPoint(i / 21)
    const cell = mesh(new THREE.SphereGeometry(0.11, 12, 8), solid('#ff9b8f', 0.85, 0.3), point.toArray())
    cell.scale.set(1.35, 0.75, 0.75)
    group.add(cell)
  }
  return group
}

function buildSkin(): THREE.Group {
  const group = new THREE.Group()
  const surface = mesh(new THREE.PlaneGeometry(2.4, 2.4, 36, 36), new THREE.MeshPhysicalMaterial({ color: '#d69b7c', roughness: 0.72, transparent: true, opacity: 0.58, side: THREE.DoubleSide }))
  const positions = surface.geometry.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    positions.setZ(i, Math.sin(x * 4.5) * 0.035 + Math.cos(y * 5.2) * 0.025)
  }
  surface.geometry.computeVertexNormals()
  group.add(surface)
  for (let row = 0; row < 9; row += 1) {
    const points = Array.from({ length: 50 }, (_, index) => new THREE.Vector3(-1.2 + index / 49 * 2.4, 1.2 - row / 8 * 2.4, -0.08 - row * 0.085))
    group.add(line(points, row % 2 ? '#f2b49a' : '#aa6c70', 0.38))
  }
  return group
}

function buildFinger(): THREE.Group {
  const group = new THREE.Group()
  const pad = mesh(new THREE.SphereGeometry(1, 40, 26, 0, Math.PI * 2, 0, Math.PI * 0.53), new THREE.MeshPhysicalMaterial({ color: '#dda184', roughness: 0.66, transparent: true, opacity: 0.78, side: THREE.DoubleSide }))
  pad.scale.set(0.88, 1.22, 0.58)
  group.add(pad)
  for (let i = -5; i <= 5; i += 1) {
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 32 }, (_, index) => {
      const t = index / 31
      const angle = -1.1 + t * 2.2
      return new THREE.Vector3(i * 0.14, 0.96 * Math.cos(angle), 0.48 * Math.sin(angle) + 0.03)
    }))
    group.add(mesh(new THREE.TubeGeometry(curve, 28, 0.022, 6, false), glow('#794f55', 0.4)))
  }
  return group
}

function buildHand(): THREE.Group {
  const group = new THREE.Group()
  const palm = mesh(new THREE.SphereGeometry(0.72, 28, 20), new THREE.MeshPhysicalMaterial({ color: '#e2a284', roughness: 0.62, transparent: true, opacity: 0.48, side: THREE.DoubleSide }))
  palm.scale.set(0.85, 1.15, 0.28)
  group.add(palm)
  for (let finger = -2; finger <= 2; finger += 1) {
    const length = finger === 0 ? 1.05 : finger === -2 ? 0.78 : 0.9
    const start = new THREE.Vector3(finger * 0.23, 0.45, 0)
    const end = new THREE.Vector3(finger * 0.3, 0.45 + length, 0)
    const bone = tube(start, end, '#f3d3bd', 0.075, 0.72)
    group.add(bone)
    group.add(mesh(new THREE.SphereGeometry(0.1, 12, 8), solid('#f5dac6', 0.7), start.toArray()))
  }
  const thumbStart = new THREE.Vector3(-0.48, -0.18, 0)
  const thumbEnd = new THREE.Vector3(-0.95, 0.38, 0)
  group.add(tube(thumbStart, thumbEnd, '#f3d3bd', 0.1, 0.7))
  return group
}

function buildHuman(): THREE.Group {
  const group = new THREE.Group()
  const skin = new THREE.MeshPhysicalMaterial({ color: '#8dd9c0', roughness: 0.34, transparent: true, opacity: 0.12, transmission: 0.08, side: THREE.DoubleSide, emissive: '#1b4b43', emissiveIntensity: 0.2 })
  const boneMaterial = solid('#e8f1e8', 0.88, 0.12)
  group.add(mesh(new THREE.SphereGeometry(0.16, 22, 16), skin, [0, 0.69, 0]))
  group.add(mesh(new THREE.CapsuleGeometry(0.27, 0.46, 8, 16), skin, [0, 0.28, 0]))
  const leftUpper = new THREE.Vector3(-0.31, 0.46, 0)
  const leftLower = new THREE.Vector3(-0.46, -0.04, 0)
  const rightUpper = new THREE.Vector3(0.31, 0.46, 0)
  const rightLower = new THREE.Vector3(0.46, -0.04, 0)
  group.add(mesh(new THREE.CapsuleGeometry(0.085, 0.44, 6, 12), skin, leftUpper.toArray()))
  group.add(mesh(new THREE.CapsuleGeometry(0.085, 0.44, 6, 12), skin, rightUpper.toArray()))
  group.add(mesh(new THREE.CapsuleGeometry(0.075, 0.43, 6, 12), skin, leftLower.toArray()))
  group.add(mesh(new THREE.CapsuleGeometry(0.075, 0.43, 6, 12), skin, rightLower.toArray()))
  group.add(mesh(new THREE.CapsuleGeometry(0.11, 0.54, 6, 12), skin, [-0.14, -0.49, 0]))
  group.add(mesh(new THREE.CapsuleGeometry(0.11, 0.54, 6, 12), skin, [0.14, -0.49, 0]))

  const spine = line(Array.from({ length: 18 }, (_, i) => new THREE.Vector3(0, 0.54 - i * 0.047, 0.012)), '#ffffff', 0.62)
  group.add(spine)
  for (let i = 0; i < 8; i += 1) {
    const y = 0.46 - i * 0.085
    group.add(line([new THREE.Vector3(-0.18 - i * 0.008, y, 0), new THREE.Vector3(0.18 + i * 0.008, y, 0)], '#dff6ed', 0.48))
  }
  group.add(tube(leftUpper, leftLower, boneMaterial.color.getStyle(), 0.028, 0.85))
  group.add(tube(rightUpper, rightLower, boneMaterial.color.getStyle(), 0.028, 0.85))
  group.add(tube(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0, -0.16, 0), boneMaterial.color.getStyle(), 0.035, 0.85))
  group.add(tube(new THREE.Vector3(-0.14, -0.2, 0), new THREE.Vector3(-0.18, -0.87, 0), boneMaterial.color.getStyle(), 0.03, 0.85))
  group.add(tube(new THREE.Vector3(0.14, -0.2, 0), new THREE.Vector3(0.18, -0.87, 0), boneMaterial.color.getStyle(), 0.03, 0.85))
  const heart = mesh(new THREE.SphereGeometry(0.07, 16, 12), glow('#ff647c', 0.95), [0, 0.26, 0.19])
  heart.scale.set(0.8, 1.25, 0.55)
  group.add(heart)
  for (let i = 0; i < 5; i += 1) {
    const branch = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.2 + i * 0.03, 0.13),
      new THREE.Vector3(-0.11, 0.12 + i * 0.05, 0.2),
      new THREE.Vector3(-0.25, -0.04 + i * 0.08, 0.07),
    ])
    group.add(mesh(new THREE.TubeGeometry(branch, 18, 0.007, 5, false), glow('#ff8a91', 0.55)))
  }
  return group
}

function buildCity(): THREE.Group {
  const group = new THREE.Group()
  const random = mulberry32(82)
  for (let i = 0; i < 230; i += 1) {
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(random()) * 0.96
    const height = 0.04 + Math.pow(random(), 3) * 0.34
    const building = mesh(new THREE.BoxGeometry(0.025 + random() * 0.04, height, 0.025 + random() * 0.04), solid(random() > 0.88 ? '#91f3d1' : '#284c5a', 0.8, 0.12), [Math.cos(angle) * radius, height / 2 - 0.15, Math.sin(angle) * radius])
    building.rotation.y = random() * Math.PI
    group.add(building)
  }
  for (let i = 0; i < 8; i += 1) {
    const angle = i / 8 * Math.PI * 2
    const points = [new THREE.Vector3(0, -0.14, 0), new THREE.Vector3(Math.cos(angle) * 0.55, -0.13, Math.sin(angle) * 0.55), new THREE.Vector3(Math.cos(angle), -0.11, Math.sin(angle))]
    group.add(line(points, i % 2 ? '#6de3ff' : '#ffd27b', 0.85))
  }
  return group
}

function buildMountain(): THREE.Group {
  const group = new THREE.Group()
  const terrain = mesh(new THREE.CircleGeometry(1.12, 72), solid('#294940', 0.96), [0, -0.35, 0])
  terrain.rotation.x = -Math.PI / 2
  const position = terrain.geometry.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const radius = Math.hypot(x, y)
    const ridge = Math.pow(Math.max(0, 1 - radius), 0.3)
    const noise = Math.sin(x * 12) * Math.cos(y * 9) * 0.14 + Math.sin(x * 24 + y * 7) * 0.06
    position.setZ(i, -ridge * 0.28 + noise * ridge)
  }
  terrain.geometry.computeVertexNormals()
  group.add(terrain)
  for (let i = 0; i < 18; i += 1) {
    const angle = i / 18 * Math.PI * 2
    const points = Array.from({ length: 32 }, (_, index) => {
      const t = index / 31
      return new THREE.Vector3(Math.cos(angle + Math.sin(t * 8) * 0.04) * t, 0.16 + t * 0.34, Math.sin(angle + Math.sin(t * 8) * 0.04) * t)
    })
    group.add(line(points, '#d6e7dc', 0.2))
  }
  return group
}

function buildContinent(): THREE.Group {
  const group = new THREE.Group()
  group.add(mesh(new THREE.SphereGeometry(1, 48, 28), new THREE.MeshPhysicalMaterial({ color: '#164b6b', roughness: 0.58, metalness: 0.05, emissive: '#092b42', emissiveIntensity: 0.35 })))
  const random = mulberry32(91)
  for (let i = 0; i < 22; i += 1) {
    const theta = random() * Math.PI * 2
    const phi = 0.35 + random() * 1.2
    const point = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).multiplyScalar(1.015)
    const land = mesh(new THREE.CircleGeometry(0.12 + random() * 0.24, 9), solid(random() > 0.45 ? '#4e8b65' : '#9a8a55', 0.8), point.toArray())
    land.lookAt(point.clone().multiplyScalar(2))
    group.add(land)
  }
  group.add(mesh(new THREE.SphereGeometry(1.04, 40, 24), glow('#68cfff', 0.08)))
  return group
}

function buildEarth(): THREE.Group {
  const group = new THREE.Group()
  group.add(mesh(new THREE.SphereGeometry(0.86, 64, 40), new THREE.MeshPhysicalMaterial({ color: '#154c75', roughness: 0.65, metalness: 0.05, emissive: '#0a2a4a', emissiveIntensity: 0.5 })))
  const random = mulberry32(19)
  for (let i = 0; i < 24; i += 1) {
    const theta = random() * Math.PI * 2
    const phi = 0.3 + random() * 2.5
    const point = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).multiplyScalar(0.875)
    const land = mesh(new THREE.SphereGeometry(0.16 + random() * 0.25, 14, 8), solid('#5f8d62', 0.92), point.toArray())
    land.scale.set(1, 0.35, 0.8)
    land.lookAt(point.clone().multiplyScalar(2))
    group.add(land)
  }
  group.add(mesh(new THREE.SphereGeometry(0.95, 48, 32), new THREE.MeshBasicMaterial({ color: '#5bc8ff', transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false })))
  group.add(particleCloud(400, 1.03, '#7adfff', 0.012, 52, 0.45))
  return group
}

function buildSun(): THREE.Group {
  const group = new THREE.Group()
  group.add(mesh(new THREE.SphereGeometry(0.78, 48, 32), new THREE.MeshBasicMaterial({ color: '#ffad3f' })))
  group.add(mesh(new THREE.SphereGeometry(0.88, 48, 32), glow('#ff7a24', 0.14)))
  group.add(mesh(new THREE.SphereGeometry(1, 48, 32), glow('#ffce6a', 0.07)))
  for (let i = 0; i < 7; i += 1) {
    const points = Array.from({ length: 90 }, (_, index) => {
      const angle = index / 89 * Math.PI * 2
      const radius = 0.82 + Math.sin(angle * 6 + i) * 0.025
      return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle * 2 + i) * 0.05, Math.sin(angle) * radius)
    })
    group.add(line(points, '#ffd06a', 0.12))
  }
  group.add(particleCloud(650, 1.12, '#ff8a3c', 0.022, 21, 0.36))
  return group
}

function buildSolarSystem(): THREE.Group {
  const group = new THREE.Group()
  group.add(mesh(new THREE.SphereGeometry(0.11, 24, 16), glow('#ffbe5c', 0.95)))
  const planets: Array<[number, number, string]> = [
    [0.2, 0.012, '#b8c6d0'], [0.31, 0.019, '#cf8769'], [0.42, 0.021, '#6c9fd0'],
    [0.56, 0.014, '#c98b63'], [0.76, 0.065, '#d3aa72'], [0.94, 0.055, '#d5c18d'],
  ]
  planets.forEach(([radius, size, value], index) => {
    const angle = index * 1.9 + 0.3
    group.add(mesh(new THREE.SphereGeometry(size, 18, 12), solid(value, 0.95, 0.18), [Math.cos(angle) * radius, 0, Math.sin(angle) * radius]))
    const ring = mesh(new THREE.RingGeometry(radius * 0.985, radius * 1.015, 128), glow('#8db8c9', 0.2), [0, 0, 0])
    ring.rotation.x = -Math.PI / 2
    group.add(ring)
  })
  group.add(orbitalCloud(850, 0.15, 1.03, '#9ec8dc', 101))
  return group
}

function buildNebula(): THREE.Group {
  const group = new THREE.Group()
  const random = mulberry32(121)
  for (let cloud = 0; cloud < 7; cloud += 1) {
    const center = new THREE.Vector3((random() - 0.5) * 1.2, (random() - 0.5) * 0.8, (random() - 0.5) * 0.6)
    const points = new Float32Array(260 * 3)
    for (let i = 0; i < 260; i += 1) {
      const theta = random() * Math.PI * 2
      const phi = Math.acos(2 * random() - 1)
      const radius = 0.18 + random() * 0.35
      points[i * 3] = center.x + Math.sin(phi) * Math.cos(theta) * radius
      points[i * 3 + 1] = center.y + Math.sin(phi) * Math.sin(theta) * radius
      points[i * 3 + 2] = center.z + Math.cos(phi) * radius
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3))
    const material = new THREE.PointsMaterial({ color: cloud % 2 ? '#9c61ff' : '#ff6aab', size: 0.025, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
    group.add(new THREE.Points(geometry, material))
  }
  group.add(particleCloud(700, 1.05, '#8ad8ff', 0.009, 122, 0.5))
  return group
}

function buildStellarCloud(): THREE.Group {
  const group = new THREE.Group()
  group.add(particleCloud(2300, 0.85, '#b4ccff', 0.009, 202, 0.64))
  const nebula = mesh(new THREE.TorusKnotGeometry(0.65, 0.18, 90, 10, 2, 3), new THREE.MeshBasicMaterial({ color: '#604cba', wireframe: true, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }))
  group.add(nebula)
  return group
}

function buildGalaxy(): THREE.Group {
  const group = new THREE.Group()
  group.add(mesh(new THREE.SphereGeometry(0.18, 32, 20), glow('#fff1b3', 0.95)))
  const random = mulberry32(303)
  const arms = 4
  for (let i = 0; i < 4200; i += 1) {
    const radius = Math.pow(random(), 0.62) * 0.94
    const branch = Math.floor(random() * arms)
    const angle = radius * 8.8 + branch / arms * Math.PI * 2 + (random() - 0.5) * (0.1 + radius * 0.7)
    const y = (random() - 0.5) * (0.035 + 0.2 * (1 - radius))
    const value = random() > 0.9 ? '#ffc989' : random() > 0.45 ? '#9ad9ff' : '#d5ecff'
    const star = mesh(new THREE.SphereGeometry(0.003 + random() * 0.007, 5, 4), glow(value, 0.8), [Math.cos(angle) * radius, y, Math.sin(angle) * radius])
    group.add(star)
  }
  group.add(particleCloud(2500, 0.92, '#7195c7', 0.006, 304, 0.32))
  return group
}

function buildLocalGroup(): THREE.Group {
  const group = new THREE.Group()
  const galaxies: Array<[number, number, number, number, string]> = [
    [0, 0, 0, 0.34, '#9fd6ff'], [-0.64, 0.12, -0.3, 0.22, '#c49aff'],
    [0.58, -0.18, 0.32, 0.18, '#ffd19a'], [0.25, 0.55, -0.5, 0.08, '#91aaff'],
  ]
  galaxies.forEach(([x, y, z, radius, value], index) => {
    group.add(mesh(new THREE.SphereGeometry(radius, 28, 18), glow(value, 0.12), [x, y, z]))
    const disc = mesh(new THREE.SphereGeometry(radius, 32, 18), glow(value, 0.3), [x, y, z])
    disc.scale.set(1, 0.08, 0.45)
    disc.rotation.y = index * 0.7
    group.add(disc)
  })
  group.add(particleCloud(2100, 1.02, '#6d8fc1', 0.008, 404, 0.45))
  return group
}

function buildUniverse(): THREE.Group {
  const group = new THREE.Group()
  group.add(particleCloud(4800, 0.96, '#c9e3ff', 0.007, 505, 0.72))
  const random = mulberry32(506)
  for (let filament = 0; filament < 24; filament += 1) {
    const points: THREE.Vector3[] = []
    const start = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.5)
    const end = start.clone().add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.7))
    for (let i = 0; i < 60; i += 1) {
      const t = i / 59
      const point = start.clone().lerp(end, t)
      point.x += Math.sin(t * 13 + filament) * 0.06
      point.y += Math.cos(t * 11 + filament) * 0.05
      points.push(point)
    }
    group.add(line(points, filament % 2 ? '#5b83c4' : '#9562d7', 0.1))
  }
  const horizon = mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshBasicMaterial({ color: '#bad9ff', transparent: true, opacity: 0.035, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }))
  group.add(horizon)
  return group
}

const builders: Record<SceneKind, () => THREE.Group> = {
  proton: buildProton,
  nucleus: buildNucleus,
  atom: buildAtom,
  molecule: buildMolecule,
  protein: buildProtein,
  chromosome: buildChromosome,
  bloodCell: buildBloodCell,
  cell: buildCell,
  muscle: buildMuscle,
  capillary: buildCapillary,
  skin: buildSkin,
  finger: buildFinger,
  hand: buildHand,
  human: buildHuman,
  city: buildCity,
  mountain: buildMountain,
  continent: buildContinent,
  earth: buildEarth,
  sun: buildSun,
  solarSystem: buildSolarSystem,
  nebula: buildNebula,
  stellarCloud: buildStellarCloud,
  galaxy: buildGalaxy,
  localGroup: buildLocalGroup,
  universe: buildUniverse,
}

export interface ScaleWorld {
  root: THREE.Group
  groups: SceneMap
  update: (cameraLog: number, time: number) => void
  dispose: () => void
}

export function createScaleWorld(): ScaleWorld {
  const root = new THREE.Group()
  const groups: SceneMap = {}
  const disposables: Array<{ dispose: () => void }> = []

  for (const scene of SCENES) {
    const group = builders[scene.kind]()
    group.userData.logSize = scene.logSize
    group.userData.kind = scene.kind
    groups[scene.kind] = group
    root.add(group)
    group.traverse((object) => {
      const disposable = object as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] }
      if (disposable.geometry) disposables.push(disposable.geometry)
      if (Array.isArray(disposable.material)) disposables.push(...disposable.material)
      else if (disposable.material) disposables.push(disposable.material)
    })
  }

  return {
    root,
    groups,
    update(cameraLog, time) {
      for (const scene of SCENES) {
        const group = groups[scene.kind]
        if (!group) continue
        const exponent = scene.logSize - cameraLog
        const size = 10 ** exponent
        group.scale.setScalar(size)
        group.rotation.y = Math.sin(time * 0.035 + scene.logSize) * (scene.kind === 'human' || scene.kind === 'hand' || scene.kind === 'finger' ? 0.04 : 0.12)
        group.rotation.x = Math.cos(time * 0.025 + scene.logSize) * 0.025
      }
    },
    dispose() {
      disposables.forEach((item) => item.dispose())
      sceneGraph(root, (object) => {
        const child = object as THREE.Mesh
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose())
        else if (child.material) child.material.dispose()
      })
    },
  }
}

function sceneGraph(object: THREE.Object3D, visitor: (object: THREE.Object3D) => void): void {
  visitor(object)
  object.children.forEach((child) => sceneGraph(child, visitor))
}
