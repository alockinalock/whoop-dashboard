import fieldImage from '../assets/OverrideField.png'
import type { PoseSample } from '../data/poseCsv'

const FIELD_SIZE_IN = 144
const FIELD_CENTER_IN = FIELD_SIZE_IN / 2

function toFieldPoint(sample: PoseSample) {
  return {
    x: FIELD_CENTER_IN + sample.x,
    y: FIELD_CENTER_IN - sample.y,
  }
}

export function FieldTrajectory({ samples }: { samples: PoseSample[] }) {
  const firstPose = samples[0]
  const currentPose = samples.at(-1)
  if (!firstPose || !currentPose) return null

  const firstPoint = toFieldPoint(firstPose)
  const currentPoint = toFieldPoint(currentPose)
  const path = samples.map((sample) => {
    const point = toFieldPoint(sample)
    return `${point.x},${point.y}`
  }).join(' ')

  return (
    <div className="field-trajectory">
      <div className="field-container">
        <img src={fieldImage} alt="VEX competition field" className="field-image" />
        <svg className="field-overlay" viewBox={`0 0 ${FIELD_SIZE_IN} ${FIELD_SIZE_IN}`} role="img" aria-label={`${samples.length} robot poses drawn over the field`}>
          <polyline points={path} fill="none" stroke="#1976d2" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={firstPoint.x} cy={firstPoint.y} r="1.8" fill="#8bc34a" stroke="#fff" strokeWidth="0.5" />
          <g transform={`translate(${currentPoint.x} ${currentPoint.y}) rotate(${currentPose.heading})`}>
            <circle cx="0" cy="0" r="3.2" fill="#fff" fillOpacity="0.85" stroke="#1976d2" strokeWidth="0.7" />
            <path d="M0 -5.5 L-2.1 -1 L2.1 -1 Z" fill="#1976d2" />
          </g>
        </svg>
      </div>
      <div className="field-trajectory-legend">
        <span><i className="field-start-dot" /> Start</span>
        <span><i className="field-current-dot" /> Current pose</span>
        <span>Center origin · assuming inches</span>
      </div>
    </div>
  )
}