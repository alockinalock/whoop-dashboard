import { useEffect, useRef } from 'react'
import { getInstanceByDom, init, use as registerEChartsModules } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import type { PoseSample } from '../data/poseCsv'

registerEChartsModules([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

type PoseChartKind = 'position' | 'heading'

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

function buildOption(kind: PoseChartKind, samples: PoseSample[]): EChartsOption {
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
    return {
      ...shared,
      xAxis: { type: 'value', name: 'Time (s)', nameLocation: 'middle', nameGap: 24, ...axisStyle },
      yAxis: { type: 'value', name: 'Position (CSV units)', nameLocation: 'middle', nameGap: 32, scale: true, ...axisStyle },
      series: [
        { type: 'line', name: 'X', data: samples.map((sample) => [sample.elapsedSeconds, sample.x]), showSymbol: false, lineStyle: { color: '#1976d2' } },
        { type: 'line', name: 'Y', data: samples.map((sample) => [sample.elapsedSeconds, sample.y]), showSymbol: false, lineStyle: { color: '#ef6c00' } },
      ],
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
    getInstanceByDom(element)?.setOption(buildOption(kind, samples), true)
  }, [kind, samples])

  return (
    <div className="echarts-chart" ref={chartElement} role="img" aria-label={`${kind} chart`} />
  )
}