import { DPad } from './components/DPad'
import { useServoControl } from './hooks/useServoControl'
import './App.css'

function App() {
  const {
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
  } = useServoControl()

  return (
    <div className="app">
      <div className="vignette" aria-hidden="true" />

      <header className="brand">
        <p className="brand-mark">EthanCam</p>
        <h1>Pan &amp; tilt control</h1>
        <p className="lede">
          Hold arrow keys or the D-pad to steer. Movement posts to your ESP32
          for as long as you hold.
        </p>
      </header>

      <section className="ip-block" aria-label="ESP32 connection">
        <label htmlFor="esp-ip">ESP32 address</label>
        <div className="ip-row">
          <input
            id="esp-ip"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="192.168.1.50"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
          />
        </div>
        <p className={`status status-${status}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          {statusMessage}
        </p>
      </section>

      <section className="control-block" aria-label="Servo controls">
        <DPad
          pan={active.pan}
          tilt={active.tilt}
          disabled={!hasIp}
          onPressPan={pressPan}
          onReleasePan={releasePan}
          onPressTilt={pressTilt}
          onReleaseTilt={releaseTilt}
        />
        <p className="hint">
          {hasIp
            ? 'Arrow keys work anywhere except while typing the IP.'
            : 'Add an IP above to enable the pad.'}
        </p>
      </section>
    </div>
  )
}

export default App
