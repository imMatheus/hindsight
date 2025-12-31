import { cn } from '@/lib/utils'
import type { GitHubPullRequest } from '@/types'
import React from 'react'

interface TopGitHubPRsProps {
  prs: GitHubPullRequest[]
}

export const TopGitHubPRs: React.FC<TopGitHubPRsProps> = ({ prs }) => {
  if (prs.length === 0) {
    return null
  }

  return (
    <section className="">
      <h3 className="my-4 text-6xl font-black">Top Pull Requests</h3>
      <p className="mt-2 text-xl leading-relaxed font-semibold">
        This repository got{' '}
        <span className="bg-polar-sand text-obsidian-field rounded-full px-2.5 py-0.5 font-bold">
          {Number('12482').toLocaleString()}
        </span>{' '}
        pull requests this year. Here are the top {prs.length} PRs with the most
        reactions.
      </p>

      <div className="mt-10 grid grid-cols-4 gap-4">
        {prs.map((pr: GitHubPullRequest, index: number) => (
          <a
            href={pr.html_url}
            target="_blank"
            rel="noopener noreferrer"
            key={pr.id}
            className={cn(
              'text-obsidian-field group h-max rounded-full p-8',
              index === 0
                ? 'col-span-2 row-span-3 flex flex-col justify-center p-10'
                : index === 1 || index === 2 || index < 5 || index === 7
                  ? 'col-span-2 row-span-2'
                  : 'col-span-1 row-span-2',
              {
                'bg-core-flux': index % 5 === 0,
                'bg-ion-drift': index % 5 === 1,
                'bg-pinky': index % 5 === 2,
                'bg-polar-sand': index % 5 === 3,
                'bg-alloy-ember': index % 5 === 4,
              }
            )}
          >
            <div className="mb-1 flex min-w-0">
              <h4
                className={cn(
                  'line-clamp-2 text-xl font-bold group-hover:underline',
                  {
                    'text-4xl': index === 0,
                    'text-2xl': index === 1 || index === 2,
                  }
                )}
                title={pr.title}
                style={{
                  lineHeight: '1.4',
                }}
              >
                {pr.title}
              </h4>
            </div>
            <div className="flex gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <p
                  className={cn('text-base font-black', {
                    'text-lg': index === 0,
                  })}
                >
                  {pr.user.login}
                </p>
                <p className="font-semibold">
                  <span className="font-bold">{pr.reactions.total_count}</span>{' '}
                  reactions
                </p>
                <p className="font-semibold">
                  <span className="font-bold">{pr.comments}</span> comments
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
