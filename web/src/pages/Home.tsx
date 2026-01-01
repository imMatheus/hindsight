import { LoadingAnimation } from '@/components/loading-animation'
import { cn } from '@/lib/utils'
import type { TopReposResponse } from '@/types'
import { useQuery } from '@tanstack/react-query'
import posthog from 'posthog-js'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Parse GitHub URL: https://github.com/username/repo or github.com/username/repo or username/repo
    const match = repoUrl.match(
      /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/
    )

    if (match) {
      const [, username, repo] = match
      // Remove .git suffix if present
      const repoName = repo.replace(/\.git$/, '')
      posthog.capture('repo_searched', { username, repo })
      navigate(`/${username}/${repoName}`)
    } else {
      // Try to parse as username/repo format
      const simpleMatch = repoUrl.match(/^([^/]+)\/([^/]+)$/)
      if (simpleMatch) {
        const [, username, repo] = simpleMatch
        posthog.capture('repo_searched', { username, repo })
        navigate(`/${username}/${repo}`)
      }
    }
  }

  return (
    <div className="flex h-full min-h-screen flex-col px-4">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col">
        <header className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <img
              src="/images/logo.png"
              alt="GitBack"
              className="size-10 object-cover"
            />
            <h3 className="text-2xl font-bold">GitBack</h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/imMatheus/gitback"
              target="_blank"
              className=""
            >
              <svg className="size-6" viewBox="0 0 438.549 438.549">
                <path
                  fill="currentColor"
                  d="M409.132 114.573c-19.608-33.596-46.205-60.194-79.798-79.8-33.598-19.607-70.277-29.408-110.063-29.408-39.781 0-76.472 9.804-110.063 29.408-33.596 19.605-60.192 46.204-79.8 79.8C9.803 148.168 0 184.854 0 224.63c0 47.78 13.94 90.745 41.827 128.906 27.884 38.164 63.906 64.572 108.063 79.227 5.14.954 8.945.283 11.419-1.996 2.475-2.282 3.711-5.14 3.711-8.562 0-.571-.049-5.708-.144-15.417a2549.81 2549.81 0 01-.144-25.406l-6.567 1.136c-4.187.767-9.469 1.092-15.846 1-6.374-.089-12.991-.757-19.842-1.999-6.854-1.231-13.229-4.086-19.13-8.559-5.898-4.473-10.085-10.328-12.56-17.556l-2.855-6.57c-1.903-4.374-4.899-9.233-8.992-14.559-4.093-5.331-8.232-8.945-12.419-10.848l-1.999-1.431c-1.332-.951-2.568-2.098-3.711-3.429-1.142-1.331-1.997-2.663-2.568-3.997-.572-1.335-.098-2.43 1.427-3.289 1.525-.859 4.281-1.276 8.28-1.276l5.708.853c3.807.763 8.516 3.042 14.133 6.851 5.614 3.806 10.229 8.754 13.846 14.842 4.38 7.806 9.657 13.754 15.846 17.847 6.184 4.093 12.419 6.136 18.699 6.136 6.28 0 11.704-.476 16.274-1.423 4.565-.952 8.848-2.383 12.847-4.285 1.713-12.758 6.377-22.559 13.988-29.41-10.848-1.14-20.601-2.857-29.264-5.14-8.658-2.286-17.605-5.996-26.835-11.14-9.235-5.137-16.896-11.516-22.985-19.126-6.09-7.614-11.088-17.61-14.987-29.979-3.901-12.374-5.852-26.648-5.852-42.826 0-23.035 7.52-42.637 22.557-58.817-7.044-17.318-6.379-36.732 1.997-58.24 5.52-1.715 13.706-.428 24.554 3.853 10.85 4.283 18.794 7.952 23.84 10.994 5.046 3.041 9.089 5.618 12.135 7.708 17.705-4.947 35.976-7.421 54.818-7.421s37.117 2.474 54.823 7.421l10.849-6.849c7.419-4.57 16.18-8.758 26.262-12.565 10.088-3.805 17.802-4.853 23.134-3.138 8.562 21.509 9.325 40.922 2.279 58.24 15.036 16.18 22.559 35.787 22.559 58.817 0 16.178-1.958 30.497-5.853 42.966-3.9 12.471-8.941 22.457-15.125 29.979-6.191 7.521-13.901 13.85-23.131 18.986-9.232 5.14-18.182 8.85-26.84 11.136-8.662 2.286-18.415 4.004-29.263 5.146 9.894 8.562 14.842 22.077 14.842 40.539v60.237c0 3.422 1.19 6.279 3.572 8.562 2.379 2.279 6.136 2.95 11.276 1.995 44.163-14.653 80.185-41.062 108.068-79.226 27.88-38.161 41.825-81.126 41.825-128.906-.01-39.771-9.818-76.454-29.414-110.049z"
                ></path>
              </svg>
            </a>
            <a
              href="https://x.com/whosmatu"
              target="_blank"
              className="bg-pinky text-obsidian-field rounded-full px-3 py-1.5 text-sm font-semibold"
            >
              by @whosmatu
            </a>
          </div>
        </header>
        <div className="flex-center flex-1 flex-col">
          <div className="mt-20 w-full">
            <h1 className="mb-8 text-center text-4xl font-bold">
              Enter GitHub Repository
            </h1>
            <form
              onSubmit={handleSubmit}
              className="group text-obsidian-field relative w-full"
            >
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="username/repo or github.com/username/repo"
                className="bg-core-flux w-full rounded-full p-6 pr-14 text-xl font-bold focus:border-transparent focus:outline-none lg:p-8 lg:text-2xl"
                autoFocus
              />
              <p className="absolute top-1/2 right-7 -translate-y-1/2 text-2xl font-bold transition-all duration-300 ease-in-out group-hover:translate-x-1">
                →
              </p>
            </form>

            <div className="mt-12">
              <p className="mb-4 text-4xl font-black tracking-wide">
                Hottest repositories
              </p>

              <div className="text-obsidian-field grid gap-3 text-xl font-bold lg:grid-cols-2">
                <Link
                  to={'/vercel/next.js'}
                  onClick={() =>
                    posthog.capture('repo_clicked', {
                      username: 'vercel',
                      repo: 'next.js',
                    })
                  }
                  className="bg-pinky group flex items-center justify-between rounded-full p-6"
                >
                  <p className="truncate">vercel/next.js</p>
                  <p className="shrink-0 transition-all duration-1000 ease-in-out group-hover:translate-x-1 group-hover:duration-100">
                    →
                  </p>
                </Link>

                <Link
                  to={'/facebook/react'}
                  onClick={() =>
                    posthog.capture('repo_clicked', {
                      username: 'facebook',
                      repo: 'react',
                    })
                  }
                  className="bg-ion-drift group flex items-center justify-between rounded-full p-6"
                >
                  <p className="truncate">facebook/react</p>
                  <p className="shrink-0 transition-all duration-1000 ease-in-out group-hover:translate-x-1 group-hover:duration-100">
                    →
                  </p>
                </Link>

                <Link
                  to={'/shadcn-ui/ui'}
                  onClick={() =>
                    posthog.capture('repo_clicked', {
                      username: 'shadcn-ui',
                      repo: 'ui',
                    })
                  }
                  className="bg-polar-sand group flex items-center justify-between rounded-full p-6"
                >
                  <p className="truncate">shadcn-ui/ui</p>
                  <p className="shrink-0 transition-all duration-1000 ease-in-out group-hover:translate-x-1 group-hover:duration-100">
                    →
                  </p>
                </Link>

                <Link
                  to={'/imMatheus/portfolio'}
                  onClick={() =>
                    posthog.capture('repo_clicked', {
                      username: 'imMatheus',
                      repo: 'portfolio',
                    })
                  }
                  className="bg-alloy-ember group flex items-center justify-between rounded-full p-6"
                >
                  <p className="truncate">imMatheus/portfolio</p>
                  <p className="shrink-0 transition-all duration-1000 ease-in-out group-hover:translate-x-1 group-hover:duration-100">
                    →
                  </p>
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-20 w-full">
            <Leaderboard />
          </div>
        </div>

        <div className="mt-10 lg:mt-20">
          <h3 className="mb-1 text-4xl font-black tracking-wide">
            What is this?
          </h3>
          <p className="mb-5 text-lg leading-relaxed font-semibold">
            This is a project that lets you see interesting stats about any
            GitHub repository. Wether it's lines of code over time, commits over
            time, top contributors, or even the craziest week of the year.
          </p>
        </div>

        <div className="relative left-1/2 mt-20 w-fit max-w-screen -translate-x-1/2 overflow-x-hidden">
          <BottomUi />
        </div>
      </div>
    </div>
  )
}

