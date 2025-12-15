import { useState } from 'react'
import { useNavigate } from 'react-router'

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
      navigate(`/${username}/${repoName}`)
    } else {
      // Try to parse as username/repo format
      const simpleMatch = repoUrl.match(/^([^/]+)\/([^/]+)$/)
      if (simpleMatch) {
        const [, username, repo] = simpleMatch
        navigate(`/${username}/${repo}`)
      }
    }
  }

  return (
    <div className="flex h-full min-h-screen items-center justify-center px-4">
      <div className="h-full w-full max-w-2xl">
        <h1 className="mb-8 text-center text-4xl font-bold">
          Enter GitHub Repository
        </h1>
        <form
          onSubmit={handleSubmit}
          className="bg-core-flux w-full rounded-full border p-8"
        >
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/repo or username/repo"
            className="w-full px-6 py-4 text-lg focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
            autoFocus
          />
        </form>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <BottomUi />
        </div>
      </div>
    </div>
  )
}

const BottomUi = () => {
  const Tab = ({ color }: { color: 'pink' | 'blue' | 'orange' }) => (
    <div
      className={`h-10 w-20 shrink-0 rounded-full transition-all duration-1000 ease-in-out hover:w-28 hover:duration-150 ${
        color === 'pink'
          ? 'bg-pinky'
          : color === 'blue'
            ? 'bg-ion-drift'
            : 'bg-core-flux'
      }`}
    ></div>
  )

  return (
    <div className="space-y-1.5">
      <div className="flex justify-center gap-1.5">
        <Tab color="pink" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="pink" />
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="pink" />
        <Tab color="pink" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="pink" />
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="pink" />
      </div>
      <div className="flex justify-center gap-1.5">
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="pink" />
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="blue" />
      </div>
      <div className="flex justify-center gap-1.5">
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="orange" />
        <Tab color="pink" />
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="orange" />
        <Tab color="pink" />
        <Tab color="blue" />
        <Tab color="orange" />
      </div>
      <div className="flex justify-center gap-1.5">
        <Tab color="pink" />
        <Tab color="blue" />
        <Tab color="pink" />
        <Tab color="orange" />
        <Tab color="pink" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="pink" />
        <Tab color="orange" />
        <Tab color="blue" />
      </div>
    </div>
  )
}
