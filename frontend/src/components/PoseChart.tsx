import { useEffect, useRef, useState } from 'react'
import { getInstanceByDom, init, use as registerEChartsModules } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import type { PoseSample } from '../data/poseCsv'

registerEChartsModules([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

type PoseChartKind = 'position' | 'heading' | 'velocity' | 'acceleration'
type MotionView = 'magnitude' | 'components'

type PoseChartProps = {
  kind: PoseChartKind
  samples: PoseSample[]
}

function unwrapHeading(samples: PoseSample[]) {
  let previousHeading = samples[0]?.heading ?? 0

  return samples.map((sample, index) => {
    if (index === 0) return [sample.elapsedSeconds, previousHeading]

    let difference = sample.heading - (samples[index - 1]?.heading ?? sample.heading)
    if (difference > 180) difference -= 360
    if (difference < -180) difference += 360
    previousHeading += difference
    return [sample.elapsedSeconds, previousHeading]
  })
}

function buildOption(
  kind: PoseChartKind,
  samples: PoseSample[],
  motionView: MotionView,
  positionAxes: Set<'x' | 'y'>,
): EChartsOption {
  const axisStyle = {
    axisLine: { lineStyle: { color: '#bdbdbd' } },
    axisLabel: { color: '#616161', fontSize: 10 },
    splitLine: { lineStyle: { color: '#eeeeee' } },
  }

  const shared = {
    animationDuration: 250,
    grid: { left: 42, right: 12, top: 12, bottom: 36, containLabel: true },
    tooltip: { trigger: 'axis' as const },
  }

  if (kind === 'position') {
    const positionSeries = [
      {
        type: 'line' as const,
        name: 'X',
        data: samples.map((sample) => [sample.elapsedSeconds, sample.x]),
        showSymbol: false,
        lineStyle: { color: '#1976d2' },
        itemStyle: { color: '#1976d2' },
      },
      {
        type: 'line' as const,
        name: 'Y',
        data: samples.map((sample) => [sample.elapsedSeconds, sample.y]),
        showSymbol: false,
        lineStyle: { color: '#ef6c00' },
        itemStyle: { color: '#ef6c00' },
      },
    ]
    const visiblePositionSeries = positionSeries.filter((series) => positionAxes.has(series.name === 'X' ? 'x' : 'y'))

    return {
      ...shared,
      legend: {
        top: 0,
        data: visiblePositionSeries.map((series) => series.name),
        textStyle: { color: '#616161', fontSize: 10 },
      },
      grid: { left: 42, right: 12, top: 30, bottom: 36, containLabel: true },
      xAxis: { type: 'value', name: 'Time (s)', nameLocation: 'middle', nameGap: 24, ...axisStyle },
      yAxis: { type: 'value', name: 'Position (CSV units)', nameLocation: 'middle', nameGap: 32, scale: true, ...axisStyle },
      series: visiblePositionSeries,
    }
  }

  if (kind === 'velocity' || kind === 'acceleration') {
    const isVelocity = kind === 'velocity'
    const xField = isVelocity ? 'velocityX' : 'accelerationX'
    const yField = isVelocity ? 'velocityY' : 'accelerationY'
    const magnitudeField = isVelocity ? 'velocityMagnitude' : 'accelerationMagnitude'
    const quantity = isVelocity ? 'Velocity' : 'Acceleration'
    const units = isVelocity ? 'CSV units/s' : 'CSV units/s²'
    const series = motionView === 'magnitude'
      ? [{
          type: 'line' as const,
          name: 'Magnitude',
          data: samples.map((sample) => [sample.elapsedSeconds, sample[magnitudeField]]),
          showSymbol: false,
          lineStyle: { color: '#43a047' },
          itemStyle: { color: '#43a047' },
        }]
      : [
          {
            type: 'line' as const,
            name: 'X',
            data: samples.map((sample) => [sample.elapsedSeconds, sample[xField]]),
            showSymbol: false,
            lineStyle: { color: '#1976d2' },
            itemStyle: { color: '#1976d2' },
          },
          {
            type: 'line' as const,
            name: 'Y',
            data: samples.map((sample) => [sample.elapsedSeconds, sample[yField]]),
            showSymbol: false,
            lineStyle: { color: '#ef6c00' },
            itemStyle: { color: '#ef6c00' },
          },
        ]

    return {
      ...shared,
      legend: {
        top: 0,
        data: motionView === 'magnitude' ? ['Magnitude'] : ['X', 'Y'],
        textStyle: { color: '#616161', fontSize: 10 },
      },
      grid: { left: 42, right: 12, top: 30, bottom: 36, containLabel: true },
      xAxis: { type: 'value', name: 'Time (s)', nameLocation: 'middle', nameGap: 24, ...axisStyle },
      yAxis: {
        type: 'value',
        name: `${motionView === 'magnitude' ? `${quantity} magnitude` : quantity} (${units})`,
        nameLocation: 'middle',
        nameGap: 32,
        scale: true,
        ...axisStyle,
      },
      series,
    }
  }

  return {
    ...shared,
    xAxis: { type: 'value', name: 'Time (s)', nameLocation: 'middle', nameGap: 24, ...axisStyle },
    yAxis: { type: 'value', name: 'Heading (deg)', nameLocation: 'middle', nameGap: 32, scale: true, ...axisStyle },
    series: [{
      type: 'line',
      name: 'Heading',
      data: unwrapHeading(samples),
      showSymbol: false,
      lineStyle: { color: '#d84315' },
    }],
  }
}

export function PoseChart({ kind, samples }: PoseChartProps) {
  const chartElement = useRef<HTMLDivElement>(null)
  const [motionView, setMotionView] = useState<MotionView>('magnitude')
  const [positionAxes, setPositionAxes] = useState<Set<'x' | 'y'>>(() => new Set(['x', 'y']))

  useEffect(() => {
    const element = chartElement.current
    if (!element) return

    const chart = init(element)
    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [])

  useEffect(() => {
    const element = chartElement.current
    if (!element) return
    getInstanceByDom(element)?.setOption(buildOption(kind, samples, motionView, positionAxes), true)
  }, [kind, samples, motionView, positionAxes])

  return (
    <div className="pose-chart">
      {kind === 'position' && (
        <div className="pose-chart-controls" role="group" aria-label="Position chart axes">
          {(['x', 'y'] as const).map((axis) => (
            <button
              key={axis}
              type="button"
              aria-pressed={positionAxes.has(axis)}
              onClick={() => setPositionAxes((currentAxes) => {
                const nextAxes = new Set(currentAxes)
                if (nextAxes.has(axis)) nextAxes.delete(axis)
                else nextAxes.add(axis)
                return nextAxes
              })}
            >
              {axis.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      {(kind === 'velocity' || kind === 'acceleration') && (
        <div className="pose-chart-controls" role="group" aria-label={`${kind} chart view`}>
          <button
            type="button"
            aria-pressed={motionView === 'magnitude'}
            onClick={() => setMotionView('magnitude')}
          >
            Magnitude
          </button>
          <button
            type="button"
            aria-pressed={motionView === 'components'}
            onClick={() => setMotionView('components')}
          >
            X / Y
          </button>
        </div>
      )}
      <div
        className="echarts-chart"
        ref={chartElement}
        role="img"
        aria-label={`${kind} ${kind === 'position'
          ? [...positionAxes].join(' and ') || 'no axes'
          : kind === 'velocity' || kind === 'acceleration'
            ? motionView
            : ''} chart`.trim()}
      />
    </div>
  )
}