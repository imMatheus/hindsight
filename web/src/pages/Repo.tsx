import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CommitGraph } from '../components/commit-graph'
import type { CommitStats } from '@/types'
import { LoadingAnimation } from '@/components/loading-animation'

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
    <div className="min-h-screen py-4">
      <div className="mx-auto max-w-6xl px-4">
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
      </div>

      <div className="group mx-auto my-10 grid max-w-6xl grid-rows-3 space-y-3">
        <div className="flex gap-3 transition-all ease-in-out group-hover:gap-1">
          <div className="bg-ion-drift flex-1 rounded-full" />
          <div className="bg-core-flux flex-1 rounded-full" />
          <div className="bg-pinky flex-1 rounded-full" />
          <div className="bg-polar-sand flex-1 rounded-full" />
          <div className="bg-pinky flex-1 rounded-full" />
        </div>
        <div className="flex gap-3 transition-all ease-in-out group-hover:gap-1">
          <div className="bg-pinky flex-1 rounded-full" />
          <div className="bg-polar-sand flex-1 rounded-full" />
          <div className="flex-center text-polar-sand bg-core-flux w-max flex-col rounded-full px-12 py-5 text-center">
            <p className="w-full text-5xl font-black">Repo Wrapped</p>
          </div>
          <div className="bg-ion-drift flex-1 rounded-full" />
          <div className="bg-polar-sand flex-1 rounded-full" />
        </div>
        <div className="flex gap-3 transition-all ease-in-out group-hover:gap-1">
          <div className="bg-core-flux flex-1 rounded-full" />
          <div className="bg-ion-drift flex-1 rounded-full" />
          <div className="bg-polar-sand flex-1 rounded-full" />
          <div className="bg-core-flux flex-1 rounded-full" />
          <div className="bg-pinky flex-1 rounded-full" />
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-2 px-4">
        <div className="border-obsidian-field border-r-2 p-10">
          <h3 className="text-3xl font-bold">Craziest week</h3>
          <p className="text-ion-drift mb-4 text-lg font-medium tracking-wide">
            The week with the most commits
          </p>

          <h3 className="mb-5 text-4xl font-black">5,432 commits</h3>
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2">
            <div className="bg-core-flux flex h-12 items-center px-4">
              <p className="text-obsidian-field text-lg font-bold">Monday</p>
            </div>
            <p className="text-lg font-bold">823 commits</p>

            <div
              className="bg-core-flux flex h-12 items-center px-4"
              style={{ width: '80%' }}
            >
              <p className="text-obsidian-field text-lg font-bold">Monday</p>
            </div>
            <p className="text-lg font-bold">823 commits</p>

            <div
              className="bg-core-flux flex h-12 items-center px-4"
              style={{ width: '60%' }}
            >
              <p className="text-obsidian-field text-lg font-bold">Monday</p>
            </div>
            <p className="text-lg font-bold">823 commits</p>
          </div>
        </div>
      </div>
    </div>
  )
}
