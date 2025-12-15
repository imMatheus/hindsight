import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CommitGraph } from '../components/commit-graph'
import type { CommitStats } from '@/types'

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
    return <div>Analyzing repository...</div>
  }

  if (isError || !data) {
    return (
      <div>
        Error: {error instanceof Error ? error.message : 'Failed to analyze'}
      </div>
    )
  }

  return (
    <div className="min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4">
        <CommitGraph
          stats={data.stats}
          totalAdded={data.totalAdded}
          totalRemoved={data.totalRemoved}
        />
        <h1 className="text-4xl font-bold mb-4">Repository</h1>
        <div className="space-y-2">
          <p className="text-xl">
            <span className="text-neutral-400">Username:</span>{' '}
            <span className="text-blue-400 font-semibold">{username}</span>
          </p>
          <p className="text-xl">
            <span className="text-neutral-400">Repository:</span>{' '}
            <span className="text-blue-400 font-semibold">{repo}</span>
          </p>
        </div>
        {data && (
          <p className="text-green-400 mt-4">
            {data?.message || 'Analysis completed'}
          </p>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 grid grid-cols-2">
        <div className="p-10 border-r-2 border-obsidian-field">
          <h3 className="font-bold text-3xl">Craziest week</h3>
          <p className="mb-4 font-medium text-lg tracking-wide text-ion-drift">
            The week with the most commits
          </p>

          <h3 className="font-black text-4xl mb-5">5,432 commits</h3>
          <div className="gap-y-2 grid grid-cols-[1fr_auto] items-center gap-x-4">
            <div className="px-4 h-12 bg-core-flux flex items-center">
              <p className="text-lg font-bold text-obsidian-field">Monday</p>
            </div>
            <p className="text-lg font-bold">823 commits</p>

            <div
              className="px-4 h-12 bg-core-flux flex items-center"
              style={{ width: '80%' }}
            >
              <p className="text-lg font-bold text-obsidian-field">Monday</p>
            </div>
            <p className="text-lg font-bold">823 commits</p>

            <div
              className="px-4 h-12 bg-core-flux flex items-center"
              style={{ width: '60%' }}
            >
              <p className="text-lg font-bold text-obsidian-field">Monday</p>
            </div>
            <p className="text-lg font-bold">823 commits</p>
          </div>
        </div>
      </div>
    </div>
  )
}
