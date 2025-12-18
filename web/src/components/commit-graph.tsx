import { Area, AreaChart, Line, LineChart, XAxis, YAxis } from 'recharts'
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
  commits: CommitStats[]
  totalContributors: number
  totalAdded: number
  totalRemoved: number
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export const CommitGraph: React.FC<CommitGraphProps> = ({
  commits,
  totalContributors,
  totalAdded,
  totalRemoved,
}) => {
  const { absoluteMinDate, absoluteMaxDate } = useMemo(() => {
    if (commits.length === 0) {
      const now = new Date()
      return { absoluteMinDate: now, absoluteMaxDate: now }
    }

    let minTime = Infinity
    let maxTime = -Infinity

    for (let i = 0; i < commits.length; i++) {
      const time = new Date(commits[i].date).getTime()
      if (time < minTime) minTime = time
      if (time > maxTime) maxTime = time
    }

    return {
      absoluteMinDate: new Date(minTime),
      absoluteMaxDate: new Date(maxTime),
    }
  }, [commits])

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
  if (daysDiff <= 600) {
    groupBy = 'day'
  } else if (daysDiff <= 900) {
    groupBy = 'week'
  } else if (daysDiff <= 1400) {
    // } else if (daysDiff <= 730 || true) {
    groupBy = '2weeks'
  } else {
    groupBy = 'month'
  }

  const fullHistoryData = useMemo(() => {
    // Determine grouping strategy
    let fullHistoryGroupBy: 'day' | 'week' | '2weeks' | 'month'
    if (absoluteDaysDiff <= 600) {
      fullHistoryGroupBy = 'day'
    } else if (absoluteDaysDiff <= 900) {
      fullHistoryGroupBy = 'week'
    } else if (absoluteDaysDiff <= 1400) {
      // } else if (daysDiff <= 730 || true) {
      fullHistoryGroupBy = '2weeks'
    } else {
      fullHistoryGroupBy = 'month'
    }

    const fullHistoryMap = new Map<string, CommitStats[]>()

    for (let i = commits.length - 1; i >= 0; i--) {
      const commit = commits[i]!

      const date = new Date(commit.date)
      let key
      switch (fullHistoryGroupBy) {
        case 'day':
        case 'week':
        case '2weeks':
          key = commit.date.split('T')[0]
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

      if (!fullHistoryMap.has(key)) {
        fullHistoryMap.set(key, [])
      }
      fullHistoryMap.get(key)!.push(commit)
    }

    const fullHistoryData: {
      date: string
      commitCount: number
    }[] = []

    for (const [key, commits] of fullHistoryMap.entries()) {
      fullHistoryData.push({
        date: key,
        commitCount: commits.length,
      })
    }

    return fullHistoryData
  }, [absoluteDaysDiff])

  const matheusMap = new Map<string, CommitStats[]>()

  for (let i = commits.length - 1; i >= 0; i--) {
    const commit = commits[i]!

    const date = new Date(commit.date)
    let key
    switch (groupBy) {
      case 'day':
      case 'week':
      case '2weeks':
        key = commit.date.split('T')[0]
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
    matheusMap.get(key)!.push(commit)
  }

  const matheusF = Array.from(matheusMap.entries())
  const matheusData: {
    date: string
    lines: number
    commitCount: number
    added: number
    removed: number
  }[] = []

  let totalLines = 0
  for (let i = 0; i < matheusF.length; i++) {
    const [key, commitsList] = matheusF[i]!
    let added = 0
    let removed = 0
    for (let j = 0; j < commitsList.length; j++) {
      const commit = commitsList[j]!
      totalLines += commit.added - commit.removed
      added += commit.added
      removed += commit.removed
    }

    if (
      dateRanges.maxDate >= new Date(key) &&
      dateRanges.minDate <= new Date(key)
    ) {
      matheusData.push({
        date: key,
        lines: totalLines,
        commitCount: commitsList.length,
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
    <div>
      <div className="text-obsidian-field mb-3 flex flex-wrap gap-2">
        <div className="bg-core-flux rounded-full px-6 py-3 text-right lg:px-10 lg:py-5">
          <p className="w-full text-2xl font-black lg:text-4xl">
            {matheusData
              .reduce((sum, item) => sum + item.commitCount, 0)
              .toLocaleString()}
          </p>
          <p className="font-semibold max-lg:text-sm">Total commits</p>
        </div>

        <div className="bg-ion-drift rounded-full px-6 py-3 text-right lg:px-10 lg:py-5">
          <p className="w-full text-2xl font-black lg:text-4xl">
            {(totalAdded - totalRemoved).toLocaleString()}
          </p>
          <p className="font-semibold max-lg:text-sm">Total lines</p>
        </div>

        <div className="bg-alloy-ember rounded-full px-6 py-3 text-right lg:px-10 lg:py-5">
          <p className="w-full text-2xl font-black lg:text-4xl">
            +{totalAdded.toLocaleString()}
          </p>
          <p className="font-semibold max-lg:text-sm">Total lines added</p>
        </div>

        <div className="bg-pinky rounded-full px-6 py-3 text-right lg:px-10 lg:py-5">
          <p className="w-full text-2xl font-black lg:text-4xl">
            {totalContributors.toLocaleString()}
          </p>
          <p className="font-semibold max-lg:text-sm">Contributors</p>
        </div>
      </div>

      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[250px] w-full"
      >
        <AreaChart data={matheusData} margin={{ left: 10, right: 10 }}>
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

                    commitCount: number
                  }

                  // Format the date based on groupBy
                  let formattedDate: string
                  if (groupBy === 'day') {
                    formattedDate = hasMoreThan1Year
                      ? format(new Date(data.date), 'MMM d, yy')
                      : format(new Date(data.date), 'MMM d')
                  } else if (groupBy === 'week' || groupBy === '2weeks') {
                    const date = new Date(data.date)
                    const weekStart = new Date(date)
                    const weekEnd = new Date(date)
                    weekEnd.setDate(weekEnd.getDate() + 6)
                    const startDay = format(weekStart, 'd')
                    const endDay = format(weekEnd, 'd')
                    const startMonth = format(weekStart, 'MMM')
                    const endMonth = format(weekEnd, 'MMM')
                    const year = format(weekEnd, 'yyyy')

                    if (startMonth === endMonth) {
                      formattedDate = `${startDay} - ${endDay} ${startMonth} ${year}`
                    } else {
                      formattedDate = `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`
                    }
                  } else {
                    const [year, month] = data.date.split('-')
                    const date = new Date(parseInt(year), parseInt(month) - 1)
                    formattedDate = format(date, 'MMM yyyy')
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
        <LineChart data={fullHistoryData}>
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
    </div>
  )
}
