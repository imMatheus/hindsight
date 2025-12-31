import React, { useLayoutEffect, useMemo, useState } from 'react'
import type { CommitStats, GitHubPullRequest } from '@/types'
import { format } from 'date-fns'

interface OverviewRecapProps {
  commits: CommitStats[]
  pullRequests: { total_count: number; items: GitHubPullRequest[] } | null
}

export const OverviewRecap: React.FC<OverviewRecapProps> = ({
  commits,
  pullRequests,
}) => {
  console.log({ commits, pullRequests })

  const [documentSize, setDocumentSize] = useState(() => ({
    x: document.documentElement.clientWidth,
    y: document.documentElement.clientHeight,
  }))

  useLayoutEffect(() => {
    const handleResize = (e: UIEvent) => {
      // did you know that video src causes an unavoidable resize event even if sizes are determined?
      // only care about viewport-level changes here
      if (e.target !== window && e.target !== window.visualViewport) return
      setDocumentSize({
        x: document.documentElement.clientWidth,
        y: document.documentElement.clientHeight,
      })
    }

    window.addEventListener('resize', handleResize, true)
    return () => {
      window.removeEventListener('resize', handleResize, true)
    }
  }, [])

  const CARD_SIZE = 580

  const scale = Math.min(
    1,
    Math.min(documentSize.x / CARD_SIZE, documentSize.y / CARD_SIZE)
  )

  const linesHistogram = calculateLinesHistogram(commits, 12)
  const maxValue = Math.max(...linesHistogram)

  const uniqueAuthors = new Set(commits.map((commit) => commit.author)).size
  const totalLinesAdded = commits.reduce(
    (acc, commit) => acc + (commit.added - commit.removed),
    0
  )

  const contributors: Record<
    string,
    { name: string; commits: number; added: number; removed: number }
  > = {}
  for (let i = 0; i < commits.length; i++) {
    const stat = commits[i]!

    if (contributors[stat.author]) {
      contributors[stat.author].commits += 1
      contributors[stat.author].added += stat.added
      contributors[stat.author].removed += stat.removed
    } else {
      contributors[stat.author] = {
        name: stat.author,
        commits: 1,
        added: stat.added,
        removed: stat.removed,
      }
    }
  }

  const sortedContributors = Object.entries(contributors)
    .sort((a, b) => b[1].commits - a[1].commits)
    .slice(0, 3)
    .map(([_, contributor]) => contributor)

  console.log({ maxValue, linesHistogram })

  const { daysArray, maxCommitsInADay, longestStreak } = useMemo(() => {
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

    let longestStreak = 0
    let currentStreak = 0
    for (const [_, count] of daysArray) {
      if (count > 0) {
        currentStreak++
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak
        }
      } else {
        currentStreak = 0
      }
    }

    return { daysArray, maxCommitsInADay, longestStreak }
  }, [commits])

  const firstDate = new Date(daysArray[0][0])
  const firstDayOfTheWeek = firstDate.getDay()

  return (
    <div
      className="flex-center relative w-full px-4"
      style={{ height: scale * CARD_SIZE }}
    >
      <div
        className="mx-auto shrink-0"
        style={{
          width: CARD_SIZE,
          height: CARD_SIZE,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <div className="bg-polar-sand text-obsidian-field grid size-full grid-cols-2 gap-3 p-4">
          <div className="flex flex-col">
            <div className="flex-1 space-y-10">
              {/* <div className="bg-core-flux mb-4 w-max rounded-full px-4 py-2 text-lg font-bold">
                YEAR OF 2025
              </div> */}
              <div className="">
                <p className="bg-core-flux mb-2 w-max rounded-full px-3 py-1 text-sm font-bold">
                  Overview
                </p>

                <div className="grid grid-cols-2 gap-2 gap-y-4">
                  <div className="">
                    <h4 className="text-sm font-semibold">Total commits</h4>
                    <p className="text-3xl font-black">
                      {commits.length.toLocaleString()}
                    </p>
                  </div>

                  <div className="">
                    <h4 className="text-sm font-semibold">Total lines added</h4>
                    <p className="text-3xl font-black">
                      {totalLinesAdded >= 1_000_000
                        ? `${(totalLinesAdded / 1_000_000).toFixed(1)}m`
                        : totalLinesAdded >= 1_000
                          ? `${(totalLinesAdded / 1_000).toFixed(1)}k`
                          : totalLinesAdded.toLocaleString()}
                    </p>
                  </div>

                  <div className="">
                    <h4 className="text-sm font-semibold">Contributors</h4>
                    <p className="text-3xl font-black">
                      {uniqueAuthors.toLocaleString()}
                    </p>
                  </div>

                  <div className="">
                    <h4 className="text-sm font-semibold">Total PRs</h4>
                    <p className="text-3xl font-black">
                      {pullRequests?.total_count.toLocaleString() ?? 10}
                    </p>
                  </div>
                </div>
              </div>

              <div className="">
                {/* <p className="mb-2 text-sm font-semibold"> */}
                <p className="bg-ion-drift mb-2 w-max rounded-full px-3 py-1 text-sm font-bold">
                  Lines per month
                </p>

                <div className="flex h-10 items-end gap-0.5">
                  {linesHistogram.map((line, index) => (
                    <div
                      key={index}
                      className="bg-ion-drift flex-1 rounded-none"
                      style={{
                        height: `${(line / maxValue) * 100}%`,
                        minHeight: '8px',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="">
                <p className="bg-pinky mb-2 w-max rounded-full px-3 py-1 text-sm font-bold">
                  Top contributors
                </p>
                <div className="">
                  {sortedContributors.map((contributor, index) => (
                    <p
                      key={contributor.name}
                      className="truncate text-2xl font-bold"
                    >
                      #{index + 1} {contributor.name}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <p className="shrink-0 text-xl font-bold">
              {'>'} gitback.immatheus.com
            </p>
          </div>

          <div className="grid size-full min-h-0 grid-cols-[repeat(12,1fr)] justify-center gap-0">
            {daysArray.map(([day, count]) => (
              <div className="flex-center size-full" key={day}>
                <div
                  className="aspect-square size-full rounded-full border border-black/10"
                  style={{
                    maxHeight: 13,
                    maxWidth: 13,
                    background: count === 0 ? colors[0] : colors[1],

                    //   background:
                    //   count === 0
                    //     ? colors[0]
                    //     : count > maxCommitsInADay * 0.7
                    //       ? colors[1]
                    //       : count > maxCommitsInADay * 0.55
                    //         ? colors[2]
                    //         : count > maxCommitsInADay * 0.32
                    //           ? colors[3]
                    //           : colors[4],
                  }}
                ></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const calculateLinesHistogram = (commits: CommitStats[], points: number) => {
  if (commits.length === 0) {
    return Array.from({ length: points }, () => 0)
  }

  const sortedCommits = [...commits].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  const histogram = Array.from({ length: points }, () => 0)
  const commitsPerBucket = Math.floor(sortedCommits.length / points)
  const actualCommitsPerBucket = commitsPerBucket === 0 ? 1 : commitsPerBucket

  let totalLines = 0
  let bucketIndex = 0

  for (let i = 0; i < sortedCommits.length; i++) {
    const commit = sortedCommits[i]
    totalLines += commit.added - commit.removed

    if ((i + 1) % actualCommitsPerBucket === 0 && bucketIndex < points) {
      histogram[bucketIndex] = totalLines
      bucketIndex++
    }
  }

  for (let i = bucketIndex; i < points; i++) {
    histogram[i] = totalLines
  }

  return histogram
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

// const colors = ['#f00', '#0ff', '#BB4D34', '#8B3A29', '#0f0']
// const colors = ['#2e1615', '#EB603E', '#B1482F', '#b88826', '#76301F']
const colors = ['#2e1615', '#b88826', '#B1482F', '#943C27', '#76301F']
// const colors = ['#2A1413', '#EE7759', '#BB4D34', '#8B3A29', '#5B271E']
