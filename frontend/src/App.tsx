import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import './App.css'
import sampleCsv from '../../pp_test2.csv?raw'
import { FieldTrajectory } from './components/FieldTrajectory'
import { PoseChart } from './components/PoseChart'
import { parsePoseCsv, type PoseSample } from './data/poseCsv'

type ModuleId = 'match' | 'field' | 'velocity' | 'acceleration' | 'pose' | 'errors' | 'power' | 'telemetry' | 'sensors'

type DashboardModule = {
  id: ModuleId
  label: string
  eyebrow: string
}

const defaultModules: DashboardModule[] = [
  { id: 'match', label: 'Match status', eyebrow: 'Control' },
  { id: 'field', label: 'Robot trajectory', eyebrow: 'Pose data' },
  { id: 'velocity', label: 'Position over time', eyebrow: 'Pose data' },
  { id: 'acceleration', label: 'Heading over time', eyebrow: 'Pose data' },
  { id: 'pose', label: 'Pose sample summary', eyebrow: 'Pose data' },
  { id: 'errors', label: 'Target comparison', eyebrow: 'Pose data' },
  { id: 'power', label: 'Voltage and power', eyebrow: 'Telemetry' },
  { id: 'telemetry', label: 'Telemetry log', eyebrow: 'Data' },
  { id: 'sensors', label: 'Sensors', eyebrow: 'Hardware' },
]

const storageKey = 'whoop-dashboard-module-order'

function ModuleContent({ id, samples }: { id: ModuleId; samples: PoseSample[] }): ReactNode {
  switch (id) {
    case 'match':
      return <div className="status-content"><strong>Practice run</strong><span>Not connected to robot controller</span><div className="status-row"><span>Runtime</span><b>02:14:36</b></div></div>
    case 'field':
      return <FieldTrajectory samples={samples} />
    case 'velocity':
      return <PoseChart kind="position" samples={samples} />
    case 'acceleration':
      return <PoseChart kind="heading" samples={samples} />
    case 'pose':
      return <div className="pose-summary"><span>Samples <b>{samples.length}</b></span><span>Duration <b>{samples.at(-1)?.elapsedSeconds.toFixed(2)} s</b></span></div>
    case 'errors':
      return <p className="unavailable-data">This CSV contains measured pose only. Target data is not available.</p>
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
  const [samples, setSamples] = useState(() => parsePoseCsv(sampleCsv))
  const [csvFilename, setCsvFilename] = useState('pp_test2.csv')
  const [csvError, setCsvError] = useState('')

  const loadCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    try {
      const parsedSamples = parsePoseCsv(await file.text())
      setSamples(parsedSamples)
      setCsvFilename(file.name)
      setCsvError('')
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : 'Could not load this CSV file.')
    }
  }

  const restoreSample = () => {
    setSamples(parsePoseCsv(sampleCsv))
    setCsvFilename('pp_test2.csv')
    setCsvError('')
  }

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
          <span className="connection-status" title={csvFilename}><span className="status-dot" /> {csvFilename} · {samples.length} poses</span>
          <label className="csv-upload-button">
            Load CSV
            <input type="file" accept=".csv,text/csv" onChange={loadCsv} aria-label="Load a pose CSV file" />
          </label>
          <button className="reset-button" type="button" onClick={restoreSample}>Restore sample</button>
          <button className={`edit-button${isEditing ? ' active' : ''}`} type="button" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Done arranging' : 'Arrange modules'}
          </button>
        </div>
      </header>

      <section className="dashboard-content">
        {csvError && <p className="csv-error" role="alert">{csvError}</p>}
        <div className="dashboard-heading">
          <div>
            <p className="kicker">PRACTICE SESSION / 02:14:36</p>
            <h2>Systems overview</h2>
          </div>
          {isEditing && <button className="reset-button" type="button" onClick={resetLayout}>Reset layout</button>}
        </div>

        {isEditing && <p className="arrange-hint">Drag a module by its handle to change your dashboard layout.</p>}

        <div className={`module-grid${isEditing ? ' is-editing' : ''}`}>
          {modules.map((module) => {
            const usesCsvData = ['field', 'velocity', 'acceleration', 'pose', 'errors'].includes(module.id)

            return (
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
              <div className="module-body"><ModuleContent id={module.id} samples={samples} /></div>
              <footer><span className="module-live">{usesCsvData ? 'CSV DATA' : 'MOCK DATA'}</span><span>{usesCsvData ? `${samples.length} pose samples` : 'Awaiting robot link'}</span></footer>
            </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default App
