import { useEffect, useState, type ReactNode } from 'react'
import './App.css'
import overrideFieldImage from './assets/OverrideField.png'

type ModuleId = 'match' | 'field' | 'velocity' | 'acceleration' | 'pose' | 'errors' | 'power' | 'telemetry' | 'sensors'

type DashboardModule = {
  id: ModuleId
  label: string
  eyebrow: string
}

const defaultModules: DashboardModule[] = [
  { id: 'match', label: 'Match status', eyebrow: 'Control' },
  { id: 'field', label: 'Field position', eyebrow: 'Position' },
  { id: 'velocity', label: 'Velocity tuning', eyebrow: 'Graphs' },
  { id: 'acceleration', label: 'Acceleration tuning', eyebrow: 'Graphs' },
  { id: 'pose', label: 'Pose tracking', eyebrow: 'Graphs' },
  { id: 'errors', label: 'Error terms', eyebrow: 'Graphs' },
  { id: 'power', label: 'Voltage and power', eyebrow: 'Telemetry' },
  { id: 'telemetry', label: 'Telemetry log', eyebrow: 'Data' },
  { id: 'sensors', label: 'Sensors', eyebrow: 'Hardware' },
]

const storageKey = 'whoop-dashboard-module-order'

function VEXOverrideField({ robotX, robotY, robotHeading }: { robotX: number; robotY: number; robotHeading: number }) {
  return (
    <div className="field-container">
      <img src={overrideFieldImage} alt="VEX Override field" className="field-image" />
      <svg className="field-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Robot position indicator */}
        <g transform={`translate(${robotX} ${robotY}) rotate(${robotHeading})`}>
          <circle cx="0" cy="0" r="3" fill="none" stroke="#00ff00" strokeWidth="0.5" />
          <line x1="0" y1="0" x2="0" y2="-5" stroke="#00ff00" strokeWidth="0.5" />
        </g>
      </svg>
    </div>
  )
}

function ComparisonChart({ labels }: { labels: string[] }) {
  return (
    <div className="chart-wrap">
      <svg className="chart" viewBox="0 0 320 100" role="img" aria-label="Mock comparison chart">
        <path className="chart-gridline" d="M0 20H320M0 50H320M0 80H320" />
        <polyline className="chart-target" points="0,72 38,62 76,64 114,42 152,49 190,29 228,35 266,17 320,23" />
        <polyline className="chart-actual" points="0,79 38,66 76,71 114,51 152,58 190,40 228,41 266,29 320,35" />
      </svg>
      <div className="chart-labels">{labels.map((label) => <span key={label}>{label}</span>)}</div>
      <div className="chart-legend"><span><i className="legend-target" /> Target</span><span><i className="legend-actual" /> Actual</span></div>
    </div>
  )
}

function ModuleContent({ id }: { id: ModuleId }): ReactNode {
  switch (id) {
    case 'match':
      return <div className="status-content"><strong>Practice run</strong><span>Not connected to robot controller</span><div className="status-row"><span>Runtime</span><b>02:14:36</b></div></div>
    case 'field':
      return <div className="field-content"><VEXOverrideField robotX={72} robotY={72} robotHeading={42} /><div className="field-readout"><span>X <b>1.82 m</b></span><span>Y <b>0.64 m</b></span><span>Heading <b>42 deg</b></span></div></div>
    case 'velocity':
      return <><ComparisonChart labels={['0s', '2s', '4s', '6s', '8s']} /><div className="metric-row"><span>kV <b>0.018</b></span><span>kA <b>0.002</b></span></div></>
    case 'acceleration':
      return <><ComparisonChart labels={['0s', '1s', '2s', '3s', '4s']} /><div className="metric-row"><span>kA <b>0.002</b></span><span>Peak <b>1.84 m/s2</b></span></div></>
    case 'pose':
      return <><ComparisonChart labels={['0s', '5s', '10s', '15s', '20s']} /><div className="metric-row"><span>Position error <b>0.08 m</b></span><span>Heading error <b>2.4 deg</b></span></div></>
    case 'errors':
      return <div className="error-list"><div><span>Translational</span><b>0.08 m</b><i style={{ width: '24%' }} /></div><div><span>Heading</span><b>2.4 deg</b><i style={{ width: '38%' }} /></div><div><span>PID contribution</span><b>0.31</b><i style={{ width: '56%' }} /></div></div>
    case 'power':
      return <div className="power-content"><div className="power-number"><span>Battery voltage</span><strong>12.41 V</strong></div><div className="power-number"><span>Motor output</span><strong>38%</strong></div><div className="power-bar"><i /></div><small>Mock values until controller link is active</small></div>
    case 'telemetry':
      return <div className="telemetry-list"><div><span>drive.left.velocity</span><b>1.24</b></div><div><span>drive.right.velocity</span><b>1.19</b></div><div><span>drive.heading</span><b>42.1</b></div><div><span>intake.color</span><b>BLUE</b></div></div>
    case 'sensors':
      return <div className="sensor-list"><div><span className="sensor-state" /> Lidar distance <b>-- mm</b></div><div><span className="sensor-state" /> Color sensor <b>BLUE</b></div><p>Lidar and color sensor data will appear here.</p></div>
  }
}

