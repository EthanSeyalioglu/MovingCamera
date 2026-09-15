import { useCallback, useEffect, useRef, useState } from 'react'
import {
  sendServoMove,
  type PanDirection,
  type ServoCommand,
  type TiltDirection,
} from '../api/servo'

const POLL_MS = 80
const IP_STORAGE_KEY = 'servopanner-esp32-ip'

type ActiveKeys = {
  pan: PanDirection | null
  tilt: TiltDirection | null
}

function commandFromActive(active: ActiveKeys): ServoCommand | null {
  if (!active.pan && !active.tilt) return null
  return {
    ...(active.pan ? { pan: active.pan } : {}),
    ...(active.tilt ? { tilt: active.tilt } : {}),
  }
}

export type ConnectionStatus = 'idle' | 'ok' | 'error'

type LastResult = { kind: 'ok' } | { kind: 'error'; message: string } | null

export function useServoControl() {
  const [ip, setIpState] = useState(() => {
    try {
      return localStorage.getItem(IP_STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [active, setActive] = useState<ActiveKeys>({ pan: null, tilt: null })
  // Only the raw outcome of the last request is stored as state; status and
  // statusMessage below are derived from it (plus ip/moving) during render
  // instead of being pushed from an effect.
  const [lastResult, setLastResult] = useState<LastResult>(null)

  const ipRef = useRef(ip)
  const activeRef = useRef(active)
  const inFlightRef = useRef(false)
  const intervalRef = useRef<number | null>(null)

  // Press-order stacks, one per axis. The *last* entry still held wins, so
  // e.g. holding Left, tapping Right, then releasing Right correctly falls
  // back to Left instead of stopping — no dead spot, and opposing keys never
  // leave the pan/tilt state "stuck" on a key that was already released.
  // Keyboard and D-pad clicks push/pop the same stacks, so mixing input
  // methods (e.g. Left via keyboard + Right via click) resolves the same way.
  const panStackRef = useRef<PanDirection[]>([])
  const tiltStackRef = useRef<TiltDirection[]>([])

  const hasIp = ip.trim().length > 0
  const moving = Boolean(active.pan || active.tilt)

  let status: ConnectionStatus
  let statusMessage: string
  if (!hasIp) {
    status = 'idle'
    statusMessage = 'Enter your ESP32 IP to begin'
  } else if (moving && lastResult?.kind === 'ok') {
    status = 'ok'
    statusMessage = 'Connected — sending movement'
  } else if (lastResult?.kind === 'error') {
    status = 'error'
    statusMessage = lastResult.message
  } else {
    status = 'idle'
    statusMessage = 'Ready'
  }

  // Keep refs in sync via effects rather than mutating them during render
  // (tick()/event handlers read these outside of render, so an effect-timed
  // update is soon enough and keeps render pure).
  useEffect(() => {
    ipRef.current = ip
  }, [ip])

  useEffect(() => {
    activeRef.current = active
  }, [active])

  const setIp = useCallback((value: string) => {
    setIpState(value)
    try {
      localStorage.setItem(IP_STORAGE_KEY, value)
    } catch {
      /* ignore quota / private mode */
    }
    // Clear any stale ok/error badge from a previous address.
    setLastResult(null)
  }, [])

  const clearPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const tick = useCallback(async () => {
    const command = commandFromActive(activeRef.current)
    if (!command || !ipRef.current.trim() || inFlightRef.current) return

    inFlightRef.current = true
    try {
      await sendServoMove(ipRef.current, command)
      setLastResult({ kind: 'ok' })
    } catch (err) {
      setLastResult({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not reach ESP32',
      })
    } finally {
      inFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!moving) {
      clearPolling()
      return
    }

    // Send on the next microtask (not synchronously in the effect body,
    // which the linter flags) so a newly pressed/released key is reflected
    // on the wire right away instead of waiting for the next POLL_MS tick.
    // A microtask runs before the next paint, so this adds no perceptible
    // delay. The interval below then keeps re-sending for as long as any
    // key is held, in case a packet is dropped or the firmware expects a
    // steady stream.
    queueMicrotask(() => void tick())
    intervalRef.current = window.setInterval(() => {
      void tick()
    }, POLL_MS)

    return clearPolling
    // Re-run whenever the held-key combo changes (not just on the
    // idle -> moving transition) so the immediate send above fires on every
    // change, not only the first key pressed.
  }, [active.pan, active.tilt, moving, clearPolling, tick])

  const pressPan = useCallback((direction: PanDirection) => {
    const stack = panStackRef.current
    const existingIndex = stack.indexOf(direction)
    if (existingIndex !== -1) stack.splice(existingIndex, 1)
    stack.push(direction)
    setActive((prev) => (prev.pan === direction ? prev : { ...prev, pan: direction }))
  }, [])

  const releasePan = useCallback((direction: PanDirection) => {
    const stack = panStackRef.current
    const index = stack.indexOf(direction)
    if (index === -1) return
    stack.splice(index, 1)
    const next = stack.length > 0 ? stack[stack.length - 1] : null
    setActive((prev) => (prev.pan === next ? prev : { ...prev, pan: next }))
  }, [])

  const pressTilt = useCallback((direction: TiltDirection) => {
    const stack = tiltStackRef.current
    const existingIndex = stack.indexOf(direction)
    if (existingIndex !== -1) stack.splice(existingIndex, 1)
    stack.push(direction)
    setActive((prev) => (prev.tilt === direction ? prev : { ...prev, tilt: direction }))
  }, [])

  const releaseTilt = useCallback((direction: TiltDirection) => {
    const stack = tiltStackRef.current
    const index = stack.indexOf(direction)
    if (index === -1) return
    stack.splice(index, 1)
    const next = stack.length > 0 ? stack[stack.length - 1] : null
    setActive((prev) => (prev.tilt === next ? prev : { ...prev, tilt: next }))
  }, [])

  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isTypingTarget(e.target) || !ipRef.current.trim()) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          pressPan('LEFT')
          break
        case 'ArrowRight':
          e.preventDefault()
          pressPan('RIGHT')
          break
        case 'ArrowUp':
          e.preventDefault()
          pressTilt('UP')
          break
        case 'ArrowDown':
          e.preventDefault()
          pressTilt('DOWN')
          break
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          releasePan('LEFT')
          break
        case 'ArrowRight':
          e.preventDefault()
          releasePan('RIGHT')
          break
        case 'ArrowUp':
          e.preventDefault()
          releaseTilt('UP')
          break
        case 'ArrowDown':
          e.preventDefault()
          releaseTilt('DOWN')
          break
      }
    }

    const onBlur = () => {
      // The window losing focus (alt-tab, devtools, etc.) means we will
      // never see the matching keyup events, so clear everything to avoid a
      // servo left "stuck" moving on a key that's still physically held.
      panStackRef.current = []
      tiltStackRef.current = []
      setActive({ pan: null, tilt: null })
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      clearPolling()
    }
  }, [clearPolling, pressPan, pressTilt, releasePan, releaseTilt])

  return {
    ip,
    setIp,
    active,
    status,
    statusMessage,
    pressPan,
    releasePan,
    pressTilt,
    releaseTilt,
    hasIp,
  }
}
