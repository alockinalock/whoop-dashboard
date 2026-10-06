import Papa from 'papaparse'

export type PoseSample = {
  timestampMs: number
  elapsedSeconds: number
  x: number
  y: number
  heading: number
  velocityX: number | null
  velocityY: number | null
  velocityMagnitude: number | null
  accelerationX: number | null
  accelerationY: number | null
  accelerationMagnitude: number | null
}

type MotionSeries = {
  velocityX: Array<number | null>
  velocityY: Array<number | null>
  velocityMagnitude: Array<number | null>
  accelerationX: Array<number | null>
  accelerationY: Array<number | null>
  accelerationMagnitude: Array<number | null>
}

function calculateMotion(samples: Array<Pick<PoseSample, 'timestampMs' | 'x' | 'y'>>): MotionSeries {
  const calculateVelocity = (axis: 'x' | 'y') => samples.map<number | null>((sample, index) => {
    if (index === 0) {
      const next = samples[1]
      const duration = next ? next.timestampMs - sample.timestampMs : 0
      return duration > 0 ? (next[axis] - sample[axis]) / (duration / 1000) : null
    }

    if (index === samples.length - 1) {
      const previous = samples[index - 1]
      const duration = sample.timestampMs - previous?.timestampMs
      return duration && duration > 0 ? (sample[axis] - previous[axis]) / (duration / 1000) : null
    }

    const previous = samples[index - 1]
    const next = samples[index + 1]
    const duration = next.timestampMs - previous.timestampMs
    return duration > 0 ? (next[axis] - previous[axis]) / (duration / 1000) : null
  })

  const velocityX = calculateVelocity('x')
  const velocityY = calculateVelocity('y')
  const velocityMagnitude = velocityX.map<number | null>((x, index) => {
    const y = velocityY[index]
    return x !== null && y !== null ? Math.hypot(x, y) : null
  })

  const calculateAcceleration = (velocity: Array<number | null>) => samples.map<number | null>((sample, index) => {
    if (index === 0) {
      const next = velocity[1]
      const current = velocity[0]
      const duration = samples[1] ? samples[1].timestampMs - sample.timestampMs : 0
      return next !== null && current !== null && duration > 0 ? (next - current) / (duration / 1000) : null
    }

    if (index === samples.length - 1) {
      const previous = velocity[index - 1]
      const current = velocity[index]
      const previousSample = samples[index - 1]
      const duration = previousSample ? sample.timestampMs - previousSample.timestampMs : 0
      return previous !== null && current !== null && duration > 0 ? (current - previous) / (duration / 1000) : null
    }

    const previous = velocity[index - 1]
    const next = velocity[index + 1]
    const previousSample = samples[index - 1]
    const nextSample = samples[index + 1]
    const duration = nextSample.timestampMs - previousSample.timestampMs
    return previous !== null && next !== null && duration > 0 ? (next - previous) / (duration / 1000) : null
  })

  const accelerationX = calculateAcceleration(velocityX)
  const accelerationY = calculateAcceleration(velocityY)
  const accelerationMagnitude = accelerationX.map<number | null>((x, index) => {
    const y = accelerationY[index]
    return x !== null && y !== null ? Math.hypot(x, y) : null
  })

  return {
    velocityX,
    velocityY,
    velocityMagnitude,
    accelerationX,
    accelerationY,
    accelerationMagnitude,
  }
}

export function parsePoseCsv(csvText: string): PoseSample[] {
  const { data, errors } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
  })

  if (errors.length > 0 && data.length === 0) {
    throw new Error('The selected file could not be parsed as CSV.')
  }

  const headers = Object.keys(data[0] ?? {}).reduce<Record<string, string>>((result, header) => {
    result[header.trim().toLowerCase()] = header
    return result
  }, {})
  const timestampHeader = headers.timestamp_ms
  const xHeader = headers.x
  const yHeader = headers.y
  const headingHeader = headers.heading

  if (!timestampHeader || !xHeader || !yHeader || !headingHeader) {
    throw new Error('CSV must include timestamp_ms, x, y, and heading columns.')
  }

  const tagHeader = headers.tag
  const samples = data.flatMap((row) => {
    const tag = tagHeader ? row[tagHeader]?.trim().toLowerCase() : ''
    if (tag && !tag.endsWith('pose')) return []

    const values = [row[timestampHeader], row[xHeader], row[yHeader], row[headingHeader]]
    if (values.some((value) => !value?.trim())) return []

    const [timestampMs, x, y, heading] = values.map(Number)

    if (![timestampMs, x, y, heading].every(Number.isFinite)) return []
    return [{ timestampMs, x, y, heading }]
  }).sort((first, second) => first.timestampMs - second.timestampMs)

  if (samples.length === 0) {
    throw new Error('No valid pose rows were found in the selected CSV.')
  }

  const firstTimestamp = samples[0].timestampMs
  const samplesWithElapsedTime = samples.map((sample) => ({
    ...sample,
    elapsedSeconds: (sample.timestampMs - firstTimestamp) / 1000,
  }))
  const motion = calculateMotion(samplesWithElapsedTime)

  return samplesWithElapsedTime.map((sample, index) => ({
    ...sample,
    velocityX: motion.velocityX[index],
    velocityY: motion.velocityY[index],
    velocityMagnitude: motion.velocityMagnitude[index],
    accelerationX: motion.accelerationX[index],
    accelerationY: motion.accelerationY[index],
    accelerationMagnitude: motion.accelerationMagnitude[index],
  }))
}