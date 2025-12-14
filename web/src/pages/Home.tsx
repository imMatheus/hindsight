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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8">
          Enter GitHub Repository
        </h1>
        <form onSubmit={handleSubmit} className="w-full">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/repo or username/repo"
            className="w-full px-6 py-4 text-lg rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-neutral-100 placeholder-neutral-500"
            autoFocus
          />
        </form>
      </div>
    </div>
  )
}
