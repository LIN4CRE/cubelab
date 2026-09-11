/**
 * Animated 3D cube viewer with transport controls (play / step / scrub /
 * speed). Colors always come from the engine state; the 3D rotation math is
 * proven to match the engine tables in cubeLayout.test.ts.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { applyMoveToFacelets, formatMove } from '../cube'
import type { Move } from '../cube/types'
import { useApp } from '../app/store'
import { STICKER_CSS, faceAxisLayer, faceQuarterSign, vec3ToFacelet } from './cubeLayout'

interface Cube3DProps {
  /** Cube state at position 0. */
  facelets: number[]
  /** Moves to play from the base state. */
  moves: readonly Move[]
  /** Extra reset trigger (e.g. new solution id). */
  resetKey?: string | number
  height?: number
  showControls?: boolean
  label?: string
}

const AXIS_NAME = ['x', 'y', 'z'] as const

interface StickerRef {
  mesh: THREE.Mesh
  localNormal: THREE.Vector3
}

export default function Cube3D({
  facelets,
  moves,
  resetKey,
  height = 340,
  showControls = true,
  label = '3D cube',
}: Cube3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const speed = useApp((s) => s.settings.speed)
  const updateSettings = useApp((s) => s.updateSettings)
  const reduceMotion = useApp((s) => s.settings.reduceMotion)

  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    cubies: THREE.Group[]
    stickers: StickerRef[]
    pivot: THREE.Group
    animating: boolean
    states: number[][]
    raf: number
    orbit: { theta: number; phi: number; radius: number }
  } | null>(null)

  // Engine states for every playhead position (memoized per input).
  const states = useMemo(() => {
    const out: number[][] = [facelets.slice()]
    for (const m of moves) out.push(applyMoveToFacelets(out[out.length - 1] as number[], m))
    return out
  }, [facelets, moves])

  const positionRef = useRef(0)
  positionRef.current = position
  const playingRef = useRef(false)
  playingRef.current = playing
  const speedRef = useRef(speed)
  speedRef.current = speed

  const refreshColors = useCallback(() => {
    const ctx = sceneRef.current
    if (!ctx) return
    const current = ctx.states[positionRef.current] ?? ctx.states[0] ?? []
    const n = new THREE.Vector3()
    for (const cubie of ctx.cubies) {
      const px = Math.round(cubie.position.x)
      const py = Math.round(cubie.position.y)
      const pz = Math.round(cubie.position.z)
      for (const child of cubie.children) {
        const st = (child as THREE.Mesh).userData.sticker as StickerRef | undefined
        if (!st) continue
        n.copy(st.localNormal).applyQuaternion(cubie.quaternion)
        const facelet = vec3ToFacelet(
          [px, py, pz],
          [Math.round(n.x), Math.round(n.y), Math.round(n.z)],
        )
        const mat = st.mesh.material as THREE.MeshStandardMaterial
        mat.color.set(STICKER_CSS[current[facelet] as number] ?? '#000')
      }
    }
  }, [])

  const finalizePivot = useCallback(() => {
    const ctx = sceneRef.current
    if (!ctx) return
    ctx.pivot.updateMatrixWorld(true)
    const kids = [...ctx.pivot.children]
    for (const kid of kids) {
      ctx.scene.attach(kid)
      kid.position.set(
        Math.round(kid.position.x),
        Math.round(kid.position.y),
        Math.round(kid.position.z),
      )
    }
    ctx.pivot.rotation.set(0, 0, 0)
    ctx.animating = false
    refreshColors()
  }, [refreshColors])

  /** Apply one engine move to the 3D cubies (animated unless instant). */
  const applyStepVisual = useCallback(
    (move: Move, instant: boolean) => {
      const ctx = sceneRef.current
      if (!ctx || ctx.animating) return
      const { axis, layer } = faceAxisLayer(move.face)
      const angle = faceQuarterSign(move.face) * move.turns * (Math.PI / 2)
      for (const cubie of ctx.cubies) {
        const coord = axis === 0 ? cubie.position.x : axis === 1 ? cubie.position.y : cubie.position.z
        if (Math.round(coord) === layer) ctx.pivot.attach(cubie)
      }
      if (instant) {
        ctx.pivot.rotation[AXIS_NAME[axis]] = angle
        finalizePivot()
        return
      }
      ctx.animating = true
      const axisName = AXIS_NAME[axis]
      const duration = Math.max(60, (150 * move.turns) / speedRef.current)
      const t0 = performance.now()
      const tick = (now: number): void => {
        const t = Math.min(1, (now - t0) / duration)
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
        ctx.pivot.rotation[axisName] = angle * eased
        if (t < 1 && sceneRef.current === ctx) {
          requestAnimationFrame(tick)
        } else if (sceneRef.current === ctx) {
          ctx.pivot.rotation[axisName] = angle
          finalizePivot()
        }
      }
      requestAnimationFrame(tick)
    },
    [finalizePivot],
  )

  const goTo = useCallback(
    (next: number, instant = false) => {
      const ctx = sceneRef.current
      const target = Math.max(0, Math.min(moves.length, next))
      if (target === positionRef.current || (ctx?.animating && !instant)) return
      if (!ctx) {
        setPosition(target)
        return
      }
      if (Math.abs(target - positionRef.current) === 1 && !instant && !reduceMotion) {
        const forward = target > positionRef.current
        const move = (
          forward ? moves[positionRef.current] : invert(moves[target] as Move)
        ) as Move
        positionRef.current = target
        setPosition(target)
        applyStepVisual(move, false)
      } else {
        // Jump: snap cubies home, then fast-forward engine states.
        for (const cubie of ctx.cubies) {
          ctx.scene.attach(cubie)
          const home = cubie.userData.home as [number, number, number]
          cubie.position.set(home[0], home[1], home[2])
          cubie.quaternion.identity()
        }
        ctx.pivot.rotation.set(0, 0, 0)
        ctx.animating = false
        for (let i = 0; i < target; i++) {
          const { axis, layer } = faceAxisLayer((moves[i] as Move).face)
          for (const cubie of ctx.cubies) {
            const c = axis === 0 ? cubie.position.x : axis === 1 ? cubie.position.y : cubie.position.z
            if (Math.round(c) === layer) ctx.pivot.attach(cubie)
          }
          const mv = moves[i] as Move
          ctx.pivot.rotation[AXIS_NAME[axis]] = faceQuarterSign(mv.face) * mv.turns * (Math.PI / 2)
          ctx.pivot.updateMatrixWorld(true)
          for (const kid of [...ctx.pivot.children]) {
            ctx.scene.attach(kid)
            kid.position.set(
              Math.round(kid.position.x),
              Math.round(kid.position.y),
              Math.round(kid.position.z),
            )
          }
          ctx.pivot.rotation.set(0, 0, 0)
        }
        positionRef.current = target
        setPosition(target)
        refreshColors()
      }
    },
    [moves, applyStepVisual, refreshColors, reduceMotion],
  )

  // Scene setup (runs once per mount).
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.1))
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(4, 7, 5)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x88aaff, 0.7)
    fill.position.set(-5, -2, -4)
    scene.add(fill)

    const cubies: THREE.Group[] = []
    const stickers: StickerRef[] = []
    const bodyGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95)
    const stickerGeo = new THREE.PlaneGeometry(0.8, 0.8)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x10131c, roughness: 0.4, metalness: 0.2 })
    const normals: THREE.Vector3[] = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ]
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue
          const g = new THREE.Group()
          g.position.set(x, y, z)
          g.userData.home = [x, y, z]
          g.add(new THREE.Mesh(bodyGeo, bodyMat))
          for (const nrm of normals) {
            const outward =
              (nrm.x === 1 && x === 1) || (nrm.x === -1 && x === -1) ||
              (nrm.y === 1 && y === 1) || (nrm.y === -1 && y === -1) ||
              (nrm.z === 1 && z === 1) || (nrm.z === -1 && z === -1)
            if (!outward) continue
            const mat = new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.05 })
            const m = new THREE.Mesh(stickerGeo, mat)
            m.position.copy(nrm).multiplyScalar(0.478)
            m.lookAt(nrm.clone().multiplyScalar(2).add(g.position))
            // lookAt orients plane +z toward target; plane must face outward:
            m.lookAt(m.position.clone().multiplyScalar(2))
            const ref: StickerRef = { mesh: m, localNormal: nrm.clone() }
            m.userData.sticker = ref
            g.add(m)
            stickers.push(ref)
          }
          scene.add(g)
          cubies.push(g)
        }
      }
    }
    const pivot = new THREE.Group()
    scene.add(pivot)
    const orbit = { theta: -0.65, phi: 1.08, radius: 6.4 }
    const ctx = { renderer, scene, camera, cubies, stickers, pivot, animating: false, states: [[]], raf: 0, orbit }
    sceneRef.current = ctx

    const placeCamera = (): void => {
      const { theta, phi, radius } = ctx.orbit
      camera.position.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta),
      )
      camera.lookAt(0, 0, 0)
    }
    placeCamera()

    const resize = (): void => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (w === 0 || h === 0) return
      renderer.setSize(w, h, false)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    // Custom orbit: drag to rotate, wheel / pinch to zoom.
    const pointers = new Map<number, { x: number; y: number }>()
    let pinchDist = 0
    const onDown = (e: PointerEvent): void => {
      mount.setPointerCapture(e.pointerId)
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }]
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }
    const onMove = (e: PointerEvent): void => {
      const prev = pointers.get(e.pointerId)
      if (!prev) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 1) {
        ctx.orbit.theta -= (e.clientX - prev.x) * 0.008
        ctx.orbit.phi = Math.max(0.25, Math.min(Math.PI - 0.25, ctx.orbit.phi - (e.clientY - prev.y) * 0.008))
        placeCamera()
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchDist > 0) ctx.orbit.radius = Math.max(4, Math.min(11, ctx.orbit.radius * (pinchDist / d)))
        pinchDist = d
        placeCamera()
      }
    }
    const onUp = (e: PointerEvent): void => {
      pointers.delete(e.pointerId)
      pinchDist = 0
    }
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      ctx.orbit.radius = Math.max(4, Math.min(11, ctx.orbit.radius * (1 + Math.sign(e.deltaY) * 0.08)))
      placeCamera()
    }
    mount.addEventListener('pointerdown', onDown)
    mount.addEventListener('pointermove', onMove)
    mount.addEventListener('pointerup', onUp)
    mount.addEventListener('pointercancel', onUp)
    mount.addEventListener('wheel', onWheel, { passive: false })

    const loop = (): void => {
      ctx.raf = requestAnimationFrame(loop)
      renderer.render(scene, camera)
    }
    loop()

    return () => {
      cancelAnimationFrame(ctx.raf)
      ro.disconnect()
      mount.removeEventListener('pointerdown', onDown)
      mount.removeEventListener('pointermove', onMove)
      mount.removeEventListener('pointerup', onUp)
      mount.removeEventListener('pointercancel', onUp)
      mount.removeEventListener('wheel', onWheel)
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry.dispose()
          const mat = mesh.material as THREE.Material | THREE.Material[]
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
          else mat.dispose()
        }
      })
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      if (sceneRef.current === ctx) sceneRef.current = null
    }
  }, [])

  // Sync engine states + reset on new input.
  useEffect(() => {
    const ctx = sceneRef.current
    if (ctx) ctx.states = states
    positionRef.current = 0
    setPosition(0)
    setPlaying(false)
    if (ctx && !ctx.animating) {
      for (const cubie of ctx.cubies) {
        ctx.scene.attach(cubie)
        const home = cubie.userData.home as [number, number, number]
        cubie.position.set(home[0], home[1], home[2])
        cubie.quaternion.identity()
      }
      refreshColors()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states, resetKey])

  // Playback driver.
  useEffect(() => {
    if (!playing) return
    if (positionRef.current >= moves.length) {
      setPlaying(false)
      return
    }
    const t = window.setTimeout(
      () => {
        if (playingRef.current) goTo(positionRef.current + 1)
      },
      Math.max(60, 340 / speedRef.current),
    )
    return () => window.clearTimeout(t)
  }, [playing, position, moves.length, goTo])

  const currentMove = position > 0 && position <= moves.length ? moves[position - 1] : null
  const contextMoves = useMemo(() => {
    const from = Math.max(0, position - 3)
    return moves.slice(from, position + 4).map((m, i) => ({ move: m, index: from + i }))
  }, [moves, position])

  return (
    <div>
      <div
        ref={mountRef}
        style={{ height, touchAction: 'none', cursor: 'grab' }}
        className="w-full overflow-hidden rounded-xl border border-edge bg-abyss"
        role="img"
        aria-label={`${label}: ${moves.length === 0 ? 'static cube' : `move ${position} of ${moves.length}${currentMove ? `, last move ${formatMove(currentMove)}` : ''}`}. Drag to rotate.`}
      />
      {showControls && (
        <div className="mt-2 rounded-xl border border-edge bg-panel p-2">
          <div className="flex items-center gap-1">
            <TBtn title="Back to start" onClick={() => { setPlaying(false); goTo(0, true) }} aria-label="Back to start">⏮</TBtn>
            <TBtn title="Previous move" onClick={() => { setPlaying(false); goTo(position - 1) }} aria-label="Previous move">◀</TBtn>
            <TBtn
              title={playing ? 'Pause' : 'Play'}
              onClick={() => {
                if (!playing && position >= moves.length) goTo(0, true)
                setPlaying(!playing)
              }}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? '⏸' : '▶'}
            </TBtn>
            <TBtn title="Next move" onClick={() => { setPlaying(false); goTo(position + 1) }} aria-label="Next move">▶</TBtn>
            <TBtn title="Jump to end" onClick={() => { setPlaying(false); goTo(moves.length, true) }} aria-label="Jump to end">⏭</TBtn>
            <label className="ml-auto flex items-center gap-1 text-xs text-slate-400">
              Speed
              <select
                value={speed}
                onChange={(e) => updateSettings({ speed: Number(e.target.value) })}
                className="rounded-md border border-edge bg-panel-2 px-1 py-1 text-xs text-slate-200"
                aria-label="Playback speed"
              >
                {[0.25, 0.5, 1, 2, 4].map((s) => (
                  <option key={s} value={s}>{s}×</option>
                ))}
              </select>
            </label>
          </div>
          <input
            type="range"
            min={0}
            max={moves.length}
            value={position}
            onChange={(e) => {
              setPlaying(false)
              goTo(Number(e.target.value), true)
            }}
            className="mt-2 w-full accent-cyan-400"
            aria-label="Move position"
            aria-valuetext={`Move ${position} of ${moves.length}`}
          />
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm" aria-live="polite">
            <span className="text-xs text-slate-500">{position}/{moves.length}</span>
            {contextMoves.map(({ move, index }) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setPlaying(false)
                  goTo(index + 1, true)
                }}
                className={`rounded px-1 ${index < position ? 'text-slate-500' : index === position ? 'bg-cyan-400/20 text-cyan-300 outline outline-1 outline-cyan-400/40' : 'text-slate-300'}`}
                aria-label={`Jump to after move ${index + 1}: ${formatMove(move)}`}
              >
                {formatMove(move)}
              </button>
            ))}
            {moves.length === 0 && <span className="text-xs text-slate-500">No moves — drag to inspect the cube.</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function TBtn(props: { title: string; onClick: () => void; children: React.ReactNode; ['aria-label']: string }) {
  return (
    <button
      type="button"
      title={props.title}
      aria-label={props['aria-label']}
      onClick={props.onClick}
      className="rounded-lg border border-edge bg-panel-2 px-2.5 py-1.5 text-sm text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
    >
      {props.children}
    </button>
  )
}

function invert(move: Move): Move {
  return { face: move.face, turns: ((4 - move.turns) % 4) as 1 | 2 | 3 }
}
