import Papa from 'papaparse'

export type PoseSample = {
  timestampMs: number
  elapsedSeconds: number
  x: number
  y: number
  heading: number
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
  return samples.map((sample) => ({
    ...sample,
    elapsedSeconds: (sample.timestampMs - firstTimestamp) / 1000,
  }))
}