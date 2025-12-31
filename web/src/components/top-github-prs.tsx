import { cn } from '@/lib/utils'
import type { GitHubPullRequest } from '@/types'
import React from 'react'

interface TopGitHubPRsProps {
  prs: GitHubPullRequest[]
}

export const TopGitHubPRs: React.FC<TopGitHubPRsProps> = ({ prs }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getReactionEmoji = (reactionType: string) => {
    const emojiMap: Record<string, string> = {
      '+1': '👍',
      '-1': '👎',
      laugh: '😄',
      hooray: '🎉',
      confused: '😕',
      heart: '❤️',
      rocket: '🚀',
      eyes: '👀',
    }
    return emojiMap[reactionType] || ''
  }

  if (prs.length === 0) {
    return null
  }

  return (
    <div className="my-8">
      <h3 className="my-4 text-6xl font-black">Top Pull Requests</h3>
      <p className="mt-2 text-xl leading-relaxed font-semibold">
        The most active pull requests from this repository. These PRs generated
        the most discussion and changes!
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6">
        {prs.map((pr: GitHubPullRequest, index: number) => (
          <div
            key={pr.id}
            className={cn(
              'text-obsidian-field rounded-full p-8 transition-all duration-500 ease-in-out hover:scale-[1.02]',
              {
                'bg-core-flux': index % 5 === 0,
                'bg-ion-drift': index % 5 === 1,
                'bg-pinky': index % 5 === 2,
                'bg-polar-sand': index % 5 === 3,
                'bg-alloy-ember': index % 5 === 4,
              }
            )}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div className="bg-obsidian-field/20 flex h-16 w-16 items-center justify-center rounded-full">
                  <img
                    src={pr.user.avatar_url}
                    alt={pr.user.login}
                    className="h-12 w-12 rounded-full"
                  />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <div className="bg-obsidian-field/10 flex items-center gap-2 rounded-full px-4 py-1">
                    <span className="text-2xl font-black">#{index + 1}</span>
                    <a
                      href={pr.user.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xl font-black hover:underline"
                    >
                      {pr.user.login}
                    </a>
                  </div>
                  <span className="text-sm font-semibold opacity-80">
                    {formatDate(pr.created_at)}
                  </span>
                  <div className="ml-auto">
                    <span
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-black',
                        {
                          'bg-obsidian-field/20 text-obsidian-field':
                            pr.pull_request?.merged_at || pr.state === 'merged',
                          'bg-obsidian-field/10 text-obsidian-field':
                            pr.state === 'open',
                          'bg-obsidian-field/5 text-obsidian-field': pr.state === 'closed',
                        }
                      )}
                    >
                      {pr.pull_request?.merged_at ? 'MERGED' : pr.state.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="mb-2 text-3xl font-black leading-tight">
                    <a
                      href={pr.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {pr.title}
                    </a>
                  </h4>
                  {pr.body && (
                    <p className="text-lg font-semibold leading-relaxed opacity-90">
                      {truncateText(pr.body, 200)}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-obsidian-field/20 flex items-center gap-2 rounded-full px-4 py-2">
                      <span className="text-lg">💬</span>
                      <span className="font-black">{pr.comments}</span>
                      <span className="text-sm font-semibold opacity-80">comments</span>
                    </div>
                    <div className="bg-obsidian-field/20 flex items-center gap-2 rounded-full px-4 py-2">
                      <span className="text-lg">🎉</span>
                      <span className="font-black">
                        {pr.reactions.total_count}
                      </span>
                      <span className="text-sm font-semibold opacity-80">reactions</span>
                    </div>
                    {Object.entries(pr.reactions)
                      .filter(
                        ([key, value]) => key !== 'total_count' && value > 0
                      )
                      .slice(0, 4)
                      .map(([reactionType, count]) => (
                        <div
                          key={reactionType}
                          className="bg-obsidian-field/10 flex items-center gap-1 rounded-full px-3 py-1"
                        >
                          <span className="text-base">{getReactionEmoji(reactionType)}</span>
                          <span className="text-sm font-bold">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
