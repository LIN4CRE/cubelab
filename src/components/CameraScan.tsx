/**
 * Camera-assisted cube entry with honest fallbacks. The camera proposes
 * colors by sampling each sticker region; the user MUST verify and correct
 * every sticker before use (lighting fools cameras). No image ever leaves
 * the device.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { COLOR_NAMES, type ColorId } from '../cube'
import { useApp } from '../app/store'
import CubeNet from './CubeNet'
import { STICKER_CSS } from './cubeLayout'

const SCAN_FACES = [
  { face: 'U', instruction: 'Hold WHITE on top — point the camera at the TOP face' },
  { face: 'R', instruction: 'Point the camera at the RIGHT face (red centre)' },
  { face: 'F', instruction: 'Point the camera at the FRONT face (green centre)' },
  { face: 'D', instruction: 'Point the camera at the BOTTOM face (yellow centre)' },
  { face: 'L', instruction: 'Point the camera at the LEFT face (orange centre)' },
  { face: 'B', instruction: 'Point the camera at the BACK face (blue centre)' },
] as const

const FACE_BASE: Record<string, number> = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 }

// Reference palette in sRGB for nearest-color classification.
const PALETTE: Array<[number, number, number]> = [
  [242, 244, 248],
  [229, 57, 53],
  [67, 160, 71],
  [253, 216, 53],
  [251, 140, 0],
  [30, 136, 229],
]

function nearestColor(r: number, g: number, b: number): ColorId {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < PALETTE.length; i++) {
    const p = PALETTE[i] as [number, number, number]
    const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best as ColorId
}

export default function CameraScan({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [supported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  )
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [scanned, setScanned] = useState<number[]>(() => Array(54).fill(-1))
  const [verifying, setVerifying] = useState(false)
  const [paint, setPaint] = useState<ColorId>(0)
  const setFacelets = useApp((s) => s.setFacelets)

  const stopStream = useCallback(() => {
    const v = videoRef.current
    const stream = v?.srcObject as MediaStream | null
    stream?.getTracks().forEach((t) => t.stop())
    if (v) v.srcObject = null
  }, [])

  useEffect(() => {
    if (!supported || verifying) return
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
      .catch(() => setError('Camera unavailable (permission denied or no camera). Use manual entry instead — it takes about a minute.'))
    return () => {
      cancelled = true
      stopStream()
    }
  }, [supported, verifying, stopStream])

  useEffect(() => stopStream, [stopStream])

  const capture = (): void => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.videoWidth === 0) return
    const size = Math.min(video.videoWidth, video.videoHeight)
    canvas.width = 240
    canvas.height = 240
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    const sx = (video.videoWidth - size) / 2
    const sy = (video.videoHeight - size) / 2
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 240, 240)
    // Sample the inner 60% as the 3×3 grid (matches the overlay guide).
    const next = scanned.slice()
    const base = FACE_BASE[SCAN_FACES[step]?.face ?? 'U'] as number
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cx = Math.floor(240 * (0.2 + 0.2 * c + 0.1))
        const cy = Math.floor(240 * (0.2 + 0.2 * r + 0.1))
        const data = ctx.getImageData(cx - 6, cy - 6, 12, 12).data
        let R = 0
        let G = 0
        let B = 0
        const n = data.length / 4
        for (let i = 0; i < data.length; i += 4) {
          R += data[i] as number
          G += data[i + 1] as number
          B += data[i + 2] as number
        }
        next[base + r * 3 + c] = nearestColor(R / n, G / n, B / n)
      }
    }
    setScanned(next)
    if (step < 5) {
      setStep(step + 1)
    } else {
      setVerifying(true)
      stopStream()
    }
  }

  if (!supported || error) {
    return (
      <div className="card">
        <h3 className="font-semibold text-slate-100">Camera scan unavailable</h3>
        <p className="mt-1 text-sm text-slate-400">
          {error ?? 'This browser or device has no camera access.'} Nothing is uploaded anywhere —
          but manual entry works everywhere and takes about a minute.
        </p>
        <button type="button" className="btn mt-3" onClick={onDone}>
          Back to manual entry
        </button>
      </div>
    )
  }

  if (verifying) {
    const filled = scanned.every((c) => c >= 0)
    return (
      <div className="card">
        <h3 className="font-semibold text-slate-100">Verify every sticker</h3>
        <p className="mt-1 text-sm text-slate-400">
          The camera <em>guesses</em> — lighting, shadows and white balance fool it. Tap any wrong
          sticker to repaint it, then confirm.
        </p>
        <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: 'repeat(6, minmax(0,1fr))' }} role="group" aria-label="Paint color">
          {([0, 1, 2, 3, 4, 5] as ColorId[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setPaint(c)}
              aria-label={`Paint ${COLOR_NAMES[c]}`}
              aria-pressed={paint === c}
              className={`aspect-square rounded-lg border-2 ${paint === c ? 'border-cyan-300' : 'border-transparent'}`}
              style={{ backgroundColor: STICKER_CSS[c] }}
            />
          ))}
        </div>
        <div className="mx-auto mt-3 max-w-md">
          <CubeNet
            facelets={scanned.map((c) => Math.max(0, c))}
            paintColor={paint}
            onPaint={(i) => setScanned((s) => s.map((c, k) => (k === i ? paint : c)))}
            label="Scanned cube verification grid"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={!filled}
            onClick={() => {
              setFacelets(scanned)
              onDone()
            }}
          >
            Use this cube
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setVerifying(false)
              setStep(0)
              setScanned(Array(54).fill(-1))
            }}
          >
            Re-scan
          </button>
        </div>
      </div>
    )
  }

  const face = SCAN_FACES[step] as { face: string; instruction: string }
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-100">
        Scan face {step + 1} of 6: {face.face}
      </h3>
      <p className="mt-1 text-sm text-slate-400">{face.instruction}. Fit the face inside the square.</p>
      <div className="relative mx-auto mt-3 aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" aria-label="Camera preview" />
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <rect x="20" y="20" width="60" height="60" fill="none" stroke="#22d3ee" strokeWidth="1" />
          {[40, 60].map((v) => (
            <g key={v} stroke="#22d3ee" strokeWidth="0.5" opacity="0.7">
              <line x1={v} y1="20" x2={v} y2="80" />
              <line x1="20" y1={v} x2="80" y2={v} />
            </g>
          ))}
        </svg>
      </div>
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={capture}>
          Capture {face.face} face
        </button>
        {step > 0 && (
          <button type="button" className="btn" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Faces captured: {scanned.filter((c) => c >= 0).length / 9} / 6 · Photos never leave your device.
      </p>
    </div>
  )
}
