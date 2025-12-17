import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from './ui/chart'

import type { CommitStats } from '@/types'
import { useState, useRef, useEffect, useMemo } from 'react'
import { format } from 'date-fns'

const chartConfig = {
  lines: {
    label: 'Total Lines',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

interface CommitGraphProps {
  stats: CommitStats[]
  totalAdded: number
  totalRemoved: number
}

function getWeekKey(date: Date, weeksInterval: number): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const daysSinceStart = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
  )
  const weekNumber = Math.floor(daysSinceStart / (7 * weeksInterval))
  return `${date.getFullYear()}-W${weekNumber * weeksInterval}`
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export const CommitGraph: React.FC<CommitGraphProps> = ({
  stats,
  totalAdded,
  totalRemoved,
}) => {
  // Calculate date range
  const dates = useMemo(() => stats.map((stat) => new Date(stat.date)), [stats])
  const _dateNumbers = useMemo(() => dates.map((d) => d.getTime()), [dates])
  const absoluteMinDate = useMemo(
    () => new Date(Math.min(..._dateNumbers)),
    [_dateNumbers]
  )
  const absoluteMaxDate = useMemo(
    () => new Date(Math.max(..._dateNumbers)),
    [_dateNumbers]
  )

  const absoluteDaysDiff = Math.floor(
    (absoluteMaxDate.getTime() - absoluteMinDate.getTime()) /
      (1000 * 60 * 60 * 24)
  )

  const hasMoreThan1Year = absoluteDaysDiff > 365

  const [dateRanges, setDateRanges] = useState({
    minDate: absoluteMinDate,
    maxDate: absoluteMaxDate,
  })

  const [isDraggingLeft, setIsDraggingLeft] = useState(false)
  const [isDraggingRight, setIsDraggingRight] = useState(false)
  const sliderContainerRef = useRef<HTMLDivElement>(null)

  const daysDiff = Math.floor(
    (dateRanges.maxDate.getTime() - dateRanges.minDate.getTime()) /
      (1000 * 60 * 60 * 24)
  )

  // Determine grouping strategy
  let groupBy: 'day' | 'week' | '2weeks' | 'month'
  if (daysDiff <= 90) {
    groupBy = 'day'
  } else if (daysDiff <= 365) {
    groupBy = 'week'
  } else if (daysDiff <= 730) {
    // } else if (daysDiff <= 730 || true) {
    groupBy = '2weeks'
  } else {
    groupBy = 'month'
  }

  const matheusMap = new Map<string, CommitStats[]>()

  for (let i = stats.length - 1; i >= 0; i--) {
    const stat = stats[i]!

    const date = new Date(stat.date)
    let key
    switch (groupBy) {
      case 'day':
      case 'week':
      case '2weeks':
        key = stat.date.split('T')[0]
        break
      // case 'week':
      //   key = getWeekKey(date, 1)
      //   break
      // case '2weeks':
      //   key = getWeekKey(date, 2)
      //   break
      case 'month':
        key = getMonthKey(date)
        break
    }

    if (!matheusMap.has(key)) {
      matheusMap.set(key, [])
    }
    matheusMap.get(key)!.push(stat)
  }

  const matheusF = Array.from(matheusMap.entries())
  const matheusData: {
    date: string
    lines: number
    commitCount: number
    added: number
    removed: number
  }[] = []
  const data: {
    date: string
    commitCount: number
  }[] = []

  let totalLines = 0
  for (let i = 0; i < matheusF.length; i++) {
    const [key, commits] = matheusF[i]!
    let added = 0
    let removed = 0
    for (let j = 0; j < commits.length; j++) {
      const commit = commits[j]!
      totalLines += commit.added - commit.removed
      added += commit.added
      removed += commit.removed
    }

    data.push({
      date: key,
      commitCount: commits.length,
    })
    if (
      dateRanges.maxDate >= new Date(key) &&
      dateRanges.minDate <= new Date(key)
    ) {
      matheusData.push({
        date: key,
        lines: totalLines,
        commitCount: commits.length,
        added,
        removed,
      })
    }
  }

  const absoluteTimeRange =
    absoluteMaxDate.getTime() - absoluteMinDate.getTime()

  // Calculate slider positions as percentages
  const leftPosition =
    ((dateRanges.minDate.getTime() - absoluteMinDate.getTime()) /
      absoluteTimeRange) *
    100
  const rightPosition =
    ((absoluteMaxDate.getTime() - dateRanges.maxDate.getTime()) /
      absoluteTimeRange) *
    100

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!sliderContainerRef.current) return
      if (!isDraggingLeft && !isDraggingRight) return

      const rect = sliderContainerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
      const newTime =
        absoluteMinDate.getTime() + (percentage / 100) * absoluteTimeRange

      if (isDraggingLeft) {
        const newMinDate = new Date(newTime)
        if (newMinDate < dateRanges.maxDate) {
          setDateRanges((prev) => ({ ...prev, minDate: newMinDate }))
        }
      } else if (isDraggingRight) {
        const newMaxDate = new Date(newTime)
        if (newMaxDate > dateRanges.minDate) {
          setDateRanges((prev) => ({ ...prev, maxDate: newMaxDate }))
        }
      }
    }

    const handleMouseUp = () => {
      setIsDraggingLeft(false)
      setIsDraggingRight(false)
    }

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    isDraggingLeft,
    isDraggingRight,
    absoluteMinDate,
    absoluteMaxDate,
    absoluteTimeRange,
    dateRanges.minDate,
    dateRanges.maxDate,
  ])

  return (
    <>
      <div className="text-obsidian-field mb-3 flex gap-2">
        <div className="bg-core-flux rounded-full px-10 py-5 text-right">
          <p className="w-full text-4xl font-black">
            {matheusData
              .reduce((sum, item) => sum + item.commitCount, 0)
              .toLocaleString()}
          </p>
          <p className="font-semibold">Total commits</p>
        </div>

        <div className="bg-ion-drift rounded-full px-10 py-5 text-right">
          <p className="w-full text-4xl font-black">
            {(
              matheusData.reduce((sum, item) => sum + item.added, 0) -
              matheusData.reduce((sum, item) => sum + item.removed, 0)
            ).toLocaleString()}
          </p>
          <p className="font-semibold">Total lines</p>
        </div>

        <div className="bg-alloy-ember rounded-full px-10 py-5 text-right">
          <p className="w-full text-4xl font-black">
            +
            {matheusData
              .reduce((sum, item) => sum + item.added, 0)
              .toLocaleString()}
          </p>
          <p className="font-semibold">Total lines added</p>
        </div>

        <div className="bg-polar-sand rounded-full px-10 py-5 text-right">
          <p className="w-full text-4xl font-black">
            -
            {matheusData
              .reduce((sum, item) => sum + item.removed, 0)
              .toLocaleString()}
          </p>
          <p className="font-semibold">Total lines removed</p>
        </div>
      </div>

      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[250px] w-full"
      >
        <AreaChart accessibilityLayer data={matheusData}>
          <XAxis
            dataKey="date"
            tickLine={false}
            tickMargin={4}
            minTickGap={20}
            axisLine={false}
            tickFormatter={(value) => {
              if (
                groupBy === 'day' ||
                groupBy === 'week' ||
                groupBy === '2weeks'
              ) {
                const date = new Date(value)
                return hasMoreThan1Year
                  ? format(date, 'MMM d, yy')
                  : format(date, 'MMM d')
              } else {
                // Format month keys like "2024-01" -> "Jan 2024"
                const [year, month] = value.split('-')
                const date = new Date(parseInt(year), parseInt(month) - 1)
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })
              }
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={0}
            domain={['dataMin', 'auto']}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value, payload) => {
                  if (!payload || !payload[0]) return value
                  const data = payload[0].payload as {
                    date: string
                    representativeDate: string
                    commitCount: number
                  }

                  // Format the date based on groupBy
                  let formattedDate: string
                  if (groupBy === 'day') {
                    const date = new Date(data.representativeDate)
                    formattedDate = date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  } else if (groupBy === 'week' || groupBy === '2weeks') {
                    const parts = data.date.split('-W')
                    formattedDate = `Week ${parts[1]}, ${parts[0]}`
                  } else {
                    const [year, month] = data.date.split('-')
                    const date = new Date(parseInt(year), parseInt(month) - 1)
                    formattedDate = date.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })
                  }

                  return (
                    <div className="">
                      <p className="font-bold">{formattedDate}</p>
                      <div className="mt-0.5 text-xs font-medium">
                        {data.commitCount}{' '}
                        {data.commitCount === 1 ? 'commit' : 'commits'}
                      </div>
                    </div>
                  )
                }}
              />
            }
          />
          {/* <ChartLegend content={<ChartLegendContent payload={[]} />} /> */}
          <Area
            dataKey="lines"
            type="linear"
            fill="var(--core-flux)"
            fillOpacity={1}
            stroke="var(--core-flux)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
      <ChartContainer
        config={chartConfig}
        className="relative mt-0 h-[45px] w-full"
      >
        <LineChart data={data}>
          <Line
            dataKey="commitCount"
            type="bumpX"
            stroke="var(--core-flux)"
            strokeWidth={1}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>

        {/* <BarChart accessibilityLayer data={groupedData} barCategoryGap={2}>
          <Bar
            dataKey="commitCount"
            fill="var(--core-flux)"
            fillOpacity={1}
            stroke="var(--core-flux)"
          />
        </BarChart> */}

        <div
          ref={sliderContainerRef}
          className="pointer-events-none absolute top-0 h-full w-full"
        >
          {/* Selected range overlay */}
          <div
            className="bg-polar-sand/20 absolute top-0 h-full"
            style={{
              left: `${leftPosition}%`,
              right: `${rightPosition}%`,
            }}
          />

          {/* Left slider handle */}
          <div
            className="bg-alloy-ember hover:bg-alloy-ember/80 pointer-events-auto absolute top-1/2 z-10 h-[70%] w-3 -translate-1/2 cursor-ew-resize rounded-full transition-colors"
            style={{
              left: `${leftPosition}%`,
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              setIsDraggingLeft(true)
            }}
          >
            <div className="absolute top-1/2 left-1/2 h-2/3 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />
          </div>

          {/* Right slider handle */}
          <div
            className="bg-alloy-ember hover:bg-alloy-ember/80 pointer-events-auto absolute top-1/2 z-10 h-[70%] w-3 translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full transition-colors"
            style={{
              right: `${rightPosition}%`,
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              setIsDraggingRight(true)
            }}
          >
            <div className="absolute top-1/2 left-1/2 h-2/3 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />
          </div>
        </div>
      </ChartContainer>
    </>
  )
}
