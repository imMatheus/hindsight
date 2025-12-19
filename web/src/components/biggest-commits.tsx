import { cn } from '@/lib/utils'
import type { CommitStats } from '@/types'
import { format } from 'date-fns'
import React from 'react'

interface BiggestCommitsProps {
  commits: CommitStats[]
  repo: string
  username: string
}

export const BiggestCommits: React.FC<BiggestCommitsProps> = ({
  commits,
  repo,
  username,
}) => {
  const biggestCommits = commits
    .sort((a, b) => b.added - b.removed - (a.added - a.removed))
    .slice(0, 5)
  const smallestCommits = commits
    .filter((commit) => commit.added - commit.removed < 0)
    .sort((a, b) => a.added - a.removed - (b.added - b.removed))
    .slice(0, 5)

  return (
    <>
      <div>
        <h3 className="my-4 text-6xl font-black">Biggest Commits</h3>
        <p className="mt-2 text-xl leading-relaxed font-semibold">
          Someone definitely just ran some formatter or moved a folder
        </p>

        <div className="mt-10 grid grid-cols-2 gap-4">
          {biggestCommits.map((commit, index) => (
            <a
              key={commit.hash}
              target="_blank"
              rel="noopener noreferrer"
              href={`https://github.com/${username}/${repo}/commit/${commit.hash}`}
              className="group relative block"
            >
              <div
                className={cn(
                  'absolute inset-0 rounded-full transition-all duration-500 ease-in-out group-hover:-inset-1.5 group-hover:duration-150',
                  {
                    'bg-core-flux': index === 0,
                    'bg-ion-drift': index === 1,
                    'bg-pinky': index === 2,
                    'bg-polar-sand': index === 3,
                    'bg-alloy-ember': index === 4,
                  }
                )}
              />
              <div className="text-obsidian-field relative px-12 py-6">
                <p className="mb-1 text-3xl font-black">
                  {(commit.added - commit.removed).toLocaleString()} lines added
                </p>
                <p className="line-clamp-2 text-lg font-bold">
                  {commit.message}
                </p>

                <p className="mt-3 text-base font-black">
                  {commit.author},{' '}
                  {format(new Date(commit.date), 'MMM d, yyyy')}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {smallestCommits.length > 0 && (
        <div>
          <h3 className="my-4 text-6xl font-black">
            Commits with most lines removed
          </h3>
          <p className="mt-2 text-xl leading-relaxed font-semibold">
            This is where the real engineering happens
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {smallestCommits.map((commit, index) => (
              <a
                key={commit.hash}
                target="_blank"
                rel="noopener noreferrer"
                href={`https://github.com/${username}/${repo}/commit/${commit.hash}`}
                className="group relative block"
              >
                <div
                  className={cn(
                    'absolute inset-0 rounded-full transition-all duration-500 ease-in-out group-hover:-inset-1.5 group-hover:duration-150',
                    {
                      'bg-core-flux': index === 0,
                      'bg-ion-drift': index === 1,
                      'bg-pinky': index === 2,
                      'bg-polar-sand': index === 3,
                      'bg-alloy-ember': index === 4,
                    }
                  )}
                />
                <div className="text-obsidian-field relative px-12 py-6">
                  <p className="mb-1 text-3xl font-black">
                    {(commit.added - commit.removed).toLocaleString()} lines
                    removed
                  </p>
                  <p className="line-clamp-2 text-lg font-bold">
                    {commit.message}
                  </p>

                  <p className="mt-3 text-base font-black">
                    {commit.author},{' '}
                    {format(new Date(commit.date), 'MMM d, yyyy')}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
