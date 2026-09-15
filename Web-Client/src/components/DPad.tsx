import type { PointerEvent } from 'react'
import type { PanDirection, TiltDirection } from '../api/servo'

type DPadProps = {
  pan: PanDirection | null
  tilt: TiltDirection | null
  disabled?: boolean
  onPressPan: (direction: PanDirection) => void
  onReleasePan: (direction: PanDirection) => void
  onPressTilt: (direction: TiltDirection) => void
  onReleaseTilt: (direction: TiltDirection) => void
}

type Direction = 'up' | 'right' | 'down' | 'left'

const CHEVRON_ROTATION: Record<Direction, number> = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
}

function Chevron({ direction }: { direction: Direction }) {
  return (
    <span
      className="dpad-icon"
      style={{ transform: `rotate(${CHEVRON_ROTATION[direction]}deg)` }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <polyline
          points="5.5 15 12 8.5 18.5 15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

type PadButtonProps = {
  direction: Direction
  ariaLabel: string
  active: boolean
  disabled?: boolean
  className: string
  onPress: () => void
  onRelease: () => void
}

function PadButton({
  direction,
  ariaLabel,
  active,
  disabled,
  className,
  onPress,
  onRelease,
}: PadButtonProps) {
  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    onPress()
  }

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    onRelease()
  }

  return (
    <button
      type="button"
      className={`dpad-btn ${className}${active ? ' is-active' : ''}`}
      aria-label={ariaLabel}
      aria-pressed={active}
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onRelease}
      onLostPointerCapture={onRelease}
    >
      <Chevron direction={direction} />
    </button>
  )
}

export function DPad({
  pan,
  tilt,
  disabled,
  onPressPan,
  onReleasePan,
  onPressTilt,
  onReleaseTilt,
}: DPadProps) {
  return (
    <div className="dpad" role="group" aria-label="Servo direction pad">
      <PadButton
        className="dpad-up"
        direction="up"
        ariaLabel="Tilt up"
        active={tilt === 'UP'}
        disabled={disabled}
        onPress={() => onPressTilt('UP')}
        onRelease={() => onReleaseTilt('UP')}
      />
      <PadButton
        className="dpad-left"
        direction="left"
        ariaLabel="Pan left"
        active={pan === 'LEFT'}
        disabled={disabled}
        onPress={() => onPressPan('LEFT')}
        onRelease={() => onReleasePan('LEFT')}
      />
      <div className="dpad-center" aria-hidden="true">
        <span className="dpad-jewel" />
      </div>
      <PadButton
        className="dpad-right"
        direction="right"
        ariaLabel="Pan right"
        active={pan === 'RIGHT'}
        disabled={disabled}
        onPress={() => onPressPan('RIGHT')}
        onRelease={() => onReleasePan('RIGHT')}
      />
      <PadButton
        className="dpad-down"
        direction="down"
        ariaLabel="Tilt down"
        active={tilt === 'DOWN'}
        disabled={disabled}
        onPress={() => onPressTilt('DOWN')}
        onRelease={() => onReleaseTilt('DOWN')}
      />
    </div>
  )
}
