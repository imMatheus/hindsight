import { cn } from '@/lib/utils'
import type { CommitStats } from '@/types'
import { format } from 'date-fns'
import React, { useMemo, useState } from 'react'

interface CommitGridProps {
  commits: CommitStats[]
}

const getAllDaysInYear = (year: number) => {
  const days: Record<string, number> = {}
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year, 11, 31)

  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    days[format(currentDate, 'EEEE, d MMM, yyyy')] = 0
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return days
}

export const CommitGrid: React.FC<CommitGridProps> = ({ commits }) => {
  console.log({ commits })
  const [hoverDay, setHoverDay] = useState<string | null>(null)
  const { daysArray, maxCommitsInADay } = useMemo(() => {
    const dayToCommitMap = getAllDaysInYear(2025)

    let maxCommitsInADay = 0
    for (const commit of commits) {
      const day = format(new Date(commit.date), 'EEEE, d MMM, yyyy')
      dayToCommitMap[day]++
      if (dayToCommitMap[day] > maxCommitsInADay) {
        maxCommitsInADay = dayToCommitMap[day]
      }
    }

    const daysArray = Object.entries(dayToCommitMap).sort((a, b) => {
      return new Date(a[0]).getTime() - new Date(b[0]).getTime()
    })

    return { daysArray, maxCommitsInADay }
  }, [commits])

  const firstDate = new Date(daysArray[0][0])
  const firstDayOfTheWeek = firstDate.getDay()

  // just to align the first row being mondays
  const offsetDays =
    firstDayOfTheWeek === 0
      ? []
      : Array.from({ length: Math.abs(firstDayOfTheWeek - 1) }, (_, i) => i + 1)

  const colors = ['#2A1413', '#EE7759', '#BB4D34', '#8B3A29', '#5B271E']

  return (
    <div>
      <h3 className="mb-2 text-6xl font-black">Commit Grid</h3>
      <p className="mb-5 text-xl font-semibold">
        {maxCommitsInADay === 0
          ? 'No commits were made in the year of 2025.'
          : `The most commits in a day was ${maxCommitsInADay} commits in the year of 2025.`}
      </p>
      <div className="grid grid-flow-col grid-cols-[auto_repeat(53,1fr)] grid-rows-7 gap-px sm:gap-[4px]">
        <div className="pr-1 text-xs font-semibold opacity-50"></div>
        <div className="pr-1 text-xs font-semibold opacity-50">Tue</div>
        <div className="pr-1 text-xs font-semibold opacity-50"></div>
        <div className="pr-1 text-xs font-semibold opacity-50">Thu</div>
        <div className="pr-1 text-xs font-semibold opacity-50"></div>
        <div className="pr-1 text-xs font-semibold opacity-50">Sat</div>
        <div className="pr-1 text-xs font-semibold opacity-50"></div>
        {offsetDays.map((day) => (
          <div key={day} className="bg-transparent"></div>
        ))}
        {daysArray.map(([day, count]) => (
          <div
            key={day}
            onMouseEnter={() => setHoverDay(day)}
            onMouseLeave={() => setHoverDay(null)}
            className="relative flex aspect-square flex-col items-center rounded-[1px] border-black/10 sm:rounded-sm sm:border"
            style={{
              background:
                count === 0
                  ? colors[0]
                  : count > maxCommitsInADay * 0.8
                    ? colors[1]
                    : count > maxCommitsInADay * 0.65
                      ? colors[2]
                      : count > maxCommitsInADay * 0.4
                        ? colors[3]
                        : colors[4],
            }}
          >
            {hoverDay === day && (
              <div className="bg-polar-sand text-obsidian-field absolute -top-1 left-1/2 z-1 w-max shrink-0 -translate-x-1/2 -translate-y-full rounded-lg px-3 py-1 text-sm font-bold">
                {count} commits on {day}
                <div className="border-t-polar-sand absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"></div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1">
        <p className="mr-1 text-xs font-semibold">Less</p>
        <div
          className="size-4 rounded-sm border border-black/10"
          style={{ backgroundColor: colors[0] }}
        ></div>
        <div
          className="size-4 rounded-sm border border-black/10"
          style={{ backgroundColor: colors[1] }}
        ></div>
        <div
          className="size-4 rounded-sm border border-black/10"
          style={{ backgroundColor: colors[2] }}
        ></div>
        <div
          className="size-4 rounded-sm border border-black/10"
          style={{ backgroundColor: colors[3] }}
        ></div>
        <div
          className="size-4 rounded-sm border border-black/10"
          style={{ backgroundColor: colors[4] }}
        ></div>
        <p className="ml-1 text-xs font-semibold">More</p>
      </div>
    </div>
  )
}