function App() {
  const [modules, setModules] = useState(defaultModules)
  const [isEditing, setIsEditing] = useState(false)
  const [draggedId, setDraggedId] = useState<ModuleId | null>(null)

  useEffect(() => {
    const savedOrder = window.localStorage.getItem(storageKey)
    if (!savedOrder) return

    try {
      const order = JSON.parse(savedOrder) as ModuleId[]
      const sortedModules = order
        .map((id) => defaultModules.find((module) => module.id === id))
        .filter((module): module is DashboardModule => Boolean(module))
      const missingModules = defaultModules.filter((module) => !order.includes(module.id))
      setModules([...sortedModules, ...missingModules])
    } catch {
      window.localStorage.removeItem(storageKey)
    }
  }, [])

  const moveModule = (targetId: ModuleId) => {
    if (!draggedId || draggedId === targetId) return

    setModules((currentModules) => {
      const nextModules = [...currentModules]
      const draggedIndex = nextModules.findIndex((module) => module.id === draggedId)
      const targetIndex = nextModules.findIndex((module) => module.id === targetId)
      const [draggedModule] = nextModules.splice(draggedIndex, 1)
      nextModules.splice(draggedIndex < targetIndex ? targetIndex - 1 : targetIndex, 0, draggedModule)
      window.localStorage.setItem(storageKey, JSON.stringify(nextModules.map((module) => module.id)))
      return nextModules
    })
    setDraggedId(null)
  }

  const resetLayout = () => {
    setModules(defaultModules)
    window.localStorage.removeItem(storageKey)
  }

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="kicker">WHOOP / CONTROL HUB</p>
          <h1>Robot dashboard</h1>
        </div>
        <div className="topbar-actions">
          <span className="connection-status"><span className="status-dot mock" /> Mock data</span>
          <button className={`edit-button${isEditing ? ' active' : ''}`} type="button" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Done arranging' : 'Arrange modules'}
          </button>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-heading">
          <div>
            <p className="kicker">PRACTICE SESSION / 02:14:36</p>
            <h2>Systems overview</h2>
          </div>
          {isEditing && <button className="reset-button" type="button" onClick={resetLayout}>Reset layout</button>}
        </div>

        {isEditing && <p className="arrange-hint">Drag a module by its handle to change your dashboard layout.</p>}

        <div className={`module-grid${isEditing ? ' is-editing' : ''}`}>
          {modules.map((module) => (
            <article
              className={`module module-${module.id}${draggedId === module.id ? ' is-dragging' : ''}`}
              key={module.id}
              draggable={isEditing}
              onDragStart={() => setDraggedId(module.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => moveModule(module.id)}
              onDragEnd={() => setDraggedId(null)}
            >
              <div className="module-header">
                <div>
                  <p className="module-eyebrow">{module.eyebrow}</p>
                  <h3>{module.label}</h3>
                </div>
                {isEditing && <span className="drag-handle" aria-label={`Drag ${module.label}`}>::</span>}
              </div>
              <div className="module-body"><ModuleContent id={module.id} /></div>
              <footer><span className="module-live">MOCK DATA</span><span>Awaiting robot link</span></footer>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
