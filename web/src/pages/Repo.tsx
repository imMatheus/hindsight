import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CommitGraph } from '../components/commit-graph'
import type { CommitStats, FileTouchCount } from '@/types'
import { LoadingAnimation } from '@/components/loading-animation'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import NotFound from './NotFound'
import { TopContributors } from '@/components/top-contributors'
import { CommitWordCloud } from '@/components/commit-wordcloud'
import { FileHeatmap } from '@/components/file-heatmap'
import { FileCountDistribution } from '@/components/file-count-distributionProps'

async function analyzeRepo(username: string, repo: string) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080'
  const response = await fetch(`${apiUrl}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, repo }),
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('NOT_FOUND')
    }
    throw new Error('Failed to analyze repository')
  }

  return response.json() as Promise<{
    message: string
    totalAdded: number
    totalRemoved: number
    totalContributors: number
    commits: CommitStats[]
    mostTouchedFiles: FileTouchCount[]
  }>
}

const THIS_YEAR = new Date('01-01-2025').getFullYear()

export default function Repo() {
  const { username, repo } = useParams<{ username: string; repo: string }>()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['repo', username, repo],
    queryFn: () => analyzeRepo(username!, repo!),
    enabled: !!username && !!repo,
    retry: 3,
    retryDelay: 400,
    refetchOnMount: false,
  })

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingAnimation />
      </div>
    )
  }

  if (isError || !data) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return <NotFound isRepo={true} />
    }
    return (
      <div>
        Error: {error instanceof Error ? error.message : 'Failed to analyze'}
      </div>
    )
  }

  const commitsThisYear = data.commits.filter(
    (commit) => new Date(commit.date).getFullYear() === THIS_YEAR
  )

  return (
    <div className="mx-auto min-h-screen max-w-6xl pt-4 pb-32">
      <div className="px-6">
        <div className="mb-4 flex items-center">
          <Link to={'/'} className="">
            <img
              src="/images/logo.png"
              alt="GitBack"
              className="size-10 object-cover"
            />
          </Link>
        </div>
        <div className="mb-10 flex justify-between">
          <div className="">
            <h1 className="mb-3 text-5xl font-black tracking-tight">{repo}</h1>
            <h3 className="text-xl font-medium tracking-tight">{username}</h3>
          </div>
        </div>

        <CommitGraph
          commits={data.commits}
          totalContributors={data.totalContributors}
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
              <p className="text-obsidian-field w-full text-5xl font-black">
                Git Wrapped
              </p>
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

        <div className="mt-52 space-y-52">
          <CraziestWeek stats={commitsThisYear} />
          <TopContributors commits={commitsThisYear} />
          <FileCountDistribution commits={commitsThisYear} />
          <CommitWordCloud commits={commitsThisYear} />
          <FileHeatmap mostTouchedFiles={data.mostTouchedFiles} />
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
      <h3 className="mb-2 text-5xl font-black">Most commits in one week</h3>
      <p className="mb-4 text-xl font-semibold">
        {format(weekData.weekStart, 'MMMM d, yyyy')}
      </p>

      <h3 className="mb-5 text-6xl font-black">
        {weekData.totalCommits.toLocaleString()} commits
      </h3>
      <div className="max-w-2xl space-y-2">
        {dayData.map((day, index) => {
          const widthPercent =
            maxDayCommits > 0 ? (day.count / maxDayCommits) * 100 : 0
          const colorClass = colorClasses[index % colorClasses.length]
          const heightClass =
            index === 0
              ? 'h-24 hover:h-28'
              : index === 1
                ? 'h-20 hover:h-24'
                : index === 2
                  ? 'h-16 hover:h-20'
                  : 'h-12 hover:h-16'

          return (
            <div
              key={day.dayName}
              className="grid grid-cols-[1fr_auto] items-center gap-x-7"
            >
              <div
                className={`${colorClass} ${heightClass} flex items-center rounded-full px-5 transition-all duration-1000 ease-in-out hover:duration-150`}
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
