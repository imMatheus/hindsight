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
    <div className="min-h-screen h-full flex items-center justify-center px-4">
      <div className="w-full max-w-2xl h-full">
        <h1 className="text-4xl font-bold text-center mb-8">
          Enter GitHub Repository
        </h1>
        <form
          onSubmit={handleSubmit}
          className="w-full p-8 rounded-full border bg-core-flux"
        >
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/repo or username/repo"
            className="w-full px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      className={`w-20 hover:w-28 shrink-0 h-10 transition-all duration-1000 hover:duration-150 ease-in-out  rounded-full ${
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
      <div className="flex gap-1.5 justify-center">
        <Tab color="pink" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="pink" />
        <Tab color="orange" />

        <Tab color="blue" />
        <Tab color="pink" />
      </div>
      <div className="flex gap-1.5 justify-center">
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="pink" />
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="blue" />
      </div>
      <div className="flex gap-1.5 justify-center">
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="pink" />
        <Tab color="orange" />
        <Tab color="pink" />
        <Tab color="blue" />
        <Tab color="orange" />
      </div>
      <div className="flex gap-1.5 justify-center">
        <Tab color="pink" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="orange" />
        <Tab color="blue" />
        <Tab color="pink" />
        <Tab color="orange" />
        <Tab color="pink" />
        <Tab color="orange" />
      </div>
    </div>
  )
}
