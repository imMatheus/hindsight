import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from './ui/chart'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import type { CommitStats } from '@/types'

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
  const dates = stats.map((stat) => new Date(stat.date))
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
  const daysDiff = Math.floor(
    (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Determine grouping strategy
  let groupBy: 'day' | 'week' | '2weeks' | 'month'
  if (daysDiff <= 90) {
    groupBy = 'day'
  } else if (daysDiff <= 365) {
    groupBy = 'week'
  } else if (daysDiff <= 730) {
    groupBy = '2weeks'
  } else {
    groupBy = 'month'
  }

  const groupedData = stats
    .map((stat) => {
      const date = new Date(stat.date)
      let key: string

      switch (groupBy) {
        case 'day':
          key = stat.date.split('T')[0]
          break
        case 'week':
          key = getWeekKey(date, 1)
          break
        case '2weeks':
          key = getWeekKey(date, 2)
          break
        case 'month':
          key = getMonthKey(date)
          break
      }

      return {
        date: key,
        added: stat.added,
        removed: stat.removed,
        representativeDate: stat.date,
      }
    })
    .reduce(
      (acc, curr) => {
        const existing = acc.find((item) => item.date === curr.date)
        if (existing) {
          existing.added += curr.added
          existing.removed += curr.removed
          existing.commitCount += 1
        } else {
          acc.push({
            ...curr,
            commitCount: 1,
          })
        }
        return acc
      },
      [] as Array<{
        date: string
        added: number
        removed: number
        commitCount: number
        representativeDate: string
      }>
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  // Calculate cumulative lines
  let cumulativeLines = 0
  const chartData = groupedData.map((item) => {
    cumulativeLines += item.added - item.removed
    return {
      date: item.date,
      lines: cumulativeLines,
      commitCount: item.commitCount,
      representativeDate: item.representativeDate,
    }
  })

  console.log({ chartData, groupBy, daysDiff })

  return (
    <Card className="relative w-full py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-0!">
          <CardTitle>Cumulative Lines Over Time</CardTitle>
          <CardDescription>
            Total lines of code (added - removed) over time
          </CardDescription>
        </div>
        <div className="flex">
          <button className="relative z-30 flex flex-1 shrink-0 flex-col justify-center gap-1 border-t px-6 py-4 text-left select-text even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
            <span className="text-muted-foreground text-xs text-nowrap">
              Total lines
            </span>
            <span className="text-lg leading-none font-bold sm:text-3xl">
              {(totalAdded - totalRemoved).toLocaleString()}
            </span>
          </button>
          <button className="relative z-30 flex flex-1 shrink-0 flex-col justify-center gap-1 border-t px-6 py-4 text-left select-text even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
            <span className="text-muted-foreground text-xs text-nowrap">
              Total lines added
            </span>
            <span className="text-lg leading-none font-bold sm:text-3xl">
              {totalAdded.toLocaleString()}
            </span>
          </button>
          <button className="relative z-30 flex flex-1 shrink-0 flex-col justify-center gap-1 border-t px-6 py-4 text-left select-text even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
            <span className="text-muted-foreground text-xs text-nowrap">
              Total lines removed
            </span>
            <span className="text-lg leading-none font-bold sm:text-3xl">
              {totalRemoved.toLocaleString()}
            </span>
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              minTickGap={20}
              axisLine={false}
              tickFormatter={(value) => {
                if (groupBy === 'day') {
                  const date = new Date(value)
                  return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                } else if (groupBy === 'week' || groupBy === '2weeks') {
                  // Format week keys like "2024-W0" -> "Week 0"
                  const parts = value.split('-W')
                  return `W${parts[1]}`
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
              tickMargin={10}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip
              active
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
                      <div className="font-medium">
                        <div>{formattedDate}</div>
                        <div className="text-muted-foreground mt-0.5 text-xs font-normal">
                          {data.commitCount}{' '}
                          {data.commitCount === 1 ? 'commit' : 'commits'}
                        </div>
                      </div>
                    )
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent payload={[]} />} />
            <Area
              dataKey="lines"
              type="linear"
              fill="var(--chart-1)"
              fillOpacity={0.4}
              stroke="var(--chart-1)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