const Leaderboard = () => {
  const {
    data: topRepos,
    isLoading,
    isError,
  } = useQuery<TopReposResponse>({
    queryKey: ['topRepos'],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/api/top-repos`).then((res) =>
        res.json()
      ),
  })

  if (isLoading)
    return (
      <div className="w-full overflow-x-auto">
        <h3 className="mb-1 text-4xl font-black tracking-wide">Leaderboard</h3>
        <p className="mb-5 text-lg leading-relaxed font-semibold">
          The most biggest repositories by lines of code.
        </p>

        <div className="flex-center p-4">
          <LoadingAnimation />
        </div>
      </div>
    )
  if (isError || !topRepos?.repos || topRepos.repos.length === 0) return null

  return (
    <div className="w-full overflow-x-auto">
      <h3 className="mb-1 text-4xl font-black tracking-wide">Leaderboard</h3>
      <p className="mb-5 text-lg leading-relaxed font-semibold">
        The most biggest repositories by lines of code.
      </p>
      <table className="w-full table-auto">
        <thead>
          <tr className="text-sm font-semibold">
            <th className="w-0 pr-5 pb-2 text-right">Rank</th>
            <th className="pr-4 pb-2 text-left">Repository</th>
            <th className="pr-4 pb-2 text-left">Views</th>
            <th className="pr-4 pb-2 text-left">Stars</th>
            <th className="pr-4 pb-2 text-left">Commits</th>
            <th className="pr-4 pb-2 text-left">Total Lines</th>
            <th className="pr-4 pb-2 text-left">LOC graph</th>
          </tr>
        </thead>
        <tbody>
          {topRepos?.repos.map((repo, index) => {
            const maxValue = Math.max(...repo.linesHistogram)

            const bgColor = [
              'bg-pinky',
              'bg-ion-drift',
              'bg-alloy-ember',
              'bg-core-flux',
              'bg-polar-sand',
            ][index % 5]

            return (
              <tr
                key={repo.username + repo.repoName}
                className="text-xl font-semibold"
              >
                <td className="flex justify-end rounded-full py-1 pr-3 text-right">
                  <div
                    className={cn(
                      'text-obsidian-field w-max rounded-full px-4 text-center font-black',
                      bgColor
                    )}
                  >
                    {index + 1}
                  </div>
                </td>
                <td className="p-1 pr-4 text-left">
                  <Link
                    to={`/${repo.username}/${repo.repoName}`}
                    onClick={() =>
                      posthog.capture('repo_clicked', {
                        username: repo.username,
                        repo: repo.repoName,
                      })
                    }
                    className="truncate hover:underline"
                  >
                    {repo.username}/{repo.repoName}
                  </Link>
                </td>
                <td className="p-1 pr-4 text-left font-black">
                  {repo.views.toLocaleString()}
                </td>
                <td className="p-1 pr-4 text-left font-black">
                  {Intl.NumberFormat('en', {
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(repo.totalStars)}
                </td>
                <td className="p-1 pr-4 text-left font-black">
                  {Intl.NumberFormat('en', {
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(repo.totalCommits)}
                </td>
                <td className="p-1 pr-4 text-left font-black">
                  {Intl.NumberFormat('en', {
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(repo.totalLines)}
                </td>
                <td
                  className="p-1 pr-4 text-left"
                  title="Lines of code over time"
                >
                  <div className="flex h-4 items-end gap-0.5">
                    {repo.linesHistogram.map((line, index) => (
                      <div
                        key={index}
                        className={cn('w-1.5', bgColor)}
                        style={{
                          height: `${(line / maxValue) * 100}%`,
                          minHeight: '1px',
                        }}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const BottomUi = () => {
  const Tab = ({
    color,
  }: {
    color: 'pink' | 'blue' | 'orange' | 'amber' | 'white'
  }) => (
    <div
      className={`h-10 w-20 shrink-0 rounded-full transition-all duration-1000 ease-in-out hover:w-28 hover:duration-150 ${
        color === 'pink'
          ? 'bg-pinky'
          : color === 'blue'
            ? 'bg-ion-drift'
            : color === 'amber'
              ? 'bg-alloy-ember'
              : color === 'white'
                ? 'bg-polar-sand'
                : 'bg-core-flux'
      }`}
    ></div>
  )

  return (
    <div className="space-y-1.5">
      <div className="flex justify-center gap-1.5">
        <Tab color="amber" />
        <Tab color="pink" />
        <Tab color="blue" />
        <Tab color="white" />
        <Tab color="amber" />
        <Tab color="pink" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="white" />
      </div>
      <div className="flex justify-center gap-1.5">
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="amber" />
        <Tab color="pink" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="pink" />
        <Tab color="amber" />
      </div>
      <div className="flex justify-center gap-1.5">
        <Tab color="pink" />
        <Tab color="white" />
        <Tab color="orange" />
        <Tab color="amber" />
        <Tab color="pink" />
        <Tab color="orange" />
        <Tab color="white" />
      </div>
      <div className="flex justify-center gap-1.5">
        <Tab color="amber" />
        <Tab color="pink" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="white" />
        <Tab color="amber" />
      </div>
    </div>
  )
}
