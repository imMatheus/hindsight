import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CommitGraph } from '../components/commit-graph'
import type { CommitStats } from '@/types'
import { LoadingAnimation } from '@/components/loading-animation'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

async function analyzeRepo(username: string, repo: string) {
  const response = await fetch('http://localhost:8080/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, repo }),
  })

  if (!response.ok) {
    throw new Error('Failed to analyze repository')
  }

  return response.json() as Promise<{
    message: string
    totalAdded: number
    totalRemoved: number
    totalContributors: number
    stats: CommitStats[]
  }>
}

export default function Repo() {
  const { username, repo } = useParams<{ username: string; repo: string }>()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analyze', username, repo],
    queryFn: () => analyzeRepo(username!, repo!),
    enabled: !!username && !!repo,
  })

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingAnimation />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div>
        Error: {error instanceof Error ? error.message : 'Failed to analyze'}
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl pt-4 pb-32">
      <div className="px-6">
        <div className="mb-4 flex items-center">
          <Link to={'/'} className="text-sm hover:underline">
            ← Search another one
          </Link>
        </div>
        <div className="mb-10 flex justify-between">
          <div className="">
            <h1 className="mb-3 text-5xl font-black tracking-tight">{repo}</h1>
            <h3 className="text-xl font-medium tracking-tight">{username}</h3>
          </div>

          <div className="flex gap-2">
            <div className="flex-center text-pinky bg-core-flux flex-col rounded-full px-10 py-5 text-right">
              <p className="w-full text-4xl font-black">
                {data.stats.length.toLocaleString()}
              </p>
              <p className="font-semibold">Total commits</p>
            </div>

            <div className="flex-center text-core-flux bg-pinky flex-col rounded-full px-10 py-5 text-right">
              <p className="w-full text-4xl font-black">
                {data.totalContributors.toLocaleString()}
              </p>
              <p className="font-semibold">Contributors</p>
            </div>
          </div>
        </div>

        <CommitGraph
          stats={data.stats}
          totalAdded={data.totalAdded}
          totalRemoved={data.totalRemoved}
        />

        <div className="my-10 grid grid-rows-3 space-y-3">
          <div className="flex gap-3 transition-all ease-in-out">
            <div className="bg-ion-drift flex-1 rounded-full transition-all duration-1000 ease-in-out hover:flex-2 hover:duration-100" />
            <div className="bg-core-flux flex-1 rounded-full transition-all duration-1000 ease-in-out hover:flex-2 hover:duration-100" />
            <div className="bg-pinky flex-1 rounded-full transition-all duration-1000 ease-in-out hover:flex-2 hover:duration-100" />
            <div className="bg-polar-sand flex-1 rounded-full transition-all duration-1000 ease-in-out hover:flex-2 hover:duration-100" />
            <div className="bg-pinky flex-1 rounded-full transition-all duration-1000 ease-in-out hover:flex-2 hover:duration-100" />
          </div>
          <div className="flex gap-3 transition-all ease-in-out">
            <div className="bg-pinky flex-1 rounded-full transition-all duration-1000 ease-in-out hover:flex-2 hover:duration-100" />
            <div className="bg-polar-sand flex-1 rounded-full transition-all duration-1000 ease-in-out hover:flex-2 hover:duration-100" />
            <div className="flex-center text-polar-sand bg-core-flux w-max flex-col rounded-full px-12 py-5 text-center transition-all duration-1000 ease-in-out hover:px-20 hover:duration-100">
              <p className="w-full text-5xl font-black">Repo Wrapped</p>
            </div>
            <div className="bg-ion-drift flex-1 rounded-full transition-all duration-1000 ease-in-out hover:flex-2 hover:duration-100" />
            <div className="bg-polar-sand flex-1 rounded-full transition-all duration-1000 ease-in-out hover:flex-2 hover:duration-100" />
          </div>
          <div className="flex gap-3 transition-all ease-in-out">
            <div className="bg-core-flux flex-1 rounded-full transition-all duration-1000 ease-in-out hover:flex-2 hover:duration-100" />
            <div className="bg-ion-drift flex-1 rounded-full transition-all duration-1000 ease-in-out hover:flex-2 hover:duration-100" />
            <div className="bg-polar-sand flex-1 rounded-full transition-all duration-1000 ease-in-out hover:flex-2 hover:duration-100" />
            <div className="bg-core-flux flex-1 rounded-full transition-all duration-1000 ease-in-out hover:flex-2 hover:duration-100" />
            <div className="bg-pinky flex-1 rounded-full transition-all duration-1000 ease-in-out hover:flex-2 hover:duration-100" />
          </div>
        </div>

        <div className="pt-32">
          <CraziestWeek stats={data.stats} />
        </div>
      </div>
    </div>
  )
}

