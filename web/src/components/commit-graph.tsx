import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
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
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card'
import type { CommitStats } from '@/types'

// const chartData = [
//   { month: 'January', desktop: 186, mobile: 80 },
//   { month: 'February', desktop: 305, mobile: 200 },
//   { month: 'March', desktop: 237, mobile: 120 },
//   { month: 'April', desktop: 73, mobile: 190 },
//   { month: 'May', desktop: 209, mobile: 130 },
//   { month: 'June', desktop: 214, mobile: 140 },
// ]

const chartConfig = {
  added: {
    label: 'Added',
    color: 'var(--chart-1)',
  },
  removed: {
    label: 'Removed',
    color: 'var(--chart-2)',
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

  const chartData = stats
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
      }
    })
    .reduce((acc, curr) => {
      const existing = acc.find((item) => item.date === curr.date)
      if (existing) {
        existing.added += curr.added
        existing.removed += curr.removed
      } else {
        acc.push(curr)
      }
      return acc
    }, [] as Array<{ date: string; added: number; removed: number }>)
    .sort((a, b) => a.date.localeCompare(b.date))

  console.log({ chartData, groupBy, daysDiff })

  return (
    <Card className="w-full relative py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-0!">
          <CardTitle>Bar Chart - Interactive</CardTitle>
          <CardDescription>
            Showing total visitors for the last 3 months
          </CardDescription>
        </div>
        <div className="flex">
          <button className="select-text shrink-0 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
            <span className="text-muted-foreground text-nowrap text-xs">
              Total lines
            </span>
            <span className="text-lg leading-none font-bold sm:text-3xl">
              {(totalAdded - totalRemoved).toLocaleString()}
            </span>
          </button>
          <button className="select-text shrink-0 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
            <span className="text-muted-foreground text-nowrap text-xs">
              Total lines added
            </span>
            <span className="text-lg leading-none font-bold sm:text-3xl">
              {totalAdded.toLocaleString()}
            </span>
          </button>
          <button className="select-text shrink-0 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
            <span className="text-muted-foreground text-nowrap text-xs">
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
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
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
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent payload={[]} />} />
            <Bar
              dataKey="added"
              stackId="a"
              fill="var(--chart-1)"
              // radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="removed"
              stackId="a"
              fill="var(--chart-2)"
              // radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Trending up by 5.2% this month
        </div>
        <div className="text-muted-foreground leading-none">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
  )
}
