export type PanDirection = 'LEFT' | 'RIGHT'
export type TiltDirection = 'UP' | 'DOWN'

export type ServoCommand = {
  pan?: PanDirection
  tilt?: TiltDirection
}

// Local network round-trips to the ESP32 should be single-digit
// milliseconds. If a request is still outstanding past this, something is
// wrong (dropped Wi-Fi, ESP32 busy/rebooting) — abort it so the send loop's
// single in-flight slot frees up quickly instead of stalling on a hung
// socket for the browser's default multi-minute timeout.
const REQUEST_TIMEOUT_MS = 1000

function normalizeBaseUrl(ip: string): string {
  const trimmed = ip.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `http://${trimmed}`
}

export function buildServoMoveUrl(ip: string): string {
  const base = normalizeBaseUrl(ip)
  if (!base) throw new Error('ESP32 IP is required')
  return `${base}/servo_move`
}

export async function sendServoMove(
  ip: string,
  command: ServoCommand,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<void> {
  const body: Record<string, string> = {}
  if (command.pan) body.pan = command.pan
  if (command.tilt) body.tilt = command.tilt

  if (!body.pan && !body.tilt) return

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(buildServoMoveUrl(ip), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`)
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('ESP32 did not respond in time', { cause: err })
    }
    throw err
  } finally {
    window.clearTimeout(timeoutId)
  }
}