interface WeekData {
  weekStart: Date
  commits: CommitStats[]
  totalCommits: number
}

interface DayData {
  dayName: string
  commits: CommitStats[]
  count: number
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  return d
}

function getWeekKey(date: Date): string {
  const weekStart = getWeekStart(date)
  return weekStart.toISOString().split('T')[0]
}

function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

function findCraziestWeek(stats: CommitStats[]): {
  weekData: WeekData
  dayData: DayData[]
} | null {
  if (stats.length === 0) return null

  // Group commits by week
  const weekMap = new Map<string, CommitStats[]>()
  for (const stat of stats) {
    const date = new Date(stat.date)
    const weekKey = getWeekKey(date)
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, [])
    }
    weekMap.get(weekKey)!.push(stat)
  }

  // Find the week with the most commits
  let maxCommits = 0
  let craziestWeekKey: string | null = null

  for (const [weekKey, commits] of weekMap.entries()) {
    if (commits.length > maxCommits) {
      maxCommits = commits.length
      craziestWeekKey = weekKey
    }
  }

  if (!craziestWeekKey) return null

  const weekCommits = weekMap.get(craziestWeekKey)!
  const weekStart = getWeekStart(new Date(weekCommits[0].date))

  // Group commits by day of the week
  const dayMap = new Map<string, CommitStats[]>()
  for (const stat of weekCommits) {
    const date = new Date(stat.date)
    const dayName = getDayName(date)
    if (!dayMap.has(dayName)) {
      dayMap.set(dayName, [])
    }
    dayMap.get(dayName)!.push(stat)
  }

  // Convert to array - include all days
  const dayOrder = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]
  const dayData: DayData[] = dayOrder
    .map((dayName) => {
      const commits = dayMap.get(dayName) || []
      return {
        dayName,
        commits,
        count: commits.length,
      }
    })
    .sort((a, b) => b.count - a.count) // Sort by commit count descending

  return {
    weekData: {
      weekStart,
      commits: weekCommits,
      totalCommits: weekCommits.length,
    },
    dayData,
  }
}

interface CraziestWeekProps {
  stats: CommitStats[]
}

const colorClasses = [
  'bg-core-flux',
  'bg-ion-drift',
  'bg-pinky',
  'bg-polar-sand',
  'bg-alloy-ember',
]

function CraziestWeek({ stats }: CraziestWeekProps) {
  const result = findCraziestWeek(stats)

  if (!result) {
    return null
  }

  const { weekData, dayData } = result
  const maxDayCommits = Math.max(...dayData.map((d) => d.count), 1)

  return (
    <div className="">
      <h3 className="text-4xl font-black">Most commits in one week</h3>
      <p className="text-ion-drift mb-4 text-xl font-semibold">
        {format(weekData.weekStart, 'MMMM d, yyyy')}
      </p>

      <h3 className="mb-5 text-5xl font-black">
        {weekData.totalCommits.toLocaleString()} commits
      </h3>
      <div className="max-w-2xl space-y-2">
        {dayData.map((day, index) => {
          const widthPercent =
            maxDayCommits > 0 ? (day.count / maxDayCommits) * 100 : 0
          const colorClass = colorClasses[index % colorClasses.length]
          const heightClass =
            index === 0
              ? 'h-24'
              : index === 1
                ? 'h-20'
                : index === 2
                  ? 'h-16'
                  : 'h-12'

          return (
            <div
              key={day.dayName}
              className="grid grid-cols-[1fr_auto] items-center gap-x-7"
            >
              <div
                className={`${colorClass} ${heightClass} flex items-center rounded-full px-5`}
                style={{
                  minWidth: 'min-content',
                  width: `${Math.max(widthPercent, day.count > 0 ? 5 : 0)}%`,
                }}
              >
                <p
                  className={cn('text-obsidian-field font-bold', {
                    'text-4xl': index === 0,
                    'text-3xl': index === 1,
                    'text-2xl': index === 2,
                    'text-xl': index > 2,
                  })}
                >
                  {day.dayName}
                </p>
              </div>
              <p className="text-2xl font-bold">
                {day.count.toLocaleString()} commits
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
