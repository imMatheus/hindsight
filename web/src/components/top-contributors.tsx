import { cn } from '@/lib/utils'
import type { CommitStats } from '@/types'
import React from 'react'

interface TopContributorsProps {
  commits: CommitStats[]
}

export const TopContributors: React.FC<TopContributorsProps> = ({
  commits,
}) => {
  let totalCommitsThisYear = 0
  const contributors: Record<
    string,
    { name: string; commits: number; added: number; removed: number }
  > = {}
  for (let i = 0; i < commits.length; i++) {
    const stat = commits[i]!

    totalCommitsThisYear++

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
    .slice(0, 10)
    .map(([_, contributor]) => contributor)

  let totalAdded = 0
  let totalRemoved = 0
  let totalCommits = 0
  for (const contributor of sortedContributors) {
    totalAdded += contributor.added
    totalRemoved += contributor.removed
    totalCommits += contributor.commits
  }

  return (
    <div className="">
      {/* <h3 className="bg-core-flux text-obsidian-field w-max rounded-full px-7 py-4 text-6xl font-black">
        Top Contributors
      </h3> */}
      <h3 className="my-4 text-6xl font-black">Top Contributors</h3>
      <p className="mt-2 text-xl leading-relaxed font-semibold">
        These people lowkey carried, collectively pushing{' '}
        <span className="bg-polar-sand text-obsidian-field rounded-full px-2.5 py-0.5 font-bold">
          {totalCommits.toLocaleString()}
        </span>{' '}
        commits out of{' '}
        <span className="bg-ion-drift text-obsidian-field rounded-full px-2.5 py-0.5 font-bold">
          {totalCommitsThisYear.toLocaleString()}
        </span>{' '}
        this year. Adding{' '}
        <span className="bg-alloy-ember text-obsidian-field rounded-full px-2.5 py-0.5 font-bold">
          {totalAdded.toLocaleString()}
        </span>{' '}
        lines of code and removing{' '}
        <span className="bg-pinky text-obsidian-field rounded-full px-2.5 py-0.5 font-bold">
          {totalRemoved.toLocaleString()}
        </span>{' '}
      </p>

      <div className="mt-10 grid grid-cols-5 gap-4">
        {sortedContributors.map((contributor, index) => (
          <div
            key={contributor.name}
            className={cn(
              'bg-pinky text-obsidian-field rounded-full p-6 pr-2! transition-all',
              index === 0
                ? 'col-span-3 row-span-2 flex flex-col justify-center p-10'
                : index === 1 || index === 2 || index < 5 || index === 7
                  ? 'col-span-2'
                  : 'col-span-1',
              {
                'bg-core-flux': index % 5 === 0,
                'bg-ion-drift': index % 5 === 1,
                'bg-pinky': index % 5 === 2,
                'bg-polar-sand': index % 5 === 3,
                'bg-alloy-ember': index % 5 === 4,
              }
            )}
          >
            <div className="flex gap-2">
              <div
                className={cn('text-3xl font-bold', {
                  'text-6xl': index === 0,
                  'text-5xl': index === 1,
                  'text-4xl': index === 2,
                })}
              >
                #{index + 1}
              </div>
              <div className="min-w-0">
                <p
                  className={cn('truncate text-xl font-bold', {
                    'text-5xl': index === 0,
                    'text-3xl': index === 1,
                    'text-2xl': index === 2,
                    'text-xl': index === 3,
                  })}
                  title={contributor.name}
                  style={{
                    lineHeight: '1.4',
                  }}
                >
                  {contributor.name}
                </p>
                <p
                  className={cn('text-sm font-semibold', {
                    'text-xl font-bold': index === 0,
                    'text-lg': index === 1,
                  })}
                >
                  {contributor.commits} commits
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
